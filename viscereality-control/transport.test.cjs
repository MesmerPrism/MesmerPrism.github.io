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


test('default browser APIs retain Window, Crypto and SubtleCrypto receivers',async()=>{
  const vm=require('node:vm'),fs=require('node:fs');
  const {gateway:stub,calls}=fixture();
  const used={random:0,importKey:0,sign:0};
  const subtle={
    importKey(...args){assert.equal(this,subtle);used.importKey++;return webcrypto.subtle.importKey(...args);},
    sign(...args){assert.equal(this,subtle);used.sign++;return webcrypto.subtle.sign(...args);}
  };
  const cryptoApi={subtle,getRandomValues(bytes){assert.equal(this,cryptoApi);used.random++;return webcrypto.getRandomValues(bytes);}};
  const context=vm.createContext({TextEncoder,TextDecoder,AbortSignal,URL,crypto:cryptoApi,fixtureFetch:stub.fetcher});
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
