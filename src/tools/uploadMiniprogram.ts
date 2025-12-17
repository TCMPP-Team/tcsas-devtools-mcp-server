import { z } from 'zod';
import log from '../utils/log';
import { getCliPath, executeCliCommand } from '../utils/index';
import { errorToString } from '../utils/error';
import { appName } from '../brand';

/**
 * Upload miniprogram with devtools
 */
export const uploadMiniprogramTool = {
  name: 'uploadMiniprogram',
  title: 'Upload Miniprogram',
  description: `Uploads a new version of a miniprogram project from the specified path. Requires a version number and a description for the upload.`,
  inputSchema: {
    path: z.string().describe("The absolute path of the miniprogram project to upload."),
    version: z.string().describe("The version for this upload (e.g., '1.0.0')."),
    describeMessage: z.string().describe("A short description of the changes in this version."),
  },
  outputSchema: {
    updateDetail: z.string().describe("upload response detail"),
  },
  handler: async ({ path, version, describeMessage }: { path: string; version: string; describeMessage: string }) => {
    const output = { updateDetail: "upload fail" };
    const cliPath = await getCliPath(appName);

    if (cliPath) {
      try {
        const { stdout, stderr } = await executeCliCommand(
          cliPath,
          ['-u', `${version}@${path}`, '--upload-desc', describeMessage]
        );
        log("Upload stdout:", stdout);
        log("Upload stderr:", stderr);

        // Smarter output handling
        if (stderr && !stdout) {
          // Only error output, likely failed
          output.updateDetail = `Upload may have failed: ${stderr}`;
        } else if (stdout) {
          // Has normal output, consider success
          output.updateDetail = stdout;
          if (stderr) {
            output.updateDetail += `\nWarnings: ${stderr}`;
          }
        } else {
          output.updateDetail = 'Upload completed (no output)';
        }
      } catch (err) {
        const errorMsg = errorToString(err);
        output.updateDetail = `Upload failed: ${errorMsg}`;
        log('Upload failed:', err);
      }
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
