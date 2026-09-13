// The app's service worker. It exists for one reason: the gym has a weak signal, and the app has
// to open offline once installed on the home screen.
//
// Bumping VERSION on every release is what swaps the cached content. Without it the device keeps
// the old version forever, which is the classic way a service worker ruins an app.
const VERSION = "v13";
const CACHE = `academia-${VERSION}`;

const ESSENTIALS = [
  "./",
  "index.html",
  "styles.css",
  "mulish.woff2",
  "vendor/firebase-app-compat.js",
  "vendor/firebase-auth-compat.js",
  "vendor/firebase-firestore-compat.js",
  "plans.js",
  "store.js",
  "app.js",
  "manifest.json",
  "icone.svg",
  "icone-192.png",
  "icone-512.png"
];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(ESSENTIALS)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((names) => Promise.all(names.filter((name) => name !== CACHE).map((name) => caches.delete(name))))
      .then(() => self.clients.claim())
  );
});

// Caches only what is an app file: no query, same origin, whole and healthy response. A partial or
// cross-site response in the cache comes back broken offline.
const cacheable = (request, response) =>
  response?.ok && response.type === "basic" && new URL(request.url).search === "";

async function keep(request, response) {
  if (!cacheable(request, response)) return;
  const cache = await caches.open(CACHE);
  await cache.put(request, response);
}

// Navigation is network first: a new release shows on the first opening with signal, and the cache
// only steps in when the network fails. The opposite would leave the workout open on an old
// version with no way out.
async function pageFromNetwork(request) {
  try {
    const response = await fetch(request);
    keep(request, response.clone());
    return response;
  } catch {
    return (await caches.match(request)) ?? (await caches.match("index.html")) ?? Response.error();
  }
}

// App files are cache first, with a background fetch so the next opening already has the new
// version. Opening fast at the gym is worth more than having the last-minute CSS.
async function fileFromCache(request) {
  const cached = await caches.match(request);
  const fromNetwork = fetch(request)
    .then((response) => {
      keep(request, response.clone());
      return response;
    })
    .catch(() => cached);
  return cached ?? fromNetwork;
}

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;
  if (new URL(request.url).origin !== self.location.origin) return;

  event.respondWith(request.mode === "navigate" ? pageFromNetwork(request) : fileFromCache(request));
});
