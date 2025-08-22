import WebSocket from "ws";
import type { ProtocolRequest, ProtocolResponse } from "./types";
import { logger } from "../lib/logger";

export const createWebSocketClient = () => {
  let wsCache: WebSocket | undefined;
  let lastId = 0;
  const callbacks = new Map<
    number,
    { fulfill: (a: unknown) => void; reject: (e: Error) => void }
  >();
  const messageHandlers: {
    method: string;
    callback: (params: Record<string, unknown>) => void | Promise<void>;
  }[] = [];

  const ws = () => {
    if (wsCache) {
      return wsCache;
    }

    throw new Error("WebSocket not connected");
  };

  const send = (method: string, params: Record<string, unknown> = {}) => {
    return new Promise((fulfill, reject) => {
      const id = ++lastId;

      const command: ProtocolRequest = {
        id,
        guid: "DebugController",
        method,
        params,
        metadata: {},
      };

      logger.info(`📤 送信: ${method}`, params);

      ws().send(JSON.stringify(command));
      callbacks.set(id, { fulfill, reject });
    });
  };

  const setOnMessage = (
    method: string,
    callback: (params: Record<string, unknown>) => void | Promise<void>
  ) => {
    messageHandlers.push({ method, callback });
  };

  const handleMessage = (message: ProtocolResponse) => {
    logger.info("📥 メッセージ受信:", JSON.stringify(message, null, 2));

    if (message.id !== undefined) {
      const callback = callbacks.get(message.id);

      if (callback === undefined) {
        logger.info(`⚠️ コールバックが見つかりません ID: ${message.id}`);
        return;
      }

      callbacks.delete(message.id);
      if (message.error) {
        console.error("❌ サーバーエラー:", message.error);
        const error = new Error(
          message.error.message || JSON.stringify(message.error)
        );
        callback.reject(error);
      } else {
        logger.info("✅ レスポンス成功:", message.result);
        callback.fulfill(message.result);
      }

      return;
    }

    // イベント通知
    logger.info(`📡 イベント受信: ${message.method}`, message.params);

    const handlers = messageHandlers.filter(
      (handler) => handler.method === message.method
    );

    for (const handler of handlers) {
      handler.callback(message.params ?? {});
    }
  };

  const connect = async (wsEndpoint: string) => {
    wsCache = new WebSocket(wsEndpoint, [], {
      perMessageDeflate: false,
      maxPayload: 256 * 1024 * 1024, // 256MB
      handshakeTimeout: 30000,
    });

    return new Promise<undefined>((resolve, reject) => {
      ws().addEventListener("open", () => {
        logger.info("✅ WebSocket接続成功");
        resolve(undefined);
      });

      ws().addEventListener("error", (event) => {
        console.error("❌ WebSocket接続エラー:", event.message);
        reject(new Error("WebSocket error: " + event.message));
      });

      ws().addEventListener("message", (event) => {
        try {
          const message: ProtocolResponse = JSON.parse(event.data.toString());
          handleMessage(message);
        } catch (e) {
          console.error("❌ メッセージパースエラー:", e);
          ws().close();
        }
      });

      ws().addEventListener("close", (event) => {
        logger.info(
          "🔌 WebSocket接続が閉じられました",
          JSON.stringify(event, null, 2)
        );
      });
    });
  };

  const close = () => {
    ws().close();
    wsCache = undefined;
    lastId = 0;
    callbacks.clear();
  };

  return {
    send,
    setOnMessage,
    connect,
    close,
  } as const;
};

export type WebSocketClient = ReturnType<typeof createWebSocketClient>;
