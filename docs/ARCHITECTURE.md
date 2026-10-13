# NEXUS Architecture & System Design

## 1. High-Level Architectural Overview

NEXUS is built exclusively for the **RootApp** platform (`@rootsdk/server-bot`). It avoids Discord.js abstractions and implements Root-native event-driven lifecycle management, granular permission evaluation, SQLite persistence, rate-limited execution, and scheduled task reconciliation.

```
                            ROOT COMMUNITY PLATFORM
                                       │
                                       ▼
                       Root Bot Gateway / Lifecycle Event
                                       │
                                       ▼
                     ┌───────────────────────────────────┐
                     │            NEXUS CORE             │
                     │  (Lifecycle, RateLimiter, Logger) │
                     └─────────────────┬─────────────────┘
                                       │
               ┌───────────────────────┼───────────────────────┐
               ▼                       ▼                       ▼
      ┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
      │  Event Router   │     │ Permission Mgr  │     │ Command Router  │
      │ (Messages/Roles/│     │ (Owner, Admin,  │     │ (Prefix routing,│
      │  Scheduler)     │     │  Mod, Member)   │     │  cooldowns)     │
      └────────┬────────┘     └────────┬────────┘     └────────┬────────┘
               │                       │                       │
               └───────────────────────┼───────────────────────┘
                                       │
                                       ▼
                     ┌───────────────────────────────────┐
                     │          FEATURE MODULES          │
                     │ ┌───────────────┬───────────────┐ │
                     │ │  Moderation   │    Automod    │ │
                     │ ├───────────────┼───────────────┤ │
                     │ │    Welcome    │   Leveling    │ │
                     │ ├───────────────┼───────────────┤ │
                     │ │Reaction Roles │   Giveaways   │ │
                     │ ├───────────────┼───────────────┤ │
                     │ │Virtual Economy│   Analytics   │ │
                     │ └───────────────┴───────────────┘ │
                     └─────────────────┬─────────────────┘
                                       │
                                       ▼
                     ┌───────────────────────────────────┐
                     │         DATA ACCESS LAYER         │
                     │ (Repositories: Settings, Warnings,│
                     │  XP, Giveaways, Economy, etc.)    │
                     └─────────────────┬─────────────────┘
                                       │
                                       ▼
                     ┌───────────────────────────────────┐
                     │         SQLITE PERSISTENCE        │
                     │ (WAL Mode, Foreign Keys, Indexes) │
                     └───────────────────────────────────┘
```

---

## 2. Decoupling & Future Root App Compatibility

A core design requirement is that **NEXUS business logic is decoupled from commands and message events**. 

Every module exposes pure TypeScript domain methods:
- `LevelingModule.processMessageXp(communityId, userId, channelId)`
- `EconomyModule.transfer(communityId, fromUserId, toUserId, amount)`
- `ModerationModule.warnUser(communityId, targetUserId, moderatorId, reason)`
- `GiveawaysModule.createGiveaway(communityId, channelId, prize, winnerCount, durationMs, creatorId)`

None of these business methods rely on `CommandContext` or raw chat strings. When a future **Root App** (interactive client GUI) is built to serve as the admin dashboard, it can invoke these exact module methods directly through the shared database and repository layer without refactoring.

---

## 3. Core Subsystems

### 3.1 Lifecycle & Startup (`src/core/bot.ts`, `src/main.ts`)
The bot initializes within `rootServer.lifecycle.start(onStarting, onStopping)`:
1. Opens the SQLite database connection (`rootServer.dataStore.config.sqlite3.filename` or local `./nexus.db`).
2. Applies schema migrations idempotently (`PRAGMA journal_mode = WAL`, `PRAGMA foreign_keys = ON`).
3. Instantiates data repositories and injects them into domain modules.
4. Primes the `PermissionManager` with community roles from `RootBotStartState.communityRoles`.
5. Registers all commands with `CommandRouter`.
6. Subscribes `EventRouter` to Root SDK events.
7. Reconciles overdue scheduled jobs (e.g., active giveaways whose deadline passed during a bot restart or network outage).

### 3.2 Command Routing (`src/core/command-router.ts`)
- Configurable community prefix (default `!`).
- Normalizes command names and aliases.
- Pre-execution permission verification against `PermissionLevel`.
- Per-user and per-command cooldown enforcement via `CooldownManager`.
- Structured error handling: syntax errors, permission rejections, and cooldown notices.

### 3.3 Event Routing (`src/core/event-router.ts`)
Listens to events from Root SDK clients:
- `channelMessages.on("channelMessage.created")`: Routes to automod filter, analytics counters, command handler, or leveling XP engine.
- `channelMessages.on("channelMessage.reactionCreated")` / `reactionDeleted`: Routes to `ReactionRolesModule` and first-reaction achievement checks.
- `communities.on("community.joined")`: Triggers `WelcomeModule` (custom greetings, auto-roles, join analytics).
- `communityRoles.on("communityRole.created" / "edited" / "deleted")`: Dynamically updates `PermissionManager` role caches.
- `jobScheduler.on("job" / "job.missed")`: Triggers scheduled giveaway completions and recurring tasks.

### 3.4 Rate Limiting & Backoff (`src/core/rate-limiter.ts`)
Root enforces rate limits (~5 req/s for mutation commands, ~20 req/s for read queries). NEXUS protects against rate limit violations through:
1. **Loop Pacing (`pace(250)`):** Sequential operations (such as bulk message deletion during `!purge`) pause 250ms between API calls, keeping request volume strictly below 4 req/s.
2. **Exponential Backoff with Full Jitter (`withRetry`):** Automatically retries transient failures (`TooManyRequests`, `ServerError`, `Timeout`, `StillProcessing`) with randomized backoff (`baseDelayMs * 2^attempt`).
3. **In-Memory Cooldowns (`CooldownManager`):** Protects commands from user spam and bounds memory usage via periodic sweeps.

### 3.5 Permissions & Hierarchy (`src/core/permissions.ts`)
Four distinct permission tiers:
- `MEMBER (0)`: Basic community commands (`!ping`, `!rank`, `!leaderboard`, `!balance`, `!daily`, `!help`).
- `MODERATOR (1)`: Disciplinary actions (`!warn`, `!warnings`, `!clearwarnings`, `!kick`, `!purge`).
- `ADMIN (2)`: Destructive or administrative operations (`!ban`, `!settings`, `!reactionrole`, `!giveaway`).
- `OWNER (3)`: Full authority over the community instance.

Permissions are dynamically resolved from:
1. Community ownership ID (`isOwner` / `ownerId`).
2. Global manifest setting group (`nexus_admin.moderators.isMember`).
3. Normalized community role names (`Administrator`, `Admin`, `Manager`, `Moderator`, `Mod`, `Staff`).

### 3.6 Structured Logging (`src/core/logger.ts`)
- Standardized log levels: `DEBUG`, `INFO`, `WARN`, `ERROR`.
- Automatic redaction of secrets, authentication tokens, and private URIs.
- Formatted output compatible with developer logs in the Root Developer Portal.
