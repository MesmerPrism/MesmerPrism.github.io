const test=require("node:test"),assert=require("node:assert/strict");
const {describe}=require("./polar-diagnostics.js");
const status=(reason,extra={})=>({p:"PAUSED",rec:true,pi:{r:true,f:false,h:true},pd:{v:1,native:{reason,diagnostics_observed:true,accepted_age_ms:1250,last_pause:{reason:"acc-stale"}},...extra}});
test("readiness recovery retains the original missing-ACC pause without invented radio cause",()=>{
 const lost=describe(status("acc-stale"),100),recovered=describe(status("recovered-awaiting-resume"),0);
 assert.match(lost.current,/accepted.*motion.*1 second/i);
 assert.match(recovered.current,/recovered.*paused/i);
 assert.match(recovered.pause,/paused.*accepted.*motion/i);
 assert.match(recovered.pause,/unknown/i);
 assert.equal(recovered.pause,lost.pause);
 assert.match(recovered.current,/Resume/i);
});
test("observed disconnected link is distinguished from ACC silence and initial waiting",()=>{
 assert.doesNotMatch(describe(status("acc-stale")).current,/disconnected/i);
 assert.match(describe(status("awaiting-acc",{java:{connected:false}})).current,/disconnected.*first.*sample/i);
 assert.match(describe(status("source-unavailable")).current,/source.*unavailable/i);
});
test("diagnostic ages include observation delivery age and never reset to zero",()=>{
 const d=describe(status("acc-stale"),750);
 assert.match(d.detail,/accepted sample.*2000 ms/i);
 assert.match(describe(status("acc-stale"),null).detail,/accepted sample.*unavailable/i);
 const cached=status("fresh");cached.pd.native.diagnostics_observed=false;
 assert.match(describe(cached,0).current,/unavailable/i);
 assert.doesNotMatch(describe(cached,0).detail,/accepted sample.*0 ms/i);
});
test("legacy and malformed diagnostic fields remain unavailable and never supply a cause",()=>{
 for(const pd of [undefined,null,{v:2},[],{v:1,native:{reason:"<script>",accepted_age_ms:-1,last_pause:{reason:"made-up"}}}]){
  const d=describe({pd});assert.match(d.current,/unavailable/i);assert.equal(d.pause,"");assert.doesNotMatch(d.detail,/<script>/);
 }
});
test("native and Java counters are separate observations rather than accepted-sample equivalences",()=>{
 const s=status("acc-stale",{java:{callback_count:10,decode_count:9,jni_submit_count:8,callback_age_ms:50}});
 s.pd.native.ingress_count=7;s.pd.native.accepted_count=6;
 const d=describe(s,25);assert.match(d.detail,/callback 10.*decode 9.*JNI submit 8.*native ingress 7.*accepted 6/i);
 assert.match(d.detail,/Java callback.*75 ms/i);
});
