const test=require('node:test'),assert=require('node:assert/strict');
const {fixture}=require('./app-recovery.test.cjs');
test('PWA safety requires fresh authenticated native idle and freezes command/export starts',async()=>{
 const f=fixture();await f.connect();assert.equal(f.run('typeof ViscerealityUpdateSafety'), 'object');
 assert.equal(f.run('ViscerealityUpdateSafety.acquire("run")'),false);
 f.head.phase='IDLE';f.head.mutate=s=>({...s,rec:false,recordings:1});await f.run('refreshStatus()');
 assert.equal(f.run('ViscerealityUpdateSafety.acquire("idle")'),true);
 assert.equal(f.run('canCommand()'),false);assert.equal(f.run('canListRecordings()'),false);
 await f.run('sendSessionControl("start")');assert.deepEqual(f.head.writes,[]);
 assert.equal(f.run('ViscerealityUpdateSafety.check("idle")'),true);
 f.run('ViscerealityUpdateSafety.release("idle")');assert.equal(f.run('canCommand()'),true);
});
for(const [name,mutation] of [['pending','pendingOriginal={state:"uncertain"}'],['busy','commandBusy=true'],['native pending','questStatus.pending=true'],['unknown recording','delete questStatus.rec'],['export','recordingTransfer={busy:true,cancel(){}}'],['offer','recordingTransfer={hasOffer:true,cancel(){}}'],['hidden','document.hidden=true']])test(`PWA safety denies ${name}`,async()=>{
 const f=fixture();await f.connect();f.head.phase='IDLE';f.head.mutate=s=>({...s,rec:false});await f.run('refreshStatus()');f.run(mutation);
 assert.equal(f.run('typeof ViscerealityUpdateSafety==="object"&&ViscerealityUpdateSafety.acquire("test")'),false);
 assert.deepEqual(f.head.writes,[]);
});
test('stale snapshot and changed recording state veto an already frozen update',async()=>{
 const f=fixture();await f.connect();f.head.phase='IDLE';f.head.mutate=s=>({...s,rec:false});await f.run('refreshStatus()');
 assert.equal(f.run('typeof ViscerealityUpdateSafety==="object"&&ViscerealityUpdateSafety.acquire("test")'),true);
 f.now(7001);assert.equal(f.run('ViscerealityUpdateSafety.check("test")'),false);assert.deepEqual(f.head.writes,[]);
});

for(const recovered of [false,true])test(`unknown ${recovered?'reconciled':'direct'} command result stays blocked until operator acknowledgement`,async()=>{
 const f=fixture();await f.connect();f.head.phase='IDLE';f.head.mutate=s=>({...s,rec:false});await f.run('refreshStatus()');
 f.head.receiptState='outcome_unknown';f.head.receiptDetail='UNKNOWN_RESULT';
 if(recovered){f.run('pendingOriginal={id:"1111111111111111",deviceId:ownerIdentity(),epoch:"7",name:"Return to VR",op:"return-vr",state:"observing"};saveOriginal()');await f.run('refreshStatus()');await f.run('refreshStatus()');}
 else await f.run('sendCommand("return-vr","Return to VR")');
 assert.match(f.node('command-detail').textContent,/UNKNOWN_RESULT/);assert.equal(f.run('freshStatus()'),true);
 assert.equal(f.run('ViscerealityUpdateSafety.acquire("unknown")'),false);
 assert.equal(f.run('pendingOriginal.state'),'uncertain');
 const writes=f.head.writes.length;f.run('acknowledgeUnknownOriginal()');assert.equal(f.run('pendingOriginal'),null);
 assert.equal(f.run('ViscerealityUpdateSafety.acquire("settled")'),true);assert.equal(f.head.writes.length,writes);
});
async function appPwaFixture(){
 const f=fixture();await f.connect();f.head.phase='IDLE';f.head.mutate=s=>({...s,rec:false});await f.run('refreshStatus()');
 const workerEvents={},worker={postMessage(m,ports){ports?.[0]?.postMessage({type:'OFFLINE_READY',cache:'viscereality-shell-pwa-8',ready:true});}};
 const registration={active:worker,waiting:worker,addEventListener(){}};let reloads=0;
 f.context.navigator.serviceWorker={register:async()=>registration,ready:Promise.resolve(registration),addEventListener:(n,fn)=>workerEvents[n]=fn};
 f.context.window.matchMedia=()=>({matches:false,addEventListener(){}});f.context.location.reload=()=>reloads++;
 f.context.MessageChannel=function(){this.port1={close(){}};this.port2={close(){},postMessage:data=>queueMicrotask(()=>this.port1.onmessage?.({data}))};};
 require('node:vm').runInContext(require('node:fs').readFileSync(require.resolve('./pwa.js'),'utf8'),f.context);await new Promise(r=>setImmediate(r));
 return {f,get reloads(){return reloads;},message(type,phase){let reply;workerEvents.message({source:worker,data:{type,protocol:1,token:'actual-app',phase},ports:[{postMessage:m=>reply=m}]});return reply;}};
}
test('actual app COMMIT reloads once with a fresh idle read-only status poll still in flight',async()=>{
 const p=await appPwaFixture(),f=p.f;assert.equal(p.message('RQ_UPDATE_CHECK','freeze').safe,true);
 let release;f.head.hold=new Promise(r=>release=r);const poll=f.run('refreshStatus()');await new Promise(r=>setImmediate(r));
 assert.equal(f.run('reading'),true);assert.equal(f.run('freshStatus()'),true);
 assert.equal(p.message('RQ_UPDATE_CHECK','confirm').safe,true);p.message('RQ_UPDATE_COMMIT');p.message('RQ_UPDATE_COMMIT');
 assert.equal(p.reloads,1);assert.deepEqual(f.head.writes,[]);release();await poll;
});
for(const mutation of ['questStatus.pending=true','pendingOriginal={state:"uncertain"}','recordingTransfer={busy:true,cancel(){}}','recordingTransfer={hasOffer:true,cancel(){}}'])test(`actual app COMMIT still vetoes ${mutation}`,async()=>{
 const p=await appPwaFixture();assert.equal(p.message('RQ_UPDATE_CHECK','freeze').safe,true);p.f.run(mutation);p.message('RQ_UPDATE_COMMIT');assert.equal(p.reloads,0);assert.deepEqual(p.f.head.writes,[]);
});
