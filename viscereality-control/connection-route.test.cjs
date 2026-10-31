const test = require("node:test"), assert = require("node:assert/strict");
const fs = require("node:fs"), vm = require("node:vm");
const core = require("../shared/quest-ble/gatt-lifetime.js");
const tick = () => new Promise(resolve => setImmediate(resolve));

// The checked-in select options supply the DOM's initial value. The full app
// and its event listeners run unchanged; device and gateway I/O end locally.
function fixture({remembered = false, permitted = [], localJoin, bluetooth} = {}) {
  const html = fs.readFileSync(require.resolve("./index.html"), "utf8");
  const select = html.match(/<select id="connection-route">([\s\S]*?)<\/select>/)[1];
  const options = [...select.matchAll(/<option\b([^>]*)>([^<]*)<\/option>/g)].map(([,attributes,text]) => ({
    value:attributes.match(/\bvalue="([^"]*)"/)[1], selected:/\bselected\b/.test(attributes), textContent:text
  }));
  const nodes = new Map(), saved = new Map();
  if (remembered) saved.set("viscereality-authorised-quest", "previous");
  function node(id) {
    if (!nodes.has(id)) {
      const attributes = html.match(new RegExp(`<[^>]*\\bid="${id}"[^>]*>`))?.[0] || "";
      const n = {textContent:"",className:"",value:"0",dataset:{},children:[],hidden:/\bhidden\b/.test(attributes),events:new Map(),
        addEventListener(name, callback){this.events.set(name,callback);}, setAttribute(){},removeAttribute(){},
        replaceChildren(){this.children=[];},append(...children){this.children.push(...children);}};
      n.classList = {toggle(){},contains:value=>n.className.split(" ").includes(value)};
      if (id === "connection-route") {n.options=options;n.value=(options.find(option=>option.selected)||options[0]).value;}
      if (id === "route-note") n.textContent=html.match(/<p id="route-note">([^<]*)<\/p>/)[1];
      nodes.set(id,n);
    }
    return nodes.get(id);
  }
  const gateways = [];
  let choices=0,inventories=0;
  const context = vm.createContext({QuestBleLifetime:core,TextEncoder,TextDecoder,URLSearchParams,Promise,
    AbortController, location:{search:"",protocol:"https:"},isSecureContext:true,
    document:{getElementById:node,querySelectorAll:()=>[],createElement:()=>node("created-"+nodes.size)},
    window:{scrollTo(){},addEventListener(){}},
    localStorage:{getItem:key=>saved.get(key)||null,setItem:(key,value)=>saved.set(key,value),removeItem:key=>saved.delete(key)},
    navigator:{bluetooth:bluetooth || {async requestDevice(){choices++;throw new Error("Chooser dismissed in host fixture");},
      async getDevices(){inventories++;return permitted;}}},
    ViscerealityTransport:{localJoin: localJoin || (async()=>{throw Error("Host fixture stops before local I/O");}),Gateway:class {
      constructor(options){gateways.push(options);}
      async connect(){throw new Error("Host fixture stops before gateway I/O");}
      close(){}
    }},
    performance:{now:()=>1000},setTimeout:()=>1,clearTimeout(){},clearInterval(){},setInterval(){throw new Error("No polling expected");}});
  const discovery=require('./discovery.js');
  context.ViscerealityDiscovery={...discovery,Discovery:class extends discovery.Discovery {constructor(){super({bluetooth:context.navigator.bluetooth});}}};
  vm.runInContext(fs.readFileSync(require.resolve("./app.js"),"utf8"),context);
  return {context,node,saved,gateways,options,choices:()=>choices,inventories:()=>inventories,
    run:source=>vm.runInContext(source,context),
    choose(route){node("connection-route").value=route;node("connection-route").events.get("change")();},
    connect:()=>node("connect").events.get("click")()};
}

test("initial page selects local discovery with advanced enrollment hidden", () => {
  const f = fixture();
  assert.equal(f.options.find(option=>option.selected)?.value,"local");
  assert.equal(f.node("connection-route").value,"local");
  assert.equal(f.run("selectedRoute"),"local");
  assert.equal(f.node("network-enrollment").hidden,true);
  assert.equal(f.node("relay-token-row").hidden,true);
  assert.equal(f.node("trusted-lan-row").hidden,false);
  assert.match(f.node("route-note").textContent,/same Wi-Fi|headset/i);
});

test("initial Connect dispatches gateway enrollment without a Bluetooth chooser", async () => {
  const f = fixture();
  f.choose("lan");
  f.node("gateway-url").value="http://192.168.43.2/v1/gateway";
  f.node("controller-id").value="enrolled-controller";
  f.node("gateway-device").value="enrolled-headset";
  f.node("controller-key").value="synthetic-key";
  await f.connect();
  assert.equal(f.choices(),0);
  assert.equal(f.gateways.length,1);
  assert.equal(f.gateways[0].url,"http://192.168.43.2/v1/gateway");
  assert.equal(f.gateways[0].controller,"enrolled-controller");
  assert.equal(f.gateways[0].device,"enrolled-headset");
  assert.equal(f.gateways[0].routeToken,"");
});

test("LAN startup does not recover a remembered Bluetooth connection", async () => {
  const f = fixture({remembered:true});
  await tick();
  assert.equal(f.inventories(),0);
  assert.equal(f.choices(),0);
  assert.equal(f.gateways.length,0);
  assert.equal(f.run("device"),undefined);
});

for (const route of ["ble","lan","direct","relay"]) test(`explicit ${route} route still dispatches its existing connection path`, async () => {
  const f = fixture();
  f.choose(route);
  assert.equal(f.run("selectedRoute"),route);
  assert.equal(f.node("network-enrollment").hidden,route==="ble");
  assert.equal(f.node("relay-token-row").hidden,route!=="relay");
  assert.equal(f.node("trusted-lan-row").hidden,route==="relay");
  f.node("relay-token").value="synthetic-relay-token";
  await f.connect();
  assert.equal(f.choices(),route==="ble"?1:0);
  assert.equal(f.gateways.length,route==="ble"?0:1);
  if (route!=="ble") assert.equal(f.gateways[0].routeToken,route==="relay"?"synthetic-relay-token":"");
});

test("pending authorized BLE lookup cannot take over after explicit LAN selection", async () => {
  let release;
  const f = fixture({permitted:new Promise(resolve=>{release=resolve;})});
  f.saved.set("viscereality-authorised-quest","previous");
  f.choose("ble");
  const resume=f.run("resumeAuthorisedQuest()");
  await tick();
  assert.equal(f.inventories(),1);
  f.choose("lan");
  release([{id:"previous",gatt:{connected:false}}]);
  await resume;
  assert.equal(f.run("device"),undefined);
  assert.equal(f.run("selectedRoute"),"lan");
  assert.equal(f.gateways.length,0);
  assert.equal(f.choices(),0);
});

const discovered={v:1,device:'b'.repeat(32),serial:'<SYNTHETIC & SERIAL>',epoch:'123',native_epoch:'456',mode:'remote',gateways:['http://192.168.43.2:8766/v1/gateway']};
function discoveryBluetooth(data=discovered) {
 let releases=0;const bytes=value=>new DataView(new TextEncoder().encode(value).buffer);
 return {get releases(){return releases;},requestDevice(){return Promise.resolve({id:'unnamed',gatt:{connected:false,disconnect(){this.connected=false;releases++;},async connect(){this.connected=true;return {getPrimaryService:async()=>({getCharacteristic:async uuid=>({readValue:async()=>bytes(uuid.endsWith('020102')?data.serial:JSON.stringify(data))})})};}}});}};
}
test('discovery roster shows serial using safe text and releases discovery without touching legacy device',async()=>{
 const bluetooth=discoveryBluetooth(),f=fixture({bluetooth});assert.equal(typeof f.node('find-headset').events.get('click'),'function');
 await f.node('find-headset').events.get('click')();
 assert.equal(bluetooth.releases,1);assert.equal(f.run('device'),undefined);
 assert.equal(f.node('headset-roster').children[0].children[0].textContent,'<SYNTHETIC & SERIAL>');
 assert.equal(f.run('selectedHeadset.device'),'b'.repeat(32));assert.match(f.node('discovery-note').textContent,/Wi-Fi/);
 assert.doesNotMatch([...f.saved.values()].join(''),/epoch|key|controller|gateways/);
});
test('reload restores identity only, with no availability claim, credential or chooser',async()=>{
 const f=fixture();f.saved.set('viscereality-headset-identities',JSON.stringify([{device:discovered.device,serial:discovered.serial,gateway:discovered.gateways[0]}]));
 f.run('headsetRoster=new ViscerealityDiscovery.Roster(localStorage);renderHeadsets()');
 assert.match(f.node('headset-roster').children[0].children[1].textContent,/remembered|verify/i);assert.equal(f.choices(),0);assert.equal(f.inventories(),0);
});
test('page retirement cancels a pending key-free local join and rejects late takeover',async()=>{
 let release,signal;const f=fixture({localJoin:options=>{signal=options.signal;return new Promise(resolve=>release=resolve);}});
 f.node('local-gateway-url').value=discovered.gateways[0];const pending=f.run('connectLocal({manual:true})');await tick();
 f.run('retirePageConnection()');assert.equal(signal.aborted,true);
 let closed=0;release({gateway:{close(){closed++;}},identity:discovered,url:discovered.gateways[0]});await pending;
 assert.equal(closed,1);assert.equal(f.run('networkTransport'),undefined);
});
test('empty discovered route list shows serial but cannot connect using an invented endpoint',async()=>{
 const f=fixture({bluetooth:discoveryBluetooth({...discovered,gateways:[]})});await f.node('find-headset').events.get('click')();
 assert.equal(f.node('headset-roster').children[0].children[2].disabled,true);assert.match(f.node('headset-roster').children[0].children[1].textContent,/no.*route/i);
});

test('two-headset roster selection binds Connect to the selected serial, never the last found device',async()=>{
 const joins=[],bluetooth=discoveryBluetooth(),f=fixture({bluetooth,localJoin:async options=>{joins.push(options.expected);throw Error('synthetic local network unavailable');}});
 await f.node('find-headset').events.get('click')();
 f.context.secondHeadset={...discovered,device:'d'.repeat(32),serial:'SECOND-SYNTHETIC'};
 f.run('headsetRoster.remember(secondHeadset);freshHeadsets.set(secondHeadset.device,secondHeadset);selectedHeadset=secondHeadset;renderHeadsets()');
 assert.equal(f.node('headset-roster').children.length,2);
 await f.node('headset-roster').children[1].children[2].events.get('click')();
 assert.equal(joins.length,1);assert.equal(joins[0].serial,'<SYNTHETIC & SERIAL>');
});

test('failed remembered endpoint requires explicit Find refresh before another roster Connect',async()=>{
 const f=fixture({bluetooth:discoveryBluetooth(),localJoin:async()=>{throw Error('address reused or unavailable');}});
 f.context.discoveredHeadset=discovered;
 f.run('headsetRoster.verified(discoveredHeadset,discoveredHeadset.gateways[0]);renderHeadsets()');
 await f.node('headset-roster').children[0].children[2].events.get('click')();
 assert.equal(f.node('headset-roster').children[0].children[2].disabled,true);
 assert.match(f.node('headset-roster').children[0].children[1].textContent,/Find.*refresh/i);
 await f.node('find-headset').events.get('click')();assert.equal(f.node('headset-roster').children[0].children[2].disabled,false);
});
test('page retirement clears fresh metadata epoch selection while retaining only a verified hint',async()=>{
 const f=fixture({bluetooth:discoveryBluetooth()});await f.node('find-headset').events.get('click')();
 f.run('retirePageConnection()');assert.equal(f.run('selectedHeadset?.epoch'),undefined);
});

test('browser without Bluetooth chooser keeps manual Wi-Fi enabled',()=>{
 const f=fixture({bluetooth:{}});assert.equal(f.node('find-headset').disabled,true);assert.equal(f.node('connect-local-address').disabled,false);
});
