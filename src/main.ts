import { rootServer, RootBotStartState } from "@rootsdk/server-bot";
import { NexusBot } from "./core/bot";
import { Logger } from "./core/logger";

const logger = new Logger("Main");
const bot = new NexusBot();

async function onStarting(state: RootBotStartState): Promise<void> {
  try {
    await bot.start(state);
  } catch (err) {
    logger.error("Fatal error during NEXUS bot startup", err);
    throw err;
  }
}

async function onStopping(): Promise<void> {
  try {
    await bot.stop();
  } catch (err) {
    logger.error("Error during NEXUS bot shutdown", err);
  }
}

(async () => {
  try {
    await rootServer.lifecycle.start(onStarting, onStopping);
  } catch (err) {
    logger.error("Failed to start Root server lifecycle", err);
    process.exit(1);
  }
})();
