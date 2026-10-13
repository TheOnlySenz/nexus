import { Command, CommandContext } from "../../types/commands";
import { PermissionLevel } from "../../core/permissions";
import { parseDuration, formatDuration } from "../../utils/time";
import { GiveawaysModule } from "../../modules/giveaways/giveaways";
import { GiveawaysRepository } from "../../database/repositories/giveaways";
import { CommandSyntaxError } from "../../core/errors";
import { CUTE_DIVIDER, SAKURA_DIVIDER } from "../../utils/formatting";

export const giveawayCommand: Command = {
  name: "giveaway",
  aliases: ["gstart", "giveaways", "raffle"],
  description: "Create, enter, and manage scheduled community giveaways.",
  usage: "!giveaway [create <time: 24h> <winners> <prize> | enter <id> | list | end <id>]",
  category: "automation",
  permission: PermissionLevel.MEMBER,
  cooldownMs: 3000,
  execute: async (ctx: CommandContext) => {
    const giveawayModule = ctx.services.giveawaysModule as GiveawaysModule;
    const giveawaysRepo = ctx.services.giveawaysRepo as GiveawaysRepository;
    const communityId = ctx.message.communityId || "default";

    const subCommand = ctx.args[0]?.toLowerCase();

    // 1. Create giveaway
    if (subCommand === "create") {
      if (ctx.permissionLevel < PermissionLevel.MODERATOR) {
        await ctx.replyError("Only moderators and administrators can create giveaways.");
        return;
      }

      const durationArg = ctx.args[1];
      const winnersArg = parseInt(ctx.args[2], 10);
      const prize = ctx.args.slice(3).join(" ");

      if (!durationArg || isNaN(winnersArg) || winnersArg < 1 || !prize) {
        throw new CommandSyntaxError(
          "Usage: `!giveaway create <time: e.g. 1h, 24h> <winners: 1-10> <prize>`"
        );
      }

      const durationMs = parseDuration(durationArg);
      if (!durationMs || durationMs < 10000) {
        await ctx.replyError("Invalid duration. Provide a duration such as `10m`, `2h`, or `24h`.");
        return;
      }

      const { giveawayId } = await giveawayModule.createGiveaway(
        communityId,
        ctx.channelId,
        prize,
        winnersArg,
        durationMs,
        ctx.authorId
      );

      await ctx.reply(`🎁 **YAY! Giveaway launched with love!** 🌸 (ID: \`${giveawayId}\`)`);
      return;
    }

    // 2. Enter giveaway
    if (subCommand === "enter") {
      const giveawayId = ctx.args[1];
      if (!giveawayId) {
        throw new CommandSyntaxError("Usage: `!giveaway enter <giveawayId>`");
      }

      const entered = await giveawayModule.enterGiveaway(giveawayId, ctx.authorId);
      if (!entered) {
        await ctx.replyError("Could not enter giveaway. It may be concluded or you have already entered.");
        return;
      }

      await ctx.reply(`🎟️ **Entry received!** Best of luck, sweet friend! (✿◠‿◠) (ID: \`${giveawayId}\`)`);
      return;
    }

    // 3. Conclude / End giveaway early
    if (subCommand === "end") {
      if (ctx.permissionLevel < PermissionLevel.MODERATOR) {
        await ctx.replyError("Only moderators and administrators can end giveaways.");
        return;
      }

      const giveawayId = ctx.args[1];
      if (!giveawayId) {
        throw new CommandSyntaxError("Usage: `!giveaway end <giveawayId>`");
      }

      await giveawayModule.concludeGiveaway(giveawayId);
      return;
    }

    // 4. List active giveaways
    const active = await giveawaysRepo.getActive(communityId);
    if (active.length === 0) {
      await ctx.reply("🎁 No active giveaways right now! Check back soon for sweet surprises! 🍡");
      return;
    }

    const rows = active.map((g) => {
      const remainingMs = Math.max(0, new Date(g.ends_at).getTime() - Date.now());
      const remainingStr = formatDuration(remainingMs);
      return `• **ID:** \`${g.id}\` | **Prize:** ${g.prize} | **Winners:** ${g.winner_count} | **Ends in:** ${remainingStr}`;
    });

    await ctx.reply(
      `🎁 **COZY COMMUNITY GIVEAWAYS** 🎁\n${CUTE_DIVIDER}\n${rows.join("\n")}\n${SAKURA_DIVIDER}\nUse \`!giveaway enter <id>\` to participate!`
    );
  },
};

