/* Service Worker: lädt online immer die neueste Version (Netz zuerst)
   und fällt offline auf die zuletzt gespeicherte Kopie zurück. */
const CACHE = "rauchfrei-v2";
const CORE = ["./", "index.html", "css/app.css", "manifest.webmanifest", "fonts/manrope.woff",
  "js/icons.js", "js/core.js", "js/tracker.js", "js/health.js", "js/fitness.js", "js/nutrition.js",
  "js/game.js", "js/city.js", "js/report.js", "js/bpreport.js", "js/backup.js", "js/app.js",
  "icons/icon-192.png", "icons/apple-touch-icon.png"];

self.addEventListener("install", e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(CORE)).then(() => self.skipWaiting()));
});
self.addEventListener("activate", e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});
self.addEventListener("fetch", e => {
  const req = e.request;
  if (req.method !== "GET" || new URL(req.url).origin !== location.origin) return;
  e.respondWith(
    fetch(req, { cache: "no-store" })
      .then(res => { const copy = res.clone(); caches.open(CACHE).then(c => c.put(req, copy)); return res; })
      .catch(() => caches.match(req, { ignoreSearch: true }).then(r => r || caches.match("index.html")))
  );
});
