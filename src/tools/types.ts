import { ZodRawShape } from 'zod';
import { ToolCallback } from '@modelcontextprotocol/sdk/server/mcp.js';

/**
 * MCP Tool definition interface
 */
export interface McpToolDefinition {
  name: string;
  title: string;
  description: string;
  inputSchema?: ZodRawShape;
  outputSchema?: ZodRawShape;
  handler: ToolCallback<ZodRawShape>;
}
