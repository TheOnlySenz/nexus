import { Command, CommandContext } from "../types/commands";
import { CooldownManager } from "./rate-limiter";
import { PermissionLevel } from "./permissions";
import { Logger } from "./logger";
import { formatErrorMessage, PermissionDeniedError, CooldownActiveError } from "./errors";

const logger = new Logger("CommandRouter");

export class CommandRouter {
  private commands: Map<string, Command> = new Map();
  private aliases: Map<string, string> = new Map();
  private cooldowns: CooldownManager = new CooldownManager();

  register(command: Command): void {
    const name = command.name.toLowerCase();
    if (this.commands.has(name)) {
      logger.warn(`Overwriting previously registered command: ${name}`);
    }

    this.commands.set(name, command);

    if (command.aliases) {
      for (const alias of command.aliases) {
        this.aliases.set(alias.toLowerCase(), name);
      }
    }

    logger.debug(`Registered command: !${name}`);
  }

  getCommand(nameOrAlias: string): Command | undefined {
    const key = nameOrAlias.toLowerCase();
    const commandName = this.aliases.get(key) || key;
    return this.commands.get(commandName);
  }

  getAllCommands(): Command[] {
    return Array.from(this.commands.values());
  }

  getCommandsByCategory(category: Command["category"]): Command[] {
    return this.getAllCommands().filter((c) => c.category === category);
  }

  async execute(ctx: CommandContext, commandName: string): Promise<boolean> {
    const command = this.getCommand(commandName);
    if (!command) {
      return false;
    }

    // 1. Permission check
    if (ctx.permissionLevel < command.permission) {
      const requiredName = PermissionLevel[command.permission];
      logger.warn(`Permission denied: user ${ctx.authorId} tried to run !${command.name}`, {
        userLevel: PermissionLevel[ctx.permissionLevel],
        requiredLevel: requiredName,
      });

      await ctx.replyError(
        `⛔ You do not have permission to use \`${ctx.prefix}${command.name}\`. Requires **${requiredName}** or higher.`
      );
      return true;
    }

    // 2. Cooldown check
    if (command.cooldownMs && command.cooldownMs > 0) {
      const cooldownKey = `${ctx.authorId}:${command.name}`;
      const { onCooldown, remainingMs } = this.cooldowns.check(cooldownKey, command.cooldownMs, true);

      if (onCooldown) {
        const remainingSeconds = Math.ceil(remainingMs / 1000);
        await ctx.replyError(
          `⏳ Please wait **${remainingSeconds}s** before using \`${ctx.prefix}${command.name}\` again.`
        );
        return true;
      }
    }

    // 3. Execution with centralized error handling
    try {
      logger.info(`Executing command !${command.name} by user ${ctx.authorId}`, {
        channelId: ctx.channelId,
        args: ctx.args,
      });

      await command.execute(ctx);
      return true;
    } catch (err: unknown) {
      logger.error(`Error executing command !${command.name}`, err, {
        authorId: ctx.authorId,
        channelId: ctx.channelId,
      });

      const message = formatErrorMessage(err);
      await ctx.replyError(message);
      return true;
    }
  }
}
