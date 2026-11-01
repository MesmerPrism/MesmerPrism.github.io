const test=require('node:test'),assert=require('node:assert/strict');
const {fixture,tick}=require('./app-recovery.test.cjs');
test('saved controls require explicit APK capability, fresh idle Remote and local Wi-Fi',async()=>{
 const f=fixture();await f.connect();assert.equal(f.run('typeof canListRecordings==="function"&&canListRecordings()'),false);
 f.head.phase='IDLE';f.head.mutate=s=>({...s,rec:false,recordings:1});await f.run('refreshStatus()');assert.equal(f.run('typeof canListRecordings==="function"&&canListRecordings()'),true);
 for(const route of ["lan","direct"]){f.run(`selectedRoute="${route}"`);assert.equal(f.run("canListRecordings()"),true);}
 f.run('selectedRoute="relay"');assert.equal(f.run("canListRecordings()"),false);f.run('selectedRoute="local"');
 f.run('networkTransport.routeToken="relay-token";render()');assert.equal(f.run('canListRecordings()'),false);f.run('networkTransport.routeToken="";pendingOriginal={state:"uncertain"};render()');assert.equal(f.run('canListRecordings()'),false);
 assert.equal(f.head.writes.length,0);
});
test('hidden retires preparation and removes prepared offer without command replay',async()=>{
 const f=fixture();await f.connect();assert.equal(f.run('typeof recordingExportState==="function"'),true);
 f.run('recordingTransfer={busy:false,hasOffer:true,cancel(){this.hasOffer=false;}}');assert.equal(f.run('recordingExportState().preparedOffer'),true);
 f.context.document.hidden=true;f.events.get('visibilitychange')?.();await tick();assert.equal(f.run('recordingExportState().preparedOffer'),false);assert.deepEqual(f.head.writes,[]);
});

test('export yields wait for a concurrently pending status observation before continuing',async()=>{
 const f=fixture();await f.connect();f.head.phase='IDLE';f.head.mutate=s=>({...s,rec:false,recordings:1});await f.run('refreshStatus()');
 f.run('reading=true;let exportYieldSettled=false;let exportYieldError;const exportYield=makeRecordingTransfer().yieldStatus().then(()=>exportYieldSettled=true,e=>{exportYieldSettled=true;exportYieldError=e;});');await tick();
 const first=[...f.timers.entries()].find(([,t])=>!t.interval&&t.ms<=10);assert.ok(first);f.timers.delete(first[0]);first[1].fn();await tick();assert.equal(f.run('exportYieldSettled'),false,'a pending status must not abort a valid export');
 f.run('reading=false');const second=[...f.timers.entries()].find(([,t])=>!t.interval&&t.ms<=10);assert.ok(second);f.timers.delete(second[0]);second[1].fn();await tick();
 for(let i=0;i<8&&!f.run('exportYieldSettled');i++){await tick();for(const [id,t] of [...f.timers])if(!t.interval&&t.ms===0){f.timers.delete(id);t.fn();}}
 assert.equal(f.run('exportYieldSettled'),true);assert.equal(f.run('exportYieldError'),undefined);assert.deepEqual(f.head.writes,[]);
});

test('a saved list never carries a previous headset identity into a new connection',async()=>{
 const f=fixture();await f.connect();f.head.phase='IDLE';f.head.mutate=s=>({...s,rec:false,recordings:1});await f.run('refreshStatus()');
 f.run('recordingEntries=[{id:"utc-ns-01725000000000000000",condition:"condition-a",disposition:"finalized-early",exportable:true}];recordingNext="utc-ns-01725000000000000000";recordingListScope=recordingScope();connectionGeneration++;render();');
 assert.equal(f.run('recordingEntries.length'),0);assert.equal(f.run('recordingNext'),null);assert.deepEqual(f.head.writes,[]);
});
