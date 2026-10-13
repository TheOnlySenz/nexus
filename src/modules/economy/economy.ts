import { EconomyRepository } from "../../database/repositories/economy";
import { SettingsRepository } from "../../database/repositories/settings";
import { AchievementsModule } from "../achievements/achievements";
import { formatUserMention } from "../../utils/formatting";
import { ChannelGuid } from "../../types/common";
import { NexusError } from "../../core/errors";

export class EconomyModule {
  constructor(
    private readonly economyRepo: EconomyRepository,
    private readonly settingsRepo: SettingsRepository,
    private readonly achievementsModule: AchievementsModule
  ) {}

  async getBalance(communityId: string, userId: string): Promise<number> {
    return this.economyRepo.getBalance(communityId, userId);
  }

  async claimDaily(
    communityId: string,
    userId: string,
    channelId?: ChannelGuid
  ): Promise<{ success: boolean; balance: number; gained: number; remainingTimeText?: string }> {
    const settings = await this.settingsRepo.getSettings(communityId);
    if (!settings.economyEnabled) {
      throw new NexusError("The community economy system is currently disabled.");
    }

    const reward = settings.dailyRewardAmount;
    const res = await this.economyRepo.claimDaily(communityId, userId, reward);

    if (res.success) {
      // Check first daily claim achievement
      await this.achievementsModule.checkAndUnlock(communityId, userId, "DAILY_CLAIM", channelId);

      return {
        success: true,
        balance: res.newBalance,
        gained: reward,
      };
    }

    const hours = Math.floor(res.nextClaimMs / (1000 * 60 * 60));
    const minutes = Math.floor((res.nextClaimMs % (1000 * 60 * 60)) / (1000 * 60));

    return {
      success: false,
      balance: res.newBalance,
      gained: 0,
      remainingTimeText: `${hours}h ${minutes}m`,
    };
  }

  async transfer(
    communityId: string,
    fromUserId: string,
    toUserId: string,
    amount: number
  ): Promise<{ newSenderBalance: number; newRecipientBalance: number }> {
    const settings = await this.settingsRepo.getSettings(communityId);
    if (!settings.economyEnabled) {
      throw new NexusError("The community economy system is currently disabled.");
    }

    if (amount <= 0 || !Number.isInteger(amount)) {
      throw new NexusError("Transfer amount must be a positive whole integer.");
    }

    if (fromUserId === toUserId) {
      throw new NexusError("You cannot transfer credits to yourself.");
    }

    // Atomic deduction and credit
    const newSenderBalance = await this.economyRepo.deductBalance(communityId, fromUserId, amount);
    const newRecipientBalance = await this.economyRepo.addBalance(communityId, toUserId, amount);

    return { newSenderBalance, newRecipientBalance };
  }
}
