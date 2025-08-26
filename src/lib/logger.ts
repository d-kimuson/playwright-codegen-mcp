type LogLevel = "info" | "error" | "warn";

type Logger = {
  info: (message: string, data?: unknown) => void;
  error: (message: string, data?: unknown) => void;
  warn: (message: string, data?: unknown) => void;
};

const logColor = (level: LogLevel) => {
  switch (level) {
    case "info":
      return "\x1b[0m"; /* black */
    case "error":
      return "\x1b[31m"; /* red */
    case "warn":
      return "\x1b[33m"; /* yellow */
    default:
      return "\x1b[0m"; /* black */
  }
};

const printLog = (level: LogLevel, message: string, data: unknown) => {
  process.stderr.write(
    logColor(level) +
      `[${level.toUpperCase()}] ${message}` +
      (data ? `\n${JSON.stringify(data, null, 2)}` : "") +
      "\n",
  );
};

export const serializeError = (error: unknown) => {
  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message,
      stack: error.stack ?? null,
      cause: error.cause ?? null,
    };
  }

  return Object.assign({}, error);
};

export const logger: Logger = {
  info: (message, data) => {
    printLog("info", message, data);
  },
  error: (message, data) => {
    printLog(
      "error",
      message,
      data && data instanceof Error ? serializeError(data) : data,
    );
  },
  warn: (message, data) => {
    printLog("warn", message, data);
  },
};
