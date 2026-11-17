# Push Phase 0 — iPhone runbook (bead obsidian-uffish-j6bzz.2)

Page: https://rguerra.github.io/uffish-push-phase0/ (throwaway). Three slots, each its own key and service-worker scope:

| Slot | Scope | Who sends |
|---|---|---|
| **pack-qa-push** | `./v/pack-qa-push/` | the real `pack-qa-push` vault (its sender key) and `node tools/phase0.mjs send pack-qa-push` |
| **uffish-debug** | `./v/uffish-debug/` | the real `uffish-debug` vault (its sender key) and `send uffish-debug` |
| **Test vault** | `./v/test/` | only the Mac script: `send test` |

Mac commands: from a clone of this repo, `node tools/phase0.mjs …` (needs the obsidian-uffish checkout for the sender library; set UFFISH_REPO if it is not at /Users/rguerra/obsidian-uffish). Keys live in ~/.uffish-spike/phase0, never in this repo. Reload the `pack-qa-push` and `uffish-debug` windows in Obsidian before enrolling — their sender keys were written while they were open. ~30 minutes.

| # | Do | Record |
|---|----|--------|
| 0 | Safari → open the page → Share → Add to Home Screen → open **from the icon** (UffishP0). "Installed app" must say yes. | iOS version |
| 3 | Before adding to Home Screen, open the page as `…/index.html#probe`. After opening from the icon, read "Page URL". | Did `#probe` survive? (expected: no — start_url wins) |
| 1a | In the app: pack-qa-push → Enroll, allow. Copy subscription → on the Mac `node tools/phase0.mjs save pack-qa-push` (Universal Clipboard). Also paste it into pack-qa-push's Push enrollment card → Enroll a device. | Status line shows "key matches" |
| 1b | uffish-debug → Enroll, Copy → `save uffish-debug` and paste into uffish-debug's card. Then Test vault → Enroll, Copy → `save test`. "Registrations" lists all three scopes, each with a subscription. | **The main question: three subscriptions, three keys, one install?** |
| 1c | Lock the phone. `send pack-qa-push`, `send uffish-debug`, `send test`. Then from Obsidian, each real vault's card → Test. | All arrive? Each body names its own slot? Latency from the status line |
| 1d | `node tools/phase0.mjs send pack-qa-push --cross` | Cross-key line must be refused (400/403) and nothing titled "SHOULD NOT ARRIVE" |
| 5 | Tap a pack-qa-push notification (opens `obsidian://open?vault=pack-qa-push`) and a uffish-debug one. Then `send test --url=https://example.com/` and tap it. | Obsidian opens the right vault each time? Safari opens example.com? |
| 6 | iOS Settings → Notifications → UffishP0 → off. In the app: Local test on any slot. Turn it back on. | Does Local test show an error, or silently nothing? |
| 2 | `send test --silent` three times, ~1 min apart; then `send test`, `send pack-qa-push`, `send uffish-debug`. | Does Test vault stop delivering? Do the other two? Settings permission still on? |
| 4 | If the old **UffishPush** (September spike) icon is still installed, open it and this one. Its website is gone. | Both open, each keeps its own permission |

Decision: 1b + 1c pass → per-vault keys (Phase 2 as planned). 1b or 1c fails → household key.
Check 2 failing for the other slots too → one vault's bad push can silence every vault on that install; Phase 2's worker must always show something (it already does on obsidian-uffish main).
