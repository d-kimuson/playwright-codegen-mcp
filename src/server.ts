import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import packageJson from "../package.json" with { type: "json" };

export const createServer = () => {
  const server = new McpServer({
    name: packageJson.name,
    version: packageJson.version,
  });

  server.tool("tool_name", "tool_description", {}, async () => {
    return {
      content: [
        {
          type: "text",
          text: "dummy",
        },
      ],
    };
  });

  return {
    server,
  };
};
