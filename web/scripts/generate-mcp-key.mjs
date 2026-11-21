// Generate an API key for the local MCP server (mcp-server/).
// Run with: npm run generate-mcp-key   (from the repo root)
//
// The raw key goes in mcp-server/.env as MCP_API_TOKEN. Only its SHA-256 goes
// in Netlify as MCP_API_KEY_SHA256, so the site never stores the key itself.
// To rotate: run this again, update both places. See docs/clang-auth-migration.md (D3).

import { createHash, randomBytes } from "node:crypto";

const key = randomBytes(32).toString("base64url");
const sha256 = createHash("sha256").update(key, "utf8").digest("hex");

console.log("mcp-server/.env:");
console.log(`  MCP_API_TOKEN=${key}`);
console.log("");
console.log("Netlify environment variable (and root .env.local for netlify dev):");
console.log(`  MCP_API_KEY_SHA256=${sha256}`);
