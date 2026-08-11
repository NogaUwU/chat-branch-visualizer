(function initCbvChatGptGraph(global) {
  'use strict';

  function messageText(message) {
    const parts = message?.content?.parts;
    if (!Array.isArray(parts)) return '';
    return parts
      .map(part => {
        if (typeof part === 'string') return part;
        if (typeof part?.text === 'string') return part.text;
        return '';
      })
      .filter(Boolean)
      .join('\n')
      .trim()
      .replace(/\s+/g, ' ');
  }

  function isVisibleMessage(message) {
    if (!message || message.metadata?.is_visually_hidden_from_conversation) return false;
    const role = message.author?.role;
    const contentType = message.content?.content_type;
    if (role === 'user') return contentType === 'text' || contentType === 'multimodal_text';
    if (role !== 'assistant' || !['text', 'multimodal_text'].includes(contentType)) return false;
    if (message.status && message.status !== 'finished_successfully') return false;
    return message.end_turn === true || message.channel === 'final';
  }

  function convertConversationGraph(data) {
    const mapping = data?.mapping || {};
    const rawNodes = Object.values(mapping);
    const visibleNodes = new Map();
    const visibleChildren = new Map();
    const roots = rawNodes.filter(node => !node.parent || !mapping[node.parent]);

    function addChild(parentId, childId) {
      const key = parentId || '__root__';
      if (!visibleChildren.has(key)) visibleChildren.set(key, []);
      const children = visibleChildren.get(key);
      if (!children.includes(childId)) children.push(childId);
    }

    function visit(rawNode, visibleParentId = null, depth = 0, seen = new Set()) {
      if (!rawNode || seen.has(rawNode.id)) return;
      seen.add(rawNode.id);

      let nextParentId = visibleParentId;
      let nextDepth = depth;
      if (isVisibleMessage(rawNode.message)) {
        const id = rawNode.message.id || rawNode.id;
        visibleNodes.set(id, {
          id,
          parentId: visibleParentId,
          turnIndex: depth,
          branchIndex: 1,
          branchTotal: 1,
          role: rawNode.message.author.role,
          text: messageText(rawNode.message).slice(0, 220),
          children: [],
        });
        addChild(visibleParentId, id);
        nextParentId = id;
        nextDepth = depth + 1;
      }

      for (const childId of rawNode.children || []) {
        visit(mapping[childId], nextParentId, nextDepth, seen);
      }
    }

    for (const root of roots) visit(root);

    for (const [parentKey, children] of visibleChildren.entries()) {
      const branchTotal = children.length;
      children.forEach((childId, index) => {
        const child = visibleNodes.get(childId);
        if (!child) return;
        child.branchIndex = index + 1;
        child.branchTotal = Math.max(1, branchTotal);
      });
      if (parentKey !== '__root__') {
        const parent = visibleNodes.get(parentKey);
        if (parent) parent.children = [...children];
      }
    }

    const currentRawPath = [];
    let cursor = data?.current_node;
    const pathSeen = new Set();
    while (cursor && mapping[cursor] && !pathSeen.has(cursor)) {
      pathSeen.add(cursor);
      currentRawPath.unshift(mapping[cursor]);
      cursor = mapping[cursor].parent;
    }
    const activePath = currentRawPath
      .map(node => node.message?.id || node.id)
      .filter(id => visibleNodes.has(id))
      .map(id => {
        const node = visibleNodes.get(id);
        return {
          id: node.id,
          turnIndex: node.turnIndex,
          branchIndex: node.branchIndex,
          role: node.role,
          text: node.text,
        };
      });

    return {
      conversationId: data?.conversation_id || data?.id || null,
      nodes: [...visibleNodes.values()],
      activePath,
      rawNodeCount: rawNodes.length,
    };
  }

  global.cbvConvertChatGptGraph = convertConversationGraph;

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = { convertConversationGraph, isVisibleMessage, messageText };
  }
})(globalThis);
