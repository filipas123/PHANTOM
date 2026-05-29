import { describe, it, expect, vi, beforeEach } from 'vitest';
import { processMessage, resetClient, getClient } from '../server/ai/llm-client.js';
import { initDB, createConversation } from '../server/memory/store.js';

describe('LLM Client', () => {
  let conversationId;

  beforeEach(() => {
    initDB(':memory:');
    const conv = createConversation('Test Conv');
    conversationId = conv.id;
    resetClient();
  });

  it('processMessage should correctly build messages array and process streaming chunks', async () => {
    const mockChunks = [
      { choices: [{ delta: { content: 'Hello' } }] },
      { choices: [{ delta: { content: ' World' } }] },
      { choices: [{ finish_reason: 'stop' }] }
    ];

    // Async generator for mock response
    async function* mockStream() {
      for (const chunk of mockChunks) {
        yield chunk;
      }
    }

    const mockCreate = vi.fn().mockResolvedValue(mockStream());

    const client = getClient();
    vi.spyOn(Object.getPrototypeOf(client.chat.completions), 'create').mockImplementation(mockCreate);

    const onChunk = vi.fn();
    const onToolCall = vi.fn();
    const onToolResult = vi.fn();
    const onError = vi.fn();

    const result = await processMessage(
      conversationId,
      'Say Hello',
      "",
      onChunk,
      onToolCall,
      onToolResult,
      onError
    );

    expect(result).toBe('Hello World');
    expect(onChunk).toHaveBeenCalledTimes(2);
    expect(onChunk).toHaveBeenNthCalledWith(1, 'Hello');
    expect(onChunk).toHaveBeenNthCalledWith(2, ' World');
  });

  it('processMessage should parse tool_use response blocks correctly', async () => {
     // Setup mock tools and mock tools response
     const mockChunks = [
      { choices: [{ delta: { tool_calls: [{ index: 0, id: 'call_123', type: 'function', function: { name: 'read_file', arguments: '{"path":"test.txt"}' } }] } }] },
      { choices: [{ finish_reason: 'tool_calls' }] }
    ];

    async function* mockStream() {
      for (const chunk of mockChunks) {
        yield chunk;
      }
    }

    const mockCreate = vi.fn().mockResolvedValue(mockStream());
    const client = getClient();
    vi.spyOn(Object.getPrototypeOf(client.chat.completions), 'create').mockImplementation(mockCreate);

    // Mock executor
    vi.mock('../server/tools/executor.js', () => ({
      executeTool: vi.fn().mockResolvedValue('Done')
    }));

    const onChunk = vi.fn();
    const onToolCall = vi.fn();
    const onToolResult = vi.fn();
    const onError = vi.fn();

    await processMessage(
      conversationId,
      'Read test.txt',
      "",
      onChunk,
      onToolCall,
      onToolResult,
      onError
    );

    expect(onToolCall).toHaveBeenCalledTimes(1);
    expect(onToolCall).toHaveBeenCalledWith(expect.objectContaining({
      name: 'read_file',
      args: { path: 'test.txt' }
    }));
  });
});
