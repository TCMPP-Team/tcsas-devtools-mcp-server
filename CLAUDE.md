# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Common Commands

- **Build:** `npm run tsc` or `npm run build` - Compiles TypeScript code to the `build/` directory.
- **Run:** `npm start` - Runs the compiled application from the `build` directory.
- **Development:**
  - `npm run dev` - Builds and runs the application (recommended for quick testing).
  - `npm run dev:ts` - Runs directly with ts-node (faster iteration, no build step).
  - `npm run devins` - Builds and runs with the MCP inspector for debugging protocol communication.
  - `npm run dev:full` - Runs both the server and inspector in parallel.
- **Testing:** Not currently configured (`npm test` will fail).

## High-level Architecture

This is an MCP (Model Context Protocol) server that enables AI assistants to control the `TCSAS-Devtools` IDE for miniprogram development through natural language.

### Core Components

- **Entry Point (`src/index.ts`):** Sets up the MCP server using `@modelcontextprotocol/sdk` and registers four main tools:
  - `launchIde`: Opens TCSAS-Devtools, optionally with a specific project path and custom IDE installation path. Uses CLI with `--agent` flag.
  - `checkIdeInstalled`: Verifies IDE installation by searching system paths.
  - `previewMiniprogram`: Generates a preview QR code (60-80s process). Saves base64-encoded PNG to app support directory.
  - `uploadMiniprogram`: Uploads a new version with version number and description.

- **Brand Configuration (`src/brand.ts`):** Centralizes app name (`TCSAS-Devtools`) and MCP server name constants.

- **Cross-platform Utilities (`src/utils/index.ts`):**
  - `findAppOnMacOrWin(appName, ideInstallPath?)`: Locates IDE installation. If `ideInstallPath` is provided, searches current and parent directories first. Otherwise, on macOS searches `/Applications`, `~/Applications`, then uses Spotlight (mdfind); on Windows delegates to registry/filesystem search. Results are cached in `global.pathFind`.
  - `launchApp(appName, ideInstallPath?)`: Platform-specific launch logic. Accepts optional custom IDE path (macOS: `open -a`, Windows: `spawn` or `start` command).
  - `getCliPath()`: Finds the CLI tool within the IDE installation (macOS: `Contents/MacOS/cli`, Windows: searches recursively for `cli.exe`).
  - `getPreviewQrCodePath(appName)`: Generates timestamped file paths in the app's support directory for QR code storage (macOS: `~/Library/Application Support/{appName}/Default`, Windows: `%LOCALAPPDATA%\{appName}\User Data\Default`).

- **Windows-specific (`src/utils/findWinApp.ts`):** Comprehensive Windows app finding logic:
  1. Searches common program directories (Program Files, AppData, ProgramData).
  2. Queries Windows Registry (HKLM Uninstall keys, including WOW6432Node for 32-bit apps).
  3. Falls back to `where` command for PATH lookup.
  Uses `findExeRecursive()` with max depth of 2 to locate executables.

### Key Technical Details

- **MCP Tool Registration:** Uses Zod schemas for input/output validation. All tools return structured content with both text and typed data.
- **CLI Invocation:** The IDE's CLI tool is invoked via Node's `execFile` for operations like `--open`, `--preview`, `-u` (upload). The `--agent` flag is used to indicate MCP-driven operations.
- **Preview QR Code Flow:** CLI generates base64 PNG, saves to timestamped file in app support directory, server reads and returns as MCP ImageContent.
- **Platform Detection:** Uses `os.platform()` to branch between macOS (`darwin`) and Windows (`win32`) logic.

## Development Notes

- The project compiles to CommonJS (`module: "CommonJS"` in tsconfig.json).
- All source files are in `src/`, compiled output goes to `build/`.
