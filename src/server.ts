import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { stringify } from "yaml"

import packageJson from "../package.json" with { type: "json" };
import { createCodeGenerator } from "./core/CodeGenerator";

export const createServer = async () => {
  const server = new McpServer({
    name: packageJson.name,
    version: packageJson.version,
  });

  const generator = createCodeGenerator();

  server.tool("playwright_codegen_recording_start", "Starts a browser for recording user interactions. The LLM should prompt the user to confirm the browser launch and perform the test case operations they want to generate, then report completion. Use playwright_codegen_recording_end after operations are complete to generate code from the recorded interactions.", {}, async () => {
    await generator.startRecording();

    return {
      content: [
        {
          type: "text",
          text: "Recording started successfully. Browser is now open and ready.\n\nNext action: Please inform the user that a browser window has opened and they should perform the test operations they want to generate code for. Once they have completed all the desired interactions, ask them to confirm completion so you can call playwright_codegen_recording_end to generate the test code.",
        },
      ],
    }
  });

  server.tool("playwright_codegen_recording_end", "Ends the recording session and closes the browser. Returns mechanically generated code based on the user interactions performed between start and end. The generated code is raw and may require manual adjustments to fit into your project's test structure and coding standards.", {}, async () => {
    const result = await generator.stopRecording();

    return {
      content: [
        {
          type: "text",
          text: `${stringify({
            fullCode: result.fullCode,
            note: `Recording completed and browser closed.\n\nNote: The following code has been mechanically generated based on the user's interactions. It may require manual adjustments to fit your project's test structure, naming conventions, and coding standards before use.`
          })}`,
        }
      ]
    }
  });

  return {
    server,
  };
};
