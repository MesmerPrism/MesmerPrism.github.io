/* Read-only Polar observations. This module has no control admission or effects. */
(function(root){
  "use strict";
  const object=v=>v&&typeof v==="object"&&!Array.isArray(v);
  const number=v=>Number.isSafeInteger(v)&&v>=0;
  const reasons=new Set(["not-required","source-unavailable","fresh","recovered-awaiting-resume","awaiting-acc","acc-stale"]);
  const age=(value,observationAge)=>number(value)&&number(observationAge)&&number(value+observationAge)?`${value+observationAge} ms`:"unavailable";
  function describe(status,observationAge=null){
    const pd=status?.pd,n=object(pd)&&pd.v===1&&object(pd.native)?pd.native:null;
    const j=object(pd?.java)?pd.java:null;
    const valid=n&&n.diagnostics_observed===true&&reasons.has(n.reason);
    let current="Polar readiness diagnostics unavailable.";
    if(valid){
      current=({"not-required":"Polar motion is not required by the current source.",
        "source-unavailable":"Polar acquisition source is unavailable.",
        "fresh":"Polar motion data is current.",
        "recovered-awaiting-resume":"Polar motion has recovered; the session remains paused. Choose Resume explicitly when ready.",
        "awaiting-acc":"Waiting for the first accepted Polar motion sample.",
        "acc-stale":"No accepted Polar motion sample within the 1 second safety limit."})[n.reason];
      if(j?.connected===false)current="Polar link is disconnected. "+current;
    }
    let pause="";
    if(object(n?.last_pause)){
      if(n.last_pause.reason==="acc-stale")pause="Session paused: no accepted Polar motion sample within the safety limit. The radio or processing cause is unknown.";
      if(n.last_pause.reason==="source-unavailable")pause="Session paused: the Polar acquisition source became unavailable.";
      if(n.last_pause.reason==="awaiting-acc")pause="Session paused while waiting for an accepted Polar motion sample.";
    }
    const count=v=>number(v)?String(v):"unavailable";
    const detail=`Native accepted sample age: ${age(valid?n.accepted_age_ms:null,observationAge)}; native ingress age: ${age(valid?n.ingress_age_ms:null,observationAge)}; native commit age: ${age(valid?n.commit_age_ms:null,observationAge)}. `+
      `Java callback age: ${age(j?.callback_age_ms,observationAge)}; decode age: ${age(j?.decode_age_ms,observationAge)}; JNI submit age: ${age(j?.jni_submit_age_ms,observationAge)}. `+
      `Counts: callback ${count(j?.callback_count)}, decode ${count(j?.decode_count)}, JNI submit ${count(j?.jni_submit_count)}, native ingress ${count(n?.ingress_count)}, accepted ${count(n?.accepted_count)}. `+
      "Java and native clocks are separate observations; callback and submission counts do not prove native acceptance.";
    return {current,pause,detail};
  }
  const api={describe};if(typeof module!=="undefined")module.exports=api;else root.ViscerealityPolarDiagnostics=api;
})(globalThis);
