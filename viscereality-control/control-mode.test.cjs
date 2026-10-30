const test = require("node:test"), assert = require("node:assert/strict");
const fs = require("node:fs"), vm = require("node:vm"), {webcrypto} = require("node:crypto");
const core = require("../shared/quest-ble/gatt-lifetime.js");
const tick = () => new Promise(resolve => setImmediate(resolve));
const data = value => new DataView(new TextEncoder().encode(JSON.stringify(value)).buffer);
const session = "0123456789abcdef0123456789abcdef";
const operations = [
  ["save", 'sendCommand("save-next","Save session")'],
  ["session", 'sendSessionControl("pause")'],
  ["Polar stop", 'sendPolarStop("stop-acc")'],
  ["Polar setup", 'sendPolarSetup("connect")'],
];

// Runs the complete application and its real serialized operation queue. Only
// DOM, clock, and device I/O are replaced; no server or headset is involved.
function fixture(mode = "remote", readReceipt, breathView) {
  const nodes = new Map(), saved = new Map();
  function node(id) {
    if (!nodes.has(id)) {
      const n = {textContent:"", className:"", value:"0", dataset:{}, children:[],
        addEventListener(){}, setAttribute(){}, removeAttribute(){},
        replaceChildren(){this.children = [];}, append(child){this.children.push(child);}};
      n.classList = {toggle(){}, contains: value => n.className.split(" ").includes(value)};
      nodes.set(id, n);
    }
    return nodes.get(id);
  }
  const status = {v:1, m:"open", p:"RUNNING", h:"vr-session", g:7, r:3,
    rec:true, pending:false, ms:25000, c:"condition-a", st:"ready", k:"ready",
    bt:"ON", po:"CONNECTED", pf:true, a:["track-ready","track-ready"], b:["pattern-ready","pattern-ready"],
    bg:[10,0], q:{v:2,s:session,g:7,o:["start","pause","resume","set-bias"]},
    z:{r:3,s:session,a:7,e:0},
    y:{s:session,g:7,r:3,p:true,b:true,c:true,x:"abcdef123456",a:true,e:false,sc:false,d:["abcdef123456"]},
    o:{v:1,s:"observed",e:"7",i:"1",g:7,r:3,a:0}};
  if (mode !== "legacy") status.control_mode = mode;
  const requests = [], reads = [];
  const transport = {active:true, device:"selected-quest", epoch:"11", close(){this.active=false;},
    async read(name) {
      reads.push(name);
      if (name === "status") return data(status);
      if (name === "challenge") return data({v:1,n:"a".repeat(32)});
      return data(readReceipt ? await readReceipt(requests.at(-1))
        : {v:1,id:requests.at(-1).id,state:"confirmed",detail:"ORIGINAL_RECEIPT"});
    },
    async write(bytes) {requests.push(JSON.parse(new TextDecoder().decode(bytes)));}};
  let now = 1000;
  const context = vm.createContext({QuestBleLifetime:core, TextEncoder, TextDecoder, URLSearchParams, Promise,
    ViscerealityBreathMonitor:breathView&&{createView:()=>breathView},
    crypto:webcrypto, location:{search:""},
    document:{getElementById:node, querySelectorAll:()=>[], createElement:()=>({value:"",textContent:""})},
    window:{scrollTo(){},addEventListener(){}},
    localStorage:{getItem:key=>saved.get(key)||null, setItem:(key,value)=>saved.set(key,value), removeItem:key=>saved.delete(key)},
    Date:{now:()=>now}, performance:{now:()=>now}, clearTimeout(){}, clearInterval(){},
    setTimeout:(callback, ms)=>{now+=ms;queueMicrotask(callback);}, testTransport:transport, testStatus:status,
    testDevice:{id:"selected-quest",gatt:{connected:true}},
    testCharacteristics:{status:{readValue:()=>transport.read("status")}, challenge:{readValue:()=>transport.read("challenge")},
      command:{writeValueWithResponse:bytes=>transport.write(bytes)}, receipt:{readValue:()=>transport.read("receipt")}}});
  vm.runInContext(fs.readFileSync(require.resolve("./app.js"), "utf8"), context);
  const run = source => vm.runInContext(source, context);
  run("networkTransport=testTransport;questStatus=testStatus;lastStatusAt=Date.now();render()");
  return {context,node,status,requests,reads,saved,run,
    setMode(value) {status.control_mode=value;run("render()");},
    useBle() {run('networkTransport=undefined;device=testDevice;characteristics=testCharacteristics;questStatus.m="gated";accessCode="ABCDEFGH2345"');}};
}

function monitorView() {
  return {fresh:true,notices:[],accepted:0,resets:0,model:{query:()=>({run:'11:7',after:1})},
    unavailable(message){this.fresh=false;this.notices.push(message);},
    accept(){this.accepted++;this.fresh=true;},reset(){this.resets++;this.fresh=false;}};
}
test('breathing watchdog marks stale even after the route becomes inactive',async()=>{
  const view=monitorView(),f=fixture('remote',undefined,view);
  f.run('testTransport.active=false;breathReceivedAt=Date.now()-3000');
  await f.run('refreshBreathing()');
  assert.equal(view.fresh,false);assert.match(view.notices.at(-1),/delayed/);
});
test('a failed status read invalidates the breathing current state immediately',async()=>{
  const view=monitorView(),f=fixture('remote',undefined,view);
  f.context.testTransport.read=async()=>{throw new Error('lost gateway');};
  await f.run('refreshStatus()');
  assert.equal(view.fresh,false);assert.match(view.notices.at(-1),/Status unavailable/);
});
test('a breathing response arriving after disconnect cannot repopulate the previous run',async()=>{
  const view=monitorView(),f=fixture('remote',undefined,view);let reply;
  f.context.testTransport.exchange=()=>new Promise(resolve=>{reply=resolve;});
  f.run('questStatus.breath_monitor=1');
  const pending=f.run('refreshBreathing()');await tick();
  f.run('disconnected("test disconnect")');reply({v:1});await pending;
  assert.equal(view.accepted,0);assert.equal(view.resets,1);
});

for (const mode of ["direct", "choose"]) test(`${mode} keeps native status visible and directs mode selection to the headset`, async () => {
  const f = fixture(mode);
  const result = await f.run("refreshStatus()");
  assert.equal(result.ok, true);
  assert.equal(f.node("connection-label").textContent, "Quest status current");
  assert.equal(f.node("phase").textContent, "RUNNING");
  assert.equal(f.node("active-time").textContent, "00:25");
  assert.match(f.node("presentation").textContent, new RegExp(mode, "i"));
  assert.match(f.node("guide-instruction").textContent, /headset.*panel.*Remote/i);
  assert.match(f.node("session-control-note").textContent, /headset.*panel.*Remote/i);
  assert.equal(f.node("refresh").disabled, false);
  assert.doesNotMatch(f.node("guide-title").textContent, /unknown|unavailable|attention/i);
});

for (const mode of ["direct", "choose", "invalid", null, false, 2, {}, [], "", "REMOTE"]) {
  test(`present ${JSON.stringify(mode)} mode blocks every browser mutation`, async () => {
    const f = fixture(mode);
    await f.run("refreshStatus()");
    for (const id of ["open-polar","rescan-polar","start-polar-ecg","return-vr","guide-return-vr","arm-one","arm-two",
      "breath-bias","live-bias","apply-live-bias","save-next","save-exit","start-session","pause-session","resume-session","stop-polar-acc","stop-polar-ecg"]) {
      assert.equal(f.node(id).disabled, true, id);
    }
    for (const [, source] of operations) await f.run(source);
    await f.run('sendCommand("return-vr","Return to VR")');
    await f.run('sendCommand("ping","Ping")');
    assert.equal(f.requests.length, 0);
    assert.equal(f.saved.size, 0);
  });
}

for (const mode of ["legacy", "remote"]) test(`${mode} owner preserves current command behavior without switching mode`, async () => {
  const f = fixture(mode);
  assert.equal(f.node("pause-session").disabled, false);
  await f.run('sendSessionControl("pause")');
  assert.equal(f.requests.length, 1);
  assert.equal(f.requests[0].op, "pause");
  assert.equal(f.node("command-detail").textContent, "ORIGINAL_RECEIPT");
  assert.equal(f.node("progress-confirmed").className, "done");
  assert.equal(f.requests.some(request => /mode/.test(request.op)), false);
  if (mode === "legacy") assert.doesNotMatch(f.node("presentation").textContent, /mode/i);
  else assert.match(f.node("presentation").textContent, /Remote mode/);
});

test("Remote session instructions use browser controls without disabled Direct gestures", () => {
  const f = fixture();
  assert.match(f.node("stage-instruction").textContent, /Pause session/);
  assert.doesNotMatch(f.node("stage-instruction").textContent, /Grip|hold|gesture/i);
});

for (const [name, source] of operations) test(`${name} mode change during signing prevents dispatch and does not create an uncertain original`, async () => {
  const f = fixture();
  f.useBle();
  let release, started;
  const signing = new Promise(resolve => {started=resolve;});
  const blocked = new Promise(resolve => {release=resolve;});
  f.context.crypto = {getRandomValues:bytes=>webcrypto.getRandomValues(bytes), subtle:{
    importKey:(...args)=>webcrypto.subtle.importKey(...args),
    async sign(...args) {started();await blocked;return webcrypto.subtle.sign(...args);}}};
  const command = f.run(source);
  await signing;
  f.setMode("direct");
  release();
  await command;
  assert.equal(f.requests.length, 0);
  assert.equal(f.run("pendingOriginal"), null);
  assert.equal(f.saved.size, 0);
  assert.match(f.node("command-detail").textContent, /not sent.*headset.*panel.*Remote/i);
  assert.doesNotMatch(f.node("command-detail").textContent, /unknown|result unavailable/i);
});

for (const [name, source] of operations) test(`${name} rechecks mode inside the serialized write after queueing`, async () => {
  const f = fixture();
  let release;
  f.context.blocked = new Promise(resolve => {release=resolve;});
  const occupied = f.run("gattOperation(()=>blocked)");
  const command = f.run(source);
  await tick();
  f.setMode("choose");
  release();
  await occupied;
  await command;
  assert.equal(f.requests.length, 0);
  assert.equal(f.run("pendingOriginal"), null);
  assert.match(f.node("command-detail").textContent, /not sent.*headset.*panel.*Remote/i);
});

test("an issued command keeps its exact original receipt after switching to Direct", async () => {
  let release;
  const receipt = new Promise(resolve => {release=resolve;});
  const f = fixture("remote", async request => {await receipt;return {v:1,id:request.id,state:"confirmed",detail:"EXACT_ORIGINAL"};});
  const command = f.run('sendSessionControl("pause")');
  await tick();
  assert.equal(f.requests.length, 1);
  f.setMode("direct");
  release();
  await command;
  assert.equal(f.requests.length, 1);
  assert.equal(f.node("command-detail").textContent, "EXACT_ORIGINAL");
  assert.equal(f.node("progress-confirmed").className, "done");
  assert.equal(f.node("pause-session").disabled, true);
});

test("Direct reconnect reconciles the original ID without replay or a mode command", async () => {
  const id="1234567890abcdef";
  const f = fixture("direct", () => ({v:1,id,state:"confirmed",detail:"RETAINED_ORIGINAL"}));
  f.run(`pendingOriginal={id:"${id}",deviceId:"gateway:selected-quest:11",epoch:"7",name:"Pause session",op:"pause",state:"observing"}`);
  // Receipt read settlement uses a real timer here, not the advancing poll clock.
  f.context.setTimeout=setTimeout;f.context.clearTimeout=clearTimeout;
  await f.run("refreshStatus()");
  assert.equal(f.reads.includes("receipt"), true);
  assert.equal(f.node("command-detail").textContent, "RETAINED_ORIGINAL");
  assert.equal(f.run("pendingOriginal.state"), "reconciled_receipt");
  await f.run("refreshStatus()");
  assert.equal(f.run("pendingOriginal"), null);
  assert.equal(f.requests.length, 0);
  assert.equal(f.node("pause-session").disabled, true);
});
