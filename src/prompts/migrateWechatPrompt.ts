import { GetPromptResult } from '@modelcontextprotocol/sdk/types';
import fs from 'fs';
import path from 'path';
/**
 * A skill that initiates the WeChat Mini Program to TCSAS migration process.
 * It does this by loading the detailed expert prompt from a markdown file
 * and presenting it to the user.
 */
export const migrateWechatPrompt = {
  name: 'migrate-wechat',
  title: 'WeChat to TCSAS Migration Assistant',
  description: 'Starts the guided process to migrate a WeChat Mini Program to a TCSAS Mini Program.',
  handler: async (): Promise<GetPromptResult> => {
    try {
      // Resolve the path to the prompt file relative to the project root
      const promptFilePath = path.join(__dirname, 'migrateWechatPrompt.md');

      // Check if the file exists
      if (!fs.existsSync(promptFilePath)) {
        return {
          messages: [{
            role: 'assistant' as const,
            content: {
              type: 'text' as const,
              text: 'Error: WECHAT_MIGRATION_PROMPT.md file not found. Please ensure the file exists in the project root.'
            }
          }]
        };
      }

      // Read the content of the prompt file
      const promptText = fs.readFileSync(promptFilePath, 'utf-8');

      // Return the content in the required "messages" format for a prompt
      return {
        messages: [{
          role: 'assistant' as const,
          content: {
            type: 'text' as const,
            text: promptText
          }
        }]
      };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return {
        messages: [{
          role: 'assistant' as const,
          content: {
            type: 'text' as const,
            text: `An unexpected error occurred while trying to load the migration prompt: ${errorMessage}`
          }
        }]
      };
    }
  }
};
