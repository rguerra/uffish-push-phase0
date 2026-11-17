/* Uffish push Phase 0 spike worker. One file, registered once per vault scope (./v/a/, ./v/b/). */
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));
const vaultOf = () => (self.registration.scope.match(/\/v\/([^/]+)\/$/) || [])[1] || "?";
async function record(data) {
  const cache = await caches.open("phase0");
  const entry = { vault: vaultOf(), receivedAt: Date.now(), sentAt: data.sentAt || null, silent: !!data.silent, title: data.title || "" };
  await cache.put(`last-${entry.vault}`, new Response(JSON.stringify(entry)));
}
self.addEventListener("push", (event) => {
  let data = {};
  try { data = event.data ? event.data.json() : {}; } catch (e) { data = {}; }
  const work = record(data).then(() => {
    // Check 2: a deliberately silent push shows NOTHING, to see whether iOS
    // revokes permission for the whole install or only this scope.
    if (data.silent) return undefined;
    return self.registration.showNotification(data.title || "Uffish Phase 0", {
      body: `${data.body || ""} · scope ${vaultOf().toUpperCase()}`,
      data
    });
  });
  event.waitUntil(work);
});
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification.data && event.notification.data.url;
  if (typeof url === "string" && (url.startsWith("obsidian://") || url.startsWith("https://"))) {
    event.waitUntil(self.clients.openWindow(url));
  }
});
