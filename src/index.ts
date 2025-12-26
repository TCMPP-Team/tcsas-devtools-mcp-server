#!/usr/bin/env node

import { version } from '../package.json';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { appName, mcpName } from './brand';

// Import all tools
import {
  launchIdeTool,
  checkIdeInstalledTool,
  previewMiniProgramOnDeviceTool,
  uploadMiniprogramTool,
  getMiniProgramRuntimeLogTool,
  McpToolDefinition
} from './tools';

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
function registerTool(tool: McpToolDefinition) {
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

// Register all tools
registerTool(launchIdeTool);
registerTool(checkIdeInstalledTool);
registerTool(previewMiniProgramOnDeviceTool);
registerTool(uploadMiniprogramTool);
registerTool(getMiniProgramRuntimeLogTool);

const transport = new StdioServerTransport();
server.connect(transport);
