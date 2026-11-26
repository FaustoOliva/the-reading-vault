/**
 * stdio Console Guard
 * Reserves stdout for the MCP JSON-RPC stream.
 *
 * Import this module before any other module in the MCP entry point.
 * Diagnostics still reach the operator through stderr.
 */

console.log = console.error;
console.info = console.error;
console.debug = console.error;
