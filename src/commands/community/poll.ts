import { rootServer } from "@rootsdk/server-bot";
import { Command, CommandContext } from "../../types/commands";
import { PermissionLevel } from "../../core/permissions";
import { formatUserMention, CUTE_DIVIDER, SAKURA_DIVIDER } from "../../utils/formatting";
import { withRetry } from "../../core/rate-limiter";
import { Logger } from "../../core/logger";

const logger = new Logger("PollCommand");

const POLL_EMOJIS = ["1️⃣", "2️⃣", "3️⃣", "4️⃣", "5️⃣", "6️⃣", "7️⃣", "8️⃣", "9️⃣", "🔟"];
const POLL_SHORTCODES = [
  ":one:",
  ":two:",
  ":three:",
  ":four:",
  ":five:",
  ":six:",
  ":seven:",
  ":eight:",
  ":nine:",
  ":keycap_ten:",
];

export const pollCommand: Command = {
  name: "poll",
  aliases: ["vote", "strawpoll"],
  description: "Create an interactive aesthetic voting poll with automatic emoji reaction tallies!",
  usage: '!poll "Question" "Option 1" "Option 2" ...',
  category: "community",
  permission: PermissionLevel.MEMBER,
  cooldownMs: 5000,
  execute: async (ctx: CommandContext) => {
    // Parse arguments enclosed in quotes or separated by quotes
    const regex = /"([^"]+)"|'([^']+)'|(\S+)/g;
    const matches: string[] = [];
    let match: RegExpExecArray | null;

    while ((match = regex.exec(ctx.rawArgs)) !== null) {
      matches.push(match[1] || match[2] || match[3]);
    }

    if (matches.length < 3) {
      await ctx.reply(
        `🌸 **How to create a poll:**\n` +
        `\`!poll "Question" "Option A" "Option B" ["Option C" ...]\`\n\n` +
        `*Example:* \`!poll "Best sweet snack?" "Sakura Mochi 🌸" "Strawberry Daifuku 🍓" "Matcha Parfait 🍨"\` (*ˊᵕˋ*)`
      );
      return;
    }

    const question = matches[0];
    const options = matches.slice(1, 11); // max 10 options

    const userMention = formatUserMention(ctx.authorId, ctx.authorName);

    const card = [
      `📊 ˚｡⋆୨୧˚ **COMMUNITY POLL** ˚୨୧⋆｡˚ 🌸`,
      CUTE_DIVIDER,
      `❓ **${question}**`,
      "",
      ...options.map((opt, i) => `${POLL_EMOJIS[i]} **${opt}**`),
      SAKURA_DIVIDER,
      `🌸 **Created by:** ${userMention}`,
      `🗳️ *Tap on the reactions below to cast your vote! (◕ᴗ◕✿)*`,
    ].join("\n");

    const sent = (await ctx.reply(card)) as any;

    if (sent?.id) {
      // Add reaction emojis sequentially
      for (let i = 0; i < options.length; i++) {
        try {
          await withRetry(() =>
            rootServer.community.channelMessages.reactionCreate({
              channelId: ctx.channelId,
              messageId: sent.id,
              shortcode: POLL_SHORTCODES[i],
            })
          );
        } catch (rErr) {
          logger.warn(`Could not add reaction ${POLL_SHORTCODES[i]} to poll`, { rErr });
        }
      }
    }
  },
};
