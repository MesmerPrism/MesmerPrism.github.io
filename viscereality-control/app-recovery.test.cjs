const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const {webcrypto,createHmac}=require('node:crypto');
const tick=()=>new Promise(resolve=>setImmediate(resolve));
const device='b'.repeat(32),controller='a'.repeat(32),key='c'.repeat(64),url='http://192.168.43.2:8766/v1/gateway';
function fixture(saved=new Map(),initialHidden=false) {
  const nodes=new Map(),events=new Map(),timers=new Map();let timer=0,now=1000,wall=1000,read=0;
  const head={device,serial:'SYNTHETIC-60',epoch:'123',native_epoch:'7',mode:'remote',lost:false,delay:0,joins:0,hold:null,writes:[],requests:[],phase:'RUNNING',revision:3,ms:25000,mutate:s=>s};
  const node=id=>{if(!nodes.has(id)){const n={textContent:'',className:'',value:'0',dataset:{},children:[],events:new Map(),addEventListener:(n,fn)=>n&&nodes.get(id).events.set(n,fn),setAttribute(){},removeAttribute(){},replaceChildren(){this.children=[];},append(...c){this.children.push(...c);}};n.classList={toggle(){},contains:c=>n.className.split(' ').includes(c)};nodes.set(id,n);}return nodes.get(id);};
  const bytes=v=>new DataView(new TextEncoder().encode(JSON.stringify(v)).buffer);
  const view={fresh:false,resets:0,model:{query:()=>({})},accept(){this.fresh=true;},unavailable(){this.fresh=false;},reset(){this.fresh=false;this.resets++;}};
  const fetcher=async(target,options)=>{
    assert.equal(target,url,'only the known route may be probed');head.requests.push(options.method==='POST'?JSON.parse(options.body):{action:'identity'});
    if(head.lost)throw new TypeError('synthetic Wi-Fi loss');
    if(head.hold)await head.hold;
    now+=head.delay;
    const identity={v:1,device:head.device,serial:head.serial,epoch:head.epoch,native_epoch:head.native_epoch,enabled:head.mode==='remote',remote_available:head.mode==='remote'};
    if(options.method==='GET')return {ok:true,text:async()=>JSON.stringify(identity)};
    const req=JSON.parse(options.body);
    if(req.action==='status'&&head.expire)return {ok:false,status:403};
    if(req.action==='connect'&&head.capacity)return {ok:false,status:429};
    if(req.action==='connect'){head.joins++;return {ok:true,text:async()=>JSON.stringify({v:1,device:head.device,serial:head.serial,epoch:head.epoch,controller,key})};}
    let body;
    if(req.action==='status')body=head.mutate({v:1,m:'gated',wifi_snapshot:1,control_mode:head.mode,o:{v:1,s:'observed',e:head.native_epoch,i:String(++read),g:7,r:head.revision,a:0},p:head.phase,g:7,r:head.revision,c:'condition-a',rec:true,co:'NOT_REACHED',ms:head.ms,st:'ready',pending:false,h:'vr-session',pi:{r:true,f:true,h:false},breath_monitor:1,q:{v:2,s:'d'.repeat(32),g:7,o:['pause','resume','start']}});
    else if(req.action==='command'){assert.equal(JSON.parse(saved.get('viscereality-original-command')).id,JSON.parse(req.payload).id,'original persisted before send');head.writes.push(JSON.parse(req.payload));if(head.loseCommand){head.loseCommand=false;head.lost=true;throw new TypeError('reply lost after apply');}body={v:1};}
    else if(req.action==='receipt'){if(head.holdReceipt)await head.holdReceipt;body={v:1,id:JSON.parse(req.payload).id,state:head.receiptState||'confirmed',detail:head.receiptDetail||'ORIGINAL_ONLY'};}
    else body={v:1};
    const payload=JSON.stringify(body),reply={v:1,device:head.device,epoch:head.epoch,nonce:req.nonce,action:req.action,payload};
    reply.mac=createHmac('sha256',key).update(`RQG1-REPLY|${controller}|${head.device}|${head.epoch}|${req.nonce}|${req.action}|${payload}`).digest('hex');
    return {ok:true,text:async()=>JSON.stringify(reply)};
  };
  const context=vm.createContext({TextEncoder,TextDecoder,URL,URLSearchParams,Promise,AbortController,AbortSignal,crypto:webcrypto,fetch:fetcher,QuestBleLifetime:require('../shared/quest-ble/gatt-lifetime.js'),location:{search:'',protocol:'https:'},isSecureContext:true,
    document:{hidden:initialHidden,visibilityState:initialHidden?'hidden':'visible',getElementById:node,querySelectorAll:()=>[],createElement:()=>node('created-'+nodes.size),addEventListener:(n,fn)=>events.set(n,fn)},window:{scrollTo(){},addEventListener:(n,fn)=>events.set(n,fn)},navigator:{onLine:false},
    localStorage:{getItem:k=>saved.get(k)||null,setItem:(k,v)=>saved.set(k,v),removeItem:k=>saved.delete(k)},performance:{now:()=>now},Date:{now:()=>wall},
    setTimeout:(fn,ms)=>{timers.set(++timer,{fn,ms});return timer;},clearTimeout:id=>timers.delete(id),setInterval:(fn,ms)=>{timers.set(++timer,{fn,ms,interval:true});return timer;},clearInterval:id=>timers.delete(id),ViscerealityBreathMonitor:{createView:()=>view}});
  for(const file of ['discovery.js','transport.js','connection-recovery.js','snapshot-state.js','recordings.js','app.js']){const path=require('node:path').join(__dirname,file);if(fs.existsSync(path))vm.runInContext(fs.readFileSync(path,'utf8'),context);}
  const run=s=>vm.runInContext(s,context);node('local-gateway-url').value=url;
  return {head,view,saved,node,events,timers,context,run,now:v=>{now=v;},wall:v=>{wall=v;},async settle(){for(let i=0;i<80;i++){await tick();if(!run('recoveryController?.flight'))return;}throw Error('Recovery did not settle');},async connect(){await run('connectLocal({manual:true})');await tick();},async retry(){const next=[...timers.entries()].find(([,t])=>!t.interval&&[1000,2000,4000,8000,15000].includes(t.ms));assert.ok(next,'retry is scheduled');timers.delete(next[0]);next[1].fn();await this.settle();},bytes};
}
module.exports={fixture,tick,url};

test('whole rich snapshot rejects stale native age and preserves last confirmed running display',async()=>{
 const f=fixture();await f.connect();assert.equal(f.node('pause-session').disabled,false);
 f.head.mutate=s=>({...s,p:'PAUSED',o:{...s.o,a:5001}});await f.run('refreshStatus()');
 assert.equal(f.node('pause-session').disabled,true);assert.equal(f.node('phase').textContent,'RUNNING');assert.match(f.node('connection-label').textContent,/stale|Reconnecting/i);
});
test('full native age plus complete body/verification transit over budget never restores controls',async()=>{
 const f=fixture();await f.connect();f.head.delay=3000;f.head.mutate=s=>({...s,o:{...s.o,a:2500}});await f.run('refreshStatus()');assert.equal(f.node('pause-session').disabled,true);assert.equal(f.run('freshStatus()'),false);
});
test('older observation and same observation conflicting revision cannot replace coherent state',async()=>{
 const f=fixture();await f.connect();const old=f.run('JSON.parse(JSON.stringify(questStatus))');
 f.head.mutate=s=>({...s,p:'PAUSED',r:99,o:{...s.o,i:old.o.i,r:99}});await f.run('refreshStatus()');assert.equal(f.node('phase').textContent,'RUNNING');assert.equal(f.run('freshStatus()'),false);
});
for(const field of ['pi','rec','pending','ms','h','co','st','o'])test(`rich snapshot missing ${field} cannot grant authority`,async()=>{
 const f=fixture();await f.connect();f.head.mutate=s=>{delete s[field];return s;};await f.run('refreshStatus()');assert.equal(f.run('freshStatus()'),false);assert.equal(f.node('pause-session').disabled,true);
});
test('breath-first ordinary outage keeps guest and recovers read only without blacklisting',async()=>{
 const f=fixture();await f.connect();const joins=f.head.joins;f.head.lost=true;await f.run('refreshBreathing()');await tick();
 assert.equal(f.run('networkTransport.retired'),false);assert.equal(f.run('networkRecovering'),true);assert.equal(f.node('phase').textContent,'RUNNING');
 f.head.lost=false;await f.retry();assert.equal(f.head.joins,joins);assert.equal(f.run('freshStatus()'),true);assert.deepEqual(f.head.writes,[]);assert.equal(f.run('failedHeadsets.size'),0);
});
test('hidden suspends work, visible revalidates same memory guest despite offline hint',async()=>{
 const f=fixture();await f.connect();const count=f.head.requests.length;
 f.context.document.hidden=true;f.context.document.visibilityState='hidden';f.events.get('visibilitychange')?.();await tick();assert.equal(f.run('canCommand()'),false);
 await f.run('refreshStatus()');assert.equal(f.head.requests.length,count);
 f.context.document.hidden=false;f.context.document.visibilityState='visible';f.events.get('visibilitychange')?.();await f.settle();assert.equal(f.run('canCommand()'),true);assert.equal(f.head.joins,1);assert.deepEqual(f.head.writes,[]);
});
test('explicit Disconnect clears reconnect intent while preserving original uncertainty',async()=>{
 const f=fixture();await f.connect();assert.ok(f.saved.has('viscereality-last-connected'));
 f.run('pendingOriginal={id:"1111111111111111",deviceId:ownerIdentity(),epoch:"7",name:"Pause",op:"pause",state:"uncertain"};saveOriginal();cancelConnection()');
 assert.equal(f.saved.has('viscereality-last-connected'),false);assert.ok(f.saved.has('viscereality-original-command'));assert.deepEqual(f.head.writes,[]);
});
test('pending body ages out on UI tick and stale command handler writes nothing',async()=>{
 const f=fixture();await f.connect();let release;f.head.hold=new Promise(r=>release=r);const read=f.run('refreshStatus()');await tick();f.now(7000);
 for(const t of f.timers.values())if(t.interval&&t.ms<=1000)t.fn();await f.run('sendSessionControl("pause")');assert.equal(f.node('pause-session').disabled,true);assert.equal(f.node('phase').textContent,'RUNNING');assert.deepEqual(f.head.writes,[]);release();await read;
});
test('new native revision legitimately corrects active clock backwards',async()=>{
 const f=fixture();await f.connect();f.head.revision=4;f.head.ms=17000;await f.run('refreshStatus()');assert.equal(f.node('active-time').textContent,'00:17');assert.equal(f.run('canCommand()'),true);
});
test('monotonic clock rollback invalidates authority without inventing native Pause',async()=>{
 const f=fixture();await f.connect();f.now(900);f.run('render()');assert.equal(f.node('pause-session').disabled,true);assert.equal(f.node('phase').textContent,'RUNNING');
});
test('Direct waits read only and Remote return restores same memory guest',async()=>{
 const f=fixture();await f.connect();f.head.mode='direct';f.head.lost=true;await f.run('refreshBreathing()');await f.settle();f.head.lost=false;await f.retry();
 assert.match(f.node('connection-label').textContent,/Waiting for Remote/);const joins=f.head.joins;await f.retry();assert.equal(f.head.joins,joins);assert.deepEqual(f.head.writes,[]);
 f.head.mode='remote';await f.retry();assert.equal(f.run('canCommand()'),true);assert.equal(f.head.joins,joins);
});
test('wrong physical identity blocks without joining and never resumes on visibility',async()=>{
 const f=fixture();await f.connect();f.head.serial='OTHER';f.head.lost=true;await f.run('refreshBreathing()');await f.settle();f.head.lost=false;await f.retry();
 assert.match(f.node('connection-detail').textContent,/blocked/i);assert.equal(f.head.joins,1);assert.equal(f.run('canCommand()'),false);
 f.context.document.hidden=true;f.events.get('visibilitychange')();f.context.document.hidden=false;f.events.get('visibilitychange')();await f.settle();assert.equal(f.head.joins,1);assert.deepEqual(f.head.writes,[]);
});
test('command applied then reply lost persists original before send and recovers receipt without replay',async()=>{
 const f=fixture();await f.connect();f.head.loseCommand=true;
 await f.run('sendSessionControl("pause")');await f.settle();assert.equal(f.head.writes.length,1);assert.ok(f.saved.has('viscereality-original-command'));
 const id=f.head.writes[0].id;f.head.lost=false;await f.retry();assert.equal(f.head.writes.length,1);assert.equal(f.run('pendingOriginal.id'),id);assert.equal(f.run('pendingOriginal.state'),'reconciled_receipt');assert.match(f.node('command-detail').textContent,/ORIGINAL_ONLY/);
 await f.run('refreshStatus()');assert.equal(f.run('pendingOriginal'),null);assert.equal(f.run('canCommand()'),true);
});
test('reload uses bounded last-connected selector only, revalidates offline and never opens chooser',async()=>{
 const saved=new Map(),old=fixture(saved);await old.connect();old.events.get('pagehide')();const f=fixture(saved);await f.settle();
 assert.equal(f.run('canCommand()'),true);assert.equal(f.head.joins,1);assert.deepEqual(f.head.writes,[]);const text=[...saved.values()].join('');assert.doesNotMatch(text,/cccccccc|controller|native_epoch|"epoch"/);
});
test('new native lifetime resets graph and leaves old original uncertain until explicit acknowledgement',async()=>{
 const f=fixture();await f.connect();f.run('pendingOriginal={id:"1111111111111111",deviceId:ownerIdentity(),epoch:"7",name:"Pause",op:"pause",state:"observing"};saveOriginal()');const resets=f.view.resets;
 f.head.native_epoch='8';f.head.lost=true;await f.run('refreshBreathing()');await f.settle();f.head.lost=false;await f.retry();
 assert.ok(f.view.resets>resets);assert.equal(f.run('pendingOriginal.state'),'uncertain');assert.equal(f.run('canCommand()'),false);assert.equal(f.head.requests.filter(r=>r.action==='receipt').length,0);assert.deepEqual(f.head.writes,[]);
 f.run('acknowledgeUnknownOriginal()');assert.equal(f.run('canCommand()'),true);
});
test('late breathing response cannot revive graph after hidden and foreground revalidation',async()=>{
 const f=fixture();await f.connect();let release;f.head.hold=new Promise(r=>release=r);const read=f.run('refreshBreathing()');await tick();
 f.context.document.hidden=true;f.events.get('visibilitychange')();f.context.document.hidden=false;f.events.get('visibilitychange')();
 release();await read;await f.settle();assert.equal(f.view.fresh,false);assert.deepEqual(f.head.writes,[]);
});
test('ordinary status reports Direct as Waiting for Remote until same-key recovery sees Remote',async()=>{
 const f=fixture();await f.connect();f.head.mode='choose';await f.run('refreshStatus()');await f.settle();assert.match(f.node('connection-label').textContent,/Waiting for Remote/);assert.equal(f.run('canCommand()'),false);assert.equal(f.head.joins,1);
 f.head.mode='remote';await f.retry();assert.equal(f.run('canCommand()'),true);assert.deepEqual(f.head.writes,[]);
});
test('initial known-headset transient join loss retries rather than permanently blacklisting the route',async()=>{
 const f=fixture();f.context.selector={device,serial:f.head.serial,gateway:url};f.run('selectedHeadset=selector');f.head.lost=true;
 await f.run('connectLocal()');await f.settle();assert.equal(f.run('failedHeadsets.size'),0);assert.equal(f.run('networkRecovering'),true);
 f.head.lost=false;await f.retry();assert.equal(f.run('canCommand()'),true);assert.deepEqual(f.head.writes,[]);
});
test('hidden during initial join aborts the attempt and cannot admit a late guest',async()=>{
 const f=fixture();let release;f.head.hold=new Promise(r=>release=r);const read=f.run('connectLocal({manual:true})');await tick();
 f.context.document.hidden=true;f.events.get('visibilitychange')();release();await read;assert.equal(f.run('connected()'),false);assert.equal(f.head.joins,0);assert.equal(f.run('canCommand()'),false);
});
test('expired guest retries capacity and lost joins without replay or permanent blacklist',async()=>{
 const f=fixture();await f.connect();f.head.expire=true;f.head.capacity=true;await f.run('refreshStatus()');await f.settle();
 assert.equal(f.run('networkRecovering'),true);assert.equal(f.run('canCommand()'),false);assert.equal(f.run('failedHeadsets.size'),0);
 await f.retry();assert.equal(f.run('networkRecovering'),true);assert.equal(f.head.joins,1);f.head.capacity=false;f.head.expire=false;await f.retry();assert.equal(f.run('canCommand()'),true);assert.equal(f.head.joins,2);assert.deepEqual(f.head.writes,[]);
});
test('Refresh during backoff cannot churn guests or replace the scheduled retry',async()=>{
 const f=fixture();await f.connect();f.head.lost=true;await f.run('refreshBreathing()');await f.settle();const before=f.head.requests.length;
 for(let i=0;i<12;i++)await f.run('refreshStatus()');await f.settle();assert.equal(f.head.requests.length,before);assert.equal(f.head.joins,1);
});
test('a snapshot accepted under an older connection generation cannot authorize a successor',async()=>{
 const f=fixture();await f.connect();f.run('connectionGeneration++');assert.equal(f.run('canCommand()'),false);assert.equal(f.head.writes.length,0);
});
test('hidden aborts original receipt observation and a late matching receipt cannot settle it',async()=>{
 const f=fixture();await f.connect();f.run('pendingOriginal={id:"1111111111111111",deviceId:ownerIdentity(),epoch:"7",name:"Pause",op:"pause",state:"observing"};saveOriginal()');
 let release;f.head.holdReceipt=new Promise(r=>release=r);const read=f.run('refreshStatus()');for(let i=0;i<80&&!f.head.requests.some(r=>r.action==='receipt');i++)await tick();assert.ok(f.head.requests.some(r=>r.action==='receipt'));
 f.context.document.hidden=true;f.events.get('visibilitychange')();release();await read;assert.equal(f.run('pendingOriginal.state'),'observing');assert.equal(f.run('canCommand()'),false);assert.deepEqual(f.head.writes,[]);
});
test('pageshow cannot start recovery while the document remains hidden',async()=>{
 const old=fixture();await old.connect();old.events.get('pagehide')();const f=fixture(old.saved,true);f.events.get('pageshow')({persisted:false});await f.settle();assert.equal(f.head.requests.length,0);assert.equal(f.run('canCommand()'),false);
 f.context.document.hidden=false;f.events.get('visibilitychange')();await f.settle();assert.equal(f.run('canCommand()'),true);assert.deepEqual(f.head.writes,[]);
});
test('visibility and offline hints preserve an integrity block and its explanation',async()=>{
 const f=fixture();await f.connect();f.head.serial='WRONG';f.head.lost=true;await f.run('refreshBreathing()');await f.settle();f.head.lost=false;await f.retry();
 f.context.document.hidden=true;f.events.get('visibilitychange')();f.context.document.hidden=false;f.events.get('visibilitychange')();f.events.get('offline')();await f.settle();assert.equal(f.run('networkRecovering'),false);assert.match(f.node('connection-detail').textContent,/blocked/i);assert.equal(f.head.joins,1);
});
function retainOriginal(f){f.run('pendingOriginal={id:"1111111111111111",deviceId:ownerIdentity(),epoch:"7",name:"Pause",op:"pause",state:"observing"};saveOriginal()');}
for(const action of ['breath-monitor','receipt'])for(const code of [401,403])test(`fix1 I1 ${action}-first guest ${code} rejoins only after fresh physical proof`,async()=>{
 const f=fixture();await f.connect();if(action==='receipt')retainOriginal(f);const old=f.run('networkTransport'),good=old.fetcher;let failed=false;
 old.fetcher=async(target,options)=>{if(!failed&&options.method==='POST'&&JSON.parse(options.body).action===action){failed=true;return {ok:false,status:code};}return good(target,options);};
 await f.run(action==='receipt'?'refreshStatus()':'refreshBreathing()');await f.settle();
 assert.equal(old.retirementError?.kind,'rejoin-needed');assert.equal(old.retirementError?.code,'guest-expired');assert.equal(f.head.joins,2);assert.equal(old.key,'');assert.equal(f.run('networkTransport.device'),device);assert.deepEqual(f.head.writes,[]);
 if(action==='receipt'){assert.equal(f.run('pendingOriginal.id'),'1111111111111111');assert.equal(f.run('pendingOriginal.state'),'reconciled_receipt');await f.run('refreshStatus()');assert.equal(f.run('pendingOriginal'),null);}
 assert.equal(f.run('canCommand()'),true);const at=f.head.requests.findLastIndex(r=>r.action==='connect');assert.equal(f.head.requests[at-1].action,'identity');
});
test('fix1 I2 retained receipt transient transfers to same-guest scheduler and keeps original',async()=>{
 const f=fixture();await f.connect();retainOriginal(f);const guest=f.run('networkTransport'),good=guest.fetcher;let failed=false;
 guest.fetcher=async(target,options)=>{if(!failed&&options.method==='POST'&&JSON.parse(options.body).action==='receipt'){failed=true;f.head.lost=true;throw new TypeError('receipt-first transient');}return good(target,options);};
 await f.run('refreshStatus()');await f.settle();assert.equal(f.run('networkRecovering'),true);assert.equal(guest.retired,false);assert.ok(guest.key);assert.equal(f.run('pendingOriginal.id'),'1111111111111111');
 f.head.lost=false;await f.retry();assert.equal(f.head.joins,1);assert.equal(f.run('pendingOriginal.id'),'1111111111111111');assert.match(f.node('command-detail').textContent,/ORIGINAL_ONLY/);await f.run('refreshStatus()');assert.equal(f.run('canCommand()'),true);assert.deepEqual(f.head.writes,[]);
});
for(const [op,phase] of [['pause','RUNNING'],['start','ARMED'],['resume','PAUSED'],['save-next','RUNNING']])test(`fix1 I3 held ${op} receipt cannot cross suspension and native owner replacement`,async()=>{
 const f=fixture();f.head.phase=phase;await f.connect();const guest=f.run('networkTransport'),good=guest.fetcher;let release,waiting=false;const hold=new Promise(r=>release=r);
 guest.fetcher=async(target,options)=>{const response=await good(target,options);if(options.method==='POST'&&JSON.parse(options.body).action==='receipt'){waiting=true;await hold;}return response;};
 const command=f.run(op==='save-next'?'sendCommand("save-next","Save session")':`sendSessionControl("${op}")`);
 for(let i=0;i<80&&!waiting;i++)await tick();assert.equal(waiting,true);const id=f.head.writes[0].id;
 f.context.document.hidden=true;f.events.get('visibilitychange')();f.head.native_epoch='8';f.context.document.hidden=false;f.events.get('visibilitychange')();release();await command;await f.settle();
 assert.equal(f.run('pendingOriginal?.id'),id);assert.equal(f.saved.has('viscereality-original-command'),true);assert.equal(f.run('pendingOriginal.state'),'uncertain');assert.equal(f.run('networkTransport.nativeEpoch'),'8');assert.equal(f.run('canCommand()'),false);assert.notEqual(f.node('command-detail').textContent,'ORIGINAL_ONLY');assert.equal(f.head.writes.length,1);
});
test('fix1 I4 initial app status loss preserves the successfully joined guest for recovery',async()=>{
 const f=fixture(),good=f.context.fetch;let statuses=0,adopted;const join=f.context.ViscerealityTransport.localJoin;
 f.context.fetch=async(target,options)=>{if(options.method==='POST'&&JSON.parse(options.body).action==='status'&&++statuses===2){f.head.lost=true;throw new TypeError('first app status after join lost');}return good(target,options);};
 f.context.ViscerealityTransport.localJoin=async options=>{const joined=await join(options);adopted=joined.gateway;return joined;};
 await f.connect();await f.settle();assert.equal(f.run('networkTransport'),adopted);assert.equal(adopted.retired,false);assert.ok(adopted.key);assert.equal(f.run('networkRecovering'),true);
 f.head.lost=false;await f.retry();assert.equal(f.run('canCommand()'),true);assert.equal(f.head.joins,1);assert.deepEqual(f.head.writes,[]);
});
for(const stage of ['preproof','postproof'])test(`fix1 I5 selecting B retires A intent through ${stage} transient`,async()=>{
 const f=fixture();await f.connect();f.run('disconnected("replace target")');const otherUrl='http://192.168.43.3:8766/v1/gateway',other='d'.repeat(32),serial='SECOND-60',good=f.context.fetch;let failed=false;
 f.context.fetch=async(target,options)=>{if(target!==otherUrl)return good(target,options);if(!failed&&(stage==='preproof'||options.method==='POST')){failed=true;throw new TypeError('B route temporarily unavailable');}f.head.device=other;f.head.serial=serial;return good(url,options);};
 f.context.selectorB={device:other,serial,gateway:otherUrl};f.run('selectedHeadset=selectorB');await f.run('connectLocal()');await f.settle();
 assert.equal(f.run('reconnectIntent.device'),other);assert.equal(f.run('selectedHeadset.device'),other);assert.notEqual(f.run('networkTransport?.device'),device);if(f.run('networkRecovering'))await f.retry();
 assert.equal(f.run('networkTransport.device'),other);assert.equal(f.run('canCommand()'),true);assert.equal(f.head.joins,2);assert.deepEqual(f.head.writes,[]);
});
for(const action of ['breath-monitor','receipt'])test(`fix1 ${action} guest expiry cannot rejoin a different physical selector`,async()=>{
 const f=fixture();await f.connect();if(action==='receipt')retainOriginal(f);const guest=f.run('networkTransport'),good=guest.fetcher;
 guest.fetcher=async(target,options)=>{if(options.method==='POST'&&JSON.parse(options.body).action===action){f.head.serial='OTHER-PHYSICAL';return {ok:false,status:403};}return good(target,options);};
 await f.run(action==='receipt'?'refreshStatus()':'refreshBreathing()');await f.settle();assert.equal(f.head.joins,1);assert.equal(f.run('canCommand()'),false);assert.equal(f.run('recoveryController.blocked'),true);assert.deepEqual(f.head.writes,[]);if(action==='receipt')assert.equal(f.run('pendingOriginal.id'),'1111111111111111');
});
test('final I1 frozen to hidden resume sends no requests until actual visibility returns',async()=>{
 const f=fixture();await f.connect();f.context.document.hidden=true;f.context.document.visibilityState='hidden';f.events.get('visibilitychange')();f.events.get('freeze')();const before=f.head.requests.length;
 f.events.get('resume')();await f.settle();assert.equal(f.run('pageActive'),false);assert.equal(f.head.requests.length,before);assert.equal(f.run('canCommand()'),false);
 f.events.get('pageshow')({persisted:false});await f.settle();assert.equal(f.head.requests.length,before);f.context.document.hidden=false;f.context.document.visibilityState='visible';f.events.get('visibilitychange')();await f.settle();assert.equal(f.run('canCommand()'),true);assert.equal(f.head.joins,1);assert.deepEqual(f.head.writes,[]);
});
for(const problem of ['serial','mac'])test(`final I3 initial ${problem} integrity stays blocked across every lifecycle return`,async()=>{
 const f=fixture(),serial=f.head.serial,good=f.context.fetch;f.context.selector={device,serial,gateway:url};f.run('selectedHeadset=selector');
 let invalid=true;f.context.fetch=async(target,options)=>{if(invalid&&problem==='serial')return {ok:true,text:async()=>JSON.stringify({v:1,device,serial:'WRONG',epoch:'123',native_epoch:'7',enabled:true,remote_available:true})};const response=await good(target,options);if(invalid&&options.method==='POST'&&JSON.parse(options.body).action==='status'){const reply=JSON.parse(await response.text());reply.mac='0'.repeat(64);return {ok:true,text:async()=>JSON.stringify(reply)};}return response;};
 await f.run('connectLocal()');await f.settle();assert.equal(f.run('canCommand()'),false);const count=f.head.requests.length,joins=f.head.joins;invalid=false;
 f.context.document.hidden=true;f.events.get('visibilitychange')();f.events.get('freeze')();f.events.get('resume')();f.context.document.hidden=false;f.events.get('visibilitychange')();f.events.get('pageshow')({persisted:false});f.events.get('online')();f.events.get('offline')();await f.settle();
 assert.equal(f.head.requests.length,count);assert.equal(f.head.joins,joins);assert.equal(f.run('canCommand()'),false);
 const reopened=fixture(f.saved);await reopened.settle();assert.equal(reopened.head.requests.length,0);assert.equal(reopened.run('canCommand()'),false);
 await f.run('connectLocal({manual:true})');await f.settle();assert.equal(f.run('canCommand()'),true);assert.equal(f.run('networkTransport.device'),device);assert.deepEqual(f.head.writes,[]);
});
for(const phase of ['initial','expired'])test(`final I2 actual native capacity wire backs off ${phase} join until actual idle expiry`,{skip:!process.env.EXPERIMENT_CAPACITY_HTTP_EVIDENCE},async()=>{
 const facts=JSON.parse(fs.readFileSync(process.env.EXPERIMENT_CAPACITY_HTTP_EVIDENCE,'utf8'));assert.equal(facts.guest_count,8);assert.equal(facts.idle_ms,120000);assert.equal(facts.no_eviction_verified,true);assert.equal(facts.experiment_dispatches_added,0);
 const response=raw=>({ok:false,status:Number(raw.match(/^HTTP\/1.1 (\d+)/)[1]),text:async()=>raw.split('\r\n\r\n')[1]});
 assert.equal(response(facts.capacity).status,429);assert.equal(response(facts.wrapped_capacity).status,429);assert.match(facts.after_expiry_status,/^HTTP\/1.1 200 /);
 const f=fixture();if(phase==='expired'){await f.connect();retainOriginal(f);}else{f.context.selector={device,serial:f.head.serial,gateway:url};f.run('selectedHeadset=selector');}
 const guest=phase==='expired'?f.run('networkTransport'):null,good=f.context.fetch;let elapsed=0,rejected=false;
 const saturated=async(target,options)=>{if(options.method==='POST'){const action=JSON.parse(options.body).action;if(guest&&!rejected&&action==='status'){rejected=true;return {ok:false,status:403};}if(action==='connect'&&elapsed<120000)return response(elapsed===0?facts.wrapped_capacity:facts.before_expiry);}return good(target,options);};
 f.context.fetch=saturated;if(guest)guest.fetcher=saturated;
 await f.run(guest?'refreshStatus()':'connectLocal()');await f.settle();assert.equal(f.run('networkRecovering'),true);assert.equal(f.run('failedHeadsets.size'),0);assert.equal(f.run('canCommand()'),false);assert.equal(f.head.joins,guest?1:0);
 elapsed=119999;await f.retry();assert.equal(f.run('networkRecovering'),true);assert.equal(f.head.joins,guest?1:0);if(guest)assert.equal(f.run('pendingOriginal.id'),'1111111111111111');
 elapsed=120000;await f.retry();if(guest){assert.equal(f.run('pendingOriginal.id'),'1111111111111111');await f.run('refreshStatus()');}assert.equal(f.run('canCommand()'),true);assert.equal(f.head.joins,guest?2:1);assert.deepEqual(f.head.writes,[]);
});
test('final I2 other actual native HTTP403 classes never become capacity retries',{skip:!process.env.EXPERIMENT_CAPACITY_HTTP_EVIDENCE},async()=>{
 const facts=JSON.parse(fs.readFileSync(process.env.EXPERIMENT_CAPACITY_HTTP_EVIDENCE,'utf8'));
 for(const field of ['wrong_device','bad_mac','bad_shape','misleading_capacity']){const f=fixture(),good=f.context.fetch;f.context.selector={device,serial:f.head.serial,gateway:url};f.run('selectedHeadset=selector');f.context.fetch=async(target,options)=>options.method==='POST'&&JSON.parse(options.body).action==='connect'?{ok:false,status:Number(facts[field].match(/^HTTP\/1.1 (\d+)/)[1]),text:async()=>facts[field].split('\r\n\r\n')[1]}:good(target,options);
  await f.run('connectLocal()');await f.settle();assert.equal(f.run('networkRecovering'),false);assert.equal(f.run('canCommand()'),false);assert.equal(f.head.joins,0);assert.equal(f.run('failedHeadsets.size'),1);assert.deepEqual(f.head.writes,[]);
 }
});
