const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const tick=()=>new Promise(resolve=>setImmediate(resolve));
function fixture({ready=true,cache='viscereality-shell-pwa-11',standalone=false,registrationFails=false,waiting=false,safe=true}={}) {
  const source=require('node:path').join(__dirname,'pwa.js');
  assert.ok(fs.existsSync(source),'PWA runtime must handle installation and verified offline readiness');
  const events={},nodes=new Map(),media={matches:standalone,addEventListener(){}};
  const node=id=>{if(!nodes.has(id))nodes.set(id,{hidden:id==='install-app',disabled:false,textContent:'',addEventListener(name,fn){this[name]=fn;}});return nodes.get(id);};
  const worker={postMessage(message,ports){assert.equal(message.type,'CHECK_OFFLINE_READY');ports[0].postMessage({type:'OFFLINE_READY',cache,ready});}};
  let applies=0,reloads=0,held;
  const waitingWorker={postMessage(message,ports){applies++;ports[0].postMessage({type:'UPDATE_BLOCKED',protocol:1});}};
  const registration={active:worker,waiting:waiting?waitingWorker:null,addEventListener(){}};
  const safety={acquire(token){if(!safe)return false;held=token;return true;},check:token=>safe&&held===token,release:token=>{if(held===token)held=undefined;}};
  const navigator={serviceWorker:{async register(){if(registrationFails)throw Error('No cache');return registration;},ready:Promise.resolve(registration),addEventListener(name,fn){events[name]=fn;}}};
  function MessageChannel(){this.port1={close(){}};this.port2={close(){},postMessage:value=>queueMicrotask(()=>this.port1.onmessage?.({data:value}))};}
  const window={matchMedia:()=>media,addEventListener:(name,fn)=>events[name]=fn};
  vm.runInNewContext(fs.readFileSync(source,'utf8'),{window,document:{getElementById:node},navigator,location:{protocol:'https:',reload(){reloads++;}},ViscerealityUpdateSafety:safety,MessageChannel,setTimeout,clearTimeout,Promise});
  return {node,events,media,registration,waitingWorker,safety,get applies(){return applies;},get reloads(){return reloads;}};
}
test('only a verified complete current shell is advertised as ready offline',async()=>{
  const f=fixture();await tick();assert.match(f.node('offline-note').textContent,/^Ready for offline use/);
});
for(const [name,options] of [['incomplete',{ready:false}],['old worker',{cache:'viscereality-shell-old'}],['failed registration',{registrationFails:true}]])
  test(`${name} is never advertised as ready offline`,async()=>{
    const f=fixture(options);await tick();assert.doesNotMatch(f.node('offline-note').textContent,/^Ready for offline use/);
  });
test('install prompt is offered only on a user click and is consumed once',async()=>{
  const f=fixture();await tick();let prompts=0,prevented=false;
  assert.equal(f.node('install-app').hidden,true);
  f.events.beforeinstallprompt({preventDefault(){prevented=true;},async prompt(){prompts++;},userChoice:Promise.resolve({outcome:'dismissed'})});
  assert.equal(prevented,true);assert.equal(prompts,0);assert.equal(f.node('install-app').hidden,false);
  await f.node('install-app').click();await f.node('install-app').click();
  assert.equal(prompts,1);assert.equal(f.node('install-app').hidden,true);
});
test('accepted prompt does not claim installed until the browser confirms it',async()=>{
  const f=fixture();await tick();
  f.events.beforeinstallprompt({preventDefault(){},async prompt(){},userChoice:Promise.resolve({outcome:'accepted'})});
  await f.node('install-app').click();
  assert.doesNotMatch(f.node('install-note').textContent,/is installed/);
  f.events.appinstalled();assert.match(f.node('install-note').textContent,/is installed/);
});
test('standalone launch hides installation promotion',async()=>{
  const f=fixture({standalone:true});await tick();
  assert.equal(f.node('install-app').hidden,true);assert.match(f.node('install-note').textContent,/installed app/);
});
test('prompt failure keeps manual installation instructions available',async()=>{
  const f=fixture();await tick();
  f.events.beforeinstallprompt({preventDefault(){},async prompt(){throw Error('Prompt unavailable');}});
  await f.node('install-app').click();
  assert.equal(f.node('install-app').disabled,false);assert.match(f.node('install-note').textContent,/Chrome.*menu/);
});

test('waiting update is visible but applies only on explicit click',async()=>{
 const f=fixture({waiting:true});await tick();assert.equal(f.node('apply-update').hidden,false);assert.match(f.node('update-note').textContent,/Update available/);assert.equal(f.applies,0);
 await f.node('apply-update').click();assert.equal(f.applies,1);assert.equal(f.reloads,0);assert.match(f.node('update-note').textContent,/deferred/i);
});
test('protocol 1 future-worker freeze/check/commit reloads safe approved page exactly once',async()=>{
 const f=fixture({waiting:true});await tick();const replies=[],port={postMessage:m=>replies.push(m)};
 const message=(type,phase)=>f.events.message({source:f.waitingWorker,data:{type,protocol:1,token:'future8',phase},ports:[port]});
 message('RQ_UPDATE_CHECK','freeze');assert.equal(replies.at(-1).safe,true);
 message('RQ_UPDATE_CHECK','confirm');assert.equal(replies.at(-1).safe,true);
 f.registration.active=f.waitingWorker;message('RQ_UPDATE_COMMIT');message('RQ_UPDATE_COMMIT');assert.equal(f.reloads,1);
});
test('unsafe page, unapproved controller change and forged commit never reload',async()=>{
 const f=fixture({waiting:true,safe:false});await tick();let reply;
 f.events.message({source:f.waitingWorker,data:{type:'RQ_UPDATE_CHECK',protocol:1,token:'x',phase:'freeze'},ports:[{postMessage:m=>reply=m}]});assert.equal(reply.safe,false);
 f.events.controllerchange();f.events.message({source:f.waitingWorker,data:{type:'RQ_UPDATE_COMMIT',protocol:1,token:'x'}});assert.equal(f.reloads,0);
});
