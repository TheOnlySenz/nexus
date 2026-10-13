# NEXUS Command Reference

All commands use the configurable community prefix (default `!`). Mentioning users, channels, or roles in commands supports either standard Root mentions (`[@Name](root://user/{id})`, `[#channel](root://channel/{id})`, `[@Role](root://role/{id})`) or raw GUID strings.

---

## 1. Community Commands

| Command | Usage | Permission | Cooldown | Description |
| :--- | :--- | :--- | :--- | :--- |
| `!help` | `!help [command]` | `MEMBER` | 2s | Displays categorized command overview or detailed instructions for a specific command. |
| `!ping` | `!ping` | `MEMBER` | 5s | Verifies bot connectivity, roundtrip response time, and current uptime. |
| `!server` | `!server` | `MEMBER` | 10s | Displays community information: member counts, text channels, roles, and prefix. |
| `!user` | `!user [@user]` | `MEMBER` | 5s | Shows account details for yourself or a target member (join date, roles, status). |

---

## 2. Moderation Commands

| Command | Usage | Permission | Cooldown | Description |
| :--- | :--- | :--- | :--- | :--- |
| `!warn` | `!warn <@user> <reason>` | `MODERATOR` | 2s | Issues a formal warning to a member, increments their warning count, and logs to SQLite and `#mod-log`. |
| `!warnings` | `!warnings <@user>` | `MODERATOR` | 3s | Displays recent warnings recorded against a member, including timestamps and moderator names. |
| `!clearwarnings` | `!clearwarnings <@user>` | `MODERATOR` | 5s | Clears all recorded warnings for the specified member and dispatches a log entry. |
| `!kick` | `!kick <@user> [reason]` | `MODERATOR` | 5s | Removes a member from the community via Root `communityMembers.kick()`. |
| `!ban` | `!ban <@user> [duration] [reason]` | `ADMIN` | 5s | Permanently or temporarily bans a user via Root `communityBans.create()`. Accepts durations like `24h` or `7d`. |
| `!purge` | `!purge <count>` | `MODERATOR` | 10s | Deletes up to 50 recent messages in the current channel using rate-limit-paced sequential deletions. |

---

## 3. Leveling & Engagement Commands

| Command | Usage | Permission | Cooldown | Description |
| :--- | :--- | :--- | :--- | :--- |
| `!rank` | `!rank [@user]` | `MEMBER` | 5s | Displays XP rank, current level, progress toward next level, message counts, and unlocked achievements. |
| `!leaderboard` | `!leaderboard [limit]` | `MEMBER` | 10s | Shows the community top 10 XP leaderboard ranked by level and accumulated XP. |
| `!rewards` | `!rewards` | `MEMBER` | 5s | Lists automated role rewards configured for reaching milestone levels. |
| `!rewards add` | `!rewards add <level> <@role>` | `ADMIN` | 3s | Configures an automatic role reward unlocked upon reaching the designated level. |
| `!rewards remove`| `!rewards remove <level>` | `ADMIN` | 3s | Removes an existing level role reward configuration. |

---

## 4. Role Automation Commands

| Command | Usage | Permission | Cooldown | Description |
| :--- | :--- | :--- | :--- | :--- |
| `!reactionrole` | `!reactionrole <msgId> <emoji> <@role>` | `ADMIN` | 3s | Creates an interactive reaction-role binding. Reacting with the emoji grants the role; removing it revokes the role. |
| `!reactionrole list` | `!reactionrole list` | `ADMIN` | 5s | Lists all active reaction role bindings configured in the community. |
| `!reactionrole delete` | `!reactionrole delete <id>` | `ADMIN` | 3s | Deletes a reaction role configuration by its ID. |

---

## 5. Giveaways & Automation Commands

| Command | Usage | Permission | Cooldown | Description |
| :--- | :--- | :--- | :--- | :--- |
| `!giveaway create`| `!giveaway create <duration> <winners> <prize>` | `ADMIN` | 5s | Launches a community giveaway with Root cloud JobScheduler integration. Example: `!giveaway create 24h 1 Nitro Boost`. |
| `!giveaway enter` | `!giveaway enter <giveawayId>` | `MEMBER` | 2s | Enters an active giveaway (members can also enter by reacting with 🎉 to the announcement). |

---

## 6. Virtual Economy Commands

| Command | Usage | Permission | Cooldown | Description |
| :--- | :--- | :--- | :--- | :--- |
| `!balance` | `!balance [@user]` | `MEMBER` | 3s | Checks current virtual currency wallet balance. |
| `!daily` | `!daily` | `MEMBER` | 5s | Claims the daily credit reward (24-hour cooldown enforced at the database level). |
| `!transfer` | `!transfer <@user> <amount>` | `MEMBER` | 5s | Atomically transfers credits to another community member with balance and integer validation. |

---

## 7. Analytics Commands

| Command | Usage | Permission | Cooldown | Description |
| :--- | :--- | :--- | :--- | :--- |
| `!stats` | `!stats` | `MEMBER` | 10s | Displays aggregated weekly statistics: total messages, commands executed, moderation actions, and new members. |

---

## 8. Administration & Configuration Commands

| Command | Usage | Permission | Cooldown | Description |
| :--- | :--- | :--- | :--- | :--- |
| `!settings` | `!settings` | `ADMIN` | 5s | Displays the current community configuration summary. |
| `!settings set` | `!settings set <key> <value>` | `ADMIN` | 3s | Updates a setting key (e.g. `!settings set prefix ?`, `!settings set welcome on`, `!settings set welcome_channel #welcome`). |
