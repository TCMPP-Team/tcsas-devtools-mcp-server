import { z } from 'zod';
import { findAppOnMacOrWin } from '../utils/index';
import { appName } from '../brand';

/**
 * Check whether IDE (TCSAS-Devtools) is installed
 */
export const checkIdeInstalledTool = {
  name: 'checkIdeInstalled',
  title: 'Check IDE Installation',
  description: `Checks if the ${appName} IDE is installed on the user's system. Use this to verify the user's environment before attempting to launch the IDE.`,
  inputSchema: {},
  outputSchema: {
    isInstall: z.boolean().describe("Returns true if the IDE is installed, otherwise false."),
  },
  handler: async () => {
    const output = { isInstall: false }
    const result = await findAppOnMacOrWin(appName);
    if (result) {
      output.isInstall = true
    }
    return {
      content: [
        {
          type: 'text' as const,
          text: JSON.stringify(output)
        }
      ],
      structuredContent: output
    };
  }
};
