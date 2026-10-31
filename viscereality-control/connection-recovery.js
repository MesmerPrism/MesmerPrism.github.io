/* Read-only scheduling policy. The caller owns identity, snapshots and commands. */
(function(root) {
  "use strict";
  const delays=[1000,2000,4000,8000,15000];
  class RecoveryController {
    constructor({attempt,onState=()=>{},setTimeout=root.setTimeout.bind(root),clearTimeout=root.clearTimeout.bind(root)}) {
      if(typeof attempt!=="function")throw new TypeError("Recovery attempt is required");
      Object.assign(this,{attempt,onState,setTimeout,clearTimeout});
      this.generation=0;this.running=false;this.suspended=false;this.blocked=false;
      this.failures=0;this.flight=null;this.timer=null;
    }
    emit(state,details={}) { this.onState({state,generation:this.generation,...details}); }
    cancel() {
      if(this.timer!==null){this.clearTimeout(this.timer);this.timer=null;}
      this.flight?.controller.abort();
    }
    start() {
      this.generation++;this.running=true;this.suspended=false;this.blocked=false;this.failures=0;
      this.cancel();this.run();
    }
    suspend() {
      if(!this.running || this.suspended || this.blocked)return;
      this.generation++;this.suspended=true;this.cancel();this.emit("suspended");
    }
    resume() {
      if(!this.running || !this.suspended || this.blocked)return;
      this.generation++;this.suspended=false;this.failures=0;this.run();
    }
    stop() {
      this.generation++;this.running=false;this.suspended=false;this.cancel();this.emit("stopped");
    }
    current(flight) { return this.running && !this.suspended && !this.blocked && flight.generation===this.generation && !flight.controller.signal.aborted; }
    async run() {
      // Keep the slot until even an abort-ignoring callback settles. Replacement
      // never overlaps that callback; the old generation can publish nothing.
      if(this.flight || !this.running || this.suspended || this.blocked)return;
      const flight={controller:new AbortController(),generation:this.generation};this.flight=flight;
      let result;
      try {
        this.emit("attempting",{attempt:this.failures+1});
        if(this.current(flight))result=await this.attempt({signal:flight.controller.signal,generation:flight.generation});
      } catch(error) { result={kind:"blocked",error}; }
      this.flight=null;
      if(!this.current(flight)){
        if(this.running && !this.suspended && !this.blocked)this.run();
        return;
      }
      if(result?.kind==="success") { this.emit("recovered",{value:result.value});return; }
      if(result?.kind!=="retry") { this.blocked=true;this.emit("blocked",{error:result?.error || new Error("Invalid recovery result")});return; }
      const delayMs=delays[Math.min(this.failures++,delays.length-1)];
      this.emit("waiting",{delayMs,error:result.error});
      if(!this.current(flight))return;
      this.timer=this.setTimeout(()=>{if(!this.current(flight))return;this.timer=null;this.run();},delayMs);
    }
  }
  const api={RecoveryController};
  if(typeof module!=="undefined")module.exports=api;
  else root.ViscerealityRecovery=api;
})(globalThis);
