(function initCbvClaudePageBridge() {
  'use strict';

  const SOURCE = 'chat-branch-visualizer';
  const GRAPH_MESSAGE = 'CLAUDE_GRAPH';
  const REQUEST_MESSAGE = 'REQUEST_CLAUDE_GRAPH';
  const CONVERSATION_PATH = /^\/chat\/([^/?#]+)\/?$/;
  const graphCache = new Map();
  let inFlight = null;

  function conversationIdFromPage() {
    return location.pathname.match(CONVERSATION_PATH)?.[1] || null;
  }

  function isConversationResponse(url, conversationId = conversationIdFromPage()) {
    try {
      const parsed = new URL(String(url || ''), location.href);
      return parsed.origin === location.origin
        && parsed.pathname.endsWith(`/chat_conversations/${conversationId}`);
    } catch (_) {
      return false;
    }
  }

  function rememberGraph(data, sourceUrl) {
    const graph = globalThis.cbvConvertClaudeGraph?.(data);
    if (!graph?.conversationId || !graph.nodes?.length) return null;
    graphCache.set(graph.conversationId, graph);
    publishGraph(graph, sourceUrl);
    return graph;
  }

  function publishGraph(graph, sourceUrl = location.href) {
    window.postMessage({
      source: SOURCE,
      type: GRAPH_MESSAGE,
      graph,
      sourceUrl,
    }, location.origin);
  }

  async function fetchCurrentGraph() {
    const conversationId = conversationIdFromPage();
    if (!conversationId) return null;
    const cached = graphCache.get(conversationId);
    if (cached) publishGraph(cached);
    if (inFlight) return inFlight;

    inFlight = (async () => {
      const organizationsResponse = await nativeFetch.call(window, '/api/organizations', {
        credentials: 'include',
      });
      if (!organizationsResponse.ok) return null;
      const organizations = await organizationsResponse.json();
      const organizationIds = (Array.isArray(organizations) ? organizations : [organizations])
        .map(organization => organization?.uuid)
        .filter(Boolean);
      for (const organizationId of organizationIds) {
        const response = await nativeFetch.call(
          window,
          `/api/organizations/${organizationId}/chat_conversations/${conversationId}?tree=true`,
          { credentials: 'include' }
        );
        if (!response.ok) continue;
        return rememberGraph(await response.json(), location.href);
      }
      return null;
    })().catch(() => null).finally(() => {
      inFlight = null;
    });
    return inFlight;
  }

  async function inspectResponse(response, sourceUrl) {
    if (!response?.ok || !isConversationResponse(response.url)) return;
    try {
      rememberGraph(await response.clone().json(), sourceUrl);
    } catch (_) {}
  }

  const nativeFetch = window.fetch;
  window.fetch = function cbvClaudeFetch(...args) {
    const sourceUrl = location.href;
    const result = nativeFetch.apply(this, args);
    result.then(response => inspectResponse(response, sourceUrl)).catch(() => {});
    return result;
  };

  window.addEventListener('message', event => {
    if (event.source !== window || event.origin !== location.origin) return;
    if (event.data?.source !== SOURCE || event.data?.type !== REQUEST_MESSAGE) return;
    fetchCurrentGraph();
  });
})();
