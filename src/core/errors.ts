import { RootApiException, ErrorCodeType } from "@rootsdk/server-bot";

export class NexusError extends Error {
  constructor(message: string, public readonly code: string = "NEXUS_ERROR") {
    super(message);
    this.name = "NexusError";
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class PermissionDeniedError extends NexusError {
  constructor(
    message: string = "You do not have permission to execute this command.",
    public readonly requiredPermission?: string
  ) {
    super(message, "PERMISSION_DENIED");
    this.name = "PermissionDeniedError";
  }
}

export class CommandSyntaxError extends NexusError {
  constructor(message: string, public readonly usage?: string) {
    super(message, "COMMAND_SYNTAX_ERROR");
    this.name = "CommandSyntaxError";
  }
}

export class CooldownActiveError extends NexusError {
  constructor(public readonly remainingMs: number) {
    const seconds = Math.ceil(remainingMs / 1000);
    super(`Command on cooldown. Please wait ${seconds} second(s).`, "COOLDOWN_ACTIVE");
    this.name = "CooldownActiveError";
  }
}

export class RateLimitExceededError extends NexusError {
  constructor(message: string = "Operation rate-limited. Please retry shortly.") {
    super(message, "RATE_LIMIT_EXCEEDED");
    this.name = "RateLimitExceededError";
  }
}

export class ResourceNotFoundError extends NexusError {
  constructor(resourceName: string, identifier?: string) {
    const detail = identifier ? ` with identifier '${identifier}'` : "";
    super(`Target ${resourceName}${detail} was not found.`, "RESOURCE_NOT_FOUND");
    this.name = "ResourceNotFoundError";
  }
}

export class DatabaseError extends NexusError {
  constructor(message: string, public readonly originalError?: unknown) {
    super(message, "DATABASE_ERROR");
    this.name = "DatabaseError";
  }
}

export function formatErrorMessage(err: unknown): string {
  if (err instanceof CommandSyntaxError) {
    return `🌸 **Oops! Let's check the command format:**\n${err.message}`;
  }

  if (err instanceof NexusError) {
    return `⚠️ **${err.message}**`;
  }


  if (err instanceof RootApiException) {
    switch (err.errorCode) {
      case ErrorCodeType.NoPermissionToCreate:
      case ErrorCodeType.NoPermissionToEdit:
      case ErrorCodeType.NoPermissionToDelete:
      case ErrorCodeType.NoPermissionToMove:
      case ErrorCodeType.NoPermissionToKick:
      case ErrorCodeType.NoPermissionToBan:
      case ErrorCodeType.NoPermissionToAdd:
        return "🛑 The bot does not have the required Root community permission to complete this action.";
      case ErrorCodeType.TooManyRequests:
        return "⏳ Root rate limit reached. The action has been queued or delayed.";
      case ErrorCodeType.NotFound:
        return "🔍 The requested channel, role, user, or message was not found on Root.";
      default:
        return `⚠️ Root API operation failed (${err.errorCode}): ${err.message}`;
    }
  }

  if (err instanceof Error) {
    return `⚠️ An unexpected error occurred: ${err.message}`;
  }

  return "⚠️ An unknown error occurred.";
}
