(function initCbvChatGptPageBridge() {
  'use strict';

  const SOURCE = 'chat-branch-visualizer';
  const GRAPH_MESSAGE = 'CHATGPT_GRAPH';
  const REQUEST_MESSAGE = 'REQUEST_CHATGPT_GRAPH';
  const MAX_CACHED_GRAPHS = 8;
  const graphCache = new Map();

  function isConversationResponse(url) {
    try {
      const parsed = new URL(String(url || ''), location.href);
      return /\/backend-api\/conversation\/[^/?#]+\/?$/.test(parsed.pathname);
    } catch (_) {
      return false;
    }
  }

  function rememberGraph(data, sourceUrl) {
    const graph = globalThis.cbvConvertChatGptGraph?.(data);
    if (!graph?.conversationId || !graph.nodes?.length) return;

    graphCache.delete(graph.conversationId);
    graphCache.set(graph.conversationId, { graph, sourceUrl });
    while (graphCache.size > MAX_CACHED_GRAPHS) {
      graphCache.delete(graphCache.keys().next().value);
    }
    publishGraph(graph, sourceUrl);
  }

  function publishGraph(graph, sourceUrl) {
    window.postMessage({
      source: SOURCE,
      type: GRAPH_MESSAGE,
      graph,
      sourceUrl,
    }, location.origin);
  }

  async function inspectResponse(response, sourceUrl) {
    if (!response?.ok || !isConversationResponse(response.url)) return;
    try {
      rememberGraph(await response.clone().json(), sourceUrl);
    } catch (_) {}
  }

  function inspectParsedResponse(response, data, sourceUrl) {
    if (!response?.ok || !isConversationResponse(response.url)) return;
    try {
      rememberGraph(typeof data === 'string' ? JSON.parse(data) : data, sourceUrl);
    } catch (_) {}
  }

  const nativeFetch = window.fetch;
  window.fetch = function cbvFetch(...args) {
    const sourceUrl = location.href;
    const result = nativeFetch.apply(this, args);
    result.then(response => inspectResponse(response, sourceUrl)).catch(() => {});
    return result;
  };

  const nativeResponseJson = Response.prototype.json;
  Response.prototype.json = function cbvResponseJson(...args) {
    const sourceUrl = location.href;
    const result = nativeResponseJson.apply(this, args);
    result.then(data => inspectParsedResponse(this, data, sourceUrl)).catch(() => {});
    return result;
  };

  const nativeResponseText = Response.prototype.text;
  Response.prototype.text = function cbvResponseText(...args) {
    const sourceUrl = location.href;
    const result = nativeResponseText.apply(this, args);
    result.then(data => inspectParsedResponse(this, data, sourceUrl)).catch(() => {});
    return result;
  };

  const nativeOpen = XMLHttpRequest.prototype.open;
  XMLHttpRequest.prototype.open = function cbvOpen(method, url, ...args) {
    this.__cbvConversationResponse = isConversationResponse(url);
    this.__cbvSourceUrl = location.href;
    return nativeOpen.call(this, method, url, ...args);
  };

  const nativeSend = XMLHttpRequest.prototype.send;
  XMLHttpRequest.prototype.send = function cbvSend(...args) {
    if (this.__cbvConversationResponse) {
      this.addEventListener('load', () => {
        if (this.status < 200 || this.status >= 300) return;
        try {
          rememberGraph(JSON.parse(this.responseText), this.__cbvSourceUrl);
        } catch (_) {}
      }, { once: true });
    }
    return nativeSend.apply(this, args);
  };

  window.addEventListener('message', event => {
    if (event.source !== window || event.origin !== location.origin) return;
    if (event.data?.source !== SOURCE || event.data?.type !== REQUEST_MESSAGE) return;
    for (const entry of graphCache.values()) publishGraph(entry.graph, entry.sourceUrl);
  });
})();
