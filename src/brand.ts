import path from 'path';
import { getAppSupportPath } from './utils/index';
import log from './utils/log';

const appName = "TCSAS-Devtools";
const mcpName = "tcsas-devtools-mcp-server";

const getPreviewQrCodePath = async (): Promise<string> => {
  const appSupportPath = await getAppSupportPath(appName);
  // log("stdout: appSupportPath is ", appSupportPath);
  if (appSupportPath) {
    return path.join(appSupportPath, 'Default', `pBase64-${Date.now()}.txt`);
  }
  return "";
}

export {
  appName,
  mcpName,
  getPreviewQrCodePath,
};
