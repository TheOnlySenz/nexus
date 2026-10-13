# NEXUS: Production-Quality Community Bot for RootApp

![RootApp Native](https://img.shields.io/badge/Platform-RootApp-blue.svg)
![TypeScript](https://img.shields.io/badge/Language-TypeScript%205-blue.svg)
![Runtime](https://img.shields.io/badge/Node.js-%3E%3D22.0.0-green.svg)
![Tests](https://img.shields.io/badge/Tests-25%20Passing-brightgreen.svg)
![License](https://img.shields.io/badge/License-MIT-purple.svg)

**NEXUS** is a modular, all-in-one community management and engagement bot engineered from the ground up specifically for **RootApp** (`@rootsdk/server-bot`). It features persistent state, rate-limit-aware execution, hierarchical permissions, automoderation, progressive leveling, giveaways with cloud job scheduling, and a virtual economy foundation.

NEXUS does **not** rely on Discord.js or fake compatibility shims. Every event, message, role modification, and persistent store uses verified RootApp platform APIs.

---

## 🌟 Key Features

| Feature | Description |
| :--- | :--- |
| 🛡️ **Moderation & Logs** | Formal warning system (`!warn`, `!warnings`, `!clearwarnings`), kicks (`!kick`), permanent/timed bans (`!ban`), rate-limited batch message cleanup (`!purge`), and dedicated `#mod-log` channel dispatches. |
| 🤖 **Automod Engine** | Deterministic message flood and spam protection, excessive character repetition filtering, and configurable blocked link/keyword filtering. |
| 👋 **Welcome & Auto-Role** | Automated new-member detection via `community.joined`, custom formatted welcome greetings with member counts, and automatic introductory role assignment. |
| 📈 **Leveling & XP** | Message XP engine with anti-spam cooldowns, mathematical level progression curves (`Level = floor((XP/100)^(1/1.5))`), role unlock rewards, user profile cards (`!rank`), and SQLite-indexed leaderboards (`!leaderboard`). |
| 🏆 **Achievements** | Modular achievement engine tracking first messages, reaction milestones, leveling milestones, and activity badges with bonus XP rewards. |
| 🎭 **Reaction Roles** | Interactive reaction-to-role bindings (`!reactionrole`) mapped to message reaction creation and deletion events. |
| 🎉 **Giveaways & Cloud Scheduler**| Cloud-scheduled giveaways (`!giveaway create 24h 1 Nitro`) powered by Root's `JobScheduler`. Automatically handles restart survival and overdue reconciliation. |
| 💰 **Virtual Economy** | Atomic credit transactions, user wallet balances (`!balance`), daily claims (`!daily`) with 24-hour database cooldowns, and peer-to-peer transfers (`!transfer`). |
| 📊 **Community Analytics** | Aggregated weekly traffic reports tracking messages sent, commands executed, moderation interventions, and member growth (`!stats`). |
| ⚙️ **Administration & Settings** | Centralized community settings via both Root's manifest `roleOrMember` GUI and the in-chat `!settings` command suite. Zero hardcoded community IDs. |

---

## 🏗️ Architecture & Philosophy

```
ROOT COMMUNITY  ──►  ROOT EVENTS / GATEWAY
                            │
                            ▼
                     ┌──────────────┐
                     │  NEXUS CORE  │
                     └──────┬───────┘
         ┌──────────────────┼──────────────────┐
         ▼                  ▼                  ▼
    MODERATION           LEVELING          AUTOMATION
         │                  │                  │
    ┌────┴────┐        ┌────┴────┐        ┌────┴────┐
    ▼         ▼        ▼         ▼        ▼         ▼
 AUTOMOD    LOGS     ROLES   ACHIEVEMENTS GIVEAWAYS ECONOMY
         │                  │                  │
         └──────────────────┼──────────────────┘
                            ▼
                    SQLITE PERSISTENCE
                 (WAL Mode, Foreign Keys)
                            │
                            ▼
            [FUTURE: Root App Admin Dashboard]
```

- **Root-Native:** Built on `@rootsdk/server-bot@0.21.3`. All user mentions use Root Markdown links (`[@Name](root://user/{id})`).
- **Decoupled Domain Logic:** All business logic lives in `src/modules/` without command or chat string dependencies, allowing a future **Root App** GUI dashboard to directly call the same functions.
- **Rate-Limit Aware:** Sequential bulk actions (like message purges) use loop pacing (`pace(250)`) to maintain execution under 4 req/s (safely below Root's ~5 req/s mutation threshold). Transient errors are handled with exponential backoff and jitter (`withRetry`).
- **Restart Resilient:** Relational data is persisted to SQLite (`rootServer.dataStore.config.sqlite3.filename`) with WAL mode and foreign key integrity.

---

## 📁 Project Structure

```
nexus/
├── root-manifest.json            # Root bot manifest, permissions & settings
├── package.json                  # Node.js dependencies, scripts & engines
├── tsconfig.json                 # TypeScript ES2020 compilation configuration
├── vitest.config.mjs             # Vitest test environment configuration
├── src/
│   ├── main.ts                   # Application entrypoint & Root lifecycle bootstrap
│   ├── core/
│   │   ├── bot.ts                # Central NexusBot orchestrator
│   │   ├── command-router.ts     # Command prefix parser & permission dispatcher
│   │   ├── event-router.ts       # Root SDK event subscription router
│   │   ├── permissions.ts        # Role hierarchy & permission evaluation
│   │   ├── rate-limiter.ts       # Exponential backoff retry & loop pacing
│   │   ├── logger.ts             # Redacting structured logger
│   │   └── errors.ts             # Standardized domain error classes
│   ├── config/
│   │   └── defaults.ts           # Community setting defaults & constants
│   ├── database/
│   │   ├── db.ts                 # SQLite connection manager & query helpers
│   │   ├── schema.ts             # Relational SQL DDL migrations
│   │   └── repositories/         # Typed data access layer (settings, xp, warnings...)
│   ├── modules/
│   │   ├── moderation/           # Disciplinary actions, warnings & automod
│   │   ├── welcome/              # Join events, welcome messages & auto-roles
│   │   ├── leveling/             # XP distribution, level curves & role rewards
│   │   ├── achievements/         # Milestone badges & rewards
│   │   ├── roles/                # Reaction role listener bindings
│   │   ├── giveaways/            # JobScheduler giveaway manager & reconciliation
│   │   ├── economy/              # Atomic credits, daily claims & transfers
│   │   └── analytics/            # Daily & weekly metrics aggregators
│   ├── commands/                 # 20 modular chat commands
│   ├── types/                    # Domain TypeScript type definitions
│   └── utils/                    # Root URI formatting, time parsing & regexes
├── tests/                        # Vitest automated test suites (25 tests)
└── docs/                         # In-depth architectural & capability documentation
    ├── ROOT_CAPABILITIES.md      # RootApp capability verification audit
    ├── ARCHITECTURE.md           # System design & module interaction specs
    ├── COMMANDS.md               # Complete command reference guide
    ├── CONFIGURATION.md          # Manifest & in-bot configuration guide
    ├── DATABASE.md               # SQLite schema, indexes & entity relationships
    ├── DEVELOPMENT.md            # Local development & Dev Host workflows
    ├── TESTING.md                # Test execution guide & manual test checklist
    └── KNOWN_LIMITATIONS.md      # Platform constraints & implemented mitigations
```

---

## 🚀 Getting Started

### 1. Prerequisites
- **Node.js**: >= 22.0.0
- **NPM**: >= 10.0.0
- A registered bot container on the [Root Developer Portal](https://developer.rootapp.com/)

### 2. Installation
```bash
git clone <repo-url> nexus
cd nexus
npm install
```

### 3. Local Development Configuration
Edit `.env` in the project root:
```ini
DEV_TOKEN=your_development_token_here
```

### 4. Build & Test
```bash
# Compile TypeScript to dist/
npm run build

# Run Vitest test suite (25 tests)
npm test
```

### 5. Start with Root Dev Host
```bash
npm run bot
```
The Dev Host connects your local code to your development community on RootApp in real time.

---

## 📖 Command Reference Summary

| Category | Commands |
| :--- | :--- |
| **Community** | `!help`, `!ping`, `!server`, `!user` |
| **Moderation** | `!warn`, `!warnings`, `!clearwarnings`, `!kick`, `!ban`, `!purge` |
| **Leveling** | `!rank`, `!leaderboard`, `!rewards`, `!rewards add/remove` |
| **Roles** | `!reactionrole`, `!reactionrole list`, `!reactionrole delete` |
| **Automation** | `!giveaway create`, `!giveaway enter` |
| **Economy** | `!balance`, `!daily`, `!transfer` |
| **Analytics** | `!stats` |
| **Admin** | `!settings`, `!settings set <key> <value>` |

*See [docs/COMMANDS.md](file:///Users/saadbashar/.gemini/antigravity-ide/scratch/nexus/docs/COMMANDS.md) for full argument and usage details.*

---

## 📚 Complete Documentation Suite

- 📘 [Root Capabilities Audit](file:///Users/saadbashar/.gemini/antigravity-ide/scratch/nexus/docs/ROOT_CAPABILITIES.md)
- 🏛️ [Architecture & System Design](file:///Users/saadbashar/.gemini/antigravity-ide/scratch/nexus/docs/ARCHITECTURE.md)
- 📜 [Command Reference](file:///Users/saadbashar/.gemini/antigravity-ide/scratch/nexus/docs/COMMANDS.md)
- ⚙️ [Configuration Guide](file:///Users/saadbashar/.gemini/antigravity-ide/scratch/nexus/docs/CONFIGURATION.md)
- 🗄️ [Database Architecture](file:///Users/saadbashar/.gemini/antigravity-ide/scratch/nexus/docs/DATABASE.md)
- 💻 [Developer Guide](file:///Users/saadbashar/.gemini/antigravity-ide/scratch/nexus/docs/DEVELOPMENT.md)
- 🧪 [Testing & Verification Checklist](file:///Users/saadbashar/.gemini/antigravity-ide/scratch/nexus/docs/TESTING.md)
- ⚠️ [Known Limitations & Mitigations](file:///Users/saadbashar/.gemini/antigravity-ide/scratch/nexus/docs/KNOWN_LIMITATIONS.md)

---

## 📦 Publishing to Root Store

1. Ensure all tests pass: `npm test`
2. Build TypeScript distribution: `npm run build`
3. Increment version in `package.json` and `root-manifest.json`
4. Build the production package file (`.pkg`):
   ```bash
   rootsdk build package
   ```
   *(Note: Build package in a Linux or Windows environment due to vendor `@rootsdk/dev-tools` binary packaging on macOS ARM64; see [docs/KNOWN_LIMITATIONS.md](file:///Users/saadbashar/.gemini/antigravity-ide/scratch/nexus/docs/KNOWN_LIMITATIONS.md)).*
5. Upload package to the Root Developer Portal:
   ```bash
   npx rootsdk upload package --file ./dist/nexus-1-0-0.pkg --authToken $PRODUCTION_TOKEN
   ```
