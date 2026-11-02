"use strict";

// Installation and shell availability never grant Quest control authority.
(() => {
  const BUILD = "PWA9";
  const CACHE = "viscereality-shell-pwa-9";
  const installButton = document.getElementById("install-app");
  const installNote = document.getElementById("install-note");
  const offlineNote = document.getElementById("offline-note");
  const displayMode = window.matchMedia("(display-mode: standalone)");
  const manualInstall = "To install, open the Chrome menu and choose Install app or Add to Home screen.";
  let installPrompt, installed = false, registration, checkSequence = 0;

  function renderInstall() {
    const standalone = displayMode.matches || navigator.standalone === true;
    installButton.hidden = standalone || installed || !installPrompt;
    installNote.textContent = standalone ? "Running as an installed app."
      : installed ? "Viscereality is installed. Open it from your home screen."
      : manualInstall;
  }
  window.addEventListener("beforeinstallprompt", event => {
    event.preventDefault();
    installPrompt = event;
    renderInstall();
  });
  window.addEventListener("appinstalled", () => {
    installed = true;
    installPrompt = undefined;
    renderInstall();
  });
  displayMode.addEventListener("change", renderInstall);
  installButton.addEventListener("click", async () => {
    if (!installPrompt) return;
    const prompt = installPrompt;
    installPrompt = undefined;
    installButton.disabled = true;
    try {
      await prompt.prompt();
      await prompt.userChoice;
    } catch (_) {
      // Browser menu installation remains available when a prompt is retired.
    } finally {
      installButton.disabled = false;
      renderInstall();
    }
  });
  renderInstall();

  function checkCache(worker) {
    return new Promise(resolve => {
      if (!worker) { resolve(false); return; }
      const channel = new MessageChannel();
      const finish = ready => {
        clearTimeout(timer);
        channel.port1.close();
        channel.port2.close();
        resolve(ready);
      };
      const timer = setTimeout(() => finish(false), 5000);
      channel.port1.onmessage = ({data}) => finish(data?.type === "OFFLINE_READY" && data.cache === CACHE && data.ready === true);
      try { worker.postMessage({type: "CHECK_OFFLINE_READY"}, [channel.port2]); }
      catch (_) { finish(false); }
    });
  }
  async function refreshOffline() {
    const sequence = ++checkSequence;
    const ready = await checkCache(registration?.active);
    if (sequence !== checkSequence) return;
    offlineNote.textContent = ready
      ? "Ready for offline use. Keep the phone hotspot on and connect the Quest to it; Internet is not needed for local control."
      : "Offline download is incomplete or an update is waiting. Keep Internet access until the shell is complete. Apply a waiting update only when all pages have fresh idle Quest status.";
  }
  const applyButton=document.getElementById("apply-update"),updateNote=document.getElementById("update-note");
  document.getElementById("pwa-build").textContent=BUILD;
  let frozenToken,reloaded=false,applying=false;
  function updateAvailable(){
    applyButton.hidden=!registration?.waiting;
    if(registration?.waiting&&!applying)updateNote.textContent="Update available. Apply when every open Viscereality page has fresh idle Quest status and no recording export.";
  }
  function workerRequest(worker,message) {
    return new Promise(resolve=>{
      const channel=new MessageChannel();let settled=false;
      const finish=data=>{if(settled)return;settled=true;clearTimeout(timer);channel.port1.close();channel.port2.close();resolve(data);};
      const timer=setTimeout(()=>finish(undefined),10000);
      channel.port1.onmessage=({data})=>finish(data);
      try{worker.postMessage(message,[channel.port2]);}catch(_){finish(undefined);}
    });
  }
  applyButton.addEventListener("click",async()=>{
    if(applying||!registration?.waiting)return;
    applying=true;applyButton.disabled=true;updateNote.textContent="Checking every open page. Experiment controls are held while safety is confirmed.";
    try {
      const result=await workerRequest(registration.waiting,{type:"APPLY_UPDATE",protocol:1});
      updateNote.textContent=result?.type==="UPDATE_APPROVED"&&result.protocol===1
        ? "Update approved. Reloading the safe pages."
        : "Update deferred. Each open page needs fresh idle Quest status, no pending command, and no export or unsaved download offer. Close older or unavailable pages, then retry.";
    }finally{applying=false;applyButton.disabled=false;}
  });
  // Version-independent safety handshake: current clients can answer a compatible future worker.
  navigator.serviceWorker?.addEventListener("message",event=>{
    const data=event.data,safety=globalThis.ViscerealityUpdateSafety;
    if(data?.protocol!==1||typeof data.token!=="string"||!data.token||data.token.length>128)return;
    if(!event.source||![registration?.waiting,registration?.installing,registration?.active,navigator.serviceWorker.controller].includes(event.source))return;
    if(data.type==="RQ_UPDATE_CHECK"&&event.ports?.[0]) {
      const safe=data.phase==="freeze" ? safety?.acquire(data.token)===true : data.phase==="confirm"&&frozenToken===data.token&&safety?.check(data.token)===true;
      if(safe)frozenToken=data.token;
      event.ports[0].postMessage({type:"RQ_UPDATE_SAFE",protocol:1,token:data.token,safe});
    } else if(data.type==="RQ_UPDATE_RELEASE"&&frozenToken===data.token) {
      safety?.release(data.token);frozenToken=undefined;
    } else if(data.type==="RQ_UPDATE_COMMIT"&&frozenToken===data.token&&!reloaded) {
      if(safety?.check(data.token)===true){reloaded=true;location.reload();}
      else {safety?.release(data.token);frozenToken=undefined;updateNote.textContent="Update loaded; reload deferred because native state changed. Finish the session before reopening this page.";}
    }
  });
  const secure = location.protocol === "https:" || ["localhost", "127.0.0.1"].includes(location.hostname);
  if (!navigator.serviceWorker || !secure) {
    offlineNote.textContent = "Open the public HTTPS page in Chrome to install and save it for offline use.";
    return;
  }
  offlineNote.textContent = "Downloading the app for offline use. Keep Internet access until this check finishes.";
  navigator.serviceWorker.addEventListener("controllerchange", () => { if (registration) refreshOffline(); });
  window.addEventListener("online", () => { if (registration) refreshOffline(); });
  navigator.serviceWorker.register("sw.js", {scope: "./", updateViaCache: "none"})
    .then(registered=>{
      registration=registered;updateAvailable();
      registered.addEventListener?.("updatefound",()=>{
        const installing=registered.installing;
        installing?.addEventListener("statechange",()=>{updateAvailable();if(installing.state==="installed")refreshOffline();});
      });
      return navigator.serviceWorker.ready;
    })
    .then(active => { registration = active;updateAvailable();return refreshOffline(); })
    .catch(() => {
      offlineNote.textContent = "Offline storage is unavailable. Reopen with Internet access in Chrome to finish setup.";
    });
})();
