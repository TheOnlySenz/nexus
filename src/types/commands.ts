import { ChannelMessageCreatedEvent, ChannelMessage } from "@rootsdk/server-bot";
import { ChannelGuid, UserGuid } from "./common";
import { PermissionLevel } from "../core/permissions";

export type CommandCategory =
  | "moderation"
  | "leveling"
  | "community"
  | "automation"
  | "admin"
  | "economy"
  | "games";

export interface CommandContext {
  message: ChannelMessageCreatedEvent;
  channelId: ChannelGuid;
  authorId: UserGuid;
  authorName: string;
  args: string[];
  rawArgs: string;
  prefix: string;
  permissionLevel: PermissionLevel;
  reply: (content: string) => Promise<ChannelMessage | void>;
  replyError: (errorText: string) => Promise<void>;
  services: Record<string, unknown>;
}

export interface Command {
  name: string;
  aliases?: string[];
  description: string;
  usage: string;
  category: CommandCategory;
  permission: PermissionLevel;
  cooldownMs?: number;
  execute: (ctx: CommandContext) => Promise<void>;
}
