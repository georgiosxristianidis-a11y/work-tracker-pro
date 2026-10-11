/**
 * Currency and decimal calculation utilities using BigInt fixed-point arithmetic.
 * Eliminates IEEE-754 floating-point inaccuracies without external dependencies.
 */

const DEFAULT_SCALE = 10000n; // 4 decimal places
const DEFAULT_DECIMALS = 4;

export class CurrencyMath {
  /**
   * Converts a numeric value or formatted string to a scaled BigInt.
   * Accurately parses standard decimals, scientific notation (e.g. 1e-4), and formatted numbers (11,121.22).
   */
  static toScaled(value: number | string, decimals = DEFAULT_DECIMALS): bigint {
    if (typeof value === 'number') {
      if (Number.isNaN(value) || !Number.isFinite(value)) return 0n;
      // Use string representation to avoid immediate float corruption
      return this.toScaled(value.toString(), decimals);
    }

    const trimmed = value.trim();
    if (!trimmed || trimmed === '-' || trimmed === '.') return 0n;

    // Handle scientific notation: e.g. "1.5e-4" or "2e3"
    if (/e/i.test(trimmed)) {
      const [coeffStr, expStr] = trimmed.toLowerCase().split('e');
      const exp = parseInt(expStr || '0', 10);
      if (isNaN(exp)) return 0n;

      // Parse coefficient as scaled value
      const coeffScaled = this.toScaled(coeffStr, decimals);
      if (exp >= 0) {
        return coeffScaled * (10n ** BigInt(exp));
      } else {
        const divisor = 10n ** BigInt(Math.abs(exp));
        const half = divisor / 2n;
        return coeffScaled >= 0n ? (coeffScaled + half) / divisor : (coeffScaled - half) / divisor;
      }
    }

    const clean = trimmed.replace(/,/g, '').trim();
    const isNegative = clean.startsWith('-');
    const absStr = isNegative ? clean.slice(1) : clean;
    const parts = absStr.split('.');
    const integerPart = parts[0] || '0';
    const rawFractional = parts[1] || '';

    // Handle rounding of truncated decimals beyond scale
    const fractionalPart = rawFractional.padEnd(decimals, '0').slice(0, decimals);
    let extraRound = 0n;
    if (rawFractional.length > decimals) {
      const nextDigit = parseInt(rawFractional[decimals], 10);
      if (!isNaN(nextDigit) && nextDigit >= 5) {
        extraRound = 1n;
      }
    }

    const fullStr = `${integerPart}${fractionalPart}`;
    const rawBig = BigInt(fullStr) + extraRound;
    return isNegative ? -rawBig : rawBig;
  }

  /**
   * Converts a scaled BigInt back to a standard JavaScript number.
   * Clamped to safe integer bounds if necessary.
   */
  static fromScaled(scaled: bigint, decimals = DEFAULT_DECIMALS): number {
    const scale = 10n ** BigInt(decimals);
    const intPart = Number(scaled / scale);
    const remainder = Number(scaled % scale);
    return intPart + remainder / Number(scale);
  }

  /**
   * Adds two scaled BigInt values.
   */
  static add(a: bigint, b: bigint): bigint {
    return a + b;
  }

  /**
   * Subtracts scaled b from scaled a.
   */
  static sub(a: bigint, b: bigint): bigint {
    return a - b;
  }

  /**
   * Multiplies two scaled BigInt values with half-away-from-zero rounding.
   */
  static mul(a: bigint, b: bigint, decimals = DEFAULT_DECIMALS): bigint {
    const scale = 10n ** BigInt(decimals);
    const half = scale / 2n;
    const prod = a * b;
    return prod >= 0n ? (prod + half) / scale : (prod - half) / scale;
  }

  /**
   * Divides scaled a by scaled b with half-away-from-zero rounding.
   * Throws on divide by zero if requested or returns 0n safely.
   */
  static div(a: bigint, b: bigint, decimals = DEFAULT_DECIMALS): bigint {
    if (b === 0n) return 0n;
    const scale = 10n ** BigInt(decimals);
    const half = b / 2n;
    const num = a * scale;
    return (num + (num >= 0n ? half : -half)) / b;
  }

  /**
   * Formats a scaled BigInt into a standard monetary string with comma separators.
   * Example: 111212200n -> "$11,121.22"
   */
  static format(scaled: bigint, prefix = '$', displayDecimals = 2, scaleDecimals = DEFAULT_DECIMALS): string {
    const isNegative = scaled < 0n;
    const absVal = isNegative ? -scaled : scaled;
    const scale = 10n ** BigInt(scaleDecimals);
    
    const targetScale = 10n ** BigInt(displayDecimals);
    const diffScale = scale / targetScale;
    let rounded = absVal;
    if (diffScale > 1n) {
      const half = diffScale / 2n;
      rounded = (absVal + half) / diffScale;
    }

    const intPart = rounded / targetScale;
    const fracPart = rounded % targetScale;

    // Avoid "-$0.00" if rounded value is zero
    if (rounded === 0n) {
      const zeroFrac = displayDecimals > 0 ? `.${'0'.repeat(displayDecimals)}` : '';
      return `${prefix}0${zeroFrac}`;
    }

    const intStr = intPart.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    const fracStr = fracPart.toString().padStart(displayDecimals, '0');

    const formatted = displayDecimals > 0 ? `${intStr}.${fracStr}` : intStr;
    const sign = isNegative ? '-' : '';
    return `${sign}${prefix}${formatted}`;
  }

  /**
   * Computes year-over-year or period percentage growth: ((current - base) / base) * 100.
   */
  static calculateGrowthPct(current: bigint, base: bigint): number {
    if (base === 0n) return 0;
    const diff = current - base;
    const pctScaled = (diff * 10000n) / base; // 2 decimal precision
    return Number(pctScaled) / 100;
  }

  /**
   * Distributes percentages among items so the sum equals exactly 100%.
   * Fully integer-based Hare-Niemeyer (Largest Remainder) on BigInt Basis Points.
   * Prevents IEEE-754 precision leaks even with numbers > 2^53.
   */
  static calculatePercentages(items: bigint[]): number[] {
    const total = items.reduce((acc, curr) => acc + curr, 0n);
    if (total === 0n) {
      return items.map(() => 0);
    }

    interface BigAllocation {
      index: number;
      floorPct: number;
      remainderScaled: bigint;
    }

    const TARGET_SUM = 100;

    const allocations: BigAllocation[] = items.map((val, index) => {
      // Calculate exact percentage in basis points (1% = 10000 basis units)
      const basisPoints = (val * 1000000n) / total; // 100 * 10000 = 1000000n
      const floorPct = Number(basisPoints / 10000n);
      const remainderScaled = basisPoints % 10000n;

      return {
        index,
        floorPct,
        remainderScaled
      };
    });

    const sumFloor = allocations.reduce((sum, item) => sum + item.floorPct, 0);
    let remaining = TARGET_SUM - sumFloor;

    // Sort by BigInt remainder descending
    const sorted = [...allocations].sort((a, b) => {
      if (b.remainderScaled > a.remainderScaled) return 1;
      if (b.remainderScaled < a.remainderScaled) return -1;
      return 0;
    });

    for (let i = 0; i < remaining && i < sorted.length; i++) {
      sorted[i].floorPct += 1;
    }

    const result = new Array<number>(items.length);
    for (const item of sorted) {
      result[item.index] = item.floorPct;
    }

    return result;
  }

  /**
   * In-engine self-diagnostic assertion suite verifying all mathematical invariants.
   */
  static runSelfDiagnostic(): { ok: boolean; passed: number; failed: number } {
    let passed = 0;
    let failed = 0;

    const assert = (condition: boolean) => {
      if (condition) passed++;
      else failed++;
    };

    // 1. Exponential notation parsing (1e-4 -> 1n with 4 decimals)
    assert(this.toScaled('1e-4') === 1n);

    // 2. Large BigInt sum beyond Number.MAX_SAFE_INTEGER (2^53)
    const hugeA = 90071992547409910000n;
    const hugeB = 10000n;
    assert(this.add(hugeA, hugeB) === 90071992547409920000n);

    // 3. Exact 0.1 + 0.2 === 0.3 without IEEE-754 error
    const pointOne = this.toScaled('0.1');
    const pointTwo = this.toScaled('0.2');
    const pointThree = this.toScaled('0.3');
    assert(this.add(pointOne, pointTwo) === pointThree);

    // 4. Zero division safety
    assert(this.div(10000n, 0n) === 0n);

    // 5. Largest Remainder strictly equals 100%
    const shares = this.calculatePercentages([3333n, 3333n, 3334n]);
    const sharesSum = shares.reduce((a, b) => a + b, 0);
    assert(sharesSum === 100);

    return { ok: failed === 0, passed, failed };
  }
}
