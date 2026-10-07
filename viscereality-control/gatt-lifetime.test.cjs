const test=require("node:test"),assert=require("node:assert/strict"),fs=require("node:fs"),vm=require("node:vm");
const core=require("../shared/quest-ble/gatt-lifetime.js");
const tick=()=>new Promise(resolve=>setImmediate(resolve));
function fixture(readReceipt) {
  const nodes=new Map();
  function node(id) {
    if(!nodes.has(id)) {
      const n={textContent:"",className:"",value:"0",dataset:{},addEventListener(){},setAttribute(){},removeAttribute(){}};
      n.classList={toggle(){},contains:value=>n.className.split(" ").includes(value)};
      nodes.set(id,n);
    }
    return nodes.get(id);
  }
  const status={v:1,m:"open",p:"IDLE",a:[],b:[]};
  const data=value=>new DataView(new TextEncoder().encode(JSON.stringify(value)).buffer);
  let request,writes=0,now=1000;
  const context={QuestBleLifetime:core,TextEncoder,TextDecoder,URLSearchParams,Promise,
    crypto:require("node:crypto").webcrypto,location:{search:""},window:{scrollTo(){}},
    document:{getElementById:node,querySelectorAll:()=>[]},
    Date:{now:()=>now},setTimeout:(callback,ms)=>{now+=ms;queueMicrotask(callback);},clearInterval(){},
    testDevice:{gatt:{connected:true}},
    testCharacteristics:{status:{readValue:async()=>data(status)},
      command:{writeValueWithResponse:async bytes=>{request=JSON.parse(new TextDecoder().decode(bytes));writes++;}},
      receipt:{readValue:async()=>data(await readReceipt(()=>request))}},testStatus:status};
  vm.createContext(context);
  vm.runInContext(fs.readFileSync(require.resolve("./app.js"),"utf8"),context);
  vm.runInContext("device=testDevice;characteristics=testCharacteristics;questStatus=testStatus;lastStatusAt=Date.now();",context);
  return{context,node,writes:()=>writes,run:()=>vm.runInContext('sendCommand("arm","Arm","condition-a",10)',context)};
}
test("production experiment page waits for matching app completion rather than transport ACK",async()=>{
  let reads=0;
  const f=fixture(request=>({v:1,id:++reads===1?"previous":request().id,state:reads<3?"pending":"confirmed"}));
  await f.run();
  assert.equal(f.writes(),1);assert.equal(reads,3);
  assert.equal(f.node("progress-confirmed").className,"done");
});
test("production experiment page never shows a late confirmation from a retired connection",async()=>{
  let release;
  const blocked=new Promise(resolve=>{release=resolve;});
  const f=fixture(async request=>{await blocked;return{v:1,id:request().id,state:"confirmed"};});
  const command=f.run();await tick();
  vm.runInContext("disconnected();",f.context);release();await command;
  assert.notEqual(f.node("progress-confirmed").className,"done");
  assert.match(f.node("command-detail").textContent,/disconnected before confirmation/);
});
test("production experiment page preserves unknown effect after an accepted write loses readback",async()=>{
  const f=fixture(()=>{throw Error("GATT read failed");});await f.run();
  assert.equal(f.writes(),1);
  assert.notEqual(f.node("progress-confirmed").className,"done");
  assert.match(f.node("command-detail").textContent,/result unavailable/);
});
