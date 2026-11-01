/* Verified, explicit saved-recording offers. No experiment command or deletion. */
(function(root){
 "use strict";
 const CORE=Object.freeze(['manifest.json','final.json','events.jsonl','polar-acc.jsonl','polar-ecg.jsonl','polar-hr-rr.jsonl','breath.jsonl','radius.jsonl']);
 const MAX_BYTES=128*1024*1024,CHUNK=32768,enc=new TextEncoder();
 const id=s=>typeof s==='string'&&/^utc-ns-[0-9]{20}$/.test(s);
 const hex=b=>Array.from(new Uint8Array(b),v=>v.toString(16).padStart(2,'0')).join('');
 const integer=n=>Number.isSafeInteger(n)&&n>=0;
 const fail=()=>{throw Error('Recording integrity or export limit check failed. No file offered.');};
 function manifestCheck(m,recording,device,serial){
  if(!m||m.v!==1||m.schema!=='rusty.quest.recording_export.v1'||m.id!==recording||!id(recording)||m.saved!==true||!['finalized-completed','finalized-early'].includes(m.disposition)
   ||m.file_set_policy!=='core8-original-no-checkpoints-or-index'||!(/^[0-9a-f]{64}$/).test(m.manifest_id)||m.device!==device||typeof m.serial!=='string'||!(/^[A-Za-z0-9._-]{0,64}$/).test(m.serial)||serial!==undefined&&m.serial!==serial
   ||!Array.isArray(m.files)||m.files.length!==8||new Set(m.files.map(f=>f.name)).size!==8||enc.encode(JSON.stringify(m)).length>32768)fail();
  let total=0;for(const f of m.files){if(!CORE.includes(f.name)||!integer(f.size)||f.size>MAX_BYTES||!(/^[0-9a-f]{64}$/).test(f.sha256))fail();total+=f.size;}
  if(total>MAX_BYTES||total!==m.total_bytes)fail();return m;
 }
 const CRC_TABLE=Uint32Array.from({length:256},(_,n)=>{let c=n;for(let bit=0;bit<8;bit++)c=(c>>>1)^((c&1)?0xedb88320:0);return c>>>0;});
 function crc32(bytes){let c=0xffffffff;for(const b of bytes)c=(c>>>8)^CRC_TABLE[(c^b)&255];return (c^0xffffffff)>>>0;}
 /** ZIP STORE, UTF-8, ZIP32, fixed DOS epoch. Blob parts avoid a second ZIP-sized byte array. */
 function zipStore(files){
  if(!Array.isArray(files)||files.length!==9||new Set(files.map(f=>f.name)).size!==9)fail();
  let size=0;for(const f of files){if(!(f.bytes instanceof Uint8Array)||!([...CORE,'export-manifest.json'].includes(f.name)))fail();size+=f.bytes.length;}
  if(size>MAX_BYTES+32768)fail();
  const parts=[],central=[];let offset=0,centralBytes=0;
  for(const f of files){const name=enc.encode(f.name),crc=crc32(f.bytes),local=new Uint8Array(30+name.length),v=new DataView(local.buffer);
   v.setUint32(0,0x04034b50,true);v.setUint16(4,20,true);v.setUint16(6,0x0800,true);v.setUint16(12,0x21,true);v.setUint32(14,crc,true);v.setUint32(18,f.bytes.length,true);v.setUint32(22,f.bytes.length,true);v.setUint16(26,name.length,true);local.set(name,30);parts.push(local,f.bytes);
   const c=new Uint8Array(46+name.length),d=new DataView(c.buffer);d.setUint32(0,0x02014b50,true);d.setUint16(4,20,true);d.setUint16(6,20,true);d.setUint16(8,0x0800,true);d.setUint16(14,0x21,true);d.setUint32(16,crc,true);d.setUint32(20,f.bytes.length,true);d.setUint32(24,f.bytes.length,true);d.setUint16(28,name.length,true);d.setUint32(42,offset,true);c.set(name,46);central.push(c);centralBytes+=c.length;offset+=local.length+f.bytes.length;
  }
  if(offset+centralBytes+22>0xffffffff)fail();const end=new Uint8Array(22),e=new DataView(end.buffer);e.setUint32(0,0x06054b50,true);e.setUint16(8,files.length,true);e.setUint16(10,files.length,true);e.setUint32(12,centralBytes,true);e.setUint32(16,offset,true);
  return new Blob([...parts,...central,end],{type:'application/zip'});
 }
 class Transfer {
  constructor({request,scope,admitted,yieldStatus=()=>new Promise(r=>setTimeout(r,0)),cryptoApi=root.crypto,device,serial,onProgress=()=>{},wait=ms=>new Promise(r=>setTimeout(r,ms))}){Object.assign(this,{request,scope,admitted,yieldStatus,cryptoApi,device,serial,onProgress,wait});this.busy=false;this.offer=null;this.abort=null;}
  get hasOffer(){return !!this.offer;}
  cancel(){this.abort?.abort(Error('Recording export cancelled; no request will be replayed.'));this.offer=null;}
  valid(token){token.signal.throwIfAborted();if(!this.admitted()||this.scope()!==token.scope)throw Error('Recording connection, owner or idle Remote state changed.');}
  async call(q,token){this.valid(token);const r=await this.request(q,{signal:token.signal});this.valid(token);await this.yieldStatus();this.valid(token);if(!r||r.v!==1)fail();return r;}
  async prepared(q,token){for(let n=0;n<240;n++){const r=await this.call(q,token);if(r.state==='ready')return r;if(!['preparing','busy'].includes(r.state))throw Error('Recording is unavailable or no longer exportable.');await this.wait(250);this.valid(token);}throw Error('Recording preparation timed out. Retry manually.');}
  async operation(task){if(this.busy)throw Error('A recording request is already in progress.');this.cancel();this.busy=true;this.abort=new AbortController();const token={scope:this.scope(),signal:this.abort.signal};try{this.valid(token);return await task(token);}catch(e){this.offer=null;throw e;}finally{this.busy=false;}}
  async list(before=''){return this.operation(async token=>{if(before&&!id(before))fail();const r=await this.prepared({query:'list',before,limit:16},token);
   if(!Array.isArray(r.entries)||r.entries.length>16||r.next_before!==null&&!id(r.next_before))fail();
   for(const e of r.entries)if(!id(e.id)||typeof e.exportable!=='boolean'||typeof e.disposition!=='string'||e.disposition.length>64||e.exportable&&!['finalized-completed','finalized-early'].includes(e.disposition))fail();return r;});}
  async download(recording){return this.operation(async token=>{
   if(!id(recording))fail();this.onProgress('Validating saved recording on Quest…');
   const response=await this.prepared({query:'describe',id:recording},token),m=manifestCheck(response.manifest,recording,this.device,this.serial),files=[];
   for(const f of m.files){this.valid(token);const bytes=new Uint8Array(f.size);for(let offset=0;offset<f.size;){const length=Math.min(CHUNK,f.size-offset),r=await this.call({query:'read',manifest_id:m.manifest_id,file:f.name,offset,length},token);
     if(r.state!=='chunk'||r.manifest_id!==m.manifest_id||r.file!==f.name||r.sha256!==f.sha256||r.offset!==offset||r.length!==length||typeof r.data!=='string'||r.data.length!==Math.ceil(length/3)*4||!(/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/).test(r.data))fail();
     const decoded=atob(r.data);if(decoded.length!==length)fail();for(let n=0;n<length;n++)bytes[offset+n]=decoded.charCodeAt(n);offset+=length;this.onProgress(`Verifying ${f.name}: ${offset} / ${f.size} bytes`);
    }
    const digest=await this.cryptoApi.subtle.digest('SHA-256',bytes);this.valid(token);if(hex(digest)!==f.sha256)fail();files.push({name:f.name,bytes});
   }
   this.valid(token);files.push({name:'export-manifest.json',bytes:enc.encode(JSON.stringify(m,null,2)+'\n')});const blob=zipStore(files);this.valid(token);
   this.offer={blob,filename:`${recording}.zip`,manifest:m};this.onProgress('Verified ZIP ready. Download is an offer; confirm storage in your browser. Originals remain on Quest.');return this.offer;
  });}
 }
 const api={Transfer,zipStore,CORE,MAX_BYTES};if(typeof module!=='undefined')module.exports=api;root.ViscerealityRecordings=api;
})(globalThis);
