import { pipeline } from '@xenova/transformers';

let extractor;
let isReady = false;

/**
 * Initializes the embeddings model using @xenova/transformers.
 * Loads the all-MiniLM-L6-v2 model locally.
 */
export async function initEmbeddings() {
  if (extractor) return;
  try {
    extractor = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2');
    isReady = true;
    console.log('[Embeddings] Model all-MiniLM-L6-v2 initialized successfully.');
  } catch (err) {
    console.error('[Embeddings] Failed to initialize model:', err.message);
    throw err;
  }
}

/**
 * Generates vector embeddings for a given text.
 * @param {string} text - The input text to embed.
 * @returns {Promise<Float32Array|null>} The generated embedding vector, or null if generation fails.
 */
export async function generateEmbedding(text) {
  if (!isReady || !extractor) {
    await initEmbeddings();
  }
  try {
    const output = await extractor(text, { pooling: 'mean', normalize: true });
    // output.data is a Float32Array containing the 384-dimensional embedding
    return new Float32Array(output.data);
  } catch (err) {
    console.error('[Embeddings] Error generating embedding:', err.message);
    return null;
  }
}
