(function initCbvConversationRoutes(global) {
  'use strict';

  function pathSegments(input) {
    try {
      return new URL(String(input || '')).pathname.split('/').filter(Boolean);
    } catch (_) {
      return String(input || '').split('?')[0].split('#')[0].split('/').filter(Boolean);
    }
  }

  function classifyConversationRoute(platform, input) {
    const segments = pathSegments(input);

    if (platform === 'chatgpt') {
      if (segments[0] === 'c' && segments[1]) return 'chatgpt-conversation';
      if (segments[0] === 'branch' && segments[1]) return 'chatgpt-branch-conversation';
      if (segments[0] === 'g') {
        const conversationIndex = segments.indexOf('c', 2);
        if (segments[1] && conversationIndex >= 2 && segments[conversationIndex + 1]) {
          return 'chatgpt-project-conversation';
        }
      }
    }

    if (platform === 'claude' && segments[0] === 'chat' && segments[1]) {
      return 'claude-conversation';
    }

    return 'non-conversation';
  }

  function isConversationRoute(platform, input) {
    return classifyConversationRoute(platform, input) !== 'non-conversation';
  }

  global.cbvClassifyConversationRoute = classifyConversationRoute;
  global.cbvIsConversationRoute = isConversationRoute;

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
      classifyConversationRoute,
      isConversationRoute,
    };
  }
})(globalThis);
