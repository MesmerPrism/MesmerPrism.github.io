# Experiment browser connection lifetime

## Find a Remote headset and join local Wi-Fi

The normal route is **Find headset**, then **Connect** beside its serial.
Chrome opens its service-filtered Bluetooth chooser directly from that click.
Discovery reads the app-owned serial characteristic independently of the
advertised name, validates its metadata, and releases GATT. Commands and
telemetry then use Wi-Fi through the existing authenticated `Gateway`.
The headset must be in Remote mode and on the same Wi-Fi or phone hotspot.
The browser cannot turn on a hotspot or join a network for you.

Discovery uses service `9a7b2001-7d6a-4b7f-9d4a-6f7c0a020101`, serial
characteristic `9a7b2001-7d6a-4b7f-9d4a-6f7c0a020102`, and metadata
characteristic `9a7b2001-7d6a-4b7f-9d4a-6f7c0a020103`. Serial is at most
64 UTF-8 bytes; metadata is at most 512 bytes and four private IPv4 HTTP
`/v1/gateway` endpoints. Empty serial is shown as unavailable, and an empty
endpoint list cannot supply a Connect route. No generated app ID is shown as
a serial. Invalid UTF-8, changed serial, unsafe addresses, oversized records,
and stale attempts fail closed.

Before joining, GET identity must prove the expected device and serial plus
live gateway/native epochs, `enabled`, and `remote_available`. Newly read
Bluetooth metadata must match both exact epochs too. The only unauthenticated
POST is `{v:1,action:"connect",device,epoch}` to that same local endpoint.
Its ephemeral controller credentials enter the ordinary RQG1 HMAC transport;
controls stay unavailable until authenticated current native status is read.
Joining does not start or replay an experiment action. Identity changes,
retired pages, failed candidates, and aborted joins cannot replace a newer
connection. Discovery BLE has its own handle and lifetime, separate from
legacy BLE control and Wi-Fi.

At most eight nonsecret identities are remembered, with a Bluetooth ID and
the last successfully verified local gateway. A remembered row makes no
nearby-availability claim: its saved endpoint is only a hint and must prove
device/serial again before binding fresh epochs. A changed or unreachable
address requires **Find headset** to refresh it. This path does not require
the experimental `Bluetooth.getDevices()` API or browser flags. Startup does
not open a chooser. Controller keys never enter storage or the static cache.

**Enter Wi-Fi address manually** provides the same key-free join when
Bluetooth is unavailable. Use the exact private IPv4 HTTP gateway URL. Local
plaintext has no confidentiality; browser local-network permission and the
trusted network remain required. **Advanced connections** retains enrolled
Wi-Fi, legacy Bluetooth, and provisioned relay routes. Original-receipt
reconciliation and uncertain-command handling retain their existing behavior.

Shell PWA6 caches discovery, connection recovery and whole-snapshot validation with the existing app, worker,
manifest and icons. Installation and cold offline shell checks do not prove
physical Bluetooth, phone hotspot routing, or deployed-origin LAN permission.

## One page, multiple connections

The guided App32 surface starts from source commit
`98773be8ec2462a373770898855c5bddbb97d68f`. Its shared BLE lifetime module and
source-lock metadata remain byte-exact. `transport.js` provides the same
status/command/original-receipt boundary for nearby BLE and an enrolled gateway
over same-network, direct-network or private relay routes. The guide still owns
the same Polar, session, Finish and panel controls. A network socket or HTTP
response alone never admits controls.

Advanced network enrollment requires the headset-approved controller ID and key plus
the headset device ID. These credentials remain in memory and input fields
are cleared on connection attempts. Reconnect requires reentry; no network
command is retried. Switching routes does not grant experiment authority.
Original command ID and owner identity
are stored before transport admission, including when the response is lost.
Stable BLE challenge `d` and `ge` fields, when present, bind original receipts
to the same device and gateway lifetime across routes. Older BLE owners retain
their browser device identity; cross-route reconciliation then stays unknown.

The network wire protocol is `RQG1`: POST an exact string payload with
`v:1, controller, epoch, nonce, action, payload, mac` to `/v1/gateway`.
Request HMAC-SHA256 uses ASCII bytes of the approved 64-hex key over
`RQG1|controller|epoch|nonce|action|payload`. The authenticated response contains
`v:1, device, epoch, nonce, action, payload, mac`, with HMAC over
`RQG1-REPLY|controller|device|epoch|nonce|action|payload`. Epoch is a fresh
gateway-lifetime decimal string; native status `o.e` is separately bound on
the first authenticated current read. The unauthenticated GET identity is
only a hint checked against enrollment. Changed identity, lifetime, native
epoch or response proof retires authority. Commands carry existing native
v1-v4 objects without the BLE MAC inside the authenticated envelope. Receipt
requests carry `{id}` and retain original owner result semantics.

A provisioned relay uses `/v1/relay/<session>/exchange` and its sibling
`identity` route, with a private Bearer route token in headers. No relay URL,
session, key or public backend is shipped. This slice supports local encrypted
rehearsal and requires separate hosting/provisioning for Internet operation.

Public HTTPS to private HTTP fetch is browser-dependent. Explicit trusted-LAN
consent admits private IPv4 URLs for browsers that support local-network
permission and mixed-content exemptions. Failure remains unavailable, with
Bluetooth as the fallback. HTTP authenticates requests but provides no
confidentiality. No flags, certificate-warning bypass or browser Wi-Fi APIs
are used. The Direct / offline connection route tells the operator to join the
network in OS settings.

The versioned service worker stores only an exact static shell allowlist.
Credential-bearing, query-bearing, foreign-origin, status and command requests
are never cached. Load once online and wait for offline-ready confirmation;
then use this same page offline. Bump the matching `CACHE` values in `sw.js`
and `pwa.js` after every shell edit.
An active page keeps its existing worker until the browser can activate the
new version, avoiding mixed asset versions during an experiment.

## Install on dedicated Android phones

1. With Internet access, open
   `https://mesmerprism.com/viscereality-control/` in Chrome.
2. Tap **Install Viscereality** when offered, or use Chrome's menu →
   **Install app** / **Add to Home screen**. The app is named
   **Viscereality Experimenter** and opens in its own window.
3. Open the installed app and wait for **Ready for offline use**. This checks
   the complete current shell, manifest and icons in the app's cache; successful
   service-worker registration alone is insufficient. If an update is waiting,
   close all Viscereality tabs/windows and reopen while online.
4. Enable the phone hotspot and connect the Quest to it. Open Viscereality on
   the Quest, select Remote, then tap **Find headset** in the phone app and
   choose it in Chrome. Check the returned serial, then **Connect**. Allow
   Chrome's local-network permission when requested. Manual Wi-Fi address and
   advanced enrollment remain available when needed.
5. Internet/mobile data can now be unavailable; keep the hotspot enabled. The
   installed interface loads from its cache and commands still use the live
   local connection to the Quest. Airplane mode or disabling all networking
   also removes that local connection.

The PWA does not turn on the hotspot, join networks or discover a changed
headset address automatically. Local-join credentials remain in memory and are
requested again on a verified reconnect. Advanced enrollment keys must be
entered again after closing or disconnecting the app. Clearing Chrome/app site data
removes offline files and requires another online setup. Installation and
offline availability do not grant experiment authority; normal headset Remote
mode, authentication and fresh owner status are still required.

The app-specific manifest uses a stable `/viscereality-control/` identity,
scope and launch URL, standalone display, and regular/maskable Viscereality
icons. It is independent of the parent Mesmer Prism site's installation.
Updates activate through the normal worker lifecycle, with no forced reload,
skip-waiting or experiment-command retry. Offline readiness is confirmed by a
closed worker message checking every static file in the matching cache version.

Host browser QA can verify Chromium installability, cold offline reopening and
authenticated controls against a synthetic local gateway with public requests
blocked. That is separate from installation, hotspot routing and browser
permission acceptance on the actual dedicated phone.

Validation: `node --test viscereality-control/*.test.cjs shared/quest-ble/*.test.cjs`.
Host tests do not establish deployed public-origin LAN permission, installed
APK behavior, physical PMD acquisition, or Internet relay availability.

## Live breathing monitor

The session guide shows the desired phase and phase progress beside the actual
unbiased sensor phase and normalized level. Its plot follows the headset's
official active clock: 60 seconds of actual/desired history and 10 seconds of
target preview. Pausing or holding the session clock stops the history. The
desired curve is a schematic envelope of the packaged phase schedule; neither
trace is a physical lung-volume measurement. Missing, rejected, stale, source
switch and calibration-reset intervals break the actual trace.

An updated LAN owner advertises `breath_monitor:1` in authenticated status.
The read-only `breath-monitor` action takes exactly `{run,after}` with an empty
run and zero cursor initially. Responses bind the native epoch and session run,
carry at most 601 samples at 10 Hz and 256 target segments, and use bounded delta
cursors. A new run resets history. Over-dense target windows are explicitly
unavailable. The browser reads at most twice per second through its existing
serialized transport queue, yields to commands/status, and marks delayed current
readback unavailable. Reading works in either headset control mode and grants
no command authority. The BLE status projection remains unchanged.

Only the static monitor module enters the PWA cache. Observations stay in
memory, are cleared on disconnect and are never stored by the service worker.

LAN owners may include optional `control_mode: "choose"|"direct"|"remote"` in
current status. The page shows that headset-owned choice and admits mutations
only in Remote; a malformed present value also blocks commands. Direct/Choose
instruct the operator to select Remote on the headset experiment panel. There
is no browser mode-switch command. Owners omitting the field retain existing
behavior. Mode is checked again after command signing and at the serialized
write; status and original-receipt reconciliation remain available in every
mode, and an issued command retains its original result without replay.

## Guided Quest operation

The main browser view follows fresh Quest status through VR preparation, remote
Polar setup, condition arming, session control, and Finish & prepare next. The
selected condition and Polar candidate are operator choices; stage advancement
comes from the next native status read and exact app receipt. A pending command
appears immediately and disables incompatible actions. The persistent headset
presentation calls out an open panel and offers Return to VR in idle preparation
as well as during a session. Android input focus and BLE disconnection are not
used as evidence of XR focus or sleep.

Maintenance controls contain Save and exit, explicit headset panel setup,
controller gestures, sensor stops and breath bias. Diagnostics contain source
age, raw sensor IDs, counters and command timing. Neither foldout is needed for
the normal participant flow. `?preview=1&state=idle|missing|scan|select|connecting|no-permission|nogrant|armed|running|paused|polar-waiting|polar-recovered|complete|panel`
offers inert render states for browser layout checks; commands remain disabled.

The new Polar setup grant is the Quest-owned closed `y` status projection with
setup reference, native epoch, action revision, permission/radio/connection,
scan/candidate selection and fresh ACC/ECG data flags. The browser sends only
the owner-advertised v4 `scan`, `select`, `connect`, `start-acc`, `start-ecg`
commands, signing the `RQPS1` domain in gated mode and checking the reference,
epoch and revision again before the serialized GATT write. One exact native
receipt confirms each operation; no command is retried automatically. Missing
grants and failed readiness are shown as explicit blockers.
Fresh motion data is part of the normal preparation path. ECG start remains an
explicit optional maintenance action; the browser does not infer heart-rate
freshness from the separate connection-evidence `pf` flag.

During idle preparation the main guide offers **Scan for Polar**, the current
app-owned candidate list, **Connect Polar**, and **Start motion data** in order.
The live sensor line reports the Quest's selected sensor, connection and motion
readback. These commands ask the Quest to operate its sensor; the phone does not
connect directly to Polar. During a recording the original sensor's automatic
Quest recovery remains responsible for reconnection; browser scanning and sensor
replacement remain idle setup actions.

An updated owner may include optional `pi:{r:boolean,f:boolean,h:boolean}`:
Polar is required by the selected/current recording (`r`), actual acquisition
is fresh (`f`), and an input-loss pause remains latched (`h`). Required input
without fresh acquisition disables Start/Resume and shows waiting for Polar.
Recovered data with a latched Paused session shows **Polar recovered · paused**
and requires an explicit **Resume session**. Recovery never emits a command or
advances the session clock. Finish and Save remain available through the usual
session/receipt checks. The native owner independently gates Start/Resume;
browser graph history and a connected Bluetooth link do not grant readiness.
The page checks current native readback again after authentication and inside
the serialized command write. Missing `pi` retains older-owner behavior (including
size-bounded BLE projections that omit it); malformed present `pi` blocks
Start/Resume until a usable readback returns, while Pause/Finish/Save retain
their normal rules.

After a selected Quest has yielded usable status, the browser may reconnect to
that same handle with bounded backoff. On reload it uses Web Bluetooth's
previously permitted device inventory only when an exact stored device ID
matches. It reacquires service and characteristics, reads current status and
requires the access code again in gated mode. Disconnect retires the command
outcome as unknown until the original request ID can be read back on the same
Quest and native owner. The browser stores only that ID, device ID and epoch,
then reads the owner-retained receipt after fresh status on reconnect. If the
owner or receipt differs, the outcome stays unknown and recording actions are
locked until the operator checks and acknowledges current state. Reconnection
never replays a command. Manual Disconnect forgets
the remembered device. The local ID contains no pairing code or session key.

Diagnostics record browser click, write start/end, receipt read and render
intervals for the same request ID. Android admission, native action and durable
acknowledgement require correlated owner timestamps; the browser intervals
alone cannot localize those stages. Host tests qualify source behavior, not a
physical Quest/Polar connection or timing on device.

A manual connection attempt waits for the browser device chooser without a network deadline. Cancel connection retires the page attempt; browser-owned chooser UI may need to be dismissed separately. After selection, GATT connection, service/characteristic discovery and initial status read share a 15-second setup deadline. This is a recoverable browser waiting policy, not a native readiness or operation-acceptance timeout.

The page displays its current setup stage. Timeout, cancellation, pagehide or disconnection clears readiness. A previously selected and successfully read Quest may be retried with bounded backoff; an initial chooser is never retried automatically and commands are never replayed. Web Bluetooth cannot abort its underlying promises: late completions are fenced by connection generation, and late GATT transport completion is disconnected unless a newer attempt already owns the same device handle. Such reuse never admits old status or command results.

The application owns this setup helper; the immutable shared Quest BLE producer remains byte-identical. Existing command Unknown outcomes and native observation high-water marks retain their established rules. Node promise controls test never-resolving setup stages, chooser cancellation, late completion and the existing command/status behavior. They do not prove physical pairing, browser connection recovery or headset effects.

Run `node --test viscereality-control/gatt-lifetime.test.cjs shared/quest-ble/gatt-lifetime.test.cjs shared/quest-ble/source.test.cjs` from the repository root.

Session Start/Pause/Resume require the app's optional `q` capability:
`{v:2,s:<32 lowercase hex session reference>,g:<native generation>,o:[...operations]}`.
The page requires that generation to match fresh status and enables only the
applicable control for the actual phase, with an active recording and no pending
operation. Older apps retain gestures; the page never sends new controls to them.
Capability changes during authentication abort the write rather than selecting a
new session implicitly.

The closed v2 command is `{v:2,id,op,s,g,n,mac?}`. In gated mode its canonical
HMAC input is `RQEC2|challenge|id|op|s|g|nonce`, using the existing truncated
signature and240-byte maximum. The app resolves and atomically validates the
reference against its full native session/actor tuple. Existing v1 commands and
v1 request-matched completion receipts remain compatible. A BLE write or queued
admission never confirms the native effect; no control is automatically replayed.
Host controls qualify the consumer, not an installed app or physical session.

Optional Polar Stop ACC/ECG use a separate owner-issued `z` capability. Its
closed shape is `{r,a,e,s?}`: `r` is the Polar action revision; `a` and `e` are
ACC/ECG bitsets (1 requested, 2 active PMD acknowledgement, 4 recent data
observed). If `s` is absent, the existing `q.s` is a shared offering identifier;
the explicit `z` declaration remains mandatory. A session `q` alone never
authorizes a sensor action. The app retains independently admitted native
session and Polar owner/sensor/stream tuples behind that identifier.

The closed Polar command is `{v:3,id,op,s,r,n,mac?}` with only `stop-acc` and
`stop-ecg`. Gated signing uses `RQPC1|challenge|id|op|s|r|nonce`; it cannot reuse
the session RQEC2 proof. Selection is checked again after signing and inside
the serialized write callback. Each explicit action writes once; an unknown
result is preserved without replay. A `dispatched` receipt means the Polar
owner requested a stop. It never means STOP ACK, physical sensor retirement,
data cessation or recording completion. Current per-stream bits appear
separately and do not establish a physical stop certificate.

The maximum signed command measures171 bytes. A complete representative
armed/audio-ready/Polar-connected status with both session and Polar grants
measures452 bytes. Existing limits remain240 command/480 status bytes. When
the mandatory status and optional grants cannot fit, an unavailable grant is
not offered; extreme status sizes still follow the existing unavailable
contract. This tranche does not claim controls are available in every state.
Frozen older APKs advertise no `z`, so these buttons remain disabled. Source
tests and modeled desktop/mobile previews do not qualify an installed APK,
real Web Bluetooth connection, physical PMD stop or acquisition parity.

Polar receipt observation waits by default until the exact request receipt,
connection retirement, or **Stop observing**. This button ends only browser
observation: it neither cancels nor retries the issued stop. An outstanding
GATT read retains its serialized queue lifetime; late feedback cannot replace
the preserved unknown result. A caller may explicitly supply `observeForMs`
(a positive safe integer) or an `AbortSignal` to `sendPolarStop`; pre-cancellation
issues no command. A selected finite window is an observer policy, not a Polar
owner deadline or proof of failure. Session commands retain their separate
existing owner receipt contract. No automatic retry is performed.

The app uses the authenticated one-attempt API and the single cancellable
`RecoveryController` documented in [Authenticated read recovery](CONNECTION_RECOVERY.md).
Ordinary status, breathing-history and original-receipt outages disable commands
and retain the same in-memory guest while valid. Recovery sends only identity,
status and retained original-receipt reads. It never sends Start, Pause, Resume,
Save, sensor actions or a mode change. The headset continues independently;
Polar input loss and explicit manual Resume keep their native policy.

Full `wifi_snapshot:1` status is admitted as one observation: mandatory state,
clock, generation/revision, exact `o` and `pi`, native owner, and a 16 KiB payload
bound. Its native age plus the complete monotonic browser read (queue, body and
verification included) must be at most 5000 ms. The UI-only 250 ms freshness tick
also expires controls while a request is still pending. Older/reordered or
conflicting observations and rich-to-legacy downgrades cannot revive the UI.
A newer valid revision may correct the native active clock backwards. A stale
view keeps the explicitly last-confirmed state and clock; network loss never
presents an invented native Pause or Idle. Older no-marker BLE, manual enrollment
and relay owners retain their conservative compatibility route.

Hidden/frozen pages abort reads, suspend retries and invalidate current authority.
Foreground return revalidates the same in-memory guest. Pagehide retires memory
credentials; refresh/reopen can rejoin only the explicitly selected local device
and serial at its saved exact route. Storage contains a bounded non-secret
`viscereality-last-connected` selector (device, serial, gateway), never controller
keys or epochs. Explicit Disconnect removes that intent. Internet online/offline
events are hints: local recovery has no internet-connectivity gate. There is no
automatic Bluetooth chooser or subnet scan. If DHCP moved the address, use
Disconnect, then Find headset to refresh it with a user gesture.

Expired guests and changed native/gateway lifetimes require a fresh exact physical
identity/serial proof before joining; changed lifetimes reset old state/history.
The existing eight-guests/120-second owner limit and no-eviction rule remain
unchanged. Capacity or lost join replies back off through the same scheduler;
repeated Refresh clicks do not reset it. Wrong physical identity or HMAC blocks.
Original command IDs/owner metadata are persisted before dispatch and never
replayed. Recovery observes the original receipt, then fresh status. A new owner
or unavailable original receipt remains uncertain and requires explicit checking
and acknowledgement; Disconnect preserves that original uncertainty.

PWA6 atomically caches all 16 shell entries, including `connection-recovery.js`
and `snapshot-state.js`, while dynamic authenticated traffic stays uncached. It
retains installation support and the existing scroll/pull-to-refresh containment.
Run `node --test viscereality-control/*.test.cjs` for the browser source suite.
Host and synthetic desktop/mobile/offline checks do not prove physical headset,
phone permissions, installed-PWA background behavior or real network recovery.

Initial identity/authentication failures block automatic recovery across hidden,
resume and pageshow events. A successful Find or a new explicit Connect resolves
that block; a corrected network route alone does not. Refused initial connections
remove automatic reconnect intent so a page reopen cannot silently clear the
block. A frozen page resuming while still hidden remains suspended.

The native owner emits HTTP429 only for its typed eight-guest capacity limit;
other HTTP403 rejections retain their integrity meaning. Optional cross-owner
capacity tests consume `EXPERIMENT_CAPACITY_HTTP_EVIDENCE`, the JSON emitted by
the native owner's inert registry/HTTP test with `--capacity-evidence`. Run the
browser suite with that variable set to cover the actual generated capacity and
non-capacity wire responses, idle expiry, original retention and no replay.

## Polar acquisition observations

New Wi-Fi owners add `pd:{v:1,native,java}` alongside the unchanged compact
`pi:{r,f,h}` readiness fields. The session guide shows current readiness separately
from the original acquisition pause. A recovered sensor never resumes a session;
the experimenter still chooses Resume. An observed disconnected Polar link is
shown explicitly, while missing accepted ACC alone leaves the radio or processing
cause unknown. Older owners may omit diagnostics and retain their existing controls.

The Diagnostics foldout shows separate callback, decode, JNI submission, native
ingress and accepted counters plus their own measured ages. These are observations,
not equivalent counts. Unknown or cached ages remain unavailable. Native ages use
Rust Instant and Java ages use nanoTime; neither is subtracted from the other's
clock. Displayed ages include the original snapshot observation/delivery age.
`polar-diagnostics.js` exposes read-only `ViscerealityPolarDiagnostics.describe(status,
observationAgeMs)` returning `{current,pause,detail}` and cannot grant controls.

## Saved recordings

A supported APK advertises `recordings:1` in authenticated full Wi-Fi status.
The Saved recordings foldout is hidden for older APKs. Refresh and Download
require fresh idle Remote state, no recording/pending/unknown command, and the
local Wi-Fi route (discovered, enrolled LAN or direct network). Advanced relay and BLE do not expose export controls.

Refresh validates a newest-first page of at most 16 entries; unavailable or
unfinalized entries remain visibly unavailable. Download prepares an immutable
manifest and reads one 32 KiB chunk request at a time, yielding to a complete
status observation after each response. Owner/mode/generation changes, hidden
page, stale state, disconnection, recovery, cancellation, short data or changed
hash discard the attempt. Exports are never replayed automatically.

`recordings.js` verifies the eight original core files against exact sizes and
SHA-256, then offers one ZIP STORE archive with export-manifest.json. Device,
serial, recording key, condition, disposition and core8 policy remain explicit.
Checkpoints and the device index remain on Quest. The original payload limit is
128 MiB, plus at most 32 KiB for the export manifest; ZIP32 bounds are enforced.
File arrays and Blob storage are bounded by that payload limit, with browser
object/WebCrypto overhead. Only one transfer/offer is retained. Dismiss releases
the offer and its object URL. The browser offer does not confirm phone storage.

The app exposes `recordingExportState()` returning `{busy,preparedOffer}` for the
safe-update gate. Either true defers applying a PWA update. Cancellation leaves
busy true until the in-flight operation settles; no experiment command is sent.
The shell allowlist includes recordings.js; the coordinated PWA7 task owns the
cache-version change. Host tests use synthetic bytes and independently extract
the ZIP with Python zipfile. Physical Quest/phone LAN and storage remain separate.
