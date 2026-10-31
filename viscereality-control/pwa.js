"use strict";

// Installation and shell availability never grant Quest control authority.
(() => {
  const CACHE = "viscereality-shell-pwa-4";
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
      : "Offline download is incomplete or an update is waiting. Close all Viscereality windows, then reopen with Internet access and wait for Ready for offline use.";
  }
  const secure = location.protocol === "https:" || ["localhost", "127.0.0.1"].includes(location.hostname);
  if (!navigator.serviceWorker || !secure) {
    offlineNote.textContent = "Open the public HTTPS page in Chrome to install and save it for offline use.";
    return;
  }
  offlineNote.textContent = "Downloading the app for offline use. Keep Internet access until this check finishes.";
  navigator.serviceWorker.addEventListener("controllerchange", () => { if (registration) refreshOffline(); });
  window.addEventListener("online", () => { if (registration) refreshOffline(); });
  navigator.serviceWorker.register("sw.js", {scope: "./", updateViaCache: "none"})
    .then(() => navigator.serviceWorker.ready)
    .then(active => { registration = active; return refreshOffline(); })
    .catch(() => {
      offlineNote.textContent = "Offline storage is unavailable. Reopen with Internet access in Chrome to finish setup.";
    });
})();
