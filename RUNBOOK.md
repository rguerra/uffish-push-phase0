# Push Phase 0 — iPhone runbook (bead obsidian-uffish-j6bzz.2)

Page: https://rguerra.github.io/uffish-push-phase0/ (throwaway; two vaults, two keys).
Mac commands: from a clone of this repo, `node tools/phase0.mjs …` (needs the obsidian-uffish checkout for the sender library; set UFFISH_REPO if it is not at /Users/rguerra/obsidian-uffish). Keys live in ~/.uffish-spike/phase0, never in this repo. ~30 minutes.

| # | Do | Record |
|---|----|--------|
| 0 | Safari → open the page → Share → Add to Home Screen → open **from the icon**. "Installed app" must say yes. | iOS version |
| 3 | Before adding to Home Screen, open the page as `…/index.html#probe`. After opening from the icon, read "Page URL". | Did `#probe` survive? (expected: no — start_url wins) |
| 1a | In the app: Enroll A, allow. Copy subscription → on the Mac `node tools/phase0.mjs save a` (Universal Clipboard). | Status line shows "key matches" |
| 1b | Enroll B, Copy → `node tools/phase0.mjs save b`. "Registrations" lists /v/a/ and /v/b/, both with a subscription. | **The main question: two subscriptions in one install?** |
| 1c | Lock the phone. `node tools/phase0.mjs send a`, then `send b`. | Both arrive? Each says its own scope? Latency from the status line |
| 1d | `node tools/phase0.mjs send a --cross` | Cross-key line must be refused (400/403) and nothing titled "SHOULD NOT ARRIVE" |
| 5 | Tap the Vault A notification (url `obsidian://open?vault=pack-qa-push`). Then `node tools/phase0.mjs send b --url=https://example.com/` and tap it. | Obsidian opens that vault? Safari opens example.com? |
| 6 | iOS Settings → Notifications → UffishP0 → off. In the app: Local test A. Turn it back on. | Does Local test show an error, or silently nothing? |
| 2 | `node tools/phase0.mjs send a --silent` three times, ~1 min apart; then `send a` and `send b`. | Does A stop delivering? Does B? Settings permission still on? |
| 4 | Leave the old **UffishPush** (September spike) icon installed. Open it and this one. | Both open, each keeps its own permission |

Decision: 1b + 1c pass → per-vault keys (Phase 2 as planned). 1b or 1c fails → household key.
Check 2 failing for B too → one vault's bad push can silence every vault on that install; Phase 2's worker must always show something (it already does on main).
