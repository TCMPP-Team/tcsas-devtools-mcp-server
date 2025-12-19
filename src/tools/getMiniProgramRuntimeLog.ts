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
  description: 'IMPORTANT: Use this tool immediately after writing or modifying code to check if your changes work correctly. Returns the miniprogram\'s runtime execution results: 1) Console output (console.log, console.error, warnings), 2) Runtime errors if any, 3) Screenshot of the current page. This allows you to verify your code is working as expected and see the visual result without manual testing.',
  inputSchema: {
    path: z.string().describe("The absolute path of the miniprogram project."),
    needScreen: z.boolean().optional().describe("Whether to capture a screenshot. Default is false."),
    screenshotFormat: z.enum(['png', 'base64']).optional().describe("Screenshot format: 'png' (binary file) or 'base64' (text file). Default is 'png'."),
  },
  outputSchema: {
    result: z.string().describe("The runtime log from MiniProgram"),
    timestamp: z.string().optional().describe("When the log was generated"),
  },
  handler: async ({ path, needScreen = false, screenshotFormat = 'png' }: { path: string; needScreen?: boolean; screenshotFormat?: 'png' | 'base64' }) => {
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
      // Build CLI command arguments
      const args = ['--run-log', path];

      // Only add screenshot-output if needScreen is true
      if (needScreen) {
        // Determine file extension based on format
        const fileExtension = screenshotFormat === 'base64' ? 'txt' : 'png';
        screenshotPath = await getTemporaryFilePath(appName, 'screenshot', fileExtension);
        if (!screenshotPath) {
          return {
            content: [{
              type: 'text' as const,
              text: 'Could not determine the path for the screenshot. Your operating system may not be supported.'
            }]
          };
        }
        args.push('--screenshot-output', `${screenshotFormat}@${encodeURIComponent(screenshotPath)}`);
      }

      // Execute CLI command
      const { stdout, stderr } = await executeCliCommand(cliPath, args);
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

      // Check if screenshot was requested and generated
      if (needScreen && screenshotPath) {
        log("Checking screenshot file:", screenshotPath);
        if (fs.existsSync(screenshotPath)) {
          log("Screenshot file exists, reading...");
          try {
            let base64Content: string;

            if (screenshotFormat === 'base64') {
              // Read base64 text file
              base64Content = fs.readFileSync(screenshotPath, 'utf8');
              // Remove data URI prefix if present
              base64Content = base64Content.replace("data:image/png;base64,", "");
              log("Base64 content length:", base64Content.length);
            } else {
              // Read PNG file as binary and convert to base64
              const pngBuffer = fs.readFileSync(screenshotPath);
              base64Content = pngBuffer.toString('base64');
              log("Screenshot file size:", pngBuffer.length, "bytes, base64 length:", base64Content.length);
            }

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
      // Clean up temporary screenshot file if it was created
      // if (needScreen && screenshotPath && fs.existsSync(screenshotPath)) {
      //   try {
      //     fs.unlinkSync(screenshotPath);
      //     log("Cleaned up screenshot file:", screenshotPath);
      //   } catch (cleanupError) {
      //     log("Failed to clean up screenshot file:", cleanupError);
      //   }
      // }
    }
  }
};
