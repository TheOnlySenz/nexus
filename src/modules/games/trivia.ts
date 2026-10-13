import { rootServer, ChannelGuid } from "@rootsdk/server-bot";
import { XpRepository } from "../../database/repositories/xp";
import { EconomyRepository } from "../../database/repositories/economy";
import { formatUserMention, CUTE_DIVIDER, SAKURA_DIVIDER } from "../../utils/formatting";
import { withRetry } from "../../core/rate-limiter";
import { Logger } from "../../core/logger";

const logger = new Logger("TriviaModule");

export interface TriviaQuestion {
  question: string;
  options: string[]; // 4 options
  correctIndex: number; // 0-3
  explanation: string;
}

export const COZY_TRIVIA_QUESTIONS: TriviaQuestion[] = [
  {
    question: "What is traditional Japanese mochi primarily made from?",
    options: ["Glutinous mochigome rice", "Wheat flour", "Cornstarch & honey", "Sweet potato paste"],
    correctIndex: 0,
    explanation: "Mochi is pounded from steamed mochigome (glutinous short-grain japonica rice)!",
  },
  {
    question: "Which gentle flower is famous for its brief, breathtaking spring blossom in Japan?",
    options: ["Hydrangea (Ajisai)", "Cherry Blossom (Sakura)", "Lotus Flower", "Chrysanthemum"],
    correctIndex: 1,
    explanation: "Sakura (cherry blossom) blooms in spring, symbolizing renewal and the gentle fleeting beauty of life.",
  },
  {
    question: "What is the delicious green tea powder traditionally whisked in a chasen bowl called?",
    options: ["Sencha", "Genmaicha", "Matcha", "Hojicha"],
    correctIndex: 2,
    explanation: "Matcha is finely ground shade-grown green tea leaves, rich in umami and calming L-theanine!",
  },
  {
    question: "What sweet treat is made of chewy rice cake skewered on a stick, often grilled with sweet soy glaze?",
    options: ["Taiyaki", "Dorayaki", "Dango", "Anpan"],
    correctIndex: 2,
    explanation: "Dango skewers are beloved festival sweets, famous in the classic tri-color botchan dango style (🍡)!",
  },
  {
    question: "What fish-shaped Japanese waffle cake is traditionally filled with sweet red bean paste (anko)?",
    options: ["Taiyaki", "Imagawayaki", "Castella", "Monaka"],
    correctIndex: 0,
    explanation: "Taiyaki is shaped like a red sea bream (tai), symbolizing good luck and celebration!",
  },
  {
    question: "Which of the following cute animals is known for rolling up into a spiky little ball when sleepy or shy?",
    options: ["Otter", "Hedgehog", "Red Panda", "Sugar Glider"],
    correctIndex: 1,
    explanation: "Hedgehogs roll into cute round prickly spheres when tucking in for cozy naps!",
  },
  {
    question: "In Japan, what is the practice of 'shinrin-yoku' commonly translated to in English?",
    options: ["Forest bathing", "Moon gazing", "Tea meditation", "Gentle breathing"],
    correctIndex: 0,
    explanation: "Shinrin-yoku means taking in the forest atmosphere or forest bathing for calming tranquility.",
  },
  {
    question: "What is the classic sweet red bean paste used inside daifuku and dorayaki called?",
    options: ["Kinako", "Anko", "Mirin", "Shiro-miso"],
    correctIndex: 1,
    explanation: "Anko (sweet azuki bean paste) has been loved across Asia for centuries for its warm sweetness.",
  },
  {
    question: "Which warm, roasted tea is known for its toasty, nutty aroma and very low caffeine?",
    options: ["Gyokuro", "Hojicha", "Matcha", "Kukicha"],
    correctIndex: 1,
    explanation: "Hojicha is roasted in a porcelain pot over charcoal, making it deeply comforting and relaxing.",
  },
  {
    question: "What is the golden roasted soybean flour sprinkled over warabi mochi called?",
    options: ["Kinako", "Kuzu", "Yuzu", "Wasabi"],
    correctIndex: 0,
    explanation: "Kinako has a fragrant, nutty, toasted peanut-like flavor that pairs perfectly with brown sugar syrup!",
  },
];

interface ActiveTrivia {
  question: TriviaQuestion;
  channelId: string;
  communityId: string;
  startedAt: number;
  timer: NodeJS.Timeout;
}

export class TriviaModule {
  private activeQuestions = new Map<string, ActiveTrivia>(); // channelId -> trivia

  constructor(
    private readonly xpRepo: XpRepository,
    private readonly economyRepo: EconomyRepository
  ) {}

  async startTrivia(
    communityId: string,
    channelId: ChannelGuid,
    reply: (msg: string) => Promise<unknown>
  ): Promise<void> {
    if (this.activeQuestions.has(channelId)) {
      await reply("🌸 A cozy trivia question is already active in this channel! Answer with `!trivia <A/B/C/D>`! (*ˊᵕˋ*)");
      return;
    }

    const q = COZY_TRIVIA_QUESTIONS[Math.floor(Math.random() * COZY_TRIVIA_QUESTIONS.length)];
    const optionLetters = ["A", "B", "C", "D"];

    const card = [
      `🍡 **COZY TRIVIA TIME!** 🌸`,
      CUTE_DIVIDER,
      `❓ **${q.question}**`,
      "",
      ...q.options.map((opt, i) => `**[${optionLetters[i]}]** ${opt}`),
      SAKURA_DIVIDER,
      `*(｡•̀ᴗ-)✧ Type \`!trivia <A, B, C, or D>\` to answer! Winner earns **+30 XP** & **+25 Bites**!*`,
      `⏱️ *Time limit: 45 seconds*`,
    ].join("\n");

    const timer = setTimeout(async () => {
      if (this.activeQuestions.has(channelId)) {
        this.activeQuestions.delete(channelId);
        const correctLetter = optionLetters[q.correctIndex];
        const timeoutMsg = [
          `⏰ **Time's up for trivia!** (っ- ‸ - ς)`,
          CUTE_DIVIDER,
          `The correct answer was **[${correctLetter}] ${q.options[q.correctIndex]}**!`,
          `💡 *${q.explanation}*`,
          SAKURA_DIVIDER,
          `*Don't worry, type \`!trivia\` anytime for another chance! (◕ᴗ◕✿)*`,
        ].join("\n");
        try {
          await withRetry(() =>
            rootServer.community.channelMessages.create({
              channelId,
              content: timeoutMsg,
            })
          );
        } catch (e) {
          logger.warn("Could not send trivia timeout message", e);
        }
      }
    }, 45000);

    this.activeQuestions.set(channelId, {
      question: q,
      channelId,
      communityId,
      startedAt: Date.now(),
      timer,
    });

    await reply(card);
  }

  async answerTrivia(
    communityId: string,
    channelId: ChannelGuid,
    userId: string,
    userAnswer: string,
    reply: (msg: string) => Promise<unknown>
  ): Promise<boolean> {
    const active = this.activeQuestions.get(channelId);
    if (!active) {
      return false;
    }

    const cleanAns = userAnswer.trim().toUpperCase();
    const optionLetters = ["A", "B", "C", "D"];
    let selectedIndex = optionLetters.indexOf(cleanAns);

    if (selectedIndex === -1) {
      // Check if user typed full text of the option
      selectedIndex = active.question.options.findIndex(
        (opt) => opt.toLowerCase() === userAnswer.trim().toLowerCase()
      );
    }

    if (selectedIndex === -1) {
      await reply("🌸 Please answer with `!trivia A`, `!trivia B`, `!trivia C`, or `!trivia D`! (*＾▽＾)ノ");
      return true;
    }

    // Check correctness
    if (selectedIndex === active.question.correctIndex) {
      clearTimeout(active.timer);
      this.activeQuestions.delete(channelId);

      // Award XP & Economy
      await this.xpRepo.addXp(communityId, userId, 30);
      await this.economyRepo.addBalance(communityId, userId, 25);

      const userMention = formatUserMention(userId);
      const winCard = [
        `🎉 **CORRECT! YAY!** 🌸 (*ˊᗜˋ*)੭* ੈ✩‧₊˚`,
        CUTE_DIVIDER,
        `Bravo ${userMention}! That's the right answer!`,
        `✨ **[${optionLetters[selectedIndex]}] ${active.question.options[selectedIndex]}**`,
        "",
        `💡 *${active.question.explanation}*`,
        SAKURA_DIVIDER,
        `🎁 **Rewards:** **+30 XP** ✨ & **+25 Mochi Bites** 🍡`,
      ].join("\n");

      await reply(winCard);
      return true;
    } else {
      // Incorrect guess
      await reply(`(ノ_<。) Not quite, ${formatUserMention(userId)}! Think sweet thoughts and try again!`);
      return true;
    }
  }

  hasActiveTrivia(channelId: string): boolean {
    return this.activeQuestions.has(channelId);
  }
}
