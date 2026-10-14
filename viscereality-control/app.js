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
let networkTransport;
let networkRecovering = false;
let bleOwnerIdentity;
let selectedRoute = "ble";
let questStatus;
let lastStatusAt = 0;
let accessCode = "";
let commandBusy = false;
let polarObservation;
let durableObservation;
let reading = false;
let pollTimer;
let currentPage = "prepare";
let connectionGeneration = 0;
let connectionAttempt = 0;
let connecting = false;
let pendingConnection;
let reconnectTimer;
let reconnectTries = 0;
let reconnectAllowed = false;
let commandTiming;
let guideAction;
const ORIGINAL_KEY = "viscereality-original-command";
function loadOriginal() {
  try {
    const value=JSON.parse(localStorage.getItem(ORIGINAL_KEY));
    if (value && /^[0-9a-f]{16}$/.test(value.id) && typeof value.deviceId === "string"
        && /^[1-9][0-9]{0,18}$/.test(value.epoch)
        && typeof value.name === "string" && value.name.length <= 80
        && typeof value.op === "string" && value.op.length <= 24)
      return {...value,state:"observing"};
  } catch (_) { }
  return null;
}
let pendingOriginal=loadOriginal();
function saveOriginal() {
  try {
    if (pendingOriginal?.epoch) localStorage.setItem(ORIGINAL_KEY,JSON.stringify({id:pendingOriginal.id,
      deviceId:pendingOriginal.deviceId,epoch:pendingOriginal.epoch,name:pendingOriginal.name,op:pendingOriginal.op}));
    else localStorage.removeItem(ORIGINAL_KEY);
  } catch (_) { }
}
function clearOriginal() { pendingOriginal=null; saveOriginal(); }
// App-owned attempt settlement; browser chooser time is intentionally unbounded.
function connectionLifetime() {
  let timer, retired = false, rejectRetirement;
  const retirement = new Promise((_, reject) => { rejectRetirement = reject; });
  retirement.catch(() => {});
  return {
    run(operation) { return Promise.race([operation, retirement]); },
    arm() { timer = setTimeout(() => this.cancel("Quest connection timed out after 15 seconds. Retry manually."), 15000); },
    cancel(message = "Connection cancelled") {
      if (retired) return;
      retired = true;
      clearTimeout(timer);
      rejectRetirement(new Error(message));
    },
    finish() { clearTimeout(timer); }
  };
}
let nativeAgeScope;
function nativeAgeClock() {
  const now = typeof performance === "object" ? performance.now() : NaN;
  if (!Number.isFinite(now) || now < 0 || now < nativeAgeScope.clock) {
    nativeAgeScope.visible = null; return null;
  }
  nativeAgeScope.clock = now; return now;
}
function nativeAgeConnection() {
  if (nativeAgeScope?.generation !== connectionGeneration) {
    nativeAgeScope = {generation: connectionGeneration, clock: -Infinity, epoch: null, read: null, visible: null};
  }
}
function decimalOrder(a, b) { return a.length === b.length ? (a === b ? 0 : a < b ? -1 : 1) : a.length < b.length ? -1 : 1; }
function positiveInt64(value) {
  return typeof value === "string" && /^[1-9][0-9]{0,18}$/.test(value)
    && decimalOrder(value, "9223372036854775807") <= 0;
}
function nativeAgeAt(now) {
  const v = nativeAgeScope.visible;
  if (!v) return null;
  const age = v.age + Math.floor(now - v.at);
  if (!Number.isSafeInteger(age) || age < 0) { nativeAgeScope.visible = null; return null; }
  return age;
}
function nativeObservationValid(status) {
  const o = status?.o;
  const keys = value => value !== null && typeof value === "object" && !Array.isArray(value) ? Object.keys(value).sort().join(",") : "";
  return keys(o) === "a,e,g,i,r,s,v" && o.v === 1 && o.s === "observed"
    && positiveInt64(o.e) && positiveInt64(o.i)
    && [o.g,o.r,o.a,status.g,status.r].every(value => Number.isSafeInteger(value) && value >= 0)
    && o.g === status.g && o.r === status.r;
}
function receiveNativeAge(status) {
  nativeAgeConnection();
  const now = nativeAgeClock();
  if (now === null) return;
  const o = status.o;
  if (!nativeObservationValid(status)) {
    nativeAgeScope.visible = null; return;
  }
  if (nativeAgeScope.epoch !== null && decimalOrder(o.e, nativeAgeScope.epoch) < 0) {
    nativeAgeScope.visible = null; return;
  }
  if (nativeAgeScope.epoch === null || decimalOrder(o.e, nativeAgeScope.epoch) > 0) {
    nativeAgeScope.epoch = o.e; nativeAgeScope.read = null; nativeAgeScope.visible = null;
  }
  const order = nativeAgeScope.read === null ? 1 : decimalOrder(o.i, nativeAgeScope.read);
  if (order < 0 || (order === 0 && !nativeAgeScope.visible)) {
    nativeAgeScope.visible = null; return;
  }
  if (order === 0 && (o.g !== nativeAgeScope.readGeneration || o.r !== nativeAgeScope.readRevision)) {
    nativeAgeScope.visible = null; return;
  }
  const priorAge = order === 0 ? nativeAgeAt(now) : o.a;
  if (priorAge === null) return;
  const age = Math.max(o.a, priorAge);
  nativeAgeScope.readGeneration = o.g; nativeAgeScope.readRevision = o.r;
  nativeAgeScope.read = o.i;
  nativeAgeScope.visible = {age, at: now};
}
function nativeAgeLabel() {
  nativeAgeConnection();
  if (!connected() || preview) return "Native status-read age unavailable";
  const now = nativeAgeClock();
  const age = now === null ? null : nativeAgeAt(now);
  return age === null ? "Native status-read age unavailable"
    : `Native status read: at least ${age} ms old; delivery delay unknown`;
}
let pageActive = true;
function operationQueue() { return new QuestBleLifetime.OperationQueue(generation => {
  if (generation !== connectionGeneration || !(networkTransport?.active || device?.gatt?.connected)) throw new Error("Connection retired");
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

function connected() { return !!networkTransport?.active || !!device?.gatt?.connected && !!characteristics; }
function transportRead(name) {
  if (networkTransport) return networkTransport.read(name, commandBusy ? networkTransport.lastId : pendingOriginal?.id || networkTransport.lastId);
  return typeof ViscerealityTransport === "undefined" ? characteristics[name].readValue() : ViscerealityTransport.ble(characteristics).read(name);
}
function transportWrite(bytes) {
  if (networkTransport) return networkTransport.write(bytes);
  return typeof ViscerealityTransport === "undefined" ? characteristics.command.writeValueWithResponse(bytes) : ViscerealityTransport.ble(characteristics).write(bytes);
}
function ownerIdentity() { return networkTransport ? `gateway:${networkTransport.device}:${networkTransport.epoch}` : bleOwnerIdentity || device?.id || ""; }
function controlsUnlocked() { return connected() && (!!networkTransport?.active || questStatus?.m === "open" || !!accessCode); }
function freshStatus() { return questStatus && (preview || Date.now() - lastStatusAt < 5000); }
function canCommand(op="") { return !preview && controlsUnlocked() && freshStatus() && !commandBusy
  && (!pendingOriginal || ["return-vr","ping"].includes(op)); }

function polarSetupCapability(status) {
  const y = status?.y;
  if (!y || typeof y !== "object" || Array.isArray(y)
      || Object.keys(y).sort().join(",") !== "a,b,c,d,e,g,p,r,s,sc,x"
      || typeof y.s !== "string" || !/^[0-9a-f]{32}$/.test(y.s)
      // Setup g is the process runtime epoch, not the recording generation.
      || !Number.isSafeInteger(y.g) || y.g <= 0
      || !nativeObservationValid(status) || String(y.g) !== status.o.e
      || !Number.isSafeInteger(y.r) || y.r < 0
      || ![y.p,y.b,y.c,y.a,y.e,y.sc].every(value => typeof value === "boolean")
      || typeof y.x !== "string" || !/^(?:|[0-9a-f]{12})$/.test(y.x)
      || !Array.isArray(y.d) || y.d.length > 4
      || new Set(y.d).size !== y.d.length || y.d.some(value => !/^[0-9a-f]{12}$/.test(value))) return null;
  return y;
}

function assertSelectedPolarSetup(op, selected) {
  const current = polarSetupCapability(questStatus);
  if (!controlsUnlocked() || !freshStatus() || !current || current.s !== selected.s
      || current.g !== selected.g || current.r !== selected.r
      || (op === "select" && !current.d.includes(selected.d)))
    throw new Error("Polar setup changed before the command was sent; refresh status");
}

// Owner-issued session references fence a control to one actual native session.
// Older APKs advertise no capability and retain their existing gesture route.
function sessionControlCapability(status) {
  const q = status?.q;
  if (!q || typeof q !== "object" || Array.isArray(q)
      || Object.keys(q).sort().join(",") !== "g,o,s,v"
      || q.v !== 2 || typeof q.s !== "string" || !/^[0-9a-f]{32}$/.test(q.s)
      || !Number.isSafeInteger(q.g) || q.g <= 0 || q.g !== status.g
      || !Array.isArray(q.o) || new Set(q.o).size !== q.o.length
      || q.o.some(op => !["start", "pause", "resume", "set-bias"].includes(op))) return null;
  return {v: 2, s: q.s, g: q.g, o: [...q.o]};
}

function sessionControlAllowed(op, status) {
  const capability = sessionControlCapability(status);
  const phases = {start: ["ARMED"], pause: ["RUNNING", "RECORDING"], resume: ["PAUSED"], "set-bias": ["ARMED", "RUNNING", "RECORDING", "PAUSED"]};
  return !!capability && capability.o.includes(op) && status.rec === true
    && !status.pending && phases[op]?.includes(status.p) === true;
}

function assertSelectedSessionControl(op, selected) {
  const current = sessionControlCapability(questStatus);
  if (!controlsUnlocked() || !freshStatus() || !sessionControlAllowed(op, questStatus)
      || !current || current.s !== selected.s || current.g !== selected.g) {
    throw new Error("Session changed before the control was sent; refresh status");
  }
}

// z is an independently admitted sensor capability. q alone is never a sensor grant.
function polarStopCapability(status) {
  const z=status?.z;
  if(!z||typeof z!=="object"||Array.isArray(z)
      ||!["a,e,r","a,e,r,s"].includes(Object.keys(z).sort().join(","))
      ||!Number.isSafeInteger(z.r)||z.r<0||![z.a,z.e].every(n=>Number.isInteger(n)&&n>=0&&n<=7))return null;
  const reference=Object.hasOwn(z,"s")?z.s:sessionControlCapability(status)?.s;
  if(typeof reference!=="string"||!/^[0-9a-f]{32}$/.test(reference))return null;
  return {s:reference,r:z.r,a:z.a,e:z.e};
}
function assertSelectedPolarStop(op,selected) {
  const current=polarStopCapability(questStatus);
  if(!["stop-acc","stop-ecg"].includes(op)||!controlsUnlocked()||!freshStatus()
      ||!current||current.s!==selected.s||current.r!==selected.r)
    throw new Error("Polar owner or stream changed before stop; refresh status");
}

function showProgress(name, stage, detail) {
  label("command-name", name);
  label("command-detail", detail);
  for (const id of ["progress-sent", "progress-waiting", "progress-confirmed"]) {
    byId(id).className = "";
  }
  if (["sent", "waiting", "confirmed", "failed", "unknown","requested"].includes(stage)) {
    byId("progress-sent").className = "done";
  }
  if (["waiting", "confirmed", "failed", "unknown","requested"].includes(stage)) {
    byId("progress-waiting").className = stage === "waiting" ? "current" : "done";
  }
  if (stage === "confirmed") byId("progress-confirmed").className = "done";
  if (stage === "failed" || stage === "unknown") byId("progress-confirmed").className = "failed";
  renderGuide(freshStatus() ? questStatus : undefined);
}

function formatMs(value) {
  if (!Number.isSafeInteger(value) || value < 0) return "—";
  const seconds = Math.floor(value / 1000);
  const minutes = Math.floor(seconds / 60);
  return `${String(minutes).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;
}

function conditionLabel(condition) {
  return condition === "condition-a" ? "Condition 1" : condition === "condition-b" ? "Condition 2" : "None";
}

function stageTitle(status) {
  if (status.p === "RECOVERY" || status.recovery) return "Recovery needs attention";
  if (status.p === "ERROR") return status.rec ? "Session needs attention" : "Condition was not armed";
  if (status.p === "PAUSED") return status.co === "DURABLE" ? "Paused · condition complete" : "Paused · resume when ready";
  if (status.co === "DURABLE" && status.rec) return "Condition complete · recording continues";
  if (status.co === "PERSISTENCE_PENDING" && status.rec) return "Condition time reached · confirming completion";
  return ({ ARMED: "Armed · ready for the experimenter", PAUSED: "Paused · resume when ready",
    RUNNING: "Condition running · recording active", RECORDING: "Condition running · recording active",
    ARMING: "Preparing the selected condition…", STARTING: "Preparing the selected condition…",
    SAVING: "Saving…", FINALIZING: "Saving…", IDLE: "No active session" })[status.p]
    || "Session status unavailable";
}

function stageInstruction(status) {
  if (sessionControlCapability(status)) {
    if (status.p === "ARMED") return "Fit the headset, then use Start session below or hold Right Grip + A for at least 0.75 seconds.";
    if (status.p === "PAUSED") return "Use Resume session below or hold Right Grip + A for at least 0.75 seconds.";
    if (status.p === "RUNNING" || status.p === "RECORDING") return "Use Pause session below or hold Right Grip + B for at least 0.75 seconds.";
  }
  if (status.p === "ARMED") return "Fit the headset, then hold Right Grip + A for at least 0.75 seconds and release after the pulse.";
  if (status.p === "PAUSED") return "Hold Right Grip + A for at least 0.75 seconds, then release after the pulse to resume.";
  if (status.p === "RUNNING" || status.p === "RECORDING") return "Hold Right Grip + B for at least 0.75 seconds, then release after the pulse to pause.";
  if (status.p === "SAVING" || status.p === "FINALIZING") return "Wait for the recording to finish saving.";
  if (status.p === "ERROR" || status.p === "RECOVERY") return "Review the headset session and storage status before continuing.";
  if (status.co === "DURABLE" && status.rec) return "Save the session to prepare another run.";
  return "Review the saved-session totals, then prepare the next run.";
}

function guidedStep(status) {
  if (networkRecovering) return {title:"Reconnecting to Quest",instruction:"Recording controls are paused while the same enrolled headset is checked. No command will be replayed.",action:null};
  if (pendingOriginal && connected()) {
    if (pendingOriginal.state === "uncertain") return {title:"Command outcome unknown",instruction:"The original receipt is unavailable or belongs to another Quest owner. Check the headset and current session state, then acknowledge before issuing another recording action.",action:"reconcile",label:"I checked the Quest state"};
    return {title:"Checking original command",instruction:pendingOriginal.state === "reconciled_receipt" ? "The original receipt was found. Waiting for a fresh session readback." : "Reading the original Quest receipt without sending the command again.",action:null};
  }
  if (!status) return connected()
    ? {title:"Quest status unavailable",instruction:"The Bluetooth link is present, but no usable app status is current. Read status again.",action:"refresh",label:"Refresh status"}
    : {title: "Connect to Quest", instruction: connecting ? "Connecting to the selected Quest…" : "Connect to read the current headset state.", action: device ? "reconnect" : "connect", label: device ? "Reconnect to Quest" : "Connect to Quest"};
  if (status.h === "panel") return {title: "Headset panel open", instruction: "Return to VR before continuing the session.", action: null};
  if (status.h !== "vr-preparation" && status.h !== "vr-session") return {title: "Headset state unknown", instruction: "Refresh status and check the headset before continuing.", action: "refresh", label: "Refresh status"};
  if (status.recovery || status.p === "RECOVERY" || status.p === "ERROR") return {title: "Readiness needs attention", instruction: "Review the headset and recording storage, then refresh status.", action: "refresh", label: "Refresh status"};
  if (["ARMING","STARTING","SAVING","FINALIZING"].includes(status.p) || status.pending)
    return {title: status.p === "SAVING" || status.p === "FINALIZING" ? "Saving recording" : "Preparing session", instruction: "Waiting for the Quest to finish its current operation.", action: null};
  if (status.rec) {
    if (status.co === "DURABLE" && status.p !== "PAUSED") return {title:"Condition complete · recording continues",instruction:"Finish and save this recording, then prepare the headset for the next participant.",action:"finish",label:"Finish & prepare next"};
    if (["ARMED","PAUSED","RUNNING","RECORDING"].includes(status.p)
        && !sessionControlCapability(status)) return {title:"Session control unavailable",instruction:"The Quest has not granted browser session controls. Refresh status and check the app before continuing.",action:"refresh",label:"Refresh status",finish:status.p!=="ARMED"};
    if (status.p === "ARMED") return {title: "Armed", instruction: "The recording is prepared. Start when the participant is ready.", action: "start", label: "Start session"};
    if (status.p === "PAUSED") return {title: "Paused", instruction: "Resume when ready, or finish and prepare for the next participant.", action: "resume", label: "Resume session", finish: true};
    if (["RUNNING","RECORDING"].includes(status.p)) return {title: "Running", instruction: "The session is recording. Pause if needed, or finish and prepare for the next participant.", action: "pause", label: "Pause session", finish: true};
    return {title: "Session needs attention", instruction: "Refresh the Quest state before choosing an action.", action: "refresh", label: "Refresh status"};
  }
  if (status.p !== "IDLE" || status.h !== "vr-preparation") return {title: "Check headset readiness", instruction: "Wait for VR preparation and an idle session, then refresh status.", action: "refresh", label: "Refresh status"};
  if (status.st !== "ready") return {title: "Storage needs attention", instruction: "Recording storage is not ready. Resolve this on the Quest before arming.", action: "refresh", label: "Refresh status"};
  const y = polarSetupCapability(status);
  if (!y) return {title: "Polar setup unavailable", instruction: "This Quest has no current remote Polar setup grant. Refresh status or use a compatible app build.", action: "refresh", label: "Refresh status"};
  if (!y.p) return {title: "Polar permission needed", instruction: "Grant the Quest's sensor permission, then refresh status.", action: "refresh", label: "Refresh status"};
  if (!y.b) return {title: "Polar radio unavailable", instruction: "Enable the sensor radio on the Quest, then refresh status.", action: "refresh", label: "Refresh status"};
  if (y.sc) return {title: "Scanning for Polar", instruction: "Waiting for the current scan to finish.", action: null};
  if (!y.x && !y.d.length) return {title: "Find Polar sensor", instruction: "Scan for the participant's Polar sensor.", action: "polar-scan", label: "Scan for Polar"};
  if (!y.x) return {title: "Choose Polar sensor", instruction: "Choose the intended sensor from the current scan.", action: "polar-select", label: "Select Polar", candidates: true};
  if (!y.c) return {title: "Connect Polar sensor", instruction: "Connect the selected Polar sensor.", action: "polar-connect", label: "Connect Polar"};
  if (!y.a) return {title: "Start Polar motion", instruction: "Start motion data and wait for fresh samples.", action: "polar-start-acc", label: "Start motion data"};
  return {title: "Choose condition", instruction: "The headset is ready and Polar motion data is flowing. ECG is optional. Choose the condition, then arm the recording.", action: "arm", label: "Arm condition", choices: true};
}

function renderGuide(s) {
  const step = guidedStep(s);
  guideAction = step.action;
  label("guide-title", step.title);
  label("guide-instruction", step.instruction);
  const facts=byId("guide-session-facts");
  facts.hidden = !s?.rec;
  if (s?.rec) facts.textContent = `${conditionLabel(s.c)}${s.co === "DURABLE" ? " · condition complete; recording continues" : ""}`;
  const timer = byId("guide-active-clock");
  timer.hidden = !s?.rec;
  timer.textContent = s?.rec ? formatMs(s.p === "ARMED" ? 0 : s.ms) : "—";
  byId("guide-clock-label").hidden = !s?.rec;
  label("guide-clock-label", s?.p === "ARMED" ? "Official active time · waiting for Start" : s?.p === "PAUSED" ? "Official active time · paused" : "Official active time");
  const preparation = byId("guide-preparation-clock");
  preparation.hidden = s?.p !== "ARMED" || !Number.isSafeInteger(s?.pm);
  preparation.textContent = !preparation.hidden ? `Preparation recording ${formatMs(s.pm)}` : "";
  const bias = Array.isArray(s?.bg) && s.bg.length === 2 && Number.isInteger(s.bg[0]) && s.bg[0] >= 0 && s.bg[0] <= 100 ? s.bg[0] : null;
  byId("guide-bias").hidden = !s?.rec || bias === null;
  const biasScope = s?.rec && bias !== null ? `${s?.o?.e || ""}:${s.g}` : "";
  if (byId("live-bias").dataset.scope !== biasScope) {
    byId("live-bias").dataset.scope = biasScope;
    byId("live-bias").value = String(bias ?? 0);
    label("bias-confirmation", "");
  }
  label("current-bias", bias === null ? "Current bias unavailable" : `Current breathing bias: ${bias}%`);
  byId("live-bias").disabled = !canCommand() || !sessionControlAllowed("set-bias", s);
  byId("apply-live-bias").disabled = byId("live-bias").disabled;
  label("live-bias-value", `${byId("live-bias").value}%`);
  const pending = commandBusy || !!s?.pending || connected() && !!pendingOriginal && pendingOriginal.state !== "uncertain";
  const pendingNode = byId("guide-pending");
  pendingNode.hidden = !pending;
  if (pending) pendingNode.textContent = commandBusy ? byId("command-name").textContent + " · " + byId("command-detail").textContent : pendingOriginal ? "Observing the original command; no command has been resent." : "Quest operation in progress. Waiting for fresh confirmation…";
  byId("guide-choices").hidden = !step.choices;
  if (step.choices && s?.a?.[byId("guide-condition").value === "condition-b" ? 1 : 0] !== "track-ready")
    label("guide-instruction", "The selected condition's audio is unavailable. Choose a ready condition or refresh status.");
  byId("guide-candidates").hidden = !step.candidates;
  if (step.candidates) {
    const select = byId("guide-polar-device"), previous = select.value;
    select.replaceChildren();
    for (const candidate of polarSetupCapability(s).d) {
      const option = document.createElement("option"); option.value = candidate; option.textContent = `Nearby Polar · app ref ${candidate.slice(-4)}`; select.append(option);
    }
    if (polarSetupCapability(s).d.includes(previous)) select.value = previous;
  }
  label("polar-candidate-ids", polarSetupCapability(s)?.d.length ? `Current Polar candidates: ${polarSetupCapability(s).d.join(", ")}` : "No Polar candidates observed.");
  const primary = byId("guide-action");
  primary.hidden = !step.action || step.action === "connect" && connecting;
  primary.textContent = step.label || "Continue";
  primary.disabled = preview || pending || connecting || (step.action === "reconcile" ? !s || !!s.pending : step.action !== "connect" && step.action !== "reconnect" && step.action !== "refresh" && !canCommand())
    || (["start","pause","resume"].includes(step.action) && !sessionControlAllowed(step.action, s))
    || (step.action === "arm" && s?.a?.[byId("guide-condition").value === "condition-b" ? 1 : 0] !== "track-ready");
  const finish = byId("guide-finish");
  finish.hidden = !step.finish;
  finish.disabled = preview || !canCommand() || !!s?.pending;
  const panel = s?.h === "panel";
  byId("panel-exception").hidden = !panel;
  byId("guide-return-vr").disabled = preview || !panel || !canCommand("return-vr");
  const presentation = !s ? "Headset state unknown or unreachable"
    : ({panel:"Headset panel open", "vr-preparation":"VR preparation", "vr-session":"VR session", unknown:"Headset state unknown"})[s.h] || "Headset state unknown";
  label("presentation", presentation, panel || !s || s.h === "unknown" ? "attention" : "");
}

function render() {
  const live = connected();
  byId("connection-options").hidden = live || networkRecovering || preview;
  const s = (live || preview) && freshStatus() ? questStatus : undefined;
  renderGuide(s);
  label('native-readback-age', nativeAgeLabel());
  const conn = byId("connection-label");
  conn.textContent = preview ? "Preview · not connected" : networkRecovering ? "Reconnecting · controls paused" : live ? s ? "Quest status current" : "Transport connected · status unavailable" : "Not connected";
  conn.classList.toggle("connected", live && !!s && !preview);
  byId("connect").hidden = live || preview;
  byId("connect").disabled = connecting || networkRecovering;
  byId("reconnect").hidden = live || connecting || networkRecovering || preview || !device;
  byId("reconnect").disabled = connecting;
  byId("disconnect").hidden = !live && !connecting && !networkRecovering;
  byId("disconnect").textContent = connecting ? "Cancel connection" : "Disconnect";
  byId("refresh").disabled = !live || commandBusy;
  byId("cancel-polar-observation").hidden = !polarObservation && !durableObservation;
  byId("cancel-polar-observation").textContent = durableObservation ? "Cancel command observation" : "Cancel stop observation";
  const foreground = s?.f;
  const fg = byId("foreground-line");
  fg.textContent = foreground === "focused" ? "Android input focus observed on VR activity"
    : foreground === "panel" ? "Android input focus observed on experimenter panel"
    : foreground === "background" ? "Android input focus not observed · XR focus unverified"
    : "Android input focus status unavailable · XR focus unverified";
  fg.classList.toggle("focused", foreground === "focused");
  const gated = live && s?.m === "gated" && !accessCode;
  byId("access").hidden = !!networkTransport || !gated;

  const setup = polarSetupCapability(s);
  const bluetooth = setup ? (setup.b ? "ON" : "OFF") : s?.bt;
  label("bluetooth-status", bluetooth === "ON" ? "On" : bluetooth || "Unavailable", bluetooth === "ON" ? "ready" : "attention");
  label("polar-status", s?.po === "CONNECTED" && s.pf ? "Connected" : s?.po || "Unavailable", s?.po === "CONNECTED" && s.pf ? "ready" : "attention");
  label("storage-status", s?.st || "Unavailable", s?.st === "ready" ? "ready" : "attention");
  label("kiosk-status", s?.k || "Unavailable", s?.k === "ready" ? "ready" : "attention");
  label("prepare-guidance", !s ? "Connect to the Quest to see live readiness."
    : s.po !== "CONNECTED" || !s.pf ? "Polar is not connected. The headset can open its setup panel." : "Sensor and session readiness are current.");
  byId("open-polar").disabled = !canCommand();
  byId("rescan-polar").disabled = !canCommand() || s?.p !== "IDLE" || !polarSetupCapability(s);
  byId("start-polar-ecg").disabled = !canCommand() || s?.p !== "IDLE" || !polarSetupCapability(s)?.c || polarSetupCapability(s)?.e;
  byId("return-vr").disabled = !canCommand("return-vr") || s?.h !== "panel";

  for (const [suffix, index] of [["one", 0], ["two", 1]]) {
    const audio = s?.a?.[index];
    const guidance = s?.b?.[index];
    label(`audio-${suffix}`, `Audio: ${audio || "unavailable"}`);
    label(`guidance-${suffix}`, `Breathing pattern: ${guidance || "unavailable"}`);
    byId(`arm-${suffix}`).disabled = !canCommand() || s.rec || !["IDLE", "ERROR"].includes(s.p)
      || !!s.pending || audio !== "track-ready";
  }
  const guidanceAvailable = s?.b?.includes("pattern-ready");
  byId("breath-bias").disabled = !canCommand() || !guidanceAvailable || !!s?.rec;
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
  for (const op of ["start", "pause", "resume"]) {
    byId(`${op}-session`).disabled = !canCommand() || !sessionControlAllowed(op, s);
  }
  label("session-control-note", !s ? "Connect to the Quest to see available session controls."
    : s.pending || commandBusy ? "Wait for the current command to finish."
    : !sessionControlCapability(s) ? "No current browser session-control capability. Use the headset controls or refresh status."
    : "Session controls use the same run clock as the headset gestures.");
  for(const mode of ["acc","ecg"])byId(`stop-polar-${mode}`).disabled=!canCommand()||!polarStopCapability(s);
  const polar=polarStopCapability(s),stream=b=>`${b&1?"requested":"not requested"}; ${b&2?"active PMD ACK":"no active PMD ACK"}; ${b&4?"recent data observed":"no recent data observed"}`;
  label("polar-stop-note",polar?`ACC: ${stream(polar.a)}. ECG: ${stream(polar.e)}. Dispatch is separate from sensor acknowledgement.`:"This Quest has no current Polar stop capability.");
}

function selectPage(name) {
  if (!["prepare", "controls", "condition", "session"].includes(name)) return;
  currentPage = name;
  for (const section of document.querySelectorAll(".page")) section.hidden = false;
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

async function observeOriginalReceipt(status, generation) {
  const original=pendingOriginal;
  if (!original || original.state !== "observing" || commandBusy || !connected()) return;
  const currentEpoch=nativeAgeScope?.visible ? nativeAgeScope.epoch : null;
  if (!original.deviceId || ownerIdentity() !== original.deviceId || !original.epoch || currentEpoch !== original.epoch) {
    original.state="uncertain";
    showProgress(original.name,"unknown","Original Quest owner or native epoch is unavailable. The command was not replayed; check the headset before continuing.");
    render(); return;
  }
  try {
    let timer;
    const read=gattOperation(()=>transportRead("receipt"),generation);
    const bounded=new Promise((_,reject)=>{ timer=setTimeout(()=>reject(new Error("retained receipt read timed out")),5000); });
    let value;
    try { value=await Promise.race([read,bounded]); }
    finally { clearTimeout(timer); }
    const raw=parseJson(value);
    if (generation !== connectionGeneration || pendingOriginal !== original) return;
    const receipt=["stop-acc","stop-ecg"].includes(original.op) && raw.state === "dispatched"
      ? polarDispatchedReceipt(raw,original.id) : QuestBleLifetime.commandReceipt(raw,original.id);
    if (!receipt) {
      original.state="uncertain";
      showProgress(original.name,"unknown","The Quest no longer exposes the original request receipt. The command was not replayed; check current state before continuing.");
    } else if (["accepted","pending"].includes(receipt.state)) {
      showProgress(original.name,"waiting","Original request is still pending on this Quest owner. Observing its receipt without replay.");
    } else if (receipt.state === "dispatched") {
      original.state="reconciled_receipt";
      showProgress(original.name,"requested","Original Stop request was dispatched. Sensor ACK or data stop is not confirmed.");
    } else {
      original.state="reconciled_receipt";
      showProgress(original.name,receipt.state === "confirmed" ? "confirmed" : receipt.state === "rejected" ? "failed" : "unknown",
        receipt.detail || `Original Quest result: ${receipt.state}. Waiting for fresh session status.`);
    }
  } catch (error) {
    if (generation !== connectionGeneration || pendingOriginal !== original) return;
    original.state="uncertain";
    showProgress(original.name,"unknown",`Original receipt read unavailable: ${connectionErrorText(error)}. No command was replayed.`);
    if (String(error?.message).includes("retained receipt read timed out")) {
      try { device?.gatt?.disconnect(); } catch (_) { }
    }
  }
  render();
}
function acknowledgeUnknownOriginal() {
  if (!pendingOriginal || pendingOriginal.state !== "uncertain" || !freshStatus() || questStatus.pending || !connected()) return;
  clearOriginal();
  render();
}

async function refreshStatus() {
  if (!connected() || reading || commandBusy) return {ok: false, error: new Error("Status read not ready")};
  const generation = connectionGeneration;
  reading = true;
  try {
    const source = {readValue: () => transportRead("status")};
    let bytes;
    try { bytes = await gattOperation(() => source.readValue()); }
    catch (error) {
      const recovering = networkTransport;
      if (generation !== connectionGeneration || !recovering?.statusTimedOut || recovering.retired) throw error;
      networkRecovering = true;
      questStatus = undefined; lastStatusAt = 0; render();
      try {
        bytes = await recovering.recoverStatus((attempt,total)=>{
          label("connection-detail",`Status timed out. Reconnecting to the same enrolled Quest (${attempt}/${total}); no commands are resent.`);
        });
        if (generation !== connectionGeneration || networkTransport !== recovering) throw new Error("Connection retired");
        label("connection-detail","Enrolled headset reauthenticated. Current native status received; no command was replayed.");
      } finally { if (generation === connectionGeneration) networkRecovering = false; }
    }
    const status = parseJson(bytes);
    if (!["open", "gated"].includes(status.m)) throw new Error("Invalid Quest access mode");
    if (status.p === "UNAVAILABLE") throw new Error("Quest status source unavailable");
    if (!["IDLE", "STARTING", "ARMING", "ARMED", "RUNNING", "PAUSED", "RECORDING", "FINALIZING", "SAVING", "RECOVERY", "ERROR"].includes(status.p)) throw new Error("Invalid Quest session phase");
    receiveNativeAge(status);
    questStatus = status;
    lastStatusAt = Date.now();
    label("connection-detail", "Quest status received.");
    if (pendingOriginal?.state === "reconciled_receipt" && !status.pending) clearOriginal();
    render();
    await observeOriginalReceipt(status,generation);
    return {ok: true};
  } catch (error) {
    if (generation === connectionGeneration) {
      nativeAgeConnection(); nativeAgeScope.visible = null;
      questStatus = undefined; lastStatusAt = 0; render();
      label("connection-detail", `Status read failed: ${connectionErrorText(error)}`);
    }
    return {ok: false, error};
  } finally {
    if (generation === connectionGeneration) reading = false;
  }
}

function scheduleReconnect() {
  if (!reconnectAllowed || !device?.gatt || !pageActive || preview || reconnectTimer || reconnectTries >= 5) return;
  const delays=[1000,2000,4000,8000,12000];
  const wait=delays[reconnectTries++];
  reconnectTimer=setTimeout(() => { reconnectTimer=undefined; if(reconnectAllowed && !connected() && !connecting) connect({reuseSelected:true}); }, wait);
  label("connection-detail", `Quest unreachable. Reconnecting to the previously selected headset in ${Math.ceil(wait/1000)} seconds (${reconnectTries}/5).`);
}
function disconnected(reason = "Quest GATT disconnected. Reconnecting to the selected Quest when available.") {
  networkRecovering = false;
  if (pendingOriginal?.state === "live") pendingOriginal.state="observing";
  polarObservation?.cancel("Connection retired before a Polar receipt.");
  durableObservation?.cancel("Connection retired before a command receipt.");
  pendingConnection?.cancel(reason);
  pendingConnection = undefined;
  connectionGeneration++;
  connecting = false;
  reading = false;
  if (commandBusy) showProgress(byId("command-name").textContent, "unknown", "Quest disconnected before confirmation. Check the headset before retrying.");
  commandBusy = false;
  clearInterval(pollTimer);
  pollTimer = undefined;
  networkTransport?.close();
  networkTransport = undefined;
  bleOwnerIdentity = undefined;
  characteristics = undefined;
  questStatus = undefined;
  accessCode = "";
  byId("pair-code").value = "";
  label("connection-detail", reason);
  render();
  scheduleReconnect();
}

async function connect({reuseSelected = false} = {}) {
  if (selectedRoute !== "ble") return connectNetwork();
  if (connected() || connecting || preview || !pageActive) return;
  // Only this page's previously user-selected handle may skip the chooser.
  if (reuseSelected && !device?.gatt) return;
  connecting = true;
  const attempt = ++connectionAttempt;
  const generation = ++connectionGeneration;
  const lifetime = connectionLifetime();
  pendingConnection = lifetime;
  let stage = "browser capability";
  render();
  label("connection-detail", "Connecting to Quest...");
  gattOperations = operationQueue();
  try {
    if (!navigator.bluetooth) throw new Error("Web Bluetooth is unavailable. Open this HTTPS page directly in Chrome on Android.");
    let selectedDevice = device;
    if (!reuseSelected) {
      label("connection-label", "Choose Quest…");
      stage = "device chooser";
      label("connection-detail", "Waiting for your browser device selection. Cancel connection to retire this attempt.");
      selectedDevice = await lifetime.run(navigator.bluetooth.requestDevice({ filters: [{ services: [UUID.service] }] }));
    }
    if (generation !== connectionGeneration) return;
    device = selectedDevice;
    lifetime.arm();
    device.addEventListener("gattserverdisconnected", () => { if (generation === connectionGeneration) disconnected(); }, { once: true });
    stage = "GATT connect";
    label("connection-detail", "Connecting to Quest GATT...");
    const connection = selectedDevice.gatt.connect();
    connection.then(() => {
      // Browser operations cannot be aborted; retire late transport completion
      // without disconnecting a newer attempt using the same handle.
      if (generation !== connectionGeneration
          && (selectedDevice !== device || !pageActive || (!connecting && !characteristics))) {
        try { selectedDevice.gatt.disconnect(); } catch (_) { }
      }
    }, () => {});
    const server = await lifetime.run(connection);
    if (generation !== connectionGeneration) {
      // A restored page may already own this same BluetoothDevice handle.
      if (selectedDevice !== device || !pageActive) selectedDevice.gatt.disconnect();
      return;
    }
    stage = "service discovery";
    label("connection-detail", "Discovering Quest service...");
    const service = await lifetime.run(gattOperation(() => server.getPrimaryService(UUID.service), generation));
    const selected = {};
    for (const name of ["status", "challenge", "command", "receipt"]) {
      stage = `${name} characteristic discovery`;
      label("connection-detail", `Discovering ${name} characteristic...`);
      selected[name] = await lifetime.run(gattOperation(() => service.getCharacteristic(UUID[name]), generation));
    }
    characteristics = selected;
    // Optional stable owner identity shares original-receipt observation across routes.
    // Older App32 builds omit d and retain the selected browser device identity.
    const identity = parseJson(await lifetime.run(gattOperation(() => transportRead("challenge"),generation)));
    if (/^[0-9a-f]{32}$/.test(identity.d || "") && positiveInt64(identity.ge)) bleOwnerIdentity=`gateway:${identity.d}:${identity.ge}`;
    stage = "initial status read";
    label("connection-detail", "Reading initial Quest status...");
    const initial = await lifetime.run(refreshStatus());
    if (!initial.ok) throw initial.error;
    if (generation !== connectionGeneration) return;
    label("connection-detail", "Quest status received.");
    try { if (device?.id) localStorage.setItem("viscereality-authorised-quest", device.id); } catch (_) { }
    reconnectAllowed = true;
    reconnectTries = 0;
    clearTimeout(reconnectTimer); reconnectTimer = undefined;
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
    scheduleReconnect();
  } finally {
    lifetime.finish();
    if (pendingConnection === lifetime) pendingConnection = undefined;
    if (attempt === connectionAttempt) { connecting = false; render(); }
  }
}

function hex(bytes) { return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join(""); }
function randomHex(length) { return hex(crypto.getRandomValues(new Uint8Array(length))); }

async function signedCommand(id, op, condition, bias) {
  const nonce = randomHex(8);
  const message = { v: 1, id, op, condition, bias, nonce };
  if (questStatus.m === "gated" && !networkTransport) {
    if (!accessCode) throw new Error("Enter the pairing code shown in the headset");
    const source = {readValue: () => transportRead("challenge")};
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

async function signedSessionCommand(id, op, selected, bias = 0) {
  assertSelectedSessionControl(op, selected);
  const nonce = randomHex(8);
  const message = {v: 2, id, op, s: selected.s, g: selected.g, n: nonce};
  if (op === "set-bias") {
    if (!Number.isInteger(bias) || bias < 0 || bias > 100) throw new Error("Bias must be an integer from 0 to 100");
    message.b = bias;
  }
  if (questStatus.m === "gated" && !networkTransport) {
    const source = {readValue: () => transportRead("challenge")};
    const challenge = parseJson(await gattOperation(() => source.readValue()));
    assertSelectedSessionControl(op, selected);
    if (!/^[0-9a-f]{32}$/.test(challenge.n || "")) throw new Error("Invalid Quest challenge");
    const input = `RQEC2|${challenge.n}|${id}|${op}|${selected.s}|${selected.g}|${nonce}${op === "set-bias" ? `|${bias}` : ""}`;
    const key = await crypto.subtle.importKey("raw", encoder.encode(accessCode),
      {name: "HMAC", hash: "SHA-256"}, false, ["sign"]);
    message.mac = hex(new Uint8Array(await crypto.subtle.sign("HMAC", key, encoder.encode(input))).slice(0, 16));
  }
  assertSelectedSessionControl(op, selected);
  const bytes = encoder.encode(JSON.stringify(message));
  if (bytes.length > 240) throw new Error("Command exceeds BLE protocol limit");
  return bytes;
}

function sendSessionControl(op) {
  if (!canCommand() || !sessionControlAllowed(op, questStatus)) return;
  return sendCommand(op, `${op[0].toUpperCase()}${op.slice(1)} session`, "", 0,
    sessionControlCapability(questStatus));
}

async function signedPolarStop(id,op,selected) {
  assertSelectedPolarStop(op,selected);
  const nonce=randomHex(8),message={v:3,id,op,s:selected.s,r:selected.r,n:nonce};
  if(questStatus.m==="gated" && !networkTransport) {
    const source=characteristics.challenge;
    const challenge=parseJson(await gattOperation(()=>source.readValue()));
    assertSelectedPolarStop(op,selected);
    if(!/^[0-9a-f]{32}$/.test(challenge.n||""))throw new Error("Invalid Quest challenge");
    const input=`RQPC1|${challenge.n}|${id}|${op}|${selected.s}|${selected.r}|${nonce}`;
    const key=await crypto.subtle.importKey("raw",encoder.encode(accessCode),{name:"HMAC",hash:"SHA-256"},false,["sign"]);
    message.mac=hex(new Uint8Array(await crypto.subtle.sign("HMAC",key,encoder.encode(input))).slice(0,16));
  }
  assertSelectedPolarStop(op,selected);
  const bytes=encoder.encode(JSON.stringify(message));
  if(bytes.length>240)throw new Error("Command exceeds BLE protocol limit");
  return bytes;
}
async function signedPolarSetup(id,op,selected) {
  assertSelectedPolarSetup(op,selected);
  const nonce=randomHex(8),message={v:4,id,op,s:selected.s,g:selected.g,r:selected.r,d:selected.d||"",n:nonce};
  if(questStatus.m==="gated" && !networkTransport) {
    const challenge=parseJson(await gattOperation(()=>transportRead("challenge")));
    assertSelectedPolarSetup(op,selected);
    if(!/^[0-9a-f]{32}$/.test(challenge.n||""))throw new Error("Invalid Quest challenge");
    const input=`RQPS1|${challenge.n}|${id}|${op}|${selected.s}|${selected.g}|${selected.r}|${selected.d||""}|${nonce}`;
    const key=await crypto.subtle.importKey("raw",encoder.encode(accessCode),{name:"HMAC",hash:"SHA-256"},false,["sign"]);
    message.mac=hex(new Uint8Array(await crypto.subtle.sign("HMAC",key,encoder.encode(input))).slice(0,16));
  }
  assertSelectedPolarSetup(op,selected);
  const bytes=encoder.encode(JSON.stringify(message));
  if(bytes.length>240)throw new Error("Command exceeds BLE protocol limit");
  return bytes;
}
function sendPolarSetup(op,d="") {
  const y=polarSetupCapability(questStatus);
  if(!canCommand()||!y||!["scan","select","connect","start-acc","start-ecg"].includes(op))return;
  const selected={s:y.s,g:y.g,r:y.r,d};
  return sendCommand(op,({scan:"Scan for Polar",select:"Select Polar",connect:"Connect Polar","start-acc":"Start motion data","start-ecg":"Start ECG data"})[op],"",0,null,null,{},selected);
}
function sendPolarStop(op, observation = {}) {
  const selected=polarStopCapability(questStatus);
  if(!canCommand()||!selected||!["stop-acc","stop-ecg"].includes(op))return;
  return sendCommand(op,op==="stop-acc"?"Request Stop ACC":"Request Stop ECG","",0,null,selected,observation);
}
function polarDispatchedReceipt(receipt,requestId) {
  if(!receipt||receipt.v!==1||receipt.id!==requestId||receipt.state!=="dispatched")return null;
  return Object.freeze({state:"dispatched",terminal:true,applied:false,
    detail:typeof receipt.detail==="string"?receipt.detail:""});
}

// Cancels only observation. The serialized GATT task retains its actual lifetime.
function createReceiptObservation(options, kind = "Polar") {
  const keys = Object.keys(options);
  if (keys.some(key => !["signal", "observeForMs"].includes(key))) throw new Error("Unknown observation option");
  if (options.observeForMs !== undefined && (!Number.isSafeInteger(options.observeForMs) || options.observeForMs <= 0))
    throw new Error("Observation window must be an explicit positive safe integer in milliseconds");
  const signal = options.signal;
  if (signal !== undefined && (!signal || typeof signal.aborted !== "boolean" || typeof signal.addEventListener !== "function" || typeof signal.removeEventListener !== "function"))
    throw new Error("Invalid observation cancellation signal");
  let resolve, timer, reason;
  const stopped = new Promise(done => { resolve = done; });
  const cancel = detail => { if (!reason) { reason = detail; resolve(); } };
  const abort = () => cancel(`${kind} observation cancelled; the original command result remains unknown. Do not replay.`);
  signal?.addEventListener("abort", abort, {once: true});
  if (signal?.aborted) abort();
  return {
    cancel, get cancelled() { return !!reason; },
    check() { if (reason) throw new Error(reason); },
    start() {
      if (options.observeForMs === undefined) return;
      const started = Date.now();
      const checkWindow = () => {
        if (reason) return;
        const remaining = options.observeForMs - Math.max(0, Date.now() - started);
        if (remaining <= 0) cancel(`Explicit ${kind} observation window ended; the original command result remains unknown. Do not replay.`);
        else timer = setTimeout(checkWindow, Math.min(remaining, 2147483647));
      };
      checkWindow();
    },
    async wait(task) { await Promise.race([task, stopped]); this.check(); return task; },
    close() { clearTimeout(timer); signal?.removeEventListener("abort", abort); }
  };
}
function createPolarObservation(options) { return createReceiptObservation(options); }
function cancelPolarObservation() {
  polarObservation?.cancel("Polar observation cancelled; the original command result remains unknown. Do not replay.");
  durableObservation?.cancel("Command observation cancelled; the original command result remains unknown. Do not replay.");
}

async function sendCommand(op, name, condition = "", bias = 0, selectedSession = null,selectedPolar=null,observationOptions={},selectedSetup=null) {
  if (!canCommand(op)) return;
  const durable = op === "set-bias" || !selectedSession && !selectedPolar && !selectedSetup && ["arm", "save-next", "save-exit"].includes(op);
  const observer = selectedPolar ? createPolarObservation(observationOptions)
    : durable || selectedSetup ? createReceiptObservation(observationOptions, "Command") : null;
  if (observer?.cancelled) { observer.close(); return; }
  if (selectedPolar && observer) polarObservation = observer;
  if ((durable || selectedSetup) && observer) durableObservation = observer;
  commandBusy = true;
  render();
  const id = randomHex(8);
  commandTiming = {id, name, click: performance.now(), writeStart: null, writeEnd: null, receipt: null, rendered: null};
  const generation = connectionGeneration;
  showProgress(name, "none", "Preparing authenticated command…");
  if (op === "set-bias") label("bias-confirmation", "Waiting for saved bias confirmation…");
  render();
  try {
    const preparation = selectedSetup ? signedPolarSetup(id,op,selectedSetup) : selectedPolar ? signedPolarStop(id,op,selectedPolar) : selectedSession ? signedSessionCommand(id, op, selectedSession, bias)
      : signedCommand(id, op, condition, bias);
    const bytes = await (observer ? observer.wait(preparation) : preparation);
    if (selectedSession) assertSelectedSessionControl(op, selectedSession);
    if (selectedSetup) assertSelectedPolarSetup(op, selectedSetup);
    const command = {writeValueWithResponse: transportWrite};
    const write = gattOperation(() => {
      observer?.check();
      if(selectedPolar)assertSelectedPolarStop(op,selectedPolar);
      if(selectedSetup)assertSelectedPolarSetup(op,selectedSetup);
      // Persist original ID before transport admission: a lost response may hide an effect.
      if (op !== "ping" && !pendingOriginal) {
        pendingOriginal={id,name,op,deviceId:ownerIdentity(),epoch:nativeAgeScope?.visible ? nativeAgeScope.epoch : null,state:"live"};
        saveOriginal();
      }
      commandTiming.writeStart = performance.now();
      return command.writeValueWithResponse(bytes);
    }, generation);
    await (observer ? observer.wait(write) : write);
    commandTiming.writeEnd = performance.now();
    if (op !== "ping" && !pendingOriginal) {
      pendingOriginal={id,name,op,deviceId:ownerIdentity(),epoch:nativeAgeScope?.visible ? nativeAgeScope.epoch : null,state:"live"};
      saveOriginal();
    }
    showProgress(name, "sent", "Command delivered. Waiting for Quest runtime feedback…");
    observer?.check();
    observer?.start();
    // Session commands retain their owner 30s contract and observer margin.
    // Durable writer and Polar results retain their original observer until settlement.
    const deadline = selectedPolar || durable || selectedSetup ? Infinity : Date.now() + 35000;
    let terminalReceipt = false;
    while (connected() && generation === connectionGeneration && Date.now() < deadline) {
      const source = {readValue: () => transportRead("receipt")};
      const receiptRead = gattOperation(() => source.readValue(), generation);
      const rawReceipt=parseJson(await (observer ? observer.wait(receiptRead) : receiptRead));
      const receipt = selectedPolar&&rawReceipt.state==="dispatched" ? polarDispatchedReceipt(rawReceipt,id)
        : QuestBleLifetime.commandReceipt(rawReceipt, id);
      if (receipt) {
        commandTiming.receipt = performance.now();
        if(selectedPolar&&receipt.state==="dispatched") {
          terminalReceipt=true;
          if (pendingOriginal?.id === id) clearOriginal();
          showProgress(name,"requested","Stop requested by the Polar owner; sensor ACK/data stop is not confirmed.");break;
        }
        if (["accepted", "pending"].includes(receipt.state)) {
          showProgress(name, "waiting", "Quest accepted the request; waiting for the immersive app’s result…");
        } else if (receipt.state === "confirmed") {
          terminalReceipt = true;
          if (pendingOriginal?.id === id) clearOriginal();
          if(selectedPolar) {
            showProgress(name,"unknown","Unexpected Polar completion receipt; sensor stop is not qualified. Do not replay.");break;
          }
          showProgress(name, "confirmed", receipt.detail || "Confirmed by the Quest runtime.");
          if (op === "set-bias") label("bias-confirmation", receipt.detail || `Applied and saved: ${bias}%`);
          commandTiming.rendered = performance.now();
          break;
        } else if (receipt.state === "rejected") {
          terminalReceipt = true;
          if (pendingOriginal?.id === id) clearOriginal();
          showProgress(name, "failed", receipt.detail || "Quest rejected the request.");
          if (op === "set-bias") label("bias-confirmation", receipt.detail || "Bias change rejected; current bias is unchanged.");
          break;
        } else if (receipt.state === "outcome_unknown") {
          terminalReceipt = true;
          if (pendingOriginal?.id === id) clearOriginal();
          showProgress(name, "unknown", receipt.detail || "Quest could not confirm the result. Check the headset before retrying.");
          if (op === "set-bias") label("bias-confirmation", "Bias outcome unknown; inspect current bias before another change.");
          break;
        }
      }
      const nextPoll = delay(550);
      await (observer ? observer.wait(nextPoll) : nextPoll);
    }
    if (generation === connectionGeneration && !terminalReceipt && Date.now() >= deadline) showProgress(name, "unknown", "No confirmation arrived. Check the headset before retrying.");
  } catch (error) {
    if (generation === connectionGeneration) {
      showProgress(name, "unknown", `Command result unavailable: ${error.message}. Check the headset before retrying.`);
      if (op === "set-bias") label("bias-confirmation", "Bias result unavailable. Check the current bias and original receipt before retrying.");
    }
  } finally {
    if (pendingOriginal?.id === id && pendingOriginal.state === "live") pendingOriginal.state="uncertain";
    if (commandTiming?.id === id) {
      const t=commandTiming, elapsed=(a,b)=>a===null||b===null?"—":`${Math.max(0,Math.round(b-a))} ms`;
      label("timing-detail", `${t.name} · request ${t.id} · click→write ${elapsed(t.click,t.writeStart)} · transport write ${elapsed(t.writeStart,t.writeEnd)} · write→receipt ${elapsed(t.writeEnd,t.receipt)} · receipt→render ${elapsed(t.receipt,t.rendered)}. Android admission, native action and durable acknowledgement require correlated owner timestamps; transport intervals alone do not identify them.`);
    }
    observer?.close();
    if (polarObservation === observer) polarObservation = undefined;
    if (durableObservation === observer) durableObservation = undefined;
    if (generation !== connectionGeneration) return;
    commandBusy = false;
    // A cancelled read may still own the GATT queue; do not await it just to refresh.
    if (!observer?.cancelled) await refreshStatus();
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
    byId("access").hidden = !!networkTransport || false;
  }
  render();
}

for (const button of document.querySelectorAll(".bottom-nav button")) {
  button.addEventListener("click", () => selectPage(button.dataset.target));
}
// A page owns only its selected Web Bluetooth handle, not other tabs/clients.
function retirePageConnection() {
  pageActive = false;
  reconnectAllowed = false;
  clearTimeout(reconnectTimer); reconnectTimer = undefined;
  connectionAttempt++;
  connecting = false;
  const retired = device;
  disconnected("Page retired the connection attempt.");
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
byId("live-bias").addEventListener("input", () => label("live-bias-value", `${byId("live-bias").value}%`));
byId("apply-live-bias").addEventListener("click", () => {
  if (!canCommand() || !sessionControlAllowed("set-bias", questStatus)) return;
  const bias = Number(byId("live-bias").value);
  return sendCommand("set-bias", `Apply breathing bias ${bias}%`, "", bias, sessionControlCapability(questStatus));
});
byId("connect").addEventListener("click", connect);
byId("reconnect").addEventListener("click", () => connect({reuseSelected: true}));
function cancelConnection() {
  reconnectAllowed = false;
  clearTimeout(reconnectTimer); reconnectTimer = undefined;
  try { localStorage.removeItem("viscereality-authorised-quest"); } catch (_) { }
  connectionAttempt++;
  const retired = device;
  disconnected("Connection cancelled by the user.");
  device = undefined;
  try { retired?.gatt?.disconnect(); } catch (_) { }
  label("connection-detail", "Connection cancelled. Connect again when ready.");
}
byId("disconnect").addEventListener("click", cancelConnection);
byId("cancel-polar-observation").addEventListener("click", cancelPolarObservation);
byId("refresh").addEventListener("click", refreshStatus);
byId("unlock").addEventListener("click", unlock);
byId("pair-code").addEventListener("keydown", (event) => { if (event.key === "Enter") unlock(); });
byId("breath-bias").addEventListener("input", () => label("breath-bias-value", `${byId("breath-bias").value}%`));
byId("arm-one").addEventListener("click", () => sendCommand("arm", "Arm Condition 1", "condition-a", Number(byId("breath-bias").value)));
byId("arm-two").addEventListener("click", () => sendCommand("arm", "Arm Condition 2", "condition-b", Number(byId("breath-bias").value)));
for (const op of ["start", "pause", "resume"]) {
  byId(`${op}-session`).addEventListener("click", () => sendSessionControl(op));
}
byId("save-next").addEventListener("click", () => sendCommand("save-next", "Save session & prepare next"));
byId("save-exit").addEventListener("click", () => sendCommand("save-exit", "Save and exit"));
byId("return-vr").addEventListener("click", () => sendCommand("return-vr", "Return to VR"));
byId("open-polar").addEventListener("click", () => sendCommand("open-polar", "Open Polar setup"));
byId("rescan-polar").addEventListener("click", () => sendPolarSetup("scan"));
byId("start-polar-ecg").addEventListener("click", () => sendPolarSetup("start-ecg"));
byId("stop-polar-acc").addEventListener("click",()=>sendPolarStop("stop-acc"));
byId("stop-polar-ecg").addEventListener("click",()=>sendPolarStop("stop-ecg"));
byId("guide-return-vr").addEventListener("click", () => sendCommand("return-vr", "Return to VR"));
byId("guide-condition").addEventListener("change", render);
byId("guide-finish").addEventListener("click", () => sendCommand("save-next", "Finishing and preparing next"));
byId("guide-action").addEventListener("click", () => {
  if (byId("guide-action").disabled) return;
  const action=guideAction;
  if (action === "connect") return connect();
  if (action === "reconnect") return connect({reuseSelected:true});
  if (action === "refresh") return refreshStatus();
  if (action === "finish") return sendCommand("save-next","Finishing and preparing next");
  if (action === "reconcile") {
    return acknowledgeUnknownOriginal();
  }
  if (["start","pause","resume"].includes(action)) return sendSessionControl(action);
  if (action === "arm") {
    const condition=byId("guide-condition").value;
    const index=condition==="condition-b"?1:0;
    if (questStatus?.a?.[index]!=="track-ready") {
      label("guide-instruction", "The selected condition's audio is not ready. Choose another condition or refresh status.");
      return;
    }
    return sendCommand("arm",`Arm ${conditionLabel(condition)}`,condition,Number(byId("breath-bias").value));
  }
  if (action?.startsWith("polar-")) {
    const op=action.slice(6);
    return sendPolarSetup(op,op==="select"?byId("guide-polar-device").value:"");
  }
});
if (preview) {
  const scenario=new URLSearchParams(location.search).get("state")||"running";
  const readySetup={s:"a".repeat(32),g:1,r:2,p:true,b:true,c:true,x:"abcdef123456",a:true,e:false,sc:false,d:["abcdef123456"]};
  const setupState=(changes)=>({p:"IDLE",rec:false,h:"vr-preparation",y:{...readySetup,...changes}});
  const examples={idle:setupState({}),panel:{p:"IDLE",rec:false,h:"panel"},armed:{p:"ARMED",rec:true,h:"vr-session"},paused:{p:"PAUSED",rec:true,h:"vr-session"},running:{p:"RUNNING",rec:true,h:"vr-session"},complete:{p:"RUNNING",rec:true,h:"vr-session",co:"DURABLE",ms:30000},missing:setupState({c:false,x:"",a:false,e:false,d:[]}),scan:setupState({c:false,x:"",a:false,e:false,sc:true,d:[]}),select:setupState({c:false,x:"",a:false,e:false,d:["abcdef123456","123456abcdef"]}),connecting:setupState({c:false,a:false,e:false}),"no-permission":setupState({p:false,c:false,x:"",a:false,e:false,d:[]}),nogrant:{p:"IDLE",rec:false,h:"vr-preparation",y:null}};
  questStatus = { v: 1, m: "open", f: "focused", p: "RUNNING", h:"vr-session", g: 1, r: 9,
    c: "condition-a", rec: true, co: "NOT_REACHED", ms: 25000, st: "ready", k: "ready",
    bt: "ON", po: "CONNECTED", pf: true, done: 0, early: 0,
    a: ["track-ready", "track-ready"], b: ["pattern-ready", "pattern-ready"],
    q:{v:2,s:"b".repeat(32),g:1,o:["start","pause","resume"]},
    y:readySetup,o:{v:1,s:"observed",e:"1",i:"1",g:1,r:9,a:0},
    ...examples[scenario] };
  lastStatusAt = Date.now();
}
selectPage("prepare");
render();
// Browser permission is only a candidate handle. Fresh GATT characteristics and
// a usable native status are required again before any control becomes available.
async function resumeAuthorisedQuest() {
  if (preview || !pageActive || typeof navigator === "undefined" || !navigator.bluetooth?.getDevices) return;
  let id;
  try { id=localStorage.getItem("viscereality-authorised-quest"); } catch (_) { return; }
  if (!id) return;
  try {
    const permitted=await navigator.bluetooth.getDevices();
    if (!pageActive || device || connecting) return;
    const previous=permitted.find(candidate=>candidate.id===id);
    if (!previous) { label("connection-detail", "Previous Quest permission is unavailable. Choose the headset again."); return; }
    device=previous;
    reconnectAllowed=true;
    await connect({reuseSelected:true});
  } catch (_) { label("connection-detail", "Previous Quest could not be recovered. Choose the headset again."); }
}
resumeAuthorisedQuest();

function routeChanged() {
  if (connected() || connecting) cancelConnection();
  selectedRoute=byId("connection-route").value;
  byId("network-enrollment").hidden=selectedRoute==="ble";
  byId("relay-token-row").hidden=selectedRoute!=="relay";
  byId("trusted-lan-row").hidden=selectedRoute==="relay";
  const notes={ble: "Choose the nearby Quest. Bluetooth permission is requested by your browser.",
    lan:"Join the same Wi-Fi network in system settings. Enter the gateway address and controller enrollment shown by the headset. Secure HTTPS is preferred. Experimental HTTP on a trusted private network needs explicit consent and browser local-network permission support.",
    relay:"A private relay must be deployed and provisioned first. Enter its session exchange URL and private route token. No relay is configured by this website.",
    direct:"Join the headset's network using your device's Wi-Fi settings. This browser cannot join Wi-Fi for you. Keep this cached page open, then enter the gateway address. Nearby Bluetooth also works without Internet."};
  byId("route-note").textContent=notes[selectedRoute];
  render();
}
async function connectNetwork() {
  if (connected() || connecting || networkRecovering || preview || !pageActive) return;
  connecting=true;
  const generation=++connectionGeneration;
  let candidate;
  try {
    label("connection-detail","Authenticating the enrolled headset and reading current state...");
    render();
    candidate=new ViscerealityTransport.Gateway({url:byId("gateway-url").value.trim(),
      controller:byId("controller-id").value.trim(), device:byId("gateway-device").value.trim(),
      key:byId("controller-key").value.trim(), routeToken:selectedRoute==="relay"?byId("relay-token").value.trim():"", pageProtocol:location.protocol, trustedLan:selectedRoute!=="relay" && byId("trusted-lan").checked});
    byId("controller-key").value=""; byId("relay-token").value="";
    pendingConnection={cancel:()=>candidate.close()};
    await candidate.connect();
    if (generation!==connectionGeneration || !pageActive) {candidate.close();return;}
    networkTransport=candidate;
    gattOperations=operationQueue();
    const initial=await refreshStatus();
    if (!initial.ok) throw initial.error;
    pollTimer=setInterval(refreshStatus,1000);
    label("connection-detail","Enrolled headset authenticated. Current native status received.");
  } catch(error) {
    candidate?.close();
    if(generation===connectionGeneration) disconnected(`Connection unavailable: ${connectionErrorText(error)}. No command was replayed.`);
  } finally {
    if(generation===connectionGeneration) {connecting=false; pendingConnection=undefined;render();}
  }
}
byId("connection-route").addEventListener("change",routeChanged);
if (typeof navigator!=="undefined") {
  const bleOption=byId("route-ble");
  if (!navigator.bluetooth || !globalThis.isSecureContext) {
    bleOption.disabled=true; bleOption.textContent="Nearby Bluetooth  -  unavailable in this browser";
  }
  if (navigator.serviceWorker && location.protocol==="https:") navigator.serviceWorker.register("sw.js",{scope:"./",updateViaCache:"none"}).then(()=>{
    byId("offline-note").textContent="Offline page cache registered. Wait for the first download to complete before leaving Internet access.";
    return navigator.serviceWorker.ready;
  }).then(()=>{byId("offline-note").textContent="This page is saved for offline use. A live headset connection is still required.";}).catch(()=>{
    byId("offline-note").textContent="Offline page storage is unavailable. Keep this page open.";
  });
  else byId("offline-note").textContent="Load the public HTTPS page once to save it for offline use.";
}
