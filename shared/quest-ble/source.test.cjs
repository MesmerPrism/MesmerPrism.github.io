const test=require("node:test"),assert=require("node:assert/strict"),fs=require("node:fs"),path=require("node:path"),crypto=require("node:crypto");
test("static browser dependency is bound to an immutable producer and exact bytes",()=>{
  const pin=JSON.parse(fs.readFileSync(path.join(__dirname,"source.json"),"utf8"));
  assert.equal(pin.schema,"rusty.quest.ble_browser.static_source.v1");
  assert.equal(pin.repository,"https://github.com/MesmerPrism/rusty-quest");
  assert.equal(pin.path,"web/ble-control/gatt-lifetime.js");
  assert.match(pin.commit,/^[a-f0-9]{40}$/);
  assert.equal(crypto.createHash("sha256").update(fs.readFileSync(path.join(__dirname,"gatt-lifetime.js"))).digest("hex"),pin.sha256);
  assert.deepEqual(pin.consumers,["viscereality-control","quest-pair-control"]);
  for(const consumer of pin.consumers){
    const html=fs.readFileSync(path.join(__dirname,"..","..",consumer,"index.html"),"utf8");
    assert.ok(html.includes('../shared/quest-ble/gatt-lifetime.js'));
    assert.ok(html.indexOf('../shared/quest-ble/gatt-lifetime.js')<html.indexOf('src="app.js"'));
  }
});
