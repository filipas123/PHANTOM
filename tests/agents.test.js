import { describe, it, expect } from 'vitest';
import { PlannerAgent } from '../server/agents/planner.js';
import { ExecutorAgent } from '../server/agents/executor.js';
import { TaskGraph, executeTaskGraph } from '../server/agents/task-graph.js';
import { AgentStateStore } from '../server/agents/state-store.js';
import { orchestrator } from '../server/agents/orchestrator.js';
import { initDB, closeDB } from '../server/memory/store.js';

describe('Multi-Agent Architecture', () => {
  it('PlannerAgent should decompose a goal into a TaskGraph', async () => {
    const planner = new PlannerAgent();
    const plan = await planner.plan('Analyze the system');

    expect(plan.id).toBeTruthy();
    expect(plan.goal).toBe('Analyze the system');
    expect(plan.nodes.length).toBeGreaterThan(0);
  });

  it('ExecutorAgent should return a summary result', async () => {
    const executor = new ExecutorAgent();
    const result = await executor.execute({ id: 'test-node', agent: 'test-agent' });

    expect(result.taskId).toBe('test-node');
    expect(result.status).toBe('completed');
    expect(result.summary).toContain('[Mock Execution]');
  });

  it('TaskGraph should identify executable nodes based on dependencies', () => {
    const mockPlan = {
      id: 'plan-123',
      goal: 'test',
      nodes: [
        { id: '1', status: 'pending' },
        { id: '2', status: 'pending', dependencies: ['1'] },
        { id: '3', status: 'pending', dependencies: ['1', '2'] }
      ]
    };

    const graph = new TaskGraph(mockPlan);

    let executable = graph.getExecutableNodes();
    expect(executable.length).toBe(1);
    expect(executable[0].id).toBe('1');

    graph.markTaskComplete('1', { success: true });

    executable = graph.getExecutableNodes();
    expect(executable.length).toBe(1);
    expect(executable[0].id).toBe('2');

    graph.markTaskComplete('2', { success: true });

    executable = graph.getExecutableNodes();
    expect(executable.length).toBe(1);
    expect(executable[0].id).toBe('3');

    graph.markTaskComplete('3', { success: true });
    expect(graph.isComplete()).toBe(true);
  });

  it('executeTaskGraph should process the DAG completely', async () => {
    const mockPlan = {
      id: 'plan-123',
      goal: 'test',
      nodes: [
        { id: '1', status: 'pending' },
        { id: '2', status: 'pending', dependencies: ['1'] },
      ]
    };
    const graph = new TaskGraph(mockPlan);

    const results = await executeTaskGraph(graph, async (node) => {
      return { msg: `Processed ${node.id}` };
    });

    expect(results.length).toBe(2);
    expect(results[0].status).toBe('completed');
    expect(results[1].status).toBe('completed');
  });

  it('Orchestrator should run analysis successfully', async () => {
    initDB(':memory:');
    await orchestrator.init();
    const result = await orchestrator.runAnalysis('Test Goal', 'session-123');

    expect(result.success).toBe(true);
    expect(result.graph.length).toBeGreaterThan(0);
    closeDB();
  });
});
