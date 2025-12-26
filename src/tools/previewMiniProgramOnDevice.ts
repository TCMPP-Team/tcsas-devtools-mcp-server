import { z } from 'zod';
import fs from 'fs';
import log from '../utils/log';
import { getCliPath, sleep, getTemporaryFilePath, executeCliCommand } from '../utils/index';
import { ImageContent } from '@modelcontextprotocol/sdk/types';
import { appName, deviceAppName } from '../brand';

/**
 * Generate QR code for real device preview
 */
export const previewMiniProgramOnDeviceTool = {
  name: 'previewMiniProgramOnDevice',
  title: 'Preview MiniProgram On Device',
  description: `Generates a QR code for REAL DEVICE preview. The user must manually scan this QR code with the ${deviceAppName} app on their phone to preview the miniprogram. This is ONLY for device preview - DO NOT use this to check execution results or get screenshots (use getMiniProgramRuntimeLog for that). Takes 60-80 seconds.`,
  inputSchema: {
    path: z.string().describe("The absolute path of the miniprogram project to preview."),
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
        content: [{ type: 'text' as const, text: 'Project path is required for preview.' }]
      };
    }

    let previewQrCodePath: string | null = null;
    try {
      previewQrCodePath = await getTemporaryFilePath(appName, 'preview-qrcode', 'txt');
      if (!previewQrCodePath) {
        return {
          content: [{
            type: 'text' as const,
            text: 'Could not determine the path for the QR code. Your operating system may not be supported.'
          }]
        };
      }
      const { stdout, stderr } = await executeCliCommand(cliPath, ['--preview', path, '--preview-qr-output', `base64@${encodeURIComponent(previewQrCodePath)}`]);
      log("previewMiniProgramOnDeviceTool stdout:", stdout);

      if (stderr) {
        log("stderr:", stderr);
        return {
          content: [{
            type: 'text' as const,
            text: `Preview generation failed with the following message: ${stderr}. Please try opening the project in the ${appName} IDE to diagnose the issue.`
          }]
        };
      }

      await sleep(180); // TODO check IDE Logic

      if (!fs.existsSync(previewQrCodePath)) {
        return {
          content: [{
            type: 'text' as const,
            text: 'Preview command ran, but the QR code file was not generated. This could be due to a build error in the project. Please check the project in the IDE.'
          }]
        };
      }

      const base64Content = fs.readFileSync(previewQrCodePath, 'utf8');
      const imageContent: ImageContent = {
        type: "image",
        data: base64Content.replace("data:image/png;base64,", ""),
        mimeType: "image/png",
      };
      return {
        content: [imageContent]
      };

    } catch (error) {
      log("Error executing preview command:", error);
      return {
        content: [{
          type: 'text' as const,
          text: `Failed to generate preview QR code. This can happen if there is an issue with the miniprogram project itself. Please try opening the project in the ${appName} IDE to diagnose the issue. Error: ${(error as Error).message}`
        }]
      };
    } finally {
      // Clean up temporary QR code file
      if (previewQrCodePath && fs.existsSync(previewQrCodePath)) {
        try {
          fs.unlinkSync(previewQrCodePath);
          // log("Cleaned up preview QR code file:", previewQrCodePath);
        } catch (cleanupError) {
          // log("Failed to clean up preview QR code file:", cleanupError);
        }
      }
    }
  }
};
