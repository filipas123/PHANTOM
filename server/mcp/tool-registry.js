/**
 * Generic Registry pattern for MCP-compatible tools.
 * Tools must declare their purpose, required permissions, and data sources.
 */
class MCPToolRegistry {
  constructor() {
    this.tools = new Map();
  }

  /**
   * Registers a new MCP tool.
   * @param {Object} toolDef - The definition of the tool.
   * @param {string} toolDef.name - Tool name.
   * @param {string} toolDef.description - Tool purpose.
   * @param {Array<string>} toolDef.permissions - Required permissions.
   * @param {Array<string>} toolDef.dataSources - Required data sources.
   * @param {Object} toolDef.inputSchema - JSON Schema for the input.
   * @param {Function} toolDef.handler - Execution function.
   */
  register(toolDef) {
    if (!toolDef.name || !toolDef.handler) {
      throw new Error('MCP Tool must have a name and a handler function.');
    }
    this.tools.set(toolDef.name, {
      name: toolDef.name,
      description: toolDef.description || '',
      permissions: toolDef.permissions || [],
      dataSources: toolDef.dataSources || [],
      inputSchema: toolDef.inputSchema || {},
      handler: toolDef.handler
    });
    console.log(`[MCP Registry] Registered tool: ${toolDef.name}`);
  }

  /**
   * Retrieves a tool definition by name.
   * @param {string} name
   * @returns {Object|undefined}
   */
  get(name) {
    return this.tools.get(name);
  }

  /**
   * Lists all registered tools.
   * @returns {Array<Object>} List of tool metadata.
   */
  listTools() {
    return Array.from(this.tools.values()).map(t => ({
      name: t.name,
      description: t.description,
      permissions: t.permissions,
      dataSources: t.dataSources,
      inputSchema: t.inputSchema
    }));
  }

  /**
   * Executes a registered tool.
   * @param {string} name - Tool name.
   * @param {Object} args - Input arguments.
   * @returns {Promise<any>}
   */
  async execute(name, args) {
    const tool = this.tools.get(name);
    if (!tool) {
      throw new Error(`[MCP Registry] Tool ${name} not found.`);
    }

    // In a full implementation, JSON schema validation would happen here
    // before calling the handler.

    try {
      return await tool.handler(args);
    } catch (err) {
      throw new Error(`[MCP Registry] Execution error for ${name}: ${err.message}`);
    }
  }
}

export const mcpRegistry = new MCPToolRegistry();
