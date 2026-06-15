import config from '../config.js';

/**
 * The Planner Agent decomposes complex defensive analysis requests into
 * discrete, actionable subtasks and constructs a task graph.
 */
export class PlannerAgent {
  constructor() {
    this.model = config.agents?.plannerModel || 'gpt-4o';
  }

  /**
   * Plans the execution strategy by decomposing the user prompt.
   * @param {string} goal - The user's analysis request.
   * @returns {Promise<Object>} The generated task graph representation.
   */
  async plan(goal) {
    console.log(`[Planner] Decomposing goal: ${goal}`);

    // In a real implementation, this would call the LLM using this.model
    // to dynamically generate the task graph. For the architecture phase,
    // we return a static mock graph representing a typical defensive flow.

    const taskGraph = {
      id: `plan-${Date.now()}`,
      goal,
      nodes: [
        { id: 'task-1', agent: 'threat-modeling', payload: { diagram: 'architecture.png' }, status: 'pending' },
        { id: 'task-2', agent: 'log-analysis', payload: { log_file: '/var/log/auth.log' }, status: 'pending' },
        { id: 'task-3', agent: 'compliance', payload: { config_file: '/etc/ssh/sshd_config' }, status: 'pending' },
        { id: 'task-4', agent: 'report', payload: { merge_previous: true }, status: 'pending', dependencies: ['task-1', 'task-2', 'task-3'] }
      ]
    };

    console.log('[Planner] Task graph generated. Submitting to orchestrator.');
    return taskGraph;
  }
}
