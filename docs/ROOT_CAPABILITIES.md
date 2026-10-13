# RootApp Platform Capabilities Map for NEXUS

**Document Status:** Verified against Official RootApp Documentation (`docs.rootapp.com`) and `@rootsdk/server-bot` (v0.21.3).  
**Target Platform:** RootApp Bot Runtime (`@rootsdk/server-bot`)  
**Node Engine:** `>= 22`  

---

## 1. Executive Summary

This capability map defines the platform capabilities provided by RootApp for server-side bots. It serves as the single source of truth for NEXUS engineering decisions to guarantee 100% Root-native implementation without false assumptions from other platforms (such as Discord.js).

Every capability is classified into one of four verified tiers:
- **SUPPORTED**: Direct API or event available in Root SDK.
- **PARTIALLY SUPPORTED**: Available with documented platform constraints, UI limitations, or alternative workflows.
- **NOT SUPPORTED**: Does not exist in Root for bots. Architectural alternatives are documented.
- **UNKNOWN / NEEDS VERIFICATION**: Pending additional platform validation.

---

## 2. Capabilities Matrix

| Area | Capability | Status | Root SDK Mechanism | Notes / Architectural Impact |
| :--- | :--- | :--- | :--- | :--- |
| **Messaging** | Message Creation | **SUPPORTED** | `rootServer.community.channelMessages.create({ channelId, content, ... })` | Markdown format, standard mentions format `[@User](root://user/{id})`. |
| **Messaging** | Message Editing | **SUPPORTED** | `rootServer.community.channelMessages.edit({ id, channelId, content })` | Edit bot's own messages. |
| **Messaging** | Message Deletion | **SUPPORTED** | `rootServer.community.channelMessages.delete({ id, channelId })` | Requires `deleteMessageOther` channel permission to delete other users' messages. |
| **Messaging** | Message History | **SUPPORTED** | `rootServer.community.channelMessages.list({ channelId, timestamp, direction, take })` | Timestamp-based pagination (`Older`, `Newer`, `Both`). |
| **Messaging** | Message Pins | **SUPPORTED** | `channelMessages.pinCreate()`, `pinDelete()`, `pinList()` | Requires `managePinnedMessages` channel permission. |
| **Messaging** | Message Flagging | **SUPPORTED** | `channelMessages.flag({ id, channelId, contentFlagReason })` | Reports to Root moderation team (Spam, Harassment, etc.). |
| **Messaging** | Typing Indicators | **SUPPORTED** | `channelMessages.setTypingIndicator({ channelId, isTyping })` | Ephemeral typing status. |
| **Messaging** | Reactions (Create/Delete) | **SUPPORTED** | `channelMessages.reactionCreate()`, `reactionDelete()`, `reactionDeleteFull()` | Use shortcode strings (e.g. `:thumbsup:`). |
| **Events** | Message Created Event | **SUPPORTED** | `ChannelMessageEvent.ChannelMessageCreated` on `channelMessages` | Carries `messageContent`, `referenceMaps`, `messageUris`, `messageType`. Must filter out `MessageType.System`. |
| **Events** | Message Edited Event | **SUPPORTED** | `ChannelMessageEvent.ChannelMessageEdited` on `channelMessages` | Useful for automod re-checks. |
| **Events** | Message Deleted Event | **SUPPORTED** | `ChannelMessageEvent.ChannelMessageDeleted` on `channelMessages` | Track message deletions for audit logging. |
| **Events** | Reaction Created Event | **SUPPORTED** | `ChannelMessageEvent.ChannelMessageReactionCreated` on `channelMessages` | Enables reaction roles and interactive features. |
| **Events** | Reaction Deleted Event | **SUPPORTED** | `ChannelMessageEvent.ChannelMessageReactionDeleted` on `channelMessages` | Enables reaction role removals. |
| **Events** | Reaction Deleted Full | **SUPPORTED** | `ChannelMessageEvent.ChannelMessageReactionDeletedFull` on `channelMessages` | When all reactions of a shortcode are removed. |
| **Events** | Member Joined Event | **SUPPORTED** | `CommunityEvent.CommunityJoined` on `rootServer.community.communities` | Emitted when user joins community. Has `userId` and initial `communityRoleIds`. |
| **Events** | Member Leave Event | **SUPPORTED** | `CommunityEvent.CommunityLeave` on `rootServer.community.communities` | Emitted when user leaves, is kicked, or is banned. |
| **Events** | Role Assigned/Removed | **SUPPORTED** | `CommunityMemberRoleEvent.CommunityMemberRoleCreated` & `Deleted` | Emitted on `communityMemberRoles`. |
| **Members** | Member Lookup | **SUPPORTED** | `rootServer.community.communityMembers.get({ userId })`, `list()`, `listAll()` | Snapshot also available at startup via `RootBotStartState.communityMembers`. |
| **Roles** | Role Management | **SUPPORTED** | `rootServer.community.communityRoles.create()`, `edit()`, `delete()`, `list()`, `move()` | Requires `manageRoles` community permission. Cannot modify permissions higher than bot's own role. |
| **Roles** | Role Assignment | **SUPPORTED** | `rootServer.community.communityMemberRoles.add({ communityRoleId, userIds })` | Batch assignment supported. Cannot assign `@everyone`. |
| **Roles** | Role Removal | **SUPPORTED** | `rootServer.community.communityMemberRoles.remove({ communityRoleId, userIds })` | Batch removal supported. |
| **Channels** | Channel CRUD | **SUPPORTED** | `rootServer.community.channels.create()`, `edit()`, `delete()`, `get()`, `list()`, `move()` | Types: `Text`, `ThreadedText`, `Voice`. |
| **Access Rules** | Channel Overlays | **SUPPORTED** | `rootServer.community.accessRules.create()`, `edit()`, `delete()`, `listByChannelOrChannelGroup()` | Overrides permissions per role/user on channels. |
| **Moderation** | Ban Members | **SUPPORTED** | `rootServer.community.communityMemberBans.create({ userId, reason?, expiresAt? })` | Native support for temporary bans via `expiresAt`. Cannot ban owner or apps. |
| **Moderation** | Kick Members | **SUPPORTED** | `rootServer.community.communityMemberBans.kick({ userId })` & `kickBulk()` | Cannot kick owner or apps. |
| **Moderation** | Unban Members | **SUPPORTED** | `rootServer.community.communityMemberBans.delete({ userId })` | Requires `manageBans` permission. |
| **Moderation** | Warnings | **PARTIALLY SUPPORTED** | Application-level via SQLite / KeyValueStore | Root has no native warning entity; NEXUS maintains persistent warning records. |
| **Moderation** | Text Timeouts / Mutes | **PARTIALLY SUPPORTED** | Channel Access Rules (Deny `channelCreateMessage`) or Bot Cooldown | No single native "timeout member from text" API in `CommunityMemberBanClient`. Handled via access rules or bot command silences. |
| **Notifications** | Push / In-App Alert | **SUPPORTED** | `rootServer.community.notifications.send({ userIds, content, title? })` | Sends in-app or mobile push alerts. Up to 1000 users per send. |
| **Notifications** | Activity Indicator | **SUPPORTED** | `rootServer.community.notifications.setActivity()` | Low-cost activity indicator for bot's channel. Debounced by Root to 1/s. |
| **Voice APIs** | Voice Moderation | **PARTIALLY SUPPORTED** | `rootServer.community.channelWebRtcs.setMuteAndDeafenOther()`, `kick()` | Participant mute/deafen/kick supported. Audio streaming/playback NOT supported for bots. |
| **Scheduling** | Job Scheduler | **SUPPORTED** | `rootServer.jobScheduler.create()`, `get()`, `list()`, `delete()`, `edit()` | Backed by Root cloud database. Events: `JobScheduleEvent.Job` and `JobScheduleEvent.JobMissed`. Recurrence: `OneTime`, `Daily`, `Weekly`, `Monthly`, `Yearly`. |
| **Persistence** | Key-Value Store | **SUPPORTED** | `rootServer.dataStore.appData.get()`, `set()`, `update()`, `select()`, `delete()` | Built-in async key-value store, backed by Root-managed SQLite file with auto-backup and TTL (`expires_at`). |
| **Persistence** | SQLite Relational DB | **SUPPORTED** | `rootServer.dataStore.config.sqlite3.filename` | Standard SQLite file provided by Root with automated backups. Database limit: 500 MB. Direct access via `sqlite3`. |
| **Settings** | Manifest Settings | **PARTIALLY SUPPORTED** | Declared in `root-manifest.json` under `settings.groups[].items` | `roleOrMember` picker is supported in Root client UI; other field types (`channel`, `text`, `number`, `checkbox`) do not yet render UI in Root client. NEXUS must support command configuration (`!settings`). |
| **Settings** | Bot Settings Event | **SUPPORTED** | `rootServer.globalSettings.on('update')` & `'button'` | Live updates when admin changes manifest settings. |
| **Permissions** | Manifest Permissions | **SUPPORTED** | Declared in `root-manifest.json` under `permissions.community` and `permissions.channel` | Enforced by Root API at runtime; throws `RootApiException` with `NoPermissionTo*`. |
| **Logging** | Developer Log | **SUPPORTED** | `console.log`, `console.warn`, `console.error` | Streamed to Root Developer Portal logs. |
| **Logging** | Community App Log | **NOT SUPPORTED for bots** | `rootServer.dataStore.logs.community` | Documented explicitly: "This client is only available to apps. Bots cannot write community logs." NEXUS must use SQLite persistence and post to a dedicated `#mod-log` channel. |
| **Interaction** | Slash Commands | **NOT SUPPORTED** | N/A | Discord-style slash command registrations do not exist. Root bots parse channel messages with prefix syntax (e.g. `!nexus`). |
| **Interaction** | Direct Messages | **NOT SUPPORTED** | N/A | Root bots operate strictly within community channels; direct private message endpoints are not available to bots. |
| **Interaction** | Webhooks (Inbound) | **NOT SUPPORTED** | N/A | Root bots run in isolated server containers connected to Root platform via internal client; no external inbound public webhook listener port is exposed. |

---

## 3. Platform Limits & Rate Limits

1. **Commands (Mutations)**: ~5 requests/second (`channelMessages.create`, `communityRoles.delete`, `communityMemberBans.kick`, etc.).
2. **Queries (Reads)**: ~20 requests/second (`channelMessages.list`, `communityMembers.get`, etc.).
3. **Calls (Voice Moderation)**: ~1 request/second (`channelWebRtcs.setMuteAndDeafenOther`, `kick`).
4. **Uploads**: Max 100 files OR 250 MB per rolling hour.
5. **Database Size**: Max 500 MB for SQLite.
6. **Package Size**: Max 100 MiB for uploaded package (`.pkg`).
7. **Rate Limit Recovery**: Root does NOT provide a `retry-after` header. All throttling must use client-side exponential backoff with full jitter and paced command loops (minimum 250ms gap between batched mutations).

---

## 4. Key Architectural Implications for NEXUS

1. **Root-Native Event Dispatch**: Every incoming message triggers an event. We must filter out `MessageType.System` and bot-generated messages before command evaluation.
2. **Deterministic Dual Persistence**:
   - `rootServer.dataStore.appData` (KeyValueStore) for high-speed key-value caches, cooldowns, and simple counters.
   - Root-configured SQLite file (`rootServer.dataStore.config.sqlite3.filename`) for relational entities (warnings, xp, levels, reaction roles, giveaways, audit logs).
3. **Resilient Job Scheduling**: Never rely on in-memory `setTimeout` for durable schedules (giveaways, temporary bans, daily resets). Always register jobs with `rootServer.jobScheduler` and subscribe to `JobScheduleEvent.Job` and `JobScheduleEvent.JobMissed`. Reconcile jobs on bot startup inside `lifecycle.start`.
4. **Resilient Moderation Log**: Since `dataStore.logs.community` is restricted to Root Apps, NEXUS persists moderation actions to SQLite and dispatches human-readable log messages to the configured moderation log channel in the community.
5. **Strict Permission Awareness**: Check caller permissions using cached member/role structures from `RootBotStartState` and `CommunityMemberClient` before executing privileged commands (`!warn`, `!kick`, `!ban`, `!settings`).
