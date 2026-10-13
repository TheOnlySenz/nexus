# NEXUS Developer Guide

This document covers local setup, development workflows, compilation, and testing for NEXUS.

---

## 1. Prerequisites

- **Node.js**: Version 22.0.0 or higher (`engines: { "node": ">=22" }`).
- **NPM**: Standard package manager bundled with Node.js.
- **Root Developer Account**: Access to [Root Developer Portal](https://developer.rootapp.com/) to create bot containers and generate development tokens.

---

## 2. Getting Started

### 2.1 Clone and Install Dependencies
```bash
git clone <repo-url> nexus
cd nexus
npm install
```

### 2.2 Configure Development Credentials
Create or edit `.env` in the project root:
```ini
DEV_TOKEN=your_development_token_here
```

To obtain a `DEV_TOKEN`:
1. Log in to the [Root Developer Portal](https://developer.rootapp.com/).
2. Navigate to **My bots** and select or create your bot container.
3. In the bot details page, copy the **Development Token**.

---

## 3. Development Commands

| Command | Action | Description |
| :--- | :--- | :--- |
| `npm run build` | `tsc` | Compiles TypeScript source (`src/`) to output directory (`dist/`). |
| `npm test` | `vitest run` | Executes the Vitest unit and integration test suite. |
| `npm run clean` | `node clean.js` | Removes the compiled `dist/` artifacts. |
| `npm run bot` | `rootsdk start devhost` | Boots the Root Dev Host and connects NEXUS to your development community. |
| `npm run package` | `rootsdk build package` | Builds the production distribution package (`.pkg`). *(Requires Linux or Windows CLI binary)* |

---

## 4. Local Testing with Dev Host

When you run:
```bash
npm run bot
```

The Root SDK will:
1. Load `root-manifest.json` to read permissions and settings.
2. Authenticate using `DEV_TOKEN` against Root cloud infrastructure.
3. Establish a real-time WebSocket connection to your designated test community.
4. Execute `onStarting` lifecycle hooks, applying SQLite migrations and registering listeners.
5. Stream structured logs directly to your local terminal.

---

## 5. Coding Standards & Guidelines

1. **Root-Native First:**
   - Always use `@rootsdk/server-bot` APIs.
   - Do not import Discord.js or Discord-specific terminology.
   - Format user/channel mentions using standard Root Markdown links (`[@Name](root://user/{id})`).

2. **Rate Limit Awareness:**
   - Paced sequential operations (`pace(250)`) for multi-request routines.
   - Wrap external API calls with `withRetry` for automatic backoff against `TooManyRequests`.

3. **No Hardcoded Community Values:**
   - Always resolve IDs dynamically from incoming event payloads or SQLite settings.

4. **Preserve Decoupled Domain Logic:**
   - Keep business logic in `src/modules/` free of command strings or chat formatting assumptions, ensuring direct reusability in future Root App dashboards.
