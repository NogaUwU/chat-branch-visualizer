const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

test('requests Claude conversation data in full-tree mode', () => {
  const source = fs.readFileSync(
    path.join(__dirname, '..', 'claude-page-bridge.js'),
    'utf8'
  );

  assert.match(
    source,
    /chat_conversations\/\$\{conversationId\}\?tree=true/
  );
});
