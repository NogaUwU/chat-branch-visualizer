// Shared platform registry and URL helpers used across extension entrypoints.
(function initCbvPlatformConfig(global) {
  'use strict';

  const PLATFORM_REGISTRY = Object.freeze([
    {
      id: 'chatgpt',
      label: 'ChatGPT',
      hosts: ['chatgpt.com', 'chat.openai.com'],
      assistantBadge: 'chatgpt',
      transientDomIdPrefixes: ['g_'],
    },
    {
      id: 'claude',
      label: 'Claude',
      hosts: ['claude.ai'],
      assistantBadge: 'claude',
      transientDomIdPrefixes: ['claude_'],
    },
  ]);

  function normalizeHost(input) {
    if (!input) return '';
    try {
      return new URL(input).hostname.toLowerCase();
    } catch (_) {
      return String(input).toLowerCase();
    }
  }

  function matchPlatform(input) {
    const host = normalizeHost(input);
    return PLATFORM_REGISTRY.find(platform =>
      platform.hosts.some(candidate => host === candidate || host.endsWith(`.${candidate}`))
    ) || null;
  }

  function getPlatform(platformId) {
    return PLATFORM_REGISTRY.find(platform => platform.id === platformId) || null;
  }

  function detectPlatform(input) {
    return matchPlatform(input)?.id || 'unknown';
  }

  function formatPlatformName(platformId) {
    return getPlatform(platformId)?.label || platformId || 'Unknown';
  }

  function getAssistantBadgeKind(platformId) {
    return getPlatform(platformId)?.assistantBadge || 'assistant';
  }

  function isSupportedUrl(input) {
    return Boolean(matchPlatform(input));
  }

  function makeStorageKey(input) {
    try {
      const url = new URL(input);
      if (!isSupportedUrl(url.href)) return null;
      return 'cbv_tree_' + (url.pathname + url.hash).replace(/[^a-zA-Z0-9]/g, '_').slice(0, 120);
    } catch (_) {
      return null;
    }
  }

  function makeNodeId(turnIndex, branchIndex, domId) {
    if (domId) {
      const isTransient = PLATFORM_REGISTRY.some(platform =>
        (platform.transientDomIdPrefixes || []).some(prefix => domId.startsWith(prefix))
      );
      if (!isTransient) return domId;
    }
    return `t${turnIndex}_b${branchIndex}`;
  }

  global.CBV_PLATFORM_REGISTRY = PLATFORM_REGISTRY;
  global.cbvMatchPlatform = matchPlatform;
  global.cbvGetPlatform = getPlatform;
  global.cbvDetectPlatform = detectPlatform;
  global.cbvFormatPlatformName = formatPlatformName;
  global.cbvGetAssistantBadgeKind = getAssistantBadgeKind;
  global.cbvIsSupportedUrl = isSupportedUrl;
  global.cbvMakeStorageKey = makeStorageKey;
  global.cbvMakeNodeId = makeNodeId;
})(globalThis);
