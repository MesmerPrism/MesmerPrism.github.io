"use strict";
// Bump for every shell change. No credentials, status, command or receipt is cached.
const CACHE="viscereality-shell-app33-live-fixes-1";
const SHELL=["./","index.html","app.js","transport.js","styles.css","../shared/quest-ble/gatt-lifetime.js"];
const URLS=new Set(SHELL.map(path=>new URL(path,self.location.href).href));
self.addEventListener("install",event=>event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(SHELL))));
self.addEventListener("activate",event=>event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(key=>key.startsWith("viscereality-shell-")&&key!==CACHE).map(key=>caches.delete(key)))).then(()=>self.clients.claim())));
self.addEventListener("fetch",event=>{
  const request=event.request, url=new URL(request.url);
  if(request.method!=="GET" || url.origin!==self.location.origin || url.search || !URLS.has(url.href) || request.headers.has("Authorization")) return;
  // A versioned shell remains internally consistent until a fresh worker activates.
  event.respondWith(caches.open(CACHE).then(cache=>cache.match(request).then(hit=>hit||fetch(request))));
});
