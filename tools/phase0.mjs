#!/usr/bin/env node
/**
 * Push Phase 0 device spike (bead obsidian-uffish-j6bzz.2,
 * docs/plans/shared-push-enrollment-site-plan.md § Phase 0).
 *
 * Question: can ONE iOS home-screen web app hold two push subscriptions, made
 * against two DIFFERENT VAPID keys, in two service-worker scopes — and do both
 * deliver? That decides per-vault keys vs one household key.
 *
 *   node phase0.mjs build            # make keys (once) + write site/ with both public keys
 *   node phase0.mjs save a|b         # save the subscription JSON on the clipboard (pbpaste) as vault a or b
 *   node phase0.mjs send a|b [--silent] [--url=…] [--msg=…]
 *
 * Keys and saved subscriptions live in ~/.uffish-spike/phase0 (0600), never in
 * the site. Sends reuse the September spike's independent sender
 * (scripts/spike/webpush/webpush-lib.mjs).
 */
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO = process.env.UFFISH_REPO ?? "/Users/rguerra/obsidian-uffish";
const { generateVapidKeys, sendPush } = await import(path.join(REPO, "scripts/spike/webpush/webpush-lib.mjs"));
const STORE = path.join(os.homedir(), ".uffish-spike", "phase0");
const SUBJECT = "https://rguerra.github.io/uffish-push-phase0/";
const VAULTS = { a: "Vault A", b: "Vault B" };

fs.mkdirSync(STORE, { recursive: true, mode: 0o700 });
const [cmd, which, ...rest] = process.argv.slice(2);
const flags = Object.fromEntries(rest.map((a) => { const m = /^--([^=]+)(?:=(.*))?$/.exec(a); return m ? [m[1], m[2] ?? "true"] : [a, "true"]; }));

function keys(id) {
  const file = path.join(STORE, `vapid-${id}.json`);
  if (!fs.existsSync(file)) fs.writeFileSync(file, JSON.stringify(generateVapidKeys()), { mode: 0o600 });
  return JSON.parse(fs.readFileSync(file, "utf8"));
}

function need(id) {
  if (!VAULTS[id]) throw new Error(`vault must be a or b, got ${id}`);
}

if (cmd === "build") {
  const a = keys("a");
  const b = keys("b");
  const tpl = fs.readFileSync(path.join(HERE, "site-src/index.html"), "utf8")
    .replace("__KEY_A__", a.publicKeyB64u)
    .replace("__KEY_B__", b.publicKeyB64u);
  const SITE = path.join(HERE, "..");
  fs.writeFileSync(path.join(SITE, "index.html"), tpl);
  for (const f of ["sw.js", "manifest.webmanifest"]) fs.copyFileSync(path.join(HERE, "site-src", f), path.join(SITE, f));
  fs.writeFileSync(path.join(SITE, ".nojekyll"), "");
  console.log(`site written to the repo root. Key A ${a.publicKeyB64u.slice(0, 12)}…  Key B ${b.publicKeyB64u.slice(0, 12)}…`);
} else if (cmd === "save") {
  need(which);
  const json = execFileSync("pbpaste", { encoding: "utf8" }).trim();
  const sub = JSON.parse(json);
  if (!sub.endpoint || !sub.keys?.p256dh || !sub.keys?.auth) throw new Error("clipboard is not a subscription JSON");
  fs.writeFileSync(path.join(STORE, `sub-${which}.json`), JSON.stringify(sub), { mode: 0o600 });
  console.log(`saved ${VAULTS[which]} subscription → ${new URL(sub.endpoint).host}`);
} else if (cmd === "send") {
  need(which);
  const sub = JSON.parse(fs.readFileSync(path.join(STORE, `sub-${which}.json`), "utf8"));
  const payload = {
    title: `Phase 0 · ${VAULTS[which]}`,
    body: flags.msg ?? `Sent ${new Date().toLocaleTimeString()} with key ${which.toUpperCase()}`,
    url: flags.url ?? `obsidian://open?vault=${encodeURIComponent(flags.vault ?? "pack-qa-push")}`,
    silent: flags.silent === "true",
    sentAt: Date.now()
  };
  const started = Date.now();
  const res = await sendPush(sub, payload, keys(which), { subject: SUBJECT });
  console.log(`${VAULTS[which]} → HTTP ${res.status} in ${Date.now() - started}ms${res.text ? ` ${String(res.text).slice(0, 160)}` : ""}`);
  // Cross-key probe: the OTHER vault's key against this subscription must be refused.
  if (flags.cross === "true") {
    const other = which === "a" ? "b" : "a";
    const res2 = await sendPush(sub, { ...payload, title: "SHOULD NOT ARRIVE" }, keys(other), { subject: SUBJECT });
    console.log(`cross-key (${other} → ${which}'s subscription) → HTTP ${res2.status} (expect 400/403)`);
  }
} else {
  console.log("usage: node phase0.mjs build | save a|b | send a|b [--silent] [--cross] [--url=…] [--msg=…]");
  process.exitCode = 2;
}
