// Generate a long-lived JWT token for the MCP server
// Run with: node scripts/generate-mcp-token.mjs

import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
  console.error("Error: JWT_SECRET environment variable is not set");
  console.error("Run with: JWT_SECRET=your-secret node scripts/generate-mcp-token.mjs");
  process.exit(1);
}

// Generate a token that expires in 1 year
const token = jwt.sign(
  {
    sub: "mcp-server",
    purpose: "api-access",
    iat: Math.floor(Date.now() / 1000),
  },
  JWT_SECRET,
  { expiresIn: "365d" }
);

console.log("Generated MCP API Token (valid for 1 year):");
console.log("");
console.log(token);
console.log("");
console.log("Set this as API_TOKEN in your Render environment variables.");
