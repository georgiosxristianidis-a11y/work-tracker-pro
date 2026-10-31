import test from 'node:test';
import assert from 'node:assert/strict';
import { calcEarnings } from '../../src/lib/calculator.ts';

test('calcEarnings - standard hours without overtime', () => {
  const settings = { rate: 25, normal: 8, overtime: 1.5 };
  assert.equal(calcEarnings(8, settings), 200);
  assert.equal(calcEarnings(5, settings), 125);
  assert.equal(calcEarnings(0, settings), 0);
});

test('calcEarnings - overtime rate calculation', () => {
  const settings = { rate: 20, normal: 8, overtime: 1.5 };
  // 8h * 20 = 160 + 2h * 20 * 1.5 = 60 => 220
  assert.equal(calcEarnings(10, settings), 220);
});

test('calcEarnings - fractional hours', () => {
  const settings = { rate: 30, normal: 8, overtime: 2.0 };
  // 8h * 30 = 240 + 0.5h * 30 * 2.0 = 30 => 270
  assert.equal(calcEarnings(8.5, settings), 270);
});

test('calcEarnings - missing or zero rate/threshold fallbacks', () => {
  assert.equal(calcEarnings(8, {}), 0);
  assert.equal(calcEarnings(8, { rate: 20 }), 0); // normal is 0, so 0*20 + 8*20*0 = 0
  assert.equal(calcEarnings(8, { rate: 20, normal: 8 }), 160);
});
