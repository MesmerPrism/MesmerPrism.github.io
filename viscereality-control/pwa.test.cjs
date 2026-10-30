const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const tick=()=>new Promise(resolve=>setImmediate(resolve));
function fixture({ready=true,cache='viscereality-shell-pwa-2',standalone=false,registrationFails=false}={}) {
  const source=require('node:path').join(__dirname,'pwa.js');
  assert.ok(fs.existsSync(source),'PWA runtime must handle installation and verified offline readiness');
  const events={},nodes=new Map(),media={matches:standalone,addEventListener(){}};
  const node=id=>{if(!nodes.has(id))nodes.set(id,{hidden:id==='install-app',disabled:false,textContent:'',addEventListener(name,fn){this[name]=fn;}});return nodes.get(id);};
  const worker={postMessage(message,ports){assert.equal(message.type,'CHECK_OFFLINE_READY');ports[0].postMessage({type:'OFFLINE_READY',cache,ready});}};
  const registration={active:worker};
  const navigator={serviceWorker:{async register(){if(registrationFails)throw Error('No cache');return registration;},ready:Promise.resolve(registration),addEventListener(name,fn){events[name]=fn;}}};
  function MessageChannel(){this.port1={close(){}};this.port2={close(){},postMessage:value=>queueMicrotask(()=>this.port1.onmessage?.({data:value}))};}
  const window={matchMedia:()=>media,addEventListener:(name,fn)=>events[name]=fn};
  vm.runInNewContext(fs.readFileSync(source,'utf8'),{window,document:{getElementById:node},navigator,location:{protocol:'https:'},MessageChannel,setTimeout,clearTimeout,Promise});
  return {node,events,media,registration};
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
