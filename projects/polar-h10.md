# Polar H10 Work

Source: https://mesmerprism.com/projects/polar-h10.html
Canonical HTML: https://mesmerprism.com/projects/polar-h10.html
Generated: 2026-05-26
Description: Public overview of Mesmer Prism's Polar H10 work across minimal signal packages, Rusty XR, Quest broker streams, Windows capture, Android diagnostics, Unity Quest integration, and Viscereality research tooling.
Markdown: https://mesmerprism.com/projects/polar-h10.md
Plain text: https://mesmerprism.com/projects/polar-h10.txt
BibTeX references: https://mesmerprism.com/projects/polar-h10.bib
CSL JSON references: https://mesmerprism.com/projects/polar-h10.references.csl.json

---

Biofeedback sensor integration

# Polar H10 Work

 The Polar H10 is a practical chest-strap sensor for making heart rhythm,
 RR intervals, ECG, and accelerometer data available to XR and research
 tools. My work around it is not one app. It is a set of minimal signal
 packages, public contracts, companion utilities, Quest broker paths,
 Android checks, Unity integration work, and research-calibration tools
 for keeping biosignal routes visible enough to debug.

 [Signal packages](https://github.com/MesmerPrism/polar-h10-signals)
 [Rusty XR pipeline](https://github.com/MesmerPrism/Rusty-XR/blob/main/docs/BLE_LSL_POLAR_PIPELINE.md)
 [Windows capture docs](https://github.com/MesmerPrism/Rusty-XR-Companion-Apps/blob/main/docs/polar-h10-windows-capture.md)
 [Rusty XR](https://mesmerprism.com/projects/rusty-xr.html)
 [Quest companion tools](https://mesmerprism.com/projects/viscereality-companion.html)
 [Earlier protocol reference](https://mesmerprism.github.io/PolarH10/)

 Purpose

## A signal route, not a gadget demo

 A biosignal is only useful in an XR system when the route is explicit. The
 important questions are practical: which device owns the Bluetooth connection,
 whether the stream is standard heart-rate data or raw Polar PMD data, how the
 samples are timestamped, whether the headset or Windows machine is observing,
 and which schema a downstream consumer can trust.

 The public work keeps those questions separate. Polar H10 Signals owns
 minimal source packages for HR/RR, PMD ECG, and PMD accelerometer payloads.
 Rusty XR owns broader reusable data models and decoders. The Quest broker
 owns headset-side stream publication. The Windows companion owns
 operator-side capture and planning. Android tools own phone-side Bluetooth
 checks and diagnostics. Unity work shows how direct BLE and broker-routed
 paths can be compared inside a Quest scene.

 The intent is biofeedback engineering for research and creative XR systems:
 inspectable streams, clear ownership, reproducible diagnostics, and public
 protocol notes. It is not medical software and it does not make clinical
 claims.

### Public boundary

- Reusable schemas, decoders, command shapes, and diagnostics are public-facing.

- Raw captures, local run artifacts, study identifiers, and private stream names stay out of public pages.

- Polar PMD streams such as ECG and accelerometer are treated as single-owner during live tests.

- Public examples should keep app-specific simulation logic separate from sensor transport.

### Signals in scope

- Standard BLE Heart Rate Measurement notifications for BPM and RR intervals

- Battery and service visibility checks for setup diagnostics

- Polar PMD ECG frames when a raw cardiac waveform is required

- Polar PMD ACC frames for chest-motion and breathing-related experiments

- LSL, OSC, broker, and local JSONL routes for downstream tools

 Project map

## Where the H10 work lives

 These are the public-facing layers of the current Polar H10 work. Some
 implementation history remains private or project-specific; the public page
 describes the reusable behavior and documented boundaries.

### Polar H10 Signals packages

 Polar H10 Signals is the smallest public integration surface: a Rust
 protocol crate, a .NET protocol package, an Android/Quest Kotlin source
 bridge, and Unity event DTOs. It is not a full app. It gives host apps
 source-anchored command builders and decoders for standard HR/RR plus
 PMD ECG and accelerometer frames.

- [polar-h10-signals repository](https://github.com/MesmerPrism/polar-h10-signals)

- [protocol source trail](https://github.com/MesmerPrism/polar-h10-signals/blob/main/docs/protocol-sources.md)

### Rusty XR data contracts

 Rusty XR carries framework-neutral BLE, LSL, and Polar models. The
 public rusty-xr-polar surface includes Polar H10 GATT UUIDs, PMD
 command builders, Heart Rate Measurement decoding, ECG frame decoding,
 uncompressed ACC frame decoding, and LSL stream schemas.

- [BLE, LSL, and Polar H10 pipeline](https://github.com/MesmerPrism/Rusty-XR/blob/main/docs/BLE_LSL_POLAR_PIPELINE.md)

- [rusty-xr-polar crate](https://github.com/MesmerPrism/Rusty-XR/tree/main/crates/rusty-xr-polar)

### Quest broker path

 The Quest broker can publish Polar-shaped diagnostic stream events for
 HR/RR, ECG, and ACC. This gives headset and desktop consumers a stable
 stream contract before every app shell has native Bluetooth, LSL, or
 deployment details finalized.

- bio:polar_hr_rr for standard heart-rate notifications

- bio:polar_ecg for Polar PMD ECG payloads

- bio:polar_acc for Polar PMD accelerometer payloads

- [Quest broker APK source](https://github.com/MesmerPrism/Rusty-XR/tree/main/examples/quest-broker-apk)

### Windows capture and planning

 Rusty XR Companion includes a Windows-only H10 capture service using
 WinRT Bluetooth LE APIs. It can read battery metadata, subscribe to
 heart-rate and RR notifications, optionally start PMD ACC streaming,
 write JSONL witness records, and plan whether PC, Quest, dual HR/RR,
 or two-sensor comparison owns a live test.

- [Polar H10 Windows capture docs](https://github.com/MesmerPrism/Rusty-XR-Companion-Apps/blob/main/docs/polar-h10-windows-capture.md)

- [Rusty XR Companion Apps](https://github.com/MesmerPrism/Rusty-XR-Companion-Apps)

### Android phone diagnostics

 The Android companion work keeps phone-side protocol checks in the phone
 app rather than Rusty XR core. The public Polar slice scans for the H10,
 connects long enough to discover services, reads the Battery Level
 characteristic, reports Heart Rate and PMD visibility, and closes cleanly.

- [Android streaming and sensor protocols](https://github.com/MesmerPrism/Rusty-XR-Android-Companion/blob/main/docs/streaming-protocols.md)

- [Rusty XR Android Companion](https://github.com/MesmerPrism/Rusty-XR-Android-Companion)

### Unity Quest integration

 The Unity Quest work uses a scene-authored BLE and Polar graph, a headset
 HUD, runtime permission handling, direct Polar routing, and broker-routed
 comparison paths. The important public idea is the split between direct
 Unity ownership and broker ownership of the same H10 PMD stream.

- Stable scene objects for permission, BLE readiness, scan/connect, and HUD state

- Direct route records HR/RR and decoded PMD ACC/ECG frames

- Broker route records the same signal family as stream events

### Viscereality research tooling

 Viscereality uses H10 data as part of breath and cardiac biofeedback
 research. The public boundary is the system idea: combine chest-strap
 heart rhythm or accelerometer data with phone, Quest, and browser
 tooling while keeping research claims and raw recordings bounded.

- [Viscereality overview](https://mesmerprism.com/projects/viscereality.html)

- [Quest companion tools](https://mesmerprism.com/projects/viscereality-companion.html)

 Use cases

## What this makes possible

 The useful result is not simply that a headset, phone, or Windows machine can
 see the H10. The useful result is that a project can choose a route deliberately
 and still produce comparable evidence: local capture on Windows, headset-owned
 PMD, phone-side Bluetooth diagnostics, LSL observation, OSC or broker bridge
 traffic, and Unity-side direct-vs-broker comparisons.

 That is what lets H10 work support visual-state experiments, breath-estimator
 calibration, cardiac timing, XR biofeedback, and tooling diagnostics without
 mixing every prototype into one private runtime.

### Reusable offerings

- Minimal Rust, .NET, Android/Kotlin, and Unity source surfaces for host apps

- Protocol-level documentation for BLE, PMD, and LSL stream shapes

- Quest broker event names and payload conventions for H10-like signals

- Windows capture records for local evidence and plotting

- Android smoke checks for sensor presence, battery, and service visibility

- Unity scene patterns for permission, connection, HUD, and signal comparison

### Earlier protocol reference

 An earlier public PolarH10 reference site documents protocol notes,
 formula sheets, and implementation background. Newer Rusty XR work uses
 those notes as reference material while keeping current contracts in the
 Rusty XR and companion repositories.

- [PolarH10 reference site](https://mesmerprism.github.io/PolarH10/)

- [Protocol overview](https://mesmerprism.github.io/PolarH10/reference/protocol/overview.html)

 References

## Public docs and repositories

### Mesmer Prism projects

- MesmerPrism. "[polar-h10-signals](https://github.com/MesmerPrism/polar-h10-signals)." Minimal source packages for HR/RR, PMD ECG, and PMD accelerometer integration.

- MesmerPrism. "[Rusty-XR](https://github.com/MesmerPrism/Rusty-XR)." Public repository for reusable XR contracts, examples, and docs.

- Rusty XR. "[BLE, LSL, and Polar H10 Pipeline](https://github.com/MesmerPrism/Rusty-XR/blob/main/docs/BLE_LSL_POLAR_PIPELINE.md)." Public routing and decoder notes.

- MesmerPrism. "[Rusty-XR-Companion-Apps](https://github.com/MesmerPrism/Rusty-XR-Companion-Apps)." Windows companion and operator tooling.

- Rusty XR Companion. "[Polar H10 Windows Capture](https://github.com/MesmerPrism/Rusty-XR-Companion-Apps/blob/main/docs/polar-h10-windows-capture.md)." Public capture-service boundary.

### Protocol and vendor references

- MesmerPrism. "[PolarH10](https://mesmerprism.github.io/PolarH10/)." Earlier independent protocol and implementation reference.

- Polar Electro. "[Polar BLE SDK](https://github.com/polarofficial/polar-ble-sdk)." Public open-source SDK used for protocol cross-checking.

- Android Developers. "[Bluetooth permissions](https://developer.android.com/guide/topics/connectivity/bluetooth/permissions)." Android BLE permission reference.

 Polar and Polar H10 are trademarks of their respective owners. This work
 is independent and is not affiliated with or endorsed by Polar Electro.
