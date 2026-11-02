"use strict";
// Bump for every shell change. No credentials, status, command or receipt is cached.
const CACHE="viscereality-shell-pwa-9";
const SHELL=["./","index.html","app.js","pwa.js","transport.js","connection-recovery.js","snapshot-state.js","polar-diagnostics.js","discovery.js","breath-monitor.js","recordings.js","styles.css","manifest.webmanifest","icons/icon-192.png","icons/icon-512.png","icons/icon-maskable-512.png","icons/apple-touch-icon.png","../shared/quest-ble/gatt-lifetime.js"];
const URLS=new Set(SHELL.map(path=>new URL(path,self.location.href).href));
// Protocol 1 remains stable across shell builds. Older/unresponsive pages veto.
// Waiting workers must include predecessor-controlled pages in this enumeration.
let updateTransaction;
async function controlledWindows() {
  return (await self.clients.matchAll({type:"window",includeUncontrolled:true}))
    .filter(client=>client.url.startsWith(self.registration.scope));
}
function askSafe(client,token,phase) {
  return new Promise(resolve=>{
    const channel=new MessageChannel();let settled=false;
    const finish=safe=>{if(settled)return;settled=true;clearTimeout(timer);channel.port1.close();channel.port2.close();resolve(safe);};
    const timer=setTimeout(()=>finish(false),2500);
    channel.port1.onmessage=({data})=>finish(data?.type==="RQ_UPDATE_SAFE"&&data.protocol===1&&data.token===token&&data.safe===true);
    try{client.postMessage({type:"RQ_UPDATE_CHECK",protocol:1,token,phase},[channel.port2]);}catch(_){finish(false);}
  });
}
function release(transaction) {
  for(const client of transaction.clients){try{client.postMessage({type:"RQ_UPDATE_RELEASE",protocol:1,token:transaction.token});}catch(_){/* Closed clients have no live actions to release. */}}
}
async function applyUpdate(event) {
  const reply=type=>event.ports[0].postMessage({type,protocol:1});
  if(updateTransaction){reply("UPDATE_BLOCKED");return;}
  const transaction={token:crypto.randomUUID(),clients:[]};updateTransaction=transaction;
  try {
    transaction.clients=await controlledWindows();
    if(!transaction.clients.some(client=>client.id===event.source?.id))throw Error("requesting client unavailable");
    const first=await Promise.all(transaction.clients.map(client=>askSafe(client,transaction.token,"freeze")));
    if(!first.every(Boolean))throw Error("unsafe client");
    const current=await controlledWindows();
    if(current.length!==transaction.clients.length||current.some(client=>!transaction.clients.some(approved=>approved.id===client.id)))throw Error("client set changed");
    const final=await Promise.all(current.map(client=>askSafe(client,transaction.token,"confirm")));
    if(!final.every(Boolean))throw Error("client safety changed");
    const last=await controlledWindows();
    if(last.length!==current.length||last.some(client=>!current.some(approved=>approved.id===client.id)))throw Error("client set changed before activation");
    await self.skipWaiting();reply("UPDATE_APPROVED");
  } catch(_) {release(transaction);updateTransaction=undefined;reply("UPDATE_BLOCKED");}
}
self.addEventListener("install",event=>event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(SHELL))));
self.addEventListener("activate",event=>event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(key=>key.startsWith("viscereality-shell-")&&key!==CACHE).map(key=>caches.delete(key)))).then(()=>self.clients.claim()).then(()=>{if(updateTransaction){for(const client of updateTransaction.clients){try{client.postMessage({type:"RQ_UPDATE_COMMIT",protocol:1,token:updateTransaction.token});}catch(_){/* Client closed after approval. */}}updateTransaction=undefined;}})));
self.addEventListener("message",event=>{
  if(event.data?.type==="APPLY_UPDATE"&&event.data.protocol===1&&event.ports?.[0]&&event.source){event.waitUntil(applyUpdate(event));return;}
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
