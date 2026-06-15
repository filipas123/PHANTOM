import { describe, it, expect } from 'vitest';
import { runInSandbox } from '../server/skills/sandbox.js';
import { TrustTiers, isCapabilityAllowed, resolveTrustTier } from '../server/skills/trust-tier.js';

describe('Skill Trust Tiers & Sandbox', () => {
  it('resolveTrustTier correctly resolves inputs', () => {
    expect(resolveTrustTier('TIER_0')).toBe(0);
    expect(resolveTrustTier(1)).toBe(1);
    expect(resolveTrustTier('2')).toBe(2);
    // Invalid should fallback to default (usually 3)
    expect(resolveTrustTier('INVALID')).toBe(3);
  });

  it('isCapabilityAllowed enforces correct tier permissions', () => {
    expect(isCapabilityAllowed(TrustTiers.TIER_0, 'fs:read')).toBe(true);
    expect(isCapabilityAllowed(TrustTiers.TIER_0, 'subprocess:exec')).toBe(true);

    expect(isCapabilityAllowed(TrustTiers.TIER_1, 'fs:read')).toBe(true);
    expect(isCapabilityAllowed(TrustTiers.TIER_1, 'network:http')).toBe(true);
    expect(isCapabilityAllowed(TrustTiers.TIER_1, 'subprocess:exec')).toBe(false);

    expect(isCapabilityAllowed(TrustTiers.TIER_2, 'fs:read')).toBe(true);
    expect(isCapabilityAllowed(TrustTiers.TIER_2, 'network:http')).toBe(true);
    expect(isCapabilityAllowed(TrustTiers.TIER_2, 'fs:write')).toBe(false);

    expect(isCapabilityAllowed(TrustTiers.TIER_3, 'fs:read')).toBe(false);
    expect(isCapabilityAllowed(TrustTiers.TIER_3, 'network:http')).toBe(false);
  });

  it('runInSandbox safely executes code and handles args', async () => {
    const code = `
      async function run(args) {
        return args.a + args.b;
      }
    `;
    const result = await runInSandbox(code, { a: 5, b: 10 }, TrustTiers.TIER_0);
    expect(result).toBe(15);
  });

  it('runInSandbox blocks access to node globals', async () => {
    const code = `
      async function run() {
        return typeof process;
      }
    `;
    const result = await runInSandbox(code, {}, TrustTiers.TIER_3);
    expect(result).toBe('undefined');
  });
});
