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
  const events=new Map();
  const context={QuestBleLifetime:core,TextEncoder,TextDecoder,URLSearchParams,Promise,
    crypto:require("node:crypto").webcrypto,location:{search:""},window:{scrollTo(){},addEventListener:(name,fn)=>events.set(name,fn)},
    document:{getElementById:node,querySelectorAll:()=>[]},
    Date:{now:()=>now},setTimeout:(callback,ms)=>{now+=ms;queueMicrotask(callback);},clearInterval(){},
    testDevice:{gatt:{connected:true}},
    testCharacteristics:{status:{readValue:async()=>data(status)},
      command:{writeValueWithResponse:async bytes=>{request=JSON.parse(new TextDecoder().decode(bytes));writes++;}},
      receipt:{readValue:async()=>data(await readReceipt(()=>request))}},testStatus:status};
  vm.createContext(context);
  vm.runInContext(fs.readFileSync(require.resolve("./app.js"),"utf8"),context);
  vm.runInContext("device=testDevice;characteristics=testCharacteristics;questStatus=testStatus;lastStatusAt=Date.now();",context);
  return{context,node,events,setNow:value=>{now=value;},writes:()=>writes,run:()=>vm.runInContext('sendCommand("arm","Arm","condition-a",10)',context)};
}
test("owner Unknown at30s is received before page deadline without another command",async()=>{
  let f;
  f=fixture(request=>{f.setNow(31500);return{v:1,id:request().id,state:"outcome_unknown",detail:"OWNER_UNKNOWN"};});
  await f.run();assert.equal(f.writes(),1);assert.equal(f.node("command-detail").textContent,"OWNER_UNKNOWN");
});
test("matching terminal receipt finishing at page deadline is not overwritten",async()=>{
  for(const state of ["confirmed","rejected","outcome_unknown"]){
    let f;f=fixture(request=>{f.setNow(37000);return{v:1,id:request().id,state,detail:"EXACT_TERMINAL"};});
    await f.run();assert.equal(f.writes(),1);assert.equal(f.node("command-detail").textContent,"EXACT_TERMINAL");
    assert.equal(f.node("progress-confirmed").className,state==="confirmed"?"done":"failed");
  }
});
test("pending receipt still reaches bounded page Unknown without retry",async()=>{
  const f=fixture(request=>({v:1,id:request().id,state:"pending"}));await f.run();
  assert.equal(f.writes(),1);assert.match(f.node("command-detail").textContent,/No confirmation arrived/);
});
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

function connectionFixture(options={}) {
  const f=fixture(()=>({v:1,id:"unused",state:"pending"}));
  let choices=0,polls=0,disconnects=0;
  const listeners=new Map();
  const data=value=>new DataView(new TextEncoder().encode(JSON.stringify(value)).buffer);
  const selected={addEventListener:(name,fn)=>listeners.set(name,fn),gatt:{connected:false,
    disconnect(){disconnects++;this.connected=false;listeners.get("gattserverdisconnected")?.();},
    async connect(){
      this.connected=true;
      if(options.connect) return options.connect(selected,listeners);
      return {getPrimaryService:async()=>{
        if(options.serviceError) throw options.serviceError;
        return {getCharacteristic:async uuid=>{
          if(options.characteristicError) throw options.characteristicError;
          return {readValue:async()=>{
            if(options.read) return options.read();
            return data({v:1,m:"open",p:"IDLE",a:[],b:[]});
          }};
        }};
      }};
    }}};
  f.context.navigator={bluetooth:{requestDevice:async()=>{choices++;if(options.choose)await options.choose();return selected;}}};
  f.context.setInterval=()=>{polls++;return polls;};
  vm.runInContext("device=undefined;characteristics=undefined;questStatus=undefined;",f.context);
  return {...f,selected,listeners,choices:()=>choices,polls:()=>polls,disconnects:()=>disconnects,
    connect:()=>vm.runInContext("connect()",f.context),canCommand:()=>vm.runInContext("canCommand()",f.context)};
}
test("one pending connection owns the chooser and keeps command readiness disabled",async()=>{
  let release;const pending=new Promise(resolve=>release=resolve);
  const f=connectionFixture({choose:()=>pending});const first=f.connect();await tick();
  assert.equal(f.node("connect").disabled,true);await f.connect();assert.equal(f.choices(),1);
  release();await first;assert.equal(f.node("connect").disabled,false);assert.equal(f.polls(),1);
});
test("initial status read failure reports its stage and does not start polling or enable commands",async()=>{
  const f=connectionFixture({read:()=>{throw new DOMException("status unavailable","NetworkError");}});
  await f.connect();assert.equal(f.polls(),0);assert.equal(f.canCommand(),false);
  assert.match(f.node("connection-detail").textContent,/initial status read: NetworkError: status unavailable/);
});
test("current connection failure survives the disconnection callback race",async()=>{
  const f=connectionFixture({connect:(selected,listeners)=>{selected.gatt.connected=false;listeners.get("gattserverdisconnected")();throw new DOMException("connect unavailable","NetworkError");}});
  await f.connect();assert.match(f.node("connection-detail").textContent,/GATT connect: NetworkError: connect unavailable/);
  assert.equal(f.node("connect").disabled,false);assert.equal(f.canCommand(),false);
});
test("service and characteristic failures retain their exact attempt stage",async()=>{
  for(const [options,stage] of [[{serviceError:Error("missing service")},"service discovery"],[{characteristicError:Error("missing characteristic")},"status characteristic discovery"]]) {
    const f=connectionFixture(options);await f.connect();assert.ok(f.node("connection-detail").textContent.includes(stage));assert.equal(f.polls(),0);
  }
});
test("pagehide retires pending chooser and BFCache restore cannot revive prior readiness",async()=>{
  let release;const pending=new Promise(resolve=>release=resolve);const f=connectionFixture({choose:()=>pending});
  const attempt=f.connect();await tick();f.events.get("pagehide")();release();await attempt;
  assert.equal(f.canCommand(),false);assert.equal(f.polls(),0);
  const old=f.node("connection-detail").textContent;f.events.get("pageshow")({persisted:true});
  assert.equal(f.canCommand(),false);assert.equal(f.choices(),1);assert.equal(f.polls(),0);
  assert.equal(f.node("connection-detail").textContent,old);
});
test("pagehide disconnects only selected handle and late pending command cannot confirm",async()=>{
  let release;const pending=new Promise(resolve=>release=resolve);
  const f=fixture(async request=>{await pending;return{v:1,id:request().id,state:"confirmed"};});
  let disconnects=0;f.context.testDevice.gatt.disconnect=()=>{disconnects++;f.context.testDevice.gatt.connected=false;};
  const operation=f.run();await tick();f.events.get("pagehide")();release();await operation;
  assert.equal(disconnects,1);assert.equal(f.writes(),1);assert.notEqual(f.node("progress-confirmed").className,"done");
  assert.match(f.node("command-detail").textContent,/disconnected before confirmation/);
  f.events.get("pageshow")({persisted:true});assert.equal(vm.runInContext("canCommand()",f.context),false);
});

test("retired connect failure cannot overwrite a newer restored-page attempt",async()=>{
  let release;const pending=new Promise(resolve=>release=resolve);const f=connectionFixture();
  const normal=f.selected.gatt.connect.bind(f.selected.gatt);let calls=0;
  f.selected.gatt.connect=async()=>{if(++calls===1){f.selected.gatt.connected=true;await pending;throw Error("OLD_FAILURE");}return normal();};
  const old=f.connect();await tick();f.events.get("pagehide")();f.events.get("pageshow")({persisted:true});
  await f.connect();const current=f.node("connection-detail").textContent;release();await old;
  assert.equal(current,"Quest status received.");assert.equal(f.node("connection-detail").textContent,current);assert.equal(f.canCommand(),true);
});
test("late retired connect success cannot disconnect successor owning the same device handle",async()=>{
  let release;const pending=new Promise(resolve=>release=resolve);const f=connectionFixture();
  const normal=f.selected.gatt.connect.bind(f.selected.gatt);let calls=0;
  f.selected.gatt.connect=async()=>{if(++calls===1){f.selected.gatt.connected=true;await pending;}return normal();};
  const old=f.connect();await tick();f.events.get("pagehide")();f.events.get("pageshow")({persisted:true});
  await f.connect();const disconnects=f.disconnects();release();await old;
  assert.equal(f.disconnects(),disconnects);assert.equal(f.canCommand(),true);assert.equal(f.choices(),2);
});


test("connection recovery clears its old error while preserving unknown command outcome",async()=>{
  let fail=true;
  const f=connectionFixture({serviceError:undefined,read:()=>{
    if(fail) throw Error("old connection error");
    return new DataView(new TextEncoder().encode(JSON.stringify({v:1,m:"open",p:"IDLE",a:[],b:[]})).buffer);
  }});
  vm.runInContext('showProgress("Arm", "unknown", "Result uncertain; check the headset before retrying.");',f.context);
  const retained=f.node("command-detail").textContent;
  await f.connect();assert.match(f.node("connection-detail").textContent,/old connection error/);
  assert.equal(f.node("command-detail").textContent,retained);
  fail=false;await f.connect();assert.equal(f.node("connection-detail").textContent,"Quest status received.");
  assert.equal(f.node("command-detail").textContent,retained);assert.notEqual(f.node("progress-confirmed").className,"done");
  assert.equal(f.writes(),0);
});

test("later status read failure preserves prior command outcome and disables readiness",async()=>{
  let fail=false;
  const f=connectionFixture({read:()=>{
    if(fail) throw new DOMException("poll unavailable","NetworkError");
    return new DataView(new TextEncoder().encode(JSON.stringify({v:1,m:"open",p:"IDLE",a:[],b:[]})).buffer);
  }});
  await f.connect();vm.runInContext('showProgress("Arm", "unknown", "Result uncertain; check the headset.");',f.context);
  const retained=f.node("command-detail").textContent;fail=true;
  await vm.runInContext("refreshStatus()",f.context);
  assert.match(f.node("connection-detail").textContent,/Status read failed: NetworkError: poll unavailable/);
  assert.equal(f.node("command-detail").textContent,retained);assert.equal(f.canCommand(),false);assert.equal(f.writes(),0);
});

test("connection errors are bounded plain text without control characters",async()=>{
  const f=connectionFixture({serviceError:Error("bad\n"+"x".repeat(1000))});await f.connect();
  const detail=f.node("connection-detail").textContent;
  assert.ok(detail.length<400);assert.ok(!/[\u0000-\u001f\u007f]/.test(detail));
});

test("retired command delay cannot overwrite successor command outcome at old deadline",async()=>{
  let release;
  const f=fixture(request=>({v:1,id:request().id,state:"pending"}));
  f.context.setTimeout=callback=>{release=callback;};
  const operation=f.run();await tick();assert.equal(typeof release,"function");
  f.events.get("pagehide")();f.events.get("pageshow")({persisted:true});
  vm.runInContext('showProgress("Successor", "confirmed", "NEW_CONFIRMED");',f.context);
  f.setNow(50000);release();await operation;
  assert.equal(f.node("command-detail").textContent,"NEW_CONFIRMED");
  assert.equal(f.node("progress-confirmed").className,"done");assert.equal(f.writes(),1);
});

test("retired unlock cannot clear successor access code or mutate its access panel",async()=>{
  let release;
  const blocked=new Promise(resolve=>release=resolve);
  const f=fixture(async request=>{await blocked;return{v:1,id:request().id,state:"confirmed"};});
  f.node("pair-code").value="ABCDEFGHIJKL";
  const operation=vm.runInContext("unlock()",f.context);await tick();
  f.events.get("pagehide")();f.events.get("pageshow")({persisted:true});
  vm.runInContext('accessCode="MNOPQRSTUVWX";',f.context);f.node("access").hidden=true;
  release();await operation;
  assert.equal(vm.runInContext("accessCode",f.context),"MNOPQRSTUVWX");
  assert.equal(f.node("access").hidden,true);assert.equal(f.writes(),1);
});

test("busy unlock leaves active command authentication and entered code unchanged",async()=>{
  let release;
  const blocked=new Promise(resolve=>release=resolve);
  const f=fixture(async request=>{await blocked;return{v:1,id:request().id,state:"confirmed"};});
  vm.runInContext('accessCode="MNOPQRSTUVWX";',f.context);
  const command=f.run();await tick();
  f.node("pair-code").value="ABCDEFGHIJKL";
  const detail=f.node("command-detail").textContent;
  try {
    await vm.runInContext("unlock()",f.context);
    assert.equal(vm.runInContext("accessCode",f.context),"MNOPQRSTUVWX");
    assert.equal(f.node("pair-code").value,"ABCDEFGHIJKL");
    assert.equal(f.node("command-detail").textContent,detail);assert.equal(f.writes(),1);
  } finally {release();await command;}
});

for(const unavailable of ["disconnected","stale"])test(`${unavailable} unlock cannot consume code without command admission`,async()=>{
  const f=fixture(request=>({v:1,id:request().id,state:"confirmed"}));
  vm.runInContext('accessCode="MNOPQRSTUVWX";',f.context);
  f.node("pair-code").value="ABCDEFGHIJKL";
  if(unavailable==="disconnected")vm.runInContext("device.gatt.connected=false;",f.context);
  else f.setNow(6001);
  await vm.runInContext("unlock()",f.context);
  assert.equal(vm.runInContext("accessCode",f.context),"MNOPQRSTUVWX");
  assert.equal(f.node("pair-code").value,"ABCDEFGHIJKL");assert.equal(f.writes(),0);
});

test("ready gated unlock sends one authenticated ping and retains confirmed code",async()=>{
  let sent;
  const f=fixture(request=>{sent=request();return{v:1,id:sent.id,state:"confirmed"};});
  vm.runInContext('questStatus.m="gated";',f.context);
  const challenge=new TextEncoder().encode(JSON.stringify({v:1,n:"a".repeat(32)}));
  f.context.testCharacteristics.challenge={readValue:async()=>new DataView(challenge.buffer)};
  f.node("pair-code").value="ABCDEFGHIJKL";
  await vm.runInContext("unlock()",f.context);
  assert.equal(f.writes(),1);assert.equal(sent.op,"ping");assert.match(sent.mac,/^[a-f0-9]{32}$/);
  assert.ok(!JSON.stringify(sent).includes("ABCDEFGHIJKL"));
  assert.equal(vm.runInContext("accessCode",f.context),"ABCDEFGHIJKL");
  assert.equal(f.node("pair-code").value,"");assert.equal(f.node("progress-confirmed").className,"done");
});

test("unavailable app source cannot freshen status or authorize a command using a retained code",async()=>{
  const f=fixture(request=>({v:1,id:request().id,state:"confirmed"}));
  vm.runInContext('accessCode="ABCDEFGHIJKL";showProgress("Previous", "unknown", "PRIOR_UNKNOWN");Object.keys(testStatus).forEach(key=>delete testStatus[key]);Object.assign(testStatus,{v:1,m:"gated",f:"unknown",p:"UNAVAILABLE"});',f.context);
  const result=await vm.runInContext("refreshStatus()",f.context);
  assert.equal(result.ok,false);assert.equal(vm.runInContext("!!canCommand()",f.context),false);
  assert.equal(vm.runInContext("questStatus",f.context),undefined);
  assert.equal(f.node("open-polar").disabled,true);
  await f.run();assert.equal(f.writes(),0);
  assert.equal(f.node("command-detail").textContent,"PRIOR_UNKNOWN");
  assert.match(f.node("connection-detail").textContent,/source unavailable/);
  vm.runInContext('testStatus.p="IDLE";',f.context);
  const recovery=await vm.runInContext("refreshStatus()",f.context);
  assert.equal(recovery.ok,true);assert.equal(vm.runInContext("canCommand()",f.context),true);
  assert.equal(f.writes(),0);assert.equal(f.node("command-detail").textContent,"PRIOR_UNKNOWN");
});

for(const [name,phase] of [["missing",undefined],["unknown","FUTURE_PHASE"],["null",null],["object",{}],["number",1]]) {
  test(`${name} app phase cannot freshen command admission`,async()=>{
    const f=fixture(request=>({v:1,id:request().id,state:"confirmed"}));
    f.context.testStatus.p=phase;
    vm.runInContext('accessCode="ABCDEFGHIJKL";showProgress("Previous","unknown","PRIOR_UNKNOWN");',f.context);
    const result=await vm.runInContext("refreshStatus()",f.context);
    await f.run();assert.equal(f.writes(),0);
    assert.equal(result.ok,false);
    assert.equal(vm.runInContext("!!canCommand()",f.context),false);
    assert.equal(f.node("command-detail").textContent,"PRIOR_UNKNOWN");
  });
}

test("all available owner phases remain observable without dispatching commands",async()=>{
  for(const phase of ["IDLE","STARTING","ARMING","ARMED","RUNNING","PAUSED","RECORDING","FINALIZING","SAVING","RECOVERY","ERROR"]) {
    const f=fixture(()=>({v:1,id:"unused",state:"pending"}));
    f.context.testStatus.p=phase;
    const result=await vm.runInContext("refreshStatus()",f.context);
    assert.equal(result.ok,true,phase);
    assert.equal(vm.runInContext("questStatus.p",f.context),phase);
    assert.equal(f.writes(),0);
  }
});
