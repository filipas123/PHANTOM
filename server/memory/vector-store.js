/**
 * Computes the cosine similarity between two Float32Array vectors.
 * @param {Float32Array} vecA - First vector.
 * @param {Float32Array} vecB - Second vector.
 * @returns {number} Cosine similarity score (between -1 and 1).
 */
export function cosineSimilarity(vecA, vecB) {
  if (vecA.length !== vecB.length) {
    throw new Error('Vector dimensions must match.');
  }
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }
  if (normA === 0 || normB === 0) return 0;
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

/**
 * Searches a list of memory objects (which must include `vector_embedding` as a Buffer or Uint8Array)
 * and returns the top-k most similar items to the query vector.
 * @param {Float32Array} queryVector - The vector embedding of the search query.
 * @param {Array<Object>} memories - List of memory objects from the DB.
 * @param {number} topK - Number of results to return.
 * @returns {Array<Object>} The top-k similar memory objects, sorted by score descending.
 */
export function searchSimilarVectors(queryVector, memories, topK = 5) {
  const scored = memories.map(mem => {
    let similarity = 0;
    if (mem.vector_embedding) {
      // Reconstruct Float32Array from raw buffer
      const buffer = mem.vector_embedding.buffer || mem.vector_embedding;
      const memVector = new Float32Array(buffer.buffer, buffer.byteOffset, buffer.byteLength / Float32Array.BYTES_PER_ELEMENT);
      if (memVector.length === queryVector.length) {
        similarity = cosineSimilarity(queryVector, memVector);
      }
    }
    return { ...mem, _score: similarity };
  });

  return scored
    .filter(m => m._score > 0)
    .sort((a, b) => b._score - a._score)
    .slice(0, topK);
}
