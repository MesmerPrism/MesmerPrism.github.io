const test=require('node:test'),assert=require('node:assert/strict');
let RecoveryController;
try { ({RecoveryController}=require('./connection-recovery.js')); }
catch(error) { if(error.code!=='MODULE_NOT_FOUND')throw error; }
const tick=()=>new Promise(setImmediate);
function clock() {
  let now=0,next=0;const pending=new Map(),delays=[];
  return {pending,delays,setTimeout(callback,ms){const id=++next;pending.set(id,{at:now+ms,callback});delays.push(ms);return id;},
    clearTimeout(id){pending.delete(id);},async advance(ms){now+=ms;for(const [id,timer]of [...pending])if(timer.at<=now){pending.delete(id);timer.callback();}await tick();}};
}
function create(attempt) {
  assert.equal(typeof RecoveryController,'function','production recovery controller is required');
  const timers=clock(),states=[];
  const controller=new RecoveryController({attempt,onState:state=>states.push(state),setTimeout:timers.setTimeout,clearTimeout:timers.clearTimeout});
  return {controller,timers,states};
}
test('read retries use 1/2/4/8/15/15 seconds and success stops scheduling',async()=>{
  let calls=0;const f=create(async()=>++calls===7?{kind:'success',value:'fresh'}:{kind:'retry'});
  f.controller.start();await tick();
  for(const delay of [1000,2000,4000,8000,15000,15000]){assert.equal(f.timers.pending.size,1);await f.timers.advance(delay-1);const before=calls;await f.timers.advance(1);assert.equal(calls,before+1);}
  assert.deepEqual(f.timers.delays,[1000,2000,4000,8000,15000,15000]);assert.equal(f.timers.pending.size,0);
  assert.equal(f.states.at(-1).state,'recovered');assert.equal(f.states.at(-1).value,'fresh');
});
test('blocked integrity never retries, including suspend/resume',async()=>{
  let calls=0;const f=create(async()=>{calls++;return {kind:'blocked',error:{kind:'integrity'}};});
  f.controller.start();await tick();f.controller.suspend();f.controller.resume();await f.timers.advance(60000);
  assert.equal(calls,1);assert.equal(f.timers.pending.size,0);assert.equal(f.states.at(-1).state,'blocked');
});
for(const operation of ['suspend','stop','start'])test(`${operation} aborts old attempt and ignores late success without overlapping callbacks`,async()=>{
  let release,active=0,max=0;const signals=[],generations=[];
  const f=create(async({signal,generation})=>{signals.push(signal);generations.push(generation);max=Math.max(max,++active);try{if(signals.length===1)await new Promise(resolve=>release=resolve);return {kind:'success',value:signals.length};}finally{active--;}});
  f.controller.start();await tick();f.controller[operation]();assert.equal(signals[0].aborted,true);assert.equal(f.timers.pending.size,0);
  if(operation==='suspend')f.controller.resume();await tick();assert.equal(signals.length,1);
  release();await tick();await tick();assert.equal(max,1);
  if(operation==='stop'){assert.equal(signals.length,1);assert.equal(f.states.at(-1).state,'stopped');}
  else {assert.equal(signals.length,2);assert.ok(generations[1]>generations[0]);assert.equal(f.states.filter(s=>s.state==='recovered').length,1);assert.equal(f.states.at(-1).value,2);}
});
test('hidden and stopped controllers retain no timer and resume requires a fresh read',async()=>{
  let calls=0;const f=create(async()=>{calls++;return {kind:'retry'};});
  f.controller.start();await tick();f.controller.suspend();assert.equal(f.timers.pending.size,0);await f.timers.advance(60000);assert.equal(calls,1);
  f.controller.resume();await tick();assert.equal(calls,2);assert.equal(f.timers.delays.at(-1),1000);
  f.controller.stop();assert.equal(f.timers.pending.size,0);f.controller.resume();await f.timers.advance(60000);assert.equal(calls,2);
});
test('callback rejection fails closed and onState can stop before attempt dispatch',async()=>{
  const f=create(async()=>{throw Error('unexpected callback failure');});f.controller.start();await tick();assert.equal(f.states.at(-1).state,'blocked');assert.equal(f.timers.pending.size,0);
  let calls=0,controller;controller=new RecoveryController({attempt:async()=>{calls++;return {kind:'success'};},onState:s=>{if(s.state==='attempting')controller.stop();}});
  controller.start();await tick();assert.equal(calls,0);
});
test('late retired timer cannot clear a replacement timer or dispatch an old attempt',async()=>{
  let calls=0;const f=create(async()=>{calls++;return {kind:'retry'};});f.controller.start();await tick();const old=[...f.timers.pending.values()][0].callback;
  f.controller.start();await tick();old();assert.equal(calls,2);f.controller.stop();assert.equal(f.timers.pending.size,0);
});
