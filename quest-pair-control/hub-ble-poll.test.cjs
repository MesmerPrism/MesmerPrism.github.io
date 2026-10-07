const test=require("node:test"),assert=require("node:assert/strict"),fs=require("node:fs"),vm=require("node:vm"),P=require("./protocol.js");

// Run the production poll/framing in an isolated virtual clock with fake GATT.
// No chooser, Bluetooth device, network or controller authority is exercised.
async function pollFixture({text,emptyReads=0,latency=0,deadline=900000,retireOnRead=false}){
  let now=0,reads=0,active=0,maximum=0,received=null,error=null;
  const sleeps=[],context={module:{exports:{}},TextEncoder,TextDecoder,DataView,Uint8Array,Promise,queueMicrotask,
    performance:{now:()=>now},setTimeout:(callback,ms)=>{sleeps.push(ms);now+=ms;queueMicrotask(callback);}};
  vm.createContext(context);vm.runInContext(fs.readFileSync(require.resolve("../shared/quest-ble/gatt-lifetime.js"),"utf8"),context);context.QuestBleLifetime=context.module.exports;delete context.module;
  context.module={exports:{}};context.require=()=>context.QuestBleLifetime;
  vm.runInContext(fs.readFileSync(require.resolve("./hub-ble.js"),"utf8"),context);
  const B=context.module.exports,frames=B.fragments(text,1,23),socket=Object.create(B.HubBleSocket.prototype);
  Object.assign(socket,{readyState:1,generation:0,deadline,mtu:23,operations:Promise.resolve(),assembly:new B.Assembly(),device:null,
    read:{readValue:async()=>{reads++;active++;maximum=Math.max(maximum,active);try{
      now+=latency;if(retireOnRead)socket.close(false);
      const bytes=reads<=emptyReads?new Uint8Array():frames.shift();
      if(!bytes)throw Error("fake GATT queue exhausted");
      return new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength);
    }finally{active--;}}},onmessage:event=>{received=event.data;socket.close(false);},onerror:event=>{error=event.message;}});
  await socket.poll(0);
  return{received,error,reads,sleeps,maximum,now,closed:socket.readyState===3};
}

function surfaceSnapshot(){
  const surface={schema_version:1,surface_id:"surface.concurrent_stereo.controls",display_label:"Modeled owner surface",
    description:"Target-free read-only wire fixture",surface_contract_sha256:"sha256:"+"a".repeat(64),provider_package:"com.example.provider",
    provider_signer_sha256:"a".repeat(64),commands:[{command:"command.concurrent_stereo.own",display_label:"Own",required_controller_capability:"surface.control"}],
    state:Object.fromEntries(Array.from({length:8},(_,i)=>["field"+i,"ü".repeat(128)])),state_revision:1};
  P.validateSurface(surface);
  const snapshot={$schema:"rusty.quest.connection_hub.surface_snapshot.v1",type:"surface_snapshot",listener_instance_id:"a".repeat(32),
    transport_epoch:1,surface_revision:1,transport_classification:"trusted_lan_experimental",confidentiality:"none",production_eligible:false,surfaces:[surface]};
  P.validateProjection(snapshot,1,null);return JSON.stringify(snapshot);
}

test("production poll drains a valid UTF8 surface at MTU23 without per-fragment sleeps",async()=>{
  const text=surfaceSnapshot();assert.ok(new TextEncoder().encode(text).length>1200);
  const r=await pollFixture({text});assert.equal(r.received,text);assert.equal(r.error,null);
  assert.ok(r.reads>100);assert.deepEqual(r.sleeps,[]);assert.equal(r.maximum,1);assert.equal(r.now,0);
});
test("production poll retains 100ms backoff only for empty reads",async()=>{
  const r=await pollFixture({text:"unchanged frame",emptyReads:3});
  assert.equal(r.received,"unchanged frame");assert.deepEqual(r.sleeps,[100,100,100]);assert.equal(r.now,300);assert.equal(r.maximum,1);
});
test("slow GATT still expires the strict ten-second assembly",async()=>{
  const r=await pollFixture({text:"a".repeat(1212),latency:100});
  assert.equal(r.received,null);assert.match(r.error,/deadline/);assert.equal(r.reads,101);assert.equal(r.now,10100);assert.equal(r.closed,true);
});
test("carrier lifetime expiry and retirement after a read deny delivery",async()=>{
  for(const options of [{deadline:100,latency:100},{retireOnRead:true}]){
    const r=await pollFixture({text:"a",...options});assert.equal(r.received,null);assert.equal(r.reads,1);assert.equal(r.closed,true);
  }
});
