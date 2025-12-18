import { z } from 'zod';
import fs from 'fs';
import log from '../utils/log';
import { getCliPath, getTemporaryFilePath, executeCliCommand } from '../utils/index';
import { ImageContent } from '@modelcontextprotocol/sdk/types';
import { appName } from '../brand';

/**
 * Get MiniProgram runtime log and screenshot
 * This tool executes a local CLI command to get the latest runtime log and screenshot from MiniProgram IDE
 */
export const getMiniProgramRuntimeLogTool = {
  name: 'getMiniProgramRuntimeLog',
  title: 'Get MiniProgram Runtime Log',
  description: 'Get the latest runtime log and screenshot from MiniProgram IDE. Returns console output (console.log, warnings, errors) and a screenshot of the current MiniProgram view. Use this after writing or modifying code to verify execution results and UI rendering.',
  inputSchema: {
    path: z.string().describe("The absolute path of the miniprogram project."),
  },
  outputSchema: {
    result: z.string().describe("The runtime log from MiniProgram"),
    timestamp: z.string().optional().describe("When the log was generated"),
  },
  handler: async ({ path }: { path: string }) => {
    const cliPath = await getCliPath(appName);
    if (!cliPath) {
      return {
        content: [{ type: 'text' as const, text: `Could not find the command-line tool for ${appName}. Please ensure it is installed correctly.` }]
      };
    }
    if (!path) {
      return {
        content: [{ type: 'text' as const, text: 'Project path is required for getting runtime log.' }]
      };
    }

    let screenshotPath: string | null = null;
    try {
      // Generate temporary path for screenshot (png format)
      screenshotPath = await getTemporaryFilePath(appName, 'screenshot', 'png');
      if (!screenshotPath) {
        return {
          content: [{
            type: 'text' as const,
            text: 'Could not determine the path for the screenshot. Your operating system may not be supported.'
          }]
        };
      }

      // Execute CLI command with --run-log and --screenshot-output (png format)
      const { stdout, stderr } = await executeCliCommand(cliPath, [
        '--run-log', path,
        '--screenshot-output', `png@${encodeURIComponent(screenshotPath)}`
      ]);
      log("Runtime log stdout:", stdout);

      if (stderr) {
        log("Runtime log stderr:", stderr);
      }

      const result = stdout?.trim() || stderr?.trim() || 'No runtime log available';
      const timestamp = new Date().toISOString();
      const output = { result, timestamp };

      // Build response content
      const content: Array<{ type: 'text'; text: string } | ImageContent> = [];

      // Add text content - must match structuredContent for MCP compliance
      content.push({
        type: 'text' as const,
        text: JSON.stringify(output)
      });

      // Check if screenshot was generated and add it
      log("Checking screenshot file:", screenshotPath);
      if (screenshotPath && fs.existsSync(screenshotPath)) {
        log("Screenshot file exists, reading...");
        try {
          // Read PNG file as binary and convert to base64
          const pngBuffer = fs.readFileSync(screenshotPath);
          const base64Content = pngBuffer.toString('base64');
          log("Screenshot file size:", pngBuffer.length, "bytes, base64 length:", base64Content.length);
          if (base64Content && base64Content.length > 0) {
            const imageContent: ImageContent = {
              type: "image",
              data: base64Content,
              mimeType: "image/png",
            };
            content.push(imageContent);
            log("Screenshot added to response");
          } else {
            log("Screenshot file is empty");
          }
        } catch (readError) {
          log("Failed to read screenshot file:", readError);
        }
      } else {
        log("Screenshot file does not exist");
      }

      return {
        content,
        structuredContent: output
      };

    } catch (error) {
      log("Error getting runtime log:", error);
      const errorMsg = error instanceof Error ? error.message : String(error);
      const timestamp = new Date().toISOString();
      const output = {
        result: `Failed to get runtime log: ${errorMsg}`,
        timestamp
      };
      return {
        content: [{
          type: 'text' as const,
          text: JSON.stringify(output)
        }],
        structuredContent: output
      };
    } finally {
      // Clean up temporary screenshot file
      if (screenshotPath && fs.existsSync(screenshotPath)) {
        try {
          fs.unlinkSync(screenshotPath);
          log("Cleaned up screenshot file:", screenshotPath);
        } catch (cleanupError) {
          log("Failed to clean up screenshot file:", cleanupError);
        }
      }
    }
  }
};
