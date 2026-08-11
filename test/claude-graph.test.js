const test = require('node:test');
const assert = require('node:assert/strict');

const {
  convertConversationGraph,
  messageText,
  ROOT_MESSAGE_UUID,
} = require('../claude-graph');

function message(uuid, sender, index, parent, text = uuid) {
  return {
    uuid,
    sender,
    index,
    parent_message_uuid: parent,
    text,
  };
}

test('normalizes Claude message text', () => {
  assert.equal(messageText({ text: ' first\n  second ' }), 'first second');
});

test('converts parent UUIDs into a branched tree and active path', () => {
  const graph = convertConversationGraph({
    uuid: 'conversation-1',
    current_leaf_message_uuid: 'a2',
    chat_messages: [
      message('u1', 'human', 0, ROOT_MESSAGE_UUID, 'Question'),
      message('a1', 'assistant', 1, 'u1', 'First answer'),
      message('a2', 'assistant', 1, 'u1', 'Second answer'),
      message('u2', 'human', 2, 'a2', 'Follow-up'),
    ],
  });

  assert.equal(graph.conversationId, 'conversation-1');
  assert.equal(graph.rawNodeCount, 4);
  assert.deepEqual(graph.nodes.map(node => node.id), ['u1', 'a1', 'a2', 'u2']);
  assert.deepEqual(graph.nodes[0].children, ['a1', 'a2']);
  assert.deepEqual(
    graph.nodes.slice(1, 3).map(node => [node.branchIndex, node.branchTotal]),
    [[1, 2], [2, 2]]
  );
  assert.deepEqual(graph.activePath.map(node => node.id), ['u1', 'a2']);
});

test('sorts sibling branches deterministically and preserves full depth', () => {
  const graph = convertConversationGraph({
    uuid: 'conversation-2',
    current_leaf_message_uuid: 'u2',
    chat_messages: [
      message('a2', 'assistant', 3, 'u1', 'Later'),
      message('u1', 'human', 0, ROOT_MESSAGE_UUID, 'Start'),
      message('u2', 'human', 4, 'a1', 'Continue'),
      message('a1', 'assistant', 1, 'u1', 'Earlier'),
    ],
  });

  assert.deepEqual(graph.nodes.map(node => node.id), ['u1', 'a1', 'u2', 'a2']);
  assert.deepEqual(graph.nodes.map(node => node.turnIndex), [0, 1, 2, 1]);
  assert.deepEqual(graph.activePath.map(node => node.id), ['u1', 'a1', 'u2']);
});
