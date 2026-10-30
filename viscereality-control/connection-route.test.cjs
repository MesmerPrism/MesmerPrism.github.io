const test = require("node:test"), assert = require("node:assert/strict");
const fs = require("node:fs"), vm = require("node:vm");
const core = require("../shared/quest-ble/gatt-lifetime.js");
const tick = () => new Promise(resolve => setImmediate(resolve));

// The checked-in select options supply the DOM's initial value. The full app
// and its event listeners run unchanged; device and gateway I/O end locally.
function fixture({remembered = false, permitted = []} = {}) {
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
        replaceChildren(){this.children=[];},append(child){this.children.push(child);}};
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
    location:{search:"",protocol:"https:"},isSecureContext:true,
    document:{getElementById:node,querySelectorAll:()=>[],createElement:()=>({value:"",textContent:""})},
    window:{scrollTo(){},addEventListener(){}},
    localStorage:{getItem:key=>saved.get(key)||null,setItem:(key,value)=>saved.set(key,value),removeItem:key=>saved.delete(key)},
    navigator:{bluetooth:{async requestDevice(){choices++;throw new Error("Chooser dismissed in host fixture");},
      async getDevices(){inventories++;return permitted;}}},
    ViscerealityTransport:{Gateway:class {
      constructor(options){gateways.push(options);}
      async connect(){throw new Error("Host fixture stops before gateway I/O");}
      close(){}
    }},
    performance:{now:()=>1000},setTimeout:()=>1,clearTimeout(){},clearInterval(){},setInterval(){throw new Error("No polling expected");}});
  vm.runInContext(fs.readFileSync(require.resolve("./app.js"),"utf8"),context);
  return {context,node,saved,gateways,options,choices:()=>choices,inventories:()=>inventories,
    run:source=>vm.runInContext(source,context),
    choose(route){node("connection-route").value=route;node("connection-route").events.get("change")();},
    connect:()=>node("connect").events.get("click")()};
}

test("initial page and app select LAN with enrollment visible", () => {
  const f = fixture();
  assert.equal(f.options.find(option=>option.selected)?.value,"lan");
  assert.equal(f.node("connection-route").value,"lan");
  assert.equal(f.run("selectedRoute"),"lan");
  assert.equal(f.node("network-enrollment").hidden,false);
  assert.equal(f.node("relay-token-row").hidden,true);
  assert.equal(f.node("trusted-lan-row").hidden,false);
  assert.match(f.node("route-note").textContent,/same Wi-Fi.*gateway address.*controller enrollment/i);
});

test("initial Connect dispatches gateway enrollment without a Bluetooth chooser", async () => {
  const f = fixture();
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
