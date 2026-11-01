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
for(const [name,mutation] of [['pending','pendingOriginal={state:"uncertain"}'],['busy','commandBusy=true'],['native pending','questStatus.pending=true'],['unknown recording','delete questStatus.rec'],['export','recordingTransfer={busy:true}'],['offer','recordingTransfer={hasOffer:true}'],['hidden','document.hidden=true']])test(`PWA safety denies ${name}`,async()=>{
 const f=fixture();await f.connect();f.head.phase='IDLE';f.head.mutate=s=>({...s,rec:false});await f.run('refreshStatus()');f.run(mutation);
 assert.equal(f.run('typeof ViscerealityUpdateSafety==="object"&&ViscerealityUpdateSafety.acquire("test")'),false);
 assert.deepEqual(f.head.writes,[]);
});
test('stale snapshot and changed recording state veto an already frozen update',async()=>{
 const f=fixture();await f.connect();f.head.phase='IDLE';f.head.mutate=s=>({...s,rec:false});await f.run('refreshStatus()');
 assert.equal(f.run('typeof ViscerealityUpdateSafety==="object"&&ViscerealityUpdateSafety.acquire("test")'),true);
 f.now(7001);assert.equal(f.run('ViscerealityUpdateSafety.check("test")'),false);assert.deepEqual(f.head.writes,[]);
});
