# NEXUS Configuration Guide

NEXUS is designed with zero hardcoded IDs. Each community installing NEXUS operates with an isolated SQLite database and distinct configuration parameters.

---

## 1. Root Manifest Configuration (`root-manifest.json`)

The manifest declares the bot identity, runtime scopes, permissions, and client settings.

### 1.1 Declared Permissions
NEXUS requires the following platform permissions:

```json
"permissions": [
  "community:createBan",
  "community:manageBans",
  "community:kick",
  "community:createMessage",
  "community:deleteMessageOther",
  "community:managePinnedMessages",
  "community:viewMessageHistory",
  "community:createMessageMention",
  "community:createMessageReaction"
]
```

- `createBan` / `manageBans`: Required by `!ban` for permanent and temporary member suspensions.
- `kick`: Required by `!kick` to remove members from the community.
- `createMessage`: Required to send replies, announcements, and embeds.
- `deleteMessageOther`: Required by `AutomodModule` (auto-deleting spam) and `!purge`.
- `viewMessageHistory`: Required by `!purge` to list recent messages for cleanup.
- `createMessageMention`: Required to mention users, roles, and channels in welcome messages and logs.
- `createMessageReaction`: Required to add default emoji reactions to giveaway posts (`🎉`).

### 1.2 Manifest Client Setting (`globalSettings`)
Due to current Root client GUI limitations (only `roleOrMember` types render interactive selector controls in the desktop client), NEXUS declares an administrative moderator role/member selector:

```json
"settings": {
  "nexus_admin": {
    "moderators": {
      "type": "roleOrMember",
      "name": "Bot Administrators & Moderators",
      "description": "Select the roles or specific members authorized to manage NEXUS and issue moderation actions."
    }
  }
}
```

Any member or role selected in this group automatically inherits `ADMIN` permission level in NEXUS.

---

## 2. In-Bot Configuration (`!settings`)

Community administrators (`ADMIN` or `OWNER` level) can inspect and tune all bot settings in real time using the `!settings` command suite.

### 2.1 View Current Settings
```
!settings
```
Outputs the active community configuration, including prefix, module toggles, and target channel IDs.

### 2.2 Updating Settings
```
!settings set <key> <value>
```

| Setting Key | Allowed Values | Default | Description |
| :--- | :--- | :--- | :--- |
| `prefix` | Any string (1-3 chars) | `!` | Custom command prefix. |
| `welcome` | `on` / `off` | `off` | Enables or disables the member welcome greetings. |
| `welcome_channel`| `[#channel]` or ID | `None` | Channel where welcome messages are posted. |
| `welcome_message`| Text string | *(Default text)* | Custom welcome greeting. Supports `{user}` and `{memberCount}` variables. |
| `autorole` | `[@role]` or ID | `None` | Role assigned automatically to members upon joining. |
| `xp` | `on` / `off` | `on` | Enables or disables message XP generation. |
| `xp_cooldown` | Seconds (e.g. `60`) | `60` | Cooldown period between XP-awarding messages per user. |
| `automod` | `on` / `off` | `off` | Enables automated spam and content moderation. |
| `automod_links` | `on` / `off` | `off` | Automatically deletes messages containing unauthorized URLs. |
| `mod_log_channel`| `[#channel]` or ID | `None` | Channel where disciplinary action logs are dispatched. |
| `economy` | `on` / `off` | `on` | Enables virtual currency commands (`!balance`, `!daily`, `!transfer`). |
| `daily_amount` | Integer (e.g. `100`) | `100` | Number of credits awarded by `!daily`. |

---

## 3. Environment Variables

For local development with the Root Dev Host:

| Variable | Description | Example |
| :--- | :--- | :--- |
| `DEV_TOKEN` | Local development token from Root Developer Portal | `dev_tk_abcdef123...` |
| `COMMUNITY_ID` | Assigned automatically by Root runtime or Dev Host | `00000000-0000-0000-0000-000000000000` |
