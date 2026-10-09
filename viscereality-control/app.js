"use strict";

// This page contains no Quest credentials. A code entered here stays in memory
// for this tab only and is never sent to the website.
const UUID = Object.freeze({
  service: "9a7b2001-7d6a-4b7f-9d4a-6f7c0a020001",
  status: "9a7b2001-7d6a-4b7f-9d4a-6f7c0a020002",
  challenge: "9a7b2001-7d6a-4b7f-9d4a-6f7c0a020003",
  command: "9a7b2001-7d6a-4b7f-9d4a-6f7c0a020004",
  receipt: "9a7b2001-7d6a-4b7f-9d4a-6f7c0a020005",
});
const encoder = new TextEncoder();
const decoder = new TextDecoder();
const byId = (id) => document.getElementById(id);
const preview = new URLSearchParams(location.search).get("preview") === "1";
let device;
let characteristics;
let questStatus;
let lastStatusAt = 0;
let accessCode = "";
let commandBusy = false;
let reading = false;
let pollTimer;
let currentPage = "prepare";
let connectionGeneration = 0;
let connectionAttempt = 0;
let connecting = false;
let pageActive = true;
function operationQueue() { return new QuestBleLifetime.OperationQueue(generation => {
  if (generation !== connectionGeneration || !device?.gatt?.connected) throw new Error("BLE connection retired");
}); }
let gattOperations = operationQueue();
function gattOperation(task, generation = connectionGeneration) {
  return gattOperations.run(generation, task);
}

function label(id, value, tone = "") {
  const node = byId(id);
  node.textContent = value;
  node.classList.toggle("ready", tone === "ready");
  node.classList.toggle("attention", tone === "attention");
}

function connected() { return !!device?.gatt?.connected && !!characteristics; }
function controlsUnlocked() { return connected() && (questStatus?.m === "open" || !!accessCode); }
function freshStatus() { return questStatus && (preview || Date.now() - lastStatusAt < 5000); }
function canCommand() { return controlsUnlocked() && freshStatus() && !commandBusy; }

function showProgress(name, stage, detail) {
  label("command-name", name);
  label("command-detail", detail);
  for (const id of ["progress-sent", "progress-waiting", "progress-confirmed"]) {
    byId(id).className = "";
  }
  if (["sent", "waiting", "confirmed", "failed", "unknown"].includes(stage)) {
    byId("progress-sent").className = "done";
  }
  if (["waiting", "confirmed", "failed", "unknown"].includes(stage)) {
    byId("progress-waiting").className = stage === "waiting" ? "current" : "done";
  }
  if (stage === "confirmed") byId("progress-confirmed").className = "done";
  if (stage === "failed" || stage === "unknown") byId("progress-confirmed").className = "failed";
}

function formatMs(value) {
  if (!Number.isSafeInteger(value) || value < 0) return "—";
  const seconds = Math.floor(value / 1000);
  const minutes = Math.floor(seconds / 60);
  return `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;
}

function conditionLabel(condition) {
  return condition === "condition-a" ? "Condition 1" : condition === "condition-b" ? "Condition 2" : "None";
}

function stageTitle(status) {
  if (status.p === "RECOVERY" || status.recovery) return "Recovery needs attention";
  if (status.p === "ERROR") return status.rec ? "Session needs attention" : "Condition was not armed";
  if (status.co === "DURABLE" && status.rec) return "Condition complete · recording continues";
  if (status.co === "PERSISTENCE_PENDING" && status.rec) return "Condition time reached · confirming completion";
  return ({ ARMED: "Armed · ready for the experimenter", PAUSED: "Paused · resume when ready",
    RUNNING: "Condition running · recording active", RECORDING: "Condition running · recording active",
    ARMING: "Preparing the selected condition…", STARTING: "Preparing the selected condition…",
    SAVING: "Saving…", FINALIZING: "Saving…", IDLE: "No active session" })[status.p]
    || "Session status unavailable";
}

function stageInstruction(status) {
  if (status.p === "ARMED") return "Fit the headset, then hold Right Grip + A for at least 0.75 seconds and release after the pulse.";
  if (status.p === "PAUSED") return "Hold Right Grip + A for at least 0.75 seconds, then release after the pulse to resume.";
  if (status.p === "RUNNING" || status.p === "RECORDING") return "Hold Right Grip + B for at least 0.75 seconds, then release after the pulse to pause.";
  if (status.p === "SAVING" || status.p === "FINALIZING") return "Wait for the recording to finish saving.";
  if (status.p === "ERROR" || status.p === "RECOVERY") return "Review the headset session and storage status before continuing.";
  if (status.co === "DURABLE" && status.rec) return "Save the session to prepare another run.";
  return "Review the saved-session totals, then prepare the next run.";
}

function render() {
  const live = connected();
  const s = freshStatus() ? questStatus : undefined;
  const conn = byId("connection-label");
  conn.textContent = preview ? "Preview · not connected" : live ? "Quest connected" : "Not connected";
  conn.classList.toggle("connected", live && !preview);
  byId("connect").hidden = live || preview;
  byId("connect").disabled = connecting;
  byId("disconnect").hidden = !live;
  byId("refresh").disabled = !live || commandBusy;
  const foreground = s?.f;
  const fg = byId("foreground-line");
  fg.textContent = foreground === "focused" ? "Android input focus observed on VR activity"
    : foreground === "panel" ? "Android input focus observed on experimenter panel"
    : foreground === "background" ? "Android input focus not observed · XR focus unverified"
    : "Android input focus status unavailable · XR focus unverified";
  fg.classList.toggle("focused", foreground === "focused");
  const gated = live && s?.m === "gated" && !accessCode;
  byId("access").hidden = !gated;

  label("bluetooth-status", s?.bt === "ON" ? "On" : s?.bt || "Unavailable", s?.bt === "ON" ? "ready" : "attention");
  label("polar-status", s?.po === "CONNECTED" && s.pf ? "Connected" : s?.po || "Unavailable", s?.po === "CONNECTED" && s.pf ? "ready" : "attention");
  label("storage-status", s?.st || "Unavailable", s?.st === "ready" ? "ready" : "attention");
  label("kiosk-status", s?.k || "Unavailable", s?.k === "ready" ? "ready" : "attention");
  label("prepare-guidance", !s ? "Connect to the Quest to see live readiness."
    : s.po !== "CONNECTED" || !s.pf ? "Polar is not connected. The headset can open its setup panel." : "Sensor and session readiness are current.");
  byId("open-polar").disabled = !canCommand();
  byId("return-vr").disabled = !canCommand() || !["ARMED", "RUNNING", "PAUSED", "RECORDING"].includes(s.p) || s.f === "focused";

  for (const [suffix, index] of [["one", 0], ["two", 1]]) {
    const audio = s?.a?.[index];
    const guidance = s?.b?.[index];
    label(`audio-${suffix}`, `Audio: ${audio || "unavailable"}`);
    label(`guidance-${suffix}`, `Breathing pattern: ${guidance || "unavailable"}`);
    byId(`arm-${suffix}`).disabled = !canCommand() || s.rec || !["IDLE", "ERROR"].includes(s.p)
      || !!s.pending || audio !== "track-ready";
  }
  const guidanceAvailable = s?.b?.includes("pattern-ready");
  byId("breath-bias").disabled = !canCommand() || !guidanceAvailable;
  label("breath-bias-value", `${byId("breath-bias").value}%`);

  label("stage-title", s ? stageTitle(s) : "No live session readback");
  label("stage-instruction", s ? stageInstruction(s) : "Connect to the Quest to see the current run.");
  label("active-condition", s ? conditionLabel(s.c) : "—");
  label("phase", s?.p || "Unavailable", ["ARMED", "RUNNING", "RECORDING"].includes(s?.p) ? "ready" : "");
  label("recording", s ? s.rec ? "On" : "Off" : "—", s?.rec ? "ready" : "");
  label("active-time", s ? formatMs(s.ms) : "—");
  label("completion", s?.co || "—");
  label("session-storage", s?.st || "—", s?.st === "ready" ? "ready" : "");
  label("completed", Number.isSafeInteger(s?.done) ? String(s.done) : "—");
  label("stopped-early", Number.isSafeInteger(s?.early) ? String(s.early) : "—");
  byId("save-next").disabled = !canCommand() || !s.rec || !!s.pending
    || ["SAVING", "FINALIZING", "RECOVERY"].includes(s.p);
  byId("save-exit").disabled = !canCommand();
}

function selectPage(name) {
  if (!["prepare", "controls", "condition", "session"].includes(name)) return;
  currentPage = name;
  for (const section of document.querySelectorAll(".page")) section.hidden = section.dataset.page !== name;
  for (const button of document.querySelectorAll(".bottom-nav button")) {
    if (button.dataset.target === name) button.setAttribute("aria-current", "page");
    else button.removeAttribute("aria-current");
  }
  window.scrollTo({ top: 0, behavior: "instant" });
}

function parseJson(data) {
  const value = JSON.parse(decoder.decode(data));
  if (!value || value.v !== 1) throw new Error("Unsupported Quest BLE control protocol");
  return value;
}

function connectionErrorText(error) {
  const name = String(error?.name || "Error").slice(0, 64);
  const message = String(error?.message || "Unknown error").replace(/[\u0000-\u001f\u007f]/g, " ").slice(0, 256);
  return `${name}: ${message}`;
}

async function refreshStatus() {
  if (!connected() || reading || commandBusy) return {ok: false, error: new Error("Status read not ready")};
  const generation = connectionGeneration;
  reading = true;
  try {
    const source = characteristics.status;
    const status = parseJson(await gattOperation(() => source.readValue()));
    if (!["open", "gated"].includes(status.m)) throw new Error("Invalid Quest access mode");
    if (status.p === "UNAVAILABLE") throw new Error("Quest status source unavailable");
    if (!["IDLE", "STARTING", "ARMING", "ARMED", "RUNNING", "PAUSED", "RECORDING", "FINALIZING", "SAVING", "RECOVERY", "ERROR"].includes(status.p)) throw new Error("Invalid Quest session phase");
    questStatus = status;
    lastStatusAt = Date.now();
    render();
    return {ok: true};
  } catch (error) {
    if (generation === connectionGeneration) {
      questStatus = undefined; lastStatusAt = 0; render();
      label("connection-detail", `Status read failed: ${connectionErrorText(error)}`);
    }
    return {ok: false, error};
  } finally {
    if (generation === connectionGeneration) reading = false;
  }
}

function disconnected() {
  connectionGeneration++;
  reading = false;
  if (commandBusy) showProgress(byId("command-name").textContent, "unknown", "Quest disconnected before confirmation. Check the headset before retrying.");
  commandBusy = false;
  clearInterval(pollTimer);
  pollTimer = undefined;
  characteristics = undefined;
  questStatus = undefined;
  accessCode = "";
  byId("pair-code").value = "";
  render();
}

async function connect() {
  if (connected() || connecting || preview || !pageActive) return;
  connecting = true;
  const attempt = ++connectionAttempt;
  const generation = ++connectionGeneration;
  let stage = "browser capability";
  render();
  label("connection-detail", "Connecting to Quest...");
  gattOperations = operationQueue();
  try {
    if (!navigator.bluetooth) throw new Error("Web Bluetooth is unavailable. Open this HTTPS page directly in Chrome on Android.");
    label("connection-label", "Choose Quest…");
    stage = "device chooser";
    const selectedDevice = await navigator.bluetooth.requestDevice({ filters: [{ services: [UUID.service] }] });
    if (generation !== connectionGeneration) return;
    device = selectedDevice;
    device.addEventListener("gattserverdisconnected", () => { if (generation === connectionGeneration) disconnected(); }, { once: true });
    stage = "GATT connect";
    const server = await selectedDevice.gatt.connect();
    if (generation !== connectionGeneration) {
      // A restored page may already own this same BluetoothDevice handle.
      if (selectedDevice !== device || !pageActive) selectedDevice.gatt.disconnect();
      return;
    }
    stage = "service discovery";
    const service = await gattOperation(() => server.getPrimaryService(UUID.service), generation);
    const selected = {};
    for (const name of ["status", "challenge", "command", "receipt"]) {
      stage = `${name} characteristic discovery`;
      selected[name] = await gattOperation(() => service.getCharacteristic(UUID[name]), generation);
    }
    characteristics = selected;
    stage = "initial status read";
    const initial = await refreshStatus();
    if (!initial.ok) throw initial.error;
    if (generation !== connectionGeneration) return;
    label("connection-detail", "Quest status received.");
    pollTimer = setInterval(refreshStatus, 1500);
    render();
  } catch (error) {
    // The current attempt owns its failure even when its disconnect callback
    // retired the GATT generation before the rejected promise resumed.
    if (attempt !== connectionAttempt) return;
    if (generation === connectionGeneration) {
      if (device?.gatt?.connected) device.gatt.disconnect();
      if (generation === connectionGeneration) disconnected();
    }
    label("connection-detail", `Connection failed at ${stage}: ${connectionErrorText(error)}`);
  } finally {
    if (attempt === connectionAttempt) { connecting = false; render(); }
  }
}

function hex(bytes) { return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join(""); }
function randomHex(length) { return hex(crypto.getRandomValues(new Uint8Array(length))); }

async function signedCommand(id, op, condition, bias) {
  const nonce = randomHex(8);
  const message = { v: 1, id, op, condition, bias, nonce };
  if (questStatus.m === "gated") {
    if (!accessCode) throw new Error("Enter the pairing code shown in the headset");
    const source = characteristics.challenge;
    const challenge = parseJson(await gattOperation(() => source.readValue()));
    if (!/^[0-9a-f]{32}$/.test(challenge.n || "")) throw new Error("Invalid Quest challenge");
    const signingInput = `RQEC1|${challenge.n}|${id}|${op}|${condition}|${bias}|${nonce}`;
    const key = await crypto.subtle.importKey("raw", encoder.encode(accessCode),
      { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
    message.mac = hex(new Uint8Array(await crypto.subtle.sign("HMAC", key, encoder.encode(signingInput))).slice(0, 16));
  }
  const bytes = encoder.encode(JSON.stringify(message));
  if (bytes.length > 240) throw new Error("Command exceeds BLE protocol limit");
  return bytes;
}

function delay(ms) { return new Promise((resolve) => setTimeout(resolve, ms)); }

async function sendCommand(op, name, condition = "", bias = 0) {
  if (!canCommand()) return;
  commandBusy = true;
  render();
  const id = randomHex(8);
  const generation = connectionGeneration;
  showProgress(name, "none", "Preparing authenticated command…");
  try {
    const bytes = await signedCommand(id, op, condition, bias);
    const command = characteristics.command;
    await gattOperation(() => command.writeValueWithResponse(bytes), generation);
    showProgress(name, "sent", "Bluetooth write accepted. Waiting for Quest runtime feedback…");
    // Owner declares Unknown at 30s; leave 5s for its bounded receipt read.
    const deadline = Date.now() + 35000;
    let terminalReceipt = false;
    while (connected() && generation === connectionGeneration && Date.now() < deadline) {
      const source = characteristics.receipt;
      const receipt = QuestBleLifetime.commandReceipt(parseJson(await gattOperation(() => source.readValue(), generation)), id);
      if (receipt) {
        if (["accepted", "pending"].includes(receipt.state)) {
          showProgress(name, "waiting", "Quest accepted the request; waiting for the immersive app’s result…");
        } else if (receipt.state === "confirmed") {
          terminalReceipt = true;
          showProgress(name, "confirmed", receipt.detail || "Confirmed by the Quest runtime.");
          break;
        } else if (receipt.state === "rejected") {
          terminalReceipt = true;
          showProgress(name, "failed", receipt.detail || "Quest rejected the request.");
          break;
        } else if (receipt.state === "outcome_unknown") {
          terminalReceipt = true;
          showProgress(name, "unknown", receipt.detail || "Quest could not confirm the result. Check the headset before retrying.");
          break;
        }
      }
      await delay(550);
    }
    if (generation === connectionGeneration && !terminalReceipt && Date.now() >= deadline) showProgress(name, "unknown", "No confirmation arrived. Check the headset before retrying.");
  } catch (error) {
    if (generation === connectionGeneration) showProgress(name, "unknown", `Command result unavailable: ${error.message}. Check the headset before retrying.`);
  } finally {
    if (generation !== connectionGeneration) return;
    commandBusy = false;
    await refreshStatus();
    render();
  }
}

async function unlock() {
  if (!connected() || !freshStatus() || commandBusy) return;
  const generation = connectionGeneration;
  const code = byId("pair-code").value.trim().toUpperCase();
  if (!/^[A-Z2-7]{12}$/.test(code)) {
    label("access-note", "Enter the 12-character code shown in the headset.");
    return;
  }
  accessCode = code;
  byId("pair-code").value = "";
  await sendCommand("ping", "Check pairing code");
  if (generation !== connectionGeneration) return;
  if (!byId("progress-confirmed").classList.contains("done")) {
    accessCode = "";
    byId("access").hidden = false;
  }
  render();
}

for (const button of document.querySelectorAll(".bottom-nav button")) {
  button.addEventListener("click", () => selectPage(button.dataset.target));
}
// A page owns only its selected Web Bluetooth handle, not other tabs/clients.
function retirePageConnection() {
  pageActive = false;
  connectionAttempt++;
  connecting = false;
  const retired = device;
  disconnected();
  device = undefined;
  try { if (retired?.gatt?.connected) retired.gatt.disconnect(); } catch (_) { }
}
if (typeof window.addEventListener === "function") {
  window.addEventListener("pagehide", retirePageConnection);
  window.addEventListener("pageshow", event => {
    if (event.persisted) retirePageConnection();
    pageActive = true;
    render();
  });
}
byId("connect").addEventListener("click", connect);
byId("disconnect").addEventListener("click", () => device?.gatt?.disconnect());
byId("refresh").addEventListener("click", refreshStatus);
byId("unlock").addEventListener("click", unlock);
byId("pair-code").addEventListener("keydown", (event) => { if (event.key === "Enter") unlock(); });
byId("breath-bias").addEventListener("input", () => label("breath-bias-value", `${byId("breath-bias").value}%`));
byId("arm-one").addEventListener("click", () => sendCommand("arm", "Arm Condition 1", "condition-a", Number(byId("breath-bias").value)));
byId("arm-two").addEventListener("click", () => sendCommand("arm", "Arm Condition 2", "condition-b", Number(byId("breath-bias").value)));
byId("save-next").addEventListener("click", () => sendCommand("save-next", "Save session & prepare next"));
byId("save-exit").addEventListener("click", () => sendCommand("save-exit", "Save and exit"));
byId("return-vr").addEventListener("click", () => sendCommand("return-vr", "Return to VR"));
byId("open-polar").addEventListener("click", () => sendCommand("open-polar", "Open Polar setup"));
if (preview) {
  questStatus = { v: 1, m: "gated", f: "focused", p: "RUNNING", g: 1, r: 9,
    c: "condition-a", rec: true, co: "NOT_REACHED", ms: 754000, st: "ready", k: "ready",
    bt: "ON", po: "CONNECTED", pf: true, done: 0, early: 0,
    a: ["track-ready", "track-ready"], b: ["pattern-ready", "pattern-ready"] };
  lastStatusAt = Date.now();
  selectPage("session");
  showProgress("Arm Condition 1", "waiting", "Preview data only — no Quest is connected.");
}
render();
