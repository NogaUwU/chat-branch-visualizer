(function initCbvTurnCatalog(global) {
  'use strict';

  function turnKey(turn) {
    if (turn?.domId) return `id:${turn.domId}`;
    const role = String(turn?.role || 'unknown');
    const text = String(turn?.text || '').trim().replace(/\s+/g, ' ').slice(0, 160);
    return `text:${role}:${text}`;
  }

  function createTurnCatalog() {
    const entries = [];
    const byKey = new Map();

    function addBatch(turns, meta = {}) {
      for (const turn of turns || []) {
        const key = turnKey(turn);
        const existing = byKey.get(key);
        if (existing) {
          existing.branchIndex = turn.branchIndex;
          existing.branchTotal = turn.branchTotal;
          existing.text = turn.text || existing.text;
          existing.lastSeenAt = meta.scrollTop ?? existing.lastSeenAt;
          continue;
        }

        const entry = {
          key,
          domId: turn.domId || null,
          role: turn.role,
          text: turn.text,
          branchIndex: turn.branchIndex,
          branchTotal: turn.branchTotal,
          firstSeenAt: meta.scrollTop ?? null,
          lastSeenAt: meta.scrollTop ?? null,
        };
        entries.push(entry);
        byKey.set(key, entry);
      }
      return entries;
    }

    return {
      addBatch,
      entries,
      has(key) {
        return byKey.has(key);
      },
      size() {
        return entries.length;
      },
    };
  }

  global.cbvTurnKey = turnKey;
  global.cbvCreateTurnCatalog = createTurnCatalog;

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = { createTurnCatalog, turnKey };
  }
})(globalThis);
