import { RootApiException, ErrorCodeType } from "@rootsdk/server-bot";
import { CONSTANTS } from "../config/defaults";
import { Logger } from "./logger";

const logger = new Logger("RateLimiter");

/**
 * Paces loops to prevent exceeding Root's ~5 req/s command or ~20 req/s query limit.
 */
export async function pace(delayMs: number = CONSTANTS.RATE_LIMIT.COMMAND_PACE_MS): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, delayMs));
}

/**
 * Executes an operation with exponential backoff and full jitter upon encountering
 * transient Root API exceptions (TooManyRequests, ServerError, Timeout, StillProcessing).
 */
export async function withRetry<T>(
  operation: () => Promise<T>,
  options: {
    maxRetries?: number;
    baseDelayMs?: number;
    maxDelayMs?: number;
    operationName?: string;
  } = {}
): Promise<T> {
  const maxRetries = options.maxRetries ?? CONSTANTS.RATE_LIMIT.MAX_RETRIES;
  const baseDelayMs = options.baseDelayMs ?? CONSTANTS.RATE_LIMIT.BASE_BACKOFF_MS;
  const maxDelayMs = options.maxDelayMs ?? CONSTANTS.RATE_LIMIT.MAX_BACKOFF_MS;
  const opName = options.operationName ?? "RootOperation";

  for (let attempt = 0; ; attempt++) {
    try {
      return await operation();
    } catch (err: unknown) {
      const isRootException = err instanceof RootApiException;
      const retryable = isRootException
        ? err.errorCode === ErrorCodeType.TooManyRequests ||
          err.errorCode === ErrorCodeType.ServerError ||
          err.errorCode === ErrorCodeType.Timeout ||
          err.errorCode === ErrorCodeType.StillProcessing
        : true; // Non-RootApiExceptions (e.g. transient network timeouts) are treated as retryable

      if (attempt >= maxRetries || !retryable) {
        if (attempt > 0) {
          logger.error(`Exhausted all ${maxRetries} retries for ${opName}`, err);
        }
        throw err;
      }

      // Exponential backoff with full jitter
      const cap = Math.min(baseDelayMs * Math.pow(2, attempt), maxDelayMs);
      const delay = Math.floor(Math.random() * cap);

      logger.warn(`Retryable error on ${opName} (attempt ${attempt + 1}/${maxRetries}): waiting ${delay}ms`, {
        error: isRootException ? err.errorCode : String(err),
      });

      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }
}

/**
 * In-memory cooldown manager for commands and anti-spam protection.
 */
export class CooldownManager {
  private cooldowns: Map<string, number> = new Map();

  /**
   * Checks whether a key is currently on cooldown.
   * If on cooldown, returns remaining milliseconds.
   * If not on cooldown and `setIfAvailable` is true, sets the cooldown.
   */
  check(key: string, cooldownMs: number, setIfAvailable: boolean = true): { onCooldown: boolean; remainingMs: number } {
    const now = Date.now();
    const expiry = this.cooldowns.get(key);

    if (expiry && now < expiry) {
      return { onCooldown: true, remainingMs: expiry - now };
    }

    if (setIfAvailable && cooldownMs > 0) {
      this.cooldowns.set(key, now + cooldownMs);
    }

    return { onCooldown: false, remainingMs: 0 };
  }

  /**
   * Explicitly set or reset a cooldown.
   */
  set(key: string, cooldownMs: number): void {
    this.cooldowns.set(key, Date.now() + cooldownMs);
  }

  /**
   * Reset / clear a cooldown.
   */
  clear(key: string): void {
    this.cooldowns.delete(key);
  }

  /**
   * Housekeeping: periodically cleans expired entries to prevent memory growth.
   */
  sweep(): void {
    const now = Date.now();
    for (const [key, expiry] of this.cooldowns.entries()) {
      if (now >= expiry) {
        this.cooldowns.delete(key);
      }
    }
  }
}
