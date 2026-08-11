const test = require('node:test');
const assert = require('node:assert/strict');

const {
  convertConversationGraph,
  isVisibleMessage,
  messageText,
} = require('../chatgpt-graph');

function message(id, role, text, overrides = {}) {
  return {
    id,
    author: { role },
    content: { content_type: 'text', parts: [text] },
    channel: role === 'assistant' ? 'final' : null,
    end_turn: role === 'assistant',
    metadata: {},
    ...overrides,
  };
}

function node(id, parent, children, nodeMessage = null) {
  return { id, parent, children, message: nodeMessage };
}

test('extracts text from string and structured content parts', () => {
  assert.equal(messageText({
    content: {
      parts: ['first', { text: 'second' }, { image_url: 'ignored' }],
    },
  }), 'first second');
});

test('only accepts visible user messages and final assistant replies', () => {
  assert.equal(isVisibleMessage(message('u1', 'user', 'hello')), true);
  assert.equal(isVisibleMessage(message('a1', 'assistant', 'answer')), true);
  assert.equal(isVisibleMessage(message('a1b', 'assistant', 'legacy answer', {
    channel: null,
    status: 'finished_successfully',
  })), true);
  assert.equal(isVisibleMessage(message('a1c', 'assistant', 'voice answer', {
    channel: null,
    content: { content_type: 'multimodal_text', parts: ['voice answer'] },
    status: 'finished_successfully',
  })), true);
  assert.equal(isVisibleMessage(message('a2', 'assistant', 'thinking', {
    channel: 'analysis',
    end_turn: false,
  })), false);
  assert.equal(isVisibleMessage(message('a3', 'assistant', 'commentary', {
    channel: 'commentary',
    end_turn: false,
  })), false);
  assert.equal(isVisibleMessage(message('a4', 'assistant', 'streaming', {
    status: 'in_progress',
  })), false);
  assert.equal(isVisibleMessage(message('t1', 'tool', 'result')), false);
});

test('compresses internal nodes while preserving branches and active path', () => {
  const mapping = {
    root: node('root', null, ['u1']),
    u1: node('u1', 'root', ['thought'], message('user-message-1', 'user', 'Question')),
    thought: node('thought', 'u1', ['a1', 'tool'], message('thought-message', 'assistant', 'Reasoning', {
      content: { content_type: 'thoughts', parts: ['Reasoning'] },
      channel: 'analysis',
      end_turn: false,
    })),
    tool: node('tool', 'thought', ['a2'], message('tool-message', 'tool', 'Search result')),
    a1: node('a1', 'thought', [], message('assistant-message-1', 'assistant', 'First answer')),
    a2: node('a2', 'tool', [], message('assistant-message-2', 'assistant', 'Second answer')),
  };

  const graph = convertConversationGraph({
    conversation_id: 'conversation-1',
    current_node: 'a2',
    mapping,
  });

  assert.equal(graph.conversationId, 'conversation-1');
  assert.equal(graph.rawNodeCount, 6);
  assert.deepEqual(graph.nodes.map(node => node.id), [
    'user-message-1',
    'assistant-message-1',
    'assistant-message-2',
  ]);

  const user = graph.nodes[0];
  const firstAnswer = graph.nodes[1];
  const secondAnswer = graph.nodes[2];
  assert.deepEqual(user.children, ['assistant-message-1', 'assistant-message-2']);
  assert.deepEqual(
    [firstAnswer.branchIndex, firstAnswer.branchTotal, secondAnswer.branchIndex, secondAnswer.branchTotal],
    [1, 2, 2, 2]
  );
  assert.equal(firstAnswer.parentId, user.id);
  assert.equal(secondAnswer.parentId, user.id);
  assert.deepEqual(graph.activePath.map(entry => entry.id), [
    'user-message-1',
    'assistant-message-2',
  ]);
});

test('uses visible depth as turnIndex across compressed internal nodes', () => {
  const mapping = {
    root: node('root', null, ['u1']),
    u1: node('u1', 'root', ['hidden'], message('u1-message', 'user', 'One')),
    hidden: node('hidden', 'u1', ['a1'], message('hidden-message', 'assistant', 'Hidden', {
      metadata: { is_visually_hidden_from_conversation: true },
    })),
    a1: node('a1', 'hidden', ['u2'], message('a1-message', 'assistant', 'Two')),
    u2: node('u2', 'a1', [], message('u2-message', 'user', 'Three')),
  };

  const graph = convertConversationGraph({ current_node: 'u2', mapping });
  assert.deepEqual(graph.nodes.map(entry => entry.turnIndex), [0, 1, 2]);
});
