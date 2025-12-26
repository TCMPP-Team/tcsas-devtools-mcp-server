import { z } from 'zod';
import log from '../utils/log';
import { getCliPath, executeCliCommand } from '../utils/index';
import { appName } from '../brand';

/**
 * Set compile condition for miniprogram project
 * Used to switch startup page and pass page parameters for debugging
 */
export const setCompileConditionTool = {
  name: 'setCompileCondition',
  title: 'Set Compile Condition',
  description: 'Sets the compile condition for a miniprogram project. Use this to switch the startup page and pass page parameters for debugging specific pages. After setting, the miniprogram will launch with the specified page and parameters.',
  inputSchema: {
    path: z.string().describe("The absolute path of the miniprogram project."),
    conditionName: z.string().describe("Name of the compile condition (e.g., 'test', 'index', 'debug-home')."),
    pagePath: z.string().describe("The startup page path (e.g., 'pages/index/index', 'pages/detail/detail')."),
    query: z.string().optional().describe("Page parameters in query string format (e.g., 'id=123&type=test'). Optional."),
    simulateUpdate: z.boolean().optional().describe("Whether to simulate an update scenario. Default is false."),
  },
  outputSchema: {
    success: z.boolean().describe("Whether the compile condition was set successfully"),
    message: z.string().describe("Result message"),
  },
  handler: async ({ path, conditionName, pagePath, query, simulateUpdate = false }: {
    path: string;
    conditionName: string;
    pagePath: string;
    query?: string;
    simulateUpdate?: boolean
  }) => {
    const cliPath = await getCliPath(appName);
    if (!cliPath) {
      return {
        content: [{ type: 'text' as const, text: `Could not find the command-line tool for ${appName}. Please ensure it is installed correctly.` }]
      };
    }

    if (!path) {
      return {
        content: [{ type: 'text' as const, text: 'Project path is required.' }]
      };
    }

    if (!conditionName) {
      return {
        content: [{ type: 'text' as const, text: 'Condition name is required.' }]
      };
    }

    if (!pagePath) {
      return {
        content: [{ type: 'text' as const, text: 'Page path is required.' }]
      };
    }

    try {
      // Build compile condition string: name@path[@query[@simulateUpdate]]
      let conditionStr = `${conditionName}@${pagePath}`;
      if (query) {
        conditionStr += `@${query}`;
        if (simulateUpdate) {
          conditionStr += '@1';
        }
      } else if (simulateUpdate) {
        // If no query but simulateUpdate is true, add empty query
        conditionStr += '@@1';
      }

      const args = ['--set-compile', path, '--compile-condition', conditionStr];

      log("Setting compile condition:", conditionStr);
      const { stdout, stderr } = await executeCliCommand(cliPath, args);
      log("setCompileCondition stdout:", stdout);

      if (stderr) {
        log("setCompileCondition stderr:", stderr);
      }

      const output = {
        success: true,
        message: `Compile condition '${conditionName}' has been set. result: ${stderr ? stderr : stdout}`
      };

      return {
        content: [{
          type: 'text' as const,
          text: JSON.stringify(output)
        }],
        structuredContent: output
      };

    } catch (error) {
      log("Error setting compile condition:", error);
      const errorMsg = error instanceof Error ? error.message : String(error);
      const output = {
        success: false,
        message: `Failed to set compile condition: ${errorMsg}`
      };
      return {
        content: [{
          type: 'text' as const,
          text: JSON.stringify(output)
        }],
        structuredContent: output
      };
    }
  }
};
