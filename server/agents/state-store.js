import { getDB } from '../memory/store.js';

/**
 * Shared agent state storage using the SQLite backend.
 * Provides persistence for orchestrator execution and inter-agent communication.
 */
export class AgentStateStore {
  async init() {
    try {
      const db = getDB();
      db.prepare(`
        CREATE TABLE IF NOT EXISTS agent_task_states (
          session_id TEXT PRIMARY KEY,
          graph_state TEXT NOT NULL,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `).run();
    } catch (err) {
      console.error('[AgentStateStore] Failed to initialize table:', err.message);
    }
  }

  /**
   * Persists the current state of a Task Graph.
   * @param {string} sessionId
   * @param {Object} graph - The TaskGraph instance to serialize.
   */
  async saveGraphState(sessionId, graph) {
    try {
      const db = getDB();
      const stateObj = {
        id: graph.id,
        goal: graph.goal,
        nodes: Array.from(graph.nodes.values()),
        adjacencyList: Array.from(graph.adjacencyList.entries()),
        inDegree: Array.from(graph.inDegree.entries())
      };
      const serialized = JSON.stringify(stateObj);

      const existing = db.prepare('SELECT session_id FROM agent_task_states WHERE session_id = ?').get(sessionId);

      if (existing) {
        db.prepare('UPDATE agent_task_states SET graph_state = ?, updated_at = CURRENT_TIMESTAMP WHERE session_id = ?')
          .run(serialized, sessionId);
      } else {
        db.prepare('INSERT INTO agent_task_states (session_id, graph_state) VALUES (?, ?)')
          .run(sessionId, serialized);
      }
    } catch (err) {
      console.error(`[AgentStateStore] Failed to save state for ${sessionId}:`, err.message);
    }
  }

  /**
   * Retrieves the persisted state of a Task Graph.
   * @param {string} sessionId
   * @returns {Object|null} The serialized graph state.
   */
  async loadGraphState(sessionId) {
    try {
      const db = getDB();
      const result = db.prepare('SELECT graph_state FROM agent_task_states WHERE session_id = ?').get(sessionId);
      if (result && result.graph_state) {
        return JSON.parse(result.graph_state);
      }
      return null;
    } catch (err) {
      console.error(`[AgentStateStore] Failed to load state for ${sessionId}:`, err.message);
      return null;
    }
  }
}
