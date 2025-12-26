import { z } from 'zod';
import log from '../utils/log';
import { getCliPath, executeCliCommand } from '../utils/index';
import { appName } from '../brand';

/**
 * Delete compile condition from miniprogram project
 */
export const deleteCompileConditionTool = {
  name: 'deleteCompileCondition',
  title: 'Delete Compile Condition',
  description: 'Deletes a compile condition from a miniprogram project by its name.',
  inputSchema: {
    path: z.string().describe("The absolute path of the miniprogram project."),
    conditionName: z.string().describe("Name of the compile condition to delete."),
  },
  outputSchema: {
    success: z.boolean().describe("Whether the compile condition was deleted successfully"),
    message: z.string().describe("Result message"),
  },
  handler: async ({ path, conditionName }: { path: string; conditionName: string }) => {
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

    try {
      const args = ['--del-compile', path, '--condition-name', conditionName];

      log("Deleting compile condition:", conditionName);
      const { stdout, stderr } = await executeCliCommand(cliPath, args);
      log("deleteCompileCondition stdout:", stdout);

      if (stderr) {
        log("deleteCompileCondition stderr:", stderr);
      }

      const output = {
        success: true,
        message: `Delete compile condition '${conditionName}' result: ${stderr ? stderr : stdout}`
      };

      return {
        content: [{
          type: 'text' as const,
          text: JSON.stringify(output)
        }],
        structuredContent: output
      };

    } catch (error) {
      log("Error deleting compile condition:", error);
      const errorMsg = error instanceof Error ? error.message : String(error);
      const output = {
        success: false,
        message: `Failed to delete compile condition: ${errorMsg}`
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
