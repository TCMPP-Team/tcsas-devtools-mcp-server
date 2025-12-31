#!/usr/bin/env node

import { version } from '../package.json';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { appName, mcpName } from './brand';
import { cleanupOldTempFiles } from './utils';

// Import all tools
import {
  launchIdeTool,
  checkIdeInstalledTool,
  previewMiniProgramOnDeviceTool,
  uploadMiniprogramTool,
  getMiniProgramRuntimeLogTool,
  setCompileConditionTool,
  deleteCompileConditionTool,
  McpToolDefinition
} from './tools';
import { AnySchema, ZodRawShapeCompat } from '@modelcontextprotocol/sdk/server/zod-compat';
import { migrateWechatPrompt, PromptDefinition } from './prompts';

const server = new McpServer({
  title: mcpName,
  name: `${appName} for miniprogram development and debugging`,
  version: version,
  websiteUrl: "https://www.tencentcloud.com/zh/products/tcsas",
  icons: [{
    src: "https://staticintl.cloudcachetci.com/yehe/backend-news/3HUL132_qc-topnav-m-logo.svg",
    mimeType: "image/svg"
  }]
});

/**
 * Helper function to register a tool
 */
function registerTool<OutputArgs extends ZodRawShapeCompat | AnySchema, InputArgs extends undefined | ZodRawShapeCompat | AnySchema = undefined>(tool: McpToolDefinition<OutputArgs, InputArgs>) {
  server.registerTool(
    tool.name,
    {
      title: tool.title,
      description: tool.description,
      inputSchema: tool.inputSchema || {},
      outputSchema: tool.outputSchema
    },
    tool.handler
  );
}

function registerPrompt<Args extends ZodRawShapeCompat>(prompt: PromptDefinition<Args>) {
  server.registerPrompt(
    prompt.name,
    {
      title: prompt.title,
      description: prompt.description,
    },
    prompt.handler
  );
}

// Register all tools
registerTool(launchIdeTool);
registerTool(checkIdeInstalledTool);
registerTool(previewMiniProgramOnDeviceTool);
registerTool(uploadMiniprogramTool);
registerTool(getMiniProgramRuntimeLogTool);
registerTool(setCompileConditionTool);
registerTool(deleteCompileConditionTool);

// Register all prompts
registerPrompt(migrateWechatPrompt);

// Clean up old temp files (>2h) on startup
cleanupOldTempFiles(appName);

const transport = new StdioServerTransport();
server.connect(transport);
