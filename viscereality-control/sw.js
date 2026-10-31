"use strict";
// Bump for every shell change. No credentials, status, command or receipt is cached.
const CACHE="viscereality-shell-pwa-3";
const SHELL=["./","index.html","app.js","pwa.js","transport.js","breath-monitor.js","styles.css","manifest.webmanifest","icons/icon-192.png","icons/icon-512.png","icons/icon-maskable-512.png","icons/apple-touch-icon.png","../shared/quest-ble/gatt-lifetime.js"];
const URLS=new Set(SHELL.map(path=>new URL(path,self.location.href).href));
self.addEventListener("install",event=>event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(SHELL))));
self.addEventListener("activate",event=>event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(key=>key.startsWith("viscereality-shell-")&&key!==CACHE).map(key=>caches.delete(key)))).then(()=>self.clients.claim())));
self.addEventListener("message",event=>{
  if(event.data?.type!=="CHECK_OFFLINE_READY" || !event.ports?.[0]) return;
  const port=event.ports[0];
  event.waitUntil(caches.open(CACHE).then(cache=>Promise.all(SHELL.map(path=>cache.match(path))))
    .then(entries=>port.postMessage({type:"OFFLINE_READY",cache:CACHE,ready:entries.every(Boolean)}))
    .catch(()=>port.postMessage({type:"OFFLINE_READY",cache:CACHE,ready:false})));
});
self.addEventListener("fetch",event=>{
  const request=event.request, url=new URL(request.url);
  if(request.method!=="GET" || url.origin!==self.location.origin || url.search || !URLS.has(url.href) || request.headers.has("Authorization")) return;
  // A versioned shell remains internally consistent until a fresh worker activates.
  event.respondWith(caches.open(CACHE).then(cache=>cache.match(request).then(hit=>hit||fetch(request))));
});
