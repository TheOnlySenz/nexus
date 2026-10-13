import { rootServer, ChannelGuid } from "@rootsdk/server-bot";
import { Command, CommandContext } from "../../types/commands";
import { PermissionLevel } from "../../core/permissions";
import { SettingsRepository } from "../../database/repositories/settings";
import { CUTE_DIVIDER, SAKURA_DIVIDER } from "../../utils/formatting";
import { withRetry } from "../../core/rate-limiter";
import { Logger } from "../../core/logger";

const logger = new Logger("ConfessCommand");

export const confessCommand: Command = {
  name: "confess",
  aliases: ["confession", "anon", "secret"],
  description: "Send an anonymous, heartwarming note or positive confession to the community!",
  usage: "!confess <your message>",
  category: "community",
  permission: PermissionLevel.MEMBER,
  cooldownMs: 5000,
  execute: async (ctx: CommandContext) => {
    const settingsRepo = ctx.services.settingsRepo as SettingsRepository;
    const communityId = ctx.message.communityId || "default";

    if (!ctx.rawArgs) {
      await ctx.reply("🌸 Please include a kind note or confession to send anonymously! Example: `!confess Everyone in this server is so kind and warm!` (*ˊᵕˋ*)");
      return;
    }

    // 1. Delete the triggering message to protect the author's privacy
    try {
      if (ctx.message?.id && ctx.channelId) {
        await withRetry(() =>
          rootServer.community.channelMessages.delete({
            id: ctx.message.id,
            channelId: ctx.channelId,
          })
        );
      }
    } catch (delErr) {
      logger.warn("Could not delete confession command message (missing delete permission?)", { delErr });
    }

    const settings = await settingsRepo.getSettings(communityId);
    const targetChannelId = (settings.confessionChannelId as ChannelGuid) || ctx.channelId;

    // Generate cute pseudo-hash ID for the confession
    const hash = Math.floor(1000 + Math.random() * 9000);

    const card = [
      `💌 ˚｡⋆୨୧˚ **A SECRET LETTER HAS ARRIVED...** ˚୨୧⋆｡˚ 🌸`,
      CUTE_DIVIDER,
      `> "${ctx.rawArgs}"`,
      SAKURA_DIVIDER,
      `🌸 **Anonymous Mochi #${hash}** • *whispered gently on the blossom breeze* 🍃`,
    ].join("\n");

    try {
      await withRetry(() =>
        rootServer.community.channelMessages.create({
          channelId: targetChannelId,
          content: card,
        })
      );
    } catch (sendErr) {
      logger.error("Failed to post anonymous confession", sendErr);
      await ctx.reply("Failed to send confession. Please check channel permissions! (っ- ‸ - ς)");
    }
  },
};
