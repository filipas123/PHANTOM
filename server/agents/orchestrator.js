import { PlannerAgent } from './planner.js';
import { ExecutorAgent } from './executor.js';
import { TaskGraph, executeTaskGraph } from './task-graph.js';
import { AgentStateStore } from './state-store.js';

/**
 * The Orchestrator acts as the message bus and coordination layer.
 * It routes tasks between the planner and executors, manages shared state, and handles execution flow.
 */
class AgentOrchestrator {
  constructor() {
    this.stateStore = new AgentStateStore();
  }

  /**
   * Initializes the orchestrator components.
   */
  async init() {
    await this.stateStore.init();
    this.planner = new PlannerAgent();
    this.executor = new ExecutorAgent(); // Generic executor for now, could route to specialists
  }

  /**
   * Handles a high-level user analysis request.
   * @param {string} goal - The user's goal.
   * @param {string} sessionId - A unique session/conversation ID.
   * @returns {Promise<Object>} The final aggregated results.
   */
  async runAnalysis(goal, sessionId) {
    console.log(`[Orchestrator] Starting analysis for session ${sessionId}: ${goal}`);

    // 1. Planner decomposes the goal into a task graph
    const plan = await this.planner.plan(goal);
    const graph = new TaskGraph(plan);

    // Persist initial state
    await this.stateStore.saveGraphState(sessionId, graph);

    // 2. Execute the task graph dynamically routing to executors
    try {
      const results = await executeTaskGraph(graph, async (node) => {
        // Dispatch task to the executor (in a full system, this might route to specific specialist agents)
        const result = await this.executor.execute(node);

        // Update state after each node execution
        await this.stateStore.saveGraphState(sessionId, graph);
        return result;
      });

      console.log(`[Orchestrator] Analysis complete for session ${sessionId}`);
      return { success: true, graph: results };
    } catch (err) {
      console.error(`[Orchestrator] Analysis failed for session ${sessionId}:`, err.message);
      await this.stateStore.saveGraphState(sessionId, graph); // Save failed state
      return { success: false, error: err.message, graph: Array.from(graph.nodes.values()) };
    }
  }
}

export const orchestrator = new AgentOrchestrator();
