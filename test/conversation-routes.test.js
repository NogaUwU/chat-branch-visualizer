const test = require('node:test');
const assert = require('node:assert/strict');

const {
  classifyConversationRoute,
  isConversationRoute,
} = require('../conversation-routes');

const supportedRoutes = [
  ['chatgpt', 'https://chatgpt.com/c/abc', 'chatgpt-conversation'],
  ['chatgpt', 'https://chatgpt.com/g/g-p-project/c/abc', 'chatgpt-project-conversation'],
  ['chatgpt', 'https://chatgpt.com/g/g-custom/c/abc', 'chatgpt-project-conversation'],
  ['chatgpt', 'https://chatgpt.com/branch/abc/def', 'chatgpt-branch-conversation'],
  ['chatgpt', 'https://chat.openai.com/c/abc', 'chatgpt-conversation'],
  ['claude', 'https://claude.ai/chat/abc', 'claude-conversation'],
];

for (const [platform, url, expected] of supportedRoutes) {
  test(`recognizes ${expected}`, () => {
    assert.equal(classifyConversationRoute(platform, url), expected);
    assert.equal(isConversationRoute(platform, url), true);
  });
}

const unsupportedRoutes = [
  ['chatgpt', 'https://chatgpt.com/'],
  ['chatgpt', 'https://chatgpt.com/?utm_source=search'],
  ['chatgpt', 'https://chatgpt.com/g/g-p-project/project'],
  ['chatgpt', 'https://chatgpt.com/g/g-custom'],
  ['claude', 'https://claude.ai/recents'],
  ['claude', 'https://claude.ai/code/artifact/abc'],
  ['claude', 'https://claude.ai/apps'],
];

for (const [platform, url] of unsupportedRoutes) {
  test(`rejects non-conversation route ${url}`, () => {
    assert.equal(classifyConversationRoute(platform, url), 'non-conversation');
    assert.equal(isConversationRoute(platform, url), false);
  });
}
