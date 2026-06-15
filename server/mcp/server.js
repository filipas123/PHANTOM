import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { mcpRegistry } from './tool-registry.js';
import { getDB } from '../memory/store.js';
import { v4 as uuidv4 } from 'uuid';

/**
 * Audit log entry for MCP requests.
 */
function logMcpAudit(toolName, inputs, success, duration) {
  try {
    const db = getDB();
    const id = uuidv4();
    const sql = `
      INSERT INTO tool_results (id, conversation_id, tool_name, input, output, status, duration_ms)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `;
    db.prepare(sql).run(
      id,
      'MCP_SERVER_LOG',
      toolName,
      JSON.stringify(inputs),
      success ? 'success' : 'failure',
      success ? 'success' : 'error',
      duration
    );
  } catch (err) {
    console.error('[MCP Server] Audit log failed:', err.message);
  }
}

/**
 * Initializes and starts the MCP Server, bridging it to the mcpRegistry.
 */
export async function startMcpServer() {
  const server = new McpServer({
    name: 'PhantomDefensiveMCP',
    version: '1.0.0'
  });

  // Dynamically bridge registered tools from mcpRegistry to the MCP SDK server
  const tools = mcpRegistry.listTools();

  // Simple in-memory rate limiting map for MCP operations
  const rateLimits = new Map();
  const MAX_REQUESTS_PER_MINUTE = 20;

  for (const tool of tools) {
    // In a real implementation we would convert the generic JSON schema
    // into the specific Zod schema expected by the SDK.
    // For this prototype, we're providing a basic registration mechanism.

    // We use a generalized any/object schema wrapper for simplicity here
    server.tool(
      tool.name,
      tool.description,
      // Assume tool.inputSchema is handled natively or skipped in this barebones example
      {},
      async (args) => {
        const start = Date.now();
        let result;
        let success = true;
        try {
          // Basic Rate Limiting
          const now = Date.now();
          const limits = rateLimits.get(tool.name) || [];
          // Clean up old entries
          const recentLimits = limits.filter(timestamp => now - timestamp < 60000);

          if (recentLimits.length >= MAX_REQUESTS_PER_MINUTE) {
            throw new Error(`Rate limit exceeded for tool ${tool.name}. Maximum ${MAX_REQUESTS_PER_MINUTE} requests per minute.`);
          }

          recentLimits.push(now);
          rateLimits.set(tool.name, recentLimits);

          // Validation of required args based on simple JSON Schema mapping if available
          if (tool.inputSchema && tool.inputSchema.required) {
             for (const req of tool.inputSchema.required) {
               if (args[req] === undefined) {
                 throw new Error(`Missing required parameter: ${req}`);
               }
             }
          }

          result = await mcpRegistry.execute(tool.name, args);
          return {
            content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
          };
        } catch (err) {
          success = false;
          return {
            content: [{ type: 'text', text: `Error: ${err.message}` }],
            isError: true
          };
        } finally {
          const duration = Date.now() - start;
          logMcpAudit(tool.name, args, success, duration);
        }
      }
    );
  }

  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('[MCP Server] Started successfully via stdio.');
}

// If run directly, start the server
if (import.meta.url === `file://${process.argv[1]}`) {
  startMcpServer().catch(err => {
    console.error('Failed to start MCP Server:', err);
    process.exit(1);
  });
}
