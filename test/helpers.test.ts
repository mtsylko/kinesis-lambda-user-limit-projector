import test from 'node:test';
import assert from 'node:assert/strict';

import { addDecimalStrings } from '../src/helpers';

test('adds integer values', () => {
  assert.equal(addDecimalStrings('10', '5'), '15');
});

test('adds decimal values without floating-point errors', () => {
  assert.equal(addDecimalStrings('0.1', '0.2'), '0.3');
});

test('adds very large decimal values safely', () => {
  assert.equal(
    addDecimalStrings('999999999999999999999999999999.99', '0.01'),
    '1000000000000000000000000000000',
  );
});
