import { z } from 'zod';
import log from '../utils/log';
import { exec } from 'child_process';
import { promisify } from 'util';

const execP = promisify(exec);

/**
 * Get sandbox execution result
 * This tool executes a local CLI command to get the latest execution result from sandbox environment
 */
export const getSandboxResultTool = {
  name: 'getSandboxResult',
  title: 'Get Sandbox Result',
  description: 'Get the latest execution result from sandbox environment by calling local CLI command. Use this after writing code to get execution feedback.',
  inputSchema: {},
  outputSchema: {
    success: z.boolean().describe("Whether the sandbox execution was successful"),
    result: z.string().describe("The execution result from sandbox"),
    timestamp: z.string().optional().describe("When the result was generated"),
    error: z.string().optional().describe("Error message if execution failed")
  },
  handler: async () => {
    const output = {
      success: false,
      result: '',
      timestamp: undefined as string | undefined,
      error: undefined as string | undefined
    };

    try {
      // TODO: 替换为你的实际 CLI 命令
      // 例如: const command = 'your-sandbox-cli get-result';
      const command = 'echo "Sample sandbox result"';

      log('Executing sandbox command:', command);

      const { stdout, stderr } = await execP(command, {
        encoding: 'utf8',
        timeout: 10000 // 10秒超时
      });

      if (stderr) {
        log('Sandbox stderr:', stderr);
      }

      if (stdout) {
        output.success = true;
        output.result = stdout.trim();
        output.timestamp = new Date().toISOString();
        log('Sandbox result:', output.result);
      } else {
        output.error = 'No result returned from sandbox';
      }

    } catch (error) {
      log('Error getting sandbox result:', error);
      output.error = error instanceof Error ? error.message : String(error);
      output.result = '';
    }

    return {
      content: [{
        type: 'text' as const,
        text: output.result || output.error || 'No result available'
      }],
      structuredContent: output
    };
  }
};
