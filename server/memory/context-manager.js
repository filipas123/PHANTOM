import { searchSimilar } from './store.js';

/**
 * Intelligent context retrieval to populate the agent's prompt.
 * Uses semantic search to find relevant past analyses within a given token budget.
 *
 * @param {string} currentTask - The active task description.
 * @param {number} maxTokens - The token budget for context insertion (approx. 4 chars per token).
 * @returns {Promise<string>} The retrieved context formatted as a string.
 */
export async function getRelevantContext(currentTask, maxTokens = 2000) {
  try {
    const results = await searchSimilar(currentTask, 10);

    let contextStr = '';
    let currentTokens = 0;

    for (const res of results) {
      const entry = `[${res.category}] ${res.key}: ${res.value}\n`;
      const entryTokens = Math.ceil(entry.length / 4);

      if (currentTokens + entryTokens > maxTokens) {
        break;
      }

      contextStr += entry;
      currentTokens += entryTokens;
    }

    return contextStr.trim() ? `## RELEVANT PAST ANALYSES\n${contextStr}` : '';
  } catch (err) {
    console.error('[ContextManager] Error retrieving context:', err.message);
    return '';
  }
}
