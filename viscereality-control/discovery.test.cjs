const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs');
const api=fs.existsSync(require('node:path').join(__dirname,'discovery.js'))?require('./discovery.js'):{};
const metadata={v:1,device:'b'.repeat(32),serial:'SYNTHETIC-SERIAL',epoch:'123',native_epoch:'456',mode:'remote',gateways:['http://192.168.43.2:8766/v1/gateway']};
const view=text=>new DataView(new TextEncoder().encode(text).buffer);
function fixture({data=metadata,serial=metadata.serial,read,choose}={}) {
 let disconnected=0,choices=0; const calls=[];
 const btDevice={id:'synthetic-bt-id',gatt:{connected:false,disconnect(){disconnected++;this.connected=false;},async connect(){this.connected=true;return {async getPrimaryService(uuid){calls.push(uuid);return {async getCharacteristic(uuid){calls.push(uuid);return {readValue:()=>read?read(uuid):Promise.resolve(view(uuid.endsWith('020102')?serial:JSON.stringify(data)))}}}}}}}};
 const bluetooth={requestDevice(options){choices++;calls.push(options);return choose?choose():Promise.resolve(btDevice);}};
 return {bluetooth,btDevice,calls,get choices(){return choices;},get disconnected(){return disconnected;}};
}
test('Find calls service-scoped chooser synchronously and reads serial independently of missing name',async()=>{
 assert.equal(typeof api.Discovery,'function','Discovery must implement explicit chooser discovery');
 const f=fixture(),d=new api.Discovery({bluetooth:f.bluetooth}); const pending=d.find();assert.equal(f.choices,1);
 const found=await pending;assert.equal(found.serial,'SYNTHETIC-SERIAL');assert.equal(found.bluetoothId,'synthetic-bt-id');
 assert.deepEqual(f.calls[0],{filters:[{services:['9a7b2001-7d6a-4b7f-9d4a-6f7c0a020101']}]});assert.equal(f.disconnected,1);
});
test('cancel settles an aborted GATT read and releases its own connection',async()=>{
 assert.ok(api.Discovery); const f=fixture({read:()=>new Promise(()=>{})}),d=new api.Discovery({bluetooth:f.bluetooth});
 const pending=d.find();await new Promise(setImmediate);d.cancel();await assert.rejects(pending,/cancel|retired/i);assert.equal(f.disconnected,1);
});
test('late chooser cannot replace a newer selected identity',async()=>{
 assert.ok(api.Discovery);let release; const f=fixture({choose:()=>new Promise(resolve=>release=resolve)}),d=new api.Discovery({bluetooth:f.bluetooth});
 const pending=d.find();d.cancel();release(f.btDevice);await assert.rejects(pending);assert.equal(f.btDevice.gatt.connected,false);
});
for(const [name,change] of [['serial',{serial:'OTHER'}],['device',{device:'invalid'}],['epoch',{epoch:'0'}],['native epoch',{native_epoch:'0'}],['mode',{mode:'direct'}],['too many routes',{gateways:Array(5).fill(metadata.gateways[0])}]])test(`reject invalid ${name} metadata and release GATT`,async()=>{
 assert.ok(api.Discovery);const f=fixture({data:{...metadata,...change}});await assert.rejects(new api.Discovery({bluetooth:f.bluetooth}).find());assert.equal(f.disconnected,1);
});
test('empty serial and empty routes remain honestly unavailable',async()=>{
 assert.ok(api.Discovery);const f=fixture({serial:'',data:{...metadata,serial:'',gateways:[]}});const found=await new api.Discovery({bluetooth:f.bluetooth}).find();assert.equal(found.serial,'');assert.deepEqual(found.gateways,[]);
});
test('bounded UTF-8 parsing and strict private IPv4 exact endpoint reject unsafe data',()=>{
 assert.ok(api.localEndpoint);for(const url of ['https://192.168.1.2/v1/gateway','http://example.com/v1/gateway','http://127.0.0.1/v1/gateway','http://192.168.1.256/v1/gateway','http://user@10.0.0.2/v1/gateway','http://10.0.0.2/other','http://10.0.0.2/v1/gateway?key=x','http://10.0.0.2/v1/gateway#x','http://0x0a000002/v1/gateway'])assert.throws(()=>api.localEndpoint(url),url);
 assert.throws(()=>api.parseMetadata(view(' '.repeat(513)),'SYNTHETIC-SERIAL'));assert.throws(()=>api.readSerial(view('x'.repeat(65))));assert.throws(()=>api.readSerial(new DataView(Uint8Array.of(255).buffer)));
});
test('roster persists only eight nonsecret identities and only verified address; reload has no fresh epochs',()=>{
 assert.ok(api.Roster);const values=new Map(),storage={getItem:k=>values.get(k),setItem:(k,v)=>values.set(k,v)};const roster=new api.Roster(storage);
 for(let n=0;n<10;n++)roster.remember({...metadata,device:n.toString(16).padStart(32,'0'),bluetoothId:'bt'+n,key:'secret',controller:'secret'});
 assert.equal(roster.records.length,8);assert.equal(roster.records[0].gateway,undefined);
 roster.verified({...metadata,bluetoothId:'bt'},metadata.gateways[0]);const raw=[...values.values()].join('');assert.doesNotMatch(raw,/secret|epoch|gateways|controller|key/);
 const reloaded=new api.Roster(storage);assert.equal(reloaded.records[0].gateway,metadata.gateways[0]);assert.equal(reloaded.records[0].epoch,undefined);
});
module.exports={metadata};

test('same Bluetooth handle late completion cannot disconnect a newer discovery read',async()=>{
 let releaseOld,releaseNew;const f=fixture(),original=f.btDevice.gatt.connect;
 let connects=0;f.btDevice.gatt.connect=function(){this.connected=true;connects++;return connects===1?new Promise(resolve=>releaseOld=()=>original.call(this).then(resolve)):original.call(this);};
 // Block the new metadata read after its transport is connected.
 const data=JSON.stringify(metadata);const bluetooth=f.bluetooth;
 const d=new api.Discovery({bluetooth});const first=d.find();await new Promise(setImmediate);d.cancel();await assert.rejects(first);
 f.btDevice.gatt.connect=async function(){this.connected=true;return {getPrimaryService:async()=>({getCharacteristic:async uuid=>({readValue:()=>uuid.endsWith('020102')?Promise.resolve(view(metadata.serial)):new Promise(resolve=>releaseNew=()=>resolve(view(data)))})})};};
 const second=d.find();await new Promise(setImmediate);const before=f.disconnected;releaseOld();await new Promise(setImmediate);
 assert.equal(f.disconnected,before,'retired connect must not release newer owner of same GATT handle');releaseNew();await second;
});
test('serial is read consistently across the metadata snapshot',async()=>{
 let serialReads=0;const f=fixture({read:uuid=>Promise.resolve(view(uuid.endsWith('020102')?(++serialReads===1?metadata.serial:'CHANGED'):JSON.stringify(metadata)))});
 await assert.rejects(new api.Discovery({bluetooth:f.bluetooth}).find(),/serial changed/i);assert.equal(f.disconnected,1);
});
test('DataView offset and maximum 512-byte metadata are decoded from the view only',()=>{
 const text=JSON.stringify(metadata),bytes=new TextEncoder().encode('PREFIX'+text+'SUFFIX');
 assert.equal(api.parseMetadata(new DataView(bytes.buffer,6,bytes.length-12),metadata.serial).serial,metadata.serial);
});
