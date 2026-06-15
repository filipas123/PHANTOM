# PHANTOM Phase 1 Migration Guide

Phase 1 introduces the defensive/educational architecture for the PHANTOM repository, laying the groundwork for a robust Multi-Agent System (MAS), a standard `SKILL.md` format, and an MCP (Model Context Protocol) Server infrastructure.

## Architectural Changes

### 1. Model Context Protocol (MCP) Server Infrastructure
We have built a generic MCP server mapping directly into the PHANTOM tool registry:
- **`server/mcp/server.js`**: Core MCP SDK integration over `stdio`.
- **`server/mcp/tool-registry.js`**: Reusable generic registry pattern for tools declaring data sources and input schemas.
- **`server/mcp/schemas/`**: Typed schemas defined for Log Analysis, Config Auditing, and Threat Intelligence.

### 2. Multi-Agent System (MAS)
The core AI execution has shifted from a single-agent loop to a multi-agent orchestrated architecture:
- **`PlannerAgent`**: Decomposes high-level defensive analysis goals into a DAG of subtasks.
- **`ExecutorAgent`**: Tactically runs the tasks and tools without the broad context window of the Planner.
- **`TaskGraph`**: Directed Acyclic Graph logic enabling parallel execution and dependency management.
- **`Orchestrator`**: The message bus coordinating states between Planners and Executors.
- **Specialists**: Implemented agents for Threat Modeling, Log Analysis, Compliance Auditing, and Report Generation.

### 3. Agentic Trust Tiers & Skill Sandbox
Security capabilities have been compartmentalized using the CSA Agentic Trust Framework:
- **Tier 0:** First-party (Full permissions)
- **Tier 1:** Verified Publisher
- **Tier 2:** Community
- **Tier 3:** Unverified (Sandbox only)

Execution is handled via `isolated-vm` in `server/skills/sandbox.js` to ensure isolation of capabilities.

### 4. Vector Memory & Semantic Search
Added localized Vector Storage functionality via SQLite.
- Utilizes `@xenova/transformers` (`all-MiniLM-L6-v2`) to embed text entirely locally.
- `searchSimilarVectors()` computes cosine similarity.
- Fallback to keyword FTS keyword matching remains if vector storage is disabled.

## Data Migration
When starting up the new version, the database schema will auto-update:
1. Addition of `vector_embedding BLOB` to `memories` table.
2. Creation of `skill_audit_logs` to maintain traceablility of sandboxed skills.

## How to use the Multi-Agent System
Currently, the Multi-Agent orchestrator logic is integrated but opted-in via configuration (`config.agents.enabled`).
To invoke the demo dashboard locally, open the "Management" panel on the frontend and navigate to the "Analysis" tab.