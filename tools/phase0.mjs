#!/usr/bin/env node
/**
 * Push Phase 0 device spike (bead obsidian-uffish-j6bzz.2,
 * docs/plans/shared-push-enrollment-site-plan.md § Phase 0).
 *
 * Question: can ONE iOS home-screen web app hold several push subscriptions,
 * each made against a DIFFERENT VAPID key in its own service-worker scope —
 * one per vault — and do they all deliver? That decides per-vault keys vs one
 * household key.
 *
 *   node tools/phase0.mjs build                 # make keys (once) + write the page with every slot's public key
 *   node tools/phase0.mjs save <slot>           # save the subscription JSON on the clipboard (pbpaste) for a slot
 *   node tools/phase0.mjs send <slot> [--silent] [--cross] [--url=…] [--msg=…]
 *   node tools/phase0.mjs key <slot>            # print the slot's keypair JSON (for a vault's webpush-vapid secret)
 *
 * Keys and saved subscriptions live in ~/.uffish-spike/phase0 (0600), never in
 * this repo. Sends reuse the September spike's independent sender
 * (obsidian-uffish scripts/spike/webpush/webpush-lib.mjs).
 */
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const SITE = path.join(HERE, "..");
const REPO = process.env.UFFISH_REPO ?? "/Users/rguerra/obsidian-uffish";
const { generateVapidKeys, sendPush } = await import(path.join(REPO, "scripts/spike/webpush/webpush-lib.mjs"));
const STORE = path.join(os.homedir(), ".uffish-spike", "phase0");
const SUBJECT = "https://rguerra.github.io/uffish-push-phase0/";

/**
 * One slot per sender. `id` is the service-worker scope path (./v/<id>/) — part
 * of an enrolled device's identity, so never rename an id once a phone has
 * enrolled it; `label` is free to change. `keyFile` keeps the keys made before
 * slots had names.
 */
const SLOTS = [
  { id: "pack-qa-push", label: "pack-qa-push", keyFile: "vapid-a.json", vault: "pack-qa-push" },
  { id: "uffish-debug", label: "uffish-debug", keyFile: "vapid-uffish-debug.json", vault: "uffish-debug" },
  { id: "test", label: "Test vault", keyFile: "vapid-b.json", vault: null }
];

fs.mkdirSync(STORE, { recursive: true, mode: 0o700 });
const [cmd, which, ...rest] = process.argv.slice(2);
const flags = Object.fromEntries(rest.map((a) => { const m = /^--([^=]+)(?:=(.*))?$/.exec(a); return m ? [m[1], m[2] ?? "true"] : [a, "true"]; }));

function slot(id) {
  const found = SLOTS.find((s) => s.id === id);
  if (!found) throw new Error(`slot must be one of ${SLOTS.map((s) => s.id).join(", ")}; got ${id}`);
  return found;
}

function keys(s) {
  const file = path.join(STORE, s.keyFile);
  if (!fs.existsSync(file)) fs.writeFileSync(file, JSON.stringify(generateVapidKeys()), { mode: 0o600 });
  return JSON.parse(fs.readFileSync(file, "utf8"));
}

if (cmd === "build") {
  const config = SLOTS.map((s) => ({ id: s.id, label: s.label, key: keys(s).publicKeyB64u }));
  const tpl = fs.readFileSync(path.join(HERE, "site-src/index.html"), "utf8").replace("__SLOTS__", JSON.stringify(config));
  fs.writeFileSync(path.join(SITE, "index.html"), tpl);
  for (const f of ["sw.js", "manifest.webmanifest"]) fs.copyFileSync(path.join(HERE, "site-src", f), path.join(SITE, f));
  fs.writeFileSync(path.join(SITE, ".nojekyll"), "");
  for (const c of config) console.log(`${c.label.padEnd(14)} ./v/${c.id}/  key ${c.key.slice(0, 12)}…`);
} else if (cmd === "save") {
  const s = slot(which);
  const sub = JSON.parse(execFileSync("pbpaste", { encoding: "utf8" }).trim());
  if (!sub.endpoint || !sub.keys?.p256dh || !sub.keys?.auth) throw new Error("clipboard is not a subscription JSON");
  fs.writeFileSync(path.join(STORE, `sub-${s.id}.json`), JSON.stringify(sub), { mode: 0o600 });
  console.log(`saved ${s.label} subscription → ${new URL(sub.endpoint).host}`);
} else if (cmd === "send") {
  const s = slot(which);
  const sub = JSON.parse(fs.readFileSync(path.join(STORE, `sub-${s.id}.json`), "utf8"));
  const payload = {
    title: `Phase 0 · ${s.label}`,
    body: flags.msg ?? `Sent ${new Date().toLocaleTimeString()} with ${s.label}'s key`,
    url: flags.url ?? `obsidian://open?vault=${encodeURIComponent(flags.vault ?? s.vault ?? "pack-qa-push")}`,
    silent: flags.silent === "true",
    sentAt: Date.now()
  };
  const started = Date.now();
  const res = await sendPush(sub, payload, keys(s), { subject: SUBJECT });
  console.log(`${s.label} → HTTP ${res.status} in ${Date.now() - started}ms${res.text ? ` ${String(res.text).slice(0, 160)}` : ""}`);
  // Cross-key probe: another slot's key against this subscription must be refused.
  if (flags.cross === "true") {
    const other = SLOTS.find((o) => o.id !== s.id);
    const res2 = await sendPush(sub, { ...payload, title: "SHOULD NOT ARRIVE" }, keys(other), { subject: SUBJECT });
    console.log(`cross-key (${other.label} → ${s.label}'s subscription) → HTTP ${res2.status} (expect 400/403)`);
  }
} else if (cmd === "key") {
  process.stdout.write(JSON.stringify(keys(slot(which))));
} else {
  console.log(`usage: node tools/phase0.mjs build | save <slot> | send <slot> [--silent] [--cross] [--url=…] [--msg=…] | key <slot>\nslots: ${SLOTS.map((s) => s.id).join(", ")}`);
  process.exitCode = 2;
}
