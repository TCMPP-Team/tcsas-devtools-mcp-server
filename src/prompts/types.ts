import { PromptCallback, ToolCallback } from '@modelcontextprotocol/sdk/server/mcp.js';
import { ZodRawShapeCompat } from '@modelcontextprotocol/sdk/server/zod-compat';

export interface PromptDefinition<Args extends ZodRawShapeCompat> {
  name: string;
  title?: string;
  description?: string;
  argsSchema?: Args;
  handler: PromptCallback<Args>;
}