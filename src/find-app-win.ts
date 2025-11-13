import Registry = require('winreg');
import path = require('path');
import fs = require('fs');

/**
 * 查找应用程序安装路径
 * @param {string} appName - 应用程序名称
 * @returns {Promise<string>} - 应用程序安装路径，未找到则返回空字符串
 */
async function findAppPath(appName: string): Promise<string> {
  if (!appName) return '';

  try {
    // 1. 从注册表查找
    const registryPath = await searchRegistry(appName);
    if (registryPath) return registryPath;

    // 2. 从程序目录查找
    const programPath = await searchProgramDirs(appName);
    if (programPath) return programPath;

    // 3. 查找系统应用
    const systemPath = await searchSystemApps(appName);
    if (systemPath) return systemPath;

    return '';
  } catch (error) {
    return '';
  }
}

// 从注册表查找
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
          // 忽略错误
        }
      }
    } catch (e) {
      // 忽略错误
    }
  }

  return null;
}

// 从程序目录查找
async function searchProgramDirs(appName: string): Promise<string | null> {
  const dirs = [
    process.env.ProgramFiles || 'C:\\Program Files',
    process.env['ProgramFiles(x86)'] || 'C:\\Program Files (x86)',
    path.join(process.env.USERPROFILE || '', 'AppData', 'Local'),
    path.join(process.env.USERPROFILE || '', 'AppData', 'Roaming')
  ];

  for (const dir of dirs) {
    try {
      if (!fs.existsSync(dir)) continue;

      const subDirs = fs.readdirSync(dir)
        .filter(name => {
          const fullPath = path.join(dir, name);
          return fs.statSync(fullPath).isDirectory();
        });

      for (const subDir of subDirs) {
        if (isMatch(subDir, appName)) {
          return path.join(dir, subDir);
        }
      }
    } catch (e) {
      // 忽略错误
    }
  }

  return null;
}

// 查找系统应用
async function searchSystemApps(appName: string): Promise<string | null> {
  const systemApps: { [key: string]: string } = {
    'notepad': 'C:\\Windows\\notepad.exe',
    '记事本': 'C:\\Windows\\notepad.exe',
    'calc': 'C:\\Windows\\System32\\calc.exe',
    '计算器': 'C:\\Windows\\System32\\calc.exe',
    'cmd': 'C:\\Windows\\System32\\cmd.exe',
    '命令提示符': 'C:\\Windows\\System32\\cmd.exe',
    'powershell': 'C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe',
    'PowerShell': 'C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe'
  };

  for (const [name, exePath] of Object.entries(systemApps)) {
    if (isMatch(name, appName) && fs.existsSync(exePath)) {
      return path.dirname(exePath);
    }
  }

  return null;
}

// 简单匹配
function isMatch(source: string, target: string): boolean {
  if (!source || !target) return false;

  const s = source.toLowerCase();
  const t = target.toLowerCase();

  // 精确匹配
  if (s === t) return true;

  // 包含匹配
  if (s.includes(t) || t.includes(s)) return true;

  return false;
}

// 导出
export { findAppPath };

// 命令行使用
if (require.main === module) {
  const appName = process.argv[2];
  if (!appName) {
    console.log('使用方法: node find-app.js <应用程序名称>');
    process.exit(1);
  }

  findAppPath(appName).then(result => {
    console.log(result || '未找到');
  });
}