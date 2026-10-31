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
