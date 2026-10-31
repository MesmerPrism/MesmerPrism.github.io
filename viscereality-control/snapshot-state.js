/* Whole native snapshots. No timers, network, storage or experiment actions. */
(function(root) {
  "use strict";
  const phases=["IDLE","STARTING","ARMING","ARMED","RUNNING","PAUSED","RECORDING","FINALIZING","SAVING","RECOVERY","ERROR"];
  const integer=n=>Number.isSafeInteger(n)&&n>=0;
  const decimal=s=>typeof s==="string"&&/^[1-9][0-9]{0,18}$/.test(s)&&BigInt(s)<=9223372036854775807n;
  const order=(a,b)=>a.length===b.length?(a===b?0:a<b?-1:1):a.length<b.length?-1:1;
  const keys=o=>o&&typeof o==="object"&&!Array.isArray(o)?Object.keys(o).sort().join(","):"";
  function observation(s) {
    const o=s?.o;
    return keys(o)==="a,e,g,i,r,s,v"&&o.v===1&&o.s==="observed"&&decimal(o.e)&&decimal(o.i)
      &&[o.g,o.r,o.a,s.g,s.r].every(integer)&&o.g===s.g&&o.r===s.r;
  }
  function rich(s) {
    return s.wifi_snapshot===1&&s.m==="gated"&&["choose","direct","remote"].includes(s.control_mode)
      &&observation(s)&&integer(s.ms)&&typeof s.rec==="boolean"&&typeof s.pending==="boolean"
      &&[s.c,s.co,s.st,s.h].every(v=>typeof v==="string"&&v.length<=128)
      &&keys(s.pi)==="f,h,r"&&[s.pi.r,s.pi.f,s.pi.h].every(v=>typeof v==="boolean");
  }
  class SnapshotState {
    constructor(clock=()=>performance.now()) {this.clock=clock;this.reset();}
    reset() {this.owner=null;this.latest=null;this.current=null;this.valid=false;this.richSeen=false;this.high=-Infinity;this.sequence=0;}
    time() {const n=this.clock();if(!Number.isFinite(n)||n<0||n<this.high){this.valid=false;return null;}this.high=n;return n;}
    begin(owner) {if(this.owner!==owner){this.reset();this.owner=owner;}return this.latest={owner,sequence:++this.sequence,start:this.time()};}
    invalidate() {this.valid=false;this.latest=null;}
    age() {const n=this.time(),c=this.current;return n===null||!c?null:c.age+Math.floor(n-c.at);}
    fresh() {const a=this.age();return this.valid&&a!==null&&a<=5000;}
    accept(s,ticket,nativeEpoch) {
      const end=this.time();
      const reject=()=>{this.valid=false;return false;};
      if(ticket!==this.latest||ticket?.owner!==this.owner||end===null||ticket.start===null||end<ticket.start)return reject();
      if(!s||s.v!==1||!["open","gated"].includes(s.m)||!phases.includes(s.p))return reject();
      const full=Object.hasOwn(s,"wifi_snapshot");
      if(full&&!rich(s)||!full&&this.richSeen)return reject();
      if(new TextEncoder().encode(JSON.stringify(s)).length>16384)return reject();
      let age=full?s.o.a:0;
      age+=Math.ceil(end-ticket.start);
      if(!integer(age)||age>5000)return reject();
      if(full) {
        if(nativeEpoch!==undefined&&s.o.e!==nativeEpoch)return reject();
        const previous=this.current?.status;
        if(previous?.wifi_snapshot===1) {
          const a=previous.o,b=s.o;
          if(b.e!==a.e||order(b.i,a.i)<0||b.g<a.g||b.g===a.g&&b.r<a.r)return reject();
          if(b.i===a.i) {
            // One read witness identifies one whole state, not just its age label.
            const stable=v=>JSON.stringify({...v,o:{...v.o,a:0}});
            if(stable(s)!==stable(previous))return reject();
            age=Math.max(age,this.age()??Infinity);
          }
        }
      }
      if(age>5000)return reject();
      this.richSeen ||= full;
      this.current={status:s,age,at:end};this.valid=true;return true;
    }
  }
  const api={SnapshotState,observation};
  if(typeof module!=="undefined")module.exports=api;else root.ViscerealitySnapshot=api;
})(globalThis);
