import { mode } from "../lib/playwright/mode";
import { startPlaywrightServer } from "./PlaywrightServer";
import { createWebSocketClient, type WebSocketClient } from "./WebSocketClient";
import { z } from "zod";

const sourceChangedSchema = z.object({
  text: z.string(),
  header: z.string(),
  footer: z.string(),
  actions: z.array(z.string()),
});

export const createCodeGenerator = () => {
  const codeStore: {
    fullCode: string | undefined;
    actions: string[];
  } = {
    fullCode: undefined,
    actions: [],
  };
  let client: WebSocketClient | undefined;

  const initialize = async () => {
    const playwrightServer = await startPlaywrightServer();

    client ??= createWebSocketClient();

    client.setOnMessage("sourceChanged", (params) => {
      const parsed = sourceChangedSchema.safeParse(params);
      if (!parsed.success) {
        console.warn("parse failed sourceChanged", params);
        return;
      }

      codeStore.actions = parsed.data.actions;
      codeStore.fullCode = parsed.data.text;
    });

    await client.connect(playwrightServer.wsEndpoint + "?debug-controller");

    await client.send("initialize", {
      codegenId: "playwright-test",
      sdkLanguage: "javascript",
    });
  };

  const cleanUp = async () => {
    codeStore.actions = [];
    codeStore.fullCode = undefined;

    await client?.send("kill", {});
    client = undefined;
  };

  const startRecording = async () => {
    await initialize();

    if (!client) {
      throw new Error("Client not initialized");
    }

    await client.send("setReportStateChanged", { enabled: true });
    await client.send("setRecorderMode", {
      mode: mode("recording"),
    });
  };

  const stopRecording = async () => {
    const fullCode = codeStore.fullCode;

    await cleanUp();

    return {
      fullCode,
    };
  };

  return {
    startRecording,
    stopRecording,
  } as const;
};
