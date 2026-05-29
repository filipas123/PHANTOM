import { describe, it, expect, vi, beforeEach } from 'vitest';
import fs from 'fs';
import path from 'path';

// Mock the memory store
vi.mock('../server/memory/store.js', () => ({
  recallMemory: vi.fn().mockResolvedValue([
    { key: 'test-key', value: 'remembered something important' },
    { key: 'another', value: 'another memory entry' },
  ])
}));

import { bootstrapSession } from '../server/telegram/bootstrap.js';

describe('bootstrapSession()', () => {
  it('returns skillsSummary and memorySummary', async () => {
    const result = await bootstrapSession();
    expect(result).toHaveProperty('skillsSummary');
    expect(result).toHaveProperty('memorySummary');
    expect(result).toHaveProperty('raw');
  });

  it('memorySummary contains memory content', async () => {
    const result = await bootstrapSession();
    expect(result.memorySummary).toContain('remembered something important');
  });

  it('does not throw if skills folder does not exist', async () => {
    await expect(bootstrapSession()).resolves.not.toThrow();
  });

  it('limits memories to 20 in summary', async () => {
    const { recallMemory } = await import('../server/memory/store.js');
    recallMemory.mockResolvedValueOnce(
      Array.from({ length: 25 }, (_, i) => ({ key: `k${i}`, value: `memory ${i}` }))
    );
    const result = await bootstrapSession();
    const lines = result.memorySummary.split('\n');
    expect(lines.some(l => l.includes('more memories'))).toBe(true);
  });
});
