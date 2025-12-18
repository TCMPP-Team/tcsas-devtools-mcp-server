# TCSAS-Devtools MCP Server

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

An MCP (Model Context Protocol) server designed to connect AI assistants with `TCSAS-Devtools` for a seamless miniprogram development experience.

This server wraps the basic functionalities of `TCSAS-Devtools` into a set of tools that can be called by AI assistants (like CodeBuddy, Cursor, Claude), allowing you to open, build, preview, and upload miniprograms using natural language.

## ✨ Features

-   **Launch IDE**: Directly open the `TCSAS-Devtools` application or a specific miniprogram project.
-   **Check Installation**: Verify if `TCSAS-Devtools` is installed on the local machine.
-   **Preview Miniprogram**: Generate a QR code for previewing the miniprogram on a mobile device.
-   **Upload Miniprogram**: Upload a new version of the miniprogram with specified version information.
-   **Get Runtime Log**: Retrieve the latest runtime log and screenshot from the MiniProgram IDE for debugging.

## 🚀 Prerequisites

Before you begin, ensure you have the following software installed:

-   [Node.js](https://nodejs.org/) (v20 or higher recommended)
-   [npm](https://www.npmjs.com/)
-   [TCSAS-Devtools](https://www.tencentcloud.com/zh/products/tcsas)

## 📦 Installation and Setup

1.  **For first-time use, please download the installation package for TCSAS-Devtools from the console in advance, the version should >= 2.2.15.**
2.  **After installation, please open it to complete the login process and enable the service port.**

![login pannel ](https://github.com/TCMPP-Team/tcsas-devtools-mcp-server/raw/main/images/image.png)
Settings - Security - Enable
![enable Service port](https://github.com/TCMPP-Team/tcsas-devtools-mcp-server/raw/main/images/setting.png)

**Ensure the above steps are completed. Then you can configure the MCP server in your Code Agent and start using it.**

## 🤖 How to Use in Cursor

You can integrate this server with any AI assistant that supports custom MCP servers. Here are the steps to configure it in Cursor:

1.  **Open Cursor Settings**: In Cursor, find the settings for AI integration. This is usually located in `Settings` > `Tools & MCP` or a similar configuration area for managing AI providers.

2.  **Add Custom MCP Service**: Look for an option like "Add Model Context Provider" or "MCP Server" and click "Add".

3.  **Enter Command**: For example:

    ```json
    {
      "tcsas-devtools-mcp-server": {
        "command": "npx",
        "args": [
          "-y",
          "tcsas-devtools-mcp-server@latest"
        ]
      }
    }
    ```

    **Illustration**: (A screenshot of the Cursor settings panel could be like this, showing the user entering the command in the mcp.json)

    ![Cursor MCP Configuration](https://github.com/TCMPP-Team/tcsas-devtools-mcp-server/raw/main/images/cursor.png)

5.  **Connect and Start Using**: After adding, Cursor will connect to your local server. Now you can interact with it in the chat. For example, you can type:

    > "Launch TCSAS-Devtools and open my project at `/Users/me/projects/my-miniprogram`."

    > "Generate a preview QR code for the project I'm currently developing."

## 🛠️ Tool API Reference

Below is a detailed description of all the tools provided by this MCP server:

### `launchIde`
Launches the `TCSAS-Devtools` IDE.
-   **Input Parameters:**
    -   `path` (optional, string): The absolute path to the miniprogram project to open.
    -   `ideInstallPath` (optional, string): The absolute path to the IDE installation. If omitted, the IDE will be launched with the default installation path.
-   **Output:**
    -   `openApp` (boolean): Whether the IDE was launched successfully.
    -   `openProject` (boolean): Whether the project was opened successfully.
    -   `msg` (string): Status message or error details.

### `checkIdeInstalled`
Checks if the `TCSAS-Devtools` IDE is installed.
-   **Input Parameters:** None
-   **Output:**
    -   `isInstall` (boolean): Returns `true` if the IDE is installed, otherwise `false`.

### `previewMiniprogram`
Generates a preview QR code for a miniprogram project. Note: This process can take 60-80 seconds to complete.
-   **Input Parameters:**
    -   `path` (string): The absolute path to the miniprogram project.
-   **Output:**
    -   Returns a QR code image (PNG) that can be scanned to preview the miniprogram.

### `uploadMiniprogram`
Uploads a new version of the miniprogram.
-   **Input Parameters:**
    -   `path` (string): The absolute path to the project.
    -   `version` (string): The new version number (e.g., "1.0.1").
    -   `describeMessage` (string): A short description of the changes.
-   **Output:**
    -   `updateDetail` (string): Upload response details or error message.

### `getMiniProgramRuntimeLog`
Get the latest runtime log and screenshot from MiniProgram IDE. Use this after writing or modifying code to verify execution results and UI rendering.
-   **Input Parameters:**
    -   `path` (string): The absolute path of the miniprogram project.
-   **Output:**
    -   `result` (string): The runtime log from MiniProgram (console.log, warnings, errors).
    -   `timestamp` (string): When the log was generated.
    -   `screenshot` (image/png): A screenshot of the current MiniProgram view.

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📜 License

This project is open-sourced under the [MIT License](LICENSE).
