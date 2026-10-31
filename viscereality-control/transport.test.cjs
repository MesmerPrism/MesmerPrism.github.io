const test=require('node:test'),assert=require('node:assert/strict'),{createHmac,webcrypto}=require('node:crypto');
const {Gateway,endpoint}=require('./transport.js');
const controller='a'.repeat(32),device='b'.repeat(32),key='c'.repeat(64),epoch='123';
const sign=s=>createHmac('sha256',key).update(s).digest('hex');
function fixture(tamper=reply=>reply) {
  const calls=[];
  const gateway=new Gateway({url:'https://gateway.example/v1/gateway',controller,device,key,cryptoApi:webcrypto,
    fetcher:async(url,options)=>{
      calls.push({url,options});
      let reply={v:1,device,epoch,enabled:true};
      if(options.method==='POST') {
        const request=JSON.parse(options.body);
        assert.equal(request.mac,sign(`RQG1|${controller}|${epoch}|${request.nonce}|${request.action}|${request.payload}`));
        const payload=JSON.stringify(request.action==='status'?{v:1,m:'gated',p:'IDLE',o:{s:'observed',e:epoch}}:{v:1,id:JSON.parse(request.payload).id,state:'pending'});
        reply={v:1,device,epoch,nonce:request.nonce,action:request.action,payload,mac:sign(`RQG1-REPLY|${controller}|${device}|${epoch}|${request.nonce}|${request.action}|${payload}`)};
        reply=tamper(reply,request);
      }
      return {ok:true,text:async()=>JSON.stringify(reply)};
    }});
  return {gateway,calls};
}
test('identity GET never admits controls before authenticated current native status',async()=>{
  const {gateway,calls}=fixture();assert.equal(gateway.active,false);await gateway.connect();assert.equal(gateway.active,true);
  assert.equal(calls.length,2);assert.equal(JSON.parse(calls[1].options.body).action,'status');
  for(const {options} of calls){assert.equal(options.cache,'no-store');assert.equal(options.credentials,'omit');assert.equal(options.redirect,'error');}
});
for(const field of ['mac','nonce','device','epoch','action']) test(`reject changed ${field} and retire credentials`,async()=>{
  const {gateway}=fixture(reply=>({...reply,[field]:'wrong'}));await assert.rejects(gateway.connect());assert.equal(gateway.active,false);assert.equal(gateway.key,'');
});
test('network command writes once and original receipt is queried by ID without replay',async()=>{
  const {gateway,calls}=fixture();await gateway.connect();const id='1'.repeat(16);
  await gateway.write(new TextEncoder().encode(JSON.stringify({v:1,id,op:'arm',mac:'native-mac'})));
  await gateway.read('receipt',id);await gateway.read('receipt',id);
  const requests=calls.slice(1).map(call=>JSON.parse(call.options.body));
  assert.equal(requests.filter(r=>r.action==='command').length,1);
  assert.equal(JSON.parse(requests[1].payload).mac,undefined);
  assert.equal(JSON.parse(requests[2].payload).id,id);
  assert.equal(new Set(requests.map(r=>r.nonce)).size,4);
});
test('timeout closes authority and never retries command',async()=>{
  const {gateway}=fixture();await gateway.connect();let count=0;gateway.fetcher=async()=>{count++;throw Error('timeout');};
  await assert.rejects(gateway.write(new TextEncoder().encode('{"v":1,"id":"1111111111111111","op":"arm"}')));
  assert.equal(count,1);assert.equal(gateway.active,false);await assert.rejects(gateway.read('status'));assert.equal(count,1);
});
test('native runtime epoch change is session loss even with valid response MAC',async()=>{
  let changed=false;
  const {gateway}=fixture(reply=>{if(changed){reply.payload=JSON.stringify({o:{e:'124',s:'observed'}});reply.mac=sign(`RQG1-REPLY|${controller}|${device}|${epoch}|${reply.nonce}|${reply.action}|${reply.payload}`);}return reply;});
  await gateway.connect();changed=true;
  await assert.rejects(gateway.read('status'),/runtime changed/);assert.equal(gateway.active,false);
});
test('plaintext network requires explicit trusted private LAN and never accepts embedded secrets',()=>{
  assert.throws(()=>endpoint('http://192.168.1.5/v1/gateway'));
  assert.equal(endpoint('http://192.168.1.5/v1/gateway','https:',true),'http://192.168.1.5/v1/gateway');
  for(const value of ['http://example.com/v1/gateway','https://user:pass@example.com','https://example.com?key=secret'])assert.throws(()=>endpoint(value,'https:',true));
});
test('relay credentials in headers only with distinct identity path',async()=>{
  const {gateway,calls}=fixture();gateway.url='https://relay.example/v1/relay/session/exchange';gateway.routeToken='private-token';await gateway.connect();
  assert.equal(calls[0].url,'https://relay.example/v1/relay/session/identity');assert.equal(calls[1].url,gateway.url);
  for(const call of calls)assert.equal(call.options.headers.Authorization,'Bearer private-token');
});

// Advance a synthetic clock through the production AbortSignal deadline without
// sleeping or changing global timers used by other tests. Responses still use
// the production request/response MAC verification and native lifetime checks.
function deadlineFixture({relay=true}={}) {
  const vm=require('node:vm'),fs=require('node:fs'),timers=[],deadlines=[],attempts=[];
  const {gateway:stub,calls}=fixture();
  let now=0,delay=0,lost=false;
  const context=vm.createContext({TextEncoder,TextDecoder,URL,crypto:webcrypto,AbortController,
    AbortSignal:{any:AbortSignal.any.bind(AbortSignal),timeout(ms){
      const controller=new AbortController();deadlines.push(ms);
      timers.push({at:now+ms,controller});return controller.signal;
    }},fetch:async(url,options)=>{
      attempts.push({url,options});
      now+=delay;
      for(const timer of timers)if(timer.at<=now)timer.controller.abort(new Error('deadline expired'));
      options.signal.throwIfAborted();
      const response=await stub.fetcher(url,options);
      return lost?{ok:false,status:504,text:async()=>'{"error":"outcome_unknown"}'}:response;
    }});
  vm.runInContext(fs.readFileSync(require.resolve('./transport.js'),'utf8'),context);
  function gateway(){return new context.ViscerealityTransport.Gateway({
    url:relay?'https://relay.example/v1/relay/session/exchange':'http://192.168.1.5/v1/gateway',
    routeToken:relay?'synthetic-route-token':'',trustedLan:!relay,controller,device,key});}
  return {gateway,calls,attempts,deadlines,setDelay(ms){delay=ms;},loseReply(value){lost=value;}};
}

test('relay accepts an authenticated reply after ten seconds but within its twelve-second host wait',async()=>{
  const f=deadlineFixture(),gateway=f.gateway();await gateway.connect();
  f.setDelay(11000);
  const id='2'.repeat(16);
  const receipt=await gateway.write(new TextEncoder().encode(JSON.stringify({v:1,id,op:'arm'})));
  assert.equal(receipt.id,id);assert.equal(receipt.state,'pending');assert.equal(gateway.active,true);
  assert.deepEqual(f.deadlines,[10000,15000,15000]);
  assert.equal(f.calls.filter(c=>c.options.method==='POST'&&JSON.parse(c.options.body).action==='command').length,1);
});

test('relay lost reply at its twelve-second bound retires transport; reconnect observes the original ID without replay',async()=>{
  const f=deadlineFixture(),gateway=f.gateway();await gateway.connect();
  const id='3'.repeat(16);f.setDelay(12000);f.loseReply(true);
  await assert.rejects(gateway.write(new TextEncoder().encode(JSON.stringify({v:1,id,op:'arm'}))),/504/);
  assert.equal(gateway.lastId,id);assert.equal(gateway.active,false);assert.equal(gateway.key,'');
  await assert.rejects(gateway.read('receipt',id),/retired/);
  f.setDelay(0);f.loseReply(false);
  const observer=f.gateway();await observer.connect();
  const observed=JSON.parse(new TextDecoder().decode(await observer.read('receipt',id)));
  assert.equal(observed.id,id);assert.equal(observed.state,'pending');
  const requests=f.calls.filter(c=>c.options.method==='POST').map(c=>JSON.parse(c.options.body));
  assert.equal(requests.filter(r=>r.action==='command').length,1);
  assert.equal(JSON.parse(requests.find(r=>r.action==='receipt').payload).id,id);
});

test('relay remains bounded and LAN retains its ten-second deadline',async()=>{
  for(const [relay,delay] of [[true,15001],[false,10001]]){
    const f=deadlineFixture({relay}),gateway=f.gateway();await gateway.connect();
    f.setDelay(delay);const before=f.attempts.length;
    await assert.rejects(gateway.write(new TextEncoder().encode('{"v":1,"id":"4444444444444444","op":"arm"}')),/deadline expired/);
    assert.equal(gateway.active,false);assert.equal(gateway.key,'');
    await assert.rejects(gateway.read('receipt','4444444444444444'),/retired/);
    assert.equal(f.attempts.length,before+1);
    if(!relay)assert.ok(f.deadlines.every(ms=>ms===10000));
  }
});


test('default browser APIs retain Window, Crypto and SubtleCrypto receivers',async()=>{
  const vm=require('node:vm'),fs=require('node:fs');
  const {gateway:stub,calls}=fixture();
  const used={random:0,importKey:0,sign:0};
  const subtle={
    importKey(...args){assert.equal(this,subtle);used.importKey++;return webcrypto.subtle.importKey(...args);},
    sign(...args){assert.equal(this,subtle);used.sign++;return webcrypto.subtle.sign(...args);}
  };
  const cryptoApi={subtle,getRandomValues(bytes){assert.equal(this,cryptoApi);used.random++;return webcrypto.getRandomValues(bytes);}};
  const context=vm.createContext({TextEncoder,TextDecoder,AbortSignal,AbortController,URL,crypto:cryptoApi,fixtureFetch:stub.fetcher});
  vm.runInContext(`globalThis.fetch=function(...args){
    if(this!==globalThis)throw new TypeError('Illegal invocation: Window receiver required');
    return fixtureFetch(...args);
  };`,context);
  vm.runInContext(fs.readFileSync(require.resolve('./transport.js'),'utf8'),context);
  const gateway=new context.ViscerealityTransport.Gateway({url:'https://gateway.example/v1/gateway',controller,device,key});
  await gateway.connect();
  assert.equal(gateway.active,true);assert.equal(calls.length,2);
  assert.deepEqual(used,{random:1,importKey:2,sign:2});
});

const timeout=()=>new DOMException('synthetic deadline','TimeoutError');
async function interruptedStatus(tamper) {
  const f=fixture(tamper);await f.gateway.connect();
  const good=f.gateway.fetcher;f.gateway.fetcher=async()=>{throw timeout();};
  await assert.rejects(f.gateway.read('status'),{name:'TimeoutError'});
  f.gateway.fetcher=good;f.gateway.waitForRecovery=async()=>{};
  return {...f,good};
}
test('status timeout disables writes then reauthenticates exact scope with fresh status only',async()=>{
  const {gateway,calls}=await interruptedStatus();
  assert.equal(gateway.active,false);assert.equal(gateway.key,key);
  await assert.rejects(gateway.write(new TextEncoder().encode('{}')),/no command sent/);
  await assert.rejects(gateway.read('receipt','1'.repeat(16)),/recovering/);
  const status=await gateway.recoverStatus();
  assert.equal(JSON.parse(new TextDecoder().decode(status)).p,'IDLE');assert.equal(gateway.active,true);
  const posts=calls.filter(c=>c.options.method==='POST').map(c=>JSON.parse(c.options.body));
  assert.deepEqual(posts.map(p=>p.action),['status','status']);assert.notEqual(posts[0].nonce,posts[1].nonce);
});
test('permanent outage ends after two attempts and erases credentials',async()=>{
  const {gateway}=await interruptedStatus();let attempts=0;
  gateway.fetcher=async()=>{attempts++;throw timeout();};
  await assert.rejects(gateway.recoverStatus(),{name:'TimeoutError'});
  assert.equal(attempts,2);assert.equal(gateway.key,'');assert.equal(gateway.retired,true);
});
for(const changed of [{enabled:false},{epoch:'124'},{device:'d'.repeat(32)}])test(`recovery denies identity change ${JSON.stringify(changed)}`,async()=>{
  const {gateway}=await interruptedStatus();let calls=0;
  gateway.fetcher=async()=>{calls++;return {ok:true,text:async()=>JSON.stringify({v:1,device,epoch,enabled:true,...changed})};};
  await assert.rejects(gateway.recoverStatus(),/changed/);assert.equal(calls,1);assert.equal(gateway.key,'');
});
for(const failure of ['http','mac','nativeEpoch'])test(`recovery ${failure} fails closed without retry`,async()=>{
  let changed=false;
  const {gateway,good}=await interruptedStatus(reply=>{
    if(changed&&failure==='mac')reply.mac='0'.repeat(64);
    if(changed&&failure==='nativeEpoch'){
      reply.payload=JSON.stringify({o:{e:'124',s:'observed'}});
      reply.mac=sign(`RQG1-REPLY|${controller}|${device}|${epoch}|${reply.nonce}|${reply.action}|${reply.payload}`);
    }return reply;
  });changed=true;let count=0;
  gateway.fetcher=async(...args)=>{count++;return failure==='http'?{ok:false,status:403}:good(...args);};
  await assert.rejects(gateway.recoverStatus());assert.equal(count,failure==='http'?1:2);assert.equal(gateway.key,'');
});
for(const stage of ['wait','GET','POST'])test(`human close cancels recovery during ${stage}`,async()=>{
  const {gateway,good}=await interruptedStatus();let entered;
  const ready=new Promise(resolve=>entered=resolve);
  if(stage==='wait')gateway.waitForRecovery=function(){entered();return Gateway.prototype.waitForRecovery.call(this,60000);};
  else gateway.fetcher=async(url,options)=>{
    if(options.method!==stage)return good(url,options);
    entered();return new Promise((_,reject)=>options.signal.addEventListener('abort',()=>reject(options.signal.reason),{once:true}));
  };
  const recovery=gateway.recoverStatus();await ready;gateway.close();await assert.rejects(recovery);
  assert.equal(gateway.active,false);assert.equal(gateway.key,'');assert.equal(gateway.retired,true);
});
test('unknown mutation timeout retires without recovery or replay',async()=>{
  const {gateway}=fixture();await gateway.connect();let writes=0;
  gateway.fetcher=async()=>{writes++;throw timeout();};
  await assert.rejects(gateway.write(new TextEncoder().encode('{"v":1,"id":"1111111111111111","op":"arm"}')));
  await assert.rejects(gateway.recoverStatus());assert.equal(writes,1);assert.equal(gateway.key,'');
});

test('two status response timeouts exhaust recovery without command or receipt dispatch',async()=>{
  const {gateway,good}=await interruptedStatus();const actions=[];
  gateway.fetcher=async(url,options)=>{
    actions.push(options.method==='GET'?'identity':JSON.parse(options.body).action);
    if(options.method==='POST')throw timeout();return good(url,options);
  };
  await assert.rejects(gateway.recoverStatus(),{name:'TimeoutError'});
  assert.deepEqual(actions,['identity','status','identity','status']);assert.equal(gateway.key,'');
});

function localFixture({identity={},join={},nativeEpoch='456',hold}={}) {
 const calls=[];const live={v:1,device,epoch,native_epoch:'456',enabled:true,serial:'SYNTHETIC-SERIAL',remote_available:true,...identity};
 const fetcher=async(url,options)=>{calls.push({url,options});let reply=live;
  if(options.method==='POST') {const request=JSON.parse(options.body);
   if(request.action==='connect'){if(hold)await hold;reply={v:1,device,epoch,serial:'SYNTHETIC-SERIAL',controller,key,...join};}
   else {const payload=JSON.stringify({v:1,o:{e:nativeEpoch,s:'observed'}});reply={v:1,device,epoch,nonce:request.nonce,action:request.action,payload,mac:sign(`RQG1-REPLY|${controller}|${device}|${epoch}|${request.nonce}|${request.action}|${payload}`)};}
  }return {ok:true,text:async()=>JSON.stringify(reply)};};
 return {calls,live,options:{url:'http://192.168.43.2:8766/v1/gateway',fetcher,cryptoApi:webcrypto,expected:{device,serial:'SYNTHETIC-SERIAL',epoch,native_epoch:'456'}}};
}
test('local join returns ordinary authenticated Gateway after exact bootstrap and fresh native status',async()=>{
 const {localJoin}=require('./transport.js');assert.equal(typeof localJoin,'function','key-free local join is required');
 const f=localFixture(),result=await localJoin(f.options);assert.ok(result.gateway instanceof Gateway);assert.equal(result.gateway.active,true);assert.equal(result.gateway.nativeEpoch,'456');
 assert.deepEqual(JSON.parse(f.calls[1].options.body),{v:1,action:'connect',device,epoch});
 assert.deepEqual(f.calls.map(c=>c.options.method),['GET','POST','POST']);
 for(const c of f.calls){assert.equal(c.options.cache,'no-store');assert.equal(c.options.redirect,'error');assert.equal(c.options.credentials,'omit');assert.ok(c.options.signal);}
 result.gateway.close();assert.equal(result.gateway.key,'');
});
for(const field of ['serial','device','epoch','native_epoch','remote_available'])test(`local join denies mismatching live ${field} before bootstrap`,async()=>{
 const {localJoin}=require('./transport.js');assert.ok(localJoin);const f=localFixture({identity:{[field]:field==='remote_available'?false:'wrong'}});await assert.rejects(localJoin(f.options));assert.equal(f.calls.length,1);
});
test('remembered endpoint matches serial/device but binds fresh epochs without BLE inventory API',async()=>{
 const {localJoin}=require('./transport.js');assert.ok(localJoin);const f=localFixture();delete f.options.expected.epoch;delete f.options.expected.native_epoch;
 const result=await localJoin(f.options);assert.equal(result.gateway.epoch,'123');result.gateway.close();
});
for(const field of ['serial','device','epoch','key','controller'])test(`local join rejects mismatching or malformed bootstrap ${field}`,async()=>{
 const {localJoin}=require('./transport.js');assert.ok(localJoin);const f=localFixture({join:{[field]:'wrong'}});await assert.rejects(localJoin(f.options));assert.equal(f.calls.length,2);
});
test('native owner changes before first status cannot admit controls',async()=>{
 const {localJoin}=require('./transport.js');assert.ok(localJoin);const f=localFixture({nativeEpoch:'457'});await assert.rejects(localJoin(f.options),/native|identity/i);
});
test('abandoned local bootstrap settles promptly and late completion cannot create a Gateway',async()=>{
 const {localJoin}=require('./transport.js');assert.ok(localJoin);let release;const f=localFixture({hold:new Promise(resolve=>release=resolve)}),abort=new AbortController();
 const pending=localJoin({...f.options,signal:abort.signal});await new Promise(setImmediate);abort.abort();await assert.rejects(pending);release();await new Promise(setImmediate);assert.equal(f.calls.length,2);
});

function recoveryFixture() {
  let identity={},status={},failure;
  const f=fixture(reply=>{
    if(reply.action==='status'){
      reply.payload=JSON.stringify({v:1,m:'gated',wifi_snapshot:1,control_mode:'remote',p:'RUNNING',g:2,r:3,c:'test',rec:true,co:false,ms:25000,st:'ok',pending:false,h:'hidden',pi:{r:true,f:true,h:false},o:{v:1,s:'observed',e:epoch,i:'900',g:2,r:3,a:0},...status});
      reply.mac=sign(`RQG1-REPLY|${controller}|${device}|${epoch}|${reply.nonce}|${reply.action}|${reply.payload}`);
      if(failure==='mac')reply.mac='0'.repeat(64);
    }return reply;
  });
  const good=f.gateway.fetcher;
  f.gateway.serial='SYNTHETIC-SERIAL';f.gateway.guest=true;
  f.gateway.fetcher=async(url,options)=>{
    if(failure==='network')throw new TypeError('Failed to fetch');
    if(failure==='timeout')throw timeout();
    if(failure==='http503')return {ok:false,status:503};
    if(options.method==='GET')return {ok:true,text:async()=>JSON.stringify({v:1,device,epoch,native_epoch:epoch,serial:'SYNTHETIC-SERIAL',enabled:true,remote_available:true,...identity})};
    if(failure==='guest403')return {ok:false,status:403};
    return good(url,options);
  };
  return {...f,setIdentity(value){identity=value;},setStatus(value){status=value;},fail(value){failure=value;}};
}
test('TypeError read outage retains guest and one-attempt recovery never replays a command or enables UI early',async()=>{
  const f=recoveryFixture(),g=f.gateway;await g.connect();const originalNativeEpoch=g.nativeEpoch;
  await g.write(new TextEncoder().encode('{"v":1,"id":"1111111111111111","op":"arm"}'));
  f.fail('network');await assert.rejects(g.read('status'),e=>e.kind==='transient');assert.equal(g.key,key);assert.equal(g.retired,false);assert.equal(g.active,false);
  f.fail();const result=await g.recoverStatusOnce();assert.equal(result.kind,'success');assert.equal(result.value.o.e,originalNativeEpoch);assert.equal(g.active,false);
  await assert.rejects(g.write(new TextEncoder().encode('{}')),/no command sent/);
  assert.equal(g.acceptRecoveredStatus({...result.value}),false);assert.equal(g.acceptRecoveredStatus(result.value),true);assert.equal(g.active,true);
  const requests=f.calls.filter(c=>c.options.method==='POST').map(c=>JSON.parse(c.options.body));assert.equal(requests.filter(r=>r.action==='command').length,1);
  assert.equal(new Set(requests.map(r=>r.controller)).size,1);
});
for(const failure of ['network','timeout','http503'])test(`${failure} is retryable and does not erase same-memory recovery key`,async()=>{
  const f=recoveryFixture();await f.gateway.connect();f.fail(failure);const result=await f.gateway.recoverStatusOnce();
  assert.equal(result.kind,'retry');assert.equal(result.error.kind,'transient');assert.equal(f.gateway.key,key);assert.equal(f.gateway.active,false);
});
for(const remote of [false])test('Direct/Choose availability waits without a status dispatch or command',async()=>{
  const f=recoveryFixture();await f.gateway.connect();const before=f.calls.length;f.setIdentity({remote_available:remote});
  const result=await f.gateway.recoverStatusOnce();assert.equal(result.kind,'retry');assert.equal(result.error.kind,'availability');assert.equal(f.calls.length,before);assert.equal(f.gateway.key,key);
});
for(const [change,kind]of [[{device:'d'.repeat(32)},'integrity'],[{serial:'OTHER-SERIAL'},'integrity'],[{epoch:'124'},'rejoin-needed'],[{native_epoch:'124'},'rejoin-needed']])test(`one-attempt recovery fences identity ${JSON.stringify(change)}`,async()=>{
  const f=recoveryFixture();await f.gateway.connect();f.setIdentity(change);const result=await f.gateway.recoverStatusOnce();
  assert.equal(result.kind,'blocked');assert.equal(result.error.kind,kind);assert.equal(f.gateway.key,'');assert.equal(f.gateway.retired,true);
});
for(const failure of ['guest403','mac'])test(`${failure} requires rejoin or integrity block without retry`,async()=>{
  const f=recoveryFixture();await f.gateway.connect();f.fail(failure);const result=await f.gateway.recoverStatusOnce();
  assert.equal(result.kind,'blocked');assert.equal(result.error.kind,failure==='guest403'?'rejoin-needed':'integrity');assert.equal(f.gateway.key,'');
});
test('signed native owner change is rejoin-needed and missing observation is unavailable',async()=>{
  for(const [o,kind]of [[{v:1,s:'observed',e:'124'},'rejoin-needed'],[{v:1,s:'unknown'},'availability']]){
    const f=recoveryFixture();await f.gateway.connect();f.setStatus({o});const result=await f.gateway.recoverStatusOnce();assert.equal(result.error.kind,kind);assert.equal(result.kind,kind==='availability'?'retry':'blocked');
  }
});
for(const stage of ['GET','POST','body'])test(`external cancellation during ${stage} settles even when I/O ignores abort and late result cannot enable authority`,async()=>{
  const f=recoveryFixture();await f.gateway.connect();const good=f.gateway.fetcher;let release,entered;
  const ready=new Promise(resolve=>entered=resolve),hold=new Promise(resolve=>release=resolve);
  f.gateway.fetcher=async(url,options)=>{
    if(options.method===(stage==='body'?'POST':stage)){entered();if(stage==='body')return {ok:true,text:()=>hold};await hold;}
    return good(url,options);
  };
  const abort=new AbortController(),pending=f.gateway.recoverStatusOnce({signal:abort.signal});await ready;abort.abort();await assert.rejects(pending,{name:'AbortError'});release('{}');await new Promise(setImmediate);
  assert.equal(f.gateway.active,false);assert.equal(f.gateway.retired,false);assert.equal(f.gateway.key,key);
});
test('pre-cancelled recovery sends nothing and cancellation after success invalidates acceptance',async()=>{
  const f=recoveryFixture();await f.gateway.connect();const abort=new AbortController();abort.abort();const before=f.calls.length;
  await assert.rejects(f.gateway.recoverStatusOnce({signal:abort.signal}),{name:'AbortError'});assert.equal(f.calls.length,before);
  const next=new AbortController(),result=await f.gateway.recoverStatusOnce({signal:next.signal});next.abort();assert.equal(f.gateway.acceptRecoveredStatus(result.value),false);
});
test('request deadlines cover stalled response bodies for LAN and relay without closing retryable status authority',async()=>{
  const vm=require('node:vm'),fs=require('node:fs');
  for(const relay of [false,true]){
    let controllerForDeadline;const deadlines=[];
    const context=vm.createContext({TextEncoder,TextDecoder,URL,AbortController,crypto:webcrypto,fetch:async()=>({ok:true,text:()=>new Promise(()=>{})}),AbortSignal:{any:AbortSignal.any.bind(AbortSignal),timeout(ms){deadlines.push(ms);controllerForDeadline=new AbortController();return controllerForDeadline.signal;}}});
    vm.runInContext(fs.readFileSync(require.resolve('./transport.js'),'utf8'),context);
    const g=new context.ViscerealityTransport.Gateway({url:relay?'https://relay.example/v1/relay/test/exchange':'https://gateway.example',routeToken:relay?'synthetic':'',controller,device,key});
    const pending=g.request('POST',{action:'status'});await new Promise(setImmediate);controllerForDeadline.abort(timeout());await assert.rejects(pending,e=>e.kind==='transient');assert.deepEqual(deadlines,[relay?15000:10000]);
  }
});
test('integrity failure in ordinary status cannot later masquerade as permission to rejoin',async()=>{
  const f=recoveryFixture();await f.gateway.connect();f.fail('mac');await assert.rejects(f.gateway.read('status'),e=>e.kind==='integrity');
  const result=await f.gateway.recoverStatusOnce();assert.equal(result.kind,'blocked');assert.equal(result.error.kind,'integrity');assert.equal(result.error.code,'reply-mac');
});
test('only a connected observed owner and the latest unconsumed recovery object can be accepted',async()=>{
  const f=recoveryFixture();assert.equal(f.gateway.acceptRecoveredStatus(undefined),false);
  const disconnected=await f.gateway.recoverStatusOnce();assert.equal(disconnected.kind,'blocked');assert.equal(disconnected.error.code,'not-connected');
  await f.gateway.connect();const first=await f.gateway.recoverStatusOnce(),second=await f.gateway.recoverStatusOnce();
  assert.equal(f.gateway.acceptRecoveredStatus(first.value),false);assert.equal(f.gateway.acceptRecoveredStatus(second.value),true);assert.equal(f.gateway.acceptRecoveredStatus(second.value),false);
});
test('same-memory local guest binds its physical serial and native epoch for subsequent recovery',async()=>{
  const {localJoin}=require('./transport.js'),f=localFixture();const result=await localJoin(f.options);
  assert.equal(result.gateway.serial,'SYNTHETIC-SERIAL');assert.equal(result.gateway.guest,true);
  delete f.live.native_epoch;const recovery=await result.gateway.recoverStatusOnce();assert.equal(recovery.kind,'blocked');assert.equal(recovery.error.kind,'integrity');
});
test('initial wrong physical identity retires key and remains an integrity block',async()=>{
  const f=recoveryFixture();f.setIdentity({device:'d'.repeat(32)});await assert.rejects(f.gateway.connect(),e=>e.kind==='integrity');assert.equal(f.gateway.key,'');
  const result=await f.gateway.recoverStatusOnce();assert.equal(result.error.kind,'integrity');
});
test('ordinary expired-guest status retires the key but permits only fresh physically verified rejoin',async()=>{
  const f=recoveryFixture();await f.gateway.connect();f.fail('guest403');
  await assert.rejects(f.gateway.read('status'),e=>e.kind==='rejoin-needed' && e.code==='guest-expired');assert.equal(f.gateway.key,'');
  const result=await f.gateway.recoverStatusOnce();assert.equal(result.kind,'blocked');assert.equal(result.error.kind,'rejoin-needed');assert.equal(result.error.code,'guest-expired');
});
test('real Gateway with neutral scheduler retries read outage, restores one authenticated snapshot and never dispatches mutations',async()=>{
  const {RecoveryController}=require('./connection-recovery.js'),f=recoveryFixture();await f.gateway.connect();f.fail('network');
  const scheduled=[],states=[];let active=0,max=0;
  const recovery=new RecoveryController({attempt:async({signal})=>{max=Math.max(max,++active);try{return await f.gateway.recoverStatusOnce({signal});}finally{active--;}} ,onState:s=>states.push(s),setTimeout(callback,ms){scheduled.push({callback,ms});return scheduled.length;},clearTimeout(){}});
  recovery.start();await new Promise(setImmediate);assert.equal(states.at(-1).state,'waiting');assert.equal(scheduled[0].ms,1000);assert.equal(f.gateway.key,key);
  f.fail();scheduled.shift().callback();for(let i=0;i<10 && states.at(-1).state!=='recovered';i++)await new Promise(setImmediate);
  assert.equal(states.at(-1).state,'recovered');assert.equal(states.at(-1).value.o.e,epoch);assert.equal(max,1);assert.equal(f.gateway.active,false);
  assert.deepEqual(f.calls.filter(c=>c.options.method==='POST').map(c=>JSON.parse(c.options.body).action),['status','status']);recovery.stop();
});

test('exact native zero-owner identity retries availability then fences a new lifetime for verified same-headset rejoin',async()=>{
  const {RecoveryController}=require('./connection-recovery.js'),{localJoin}=require('./transport.js');
  const f=recoveryFixture();await f.gateway.connect();
  f.setIdentity({v:1,device,serial:'SYNTHETIC-SERIAL',epoch,native_epoch:'0',enabled:false,remote_available:false});
  const scheduled=[],states=[];let notify;
  const waitState=()=>new Promise(resolve=>notify=resolve);
  const recovery=new RecoveryController({attempt:({signal})=>f.gateway.recoverStatusOnce({signal}),onState:state=>{states.push(state);if(['waiting','blocked'].includes(state.state))notify(state);},setTimeout(callback,ms){scheduled.push({callback,ms});return scheduled.length;},clearTimeout(){}});
  const waiting=waitState();recovery.start();const unavailable=await waiting;
  assert.equal(unavailable.state,'waiting');assert.equal(unavailable.error.kind,'availability');assert.equal(unavailable.error.code,'native-unavailable');assert.equal(scheduled[0].ms,1000);
  assert.equal(f.gateway.retired,false);assert.equal(f.gateway.key,key);assert.equal(f.gateway.active,false);
  assert.equal(f.gateway.acceptRecoveredStatus(undefined),false);
  assert.deepEqual(f.calls.filter(c=>c.options.method==='POST').map(c=>JSON.parse(c.options.body).action),['status']);
  f.setIdentity({native_epoch:'124'});const blocked=waitState();scheduled.shift().callback();const changed=await blocked;
  assert.equal(changed.state,'blocked');assert.equal(changed.error.kind,'rejoin-needed');assert.equal(changed.error.code,'native-lifetime');assert.equal(f.gateway.key,'');
  const joined=localFixture({identity:{native_epoch:'124'},nativeEpoch:'124'});joined.options.expected.native_epoch='124';
  const fresh=await localJoin(joined.options);assert.equal(fresh.identity.device,device);assert.equal(fresh.identity.serial,'SYNTHETIC-SERIAL');assert.equal(fresh.status.o.e,'124');
  const result=await fresh.gateway.recoverStatusOnce();assert.equal(result.kind,'success');assert.equal(result.value.o.e,'124');assert.equal(fresh.gateway.active,false);
  const actions=[...f.calls,...joined.calls].filter(c=>c.options.method==='POST').map(c=>JSON.parse(c.options.body).action);
  assert.equal(actions.filter(action=>action==='command').length,0);recovery.stop();fresh.gateway.close();
});

for(const malformed of [
  {device:'d'.repeat(32)},{serial:'OTHER-SERIAL'},{epoch:'0'},{epoch:'124'},
  {native_epoch:'00'},{native_epoch:0},{native_epoch:null},{native_epoch:undefined},
  {enabled:true},{enabled:'false'},{enabled:undefined},
  {remote_available:true},{remote_available:'false'},{remote_available:undefined}
])test(`zero-owner exception rejects wrong physical or malformed identity ${JSON.stringify(malformed)}`,async()=>{
  const f=recoveryFixture();await f.gateway.connect();
  f.setIdentity({native_epoch:'0',enabled:false,remote_available:false,...malformed});
  const result=await f.gateway.recoverStatusOnce();assert.equal(result.kind,'blocked');assert.equal(result.error.kind,'integrity');assert.equal(f.gateway.retired,true);assert.equal(f.gateway.key,'');
  assert.deepEqual(f.calls.filter(c=>c.options.method==='POST').map(c=>JSON.parse(c.options.body).action),['status']);
});
