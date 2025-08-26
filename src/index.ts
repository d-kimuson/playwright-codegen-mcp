#!/usr/bin/env node

import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { program } from "commander";
import packageJson from "../package.json" with { type: "json" };
import { createServer } from "./server";

const main = async () => {
  program
    .name(`npx github:d-kimuson/${packageJson.name}`)
    .version(packageJson.version)
    .description(packageJson.description)
    .addHelpText(
      "after",
      `
For detailed information about valid values and usage for each option, 
please refer to the official Playwright documentation:
https://playwright.dev/docs/api/class-browser#browser-new-context`,
    )
    .option("--base-url <url>", "The base URL to use for the browser.")
    .option("--locale <locale>", "The locale to use for the browser.")
    .option(
      "--default-storage-state <path>",
      "The path to the default storage state file.",
    )
    .option(
      "--default-user-agent <user-agent>",
      "The user agent to use for the browser.",
    );

  program.parse();

  const options = program.opts<{
    defaultStorageState?: string;
  }>();

  const { server } = await createServer({
    defaultStorageState: options.defaultStorageState,
  });

  const transport = new StdioServerTransport();
  await server.connect(transport);
};

await main();
