type LogLevel = "info" | "warn" | "error";

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  function: string;
  message: string;
  requestId?: string;
  data?: Record<string, unknown>;
}

let currentRequestId: string | undefined;
let currentFunction: string | undefined;

export function initLogger(functionName: string, req: Request) {
  currentFunction = functionName;
  currentRequestId = req.headers.get("x-request-id") || crypto.randomUUID().slice(0, 8);
}

function log(level: LogLevel, message: string, data?: Record<string, unknown>) {
  const entry: LogEntry = {
    timestamp: new Date().toISOString(),
    level,
    function: currentFunction || "unknown",
    message,
    requestId: currentRequestId,
    ...(data && Object.keys(data).length > 0 ? { data } : {}),
  };
  const output = JSON.stringify(entry);
  if (level === "error") {
    console.error(output);
  } else if (level === "warn") {
    console.warn(output);
  } else {
    console.log(output);
  }
}

export const logger = {
  info: (message: string, data?: Record<string, unknown>) => log("info", message, data),
  warn: (message: string, data?: Record<string, unknown>) => log("warn", message, data),
  error: (message: string, data?: Record<string, unknown>) => log("error", message, data),
};
