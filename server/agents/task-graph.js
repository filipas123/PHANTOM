/**
 * Represents a Directed Acyclic Graph (DAG) for analysis tasks.
 */
export class TaskGraph {
  constructor(plan) {
    this.id = plan.id;
    this.goal = plan.goal;
    // Map of nodeId -> node
    this.nodes = new Map();
    // Map of nodeId -> array of dependent nodeIds
    this.adjacencyList = new Map();
    // In-degree tracking for topological sorting/execution
    this.inDegree = new Map();

    this._initialize(plan.nodes);
  }

  _initialize(nodes) {
    for (const node of nodes) {
      this.nodes.set(node.id, { ...node, result: null });
      this.adjacencyList.set(node.id, []);
      this.inDegree.set(node.id, 0);
    }

    for (const node of nodes) {
      if (node.dependencies && Array.isArray(node.dependencies)) {
        for (const depId of node.dependencies) {
          if (this.nodes.has(depId)) {
            this.adjacencyList.get(depId).push(node.id);
            this.inDegree.set(node.id, this.inDegree.get(node.id) + 1);
          }
        }
      }
    }
  }

  /**
   * Gets all nodes that have 0 in-degree (no pending dependencies) and are still pending.
   * @returns {Array<Object>} List of executable nodes.
   */
  getExecutableNodes() {
    const executable = [];
    for (const [id, degree] of this.inDegree.entries()) {
      if (degree === 0 && this.nodes.get(id).status === 'pending') {
        executable.push(this.nodes.get(id));
      }
    }
    return executable;
  }

  /**
   * Marks a task as complete and updates the graph dependencies.
   * @param {string} nodeId - The completed task ID.
   * @param {Object} result - The summary result of the task.
   */
  markTaskComplete(nodeId, result) {
    const node = this.nodes.get(nodeId);
    if (!node) return;

    node.status = 'completed';
    node.result = result;

    // Reduce in-degree for dependents
    const dependents = this.adjacencyList.get(nodeId) || [];
    for (const depId of dependents) {
      const currentDegree = this.inDegree.get(depId);
      this.inDegree.set(depId, currentDegree - 1);
    }
  }

  /**
   * Checks if all nodes in the graph are completed.
   * @returns {boolean}
   */
  isComplete() {
    for (const node of this.nodes.values()) {
      if (node.status !== 'completed') return false;
    }
    return true;
  }
}

/**
 * Convenience function to process a task graph.
 * @param {TaskGraph} graph
 * @param {Function} executeTaskFn - Async function to execute a given task node.
 */
export async function executeTaskGraph(graph, executeTaskFn) {
  while (!graph.isComplete()) {
    const executableNodes = graph.getExecutableNodes();

    if (executableNodes.length === 0 && !graph.isComplete()) {
      throw new Error('Task graph execution deadlocked! Circular dependency or orphaned node detected.');
    }

    // Execute independent nodes in parallel
    const promises = executableNodes.map(async (node) => {
      node.status = 'running';
      try {
        const result = await executeTaskFn(node);
        graph.markTaskComplete(node.id, result);
      } catch (err) {
        node.status = 'failed';
        node.error = err.message;
        throw new Error(`Task ${node.id} failed: ${err.message}`);
      }
    });

    await Promise.all(promises);
  }

  return Array.from(graph.nodes.values());
}
