const test=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs');
function fixture(states=[true],late=false){
 const handlers={},sent=[],requests=[];let skipped=0,enumerations=0;
 function MessageChannel(){this.port1={close(){}};this.port2={close(){},postMessage:data=>queueMicrotask(()=>this.port1.onmessage?.({data}))};}
 const clients=states.map((safe,i)=>({id:String(i),url:'https://example.test/viscereality-control/',postMessage(m,ports){sent.push({id:this.id,...m});if(ports?.[0]&&safe!==null)ports[0].postMessage({type:'RQ_UPDATE_SAFE',protocol:1,token:m.token,safe:typeof safe==='function'?safe(m):safe});}}));
 vm.runInNewContext(fs.readFileSync(require.resolve('./sw.js'),'utf8'),{URL,Set,Map,Promise,MessageChannel,crypto:require('node:crypto').webcrypto,setTimeout:(f)=>setTimeout(f,10),clearTimeout,
 self:{location:{href:'https://example.test/viscereality-control/sw.js',origin:'https://example.test'},registration:{scope:'https://example.test/viscereality-control/'},clients:{async matchAll(options){requests.push(options);if(late&&++enumerations===2)clients.push({id:'late',url:clients[0].url,postMessage(){}});return clients;},async claim(){}},async skipWaiting(){skipped++;},addEventListener:(n,f)=>handlers[n]=f},
 caches:{open:async()=>({addAll:async()=>{},match:async()=>({})}),keys:async()=>[],delete:async()=>{}}});
 async function apply(){let work,reply;handlers.message({data:{type:'APPLY_UPDATE',protocol:1},source:clients[0],ports:[{postMessage:m=>reply=m}],waitUntil:p=>work=p});await work;return reply;}
 async function activate(){let work;handlers.activate({waitUntil:p=>work=p});await work;}
 return {apply,activate,sent,requests,get skipped(){return skipped;}};
}
test('all controlled safe clients approve explicit apply and receive one commit after activation',async()=>{
 const f=fixture([true,true]);assert.equal(f.skipped,0);const reply=await f.apply();assert.equal(reply?.type,'UPDATE_APPROVED');assert.equal(f.skipped,1);
 assert.equal(f.sent.filter(m=>m.type==='RQ_UPDATE_COMMIT').length,0);await f.activate();assert.equal(f.sent.filter(m=>m.type==='RQ_UPDATE_COMMIT').length,2);
 assert.ok(f.requests.every(o=>o.type==='window'&&o.includeUncontrolled===true));
});
for(const [name,states,late] of [['unsafe sibling',[true,false]],['legacy unresponsive sibling',[true,null]],['new client during check',[true],true],['changed state',[m=>m.phase==='freeze',true]]])test(`${name} blocks activation and releases frozen clients`,async()=>{
 const f=fixture(states,late),reply=await f.apply();assert.equal(reply?.type,'UPDATE_BLOCKED');assert.equal(f.skipped,0);assert.ok(f.sent.some(m=>m.type==='RQ_UPDATE_RELEASE'));assert.equal(f.sent.filter(m=>m.type==='RQ_UPDATE_COMMIT').length,0);
});
