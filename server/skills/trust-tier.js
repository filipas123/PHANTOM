import config from '../config.js';

/**
 * Trust Tier Definitions based on CSA Agentic Trust Framework.
 */
export const TrustTiers = {
  TIER_0: 0, // First-party (owner-authored) — full permissions
  TIER_1: 1, // Verified publisher — read + limited write
  TIER_2: 2, // Community (signed) — read-only
  TIER_3: 3  // Unverified — sandbox only, quarantine
};

/**
 * Maps a tier name or number to the TrustTier enum.
 * @param {string|number} tier
 * @returns {number} The resolved trust tier level (0-3).
 */
export function resolveTrustTier(tier) {
  if (typeof tier === 'number' && Object.values(TrustTiers).includes(tier)) {
    return tier;
  }

  if (typeof tier === 'string') {
    const upper = tier.toUpperCase().replace('-', '_');
    if (TrustTiers[upper] !== undefined) {
      return TrustTiers[upper];
    }
    const parsed = parseInt(tier, 10);
    if (!isNaN(parsed) && Object.values(TrustTiers).includes(parsed)) {
      return parsed;
    }
  }

  // Default to the config or lowest trust (TIER_3)
  return config.skills?.trustTierDefault ?? TrustTiers.TIER_3;
}

/**
 * Checks if a given tier has the required capability.
 * @param {number} tier - The current trust tier.
 * @param {string} capability - The requested capability (e.g., 'fs:write', 'network:all', 'subprocess:exec').
 * @returns {boolean} True if the tier is allowed to perform the capability.
 */
export function isCapabilityAllowed(tier, capability) {
  switch (tier) {
    case TrustTiers.TIER_0:
      return true; // Full permissions
    case TrustTiers.TIER_1:
      // Verified: read, limited write, limited network, no raw subprocess
      if (capability.startsWith('fs:read')) return true;
      if (capability === 'fs:write_workspace') return true;
      if (capability.startsWith('network:')) return true;
      return false;
    case TrustTiers.TIER_2:
      // Community: read-only, limited network
      if (capability.startsWith('fs:read')) return true;
      if (capability === 'network:http') return true;
      return false;
    case TrustTiers.TIER_3:
    default:
      // Unverified: strictly sandboxed, no FS, no Network, no subprocess
      return false;
  }
}
