import test from 'node:test';
import assert from 'node:assert/strict';
import { CurrencyMath } from '../../src/lib/currency-math.ts';

test('CurrencyMath - toScaled and fromScaled basic numbers', () => {
  const scaled = CurrencyMath.toScaled(123.45);
  // Default decimals is 4, so 123.45 -> 1234500n
  assert.equal(scaled, 1234500n);
  assert.equal(CurrencyMath.fromScaled(scaled), 123.45);
});

test('CurrencyMath - string inputs with commas and whitespace', () => {
  const scaled = CurrencyMath.toScaled('  $11,121.22  ');
  assert.equal(scaled, 111212200n);
  assert.equal(CurrencyMath.fromScaled(scaled), 11121.22);
});

test('CurrencyMath - invalid or edge inputs return 0n', () => {
  assert.equal(CurrencyMath.toScaled(''), 0n);
  assert.equal(CurrencyMath.toScaled(NaN), 0n);
  assert.equal(CurrencyMath.toScaled(Infinity), 0n);
});

test('CurrencyMath - arithmetic operations: add, sub, mul, div', () => {
  const a = CurrencyMath.toScaled(10.5); // 105000n
  const b = CurrencyMath.toScaled(2.5);  // 25000n

  const sum = CurrencyMath.add(a, b);
  assert.equal(CurrencyMath.fromScaled(sum), 13.0);

  const diff = CurrencyMath.sub(a, b);
  assert.equal(CurrencyMath.fromScaled(diff), 8.0);

  const prod = CurrencyMath.mul(a, b);
  assert.equal(CurrencyMath.fromScaled(prod), 26.25);

  const quot = CurrencyMath.div(a, b);
  assert.equal(CurrencyMath.fromScaled(quot), 4.2);

  // Divide by zero returns 0n safely
  assert.equal(CurrencyMath.div(a, 0n), 0n);
});

test('CurrencyMath - monetary formatting', () => {
  const val = CurrencyMath.toScaled(1234567.89);
  assert.equal(CurrencyMath.format(val, '$', 2), '$1,234,567.89');
  assert.equal(CurrencyMath.format(val, '€', 0), '€1,234,568');

  const zero = 0n;
  assert.equal(CurrencyMath.format(zero, '$', 2), '$0.00');

  const neg = CurrencyMath.toScaled(-50.5);
  assert.equal(CurrencyMath.format(neg, '$', 2), '-$50.50');
});

test('CurrencyMath - calculatePercentages sums strictly to 100%', () => {
  const items = [
    CurrencyMath.toScaled(1),
    CurrencyMath.toScaled(1),
    CurrencyMath.toScaled(1)
  ];
  // 1/3 each: 33.33 + 33.33 + 33.34 = 100
  const pcts = CurrencyMath.calculatePercentages(items);
  const sum = pcts.reduce((a, b) => a + b, 0);
  assert.equal(sum, 100);
});
