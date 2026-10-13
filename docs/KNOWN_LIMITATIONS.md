# Known Limitations & Platform Constraints

This document catalogs verified constraints and architectural boundaries of the RootApp platform (`@rootsdk/server-bot@0.21.3`), alongside the robust mitigations implemented in NEXUS.

---

## 1. Community App Logs are Restricted to Apps Only

- **Platform Constraint:** Calling `rootServer.dataStore.logs.community.create()` throws `NotSupportedException: Bots cannot write community logs`. Community audit logs are reserved exclusively for Root Apps (rich frontend widgets).
- **NEXUS Mitigation:** NEXUS maintains an internal relational audit log table in SQLite (`moderation_logs`) and dispatches formatted, rich text notifications directly to the community's designated `#mod-log` channel.

---

## 2. Manifest Settings UI Types in Root Desktop Clients

- **Platform Constraint:** While `root-manifest.json` permits defining `text`, `channel`, `number`, and `roleOrMember` setting schemas, the Root desktop client GUI currently only renders interactive selector controls for `roleOrMember`. Other types do not yet expose a configuration GUI to community administrators in client settings.
- **NEXUS Mitigation:**
  1. NEXUS uses `roleOrMember` in `root-manifest.json` (`nexus_admin.moderators`) to give administrators a native UI control for designating bot operators.
  2. For all other settings (prefix, welcome channels, automod toggles, economy balances), NEXUS provides a full-featured in-chat administration command suite: `!settings` and `!settings set <key> <value>`.

---

## 3. Absence of Bulk Message Deletion API

- **Platform Constraint:** Root's `ChannelMessageClient` does not provide a bulk deletion endpoint (e.g. `deleteMany([ids])`).
- **NEXUS Mitigation:** The `!purge <count>` command fetches recent messages using `channelMessages.list({ channelId, messageDirectionTake: Older, limit: count, dateAt: new Date() })` and executes individual `channelMessages.delete({ channelId, id })` calls with loop pacing:
  ```ts
  await pace(250); // 250ms delay keeps execution strictly at 4 calls/s, below the ~5 req/s limit
  ```

---

## 4. Role Hierarchy and Assignment Permissions

- **Platform Constraint:** When invoking `rootServer.community.communityMemberRoles.add()`, Root checks the role hierarchy. If the role being assigned possesses permissions higher than the bot's own highest role, the API rejects the mutation with `NoPermissionToAdd`.
- **NEXUS Mitigation:** NEXUS wraps role assignment operations in `try/catch` blocks and structured logging, notifying administrators that the bot's role must be positioned above reward roles in the community settings.

---

## 5. Root Dev Tools Packaging Binary on macOS ARM64

- **Platform Constraint:** The `@rootsdk/dev-tools` package (version `0.21.3`) distributes precompiled publishing binaries in `publish/bin/`:
  - `appsdk-lite-console-linux-x64-libc.tar.gz`
  - `appsdk-lite-console-linux-x64-musl.tar.gz`
  - `appsdk-lite-console-win32-x64.tar.gz`
  The vendor did not bundle a prebuilt binary for macOS ARM64 (`darwin-arm64`). Attempting to run `rootsdk build package` directly on an Apple Silicon Mac yields `CLI binary not found for darwin-arm64`.
- **NEXUS Mitigation:** The project builds cleanly with `npm run build` (`tsc`). When generating `.pkg` packages for Developer Portal publishing, run `rootsdk build package` within a standard Linux container or GitHub Actions runner (`ubuntu-latest`).

---

## 6. Voice APIs Scope

- **Platform Constraint:** Root provides channel presence and voice session management (`voiceChannelCalls.getCalls()`, `disconnectCall()`), but does not expose raw WebRTC audio streams or audio injection pipelines for bots.
- **NEXUS Mitigation:** NEXUS deliberately does not attempt audio streaming or music playback. Voice functionality is restricted to analytics tracking and presence metrics.

---

## 7. Scheduled Jobs vs In-Memory Timers

- **Platform Constraint:** Relying on Node.js `setTimeout` or `setInterval` for long-running events (such as 24-hour giveaways) causes job loss if the bot restarts or is redeployed.
- **NEXUS Mitigation:**
  1. NEXUS uses Root's cloud-managed `JobScheduler` (`rootServer.jobScheduler.create({ resourceId, tag, jobInterval, start })`).
  2. On startup, `giveawaysModule.reconcileActiveGiveaways()` checks SQLite for any due giveaways that elapsed during bot downtime and concludes them automatically.
