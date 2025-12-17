import { z } from 'zod';
import { launchApp, getCliPath, executeCliCommand } from '../utils/index';
import { errorToString } from '../utils/error';
import { appName } from '../brand';

/**
 * Launch TCSAS-Devtools with args
 */
export const launchIdeTool = {
  name: 'launchIde',
  title: 'Launch IDE',
  description: `Launches the ${appName} IDE. If a project path is provided, it opens the specified miniprogram project. Use this tool when the user wants to open the IDE or a specific project.`,
  inputSchema: {
    ideInstallPath: z.string().optional().describe("The absolute path to the IDE installation. This is optional; if omitted, the IDE will be launched with the default installation path."),
    path: z.string().optional().describe("The absolute path to the miniprogram project to open. This is optional; if omitted, the IDE will just be launched."),
  },
  outputSchema: {
    openApp: z.boolean().describe("open IDE status"),
    openProject: z.boolean().describe("open project status"),
    msg: z.string().describe("launch IDE logs")
  },
  handler: async ({ path, ideInstallPath }: { path?: string; ideInstallPath?: string }) => {
    const output = {
      openApp: false,
      openProject: false,
      msg: "",
    }

    try {
      const launchResult = await launchApp(appName, ideInstallPath);
      if (launchResult) {
        output.openApp = true;
        output.msg = 'IDE launched successfully';
      }
    } catch (err) {
      output.msg = `Failed to launch IDE: ${errorToString(err)}`;
    }

    if (path) {
      const cliPath = await getCliPath(appName);
      if (cliPath) {
        try {
          const { stdout, stderr } = await executeCliCommand(cliPath, ['--open', path, '--agent']);
          if (!stderr) {
            output.openProject = true;
          }
          // Prefer stderr for warnings, then stdout, then default message
          output.msg = stderr || stdout || 'Project opened successfully';
        } catch (err) {
          output.msg = `Failed to open project: ${errorToString(err)}`;
        }
      }
    }

    return {
      content: [{
        type: 'text' as const,
        text: JSON.stringify(output)
      }],
      structuredContent: output
    };
  }
};
