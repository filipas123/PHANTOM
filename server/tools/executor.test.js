import { test, describe } from 'node:test';
import assert from 'node:assert';
import { executeTool } from './executor.js';

describe('Tool Executor Integration', () => {
  test('python_execute should evaluate python code inline', async () => {
    const result = await executeTool('python_execute', { code: 'print("hello integration test")' });
    assert.match(result, /hello integration test/);
  });

  test('show_code_demo should generate proper payload', async () => {
    const result = JSON.parse(await executeTool('show_code_demo', { code: 'console.log("hi");', language: 'javascript' }));
    assert.strictEqual(result.open_new_window, true);
    assert.match(result.html_content, /language-javascript/);
    assert.match(result.html_content, /console\.log\("hi"\);/);
  });

  test('analyze_target_graph should generate payload with edges', async () => {
    const result = JSON.parse(await executeTool('analyze_target_graph', {
        target_name: 'example.com',
        nodes: ['port80', 'port443'],
        edges: [{ source: 'example.com', target: 'port80' }]
    }));
    assert.strictEqual(result.open_new_window, true);
    assert.match(result.html_content, /example\.com/);
    assert.match(result.html_content, /port80/);
    assert.match(result.html_content, /Target -->/);
  });
});
