import { randomBytes } from "node:crypto";
import { spawn } from "node:child_process";
import { logger } from "../lib/logger";

export const startPlaywrightServer = async (): Promise<{
  wsEndpoint: string;
  // cdpEndpoint: string;
}> => {
  logger.info("🚀 Playwright run-server を起動中...");

  const guid = randomBytes(16).toString("hex");
  const args = ["run-server", `--path=/${guid}`];

  const serverProcess = spawn("npx", ["playwright", ...args], {
    cwd: process.cwd(),
    stdio: "pipe",
    env: {
      ...process.env,
      PW_CODEGEN_NO_INSPECTOR: "1", // インスペクターUI無効
      PW_EXTENSION_MODE: "1", // 拡張モード有効
    },
  });

  serverProcess.stderr?.on("data", (data) => {
    console.error("🔴 Server Error:", data.toString());
  });

  return new Promise((resolve, reject) => {
    let resolved = false;

    serverProcess.stdout?.on("data", (data) => {
      const output = data.toString();

      logger.info("📝 Server Output:", output.trim());

      const match = output.match(/Listening on (.*)/);

      if (match && !resolved) {
        resolved = true;
        const wsEndpoint = match[1];
        logger.info(`✅ Server起動完了: ${wsEndpoint}`);
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
    }, 30000);
  });
};
