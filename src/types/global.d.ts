/**
 * Global type declarations for the TCSAS-Devtools MCP Server
 */

declare global {
  /**
   * Cached path to the IDE installation
   * Used to avoid repeated filesystem searches
   */
  var pathFind: string | undefined;
}

// This export is required to make this a module
export {};
