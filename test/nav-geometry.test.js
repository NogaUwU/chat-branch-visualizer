const test = require('node:test');
const assert = require('node:assert/strict');

const { findPositionalBranchButtons } = require('../nav-geometry');

function rect(left, top, width = 24, height = 24) {
  return {
    left,
    right: left + width,
    top,
    bottom: top + height,
  };
}

function candidate(name, bounds) {
  return {
    button: { name },
    rect: bounds,
  };
}

test('finds unlabeled branch buttons on either side of the counter', () => {
  const result = findPositionalBranchButtons(
    rect(100, 40, 32, 20),
    [
      candidate('copy', rect(20, 40)),
      candidate('previous', rect(68, 38)),
      candidate('next', rect(140, 38)),
      candidate('edit', rect(188, 40)),
    ]
  );

  assert.equal(result.prevBtn.name, 'previous');
  assert.equal(result.nextBtn.name, 'next');
});

test('rejects buttons that are only on one side of the counter', () => {
  const result = findPositionalBranchButtons(
    rect(100, 40, 32, 20),
    [
      candidate('copy', rect(36, 40)),
      candidate('edit', rect(68, 40)),
    ]
  );

  assert.equal(result, null);
});

test('rejects vertically misaligned action buttons', () => {
  const result = findPositionalBranchButtons(
    rect(100, 40, 32, 20),
    [
      candidate('left action', rect(68, 80)),
      candidate('right action', rect(140, 80)),
    ]
  );

  assert.equal(result, null);
});

test('rejects buttons too far away from the counter', () => {
  const result = findPositionalBranchButtons(
    rect(200, 40, 32, 20),
    [
      candidate('left action', rect(20, 40)),
      candidate('right action', rect(340, 40)),
    ]
  );

  assert.equal(result, null);
});
