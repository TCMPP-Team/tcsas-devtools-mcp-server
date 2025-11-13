import Registry from 'winreg';
import path from 'path';
import fs from 'fs';
import { promisify } from 'util';
import { exec } from 'child_process';

const execP = promisify(exec);

const findExeRecursive = async (dir: string, exeName: string, maxDepth = 2): Promise<string | null> => {
  if (maxDepth < 0) {
    return null;
  }
  let entries: fs.Dirent[];
  try {
    entries = await fs.promises.readdir(dir, { withFileTypes: true });
  } catch (err) {
    return null;
  }
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      const found = await findExeRecursive(fullPath, exeName, maxDepth - 1);
      if (found) {
        return found;
      }
    } else if (entry.name.toLowerCase() === exeName.toLowerCase()) {
      return fullPath;
    }
  }
  return null;
};

/**
 * Find the installation path of an application.
 * @param {string} appName - The name of the application.
 * @returns {Promise<string>} - The application's executable path, or an empty string if not found.
 */
async function findWinAppPath(appName: string): Promise<string> {
  if (!appName) return '';
  const exeName = `${appName}.exe`;

  try {
    // 1. Search in common directories
    const programPath = await searchProgramDirs(appName);
    if (programPath) {
      const exePath = await findExeRecursive(programPath, exeName);
      if (exePath) return exePath;
    }

    // 2. Search in the registry
    const registryPath = await searchRegistry(appName);
    if (registryPath) {
      const exePath = await findExeRecursive(registryPath, exeName);
      if (exePath) return exePath;
    }

    // 3. Use 'where' command to quickly check PATH for the .exe
    try {
      const { stdout } = await execP(`where ${exeName}`);
      const result = stdout.trim().split(/\\r\\n|\\n/)[0];
      if (result && fs.existsSync(result)) {
        return result;
      }
    } catch (err) {
      // Not found in PATH, continue searching
    }

    return '';
  } catch (error) {
    return '';
  }
}

// Search in the registry
async function searchRegistry(appName: string): Promise<string | null> {
  const hives = [
    { hive: Registry.HKLM, key: '\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Uninstall' },
    { hive: Registry.HKLM, key: '\\SOFTWARE\\WOW6432Node\\Microsoft\\Windows\\CurrentVersion\\Uninstall' }
  ];

  for (const { hive, key } of hives) {
    try {
      const reg = new Registry({ hive, key });
      const items: string[] = await new Promise((resolve, reject) => {
        reg.keys((err, items) => {
          if (err) reject(err);
          else {
            const keys = items ? items.map(item => {
              const parts = item.key.split('\\');
              return parts[parts.length - 1];
            }) : [];
            resolve(keys);
          }
        });
      });

      for (const item of items) {
        try {
          const itemReg = new Registry({ hive, key: `${key}\\${item}` });
          const values: { [key: string]: string } = await new Promise((resolve, reject) => {
            itemReg.values((err, values) => {
              if (err) reject(err);
              else {
                const result: { [key: string]: string } = {};
                if (values) {
                  for (const v of values) {
                    result[v.name] = v.value;
                  }
                }
                resolve(result);
              }
            });
          });

          const displayName: string = values.DisplayName || item;
          const installLocation: string = values.InstallLocation || values.Path || '';

          if (installLocation && isMatch(displayName, appName)) {
            return installLocation;
          }
        } catch (e) {
          // Ignore errors
        }
      }
    } catch (e) {
      // Ignore errors
    }
  }

  return null;
}

// Search in program directories
async function searchProgramDirs(appName: string): Promise<string | null> {
  const dirs = [
    process.env.ProgramFiles || 'C:\\Program Files',
    process.env['ProgramFiles(x86)'] || 'C:\\Program Files (x86)',
    'D:\\Program Files',
    'D:\\Program Files (x86)',
    'E:\\Program Files',
    'E:\\Program Files (x86)',
    'F:\\Program Files',
    'F:\\Program Files (x86)',
  ];

  // Add AppData directories, which are common for user-level installations
  const localAppData = process.env.LOCALAPPDATA;
  if (localAppData) {
    dirs.push(localAppData);
    // Many modern apps (like VS Code) install into a 'Programs' subdirectory here
    dirs.push(path.join(localAppData, 'Programs'));
  }

  const appData = process.env.APPDATA;
  if (appData) {
    dirs.push(appData);
  }

  // Add ProgramData for shared application data
  const programData = process.env.ProgramData;
  if (programData) {
    dirs.push(programData);
  }

  for (const dir of dirs) {
    try {
      if (!fs.existsSync(dir)) continue;

      const subDirs = fs.readdirSync(dir)
        .filter(name => {
          const fullPath = path.join(dir, name);
          try {
            return fs.statSync(fullPath).isDirectory();
          } catch {
            return false; // Ignore files that can't be stat'd
          }
        });

      for (const subDir of subDirs) {
        if (isMatch(subDir, appName)) {
          return path.join(dir, subDir);
        }
      }
    } catch (e) {
      // Ignore errors
    }
  }

  return null;
}

// Simple matching logic
function isMatch(source: string, target: string): boolean {
  if (!source || !target) return false;

  const s = source.toLowerCase();
  const t = target.toLowerCase();

  // Exact match
  if (s === t) return true;

  // Contains match
  if (s.includes(t) || t.includes(s)) return true;

  return false;
}
// Export
export { findWinAppPath };
