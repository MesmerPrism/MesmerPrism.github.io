/* Shared controller boundary. Opening a route is never proof of native state. */
(function(root) {
  "use strict";
  const enc = new TextEncoder();
  const hex = bytes => Array.from(bytes, b => b.toString(16).padStart(2,"0")).join("");
  function endpoint(value, pageProtocol = "https:", trustedLan = false) {
    let url;
    try { url = new URL(value); }
    catch (_) { throw new Error("Enter the complete gateway address supplied during headset setup"); }
    if (url.username || url.password || url.search || url.hash || !["https:","http:"].includes(url.protocol)) throw new Error("Use the exact gateway URL without credentials or query parameters");
    const privateV4=/^(?:10\.|192\.168\.|172\.(?:1[6-9]|2[0-9]|3[01])\.)/.test(url.hostname);
    if (url.protocol === "http:" && (!trustedLan || !privateV4)) throw new Error("Plain HTTP requires explicit trusted-LAN consent and the headset's private IPv4 address. Browser local-network permission support is required; use Bluetooth if access is blocked.");
    return url.href;
  }
  class Gateway {
    constructor({url, controller, key, device, routeToken = "", trustedLan = false, fetcher = root.fetch.bind(root), cryptoApi = root.crypto, pageProtocol = "https:"}) {
      this.url = endpoint(url,pageProtocol,trustedLan);
      if(routeToken && new URL(this.url).protocol!=="https:") throw new Error("Relay requires HTTPS");
      if (!/^[0-9a-f]{32}$/.test(controller) || !/^[0-9a-f]{64}$/.test(key) || !/^[0-9a-f]{32}$/.test(device)) throw new Error("Enter the controller ID, device ID and controller key approved on the headset");
      if (routeToken && (!/\/v1\/relay\/[A-Za-z0-9_-]+\/exchange$/.test(new URL(this.url).pathname) || /[\r\n]/.test(routeToken))) throw new Error("Use the provisioned relay session exchange URL and token");
      Object.assign(this,{controller,key,device,routeToken,fetcher,cryptoApi,active:false,retired:false});
      this.lifetime=new AbortController();
      this.statusTimedOut=false;
      this.recovering=false;
    }
    async sign(text) {
      const key = await this.cryptoApi.subtle.importKey("raw",enc.encode(this.key),{name:"HMAC",hash:"SHA-256"},false,["sign"]);
      return hex(new Uint8Array(await this.cryptoApi.subtle.sign("HMAC",key,enc.encode(text))));
    }
    async request(method, body) {
      const url=this.routeToken && method==="GET" ? this.url.replace(/\/exchange$/,"/identity") : this.url;
      const headers=body?{"Content-Type":"application/json"}:{};
      if(this.routeToken) headers.Authorization=`Bearer ${this.routeToken}`;
      // Relay exchanges may wait twelve seconds for the device; allow response
      // transit time without extending direct-LAN or identity request deadlines.
      const timeoutMs=this.routeToken && method==="POST" ? 15000 : 10000;
      const response = await this.fetcher(url,{method,body:body && JSON.stringify(body),headers,cache:"no-store",credentials:"omit",redirect:"error",referrerPolicy:"no-referrer",signal:AbortSignal.any([this.lifetime.signal,AbortSignal.timeout(timeoutMs)])});
      if (!response.ok) throw new Error(`Gateway unavailable (${response.status}); reconnect and read current state`);
      const text = await response.text();
      if (text.length > 65536) throw new Error("Gateway response too large");
      return JSON.parse(text);
    }
    async connect({identity} = {}) {
      const hint = identity || await this.request("GET");
      if (hint.v !== 1 || hint.device !== this.device || !/^[1-9][0-9]{0,18}$/.test(hint.epoch) || hint.enabled !== true) throw new Error("Gateway device identity does not match headset enrollment");
      this.epoch=hint.epoch;
      const status = await this.exchange("status",{});
      if (!status.o || !/^[1-9][0-9]{0,18}$/.test(status.o.e) || status.o.s !== "observed") throw new Error("Fresh native runtime identity unavailable");
      if (this.retired) throw new Error("Connection retired");
      this.nativeEpoch=status.o.e;
      this.active=true;
      return status;
    }
    async exchange(action,payload) {
      if (this.retired) throw new Error("Connection retired");
      if ((this.statusTimedOut || this.recovering) && action!=="status") throw new Error("Connection recovering; read current status before commands");
      const nonce=hex(this.cryptoApi.getRandomValues(new Uint8Array(16))), serialized=JSON.stringify(payload);
      const mac=await this.sign(`RQG1|${this.controller}|${this.epoch}|${nonce}|${action}|${serialized}`);
      try {
        const reply=await this.request("POST",{v:1,controller:this.controller,epoch:this.epoch,nonce,action,payload:serialized,mac});
        if (reply.v!==1 || reply.device!==this.device || reply.epoch!==this.epoch || reply.nonce!==nonce || reply.action!==action || typeof reply.payload!=="string" || !/^[0-9a-f]{64}$/.test(reply.mac||"")) throw new Error("Gateway identity or request binding changed");
        const expected=await this.sign(`RQG1-REPLY|${this.controller}|${this.device}|${this.epoch}|${nonce}|${action}|${reply.payload}`);
        if (expected!==reply.mac || this.retired) throw new Error("Gateway authentication failed or connection retired");
        const result=JSON.parse(reply.payload);
        if(action==="status" && this.nativeEpoch && (result.o?.e!==this.nativeEpoch || result.o?.s!=="observed")) throw new Error("Native runtime changed; reconnect without replaying commands");
        return result;
      } catch(error) {
        if(action==="status" && error?.name==="TimeoutError" && !this.retired && (this.active || this.recovering)) {
          this.active=false;this.statusTimedOut=true;
        } else this.close();
        throw error;
      }
    }
    waitForRecovery(ms) {
      return new Promise((resolve,reject)=>{
        const signal=this.lifetime.signal;
        if(signal.aborted){reject(signal.reason);return;}
        const cancel=()=>{clearTimeout(timer);reject(signal.reason);};
        const timer=setTimeout(()=>{signal.removeEventListener("abort",cancel);resolve();},ms);
        signal.addEventListener("abort",cancel,{once:true});
      });
    }
    async recoverStatus(onAttempt=()=>{}) {
      if(this.retired || !this.statusTimedOut || this.recovering) throw new Error("Status recovery unavailable");
      this.recovering=true;
      try {
        for(let attempt=1;attempt<=2;attempt++) {
          onAttempt(attempt,2);
          await this.waitForRecovery(attempt===1?1000:3000);
          if(this.retired) throw new Error("Connection retired");
          try {
            const hint=await this.request("GET");
            if(hint.v!==1 || hint.device!==this.device || hint.epoch!==this.epoch || hint.enabled!==true) throw new Error("Gateway enrollment or owner changed; reconnect manually");
            const status=await this.exchange("status",{});
            if(status.o?.s!=="observed" || status.o.e!==this.nativeEpoch || this.retired) throw new Error("Native runtime changed; reconnect without replaying commands");
            this.statusTimedOut=false;this.active=true;
            return new DataView(enc.encode(JSON.stringify(status)).buffer);
          } catch(error) {
            if(error?.name!=="TimeoutError" || this.retired || attempt===2) throw error;
          }
        }
      } catch(error) {this.close();throw error;}
      finally {this.recovering=false;}
    }
    async read(name,id) {
      const payload=await this.exchange(name,name==="receipt"?{id}:{});
      return new DataView(enc.encode(JSON.stringify(payload)).buffer);
    }
    async write(bytes) {
      if(!this.active) throw new Error("Connection unavailable; no command sent");
      const command=JSON.parse(new TextDecoder().decode(bytes));
      delete command.mac;
      this.lastId=command.id;
      return this.exchange("command",command);
    }
    close() { this.active=false; this.retired=true; this.statusTimedOut=false; this.recovering=false; this.key=""; this.routeToken=""; this.lifetime.abort(); }
  }
  function ble(characteristics) {
    return {read:(name)=>characteristics[name].readValue(),write:bytes=>characteristics.command.writeValueWithResponse(bytes)};
  }
  async function localJoin({url,expected,signal,fetcher=root.fetch.bind(root),cryptoApi=root.crypto}) {
    const discovery=typeof module!=="undefined"?require('./discovery.js'):root.ViscerealityDiscovery;
    url=discovery.localEndpoint(url);
    const lifetime=AbortSignal.any([...(signal?[signal]:[]),AbortSignal.timeout(15000)]);
    let candidate,abort;
    const retired=new Promise((_,reject)=>{abort=()=>{candidate?.close();reject(lifetime.reason);};lifetime.addEventListener("abort",abort,{once:true});});
    const run=async operation=>{lifetime.throwIfAborted();const result=await Promise.race([operation,retired]);lifetime.throwIfAborted();return result;};
    async function request(body) {
      const response=await run(fetcher(url,{method:body?"POST":"GET",body:body&&JSON.stringify(body),headers:body?{"Content-Type":"application/json"}:{},cache:"no-store",credentials:"omit",redirect:"error",referrerPolicy:"no-referrer",signal:lifetime}));
      if(!response.ok)throw Error(`Local gateway unavailable (${response.status}). Find the headset again.`);
      const text=await run(response.text());if(new TextEncoder().encode(text).length>4096)throw Error("Local identity response too large");return JSON.parse(text);
    }
    try {
      lifetime.throwIfAborted();
      const live=await request();
      if(live.v!==1 || !/^[0-9a-f]{32}$/.test(live.device||"") || !discovery.epoch(live.epoch) || !discovery.epoch(live.native_epoch) || !discovery.serialValid(live.serial) || live.enabled!==true || live.remote_available!==true)throw Error("Live Remote headset identity unavailable. Find the headset again.");
      if(expected && (live.device!==expected.device || live.serial!==expected.serial || expected.epoch!==undefined && live.epoch!==expected.epoch || expected.native_epoch!==undefined && live.native_epoch!==expected.native_epoch))throw Error("Headset identity or epochs changed. Find the headset again.");
      const joined=await request({v:1,action:"connect",device:live.device,epoch:live.epoch});
      if(!joined || Object.keys(joined).sort().join(",")!=="controller,device,epoch,key,serial,v" || joined.v!==1 || joined.device!==live.device || joined.epoch!==live.epoch || joined.serial!==live.serial)throw Error("Local join identity changed. Find the headset again.");
      candidate=new Gateway({url,controller:joined.controller,key:joined.key,device:joined.device,trustedLan:true,fetcher,cryptoApi});
      candidate.nativeEpoch=live.native_epoch;
      const status=await run(candidate.connect({identity:live}));
      return {gateway:candidate,status,identity:{device:live.device,serial:live.serial,epoch:live.epoch,native_epoch:live.native_epoch},url};
    } catch(error) {candidate?.close();throw error;}
    finally {lifetime.removeEventListener("abort",abort);}
  }
  const api={Gateway,ble,endpoint,localJoin};
  if(typeof module!=="undefined") module.exports=api;
  else root.ViscerealityTransport=api;
})(globalThis);
