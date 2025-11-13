import Registry from 'winreg';
import path from 'path';
import fs from 'fs';

/**
 * 查找应用程序安装路径
 * @param {string} appName - 应用程序名称
 * @returns {Promise<string>} - 应用程序安装路径，未找到则返回空字符串
 */
async function findWinAppPath(appName: string): Promise<string> {
  if (!appName) return '';

  try {
    // 1. 从常见目录查询
    const programPath = await searchProgramDirs(appName);
    if (programPath) return programPath;

    // 2. 从注册表查询
    const registryPath = await searchRegistry(appName);
    if (registryPath) return registryPath;

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
// TODO 支持更多的常见目录
async function searchProgramDirs(appName: string): Promise<string | null> {
  const dirs = [
    process.env.ProgramFiles || 'C:\\Program Files',
    process.env['ProgramFiles(x86)'] || 'C:\\Program Files (x86)',
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
export { findWinAppPath };
