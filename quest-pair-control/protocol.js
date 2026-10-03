(function(root){
  "use strict";
  const enc=new TextEncoder(), kinds={o:"offer",p:"proposal",a:"accept",s:"status",c:"close"};
  const tag=x=>typeof x==="string"&&/^[A-Za-z0-9_.-]{4,32}$/.test(x);
  const hex=x=>typeof x==="string"&&/^[a-f0-9]{16}$/.test(x);
  const address=x=>typeof x==="string"&&/^192\.168\.(49|137)\.(?:[1-9][0-9]{0,2})$/.test(x)&&+x.split('.').at(-1)<255;
  const token=x=>typeof x==="string"&&/^[A-Za-z0-9][A-Za-z0-9._:-]{0,95}$/.test(x);
  function validateState(value){if(!value||Array.isArray(value)||typeof value!=="object"||Object.keys(value).length>16||enc.encode(JSON.stringify(value)).length>4096||Object.entries(value).some(([k,v])=>!token(k)||!(v===null||typeof v==="boolean"||(Number.isSafeInteger(v)||typeof v==="number"&&Number.isFinite(v)&&!Number.isInteger(v))||typeof v==="string"&&v.length<=256)))throw Error("Invalid flat provider state");return value;}
  function validateSurface(s){const keys=["schema_version","surface_id","display_label","description","surface_contract_sha256","provider_package","provider_signer_sha256","commands","state","state_revision"];if(!s||Object.keys(s).sort().join()!==keys.sort().join()||s.schema_version!==1||!token(s.surface_id)||typeof s.display_label!=="string"||s.display_label.length>96||typeof s.description!=="string"||s.description.length>160||!(/^[a-z][a-z0-9_]*(?:\.[a-z][a-z0-9_]*)+$/.test(s.provider_package))||!(/^sha256:[a-f0-9]{64}$/.test(s.surface_contract_sha256))||!(/^[a-f0-9]{64}$/.test(s.provider_signer_sha256))||!Number.isSafeInteger(s.state_revision)||s.state_revision<0||!Array.isArray(s.commands)||s.commands.length>32||s.commands.some(c=>Object.keys(c).sort().join()!==["command","display_label","required_controller_capability"].sort().join()||!token(c.command)||!token(c.required_controller_capability)||typeof c.display_label!=="string"||c.display_label.length>96)||new Set(s.commands.map(c=>c.command)).size!==s.commands.length)throw Error("Invalid owner provider surface");validateState(s.state);return s;}
  function decode(text){
    if(enc.encode(text).length>244)throw Error("BLE payload exceeds protocol bound");
    let m=JSON.parse(text);
    if(Array.isArray(m)){
      if(m.length!==14||m[0]!=="rqrv2"||JSON.stringify(m)!==text||!kinds[m[1]])throw Error("Invalid v2 wire shape");
      const keys=["sid","pid","e","q","r","ip","li","b","g","n","x","a"], wire=m;
      m={m:"rqrv",v:2,k:kinds[wire[1]]};keys.forEach((k,i)=>m[k]=wire[i+2]);
      if(!["g","c"].includes(m.r)||![m.b,m.g,m.n,m.a].every(hex)||!(m.x===""||hex(m.x))||![m.ip,m.li].every(address)||(m.r==="g")!==(m.ip===m.li))throw Error("Invalid observed group fields");
    }else{
      const keys=["m","v","k","sid","pid","e","q","r","c","ws","ip","bp","ttl","n","a"];
      if(!m||Object.keys(m).some(k=>!keys.includes(k))||m.v!==1||enc.encode(text).length>220||!["group_owner","client","either"].includes(m.r)||!Number.isSafeInteger(m.c)||m.c<0||m.c>15||(m.c&1)!==1||((m.c&4)!==0&&(m.c&2)===0)||!Number.isSafeInteger(m.ttl)||m.ttl<1000||m.ttl>120000||!hex(m.a)||!(/^[a-f0-9]{16,32}$/.test(m.n)))throw Error("Invalid configured v1 fields");
      if(!["idle","discovering","failed","grouped","ready"].includes(m.ws))throw Error("Invalid Wi-Fi hint");
      if(["idle","discovering","failed"].includes(m.ws)&&(m.ip!==undefined||m.bp!==undefined))throw Error("Non-grouped Wi-Fi hint has an address");
      if(["grouped","ready"].includes(m.ws)&&!address(m.ip))throw Error("Unsupported P2P address hint");
      if(m.ws==="grouped"&&m.bp!==undefined||m.ws==="ready"&&(!Number.isSafeInteger(m.bp)||m.bp<1||m.bp>65535||(m.c&14)!==14))throw Error("Invalid Broker hint");
    }
    if(m.m!=="rqrv"||!tag(m.sid)||!tag(m.pid)||!Number.isSafeInteger(m.e)||m.e<1||!Number.isSafeInteger(m.q)||m.q<1||!Object.values(kinds).includes(m.k))throw Error("Invalid rendezvous identity");
    return m;
  }
  function signing(m){return m.v===2?"RQRV2|"+["k","sid","pid","e","q","r","ip","li","b","g","n","x"].map(k=>m[k]).join("|"):`RQRV1|${m.k}|${m.sid}|${m.pid}|${m.e}|${m.q}|${m.r}|${m.c}|${m.ws}|${m.ip||"-"}|${m.bp||0}|${m.ttl}|${m.n}`;}
  async function auth(m,secret,cryptoAPI=root.crypto){const key=await cryptoAPI.subtle.importKey("raw",enc.encode(secret),{name:"HMAC",hash:"SHA-256"},false,["sign"]);return Array.from(new Uint8Array(await cryptoAPI.subtle.sign("HMAC",key,enc.encode(signing(m)))).slice(0,8),b=>b.toString(16).padStart(2,"0")).join("");}
  async function verify(m,secret,cryptoAPI){if(typeof secret!=="string"||secret.length<16||secret.length>128)throw Error("Enter a 16–128 character diagnostic credential");if(await auth(m,secret,cryptoAPI)!==m.a)throw Error("Rendezvous authentication failed");return m;}
  function diagnosticReadback(before,sent,after){if(!before?.verified||!after?.verified||sent.v!==1||sent.k!=="proposal"||sent.q!==2||!hex(sent.n))throw Error("Diagnostic context unavailable");const b=before.message,a=after.message;if(a.v!==1||a.k!=="accept"||a.q!==3||a.pid!==b.pid||a.pid===sent.pid||a.sid!==sent.sid||a.sid!==b.sid||a.e!==sent.e||a.e!==b.e||a.r!==b.r||a.n===b.n)throw Error("No new joined authenticated acceptance readback");return "New authenticated acceptance observed; v1 has no proposal nonce echo, so exact acknowledgement is unavailable.";}
  function agreement(a,b,now){
    if(!a||!b)return "Connect and read both headsets.";
    if(now-a.at>5000||now-b.at>5000)return "Readings are stale; refresh both headsets.";
    if(!a.verified||!b.verified)return "Two readings received; authentication is not verified.";
    const x=a.message,y=b.message;
    if(x.pid===y.pid||x.sid!==y.sid||x.e!==y.e)return "Session, epoch or peer identities do not agree.";
    if(x.v!==y.v)return "Different protocol versions; no group agreement.";
    if(x.v===1){if(x.r===y.r&&x.r!=="either")return "Conflicting configured roles; group formation is not ready.";return "Configured role hints are compatible. Wi-Fi group and Broker readiness remain unproved.";}
    if(x.r===y.r||x.g!==y.g||x.ip!==y.ip||x.li===y.li)return "Observed group identities or roles conflict.";
    return "Authenticated v2 observed group fields agree. This is not Broker, streaming or camera qualification.";
  }
  function socketURL(value){const u=new URL(value);if(u.protocol!=="wss:"||u.username||u.password||u.search||u.hash||u.pathname!=="/v1/socket")throw Error("Use a credential-free wss://host/v1/socket endpoint");return u.href;}
  function validateAuth(m,now){if(m.$schema!=="rusty.quest.connection_hub.socket_authentication_receipt.v2"||m.type!=="authentication_receipt"||m.accepted!==true||m.status!=="authenticated"||!Number.isSafeInteger(m.transport_epoch)||m.transport_epoch<1||!Number.isSafeInteger(m.next_external_request_sequence)||m.next_external_request_sequence<1||m.confidentiality!=="none"||m.production_eligible!==false||!Number.isFinite(Date.parse(m.expires_at_utc))||Date.parse(m.expires_at_utc)<=now)throw Error("Hub authentication rejected, expired or malformed");return m;}
  function validateProjection(m,epoch,previous){if(!["surface_snapshot","surface_available","surface_removed","surface_state"].includes(m.type)||m.$schema!==`rusty.quest.connection_hub.${m.type}.v1`||m.transport_epoch!==epoch||!hex(m.listener_instance_id?.slice(0,16))||!(/^[a-f0-9]{32}$/.test(m.listener_instance_id))||!Number.isSafeInteger(m.surface_revision)||m.surface_revision<0||m.transport_classification!=="trusted_lan_experimental"||m.confidentiality!=="none"||m.production_eligible!==false||previous&&(m.listener_instance_id!==previous.listener_instance_id||m.surface_revision<previous.surface_revision))throw Error("Unjoined or regressed Hub surface projection");return {listener_instance_id:m.listener_instance_id,surface_revision:m.surface_revision};}
  function commandReceipt(m,pending,epoch,current){if(m.$schema!=="rusty.quest.connection_hub.command_receipt.v2"||m.type!=="command_receipt"||!pending||!pending.projection||!current||m.request_id!==pending.request_id||m.request_sequence!==pending.request_sequence||m.surface_id!==pending.surface_id||m.command!==pending.command||m.transport_epoch!==epoch||!Number.isSafeInteger(m.next_external_request_sequence)||(m.accepted?m.next_external_request_sequence!==pending.request_sequence+1:![pending.request_sequence,pending.request_sequence+1].includes(m.next_external_request_sequence))||!(/^[a-f0-9]{32}$/.test(m.listener_instance_id))||m.listener_instance_id!==pending.projection.listener_instance_id||m.listener_instance_id!==current.listener_instance_id||!Number.isSafeInteger(m.surface_revision)||m.surface_revision<Math.max(pending.projection.surface_revision,current.surface_revision)||m.transport_classification!=="trusted_lan_experimental"||m.confidentiality!=="none"||m.production_eligible!==false||typeof m.accepted!=="boolean"||typeof m.provider_applied!=="boolean"||m.provider_applied&&(!m.accepted||m.status!=="provider_effect_observed")||!m.authority_receipt||typeof m.authority_receipt!=="object"||Array.isArray(m.authority_receipt))throw Error("Unjoined Hub command receipt");return m.accepted===true&&m.provider_applied===true&&m.status==="provider_effect_observed"?"Provider applied":"Rejected or not applied";}
  const api={decode,signing,auth,verify,diagnosticReadback,agreement,socketURL,validateAuth,validateProjection,validateState,validateSurface,commandReceipt};root.QuestPairProtocol=api;if(typeof module!=="undefined")module.exports=api;
})(globalThis);
