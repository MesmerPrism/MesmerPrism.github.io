const test=require('node:test'),assert=require('node:assert/strict');
const {SnapshotState}=require('./snapshot-state.js');
const base=()=>({v:1,m:'gated',wifi_snapshot:1,control_mode:'remote',p:'RUNNING',g:7,r:3,c:'condition-a',rec:true,co:'NOT_REACHED',ms:25000,st:'ready',pending:false,h:'vr-session',pi:{r:true,f:true,h:false},o:{v:1,s:'observed',e:'7',i:'11',g:7,r:3,a:0}});
function fixture(){let now=1000;const state=new SnapshotState(()=>now);return {state,set:v=>now=v,accept(s=base(),epoch='7'){return state.accept(s,state.begin('connection-1'),epoch);}};}
for(const [name,mutate] of [
 ['closed observation',s=>s.o.extra=1],['native owner',s=>s.o.e='8'],['unsafe generation',s=>s.g=s.o.g=Number.MAX_SAFE_INTEGER+1],['noncanonical read',s=>s.o.i='011'],['missing mode',s=>delete s.control_mode],['wrong marker',s=>s.wifi_snapshot=2],['bad Polar booleans',s=>s.pi.f='yes'],['extra Polar field',s=>s.pi.extra=true],['fractional clock',s=>s.ms=1.5],['negative clock',s=>s.ms=-1],['invalid recording',s=>s.rec=1],['invalid pending',s=>s.pending=0],['oversize',s=>s.extra='x'.repeat(16384)]
])test(`${name} fails the whole rich snapshot gate`,()=>{const f=fixture();assert.equal(f.accept(),true);const s=base();s.o.i='12';mutate(s);assert.equal(f.accept(s),false);assert.equal(f.state.fresh(),false);assert.equal(f.state.current.status.p,'RUNNING');});
test('complete queued read and native age are summed and cannot be refreshed by repeating its witness',()=>{
 const f=fixture(),ticket=f.state.begin('connection-1'),s=base();s.o.a=2000;f.set(3500);assert.equal(f.state.accept(s,ticket,'7'),true);assert.equal(f.state.age(),4500);f.set(4001);assert.equal(f.state.fresh(),false);
 assert.equal(f.accept({...s,o:{...s.o,a:0}}),false);assert.equal(f.state.fresh(),false);
});
test('a newer observation cannot regress native generation or revision',()=>{
 for(const changes of [{g:6,r:4},{g:7,r:2}]){const f=fixture();f.accept();const s=base();Object.assign(s,changes);Object.assign(s.o,changes,{i:'12'});assert.equal(f.accept(s),false);assert.equal(f.state.current.status.ms,25000);}
});
test('same witness cannot change state even when generation and revision are unchanged',()=>{
 const f=fixture();f.accept();const s=base();s.p='PAUSED';assert.equal(f.accept(s),false);assert.equal(f.state.current.status.p,'RUNNING');
});
test('rich lifetime cannot downgrade to a no-marker packet; independent legacy connection stays compatible',()=>{
 const f=fixture();f.accept();assert.equal(f.accept({v:1,m:'open',p:'IDLE'}),false);
 const next=new SnapshotState(()=>1000);assert.equal(next.accept({v:1,m:'open',p:'IDLE'},next.begin('legacy')),true);
});
test('late ticket cannot replace a newer read or revive an invalidated page',()=>{
 const f=fixture(),old=f.state.begin('connection-1'),next=f.state.begin('connection-1');assert.equal(f.state.accept(base(),old,'7'),false);assert.equal(f.state.accept(base(),next,'7'),true);f.state.invalidate();assert.equal(f.state.accept(base(),next,'7'),false);
});
