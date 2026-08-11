const test = require('node:test');
const assert = require('node:assert/strict');

const { createTurnCatalog, turnKey } = require('../turn-catalog');

test('uses stable message ids when available', () => {
  assert.equal(turnKey({ domId: 'message-1', role: 'user', text: 'hello' }), 'id:message-1');
});

test('deduplicates overlapping virtualized batches in first-seen order', () => {
  const catalog = createTurnCatalog();
  catalog.addBatch([
    { domId: 'a', role: 'user', text: 'A', branchIndex: 1, branchTotal: 1 },
    { domId: 'b', role: 'assistant', text: 'B', branchIndex: 1, branchTotal: 1 },
  ], { scrollTop: 0 });
  catalog.addBatch([
    { domId: 'b', role: 'assistant', text: 'B updated', branchIndex: 1, branchTotal: 2 },
    { domId: 'c', role: 'user', text: 'C', branchIndex: 1, branchTotal: 1 },
  ], { scrollTop: 500 });

  assert.deepEqual(catalog.entries.map(entry => entry.domId), ['a', 'b', 'c']);
  assert.equal(catalog.entries[1].text, 'B updated');
  assert.equal(catalog.entries[1].branchTotal, 2);
  assert.equal(catalog.entries[1].lastSeenAt, 500);
});

test('falls back to normalized role and text fingerprints', () => {
  const catalog = createTurnCatalog();
  catalog.addBatch([
    { role: 'assistant', text: 'same   message', branchIndex: 1, branchTotal: 1 },
    { role: 'assistant', text: 'same message', branchIndex: 1, branchTotal: 1 },
  ]);

  assert.equal(catalog.size(), 1);
});
