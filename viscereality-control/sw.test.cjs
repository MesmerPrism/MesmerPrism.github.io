const test=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs');
test('offline worker only intercepts exact static shell GET requests without credentials',()=>{
  const handlers={};vm.runInNewContext(fs.readFileSync(require.resolve('./sw.js'),'utf8'),{URL,Set,self:{location:{href:'https://mesmerprism.com/viscereality-control/sw.js',origin:'https://mesmerprism.com'},addEventListener:(name,fn)=>handlers[name]=fn},caches:{open:async()=>({match:async()=>({cached:true})})}});
  function intercepted(path,{method='GET',auth=false}={}){let handled=false;handlers.fetch({request:{url:new URL(path,'https://mesmerprism.com/viscereality-control/').href,method,headers:{has:()=>auth}},respondWith:()=>{handled=true;}});return handled;}
  for(const path of ['./','index.html','styles.css','app.js','transport.js','../shared/quest-ble/gatt-lifetime.js']) assert.equal(intercepted(path),true,path);
  for(const path of ['https://gateway.example/v1/gateway','http://192.168.1.1/v1/gateway','/v1/gateway','app.js?token=secret','?preview=1'])assert.equal(intercepted(path),false,path);
  assert.equal(intercepted('app.js',{auth:true}),false);assert.equal(intercepted('app.js',{method:'POST'}),false);
});

function workerFixture({missing,broken=false}={}) {
  const handlers={},entries=new Set(),deleted=[];
  let cacheName,reply;
  const cache={
    async addAll(paths){if(broken)throw Error('Download incomplete');paths.forEach(path=>entries.add(new URL(path,'https://mesmerprism.com/viscereality-control/').href));},
    async match(path){return entries.has(new URL(typeof path==='string'?path:path.url,'https://mesmerprism.com/viscereality-control/').href)?{ok:true}:undefined;}
  };
  vm.runInNewContext(fs.readFileSync(require.resolve('./sw.js'),'utf8'),{URL,Set,Promise,
    self:{location:{href:'https://mesmerprism.com/viscereality-control/sw.js',origin:'https://mesmerprism.com'},
      clients:{claim:async()=>{}},addEventListener:(name,fn)=>handlers[name]=fn},
    caches:{open:async name=>{cacheName=name;return cache;},keys:async()=>['viscereality-shell-old','unrelated-app'],delete:async name=>deleted.push(name)}});
  const dispatch=async(type,extra={})=>{
    assert.equal(typeof handlers[type],'function',`Worker must handle ${type}`);
    let task;handlers[type]({waitUntil:value=>{task=value;},...extra});await task;
  };
  return {entries,deleted,get cacheName(){return cacheName;},install:()=>dispatch('install'),activate:()=>dispatch('activate'),
    async check(type='CHECK_OFFLINE_READY'){
      reply=undefined;
      await dispatch('message',{data:{type},ports:[{postMessage:value=>{reply=value;}}]});
      return reply;
    }};
}

test('offline readiness covers the install manifest, icons and PWA runtime',async()=>{
  const f=workerFixture();await f.install();
  for(const path of ['pwa.js','manifest.webmanifest','icons/icon-192.png','icons/icon-512.png','icons/icon-maskable-512.png','icons/apple-touch-icon.png'])
    assert.ok(f.entries.has(new URL(path,'https://mesmerprism.com/viscereality-control/').href),`${path} must work on an offline launch`);
  const result=await f.check();
  assert.equal(result.type,'OFFLINE_READY');assert.equal(result.ready,true);assert.equal(result.cache,f.cacheName);
});

test('offline readiness is false if even one required file was evicted',async()=>{
  const f=workerFixture();await f.install();
  f.entries.delete('https://mesmerprism.com/viscereality-control/transport.js');
  assert.equal((await f.check()).ready,false);
});

test('worker ignores messages other than its closed readiness request',async()=>{
  const f=workerFixture();await f.install();
  const before=f.entries.size;
  assert.equal(await f.check('CACHE_GATEWAY_CREDENTIALS'),undefined);
  assert.equal(f.entries.size,before);
});

test('failed shell download preserves existing caches',async()=>{
  const f=workerFixture({broken:true});
  await assert.rejects(f.install(),/Download incomplete/);
  assert.deepEqual(f.deleted,[]);
});

test('activation retires only this app previous shell caches',async()=>{
  const f=workerFixture();await f.install();await f.activate();
  assert.deepEqual(f.deleted,['viscereality-shell-old']);
});
