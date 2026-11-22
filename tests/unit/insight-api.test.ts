import test from 'node:test';
import assert from 'node:assert/strict';
import handler from '../../api/insight.ts';

const origin = 'https://work-tracker-pro-kohl.vercel.app';
const makeReq = (body: unknown, headers: Record<string, string> = {}) =>
  new Request(`${origin}/api/insight`, {
    method: 'POST',
    headers: { origin, host: 'work-tracker-pro-kohl.vercel.app', ...headers },
    body: JSON.stringify(body),
  });

test('api/insight - blocks Sec-Fetch-Site cross-site', async () => {
  const res = await handler(makeReq({ targetLang: 'English', history: '8h' }, { 'sec-fetch-site': 'cross-site' }));
  assert.equal(res.status, 403);
});

test('api/insight - production rejects http origin even matching host', async () => {
  const prev = process.env.VERCEL_ENV;
  process.env.VERCEL_ENV = 'production';
  try {
    const res = await handler(makeReq({ targetLang: 'English', history: '8h' }, { origin: 'http://work-tracker-pro-kohl.vercel.app' }));
    assert.equal(res.status, 403);
  } finally {
    process.env.VERCEL_ENV = prev;
  }
});

test('api/insight - rejects array body and enforces rate limit 429', async () => {
  const bad = await handler(makeReq(['not-an-object'], { 'x-forwarded-for': '198.51.100.7' }));
  assert.equal(bad.status, 400);
  for (let i = 1; i < 20; i++) {
    await handler(makeReq({ targetLang: 'InvalidLang', history: '8h' }, { 'x-forwarded-for': '198.51.100.7' }));
  }
  const limited = await handler(makeReq({ targetLang: 'English', history: '8h' }, { 'x-forwarded-for': '198.51.100.7' }));
  assert.equal(limited.status, 429);
});

test('api/insight - sends Gemini API key via x-goog-api-key header and passes AbortSignal', async () => {
  const prevKey = process.env.GEMINI_API_KEY;
  const origFetch = globalThis.fetch;
  let capturedUrl = '';
  let capturedInit: RequestInit | undefined;

  process.env.GEMINI_API_KEY = 'unit-test-placeholder-key';
  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    capturedUrl = String(input);
    capturedInit = init;
    return new Response(
      JSON.stringify({ candidates: [{ content: { parts: [{ text: '▪ Steady schedule.' }] } }] }),
      { status: 200, headers: { 'Content-Type': 'application/json' } },
    );
  }) as typeof fetch;

  try {
    const res = await handler(makeReq({ targetLang: 'English', history: '8h' }, { 'x-forwarded-for': '198.51.100.99' }));
    assert.equal(res.status, 200);
    assert.equal(capturedUrl.includes('key='), false, 'API key must not be in URL query string');
    const headers = capturedInit?.headers as Record<string, string>;
    assert.equal(headers?.['x-goog-api-key'], 'unit-test-placeholder-key');
    assert.ok(capturedInit?.signal instanceof AbortSignal, 'fetch must include an AbortSignal timeout');
  } finally {
    if (prevKey === undefined) {
      delete process.env.GEMINI_API_KEY;
    } else {
      process.env.GEMINI_API_KEY = prevKey;
    }
    globalThis.fetch = origFetch;
  }
});
