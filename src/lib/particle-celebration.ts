// ─── Raw WebGL Particle Celebration ─────────────────────────────
// Zero-dependency GPU-accelerated particle morph effect.
// Particles assemble from chaos into a target glyph, then disperse.
// Full cleanup of GL resources after animation completes.

// ─── Glyph Sampling ────────────────────────────────────────────

/** Render a character to an offscreen canvas, sample `count` pixel positions. */
function sampleGlyphPoints(
  char: string,
  count: number,
): Float32Array {
  const size = 128;
  const canvas = new OffscreenCanvas(size, size);
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#fff';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = `bold ${size * 0.7}px sans-serif`;
  ctx.fillText(char, size / 2, size / 2);

  const { data } = ctx.getImageData(0, 0, size, size);

  // Collect all opaque pixel coordinates
  const coords: number[] = [];
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      if (data[(y * size + x) * 4 + 3] > 128) {
        // Normalize to [-1, 1] with Y flipped for GL
        coords.push((x / size) * 2 - 1, -((y / size) * 2 - 1));
      }
    }
  }

  // Randomly sample `count` points from the pool
  const result = new Float32Array(count * 2);
  const poolLen = coords.length / 2;
  for (let i = 0; i < count; i++) {
    const idx = Math.floor(Math.random() * poolLen);
    result[i * 2] = coords[idx * 2];
    result[i * 2 + 1] = coords[idx * 2 + 1];
  }
  return result;
}

// ─── Shaders ───────────────────────────────────────────────────

const VERT = `
attribute vec2 aRandom;
attribute vec2 aTarget;
attribute float aDelay;
uniform float uProgress;
uniform float uPointSize;
varying float vAlpha;

void main() {
  float t = clamp((uProgress - aDelay) / (1.0 - aDelay), 0.0, 1.0);
  t = 1.0 - pow(1.0 - t, 3.0);
  vec2 pos = mix(aRandom, aTarget, t);
  vAlpha = smoothstep(0.0, 0.2, uProgress) * (1.0 - smoothstep(0.75, 1.0, uProgress));
  gl_Position = vec4(pos * 0.7, 0.0, 1.0);
  gl_PointSize = uPointSize;
}
`;

const FRAG = `
precision mediump float;
uniform vec3 uColor;
varying float vAlpha;

void main() {
  float d = length(gl_PointCoord - 0.5) * 2.0;
  if (d > 1.0) discard;
  float alpha = vAlpha * (1.0 - d * d) * 0.8;
  gl_FragColor = vec4(uColor, alpha);
}
`;

// ─── GL Helpers ────────────────────────────────────────────────

function compileShader(
  gl: WebGLRenderingContext,
  type: number,
  src: string,
): WebGLShader {
  const s = gl.createShader(type)!;
  gl.shaderSource(s, src);
  gl.compileShader(s);
  return s;
}

function createBuffer(
  gl: WebGLRenderingContext,
  data: Float32Array,
): WebGLBuffer {
  const buf = gl.createBuffer()!;
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW);
  return buf;
}

function bindAttr(
  gl: WebGLRenderingContext,
  program: WebGLProgram,
  name: string,
  buf: WebGLBuffer,
  size: number,
): void {
  const loc = gl.getAttribLocation(program, name);
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.enableVertexAttribArray(loc);
  gl.vertexAttribPointer(loc, size, gl.FLOAT, false, 0, 0);
}

// ─── Public API ────────────────────────────────────────────────

export interface CelebrationOptions {
  /** Glyph to morph into (default '✓') */
  glyph?: string;
  /** Accent color as [r, g, b] each in 0..1 range */
  color: [number, number, number];
  /** Number of particles (default 1200) */
  count?: number;
  /** Animation duration in ms (default 1500) */
  duration?: number;
}

export interface CelebrationHandle {
  start: () => void;
  dispose: () => void;
}

export function createCelebration(
  canvas: HTMLCanvasElement,
  opts: CelebrationOptions,
): CelebrationHandle | null {
  const count = opts.count ?? 1200;
  const duration = opts.duration ?? 1500;
  const glyph = opts.glyph ?? '✓';

  const gl = canvas.getContext('webgl', {
    alpha: true,
    premultipliedAlpha: false,
    antialias: true,
  });
  if (!gl) return null;

  // Compile program
  const vs = compileShader(gl, gl.VERTEX_SHADER, VERT);
  const fs = compileShader(gl, gl.FRAGMENT_SHADER, FRAG);
  const prog = gl.createProgram()!;
  gl.attachShader(prog, vs);
  gl.attachShader(prog, fs);
  gl.linkProgram(prog);
  gl.useProgram(prog);

  // Sample target glyph points
  const targets = sampleGlyphPoints(glyph, count);

  // Generate random start positions (uniform in [-1, 1])
  const randoms = new Float32Array(count * 2);
  for (let i = 0; i < randoms.length; i++) {
    randoms[i] = (Math.random() - 0.5) * 2;
  }

  // Generate per-particle delays [0, 0.3]
  const delays = new Float32Array(count);
  for (let i = 0; i < count; i++) {
    delays[i] = Math.random() * 0.3;
  }

  // Upload buffers
  const bufRandom = createBuffer(gl, randoms);
  const bufTarget = createBuffer(gl, targets);
  const bufDelay = createBuffer(gl, delays);

  // Bind attributes
  bindAttr(gl, prog, 'aRandom', bufRandom, 2);
  bindAttr(gl, prog, 'aTarget', bufTarget, 2);
  bindAttr(gl, prog, 'aDelay', bufDelay, 1);

  // Uniforms
  const uProgress = gl.getUniformLocation(prog, 'uProgress')!;
  const uColor = gl.getUniformLocation(prog, 'uColor')!;
  const uPointSize = gl.getUniformLocation(prog, 'uPointSize')!;

  gl.uniform3fv(uColor, opts.color);

  // Point size scaled by device pixel ratio
  const dpr = Math.min(window.devicePixelRatio || 1, 3);
  gl.uniform1f(uPointSize, 3.0 * dpr);

  // Blending for soft transparent particles
  gl.enable(gl.BLEND);
  gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

  let rafId = 0;
  let disposed = false;

  function dispose(): void {
    if (disposed) return;
    disposed = true;
    cancelAnimationFrame(rafId);
    gl!.deleteBuffer(bufRandom);
    gl!.deleteBuffer(bufTarget);
    gl!.deleteBuffer(bufDelay);
    gl!.deleteShader(vs);
    gl!.deleteShader(fs);
    gl!.deleteProgram(prog);
    // Release the WebGL context fully
    const ext = gl!.getExtension('WEBGL_lose_context');
    if (ext) ext.loseContext();
  }

  function start(): void {
    if (disposed) return;
    const t0 = performance.now();

    function frame(): void {
      if (disposed) return;
      const elapsed = performance.now() - t0;
      const progress = Math.min(elapsed / duration, 1);

      gl!.viewport(0, 0, canvas.width, canvas.height);
      gl!.clearColor(0, 0, 0, 0);
      gl!.clear(gl!.COLOR_BUFFER_BIT);
      gl!.uniform1f(uProgress, progress);
      gl!.drawArrays(gl!.POINTS, 0, count);

      if (progress < 1) {
        rafId = requestAnimationFrame(frame);
      } else {
        dispose();
      }
    }

    rafId = requestAnimationFrame(frame);
  }

  return { start, dispose };
}

// ─── Color Utility ─────────────────────────────────────────────

/** Parse a CSS hex color (#rgb or #rrggbb) to normalized [r, g, b]. */
export function hexToGL(hex: string): [number, number, number] {
  let h = hex.replace('#', '');
  if (h.length === 3) {
    h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
  }
  return [
    parseInt(h.slice(0, 2), 16) / 255,
    parseInt(h.slice(2, 4), 16) / 255,
    parseInt(h.slice(4, 6), 16) / 255,
  ];
}
