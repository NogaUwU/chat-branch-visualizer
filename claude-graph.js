(function initCbvClaudeGraph(global) {
  'use strict';

  const ROOT_MESSAGE_UUID = '00000000-0000-4000-8000-000000000000';

  function messageText(message) {
    return String(message?.text || '').trim().replace(/\s+/g, ' ');
  }

  function convertConversationGraph(data) {
    const messages = Array.isArray(data?.chat_messages) ? data.chat_messages : [];
    const messageById = new Map(messages.map(message => [message.uuid, message]));
    const childrenByParent = new Map();

    for (const message of messages) {
      const parentId = message.parent_message_uuid;
      const key = messageById.has(parentId) ? parentId : ROOT_MESSAGE_UUID;
      if (!childrenByParent.has(key)) childrenByParent.set(key, []);
      childrenByParent.get(key).push(message);
    }

    for (const children of childrenByParent.values()) {
      children.sort((left, right) => {
        const indexDifference = Number(left.index || 0) - Number(right.index || 0);
        if (indexDifference) return indexDifference;
        return String(left.created_at || '').localeCompare(String(right.created_at || ''));
      });
    }

    const nodes = [];
    const nodeById = new Map();
    const visited = new Set();

    function visit(message, depth, parentId = null) {
      if (!message?.uuid || visited.has(message.uuid)) return;
      visited.add(message.uuid);

      const siblings = childrenByParent.get(
        messageById.has(message.parent_message_uuid)
          ? message.parent_message_uuid
          : ROOT_MESSAGE_UUID
      ) || [message];
      const node = {
        id: message.uuid,
        parentId,
        turnIndex: depth,
        branchIndex: Math.max(1, siblings.findIndex(sibling => sibling.uuid === message.uuid) + 1),
        branchTotal: Math.max(1, siblings.length),
        role: message.sender === 'human' ? 'user' : 'assistant',
        text: messageText(message).slice(0, 220),
        children: [],
      };
      nodes.push(node);
      nodeById.set(node.id, node);

      for (const child of childrenByParent.get(message.uuid) || []) {
        node.children.push(child.uuid);
        visit(child, depth + 1, node.id);
      }
    }

    for (const root of childrenByParent.get(ROOT_MESSAGE_UUID) || []) visit(root, 0);
    for (const message of messages) {
      if (!visited.has(message.uuid)) visit(message, 0);
    }

    const activePath = [];
    const pathSeen = new Set();
    let cursor = data?.current_leaf_message_uuid;
    while (cursor && nodeById.has(cursor) && !pathSeen.has(cursor)) {
      pathSeen.add(cursor);
      const node = nodeById.get(cursor);
      activePath.unshift({
        id: node.id,
        turnIndex: node.turnIndex,
        branchIndex: node.branchIndex,
        role: node.role,
        text: node.text,
      });
      cursor = node.parentId;
    }

    return {
      conversationId: data?.uuid || null,
      nodes,
      activePath,
      rawNodeCount: messages.length,
    };
  }

  global.cbvConvertClaudeGraph = convertConversationGraph;

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = { convertConversationGraph, messageText, ROOT_MESSAGE_UUID };
  }
})(globalThis);
