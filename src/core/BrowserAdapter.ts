import {
  type Browser,
  type BrowserContext,
  type BrowserContextOptions,
  type BrowserType,
  chromium,
} from "playwright-core";
import { z } from "zod";
import { logger } from "../lib/logger";
import { mode } from "../lib/playwright/mode";
import { startPlaywrightServer } from "./PlaywrightServer";
import { createWebSocketClient } from "./WebSocketClient";

const sourceChangedSchema = z.object({
  text: z.string(),
  header: z.string(),
  footer: z.string(),
  actions: z.array(z.string()),
});

export const BrowserAdapter = (options: { browserType?: BrowserType } = {}) => {
  const { browserType = chromium } = options;

  const wsClient = createWebSocketClient();

  const state: {
    browser: Browser | undefined;
    recordingCode: string | undefined;
  } = {
    browser: undefined,
    recordingCode: undefined,
  };

  const browser = () => {
    if (!state.browser) {
      throw new Error("Currently no browser is connected");
    }

    return state.browser;
  };

  const getOrCreateContext = async (contextOptions: BrowserContextOptions) => {
    const context =
      browser().contexts().at(0) ??
      (await browser().newContext(contextOptions));
    return context;
  };

  const getOrCreatePage = async (context: BrowserContext) => {
    const page = context.pages().at(0) ?? (await context.newPage());
    return page;
  };

  const startRecording = async (options: {
    url: string;
    // optional
    storageState?: string;
    userAgent?: string;
    baseURL?: string;
    locale?: string;
  }) => {
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
      storageState: options.storageState,
      baseURL: options.baseURL,
      locale: options.locale,
      userAgent: options.userAgent,
    });

    const page = await getOrCreatePage(context);
    await page.goto(options.url);

    await wsClient.connect(`${playwrightServer.wsEndpoint}?debug-controller`);

    await wsClient.send("initialize", {
      codegenId: "playwright-test",
      sdkLanguage: "javascript",
    });

    await wsClient.send("setReportStateChanged", { enabled: true });
    await wsClient.send("setRecorderMode", {
      mode: mode("recording"),
    });
  };

  const endRecording = async () => {
    const fullCode = state.recordingCode;

    // clean up
    await state.browser?.close();
    state.browser = undefined;

    state.recordingCode = undefined;

    wsClient.send("kill", {});

    // return the full code
    return {
      fullCode,
    } as const;
  };

  return {
    originalBrowser: browser,
    getOrCreateContext,
    getOrCreatePage,
    startRecording,
    endRecording,
  } as const;
};
