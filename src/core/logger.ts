export type LogLevel = "debug" | "info" | "warn" | "error";

export interface LogContext {
  module?: string;
  communityId?: string;
  userId?: string;
  channelId?: string;
  command?: string;
  [key: string]: unknown;
}

export class Logger {
  private levelPriority: Record<LogLevel, number> = {
    debug: 10,
    info: 20,
    warn: 30,
    error: 40,
  };

  private currentLevel: LogLevel = "info";

  constructor(private readonly moduleName: string = "NEXUS") {
    if (process.env.DEBUG === "true" || process.env.NODE_ENV === "development") {
      this.currentLevel = "debug";
    }
  }

  setLevel(level: LogLevel): void {
    this.currentLevel = level;
  }

  private shouldLog(level: LogLevel): boolean {
    return this.levelPriority[level] >= this.levelPriority[this.currentLevel];
  }

  private sanitize(data: unknown): unknown {
    if (!data || typeof data !== "object") return data;

    const copy = Array.isArray(data) ? [...data] : { ...(data as Record<string, unknown>) };
    const sensitiveKeys = ["token", "secret", "password", "key", "authorization", "dev_token"];

    for (const [k, v] of Object.entries(copy)) {
      if (sensitiveKeys.some((s) => k.toLowerCase().includes(s))) {
        (copy as Record<string, unknown>)[k] = "[REDACTED]";
      } else if (typeof v === "object" && v !== null) {
        (copy as Record<string, unknown>)[k] = this.sanitize(v);
      }
    }

    return copy;
  }

  private format(level: LogLevel, message: string, ctx?: LogContext): string {
    const timestamp = new Date().toISOString();
    const prefix = `[${timestamp}] [${level.toUpperCase()}] [${this.moduleName}]`;
    if (!ctx || Object.keys(ctx).length === 0) {
      return `${prefix} ${message}`;
    }
    const cleanCtx = this.sanitize(ctx);
    return `${prefix} ${message} ${JSON.stringify(cleanCtx)}`;
  }

  debug(message: string, ctx?: LogContext): void {
    if (!this.shouldLog("debug")) return;
    console.debug(this.format("debug", message, ctx));
  }

  info(message: string, ctx?: LogContext): void {
    if (!this.shouldLog("info")) return;
    console.info(this.format("info", message, ctx));
  }

  warn(message: string, ctx?: LogContext): void {
    if (!this.shouldLog("warn")) return;
    console.warn(this.format("warn", message, ctx));
  }

  error(message: string, error?: unknown, ctx?: LogContext): void {
    if (!this.shouldLog("error")) return;
    const errDetails: Record<string, unknown> = {};
    if (error instanceof Error) {
      errDetails.errorName = error.name;
      errDetails.errorMessage = error.message;
      errDetails.stack = error.stack;
    } else if (error) {
      errDetails.rawError = String(error);
    }
    console.error(this.format("error", message, { ...ctx, ...errDetails }));
  }

  child(subModule: string): Logger {
    return new Logger(`${this.moduleName}:${subModule}`);
  }
}

export const defaultLogger = new Logger("NEXUS");
