import { PromptCallback, ToolCallback } from '@modelcontextprotocol/sdk/server/mcp.js';
import { AnySchema, ZodRawShapeCompat } from '@modelcontextprotocol/sdk/server/zod-compat';

/**
 * MCP Tool definition interface
 */
export interface McpToolDefinition<OutputArgs extends ZodRawShapeCompat | AnySchema, InputArgs extends undefined | ZodRawShapeCompat | AnySchema = undefined> {
  name: string;
  title: string;
  description: string;
  inputSchema?: InputArgs;
  outputSchema?: OutputArgs;
  handler: ToolCallback<InputArgs>;
}

export interface PromptDefinition<Args extends ZodRawShapeCompat> {
  name: string;
  title?: string;
  description?: string;
  argsSchema?: Args;
  handler: PromptCallback<Args>;
}