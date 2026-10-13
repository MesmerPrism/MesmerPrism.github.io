const test=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs');
test('offline worker only intercepts exact static shell GET requests without credentials',()=>{
  const handlers={};vm.runInNewContext(fs.readFileSync(require.resolve('./sw.js'),'utf8'),{URL,Set,self:{location:{href:'https://mesmerprism.com/viscereality-control/sw.js',origin:'https://mesmerprism.com'},addEventListener:(name,fn)=>handlers[name]=fn},caches:{open:async()=>({match:async()=>({cached:true})})}});
  function intercepted(path,{method='GET',auth=false}={}){let handled=false;handlers.fetch({request:{url:new URL(path,'https://mesmerprism.com/viscereality-control/').href,method,headers:{has:()=>auth}},respondWith:()=>{handled=true;}});return handled;}
  for(const path of ['./','index.html','styles.css','app.js','transport.js','../shared/quest-ble/gatt-lifetime.js']) assert.equal(intercepted(path),true,path);
  for(const path of ['https://gateway.example/v1/gateway','http://192.168.1.1/v1/gateway','/v1/gateway','app.js?token=secret','?preview=1'])assert.equal(intercepted(path),false,path);
  assert.equal(intercepted('app.js',{auth:true}),false);assert.equal(intercepted('app.js',{method:'POST'}),false);
});
