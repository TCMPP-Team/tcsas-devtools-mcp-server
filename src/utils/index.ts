
import path from 'path';
import os from 'os';
import fs from 'fs';
import log from './log';
import { promisify } from 'util';
import { exec, execFile, spawn } from 'child_process';
import { findWinAppPath } from './findWinApp';
const execP = promisify(exec);
const execFileP = promisify(execFile);
const fsp = fs.promises;

/**
 * sleep
 * @param time
 * @returns
 */
const sleep = async function (time: number) {
  return new Promise((r) => {
    setTimeout(() => r(""), time);
  });
}

/**
 *
 * @param query
 * @returns
 */
const findAppOnMac = async (appName: string) => {
  const searchPaths = [
    '/Applications',
    path.join(os.homedir(), 'Applications'),
  ];

  for (const dir of searchPaths) {
    try {
      const files = await fsp.readdir(dir);
      for (const file of files) {
        if (file.toLowerCase().endsWith('.app')) {
          const baseName = file.replace(/\.app$/, '');
          if (baseName.toLowerCase() === appName.toLowerCase() || baseName.toLowerCase().includes(appName.toLowerCase())) {
            return path.join(dir, file);
          }
        }
      }
    } catch (err) {
      // Ignore if directory does not exist
    }
  }

  // 2. Use Spotlight (mdfind) as a fallback
  try {
    const query = appName.includes('.')
      ? `kMDItemCFBundleIdentifier == '${appName}'` // Search by bundle id
      : `kMDItemDisplayName == '${appName}' && kMDItemKind == 'Application'`; // Search by application display name
    const { stdout } = await execP(`mdfind "${query}"`);
    const result = stdout.trim().split('\n')[0];
    if (result) {
      return result;
    }
  } catch (err) {
    // Ignore if mdfind fails to execute
  }

  return null;
};


const findAppOnWindows = async (appName: string): Promise<string | null> => {
  // 1. Search in Windows System
  const pathInSystem = await findWinAppPath(appName);
  if (pathInSystem) {
    return pathInSystem;
  }
  return null;
};


/**
 * @param appName
 * @param ideInstallPath
 * @returns
 */
const findAppOnMacOrWin = async function (appName: string, ideInstallPath?: string) {
  // If ideInstallPath is provided, prioritize it and skip cache
  // Otherwise, use cache if available
  if (!ideInstallPath && global.pathFind) {
    return global.pathFind;
  }

  const platform = os.platform();
  let pathFind = "";

  // If ideInstallPath is provided, search in current and parent directory first
  if (ideInstallPath) {
    try {
      const stat = await fsp.stat(ideInstallPath);
      if (stat.isDirectory()) {
        // Search in current directory
        const files = await fsp.readdir(ideInstallPath);
        for (const file of files) {
          const fullPath = path.join(ideInstallPath, file);
          const fileName = platform === 'darwin'
            ? file.replace(/\.app$/, '')  // Remove .app extension on macOS
            : file.replace(/\.exe$/, ''); // Remove .exe extension on Windows

          if (fileName.toLowerCase() === appName.toLowerCase() ||
            fileName.toLowerCase().includes(appName.toLowerCase())) {
            if (global.pathFind !== fullPath) {
              global.pathFind = fullPath;
            }
            return fullPath;
          }
        }

        // Search in parent directory
        const parentDir = path.dirname(ideInstallPath);
        const parentFiles = await fsp.readdir(parentDir);
        for (const file of parentFiles) {
          const fullPath = path.join(parentDir, file);
          const fileName = platform === 'darwin'
            ? file.replace(/\.app$/, '')
            : file.replace(/\.exe$/, '');

          if (fileName.toLowerCase() === appName.toLowerCase() ||
            fileName.toLowerCase().includes(appName.toLowerCase())) {
            if (global.pathFind !== fullPath) {
              global.pathFind = fullPath;
            }
            return fullPath;
          }
        }
      }
    } catch (err) {
      // Ignore errors and continue with default search logic
    }
  }

  if (platform === 'darwin') { // macOS
    pathFind = await findAppOnMac(appName);
  } else if (platform === 'win32') { // Windows
    pathFind = await findAppOnWindows(appName);
  } else {
    console.warn(`Unsupported platform: ${platform} for findApp`);
  }

  if (pathFind) {
    global.pathFind = pathFind;
  }
  return pathFind;
}

async function launchApp(appName: string, ideInstallPath?: string) {
  // Try to find the full path of the app first.
  const executablePath = await findAppOnMacOrWin(appName, ideInstallPath);
  // If found, use the full path. Otherwise, use the original appName,
  // which might be a bundle ID on macOS or an app in the PATH.
  const identifierOrPath = executablePath || appName;

  const platform = process.platform;
  // If the passed in path exists, open it as an executable
  try {
    const stat = await fsp.stat(identifierOrPath).catch(() => null);
    if (stat) {
      if (platform === 'darwin') {
        // macOS: use open -a or open <.app path> directly
        return execFile('open', ['-a', identifierOrPath]);
      } else if (platform === 'win32') {
        // Windows: spawn the executable directly (detached)
        const child = spawn(`${identifierOrPath}`, [], { 
          detached: true, 
          stdio: 'ignore',
          cwd: path.dirname(identifierOrPath)
        });
        child.unref();
        return Promise.resolve(identifierOrPath);
      }
    }
  } catch (e) {
    // ignore and try other approaches
  }
}


async function getAppSupportPath(appName: string): Promise<string | null> {
  const platform = os.platform();
  const homeDir = os.homedir();

  let supportDir: string;
  if (platform === 'darwin') {
    supportDir = path.join(homeDir, 'Library', 'Application Support');
  } else if (platform === 'win32') {
    // Use Local for temporary files and cache (not synced across machines)
    supportDir = path.join(homeDir, 'AppData', 'Local');
  } else {
    console.warn(`Unsupported platform: ${platform} for getAppSupportPath`);
    return null;
  }
  return path.join(supportDir, appName);
}

async function getCliPath(appName: string): Promise<string | null> {
  const appPath = await findAppOnMacOrWin(appName);
  if (!appPath) {
    return null;
  }

  const platform = os.platform();

  if (platform === 'darwin') {
    const cliPath = path.join(appPath, 'Contents', 'MacOS', 'cli');
    try {
      const stat = await fsp.stat(cliPath);
      if (stat.isFile()) {
        return cliPath;
      }
    } catch (err) {
      // File does not exist
      return null;
    }
  }

  if (platform === 'win32') {
    const appDir = path.dirname(appPath);
    // Try to find clidev.bat first, then fallback to cliwin.bat
    const possiblePaths = [
      // path.join(appDir, 'package.nw', 'static', 'cli', 'clidev.bat'),
      path.join(appDir, 'package.nw', 'static', 'cli', 'cliwin.bat'),
    ];

    for (const devCliPath of possiblePaths) {
      try {
        const stat = await fsp.stat(devCliPath);
        if (stat.isFile()) {
          return devCliPath;
        }
      } catch (err) {
        // File does not exist, try next path
        continue;
      }
    }

    // No CLI file found
    return null;
  }

  console.warn(`Unsupported platform: ${platform} for getCliPath`);
  return null;
}

async function getPreviewQrCodePath(appName: string): Promise<string> {
  const appSupportPath = await getAppSupportPath(appName);
  const platform = os.platform();
  if (appSupportPath) {
    if (platform === 'darwin') {
      return path.join(appSupportPath, 'Default', `pBase64-${Date.now()}.txt`);
    } else if (platform === 'win32') {
      return path.join(appSupportPath, 'User Data', 'Default', `pBase64-${Date.now()}.txt`);
    }
  }
  return "";
}

/**
 * Execute CLI command with platform-specific handling
 * @param cliPath Path to the CLI executable
 * @param args Command arguments
 * @returns Promise with stdout and stderr
 */
// async function executeCliCommand(cliPath: string, args: string[]): Promise<{ stdout: string; stderr: string }> {
//   const platform = os.platform();

//   // On Windows, .bat files need to be executed through cmd.exe
//   if (platform === 'win32' && cliPath.endsWith('.bat')) {
//     // Quote the path if it contains spaces
//     const quotedPath = cliPath.includes(' ') ? `"${cliPath}"` : cliPath;
//     // return execFileP('cmd.exe', ['/c', quotedPath, ...args]);
//     log("cliPath:", cliPath);
//     log("args:", args);
//     log("quotedPath:", quotedPath);
                       // "C:\\Program Files (x86)\\TCSAS\\DevTools\\package.nw\\static\\cli\\cliwin.bat"
    // return execFileP("\"C:\\Program Files (x86)\\TCSAS\\DevTools\\package.nw\\static\\cli\\clidev.bat\"", args, {
//     return execFileP(quotedPath, args, {
//       shell: true,
//       encoding: 'utf8'
//     });
//   }

//   // On macOS and other platforms, execute directly
//   return execFileP(cliPath, args);
// }
async function executeCliCommand(cliPath: string, args: string[]): Promise<{ stdout: string; stderr: string }> {
  const platform = os.platform();

  // On Windows, .bat files need to be executed through cmd.exe
  if (platform === 'win32' && cliPath.endsWith('.bat')) {
    // For Windows batch files, we need to handle path escaping carefully

    // Check if the path already contains escaped backslashes
    // If we find '\\' in the path, it's likely already escaped
    const hasEscapedBackslashes = cliPath.includes('\\\\');

    // Only escape backslashes if they're not already escaped
    // This prevents double-escaping issues
    let processedPath: string;
    if (hasEscapedBackslashes) {
      // Path is already escaped, use as-is
      processedPath = cliPath;
    } else {
      // Escape single backslashes to double backslashes
      processedPath = cliPath.replace(/\\/g, '\\\\');
    }
    // Always wrap in quotes to handle spaces in path
    const quotedPath = `"${processedPath}"`;
    // log('quotedPath:', quotedPath);

    try {
      return execFileP(quotedPath, args, {
        shell: true,
        encoding: 'utf8'
      });
    } catch (error) {}
  }
  // On macOS and other platforms, execute directly
  return execFileP(cliPath, args);
}

export { findAppOnMacOrWin, launchApp, sleep, getCliPath, getAppSupportPath, getPreviewQrCodePath, executeCliCommand }
