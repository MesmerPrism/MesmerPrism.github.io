const test=require("node:test"),assert=require("node:assert/strict"),fs=require("node:fs"),vm=require("node:vm");
const core=require("../shared/quest-ble/gatt-lifetime.js");
const tick=()=>new Promise(resolve=>setImmediate(resolve));
function fixture(readReceipt, search="", storage) {
  const nodes=new Map();
  function node(id) {
    if(!nodes.has(id)) {
       const n={textContent:"",className:"",value:"0",dataset:{},children:[],addEventListener(){},setAttribute(){},removeAttribute(){},replaceChildren(){this.children=[];},append(child){this.children.push(child);}};
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
     crypto:require("node:crypto").webcrypto,location:{search},localStorage:storage,window:{scrollTo(){},addEventListener:(name,fn)=>events.set(name,fn)},
     document:{getElementById:node,querySelectorAll:()=>[],createElement:()=>({value:"",textContent:""})},
    Date:{now:()=>now},performance:{now:()=>now},clearTimeout(){},setTimeout:(callback,ms)=>{now+=ms;queueMicrotask(callback);},clearInterval(){},
    testDevice:{gatt:{connected:true}},
    testCharacteristics:{status:{readValue:async()=>data(status)},
      command:{writeValueWithResponse:async bytes=>{request=JSON.parse(new TextDecoder().decode(bytes));writes++;}},
      receipt:{readValue:async()=>data(await readReceipt(()=>request))}},testStatus:status};
  vm.createContext(context);
  vm.runInContext(fs.readFileSync(require.resolve("./app.js"),"utf8"),context);
  vm.runInContext("device=testDevice;characteristics=testCharacteristics;questStatus=testStatus;lastStatusAt=Date.now();",context);
  return{context,node,events,setNow:value=>{now=value;},writes:()=>writes,request:()=>request,
    setStatus:value=>Object.assign(status,value),
    control:op=>vm.runInContext(`sendSessionControl(${JSON.stringify(op)})`,context),
    render:()=>vm.runInContext('render()',context),
    run:()=>vm.runInContext('sendCommand("arm","Arm","condition-a",10)',context)};
}

const sessionRef="0123456789abcdef0123456789abcdef";
test("Polar stop rejects old session q alone and closed/malformed grants",async()=>{
  for(const z of [undefined,{},[],{r:true,a:7,e:0},{r:0,s:"bad",a:7,e:0},{r:0,a:7,e:0,extra:true},{r:-1,a:7,e:0},{r:0.5,a:7,e:0}]) {
    const f=fixture(()=>({v:1,id:"unused",state:"pending"}));f.setStatus({...controlStatus(),z});
    await vm.runInContext('sendPolarStop("stop-acc")',f.context);assert.equal(f.writes(),0);
  }
});
for(const mode of ["shared","independent"])test(`Polar ${mode} reference writes once without physical ACK claim`,async()=>{
  const f=fixture(get=>({v:1,id:get().id,state:"dispatched"}));
  f.setStatus({...controlStatus(),z:mode==="shared"?{r:0,a:7,e:0}:{s:sessionRef,r:0,a:7,e:0}});
  await vm.runInContext('sendPolarStop("stop-ecg")',f.context);
  assert.equal(f.writes(),1);assert.equal(f.request().v,3);assert.equal(f.request().op,"stop-ecg");
  assert.equal(f.request().r,0);assert.equal(f.request().s,sessionRef);
  assert.match(f.node("command-detail").textContent,/sensor ACK\/data stop is not confirmed/);
  assert.equal(f.node("progress-confirmed").className,"");
});
test("Polar capability retired while gated challenge awaited emits zero writes",async()=>{
  const f=fixture(()=>({v:1,id:"unused",state:"pending"}));
  f.setStatus({...controlStatus(),m:"gated",z:{r:0,a:7,e:0}});
  f.context.changed=()=>f.setStatus({z:{r:1,a:7,e:0}});
  vm.runInContext('accessCode="ABCDEFGHJKLM";testCharacteristics.challenge={readValue:async()=>{changed();return new DataView(new TextEncoder().encode(JSON.stringify({v:1,n:"a".repeat(32)})).buffer);}};',f.context);
  await vm.runInContext('sendPolarStop("stop-acc")',f.context);assert.equal(f.writes(),0);
  assert.match(f.node("command-detail").textContent,/Polar owner or stream changed/);
});
test("RQPC1 gated proof signs the independent Polar revision/domain within240",async()=>{
  const f=fixture(get=>({v:1,id:get().id,state:"dispatched"}));f.setStatus({...controlStatus(),m:"gated",z:{r:9007199254740991,a:7,e:0}});
  vm.runInContext('accessCode="ABCDEFGH2345"',f.context);
  f.context.testCharacteristics.challenge={readValue:async()=>new DataView(new TextEncoder().encode(JSON.stringify({v:1,n:"a".repeat(32)})).buffer)};
  await vm.runInContext('sendPolarStop("stop-acc")',f.context);assert.equal(f.writes(),1);const r=f.request();
  const expected=require("node:crypto").createHmac("sha256","ABCDEFGH2345").update(`RQPC1|${"a".repeat(32)}|${r.id}|stop-acc|${r.s}|${r.r}|${r.n}`).digest("hex").slice(0,32);
  assert.equal(r.mac,expected);assert.ok(new TextEncoder().encode(JSON.stringify(r)).length<=240);
});
test("Polar unknown/wrong-ID/uncontracted confirmation never claims sensor stopped",async()=>{
  for(const state of ["pending","confirmed","wrong-id"]){
    const f=fixture(get=>({v:1,id:state==="wrong-id"?"0000000000000000":get().id,state:state==="wrong-id"?"dispatched":state}));
    f.setStatus({...controlStatus(),z:{r:0,a:7,e:0}});await vm.runInContext('sendPolarStop("stop-acc",{observeForMs:35000})',f.context);
    assert.equal(f.writes(),1);assert.notEqual(f.node("progress-confirmed").className,"done");
  }
});
test("Polar dispatched admission preserves receipt version/id/detail immutability contract",()=>{
  const f=fixture(()=>({v:1,id:'unused',state:'pending'}));
  f.context.raw={v:1,id:'1111111111111111',state:'dispatched',detail:17};
  const valid=vm.runInContext('polarDispatchedReceipt(raw,"1111111111111111")',f.context);
  assert.equal(valid.detail,'');assert.equal(valid.applied,false);assert.equal(Object.isFrozen(valid),true);
  for(const raw of [{v:true,id:'1111111111111111',state:'dispatched'},{v:2,id:'1111111111111111',state:'dispatched'},
      {v:1,id:'2222222222222222',state:'dispatched'},{v:1,id:'1111111111111111',state:'confirmed'}]){
    f.context.raw=raw;assert.equal(vm.runInContext('polarDispatchedReceipt(raw,"1111111111111111")',f.context),null);
  }
});
test("actual owner receipt producer fixture reaches browser dispatched feedback",{skip:!process.env.POLAR_STOP_PRODUCER_RECEIPT_PATH},async()=>{
  const raw=JSON.parse(fs.readFileSync(process.env.POLAR_STOP_PRODUCER_RECEIPT_PATH,'utf8'));
  const f=fixture(()=>raw);f.setStatus({...controlStatus(),z:{r:0,a:7,e:0}});
  f.context.crypto={getRandomValues:bytes=>bytes.fill(0x11)};
  await vm.runInContext('sendPolarStop("stop-acc")',f.context);assert.equal(f.writes(),1);
  assert.equal(f.request().id,raw.id);assert.match(f.node('command-detail').textContent,/sensor ACK\/data stop is not confirmed/);
  assert.equal(f.node('progress-confirmed').className,'');
});
function controlStatus(phase="ARMED") {
  return {p:phase,g:7,rec:true,pending:false,
    q:{v:2,s:sessionRef,g:7,o:["start","pause","resume"]}};
}

const setupGrant={s:sessionRef,g:7,r:3,p:true,b:true,c:false,x:"abcdef123456",a:false,e:false,sc:false,d:["abcdef123456"]};
test("paused preview shows current session stage while every guide action stays inert",()=>{
  const f=fixture(()=>({v:1,id:"unused",state:"pending"}),"?preview=1&state=paused");
  assert.equal(f.node("guide-title").textContent,"Paused");
  assert.equal(f.node("guide-action").textContent,"Resume session");
  assert.equal(f.node("guide-action").disabled,true);
  assert.equal(f.node("guide-finish").disabled,true);
  assert.equal(vm.runInContext('canCommand()',f.context),false);
});
test("inert preview shows the actual scan prerequisite and active-session essentials",()=>{
  const missing=fixture(()=>({v:1,id:"unused",state:"pending"}),"?preview=1&state=missing");
  assert.equal(missing.node("guide-title").textContent,"Find Polar sensor");
  assert.equal(missing.node("guide-action").textContent,"Scan for Polar");
  assert.equal(missing.node("guide-action").disabled,true);
  const choose=fixture(()=>({v:1,id:"unused",state:"pending"}),"?preview=1&state=select");
  assert.equal(choose.node("guide-polar-device").children[0].textContent,"Nearby Polar · app ref 3456");
  const complete=fixture(()=>({v:1,id:"unused",state:"pending"}),"?preview=1&state=complete");
  assert.match(complete.node("guide-session-facts").textContent,/Condition 1 · active 00:00:30 · condition complete; recording continues/);
  assert.equal(complete.node("guide-title").textContent,"Condition complete · recording continues");
  assert.equal(complete.node("guide-action").textContent,"Finish & prepare next");
  assert.equal(complete.node("guide-action").disabled,true);
});
test("guided flow follows fresh native stage, shows missing grants and panel exception",()=>{
  const f=fixture(()=>({v:1,id:"unused",state:"pending"}));
  f.setStatus({p:"IDLE",h:"vr-preparation",g:0,r:1,o:{v:1,s:"observed",e:"7",i:"1",g:0,r:1,a:0},rec:false,st:"ready",bt:"UNAVAILABLE",y:{...setupGrant,c:true,a:true,e:false},a:["track-ready","track-ready"]});
  f.render();assert.equal(f.node("guide-title").textContent,"Choose condition");assert.equal(f.node("guide-action").textContent,"Arm condition");
  const html=fs.readFileSync(require.resolve("./index.html"),"utf8");
  assert.match(html,/<details class="foldout" id="maintenance"><summary>Maintenance controls<\/summary>/);
  assert.match(html,/<details class="foldout" id="diagnostics"><summary>Diagnostics<\/summary>/);
  f.setStatus({y:null});f.render();assert.equal(f.node("guide-title").textContent,"Polar setup unavailable");assert.equal(f.node("guide-action").textContent,"Refresh status");
  f.setStatus({h:"panel"});f.render();assert.equal(f.node("presentation").textContent,"Headset panel open");assert.equal(f.node("panel-exception").hidden,false);assert.equal(f.node("guide-return-vr").disabled,false);
  f.setStatus({h:"vr-preparation",p:"ARMED",rec:true,pending:true});f.render();assert.equal(f.node("guide-pending").hidden,false);assert.equal(f.node("guide-action").hidden,true);
  f.setStatus({pending:false,...controlStatus("ARMED"),h:"vr-session"});f.render();assert.equal(f.node("guide-title").textContent,"Armed");assert.equal(f.node("guide-action").textContent,"Start session");
});
test("Polar setup signs current revision and observes exact receipt without replay",async()=>{
  let reads=0;const f=fixture(get=>({v:1,id:get().id,state:++reads===1?"pending":"confirmed"}));
  f.setStatus({p:"IDLE",h:"vr-preparation",g:0,r:1,o:{v:1,s:"observed",e:"7",i:"1",g:0,r:1,a:0},rec:false,st:"ready",bt:"UNAVAILABLE",m:"gated",y:setupGrant});
  vm.runInContext('accessCode="ABCDEFGH2345"',f.context);
  f.context.testCharacteristics.challenge={readValue:async()=>new DataView(new TextEncoder().encode(JSON.stringify({v:1,n:"a".repeat(32)})).buffer)};
  await vm.runInContext('sendPolarSetup("connect")',f.context);
  assert.equal(f.writes(),1);assert.equal(f.request().v,4);assert.equal(f.request().d,"");assert.equal(f.request().r,3);
  const r=f.request(),expected=require("node:crypto").createHmac("sha256","ABCDEFGH2345").update(`RQPS1|${"a".repeat(32)}|${r.id}|connect|${r.s}|${r.g}|${r.r}||${r.n}`).digest("hex").slice(0,32);
  assert.equal(r.mac,expected);assert.equal(reads,2);assert.equal(f.node("progress-confirmed").className,"done");
});
test("Polar setup revision change before write prevents dispatch",async()=>{
  const f=fixture(()=>{throw Error("no receipt expected")});f.setStatus({p:"IDLE",h:"vr-preparation",g:0,r:1,o:{v:1,s:"observed",e:"7",i:"1",g:0,r:1,a:0},rec:false,st:"ready",bt:"UNAVAILABLE",m:"gated",y:{...setupGrant}});
  vm.runInContext('accessCode="ABCDEFGH2345"',f.context);
  f.context.testCharacteristics.challenge={readValue:async()=>{f.setStatus({y:{...setupGrant,r:4}});return new DataView(new TextEncoder().encode(JSON.stringify({v:1,n:"a".repeat(32)})).buffer);}};
  await vm.runInContext('sendPolarSetup("connect")',f.context);assert.equal(f.writes(),0);assert.match(f.node("command-detail").textContent,/Polar setup changed/);
});

test("withheld session capability reports current pending state without claiming an older APK",()=>{
  const f=fixture(()=>({v:1,id:"unused",state:"pending"}));
  f.setStatus({p:"ARMED",g:7,rec:true,pending:true});f.render();
  assert.equal(f.node("session-control-note").textContent,"Wait for the current command to finish.");
  assert.equal(f.node("start-session").disabled,true);
  f.setStatus({pending:false});f.render();
  assert.match(f.node("session-control-note").textContent,/No current browser session-control capability/);
  assert.doesNotMatch(f.node("session-control-note").textContent,/version/);
  assert.equal(f.node("start-session").disabled,true);assert.equal(f.writes(),0);
});
test("old APK and malformed or stale capabilities cannot send session controls",async()=>{
  const bad=[undefined,{v:2,s:sessionRef,g:6,o:["start"]},
    {v:2,s:sessionRef,g:7,o:["start","start"]},
    {v:2,s:sessionRef,g:7,o:["erase"]},{v:2,s:"bad",g:7,o:["start"]},
    {v:2,s:sessionRef,g:7,o:["start"],extra:true}];
  for(const q of bad){
    const f=fixture(request=>({v:1,id:request().id,state:"confirmed"}));
    f.setStatus({...controlStatus(),q});f.render();
    assert.equal(f.node("start-session").disabled,true);
    await f.control("start");assert.equal(f.writes(),0);
  }
});
test("each session control writes only in its actual applicable state",async()=>{
  for(const [op,phase] of [["start","ARMED"],["pause","RUNNING"],["pause","RECORDING"],["resume","PAUSED"]]){
    const f=fixture(request=>({v:1,id:request().id,state:"confirmed"}));
    f.setStatus(controlStatus(phase));f.render();assert.equal(f.node(op+"-session").disabled,false);
    await f.control(op);assert.equal(f.writes(),1);
    const request=f.request();assert.equal(request.v,2);assert.equal(request.op,op);
    assert.equal(request.s,sessionRef);assert.equal(request.g,7);
    assert.match(request.n,/^[0-9a-f]{16}$/);assert.ok(JSON.stringify(request).length<=240);
    assert.equal(f.node("progress-confirmed").className,"done");
  }
  for(const state of [{p:"IDLE"},{p:"ARMING"},{p:"SAVING"},{pending:true},{rec:false}]){
    const f=fixture(()=>{throw Error("no receipt expected");});
    f.setStatus({...controlStatus(),...state});await f.control("start");assert.equal(f.writes(),0);
  }
});
test("session change during authenticated preparation prevents any write",async()=>{
  let release;const blocked=new Promise(resolve=>release=resolve);
  const f=fixture(()=>{throw Error("no receipt expected");});f.setStatus({...controlStatus(),m:"gated"});
  vm.runInContext('accessCode="ABCDEFGH2345"',f.context);
  f.context.testCharacteristics.challenge={readValue:async()=>{
    await blocked;return new DataView(new TextEncoder().encode(JSON.stringify({v:1,n:"a".repeat(32)})).buffer);
  }};
  const pending=f.control("start");await tick();
  f.setStatus({...controlStatus(),q:{...controlStatus().q,s:"f".repeat(32)}});release();await pending;
  assert.equal(f.writes(),0);assert.match(f.node("command-detail").textContent,/Session changed/);
});
test("v2 authentication signs operation, session and generation within BLE budget",async()=>{
  const f=fixture(request=>({v:1,id:request().id,state:"confirmed"}));
  f.setStatus({...controlStatus(),m:"gated"});vm.runInContext('accessCode="ABCDEFGH2345"',f.context);
  f.context.testCharacteristics.challenge={readValue:async()=>new DataView(new TextEncoder().encode(JSON.stringify({v:1,n:"a".repeat(32)})).buffer)};
  await f.control("start");assert.equal(f.writes(),1);const request=f.request();
  const canonical=`RQEC2|${"a".repeat(32)}|${request.id}|start|${request.s}|${request.g}|${request.n}`;
  const expected=require("node:crypto").createHmac("sha256","ABCDEFGH2345").update(canonical).digest("hex").slice(0,32);
  assert.equal(request.mac,expected);assert.ok(new TextEncoder().encode(JSON.stringify(request)).length<=240);
});
test("accepted session control without applied receipt stays unknown and is never replayed",async()=>{
  const f=fixture(request=>({v:1,id:request().id,state:"pending"}));f.setStatus(controlStatus());
  await f.control("start");assert.equal(f.writes(),1);
  assert.notEqual(f.node("progress-confirmed").className,"done");assert.match(f.node("command-detail").textContent,/No confirmation/);
});
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
  const f=fixture(request=>({v:1,id:request().id,state:"pending"}));await vm.runInContext('sendCommand("ping","Ping")',f.context);
  assert.equal(f.writes(),1);assert.match(f.node("command-detail").textContent,/No confirmation arrived/);
});

for(const op of ["arm","save-next","save-exit"])test(`durable ${op} observes the original pending receipt beyond35s until confirmed without replay`,async()=>{
  let reads=0;let f;f=fixture(request=>{f.setNow(1000+ ++reads*20000);return{v:1,id:request().id,state:reads<4?"pending":"confirmed"};});
  await vm.runInContext(`sendCommand(${JSON.stringify(op)},"Durable","condition-a",100)`,f.context);
  assert.equal(reads,4);assert.equal(f.writes(),1);assert.equal(f.node("progress-confirmed").className,"done");
  assert.equal(vm.runInContext('durableObservation',f.context),undefined);
});

test("durable observer ignores another command's late confirmed receipt",async()=>{
  let reads=0;let f;f=fixture(request=>{f.setNow(1000+ ++reads*20000);return{v:1,id:reads===2?"2222222222222222":request().id,state:reads===1?"pending":"confirmed"};});
  await f.run();assert.equal(reads,3);assert.equal(f.writes(),1);
  assert.equal(f.node("progress-confirmed").className,"done");
});

for(const mode of ["cancel","disconnect","pagehide"])test(`durable pending observation settles on ${mode} and retains unknown with no replay`,async()=>{
  let release;const f=fixture(()=>new Promise(resolve=>release=resolve));
  const operation=f.run();await tick();assert.equal(f.writes(),1);
  assert.equal(f.node("cancel-polar-observation").hidden,false);
  assert.equal(f.node("cancel-polar-observation").textContent,"Cancel command observation");
  if(mode==="cancel")vm.runInContext('cancelPolarObservation()',f.context);
  else if(mode==="disconnect")vm.runInContext('disconnected()',f.context);else f.events.get("pagehide")();
  await operation;const detail=f.node("command-detail").textContent;
  assert.notEqual(f.node("progress-confirmed").className,"done");
  release({v:1,id:f.request().id,state:"confirmed"});await tick();
  assert.equal(f.node("command-detail").textContent,detail);assert.equal(f.writes(),1);
  assert.equal(vm.runInContext('commandBusy',f.context),false);
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

async function interruptedOriginalFixture() {
  let latest,reads=0;
  const blocked=new Promise(()=>{});
  const f=fixture(get=>{reads++;return latest || blocked;});
  const saved=new Map();f.context.localStorage={getItem:key=>saved.get(key)||null,setItem:(key,value)=>saved.set(key,value),removeItem:key=>saved.delete(key)};
  f.context.testDevice.id="selected-quest";
  f.context.setTimeout=()=>1;f.context.clearTimeout=()=>{};
  f.setStatus({v:1,m:"open",p:"IDLE",h:"vr-preparation",g:7,r:1,rec:false,pending:false,st:"ready",bt:"ON",a:["track-ready","track-ready"],b:[],o:{v:1,s:"observed",e:"11",i:"1",g:7,r:1,a:0}});
  await vm.runInContext('refreshStatus()',f.context);
  const command=f.run();await tick();await tick();
  assert.equal(f.writes(),1);
  vm.runInContext('testDevice.gatt.connected=false;disconnected()',f.context);await command;
  assert.equal(vm.runInContext('pendingOriginal.id',f.context),f.request().id);
  assert.equal(JSON.parse(saved.get("viscereality-original-command")).epoch,"11");
  return {...f,saved,reads:()=>reads,setReceipt:value=>latest=value,reconnect:async (epoch="11")=>{
    f.setStatus({p:"ARMED",h:"vr-session",g:7,r:2,rec:true,pending:false,o:{v:1,s:"observed",e:epoch,i:"2",g:7,r:2,a:0}});
    vm.runInContext('testDevice.gatt.connected=true;characteristics=testCharacteristics;gattOperations=operationQueue()',f.context);
    await vm.runInContext('refreshStatus()',f.context);
  }};
}
test("reconnect reads original current-owner receipt and never replays the command",async()=>{
  const f=await interruptedOriginalFixture();
  f.setReceipt({v:1,id:f.request().id,state:"confirmed",detail:"Original recording prepared.",admit_ms:100,publish_ms:140,effect_ns:1000000000});
  await f.reconnect();
  assert.equal(f.writes(),1);assert.equal(f.node("progress-confirmed").className,"done");
  assert.equal(vm.runInContext('pendingOriginal.state',f.context),"reconciled_receipt");
  assert.equal(vm.runInContext('canCommand()',f.context),false);
  await vm.runInContext('refreshStatus()',f.context);
  assert.equal(vm.runInContext('pendingOriginal',f.context),null);
  assert.equal(f.saved.has("viscereality-original-command"),false);
});
test("owner change leaves original outcome unknown and locks recording actions",async()=>{
  const f=await interruptedOriginalFixture();f.setReceipt({v:1,id:f.request().id,state:"confirmed"});
  const before=f.reads();await f.reconnect("12");
  assert.equal(f.reads(),before);assert.equal(f.writes(),1);
  assert.equal(vm.runInContext('pendingOriginal.state',f.context),"uncertain");
  assert.equal(f.node("guide-action").textContent,"I checked the Quest state");
  assert.equal(vm.runInContext('canCommand()',f.context),false);
  vm.runInContext('acknowledgeUnknownOriginal()',f.context);
  assert.equal(vm.runInContext('pendingOriginal',f.context),null);
});
test("different retained receipt ID cannot confirm interrupted command",async()=>{
  const f=await interruptedOriginalFixture();f.setReceipt({v:1,id:"0000000000000000",state:"confirmed"});
  await f.reconnect();assert.equal(f.writes(),1);
  assert.equal(vm.runInContext('pendingOriginal.state',f.context),"uncertain");
  assert.notEqual(f.node("progress-confirmed").className,"done");
});
test("reload observes saved original ID after fresh same-owner status",async()=>{
  const id="1234567890abcdef",saved=new Map([["viscereality-original-command",JSON.stringify({id,deviceId:"selected-quest",epoch:"11",name:"Arm Condition 1",op:"arm"})]]);
  const storage={getItem:key=>saved.get(key)||null,setItem:(key,value)=>saved.set(key,value),removeItem:key=>saved.delete(key)};
  const f=fixture(()=>({v:1,id,state:"confirmed",admit_ms:1,publish_ms:2,effect_ns:100}),"",storage);
  f.context.testDevice.id="selected-quest";
  f.context.setTimeout=()=>1;f.context.clearTimeout=()=>{};
  f.setStatus({v:1,m:"open",p:"ARMED",h:"vr-session",g:7,r:2,rec:true,pending:false,o:{v:1,s:"observed",e:"11",i:"2",g:7,r:2,a:0}});
  assert.equal(vm.runInContext('canCommand()',f.context),false);
  await vm.runInContext('refreshStatus()',f.context);
  assert.equal(f.node("progress-confirmed").className,"done");assert.equal(f.writes(),0);
  await vm.runInContext('refreshStatus()',f.context);
  assert.equal(vm.runInContext('pendingOriginal',f.context),null);assert.equal(saved.has("viscereality-original-command"),false);
});

function connectionFixture(options={}) {
  const f=fixture(()=>({v:1,id:"unused",state:"pending"}));
  let choices=0,polls=0,disconnects=0;
  let nextTimer=0;const timers=new Map();
  f.context.setTimeout=callback=>{const id=++nextTimer;timers.set(id,callback);return id;};
  f.context.clearTimeout=id=>timers.delete(id);
  const listeners=new Map();
  const data=value=>new DataView(new TextEncoder().encode(JSON.stringify(value)).buffer);
  const selected={addEventListener:(name,fn)=>listeners.set(name,fn),gatt:{connected:false,
    disconnect(){disconnects++;this.connected=false;listeners.get("gattserverdisconnected")?.();},
    async connect(){
      this.connected=true;
      if(options.connect) return options.connect(selected,listeners);
      return {getPrimaryService:async()=>{
        if(options.service) return options.service();
        if(options.serviceError) throw options.serviceError;
        return {getCharacteristic:async uuid=>{
          if(options.characteristic) return options.characteristic();
          if(options.characteristicError) throw options.characteristicError;
          return {readValue:async()=>{
            if(uuid.endsWith("0003")) return data({v:1,n:"a".repeat(32),...(options.ownerId?{d:options.ownerId}:{})});
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
    expire:()=>{for(const [id,callback] of [...timers]){timers.delete(id);callback();}},timers:()=>timers.size,
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

test("peer disconnect during pending service discovery is not reported as user cancellation",async()=>{
  const f=connectionFixture({service:()=>new Promise(()=>{})});
  const attempt=f.connect();await tick();f.selected.gatt.disconnect();await attempt;
  assert.match(f.node("connection-detail").textContent,/service discovery: Error: Quest GATT disconnected/);
  assert.doesNotMatch(f.node("connection-detail").textContent,/cancelled/);
  assert.equal(f.canCommand(),false);assert.equal(f.polls(),0);
  assert.equal(f.node("reconnect").hidden,false);assert.equal(f.writes(),0);
});

test("manual reconnect reuses only the selected handle and requires new status and credentials",async()=>{
  const f=connectionFixture();await f.connect();
  vm.runInContext('accessCode="ABCDEFGH2345";showProgress("Arm","unknown","OLD_UNKNOWN")',f.context);
  f.selected.gatt.disconnect();assert.equal(f.canCommand(),false);
  assert.equal(vm.runInContext('accessCode',f.context),"");
  assert.equal(f.node("reconnect").hidden,false);
  await vm.runInContext('connect({reuseSelected:true})',f.context);
  assert.equal(f.choices(),1);assert.equal(f.polls(),2);assert.equal(f.canCommand(),true);
  assert.equal(f.node("reconnect").hidden,true);assert.equal(f.node("command-detail").textContent,"OLD_UNKNOWN");
  assert.equal(f.writes(),0);
});

test("manual reconnect without a selected grant never opens the chooser",async()=>{
  const f=connectionFixture();await vm.runInContext('connect({reuseSelected:true})',f.context);
  assert.equal(f.choices(),0);assert.equal(f.canCommand(),false);assert.equal(f.writes(),0);
});
test("reload recovers only the previously authorised Quest and reacquires status",async()=>{
  const f=connectionFixture();f.selected.id="previous";
  f.context.localStorage={getItem:()=>"previous",setItem(){},removeItem(){}};
  f.context.navigator.bluetooth.getDevices=async()=>[{id:"other",gatt:{connected:false}},f.selected];
  await vm.runInContext('resumeAuthorisedQuest()',f.context);
  assert.equal(f.choices(),0);assert.equal(f.polls(),1);assert.equal(f.canCommand(),true);
  assert.equal(vm.runInContext('device.id',f.context),"previous");
});
test("reload never switches to another permitted Quest",async()=>{
  const f=connectionFixture();f.selected.id="other";
  f.context.localStorage={getItem:()=>"previous"};
  f.context.navigator.bluetooth.getDevices=async()=>[f.selected];
  await vm.runInContext('resumeAuthorisedQuest()',f.context);
  assert.equal(f.choices(),0);assert.equal(f.polls(),0);assert.equal(f.canCommand(),false);
  assert.match(f.node("connection-detail").textContent,/permission is unavailable/);
});

test("gated reconnect cannot reuse old access code or issue commands before fresh unlock",async()=>{
  const f=connectionFixture({read:()=>new DataView(new TextEncoder().encode(JSON.stringify({v:1,m:"gated",p:"IDLE",a:[],b:[]})).buffer)});
  await f.connect();vm.runInContext('accessCode="ABCDEFGH2345"',f.context);
  f.selected.gatt.disconnect();await vm.runInContext('connect({reuseSelected:true})',f.context);
  assert.equal(f.choices(),1);assert.equal(f.canCommand(),false);
  assert.equal(vm.runInContext('accessCode',f.context),"");assert.equal(f.node("access").hidden,false);
  await f.run();assert.equal(f.writes(),0);
});

test("reconnect uses the selected handle, bounds setup, and never opens another chooser",async()=>{
  const options={};const f=connectionFixture(options);await f.connect();f.selected.gatt.disconnect();
  options.service=()=>new Promise(()=>{});
  const attempt=vm.runInContext('connect({reuseSelected:true})',f.context);await tick();
  assert.equal(f.node("reconnect").hidden,true);assert.equal(f.canCommand(),false);
  await vm.runInContext('connect({reuseSelected:true})',f.context);
  assert.ok(f.timers()>=1);f.expire();await attempt;
  assert.equal(f.choices(),1);assert.equal(f.polls(),1);assert.equal(f.canCommand(),false);assert.equal(f.writes(),0);
  assert.ok(vm.runInContext('reconnectTries',f.context)<=5);
});

for(const mode of ["cancel","pagehide"])test(`${mode} clears the remembered handle and settles with its own reason`,async()=>{
  const f=connectionFixture({service:()=>new Promise(()=>{})});const attempt=f.connect();await tick();
  if(mode==="cancel")vm.runInContext('cancelConnection()',f.context);else f.events.get("pagehide")();
  await attempt;assert.match(f.node("connection-detail").textContent,mode==="cancel"?/Connection cancelled/:/Page retired/);
  assert.equal(vm.runInContext('device',f.context),undefined);assert.equal(f.canCommand(),false);
  if(mode==="pagehide")f.events.get("pageshow")({persisted:true});
  await vm.runInContext('connect({reuseSelected:true})',f.context);
  assert.equal(f.choices(),1);assert.equal(f.writes(),0);
});

test("late service failure from a peer-disconnected attempt cannot retire manual reconnect",async()=>{
  let reject;const options={service:()=>new Promise((_,deny)=>reject=deny)};
  const f=connectionFixture(options);const old=f.connect();await tick();
  f.selected.gatt.disconnect();await old;options.service=undefined;
  await vm.runInContext('connect({reuseSelected:true})',f.context);
  const detail=f.node("connection-detail").textContent,disconnects=f.disconnects();
  reject(Error("OLD_DISCOVERY"));await tick();assert.equal(f.canCommand(),true);
  assert.equal(f.node("connection-detail").textContent,detail);assert.equal(f.disconnects(),disconnects);
  assert.equal(f.choices(),1);assert.equal(f.writes(),0);
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

for(const retirement of ["pagehide", "manual-disconnect"]){
  for(const outcome of ["resolved", "rejected"]){
    test(`${retirement}: late initial status ${outcome} preserves same-handle reconnect`,async()=>{
      let release, reads=0;
      const pending=new Promise(resolve=>release=resolve);
      const data=value=>new DataView(new TextEncoder().encode(JSON.stringify(value)).buffer);
      const f=connectionFixture({read:async()=>{
        if(++reads===1){
          await pending;
          if(outcome==="rejected") throw Error("RETIRED_INITIAL_STATUS");
          return data({v:1,m:"gated",p:"RECORDING",a:[],b:[]});
        }
        return data({v:1,m:"open",p:"IDLE",a:[],b:[]});
      }});
      const old=f.connect();await tick();
      assert.equal(reads,1);assert.equal(f.canCommand(),false);
      if(retirement==="pagehide"){
        f.events.get("pagehide")();f.events.get("pageshow")({persisted:true});
      }else f.selected.gatt.disconnect();
      await f.connect();
      assert.equal(reads,2);assert.equal(f.choices(),2);assert.equal(f.polls(),1);
      const current=f.node("connection-detail").textContent;
      const disconnects=f.disconnects();
      assert.equal(current,"Quest status received.");assert.equal(f.canCommand(),true);
      release();await old;
      assert.equal(f.node("connection-detail").textContent,current);
      assert.equal(f.disconnects(),disconnects);assert.equal(f.selected.gatt.connected,true);
      assert.equal(f.polls(),1);assert.equal(f.canCommand(),true);
      assert.equal(vm.runInContext("questStatus.m",f.context),"open");
      assert.equal(vm.runInContext("questStatus.p",f.context),"IDLE");
      assert.equal(f.writes(),0);
    });
  }
}


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

function observed(e="101",i="195",a=10,g=1,r=2) { return {v:1,s:"observed",e,i,g,r,a}; }
async function receiveAge(f,o,g=1,r=2) {
  f.context.testStatus.o=o;f.context.testStatus.g=g;f.context.testStatus.r=r;
  return vm.runInContext("refreshStatus()",f.context);
}
function ageText(f){return f.node("native-readback-age").textContent;}
test("old v1 source has unavailable native age while access and command behavior stay unchanged",async()=>{
  const f=fixture(()=>({v:1,id:"unused",state:"pending"}));
  const result=await receiveAge(f,undefined);assert.equal(result.ok,true);
  assert.equal(vm.runInContext("!!canCommand()",f.context),true);assert.match(ageText(f),/unavailable/);
});
test("read-only native age uses local elapsed time and cached reads cannot refresh it",async()=>{
  const f=fixture(()=>({v:1,id:"unused",state:"pending"}));
  await receiveAge(f,observed());assert.match(ageText(f),/at least 10 ms/);
  f.setNow(1025.9);await receiveAge(f,observed("101","195",0));assert.match(ageText(f),/at least 35 ms/);
  f.setNow(1035.9);vm.runInContext("render()",f.context);assert.match(ageText(f),/at least 45 ms/);
  assert.equal(f.writes(),0);assert.equal(vm.runInContext("!!canCommand()",f.context),true);
});
test("unknown or malformed source clears visible age but retains read and epoch replay history",async()=>{
  for(const absent of [{v:1,s:"unknown"},undefined,{v:1,s:"observed",e:"101"}]) {
    const f=fixture(()=>({v:1,id:"unused",state:"pending"}));await receiveAge(f,observed());
    f.setNow(1100);await receiveAge(f,absent);assert.match(ageText(f),/unavailable/);
    await receiveAge(f,observed("101","195",0));assert.match(ageText(f),/unavailable/);
    await receiveAge(f,observed("101","194",0));assert.match(ageText(f),/unavailable/);
    await receiveAge(f,observed("100","999",0));assert.match(ageText(f),/unavailable/);
    await receiveAge(f,observed("101","196",0));assert.match(ageText(f),/at least 0 ms/);
  }
});
test("strict age projection rejects closed-shape, int64, safe integer and state join negatives",async()=>{
  const invalid=[{...observed(),v:2},{...observed(),extra:1},{...observed(),g:0},
    {...observed(),r:3},{...observed(),a:-1},{...observed(),a:1.5},{...observed(),a:Number.MAX_SAFE_INTEGER+1},
    {...observed(),e:101},{...observed(),e:"0"},{...observed(),e:"01"},{...observed(),e:"-1"},
    {...observed(),e:"9223372036854775808"},{...observed(),i:"1e3"},{...observed(),i:"9223372036854775808"},
    {...observed(),g:Number.MAX_SAFE_INTEGER+1},{...observed(),r:null}];
  for(const o of invalid){const f=fixture(()=>({v:1,id:"unused",state:"pending"}));await receiveAge(f,o);assert.match(ageText(f),/unavailable/);assert.equal(f.writes(),0);}
  const f=fixture(()=>({v:1,id:"unused",state:"pending"}));
  await receiveAge(f,observed("9223372036854775807","9223372036854775807",0));assert.match(ageText(f),/at least 0 ms/);
  await receiveAge(f,observed("9223372036854775806","9223372036854775807",0));assert.match(ageText(f),/unavailable/);
});
test("same observation ID cannot acquire a new state join and clock regression cannot revive it",async()=>{
  const f=fixture(()=>({v:1,id:"unused",state:"pending"}));await receiveAge(f,observed());
  await receiveAge(f,observed("101","195",0,2,2),2,2);assert.match(ageText(f),/unavailable/);
  await receiveAge(f,observed());assert.match(ageText(f),/unavailable/);
  await receiveAge(f,observed("101","196",0));assert.match(ageText(f),/at least 0 ms/);
  f.setNow(999);vm.runInContext("render()",f.context);assert.match(ageText(f),/unavailable/);
  f.setNow(1100);await receiveAge(f,observed("101","196",0));assert.match(ageText(f),/unavailable/);
  await receiveAge(f,observed("101","197",0));assert.match(ageText(f),/at least 0 ms/);
});
test("connection replacement resets only its observation scope and preserves historical Unknown",async()=>{
  const f=fixture(()=>({v:1,id:"unused",state:"pending"}));await receiveAge(f,observed());
  vm.runInContext('showProgress("Arm","unknown","OLD_UNKNOWN");disconnected();device=testDevice;characteristics=testCharacteristics;',f.context);
  await receiveAge(f,observed("1","1",0));assert.match(ageText(f),/at least 0 ms/);
  assert.equal(f.node("command-detail").textContent,"OLD_UNKNOWN");assert.equal(f.writes(),0);
});
test("age extension cannot re-enable commands or mutate a pending command outcome",async()=>{
  const f=fixture(()=>({v:1,id:"unused",state:"pending"}));
  vm.runInContext('commandBusy=true;showProgress("Arm","unknown","PRESERVE_UNKNOWN");',f.context);
  const result=await receiveAge(f,observed());assert.equal(result.ok,false);
  assert.equal(vm.runInContext("!!canCommand()",f.context),false);assert.equal(f.writes(),0);
  assert.equal(f.node("command-detail").textContent,"PRESERVE_UNKNOWN");
});

for(const stage of ["connect","service","characteristic","read"])test(`never resolving ${stage} is bounded after selection without retry or readiness`,async()=>{
 const f=connectionFixture({[stage]:()=>new Promise(()=>{})});
 const attempt=f.connect();await tick();assert.equal(f.timers(),1);
 f.expire();await attempt;
 assert.equal(f.node("connect").disabled,false);assert.equal(f.canCommand(),false);
 assert.equal(f.choices(),1);assert.equal(f.polls(),0);assert.equal(f.timers(),0);
 assert.match(f.node("connection-detail").textContent,/timed out/);
});
test("human chooser has no deadline but explicit cancellation settles without selection",async()=>{
 let release;const f=connectionFixture({choose:()=>new Promise(resolve=>release=resolve)});
 const attempt=f.connect();await tick();assert.equal(f.timers(),0);
 vm.runInContext("cancelConnection()",f.context);await attempt;
 release();await tick();assert.equal(f.selected.gatt.connected,false);
 assert.equal(f.canCommand(),false);assert.equal(f.choices(),1);assert.equal(f.polls(),0);
});
for(const mode of ["timeout","pagehide","cancel"])test(`late GATT connect after ${mode} is retired without freshness`,async()=>{
 let release;const f=connectionFixture({connect:()=>new Promise(resolve=>release=resolve)});
 const attempt=f.connect();await tick();
 if(mode==="timeout")f.expire();else if(mode==="pagehide")f.events.get("pagehide")();else vm.runInContext("cancelConnection()",f.context);
 await attempt;f.selected.gatt.connected=true;release({getPrimaryService(){throw Error("late service must not run");}});await tick();
 assert.equal(f.selected.gatt.connected,false);assert.equal(f.canCommand(),false);assert.equal(f.polls(),0);
 assert.equal(f.choices(),1);
});
for(const stage of ["service","characteristic","read"])test(`late ${stage} completion after cancellation cannot publish readiness`,async()=>{
 let release;const f=connectionFixture({[stage]:()=>new Promise(resolve=>release=resolve)});
 const attempt=f.connect();await tick();vm.runInContext("cancelConnection()",f.context);await attempt;
 release(stage==="read"?new DataView(new TextEncoder().encode(JSON.stringify({v:1,m:"open",p:"IDLE"})).buffer):{});await tick();
 assert.equal(f.canCommand(),false);assert.equal(f.polls(),0);assert.equal(f.node("connect").disabled,false);
});

for(const stage of ["connect","service","characteristic","read"])test(`fresh generation recovers from abandoned ${stage} promise`,async()=>{
 let release,reject;const options={[stage]:()=>new Promise((resolve,deny)=>{release=resolve;reject=deny;})};
 const f=connectionFixture(options);const old=f.connect();await tick();f.expire();await old;
 options[stage]=undefined;await f.connect();assert.equal(f.canCommand(),true);assert.equal(f.polls(),1);
 const detail=f.node("connection-detail").textContent;const disconnects=f.disconnects();
 if(stage==="connect")release({getPrimaryService(){throw Error("old service must never run");}});else reject(Error("late abandoned rejection"));
 await tick();assert.equal(f.selected.gatt.connected,true);assert.equal(f.disconnects(),disconnects);
 assert.equal(f.node("connection-detail").textContent,detail);assert.equal(f.choices(),2);
});


test("Polar default retains delayed pending then matching dispatched beyond35s",async()=>{
  let reads=0;const f=fixture(get=>{f.setNow(++reads===1?41000:46000);return{v:1,id:get().id,state:reads===1?"pending":"dispatched"};});
  f.setStatus({...controlStatus(),z:{r:0,a:7,e:0}});
  await vm.runInContext('sendPolarStop("stop-acc")',f.context);
  assert.equal(reads,2);assert.equal(f.writes(),1);assert.match(f.node("command-detail").textContent,/Stop requested/);
  assert.equal(f.node("progress-confirmed").className,"");
});
test("pre-cancelled Polar observer remains unissued",async()=>{
  const f=fixture(()=>{throw Error("must not read");});f.setStatus({...controlStatus(),z:{r:0,a:7,e:0}});
  f.context.signal={aborted:true,addEventListener(){},removeEventListener(){}};
  await vm.runInContext('sendPolarStop("stop-acc",{signal})',f.context);assert.equal(f.writes(),0);
});
for(const mode of ["cancel","disconnect"])test(`Polar ${mode} settles observer while unresolved read retains queue ownership`,async()=>{
  let release;const f=fixture(()=>new Promise(done=>release=done));f.setStatus({...controlStatus(),z:{r:0,a:7,e:0}});
  const operation=vm.runInContext('sendPolarStop("stop-acc")',f.context);await tick();
  assert.equal(f.writes(),1);vm.runInContext(mode==="cancel"?'cancelPolarObservation()':'disconnected()',f.context);
  await operation;const detail=f.node("command-detail").textContent;assert.match(detail,/cancelled|disconnected/);
  let queued;
  if(mode==="cancel") {
    f.context.queueProbe=()=>{queued=true;};
    const next=vm.runInContext('gattOperation(queueProbe)',f.context);await tick();assert.equal(queued,undefined);
    release({v:1,id:f.request().id,state:"dispatched"});await next;assert.equal(queued,true);
  } else release({v:1,id:f.request().id,state:"dispatched"});
  await tick();assert.equal(f.node("command-detail").textContent,detail);assert.equal(f.writes(),1);
});
test("explicit Polar finite observation ends unknown without replay",async()=>{
  const f=fixture(()=>new Promise(()=>{}));f.setStatus({...controlStatus(),z:{r:0,a:7,e:0}});
  await vm.runInContext('sendPolarStop("stop-acc",{observeForMs:60000})',f.context);
  assert.equal(f.writes(),1);assert.match(f.node("command-detail").textContent,/Explicit Polar observation window ended/);
});
for(const observeForMs of [true,0,-1,1.5,Infinity])test(`invalid explicit observation window ${observeForMs} denies before write`,async()=>{
  const f=fixture(()=>{throw Error("must not read");});f.setStatus({...controlStatus(),z:{r:0,a:7,e:0}});f.context.observeForMs=observeForMs;
  await assert.rejects(vm.runInContext('sendPolarStop("stop-acc",{observeForMs})',f.context));assert.equal(f.writes(),0);
});

test("Polar cancelled during authenticated preparation stays unissued",async()=>{
  let release;const f=fixture(()=>{throw Error("must not read receipt");});
  f.setStatus({...controlStatus(),m:"gated",z:{r:0,a:7,e:0}});
  f.context.testCharacteristics.challenge={readValue:()=>new Promise(done=>release=done)};
  vm.runInContext('accessCode="ABCDEFGH2345"',f.context);
  const operation=vm.runInContext('sendPolarStop("stop-acc")',f.context);await tick();
  vm.runInContext('cancelPolarObservation()',f.context);
  release(new DataView(new TextEncoder().encode(JSON.stringify({v:1,n:"a".repeat(32)})).buffer));await operation;
  assert.equal(f.writes(),0);assert.match(f.node("command-detail").textContent,/cancelled/);
});
test("explicit long Polar observer window avoids browser timer overflow",async()=>{
  const f=fixture(()=>new Promise(()=>{}));f.setStatus({...controlStatus(),z:{r:0,a:7,e:0}});
  const delays=[];f.context.setTimeout=(callback,ms)=>{delays.push(ms);return 7;};
  const operation=vm.runInContext('sendPolarStop("stop-acc",{observeForMs:2147483648})',f.context);await tick();
  assert.equal(delays[0],2147483647);vm.runInContext('cancelPolarObservation()',f.context);await operation;assert.equal(f.writes(),1);
});

for(const stage of ["challenge","write"])test(`Polar cancellation settles never-resolving ${stage} without queue release or late effect replay`,async()=>{
  let release,writeCalls=0;const f=fixture(()=>{throw Error("must not read receipt after cancellation");});
  f.setStatus({...controlStatus(),m:stage==="challenge"?"gated":"open",z:{r:0,a:7,e:0}});
  if(stage==="challenge") {
    f.context.testCharacteristics.challenge={readValue:()=>new Promise(done=>release=done)};
    vm.runInContext('accessCode="ABCDEFGH2345"',f.context);
  } else f.context.testCharacteristics.command.writeValueWithResponse=()=>{writeCalls++;return new Promise(done=>release=done);};
  const operation=vm.runInContext('sendPolarStop("stop-acc")',f.context);await tick();
  assert.equal(typeof release,"function");vm.runInContext('cancelPolarObservation()',f.context);
  await operation;assert.equal(vm.runInContext('commandBusy',f.context),false);
  const detail=f.node("command-detail").textContent;assert.match(detail,/cancelled/);
  let queued=false;f.context.queueProbe=()=>{queued=true;};const next=vm.runInContext('gattOperation(queueProbe)',f.context);await tick();assert.equal(queued,false);
  release(stage==="challenge"?new DataView(new TextEncoder().encode(JSON.stringify({v:1,n:"a".repeat(32)})).buffer):undefined);
  await next;await tick();assert.equal(queued,true);assert.equal(f.node("command-detail").textContent,detail);assert.equal(f.writes(),0);assert.equal(writeCalls,stage==="write"?1:0);
});


test("network adapter drives existing guide and exact command receipt without BLE characteristics",async()=>{
  const f=fixture(get=>({v:1,id:get().id,state:"confirmed"}));
  vm.runInContext('networkTransport={active:true,device:"b".repeat(32),epoch:"321",read:async(name)=>testCharacteristics[name].readValue(),write:async(bytes)=>testCharacteristics.command.writeValueWithResponse(bytes)};device=undefined;characteristics=undefined;',f.context);
  await f.run();assert.equal(f.writes(),1);assert.equal(f.node("progress-confirmed").className,"done");
  assert.equal(vm.runInContext('ownerIdentity()',f.context),'gateway:'+ 'b'.repeat(32)+':321');
});
test("lost network command response preserves original ID before effect admission",async()=>{
  const saved=new Map(),storage={getItem:key=>saved.get(key)||null,setItem:(key,value)=>saved.set(key,value),removeItem:key=>saved.delete(key)};
  const f=fixture(()=>({}),"",storage);
  vm.runInContext('networkTransport={active:true,device:"b".repeat(32),epoch:"321",write:async()=>{throw Error("lost response");}};device=undefined;characteristics=undefined;nativeAgeScope={generation:connectionGeneration,epoch:"123",visible:{age:0,at:performance.now()},clock:performance.now()};',f.context);
  await f.run();
  const original=JSON.parse(saved.get("viscereality-original-command"));
  assert.match(original.id,/^[0-9a-f]{16}$/);assert.equal(original.epoch,"123");assert.equal(original.deviceId,'gateway:'+ 'b'.repeat(32)+':321');
  assert.equal(vm.runInContext('pendingOriginal.state',f.context),'uncertain');
});


test("idle Polar setup uses the observed runtime epoch and process radio before any recording",()=>{
  const f=fixture(()=>{throw Error("no command expected")});
  const initial={p:"IDLE",h:"vr-preparation",g:0,r:1,rec:false,pending:false,st:"ready",bt:"UNAVAILABLE",
    o:{v:1,s:"observed",e:"7",i:"1",g:0,r:1,a:0},y:{...setupGrant,c:true,a:true},a:["track-ready","track-ready"]};
  f.setStatus(initial);f.render();
  assert.equal(f.node("guide-title").textContent,"Choose condition");
  assert.equal(f.node("bluetooth-status").textContent,"On");
  assert.equal(f.node("guide-action").disabled,false);
  f.setStatus({g:4,o:{...initial.o,g:4}});f.render();
  assert.equal(f.node("guide-title").textContent,"Choose condition");
  f.setStatus({y:{...initial.y,b:false},bt:"ON"});f.render();
  assert.equal(f.node("guide-title").textContent,"Polar radio unavailable");
  assert.equal(f.node("bluetooth-status").textContent,"OFF");
  for(const o of [undefined,{...initial.o,e:"8"},{...initial.o,e:7},{...initial.o,e:"07"},
      {...initial.o,g:9},{...initial.o,r:2},{...initial.o,s:"unavailable"},{...initial.o,extra:true}]) {
    f.setStatus({...initial,o});f.render();
    assert.equal(f.node("guide-title").textContent,"Polar setup unavailable");
    assert.equal(f.node("rescan-polar").disabled,true);
  }
  assert.equal(f.writes(),0);
});

test("Polar setup runtime change before write prevents dispatch",async()=>{
  const f=fixture(()=>{throw Error("no receipt expected")});
  f.setStatus({p:"IDLE",h:"vr-preparation",g:0,r:1,rec:false,st:"ready",bt:"UNAVAILABLE",m:"gated",
    o:{v:1,s:"observed",e:"7",i:"1",g:0,r:1,a:0},y:{...setupGrant}});
  vm.runInContext('accessCode="ABCDEFGH2345"',f.context);
  f.context.testCharacteristics.challenge={readValue:async()=>{
    f.setStatus({o:{v:1,s:"observed",e:"8",i:"2",g:0,r:1,a:0}});
    return new DataView(new TextEncoder().encode(JSON.stringify({v:1,n:"a".repeat(32)})).buffer);
  }};
  await vm.runInContext('sendPolarSetup("connect")',f.context);
  assert.equal(f.writes(),0);assert.match(f.node("command-detail").textContent,/Polar setup changed/);
});
