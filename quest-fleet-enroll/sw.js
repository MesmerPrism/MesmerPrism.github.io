const CACHE = 'quest-fleet-enroll-c9bad225c635233f';
const SHELL = ["./","index.html","app.js","styles.css","manifest.webmanifest","icons/icon.svg","icons/icon-192.png","icons/icon-512.png","icons/icon-maskable-512.png","THIRD_PARTY_LICENSES.txt"];
const STATIC_URLS = new Set(SHELL.map(path => new URL(path, self.location.href).href));
self.addEventListener('install', event => event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(SHELL.map(path => new Request(new URL(path, self.location.href), { cache: 'reload' }))))));
self.addEventListener('activate', event => event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key.startsWith('quest-fleet-enroll-') && key !== CACHE).map(key => caches.delete(key))))));
self.addEventListener('fetch', event => {
  const request = event.request, url = new URL(request.url);
  if (request.method !== 'GET' || url.origin !== self.location.origin || url.search || url.hash || request.headers.has('Authorization') || !STATIC_URLS.has(url.href)) return;
  event.respondWith(caches.open(CACHE).then(cache => cache.match(request).then(hit => hit || fetch(request))));
});
// No skipWaiting or clients.claim: an in-progress enrollment keeps its shell.
// No background sync, status caching, API interception or request replay.
