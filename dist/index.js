#!/usr/bin/env node

// src/index.ts
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { program } from "commander";

// package.json
var package_default = {
  name: "playwright-codegen-mcp",
  version: "0.0.0",
  description: "Model Context Protocol (MCP) server that provides Playwright browser automation tools for AI assistants",
  type: "module",
  bin: {
    "playwright-codegen-mcp": "dist/index.js"
  },
  scripts: {
    lint: "run-s 'lint:*'",
    "lint:biome-format": "biome format .",
    "lint:biome-lint": "biome check .",
    fix: "run-s 'fix:*'",
    "fix:biome-format": "biome format --write .",
    "fix:biome-lint": "biome check --write .",
    typecheck: "tsc --noEmit",
    build: "esbuild ./src/index.ts --bundle --platform=node --packages=external --format=esm --outdir=dist --sourcemap"
  },
  packageManager: "pnpm@10.11.0",
  dependencies: {
    "@modelcontextprotocol/sdk": "^1.17.3",
    commander: "^14.0.0",
    "playwright-core": "^1.55.0",
    ulid: "^3.0.1",
    ws: "^8.18.3",
    yaml: "^2.8.1",
    zod: "^3.24.2"
  },
  devDependencies: {
    "@biomejs/biome": "^2.2.0",
    "@tsconfig/strictest": "^2.0.5",
    "@types/node": "^24.3.0",
    "@types/ws": "^8.18.1",
    esbuild: "^0.25.9",
    "npm-run-all2": "^8.0.4",
    playwright: "^1.55.0",
    tsx: "^4.20.4",
    typescript: "^5.9.2"
  }
};

// src/server.ts
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { stringify } from "yaml";
import z2 from "zod";

// src/core/BrowserAdapter.ts
import {
  chromium
} from "playwright-core";
import { z } from "zod";

// src/lib/logger.ts
var logColor = (level) => {
  switch (level) {
    case "info":
      return "\x1B[0m";
    /* black */
    case "error":
      return "\x1B[31m";
    /* red */
    case "warn":
      return "\x1B[33m";
    /* yellow */
    default:
      return "\x1B[0m";
  }
};
var printLog = (level, message, data) => {
  process.stderr.write(
    logColor(level) + `[${level.toUpperCase()}] ${message}` + (data ? `
${JSON.stringify(data, null, 2)}` : "") + "\n"
  );
};
var serializeError = (error) => {
  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message,
      stack: error.stack ?? null,
      cause: error.cause ?? null
    };
  }
  return Object.assign({}, error);
};
var logger = {
  info: (message, data) => {
    printLog("info", message, data);
  },
  error: (message, data) => {
    printLog(
      "error",
      message,
      data && data instanceof Error ? serializeError(data) : data
    );
  },
  warn: (message, data) => {
    printLog("warn", message, data);
  }
};

// src/lib/playwright/mode.ts
var mode = (m) => m;

// src/core/PlaywrightServer.ts
import { spawn } from "node:child_process";
import { randomBytes } from "node:crypto";
var startPlaywrightServer = async () => {
  logger.info("\u{1F680} Playwright run-server \u3092\u8D77\u52D5\u4E2D...");
  const guid = randomBytes(16).toString("hex");
  const args = ["run-server", `--path=/${guid}`];
  const serverProcess = spawn("npx", ["playwright", ...args], {
    cwd: process.cwd(),
    stdio: "pipe",
    env: {
      ...process.env,
      PW_CODEGEN_NO_INSPECTOR: "1",
      // インスペクターUI無効
      PW_EXTENSION_MODE: "1"
      // 拡張モード有効
    }
  });
  serverProcess.stderr?.on("data", (data) => {
    logger.error(`\u{1F534} Server Error: ${data.toString()}`);
  });
  return new Promise((resolve, reject) => {
    let resolved = false;
    serverProcess.stdout?.on("data", (data) => {
      const output = data.toString();
      logger.info("\u{1F4DD} Server Output:", output.trim());
      const match = output.match(/Listening on (.*)/);
      if (match && !resolved) {
        resolved = true;
        const wsEndpoint = match[1];
        logger.info(`\u2705 Server\u8D77\u52D5\u5B8C\u4E86: ${wsEndpoint}`);
        resolve({ wsEndpoint });
      }
    });
    serverProcess.on("error", (error) => {
      if (!resolved) {
        resolved = true;
        reject(error);
      }
    });
    serverProcess.on("exit", (code) => {
      if (!resolved) {
        resolved = true;
        reject(new Error(`Server exited with code ${code}`));
      }
    });
    setTimeout(() => {
      if (!resolved) {
        resolved = true;
        reject(new Error("Server startup timeout"));
      }
    }, 3e4);
  });
};

// src/core/WebSocketClient.ts
import WebSocket from "ws";
var createWebSocketClient = () => {
  let wsCache;
  let lastId = 0;
  const callbacks = /* @__PURE__ */ new Map();
  const messageHandlers = [];
  const ws = () => {
    if (wsCache) {
      return wsCache;
    }
    throw new Error("WebSocket not connected");
  };
  const send = (method, params = {}) => {
    return new Promise((fulfill, reject) => {
      const id = ++lastId;
      const command = {
        id,
        guid: "DebugController",
        method,
        params,
        metadata: {}
      };
      logger.info(`\u{1F4E4} \u9001\u4FE1: ${method}`, params);
      ws().send(JSON.stringify(command));
      callbacks.set(id, { fulfill, reject });
    });
  };
  const setOnMessage = (method, callback) => {
    messageHandlers.push({ method, callback });
  };
  const handleMessage = (message) => {
    logger.info("\u{1F4E5} \u30E1\u30C3\u30BB\u30FC\u30B8\u53D7\u4FE1:", JSON.stringify(message, null, 2));
    if (message.id !== void 0) {
      const callback = callbacks.get(message.id);
      if (callback === void 0) {
        logger.info(`\u26A0\uFE0F \u30B3\u30FC\u30EB\u30D0\u30C3\u30AF\u304C\u898B\u3064\u304B\u308A\u307E\u305B\u3093 ID: ${message.id}`);
        return;
      }
      callbacks.delete(message.id);
      if (message.error) {
        logger.error(`\u274C \u30B5\u30FC\u30D0\u30FC\u30A8\u30E9\u30FC: ${message.error}`);
        const error = new Error(
          message.error.message || JSON.stringify(message.error)
        );
        callback.reject(error);
      } else {
        logger.info("\u2705 \u30EC\u30B9\u30DD\u30F3\u30B9\u6210\u529F:", message.result);
        callback.fulfill(message.result);
      }
      return;
    }
    logger.info(`\u{1F4E1} \u30A4\u30D9\u30F3\u30C8\u53D7\u4FE1: ${message.method}`, message.params);
    const handlers = messageHandlers.filter(
      (handler) => handler.method === message.method
    );
    for (const handler of handlers) {
      handler.callback(message.params ?? {});
    }
  };
  const connect = async (wsEndpoint) => {
    wsCache = new WebSocket(wsEndpoint, [], {
      perMessageDeflate: false,
      maxPayload: 256 * 1024 * 1024,
      // 256MB
      handshakeTimeout: 3e4
    });
    return new Promise((resolve, reject) => {
      ws().addEventListener("open", () => {
        logger.info("\u2705 WebSocket\u63A5\u7D9A\u6210\u529F");
        resolve(void 0);
      });
      ws().addEventListener("error", (event) => {
        logger.error(`\u274C WebSocket\u63A5\u7D9A\u30A8\u30E9\u30FC: ${event.message}`);
        reject(new Error(`WebSocket error: ${event.message}`));
      });
      ws().addEventListener("message", (event) => {
        try {
          const message = JSON.parse(event.data.toString());
          handleMessage(message);
        } catch (e) {
          logger.error(`\u274C \u30E1\u30C3\u30BB\u30FC\u30B8\u30D1\u30FC\u30B9\u30A8\u30E9\u30FC: ${e}`);
          ws().close();
        }
      });
      ws().addEventListener("close", (event) => {
        logger.info(
          "\u{1F50C} WebSocket\u63A5\u7D9A\u304C\u9589\u3058\u3089\u308C\u307E\u3057\u305F",
          JSON.stringify(event, null, 2)
        );
      });
    });
  };
  const close = () => {
    ws().close();
    wsCache = void 0;
    lastId = 0;
    callbacks.clear();
  };
  return {
    send,
    setOnMessage,
    connect,
    close
  };
};

// src/core/BrowserAdapter.ts
var sourceChangedSchema = z.object({
  text: z.string(),
  header: z.string(),
  footer: z.string(),
  actions: z.array(z.string())
});
var BrowserAdapter = (options = {}) => {
  const { browserType = chromium } = options;
  const wsClient = createWebSocketClient();
  const state = {
    browser: void 0,
    recordingCode: void 0
  };
  const browser = () => {
    if (!state.browser) {
      throw new Error("Currently no browser is connected");
    }
    return state.browser;
  };
  const getOrCreateContext = async (contextOptions) => {
    const context = browser().contexts().at(0) ?? await browser().newContext(contextOptions);
    return context;
  };
  const getOrCreatePage = async (context) => {
    const page = context.pages().at(0) ?? await context.newPage();
    return page;
  };
  const startRecording = async (options2) => {
    const playwrightServer = await startPlaywrightServer();
    wsClient.setOnMessage("sourceChanged", (params) => {
      const parsed = sourceChangedSchema.safeParse(params);
      if (!parsed.success) {
        logger.warn("parse failed sourceChanged", params);
        return;
      }
      state.recordingCode = parsed.data.text;
    });
    state.browser = await browserType.connect(playwrightServer.wsEndpoint);
    const context = await getOrCreateContext({
      storageState: options2.storageState,
      baseURL: options2.baseURL,
      locale: options2.locale,
      userAgent: options2.userAgent
    });
    const page = await getOrCreatePage(context);
    await page.goto(options2.url);
    await wsClient.connect(`${playwrightServer.wsEndpoint}?debug-controller`);
    await wsClient.send("initialize", {
      codegenId: "playwright-test",
      sdkLanguage: "javascript"
    });
    await wsClient.send("setReportStateChanged", { enabled: true });
    await wsClient.send("setRecorderMode", {
      mode: mode("recording")
    });
  };
  const endRecording = async () => {
    const fullCode = state.recordingCode;
    await state.browser?.close();
    state.browser = void 0;
    state.recordingCode = void 0;
    wsClient.send("kill", {});
    return {
      fullCode
    };
  };
  return {
    originalBrowser: browser,
    getOrCreateContext,
    getOrCreatePage,
    startRecording,
    endRecording
  };
};

// src/server.ts
var createServer = async (options) => {
  const server = new McpServer({
    name: package_default.name,
    version: package_default.version
  });
  const browser = BrowserAdapter();
  server.tool(
    "playwright_codegen_recording_start",
    "Starts a browser for recording user interactions. The LLM should prompt the user to confirm the browser launch and perform the test case operations they want to generate, then report completion. Use playwright_codegen_recording_end after operations are complete to generate code from the recorded interactions.",
    {
      url: z2.string().describe("The URL to navigate to when the browser is launched."),
      storageState: z2.string().optional().describe(
        `The path to the storage state file. If not provided, the browser will start with configured default storage state(path: ${options.defaultStorageState ?? "not configured"}).`
      ),
      userAgent: z2.string().optional().describe(
        `The user agent to use for the browser. If not provided, the browser will start with configured default user agent(value: ${options.defaultUserAgent ?? "not configured"}).`
      )
    },
    async (params) => {
      await browser.startRecording({
        url: params.url,
        storageState: params.storageState ?? options.defaultStorageState,
        userAgent: params.userAgent ?? options.defaultUserAgent,
        baseURL: options.baseURL,
        locale: options.locale
      });
      return {
        content: [
          {
            type: "text",
            text: "Recording started successfully. Browser is now open and ready.\n\nNext action: Please inform the user that a browser window has opened and they should perform the test operations they want to generate code for. Once they have completed all the desired interactions, ask them to confirm completion so you can call playwright_codegen_recording_end to generate the test code."
          }
        ]
      };
    }
  );
  server.tool(
    "playwright_codegen_recording_end",
    "Ends the recording session and closes the browser. Returns mechanically generated code based on the user interactions performed between start and end. The generated code is raw and may require manual adjustments to fit into your project's test structure and coding standards.",
    {},
    async () => {
      const result = await browser.endRecording();
      return {
        content: [
          {
            type: "text",
            text: `${stringify({
              fullCode: result.fullCode,
              note: `Recording completed and browser closed.

Note: The following code has been mechanically generated based on the user's interactions. It may require manual adjustments to fit your project's test structure, naming conventions, and coding standards before use.`
            })}`
          }
        ]
      };
    }
  );
  return {
    server
  };
};

// src/index.ts
var main = async () => {
  program.name(`npx github:d-kimuson/${package_default.name}`).version(package_default.version).description(package_default.description).addHelpText(
    "after",
    `
For detailed information about valid values and usage for each option, 
please refer to the official Playwright documentation:
https://playwright.dev/docs/api/class-browser#browser-new-context`
  ).option("--base-url <url>", "The base URL to use for the browser.").option("--locale <locale>", "The locale to use for the browser.").option(
    "--default-storage-state <path>",
    "The path to the default storage state file."
  ).option(
    "--default-user-agent <user-agent>",
    "The user agent to use for the browser."
  );
  program.parse();
  const options = program.opts();
  const { server } = await createServer({
    defaultStorageState: options.defaultStorageState
  });
  const transport = new StdioServerTransport();
  await server.connect(transport);
};
await main();
//# sourceMappingURL=index.js.map
