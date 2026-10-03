const test=require("node:test"),assert=require("node:assert/strict"),B=require("./hub-ble.js");
test("actual carrier roundtrips UTF8 at minimum and observed normal MTUs",()=>{for(const mtu of [23,247,517]){const receiver=new B.Assembly(),frames=B.fragments('{"value":"Own + Peer münchen"}',1,mtu);let result;for(const f of frames){assert.ok(f.length<=Math.min(mtu-3,244));result=receiver.accept(new DataView(f.buffer),mtu,1000);}assert.equal(result,'{"value":"Own + Peer münchen"}');assert.throws(()=>receiver.accept(new DataView(frames[0].buffer),mtu,1001));}});
test("reordered fragments close and cannot restore after a valid retry",()=>{const receiver=new B.Assembly(),f=B.fragments("a".repeat(40),1,23);assert.throws(()=>receiver.accept(new DataView(f[1].buffer),23,1000));assert.throws(()=>receiver.accept(new DataView(f[0].buffer),23,1001));});
test("absolute deadline and clock rollback deny partial readings",()=>{for(const time of [999,11000]){const receiver=new B.Assembly(),f=B.fragments("a".repeat(40),1,23);receiver.accept(new DataView(f[0].buffer),23,1000);assert.throws(()=>receiver.accept(new DataView(f[1].buffer),23,time));}});
test("oversize, reserved flags, wrong MTU and invalid UTF8 deny",()=>{assert.throws(()=>B.fragments("a".repeat(16385),1,247));assert.throws(()=>B.fragments("a",1,22));let f=B.fragments("a",1,247)[0];f[1]=1;assert.throws(()=>new B.Assembly().accept(new DataView(f.buffer),247,1000));f=B.fragments("a",1,247)[0];f[8]=0xff;assert.throws(()=>new B.Assembly().accept(new DataView(f.buffer),247,1000));});

// Actual browser adapter with target-free GATT callbacks; no chooser, radio or Hub authority.
const tick=()=>new Promise(resolve=>setImmediate(resolve));
const view=bytes=>new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength);
async function fixture(options={}){
  const status={v:1,carrier:"ble_gatt_to_loopback_hub",listener_observed:true,controller_authority:"not_claimed",production_eligible:false,mtu:247,...options.status};
  const writes=[],incoming=[],state={active:0,maximum:0,disconnects:0,statusReads:0};
  async function operation(action){state.active++;state.maximum=Math.max(state.maximum,state.active);try{return await action();}finally{state.active--;}}
  const write={writeValueWithResponse:bytes=>operation(async()=>{if(options.beforeWrite)await options.beforeWrite();writes.push(Uint8Array.from(bytes));})};
  const read={readValue:()=>operation(async()=>view(incoming.shift()||new Uint8Array()))};
  const stat={readValue:()=>operation(async()=>{state.statusReads++;if(options.beforeStatus)await options.beforeStatus(state.statusReads);return view(new TextEncoder().encode(JSON.stringify(status)));})};
  const device={id:"target-free-helper",addEventListener(){},gatt:{async connect(){return{getPrimaryService:async()=>({getCharacteristic:async uuid=>uuid.includes("3002-")?write:uuid.includes("3003-")?read:stat})};},disconnect(){state.disconnects++;}}};
  const old=Object.getOwnPropertyDescriptor(globalThis,"navigator");
  Object.defineProperty(globalThis,"navigator",{value:{bluetooth:{requestDevice:async()=>device}},configurable:true});
  const socket=new B.HubBleSocket();let error=null;
  const ready=new Promise(resolve=>{socket.onopen=()=>resolve(true);socket.onclose=()=>resolve(false);socket.onerror=e=>{error=e.message;};});
  return{socket,writes,incoming,state,ready,get error(){return error;},dispose(){socket.close();if(old)Object.defineProperty(globalThis,"navigator",old);else delete globalThis.navigator;}};
}
test("actual adapter forwards unchanged native authentication and receives unchanged owner frames",async()=>{
  const f=await fixture();try{assert.equal(await f.ready,true);const auth='{"$schema":"rusty.quest.connection_hub.socket_authenticate.v2","type":"authenticate","session":"'+'A'.repeat(43)+'"}';
    f.socket.send(auth);assert.throws(()=>f.socket.send(auth),/busy/);while(f.socket.sending)await tick();
    const receiver=new B.Assembly();let text;for(const fragment of f.writes)text=receiver.accept(view(fragment),247,1000);assert.equal(text,auth);
    const receipt='{"type":"authentication_receipt","accepted":false,"status":"unknown_session"}';
    const message=new Promise(resolve=>{f.socket.onmessage=e=>resolve(e.data);});f.incoming.push(...B.fragments(receipt,1,247));assert.equal(await message,receipt);
    assert.equal(f.state.maximum,1);assert.equal(f.error,null);assert.equal(f.socket.readyState,1);
  }finally{f.dispose();}
});
test("configured, authority-claiming and malformed helper status never opens a control channel",async()=>{
  for(const status of [{listener_observed:false},{controller_authority:"granted"},{production_eligible:true},{mtu:"247"},{carrier:"configured_hint"}]){
    const f=await fixture({status});try{assert.equal(await f.ready,false);assert.match(f.error,/unavailable/);assert.equal(f.writes.length,0);}finally{f.dispose();}
  }
});
test("closing during queued status invalidates the pending write before any bytes are sent",async()=>{
  let release;const blocked=new Promise(resolve=>{release=resolve;});
  const f=await fixture({beforeStatus:n=>n===2?blocked:undefined});try{assert.equal(await f.ready,true);f.socket.send("auth bytes");await tick();f.socket.close();release();await tick();await tick();assert.equal(f.writes.length,0);assert.equal(f.socket.readyState,3);assert.ok(f.state.disconnects>=1);}finally{release();f.dispose();}
});
test("retired carrier deadline denies a queued native write without refreshing budget",async()=>{
  const f=await fixture();try{assert.equal(await f.ready,true);f.socket.deadline=performance.now()-1;f.socket.send("auth bytes");await tick();await tick();assert.equal(f.writes.length,0);assert.equal(f.socket.readyState,3);assert.match(f.error,/expired/);}finally{f.dispose();}
});
test("absent Web Bluetooth closes immediately but reports failure after handlers are assigned",async()=>{
  const old=Object.getOwnPropertyDescriptor(globalThis,"navigator");Object.defineProperty(globalThis,"navigator",{value:{},configurable:true});
  try{const socket=new B.HubBleSocket(),events=[];assert.equal(socket.readyState,3);socket.onerror=e=>events.push(e.message);socket.onclose=()=>events.push("closed");await tick();assert.deepEqual(events,["Web Bluetooth unavailable","closed"]);assert.throws(()=>socket.send("auth"),/unavailable/);}finally{if(old)Object.defineProperty(globalThis,"navigator",old);else delete globalThis.navigator;}
});
