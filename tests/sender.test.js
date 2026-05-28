import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock telegramify-markdown
vi.mock('telegramify-markdown', () => ({
  default: (text) => text.includes('word') && text.length > 100 ? text + '\nword'.repeat(1000) : text.replace(/\*\*/g, '*').replace(/_{2}/g, '__')
}));

// Mock mime-types
vi.mock('mime-types', () => ({
  default: {
    lookup: (file) => {
        if (file.endsWith('.jpg')) return 'image/jpeg';
        if (file.endsWith('.mp4')) return 'video/mp4';
        if (file.endsWith('.mp3')) return 'audio/mpeg';
        return 'application/octet-stream';
    }
  }
}));

import { sendAIReply, sendPlain, sendToolUpdate, sendError } from '../server/telegram/sender.js';

describe('sendAIReply()', () => {
  it('calls bot.sendMessage with parse_mode MarkdownV2', async () => {
    const bot = { sendMessage: vi.fn().mockResolvedValue({}) };
    await sendAIReply(bot, 123, '**hello** world');
    expect(bot.sendMessage).toHaveBeenCalledWith(
      123,
      expect.any(String),
      expect.objectContaining({ parse_mode: 'MarkdownV2' })
    );
  });

  it('falls back to plain text if MarkdownV2 send fails', async () => {
    const bot = {
      sendMessage: vi.fn()
        .mockRejectedValueOnce(new Error('Bad Request: can\'t parse entities'))
        .mockResolvedValueOnce({})
    };
    await sendAIReply(bot, 123, 'hello world');
    expect(bot.sendMessage).toHaveBeenCalledTimes(2);
    // Second call should NOT have parse_mode
    expect(bot.sendMessage.mock.calls[1][2]).toBeUndefined();
  });

  it('splits messages over 4096 chars into multiple sends', async () => {
    const bot = { sendMessage: vi.fn().mockResolvedValue({}) };
    const longText = 'word '.repeat(1000); // ~5000 chars
    await sendAIReply(bot, 123, longText);
    expect(bot.sendMessage.mock.calls.length).toBeGreaterThan(1);
  });
});

describe('sendToolUpdate()', () => {
  it('sends a message with the tool name', async () => {
    const bot = { sendMessage: vi.fn().mockResolvedValue({}) };
    await sendToolUpdate(bot, 123, 'execute_command', 'ls -la', 'running');
    const callArg = bot.sendMessage.mock.calls[0][1];
    expect(callArg).toContain('execute');
    expect(callArg).toContain('🔄');
  });
});

describe('sendError()', () => {
  it('sends error with red X emoji', async () => {
    const bot = { sendMessage: vi.fn().mockResolvedValue({}) };
    await sendError(bot, 123, 'Something failed');
    const callArg = bot.sendMessage.mock.calls[0][1];
    expect(callArg).toContain('❌');
  });
});
