# NEXUS Testing Guide & Verification Checklist

## 1. Testing Philosophy

NEXUS tests separate business domain logic and database integrity from external platform dependencies. This enables comprehensive, fast unit and integration testing without requiring an active Root WebSocket connection.

Testing is powered by **Vitest** (`vitest`), running in CommonJS with automated test environment provisioning.

---

## 2. Automated Test Suites (`tests/`)

The automated test suite verifies 25 distinct behavioral specifications across 6 suites:

### 2.1 `tests/leveling.test.ts`
- Zero/negative XP edge cases (defaults to Level 0).
- Level 1 baseline at 100 XP.
- Progressive XP scaling: exponential curve verification across levels 1, 2, 5, and 10.
- Inverse requirement calculations (`calculateXpRequiredForLevel(level)` vs `calculateLevelFromXp(xp)`).

### 2.2 `tests/formatting.test.ts`
- Formatting user mentions using Root Markdown links: `[@Name](root://user/{id})`.
- Formatting role mentions: `[@Role](root://role/{id})`.
- Formatting channel mentions: `[#Channel](root://channel/{id})`.
- Mention extraction: extracting IDs from rich Markdown links, raw URI schemes, and raw GUIDs.
- Numerical formatting with comma separators (`formatNumber`).

### 2.3 `tests/time.test.ts`
- Parsing duration strings: `30s`, `15m`, `2h`, `1d`, `7D`.
- Invalid duration handling (returns `null`).
- Formatting millisecond durations into readable strings (`1m 30s`, `2h 30m`, `3d 4h`).

### 2.4 `tests/permissions.test.ts`
- Community Owner identification as `PermissionLevel.OWNER`.
- Global settings moderator group check resolving to `PermissionLevel.ADMIN`.
- Role hierarchy evaluation based on community role titles (e.g. `Administrator`, `Moderator`, `Staff`, `Member`).
- Hierarchy verification (`hasPermission` bounds checking).

### 2.5 `tests/cooldowns.test.ts`
- First-access allowance and cooldown tracking.
- Immediate subsequent attempt rejection while on active cooldown.
- Explicit cooldown clearing.
- Background memory sweeps (`sweep()`) removing expired keys.

### 2.6 `tests/database.test.ts`
- Full schema migrations execution in an in-memory SQLite database (`:memory:`).
- `SettingsRepository`: default settings retrieval and persistence updates.
- `WarningsRepository`: record insertion, count aggregation, descending history queries, and clearing.
- `EconomyRepository`: zero-balance initialization, daily claims, 24-hour claim blocking, and balance transfers.
- `AchievementsRepository`: first unlock awarding and duplicate unlock prevention.

---

## 3. Running Automated Tests

```bash
npm test
```

To run with coverage or in watch mode:
```bash
npx vitest --watch
```

---

## 4. Live Community Manual Verification Checklist

When testing NEXUS connected to a live Root community via Dev Host (`npm run bot`):

- [ ] **Startup:** Verify console displays `NEXUS bot successfully started and ready!` without errors.
- [ ] **!ping:** Run `!ping` in any channel. Verify response time and uptime are displayed.
- [ ] **!help:** Verify categorized menu is displayed with moderation, leveling, roles, giveaways, economy, and settings.
- [ ] **XP Engine:** Send regular messages without prefix. Verify XP accumulates (`!rank`). Verify 60s cooldown prevents rapid farming.
- [ ] **!warn & !warnings:** Issue a warning to a test account. Verify warning count increments and entry appears in `!warnings`.
- [ ] **!purge:** Send multiple test messages and run `!purge 5`. Verify messages are removed one-by-one with 250ms pacing.
- [ ] **!balance & !daily:** Run `!daily`. Verify 100 credits are awarded. Run `!daily` again; verify 24h countdown notice.
- [ ] **!giveaway:** Run `!giveaway create 2m 1 Test Prize`. Verify initial post with 🎉 reaction appears. Verify concluding announcement triggers after 2 minutes.
- [ ] **Persistence:** Stop the bot, restart it, and run `!rank` and `!balance`. Verify all user balances and XP remain intact.
