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
const breathView = globalThis.ViscerealityBreathMonitor?.createView(document);
let breathPollTimer, breathReading = false, breathReceivedAt = 0, breathAbort;
const preview = new URLSearchParams(location.search).get("preview") === "1";
let device;
let legacyGattLease;
function disconnectLegacyGatt(candidate,lease=legacyGattLease) {
  if(lease)lease.disconnect();
  else {try {candidate?.gatt?.disconnect();}catch(_) {}}
}
let characteristics;
let networkTransport;
let networkRecovering = false;
let recoveryController, recoveryWaitingRemote=false, statusAbort, receiptAbort;
let automaticRecoveryBlock;
const snapshots = new ViscerealitySnapshot.SnapshotState(() => performance.now());
const INTENT_KEY="viscereality-last-connected";
function loadReconnectIntent() {
  try {
    const raw=localStorage.getItem(INTENT_KEY);if(!raw||raw.length>512)return null;
    const v=JSON.parse(raw);
    if(v && Object.keys(v).sort().join(",")==="device,gateway,serial" && /^[0-9a-f]{32}$/.test(v.device)
        && discoveryApi.serialValid(v.serial)) return {device:v.device,serial:v.serial,gateway:discoveryApi.localEndpoint(v.gateway)};
  } catch(_) {}
  return null;
}
let reconnectIntent; // Loaded only after discovery/route initialization.
function rememberReconnect(identity,gateway) {
  reconnectIntent={device:identity.device,serial:identity.serial,gateway};
  try {localStorage.setItem(INTENT_KEY,JSON.stringify(reconnectIntent));}catch(_) {}
}
function stopRecovery() {recoveryController?.stop();recoveryController=undefined;networkRecovering=false;recoveryWaitingRemote=false;}
function invalidateSnapshot() {snapshots.invalidate();lastStatusAt=0;nativeAgeConnection();nativeAgeScope.visible=null;breathView?.unavailable("Status unavailable; waiting for current breathing readback.");}
function resetNativeView() {questStatus=undefined;lastStatusAt=0;snapshots.reset();nativeAgeScope=undefined;breathView?.reset();breathReceivedAt=0;if(pendingOriginal)pendingOriginal.state="observing";}

let bleOwnerIdentity;
let selectedRoute = "local";
const discoveryApi=globalThis.ViscerealityDiscovery;
const headsetDiscovery=discoveryApi ? new discoveryApi.Discovery() : null;
let headsetRoster;
try {headsetRoster=discoveryApi ? new discoveryApi.Roster(localStorage) : null;}catch(_) {headsetRoster=discoveryApi ? new discoveryApi.Roster() : null;}
const freshHeadsets=new Map();
const failedHeadsets=new Set();
let selectedHeadset, findingHeadset=false, discoveryGeneration=0;
let questStatus;
let lastStatusAt = 0;
let accessCode = "";
let commandBusy = false;
let commandReceiptAbort, pageObservationGeneration=0;
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
    const raw=localStorage.getItem(ORIGINAL_KEY);
    if(!raw||raw.length>512)return null;
    const value=JSON.parse(raw);
    if (value && /^[0-9a-f]{16}$/.test(value.id) && typeof value.deviceId === "string"
        && value.deviceId.length<=128 && /^[1-9][0-9]{0,18}$/.test(value.epoch)
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
  if(questStatus?.wifi_snapshot===1) {
    const age=snapshots.age();
    return age===null?"Full native snapshot age unavailable":`Full native snapshot age: ${age} ms, including the complete browser read${freshStatus()?"":" · stale"}`;
  }
  if (!connected() || preview) return "Native status-read age unavailable";
  const now = nativeAgeClock();
  const age = now === null ? null : nativeAgeAt(now);
  return age === null ? "Native status-read age unavailable"
    : `Native status read: at least ${age} ms old; delivery delay unknown`;
}
let pageActive = !document.hidden;
function operationQueue() { return new QuestBleLifetime.OperationQueue(generation => {
  if (generation !== connectionGeneration || !pageActive || !(networkTransport && (networkTransport.active || networkRecovering) || device?.gatt?.connected)) throw new Error("Connection retired");
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
function transportRead(name, signal) {
  if (networkTransport) {
    const id=commandBusy ? networkTransport.lastId : pendingOriginal?.id || networkTransport.lastId;
    if(signal && networkTransport.exchange)return networkTransport.exchange(name,name==="receipt"?{id}:{},{signal})
      .then(value=>new DataView(encoder.encode(JSON.stringify(value)).buffer));
    return networkTransport.read(name,id);
  }
  return typeof ViscerealityTransport === "undefined" ? characteristics[name].readValue() : ViscerealityTransport.ble(characteristics).read(name);
}
function transportWrite(bytes) {
  if (networkTransport) return networkTransport.write(bytes);
  return typeof ViscerealityTransport === "undefined" ? characteristics.command.writeValueWithResponse(bytes) : ViscerealityTransport.ble(characteristics).write(bytes);
}
function ownerIdentity() { return networkTransport ? `gateway:${networkTransport.device}:${networkTransport.epoch}` : bleOwnerIdentity || device?.id || ""; }
function controlsUnlocked() { return connected() && (!!networkTransport?.active || questStatus?.m === "open" || !!accessCode); }
function freshStatus() {
  if(preview)return !!questStatus;
  if(!pageActive || document.hidden || automaticRecoveryBlock || networkRecovering || !questStatus)return false;
  if(selectedRoute==="local" && networkTransport && selectedHeadset
      && (selectedHeadset.device!==networkTransport.device || selectedHeadset.serial!==networkTransport.serial))return false;
  // Legacy no-marker callers retain compatibility before their first read.
  return snapshots.current ? snapshots.owner===connectionGeneration && snapshots.fresh() : !Object.hasOwn(questStatus,"wifi_snapshot") && lastStatusAt>0 && Date.now()-lastStatusAt>=0 && Date.now()-lastStatusAt<5000;
}
// LAN owners may advertise a process-local headset choice. Omission preserves
// older owners; a present unrecognized value never grants browser mutations.
function controlMode(status) {
  if (!status || !Object.hasOwn(status, "control_mode")) return null;
  return ["choose", "direct", "remote"].includes(status.control_mode) ? status.control_mode : "unavailable";
}
function remoteControlAllowed(status) { return [null, "remote"].includes(controlMode(status)); }
function controlModeInstruction(status) {
  const mode = controlMode(status);
  if (mode === "direct") return "Direct mode. Use the headset experiment panel to switch to Remote before using browser controls.";
  if (mode === "choose") return "Choose Direct or Remote. Use the headset experiment panel to select Remote before using browser controls.";
  return mode === "unavailable" ? "Control mode unavailable. Use the headset experiment panel to select Remote, then refresh status." : "";
}
function assertControlMode() {
  if (!remoteControlAllowed(questStatus)) {
    const error = new Error(`Command not sent. ${controlModeInstruction(questStatus)}`);
    error.name = "ControlModeError";
    throw error;
  }
}
function canCommand(op="") { return !preview && controlsUnlocked() && freshStatus() && remoteControlAllowed(questStatus) && !commandBusy
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

// Optional native acquisition readback, independent of GATT/link and graph data.
// Omission supports older owners; malformed present readback cannot enable a run.
function polarInput(status) {
  if (!status || !Object.hasOwn(status, "pi")) return undefined;
  const input = status.pi;
  return input && typeof input === "object" && !Array.isArray(input)
    && Object.keys(input).sort().join(",") === "f,h,r"
    && [input.r,input.f,input.h].every(value => typeof value === "boolean") ? input : null;
}
function polarInputReady(status) {
  const input = polarInput(status);
  return input !== null && (!input || !input.r || input.f);
}
function polarSessionStep(status) {
  if (!status?.rec || !["ARMED","PAUSED"].includes(status.p)) return null;
  const input = polarInput(status), paused = status.p === "PAUSED";
  const action = paused ? "resume" : "start", label = paused ? "Resume session" : "Start session";
  if (input === null) return {title:"Polar input unavailable",instruction:"Polar input readiness is unavailable. Refresh status before Start or Resume, or finish and save.",action,label,finish:true};
  const diagnostics=globalThis.ViscerealityPolarDiagnostics?.describe(status);
  if (input?.r && !input.f) return {
    title:paused ? "Paused · waiting for Polar" : "Waiting for Polar motion",
    instruction:(status.pd?.native?.diagnostics_observed===true && diagnostics ? diagnostics.current+" " : "Waiting for fresh Polar motion data. ") + "The Quest retries its selected sensor automatically. " + (paused ? "The session stays paused; choose Resume explicitly after motion recovers, or finish and save." : "Start when motion is current and the participant is ready, or finish and save."),
    action,label,finish:true
  };
  if (paused && input?.r && input.f && input.h) return {title:"Polar recovered · paused",instruction:"Polar motion data has recovered. The session remains paused. Choose Resume explicitly when ready, or finish and save.",action,label,finish:true};
  return null;
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
    && !status.pending && phases[op]?.includes(status.p) === true
    && (!["start","resume"].includes(op) || polarInputReady(status));
}

function assertSelectedSessionControl(op, selected) {
  if (["start","resume"].includes(op) && !polarInputReady(questStatus)) {
    const error = new Error("Command not sent. Fresh Polar motion input is unavailable; refresh status before Start or Resume.");
    error.name = "PolarInputError";
    throw error;
  }
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
  if (polarSessionStep(status)) return polarSessionStep(status).title;
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
  if (!remoteControlAllowed(status)) return controlModeInstruction(status);
  if (polarSessionStep(status)) return polarSessionStep(status).instruction;
  if (controlMode(status) === "remote") {
    if (status.p === "ARMED") return "Fit the headset, then use Start session below when ready.";
    if (status.p === "PAUSED") return "Use Resume session below when ready.";
    if (status.p === "RUNNING" || status.p === "RECORDING") return "Use Pause session below if needed.";
  }
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
  if (networkRecovering) return {title:recoveryWaitingRemote?"Waiting for Remote":"Reconnecting to Quest",instruction:"Last confirmed headset state is shown. The headset continues independently. Controls await verified reconnection.",action:null};
  if (status && !freshStatus() && !preview) return {title:"Last confirmed state · stale",instruction:"Current headset state is unavailable. Controls wait for a fresh readback.",action:"refresh",label:"Refresh status"};
  if (pendingOriginal && connected()) {
    if (pendingOriginal.state === "uncertain") return {title:"Command outcome unknown",instruction:"The original receipt is unavailable or belongs to another Quest owner. Check the headset and current session state, then acknowledge before issuing another recording action.",action:"reconcile",label:"I checked the Quest state"};
    return {title:"Checking original command",instruction:pendingOriginal.state === "reconciled_receipt" ? "The original receipt was found. Waiting for a fresh session readback." : "Reading the original Quest receipt without sending the command again.",action:null};
  }
  if (!status) return connected()
    ? {title:"Quest status unavailable",instruction:"The Bluetooth link is present, but no usable app status is current. Read status again.",action:"refresh",label:"Refresh status"}
    : {title: "Connect to Quest", instruction: connecting ? "Connecting to the selected Quest…" : "Connect to read the current headset state.", action: device ? "reconnect" : "connect", label: device ? "Reconnect to Quest" : "Connect to Quest"};
  if (!remoteControlAllowed(status)) return {
    title: controlMode(status) === "direct" ? "Direct mode" : controlMode(status) === "choose" ? "Choose Direct or Remote" : "Control mode unavailable",
    instruction: controlModeInstruction(status), action: "refresh", label: "Refresh status"
  };
  if (status.h === "panel") return {title: "Headset panel open", instruction: "Return to VR before continuing the session.", action: null};
  if (status.h !== "vr-preparation" && status.h !== "vr-session") return {title: "Headset state unknown", instruction: "Refresh status and check the headset before continuing.", action: "refresh", label: "Refresh status"};
  if (status.recovery || status.p === "RECOVERY" || status.p === "ERROR") return {title: "Readiness needs attention", instruction: "Review the headset and recording storage, then refresh status.", action: "refresh", label: "Refresh status"};
  if (["ARMING","STARTING","SAVING","FINALIZING"].includes(status.p) || status.pending)
    return {title: status.p === "SAVING" || status.p === "FINALIZING" ? "Saving recording" : "Preparing session", instruction: "Waiting for the Quest to finish its current operation.", action: null};
  if (status.rec) {
    if (status.co === "DURABLE" && status.p !== "PAUSED") return {title:"Condition complete · recording continues",instruction:"Finish and save this recording, then prepare the headset for the next participant.",action:"finish",label:"Finish & prepare next"};
    if (["ARMED","PAUSED","RUNNING","RECORDING"].includes(status.p)
        && !sessionControlCapability(status)) return {title:"Session control unavailable",instruction:"The Quest has not granted browser session controls. Refresh status and check the app before continuing.",action:"refresh",label:"Refresh status",finish:status.p!=="ARMED"};
    if (polarSessionStep(status)) return polarSessionStep(status);
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
  if (!y.x && !y.d.length) return {title: "Find Polar sensor", instruction: "Ask the Quest to scan for the participant's Polar sensor.", action: "polar-scan", label: "Scan for Polar"};
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
  const setup = polarSetupCapability(s), input = polarInput(s);
  const setupReadback = setup ? `Quest Polar: ${setup.sc ? "scanning" : setup.x ? "sensor selected" : "no sensor selected"} · ${setup.c ? "connected" : "not connected"} · motion data ${setup.a ? "current" : "not current"}` : "";
  byId("guide-polar-status").hidden = !setup && input === undefined;
  label("guide-polar-status", input === null ? "Polar motion readiness unavailable"
    : setup && !s.rec ? setupReadback
    : input?.r ? `Quest Polar motion: ${input.f ? "current" : "waiting for fresh data"}${input.h ? " · input-loss pause retained" : ""}`
    : setup ? setupReadback
    : "Polar motion input is not required for this session.");
  if(s && !freshStatus() && !preview)byId("guide-polar-status").textContent="Last confirmed · "+byId("guide-polar-status").textContent;
  const facts=byId("guide-session-facts");
  facts.hidden = !s?.rec;
  if (s?.rec) facts.textContent = `${conditionLabel(s.c)}${s.co === "DURABLE" ? " · condition complete; recording continues" : ""}`;
  const timer = byId("guide-active-clock");
  timer.hidden = !s?.rec;
  timer.textContent = s?.rec ? formatMs(s.p === "ARMED" ? 0 : s.ms) : "—";
  byId("guide-clock-label").hidden = !s?.rec;
  label("guide-clock-label", s?.p === "ARMED" ? "Official active time · waiting for Start" : s?.p === "PAUSED" ? "Official active time · paused" : "Official active time");
  if(s && !freshStatus() && !preview)byId("guide-clock-label").textContent="Last confirmed active time";
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
  const mode = controlMode(s);
  const modeLabel = mode === null ? "" : ({direct:"Direct mode", remote:"Remote mode", choose:"Choose Direct or Remote", unavailable:"Control mode unavailable"})[mode];
  label("presentation", (s && !freshStatus() && !preview ? "Last confirmed · " : "") + presentation + (modeLabel ? ` · ${modeLabel}` : ""), panel || !s || s.h === "unknown" ? "attention" : "");
}

function render() {
  const live = connected();
  renderHeadsets();
  byId("connection-options").hidden = live || networkRecovering || preview;
  const s = questStatus;
  const current=freshStatus();
  if(s && !current && !preview && /status received|revalidated/i.test(byId("connection-detail").textContent))label("connection-detail","Last confirmed headset status shown. Waiting for a current readback.");
  renderGuide(s);
  label('native-readback-age', nativeAgeLabel());
  const conn = byId("connection-label");
  conn.textContent = preview ? "Preview · not connected" : networkRecovering ? recoveryWaitingRemote ? "Waiting for Remote" : "Reconnecting · state stale" : live && current ? "Live" : s ? "Last confirmed state · stale" : "Disconnected";
  conn.classList.toggle("connected", live && current && !preview);
  const updateAge=snapshots.age();
  label("status-age",s ? `${current?"Updated":"Last confirmed"} ${updateAge===null?"age unavailable":`${Math.floor(updateAge)} ms ago`}${current?"":" · stale; controls disabled"}` : "No confirmed headset state");
  byId("connect").hidden = live || preview;
  byId("connect").disabled = connecting || networkRecovering;
  byId("reconnect").hidden = live || connecting || networkRecovering || preview || !device;
  byId("reconnect").disabled = connecting;
  byId("disconnect").hidden = !live && !connecting && !networkRecovering && !findingHeadset;
  byId("disconnect").textContent = connecting || findingHeadset ? "Cancel connection" : "Disconnect";
  byId("refresh").disabled = !pageActive || !live && !networkRecovering || commandBusy;
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
  const polarDiagnostics=globalThis.ViscerealityPolarDiagnostics?.describe(s,snapshots.age());
  label("polar-pause-cause",s?.rec ? polarDiagnostics?.pause || "" : "");
  label("polar-diagnostic-detail",polarDiagnostics ? polarDiagnostics.current+" "+polarDiagnostics.detail : "Polar diagnostics unavailable.");
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
    : !remoteControlAllowed(s) ? controlModeInstruction(s)
    : s.pending || commandBusy ? "Wait for the current command to finish."
    : !sessionControlCapability(s) ? "No current browser session-control capability. Use the headset controls or refresh status."
    : polarSessionStep(s) ? polarSessionStep(s).instruction
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

async function observeOriginalReceipt(status, generation, parentSignal) {
  const original=pendingOriginal;
  if (!original || original.state !== "observing" || commandBusy || !(connected() || networkRecovering && networkTransport && !networkTransport.retired)) return;
  const currentEpoch=status?.o?.s==="observed" ? status.o.e : null;
  if (!original.deviceId || ownerIdentity() !== original.deviceId || !original.epoch || currentEpoch !== original.epoch) {
    original.state="uncertain";
    showProgress(original.name,"unknown","Original Quest owner or native epoch is unavailable. The command was not replayed; check the headset before continuing.");
    render(); return;
  }
  const route=networkTransport,abort=new AbortController();receiptAbort=abort;
  const signal=AbortSignal.any([abort.signal,...(parentSignal?[parentSignal]:[])]);
  try {
    let timer,cancel;
    const read=gattOperation(async()=>route?.exchange ? new DataView(encoder.encode(JSON.stringify(await route.exchange("receipt",{id:original.id},{signal}))).buffer) : transportRead("receipt"),generation);
    const bounded=new Promise((_,reject)=>{
      cancel=()=>reject(signal.reason);signal.addEventListener("abort",cancel,{once:true});
      timer=setTimeout(()=>{const error=new Error("retained receipt read timed out");error.kind="transient";abort.abort(error);},5000);
    });
    let value;
    try { value=await Promise.race([read,bounded]); }
    finally { clearTimeout(timer);signal.removeEventListener("abort",cancel); }
    const raw=parseJson(value);
    if (generation !== connectionGeneration || pendingOriginal !== original || !pageActive || signal.aborted || route!==networkTransport) return;
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
    if (generation !== connectionGeneration || pendingOriginal !== original || !pageActive || parentSignal?.aborted || route!==networkTransport) return;
    original.state=["transient","rejoin-needed"].includes(error?.kind) ? "observing" : "uncertain";
    showProgress(original.name,"unknown",`Original receipt read unavailable: ${connectionErrorText(error)}. No command was replayed.`);
    if (String(error?.message).includes("retained receipt read timed out")) {
      disconnectLegacyGatt(device);
    }
    if(route && (!route.active || route.retired))beginNetworkRecovery();
  } finally {if(receiptAbort===abort)receiptAbort=undefined;}
  render();
}
function acknowledgeUnknownOriginal() {
  if (!pendingOriginal || pendingOriginal.state !== "uncertain" || !freshStatus() || questStatus.pending || !connected()) return;
  clearOriginal();
  render();
}

function acceptSnapshot(status,ticket,route=networkTransport) {
  if(!snapshots.accept(status,ticket,route?.nativeEpoch))throw new Error(status?.p==="UNAVAILABLE"?"Quest status source unavailable":"Quest snapshot is malformed, reordered or stale");
  receiveNativeAge(status);
  const previous=questStatus;
  if(previous && (previous.o?.e!==status.o?.e || previous.g!==status.g)) {breathView?.reset();breathReceivedAt=0;}
  questStatus=status;lastStatusAt=Date.now();
  if(breathView && status.breath_monitor!==1) {breathView.reset();if(status.rec)breathView.unavailable("Live breathing history requires the updated Quest app and a Wi-Fi connection.");}
  if(pendingOriginal?.state==="reconciled_receipt" && !status.pending
      && pendingOriginal.deviceId===ownerIdentity() && pendingOriginal.epoch===status.o?.e)clearOriginal();
}
async function refreshStatus() {
  if(!pageActive || reading || commandBusy)return {ok:false,error:new Error("Status read not ready")};
  if(networkRecovering)return {ok:false,error:new Error("Recovery in progress; existing backoff retained")};
  if(!connected())return {ok:false,error:new Error("Status read not ready")};
  const generation=connectionGeneration,route=networkTransport,ticket=snapshots.begin(generation);
  reading=true;statusAbort=new AbortController();const abort=statusAbort;
  try {
    const status=await gattOperation(async()=>route ? route.exchange ? route.exchange("status",{},{signal:abort.signal}) : parseJson(await transportRead("status")) : parseJson(await transportRead("status")),generation);
    if(generation!==connectionGeneration || route!==networkTransport || !pageActive || abort.signal.aborted)return {ok:false,error:new Error("Connection retired")};
    acceptSnapshot(status,ticket,route);
    if(route && !remoteControlAllowed(status) && globalThis.ViscerealityRecovery) {beginNetworkRecovery();return {ok:true};}
    label("connection-detail","Quest status received.");render();
    await observeOriginalReceipt(status,generation);
    return {ok:true};
  } catch(error) {
    if(generation===connectionGeneration && pageActive && !abort.signal.aborted) {
      invalidateSnapshot();render();label("connection-detail",`Status read failed: ${connectionErrorText(error)}`);
      if(route)beginNetworkRecovery();
    }
    return {ok:false,error};
  } finally {if(generation===connectionGeneration){reading=false;if(statusAbort===abort)statusAbort=undefined;}}
}
function startNetworkPolling() {
  clearInterval(pollTimer);clearInterval(breathPollTimer);
  pollTimer=setInterval(()=>{if(pageActive&&!networkRecovering)refreshStatus();},1000);
  if(breathView)breathPollTimer=setInterval(refreshBreathing,500);
}
async function joinVerifiedHeadset(selector,signal,remember=false) {
  // Only a known exact route is used. No internet test, discovery or subnet scan.
  const url=discoveryApi.localEndpoint(selector.gateway),bounded=AbortSignal.any([signal,AbortSignal.timeout(15000)]);
  const run=async operation=>{
    let abort;
    const retired=new Promise((_,reject)=>{abort=()=>reject(bounded.reason);bounded.addEventListener("abort",abort,{once:true});});
    try {const pending=Promise.race([operation,retired]);bounded.throwIfAborted();const value=await pending;bounded.throwIfAborted();return value;}
    finally {bounded.removeEventListener("abort",abort);}
  };
  const response=await run(fetch(url,{method:"GET",cache:"no-store",credentials:"omit",redirect:"error",referrerPolicy:"no-referrer",signal:bounded}));
  if(!response.ok)throw new ViscerealityTransport.GatewayError(response.status===408||response.status===429||response.status>=500?"transient":"integrity",`http-${response.status}`,"Known headset route unavailable");
  const text=await run(response.text());
  if(encoder.encode(text).length>4096)throw new ViscerealityTransport.GatewayError("integrity","identity-schema","Headset identity too large");
  let live;try {live=JSON.parse(text);}catch(_){throw new ViscerealityTransport.GatewayError("integrity","identity-schema","Headset identity is malformed");}
  if(live?.v!==1||!/^[0-9a-f]{32}$/.test(live.device||"")||!discoveryApi.serialValid(live.serial)||selector.device!==undefined&&(live.device!==selector.device||live.serial!==selector.serial))throw new ViscerealityTransport.GatewayError("integrity","physical-identity","The Wi-Fi address belongs to a different headset. Use Find to select it explicitly.");
  if(!discoveryApi.epoch(live.epoch)||!(discoveryApi.epoch(live.native_epoch)||live.native_epoch==="0"&&live.enabled===false&&live.remote_available===false))throw new ViscerealityTransport.GatewayError("integrity","identity-schema","Headset lifetime is malformed");
  if(typeof live.enabled!=="boolean"||typeof live.remote_available!=="boolean")throw new ViscerealityTransport.GatewayError("integrity","identity-schema","Headset availability is malformed");
  if(remember)rememberReconnect(live,url);
  if(live.enabled!==true||live.remote_available!==true)throw new ViscerealityTransport.GatewayError("availability","remote-unavailable","Waiting for Remote on the headset");
  const joined=await ViscerealityTransport.localJoin({url,expected:{device:live.device,serial:live.serial,epoch:live.epoch,native_epoch:live.native_epoch},signal});
  return joined;
}
function beginNetworkRecovery() {
  if(preview||!pageActive||document.hidden||automaticRecoveryBlock||!globalThis.ViscerealityRecovery?.RecoveryController)return;
  if(networkRecovering&&recoveryController)return;
  networkRecovering=true;invalidateSnapshot();
  if(pendingOriginal && ["live","uncertain"].includes(pendingOriginal.state))pendingOriginal.state="observing";
  const generation=connectionGeneration;
  stopRecovery();networkRecovering=true;
  recoveryController=new ViscerealityRecovery.RecoveryController({
    attempt:async({signal})=>{
      if(!pageActive||generation!==connectionGeneration)return {kind:"blocked",error:new Error("Connection retired")};
      try {
        let route=networkTransport;
        if(route?.retired && route.retirementError?.kind==="integrity")return {kind:"blocked",error:route.retirementError};
        const ticket=snapshots.begin(generation);
        let result=route&&!route.retired ? await gattOperation(()=>route.recoverStatusOnce({signal}),generation) : {kind:"blocked",error:route?.retirementError};
        signal.throwIfAborted();
        if(result.kind==="blocked" && result.error?.kind!=="integrity" && reconnectIntent) {
          const joined=await joinVerifiedHeadset(reconnectIntent,signal);signal.throwIfAborted();
          if(generation!==connectionGeneration){joined.gateway.close();return {kind:"blocked"};}
          const oldOwner=route?`${route.epoch}:${route.nativeEpoch}`:null;
          route?.close();networkTransport=route=joined.gateway;gattOperations=operationQueue();
          if(oldOwner!==`${route.epoch}:${route.nativeEpoch}`)resetNativeView();
          // Revalidation uses the exact candidate object from the reviewed API.
          const rejoinedTicket=snapshots.begin(generation);rejoinedTicket.start=ticket.start;
          result=await gattOperation(()=>route.recoverStatusOnce({signal}),generation);
          if(result.kind!=="success")return result;
          return finishRecovery(result.value,rejoinedTicket,route,signal,generation);
        }
        if(result.kind!=="success")return result;
        return finishRecovery(result.value,ticket,route,signal,generation);
      } catch(error) {
        if(signal.aborted)throw signal.reason;
        const retry=["transient","availability"].includes(error?.kind)||error?.name==="TypeError"||error?.name==="TimeoutError"||/Local gateway unavailable \((?:408|429|5[0-9][0-9])\)/.test(error?.message||"");
        return {kind:retry?"retry":"blocked",error};
      }
    },
    onState:event=>{
      if(generation!==connectionGeneration)return;
      recoveryWaitingRemote=event.error?.code==="remote-unavailable"||event.error?.code==="native-unavailable";
      if(event.state==="recovered") {networkRecovering=false;recoveryWaitingRemote=false;startNetworkPolling();label("connection-detail","Same headset revalidated. Recovery sent no experiment command.");}
      if(event.state==="blocked") {networkRecovering=false;invalidateSnapshot();label("connection-detail",`Recovery blocked: ${connectionErrorText(event.error)}. Use Find or Connect to resolve the identity; no command was replayed.`);}
      if(event.state==="waiting")label("connection-detail",recoveryWaitingRemote?"Waiting for Remote on the headset. Its session is unchanged.":"Retrying the saved Wi-Fi address. If it moved, choose Disconnect, then Find headset. The headset session continues.");
      render();
    }
  });
  render();recoveryController.start();
}
async function finishRecovery(status,ticket,route,signal,generation) {
  signal.throwIfAborted();
  if(generation!==connectionGeneration||route!==networkTransport)return {kind:"blocked"};
  try {acceptSnapshot(status,ticket,route);}catch(error){return {kind:"retry",error};}
  if(!remoteControlAllowed(status))return {kind:"retry",error:{kind:"availability",code:"remote-unavailable"}};
  // Receipt reads are allowed while Gateway authority is still inactive.
  await observeOriginalReceipt(status,generation,signal);signal.throwIfAborted();
  if(pendingOriginal?.state==="observing")return {kind:"retry",error:{kind:"availability",code:"original-pending"}};
  if(!snapshots.fresh()||!route.acceptRecoveredStatus(status))return {kind:"retry",error:new Error("Snapshot expired before acceptance")};
  return {kind:"success",value:status};
}

async function refreshBreathing() {
  const route=networkTransport,generation=connectionGeneration,status=questStatus;
  if(breathView?.fresh && breathReceivedAt && Date.now()-breathReceivedAt>2500)
    breathView.unavailable("Breathing readback delayed; waiting for the Quest.");
  if(!breathView || !route?.active || !pageActive || questStatus?.breath_monitor!==1) return;
  if(breathReading || reading || commandBusy || networkRecovering || !freshStatus()) return;
  breathReading=true;breathAbort=new AbortController();const abort=breathAbort;
  try {
    const data=await gattOperation(()=>route.exchange("breath-monitor",breathView.model.query(),{signal:abort.signal}),generation);
    if(generation!==connectionGeneration || route!==networkTransport || !pageActive || abort.signal.aborted || status!==questStatus || !freshStatus())return;
    breathView.accept(data,route.nativeEpoch);
    breathReceivedAt=Date.now();
  } catch(error) {
    if(generation===connectionGeneration && !abort.signal.aborted && pageActive) {
      breathView.unavailable("Breathing readback unavailable; waiting for the Quest.");
      invalidateSnapshot();beginNetworkRecovery();render();
    }
  } finally {if(generation===connectionGeneration){breathReading=false;if(breathAbort===abort)breathAbort=undefined;}}
}

function scheduleReconnect() {
  if (!reconnectAllowed || !device?.gatt || !pageActive || preview || reconnectTimer || reconnectTries >= 5) return;
  const delays=[1000,2000,4000,8000,12000];
  const wait=delays[reconnectTries++];
  reconnectTimer=setTimeout(() => { reconnectTimer=undefined; if(reconnectAllowed && !connected() && !connecting) connect({reuseSelected:true}); }, wait);
  label("connection-detail", `Quest unreachable. Reconnecting to the previously selected headset in ${Math.ceil(wait/1000)} seconds (${reconnectTries}/5).`);
}
function disconnected(reason = "Quest GATT disconnected. Reconnecting to the selected Quest when available.") {
  pageObservationGeneration++;commandReceiptAbort?.abort(Error("Connection retired; original result remains unknown."));
  legacyGattLease?.retire();
  stopRecovery();statusAbort?.abort();breathAbort?.abort();receiptAbort?.abort();statusAbort=undefined;invalidateSnapshot();
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
  clearInterval(breathPollTimer);breathPollTimer=undefined;breathReading=false;breathReceivedAt=0;
  breathView?.reset();
  pollTimer = undefined;
  networkTransport?.close();
  networkTransport = undefined;
  bleOwnerIdentity = undefined;
  characteristics = undefined;
  questStatus = undefined; snapshots.reset();
  accessCode = "";
  byId("pair-code").value = "";
  label("connection-detail", reason);
  render();
  scheduleReconnect();
}

async function connect({reuseSelected = false} = {}) {
  if (selectedRoute === "local") return selectedHeadset && !failedHeadsets.has(selectedHeadset.device) ? connectLocal() : findHeadset();
  if (selectedRoute !== "ble") return connectNetwork();
  if (connected() || connecting || preview || !pageActive) return;
  // Only this page's previously user-selected handle may skip the chooser.
  if (reuseSelected && !device?.gatt) return;
  connecting = true;
  const attempt = ++connectionAttempt;
  const generation = ++connectionGeneration;
  const lifetime = connectionLifetime();
  let selectedLease;
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
    selectedLease=discoveryApi?.claimGatt(selectedDevice);
    legacyGattLease=selectedLease;
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
        disconnectLegacyGatt(selectedDevice,selectedLease);
      }
    }, () => {});
    const server = await lifetime.run(connection);
    if (generation !== connectionGeneration) {
      // A restored page may already own this same BluetoothDevice handle.
      if (selectedDevice !== device || !pageActive) disconnectLegacyGatt(selectedDevice,selectedLease);
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
      if (device?.gatt?.connected) disconnectLegacyGatt(device,selectedLease);
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
  const receiptAbort=new AbortController(),observationGeneration=pageObservationGeneration,commandRoute=networkTransport;
  const lifecycle=createReceiptObservation({signal:receiptAbort.signal},"Command");
  commandReceiptAbort=receiptAbort;
  if (selectedPolar && observer) polarObservation = observer;
  if ((durable || selectedSetup) && observer) durableObservation = observer;
  commandBusy = true;
  render();
  const id = randomHex(8);
  commandTiming = {id, name, click: performance.now(), writeStart: null, writeEnd: null, receipt: null, rendered: null};
  const generation = connectionGeneration;
  const checkObservation=()=>{
    receiptAbort.signal.throwIfAborted();
    if(observationGeneration!==pageObservationGeneration || generation!==connectionGeneration || !pageActive || commandRoute!==networkTransport)
      throw new Error("Command observation retired; original result remains unknown.");
  };
  showProgress(name, "none", "Preparing authenticated command…");
  if (op === "set-bias") label("bias-confirmation", "Waiting for saved bias confirmation…");
  render();
  try {
    const preparation = selectedSetup ? signedPolarSetup(id,op,selectedSetup) : selectedPolar ? signedPolarStop(id,op,selectedPolar) : selectedSession ? signedSessionCommand(id, op, selectedSession, bias)
      : signedCommand(id, op, condition, bias);
    const bytes = await lifecycle.wait(observer ? observer.wait(preparation) : preparation);
    checkObservation();
    if(!freshStatus())throw new Error("Command not sent. Headset status is stale.");
    assertControlMode();
    if (selectedSession) assertSelectedSessionControl(op, selectedSession);
    if (selectedSetup) assertSelectedPolarSetup(op, selectedSetup);
    const command = {writeValueWithResponse: transportWrite};
    const write = gattOperation(() => {
      checkObservation();
      observer?.check();
      if(!freshStatus())throw new Error("Command not sent. Headset status is stale.");
      assertControlMode();
      if(selectedSession)assertSelectedSessionControl(op,selectedSession);
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
    await lifecycle.wait(observer ? observer.wait(write) : write);
    checkObservation();
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
      const receiptRead = gattOperation(() => {checkObservation();return transportRead("receipt",receiptAbort.signal);}, generation);
      const rawReceipt=parseJson(await lifecycle.wait(observer ? observer.wait(receiptRead) : receiptRead));
      checkObservation();
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
      await lifecycle.wait(observer ? observer.wait(nextPoll) : nextPoll);
      checkObservation();
    }
    if (generation === connectionGeneration && !terminalReceipt && Date.now() >= deadline) showProgress(name, "unknown", "No confirmation arrived. Check the headset before retrying.");
  } catch (error) {
    if (generation === connectionGeneration) {
      if (["ControlModeError","PolarInputError"].includes(error.name) && commandTiming.writeStart === null) {
        showProgress(name, "none", error.message);
        if (op === "set-bias") label("bias-confirmation", error.message);
      } else {
        showProgress(name, "unknown", `Command result unavailable: ${error.message}. Check the headset before retrying.`);
        if (op === "set-bias") label("bias-confirmation", "Bias result unavailable. Check the current bias and original receipt before retrying.");
      }
    }
  } finally {
    if (pendingOriginal?.id === id && pendingOriginal.state === "live") pendingOriginal.state=networkTransport ? "observing" : "uncertain";
    if (commandTiming?.id === id) {
      const t=commandTiming, elapsed=(a,b)=>a===null||b===null?"—":`${Math.max(0,Math.round(b-a))} ms`;
      label("timing-detail", `${t.name} · request ${t.id} · click→write ${elapsed(t.click,t.writeStart)} · transport write ${elapsed(t.writeStart,t.writeEnd)} · write→receipt ${elapsed(t.writeEnd,t.receipt)} · receipt→render ${elapsed(t.receipt,t.rendered)}. Android admission, native action and durable acknowledgement require correlated owner timestamps; transport intervals alone do not identify them.`);
    }
    observer?.close();
    lifecycle.close();if(commandReceiptAbort===receiptAbort)commandReceiptAbort=undefined;
    if (polarObservation === observer) polarObservation = undefined;
    if (durableObservation === observer) durableObservation = undefined;
    if (generation !== connectionGeneration) return;
    commandBusy = false;
    if(networkTransport && (!networkTransport.active || networkTransport.retired))beginNetworkRecovery();
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
  stopRecovery();statusAbort?.abort();breathAbort?.abort();receiptAbort?.abort();
  cancelDiscovery();
  freshHeadsets.clear();
  selectedHeadset=headsetRoster?.records.find(record=>record.device===selectedHeadset?.device);
  pageActive = false;
  reconnectAllowed = false;
  clearTimeout(reconnectTimer); reconnectTimer = undefined;
  connectionAttempt++;
  connecting = false;
  const retired = device;
  const retiredLease=legacyGattLease;
  disconnected("Page retired the connection attempt.");
  device = undefined;
  if (retired?.gatt?.connected) disconnectLegacyGatt(retired,retiredLease);
}
if (typeof window.addEventListener === "function") {
  window.addEventListener("pagehide", retirePageConnection);
  window.addEventListener("pageshow", event => {
    if (event.persisted) retirePageConnection();
    pageActive = !document.hidden;
    render();
    if(pageActive && reconnectIntent)beginNetworkRecovery();
  });
  window.addEventListener("online",()=>{if(pageActive&&!document.hidden&&networkRecovering&&!automaticRecoveryBlock)recoveryController?.resume();});
  window.addEventListener("offline",()=>{if(pageActive&&networkRecovering&&!recoveryController?.blocked)label("connection-detail","Internet connectivity changed. Local headset recovery still uses the known Wi-Fi route.");});
}
function suspendPage() {
  pageObservationGeneration++;commandReceiptAbort?.abort(Error("Page hidden; original result remains unknown."));
  pageActive=false;cancelDiscovery();statusAbort?.abort();breathAbort?.abort();receiptAbort?.abort();snapshots.invalidate();
  pendingConnection?.cancel();
  recoveryController?.suspend();
  if(networkTransport){networkTransport.active=false;networkTransport.statusTimedOut=true;networkRecovering=!recoveryController?.blocked;}
  polarObservation?.cancel("Page hidden; original result retained without replay.");durableObservation?.cancel("Page hidden; original result retained without replay.");
  breathView?.unavailable("Page hidden; state must be revalidated.");render();
}
function resumePage() {
  if(document.hidden){suspendPage();return;}
  pageActive=true;
  if(networkTransport||reconnectIntent) {if(recoveryController)recoveryController.resume();else {networkRecovering=false;beginNetworkRecovery();}}
  render();
}
if(typeof document.addEventListener==="function") {
  document.addEventListener("visibilitychange",()=>document.hidden?suspendPage():resumePage());
  document.addEventListener("freeze",suspendPage);document.addEventListener("resume",resumePage);
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
  automaticRecoveryBlock=undefined;
  reconnectIntent=undefined;try{localStorage.removeItem(INTENT_KEY);}catch(_){}
  stopRecovery();
  cancelDiscovery();
  reconnectAllowed = false;
  clearTimeout(reconnectTimer); reconnectTimer = undefined;
  try { localStorage.removeItem("viscereality-authorised-quest"); } catch (_) { }
  connectionAttempt++;
  const retired = device;
  const retiredLease=legacyGattLease;
  disconnected("Connection cancelled by the user.");
  device = undefined;
  disconnectLegacyGatt(retired,retiredLease);
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
  examples["polar-waiting"]={p:"PAUSED",rec:true,h:"vr-session",pi:{r:true,f:false,h:true}};
  examples["polar-recovered"]={p:"PAUSED",rec:true,h:"vr-session",pi:{r:true,f:true,h:true}};
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
  if (selectedRoute !== "ble" || preview || !pageActive || typeof navigator === "undefined" || !navigator.bluetooth?.getDevices) return;
  let id;
  try { id=localStorage.getItem("viscereality-authorised-quest"); } catch (_) { return; }
  if (!id) return;
  try {
    const permitted=await navigator.bluetooth.getDevices();
    if (selectedRoute !== "ble" || !pageActive || device || connecting) return;
    const previous=permitted.find(candidate=>candidate.id===id);
    if (!previous) { label("connection-detail", "Previous Quest permission is unavailable. Choose the headset again."); return; }
    device=previous;
    reconnectAllowed=true;
    if(previous.gatt) await connect({reuseSelected:true});
  } catch (_) { label("connection-detail", "Previous Quest could not be recovered. Choose the headset again."); }
}
resumeAuthorisedQuest();

function routeChanged() {
  cancelDiscovery();
  if (networkTransport || recoveryController || reconnectIntent || connected() || connecting || networkRecovering) cancelConnection();
  selectedRoute=byId("connection-route").value;
  byId("network-enrollment").hidden=["ble","local"].includes(selectedRoute);
  byId("relay-token-row").hidden=selectedRoute!=="relay";
  byId("trusted-lan-row").hidden=selectedRoute==="relay";
  const notes={local:"Find the headset, then connect on the same Wi-Fi. No enrollment key is needed in Remote mode.",ble: "Choose the nearby Quest. Bluetooth permission is requested by your browser.",
    lan:"Use the same Wi-Fi network as the Quest, including a phone hotspot. Enter the gateway address and controller enrollment shown by the headset. Secure HTTPS is preferred. Experimental HTTP on a trusted private network needs explicit consent and browser local-network permission support.",
    relay:"A private relay must be deployed and provisioned first. Enter its session exchange URL and private route token. No relay is configured by this website.",
    direct:"Join the headset's network using your device's Wi-Fi settings. This browser cannot join Wi-Fi for you. Keep this cached page open, then enter the gateway address. Nearby Bluetooth also works without Internet."};
  byId("route-note").textContent=notes[selectedRoute];
  byId("local-discovery").hidden=selectedRoute!=="local";
  render();
}
async function connectNetwork() {
  if (connected() || connecting || networkRecovering || preview || !pageActive) return;
  stopRecovery();networkTransport?.close();networkTransport=undefined;invalidateSnapshot();
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
    startNetworkPolling();
    if(breathView) {breathView.reset();await refreshBreathing();}
    label("connection-detail","Enrolled headset authenticated. Current native status received.");
  } catch(error) {
    candidate?.close();
    if(generation===connectionGeneration) disconnected(`Connection unavailable: ${connectionErrorText(error)}. No command was replayed.`);
  } finally {
    if(generation===connectionGeneration) {connecting=false; pendingConnection=undefined;render();}
  }
}
byId("connection-route").addEventListener("change",routeChanged);
byId("connection-route").value=selectedRoute;
routeChanged();
if (typeof navigator!=="undefined") {
  const bleOption=byId("route-ble");
  if (!navigator.bluetooth || !globalThis.isSecureContext) {
    bleOption.disabled=true; bleOption.textContent="Nearby Bluetooth  -  unavailable in this browser";
  }
}

function cancelDiscovery() {
  discoveryGeneration++;findingHeadset=false;headsetDiscovery?.cancel();
}
function renderHeadsets() {
  if(!headsetRoster)return;
  const container=byId("headset-roster");container.replaceChildren();
  for(const remembered of headsetRoster.records) {
    const fresh=freshHeadsets.get(remembered.device);
    const row=document.createElement("div"),serial=document.createElement("strong"),note=document.createElement("p"),button=document.createElement("button");
    row.className="headset-row";serial.textContent=remembered.serial || "Serial unavailable";
    note.textContent=failedHeadsets.has(remembered.device) ? "Wi-Fi address changed or unavailable. Use Find to refresh the headset identity and address." : fresh ? fresh.gateways.length ? "Discovered by Bluetooth. Connect to verify live Wi-Fi identity." : "Serial read. No usable Wi-Fi route; check the headset network, then Find again."
      : remembered.gateway ? "Remembered headset. Connect to verify its saved Wi-Fi address; use Find if it moved." : "Remembered identity. Use Find to read its current Wi-Fi address.";
    button.type="button";button.className="button button-small";button.textContent="Connect";
    button.disabled=connecting || findingHeadset || connected() || !pageActive || preview || failedHeadsets.has(remembered.device) || !(fresh ? fresh.gateways.length : remembered.gateway);
    button.addEventListener("click",()=>{selectedHeadset=fresh || remembered;return connectLocal();});
    row.append(serial,note,button);container.append(row);
  }
  byId("find-headset").disabled=connecting || findingHeadset || connected() || !pageActive || preview || !headsetDiscovery || !globalThis.navigator?.bluetooth?.requestDevice || !globalThis.isSecureContext;
  byId("connect-local-address").disabled=connecting || findingHeadset || connected() || !pageActive || preview;
}
async function findHeadset() {
  if(connected() || connecting || findingHeadset || preview || !pageActive)return;
  if(!headsetDiscovery){label("discovery-note","Bluetooth discovery unavailable. Enter the Wi-Fi address manually.");return;}
  const generation=++discoveryGeneration;
  findingHeadset=true;
  // find() invokes the chooser before the first await on this gesture stack.
  const pending=headsetDiscovery.find();
  label("discovery-note","Choose the headset in Chrome. Reading its app-provided serial and Wi-Fi address...");render();
  try {
    const found=await pending;
    if(generation!==discoveryGeneration || !pageActive)return;
    headsetRoster.remember(found);freshHeadsets.set(found.device,found);failedHeadsets.delete(found.device);selectedHeadset=found;
    automaticRecoveryBlock=undefined;
    for(const id of freshHeadsets.keys())if(!headsetRoster.records.some(r=>r.device===id))freshHeadsets.delete(id);
    label("discovery-note",found.gateways.length ? "Serial read; discovery Bluetooth released. Connect to verify the headset over Wi-Fi." : "Serial read; no usable Wi-Fi route. Check the headset network, then Find again.");
  } catch(error) {if(generation===discoveryGeneration)label("discovery-note",`Discovery unavailable: ${connectionErrorText(error)}. Find again or enter the Wi-Fi address.`);}
  finally {if(generation===discoveryGeneration){findingHeadset=false;render();}}
}
async function connectLocal({manual=false}={}) {
  if(connected() || connecting || findingHeadset || networkRecovering || preview || !pageActive)return;
  const expected=manual?undefined:selectedHeadset;
  const urls=manual?[byId("local-gateway-url").value.trim()]:expected?.gateways || (expected?.gateway?[expected.gateway]:[]);
  if(!urls.length){label("connection-detail","No current Wi-Fi route. Find the headset again or enter its address.");return;}
  automaticRecoveryBlock=undefined;if(expected)failedHeadsets.delete(expected.device);
  stopRecovery();networkTransport?.close();networkTransport=undefined;invalidateSnapshot();
  connecting=true;reconnectAllowed=false;
  // An explicit selection replaces the automatic target before any I/O. A
  // failed proof for B must never fall back to an earlier headset A.
  reconnectIntent=expected?{device:expected.device,serial:expected.serial,gateway:urls[0]}:undefined;
  try {localStorage.removeItem(INTENT_KEY);}catch(_){}
  if(manual)selectedHeadset=undefined;
  const generation=++connectionGeneration,abort=new AbortController();
  let candidate;
  pendingConnection={cancel:()=>{abort.abort();candidate?.close();}};
  label("connection-detail","Verifying the live Remote headset identity over Wi-Fi...");render();
  try {
    let joined,lastError;
    for(const url of urls) {
      try {joined=await joinVerifiedHeadset({...expected,gateway:url},abort.signal,true);break;}
      catch(error){lastError=error;if(abort.signal.aborted || generation!==connectionGeneration)throw error;}
    }
    if(!joined)throw lastError;
    candidate=joined.gateway;
    if(generation!==connectionGeneration || !pageActive || abort.signal.aborted){candidate.close();return;}
    networkTransport=candidate;gattOperations=operationQueue();
    const initial=await refreshStatus();
    if(!initial.ok) {
      // The established guest is now owned by read recovery. Its next status
      // may already be in flight; establishment cleanup must not close it.
      if(networkTransport===candidate && !candidate.retired && recoveryController && !recoveryController.blocked)return;
      throw initial.error;
    }
    if(generation!==connectionGeneration || !pageActive){candidate.close();return;}
    const remembered=headsetRoster?.verified({...joined.identity,bluetoothId:expected?.bluetoothId},joined.url);
    if(remembered)selectedHeadset=remembered;
    rememberReconnect(joined.identity,joined.url);
    if(expected)freshHeadsets.delete(expected.device);
    startNetworkPolling();
    if(breathView){breathView.reset();await refreshBreathing();}
    label("connection-detail",`${joined.identity.serial || "Serial unavailable"} - Wi-Fi connected. Current native status received.`);
  } catch(error) {
    candidate?.close();
    if(abort.signal.aborted)return;
    if(generation===connectionGeneration){
      if(error?.kind==="integrity" || error?.kind===undefined && !["TypeError","TimeoutError"].includes(error?.name) && !/Local gateway unavailable \((?:408|429|5[0-9][0-9])\)/.test(error?.message||"")) {
        automaticRecoveryBlock=error;
        try {localStorage.removeItem(INTENT_KEY);}catch(_){}
        if(expected){freshHeadsets.delete(expected.device);failedHeadsets.add(expected.device);}
        disconnected(`Connection unavailable: ${connectionErrorText(error)}. Find the headset again. No command was replayed.`);
      } else {
        networkTransport=undefined;connecting=false;pendingConnection=undefined;
        if(!reconnectIntent && expected)reconnectIntent={device:expected.device,serial:expected.serial,gateway:urls[0]};
        beginNetworkRecovery();
      }
    }
  } finally {if(generation===connectionGeneration){connecting=false;pendingConnection=undefined;render();}}
}
byId("find-headset").addEventListener("click",findHeadset);
byId("connect-local-address").addEventListener("click",()=>connectLocal({manual:true}));
if(!globalThis.navigator?.bluetooth?.requestDevice || !globalThis.isSecureContext)label("discovery-note","Bluetooth discovery unavailable in this browser. Enter the headset Wi-Fi address manually.");

// UI-only freshness watchdog: never dispatches transport or experiment work.
if(typeof setInterval==="function")setInterval(()=>{if(pageActive&&questStatus){if(!freshStatus())breathView?.unavailable("Headset state is stale; waiting for a fresh snapshot.");render();}},250);
reconnectIntent=loadReconnectIntent();
if(reconnectIntent&&!preview&&pageActive)beginNetworkRecovery();
