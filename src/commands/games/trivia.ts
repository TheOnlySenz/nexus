import { Command, CommandContext } from "../../types/commands";
import { PermissionLevel } from "../../core/permissions";
import { TriviaModule } from "../../modules/games/trivia";

export const triviaCommand: Command = {
  name: "trivia",
  aliases: ["quiz", "cozytrivia"],
  description: "Play cozy trivia to earn bonus XP and Mochi Bites!",
  usage: "!trivia [A/B/C/D]",
  category: "games",
  permission: PermissionLevel.MEMBER,
  cooldownMs: 2000,
  execute: async (ctx: CommandContext) => {
    const triviaModule = ctx.services.triviaModule as TriviaModule;
    const communityId = ctx.message.communityId || "default";

    if (triviaModule.hasActiveTrivia(ctx.channelId)) {
      if (!ctx.args[0]) {
        await ctx.reply("🌸 There is an active question in this channel! Answer with `!trivia <A, B, C, or D>`! (*ˊᵕˋ*)");
        return;
      }

      await triviaModule.answerTrivia(
        communityId,
        ctx.channelId,
        ctx.authorId,
        ctx.rawArgs,
        ctx.reply
      );
      return;
    }

    // No active question, start one!
    await triviaModule.startTrivia(communityId, ctx.channelId, ctx.reply);
  },
};
