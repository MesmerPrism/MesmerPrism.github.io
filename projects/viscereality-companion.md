# Quest Companion Tools

Source: https://mesmerprism.com/projects/viscereality-companion.html
Canonical HTML: https://mesmerprism.com/projects/viscereality-companion.html
Generated: 2026-06-21
Description: Quest Companion Tools provides Windows and Android utilities for Meta Quest install, launch, casting, diagnostics, and evidence capture.
Markdown: https://mesmerprism.com/projects/viscereality-companion.md
Plain text: https://mesmerprism.com/projects/viscereality-companion.txt
BibTeX references: https://mesmerprism.com/projects/viscereality-companion.bib
CSL JSON references: https://mesmerprism.com/projects/viscereality-companion.references.csl.json

---

Meta Quest operator tooling

# Quest Companion Tools

 Quest Companion Tools turns repeated Meta Quest research operations into a
 reusable Windows and Android workflow: discover the headset, install the right
 build, launch it, cast the display, capture proof, monitor state, and export
 diagnostics without asking every project to rebuild the same operator tools.

 Reviewed June 21, 2026.

 [Current companion repo](https://github.com/MesmerPrism/Rusty-XR-Companion-Apps)
 [Rusty XR](https://mesmerprism.com/projects/rusty-morphospace/rusty-xr.html)
 [Rusty XR source](https://github.com/MesmerPrism/Rusty-XR)
 [Contact](https://mesmerprism.com/#contact)

## Where this fits in Morphospace

 Companion / Hostess-like role
 Install, launch, cast, capture, diagnose, and package evidence.

 Does not own
 Simulation truth, runtime authority, participant mappings, or headset rendering semantics.

 Evidence type
 Operator-side proof that the intended build or profile launched and produced inspectable output.

 Source caveat
 Casting and MediaProjection inspect the final display; they are not raw camera or passthrough sources.

 Operator tooling
 Evidence capture
 Not the runtime

 Purpose

## Why the operator workflow exists

 A Quest project is rarely only the APK running in the headset. Developers,
 researchers, and operators also need a reliable way to discover the device,
 move between USB and Wi-Fi ADB, install the right build, start and stop the
 target package, watch the final display, and record enough state to understand
 what happened when something fails.

 This work turns that repeated friction into a reusable tooling layer. The
 Windows tools are the main implementation today. The Android phone work covers
 the same operations for mobile workflows: USB-host bootstrap, Wi-Fi transfer,
 staged install and launch, display or screenshot proof, and diagnostics export.

### Tools implemented

- USB and Wi-Fi ADB connection management for Meta Quest devices

- Managed discovery or installation of public tools such as adb , hzdb , and scrcpy

- APK install, launch, stop, catalog verification, and runtime-profile transfer

- Display casting, screenshot capture, and MediaProjection final-display frame receiving

- Headset and controller battery readback, foreground-app checks, wake/proximity state, and process diagnostics

- Portable diagnostics bundles for collaborators who do not have the source checkout

### What it abstracts

- Device setup that otherwise lives in terminal notes and lab memory

- Operator actions that should be repeatable during research sessions

- Visual proof that a build actually launched and rendered on-device

- Release and support workflows for people outside the development repo

 Current implementation

## Rusty XR Companion carries the reusable workflow

 The newest iteration lives in
 [Rusty-XR-Companion-Apps](https://github.com/MesmerPrism/Rusty-XR-Companion-Apps).
 It is a Windows-first workspace with a WPF app, CLI, MCP endpoint, core library,
 diagnostics library, and release tooling. It is designed to sit next to
 [Rusty XR](https://mesmerprism.com/projects/rusty-morphospace/rusty-xr.html), which owns the reusable Rust
 contracts, schemas, examples, and Quest-side source code.

 Earlier Viscereality tools, Android transfer experiments, and multi-device
 casting tools shaped the current workflow. The current implementation is
 Rusty-XR-Companion-Apps.

### Public tools and docs

- [Rusty-XR-Companion-Apps](https://github.com/MesmerPrism/Rusty-XR-Companion-Apps) for the current Windows companion, CLI, diagnostics, and release tooling

- [Rusty-XR](https://github.com/MesmerPrism/Rusty-XR) for the reusable Rust XR crates, Quest examples, and signal-source vocabulary

- [Viscereality Companion docs](https://mesmerprism.github.io/ViscerealityCompanion/) for the earlier researcher-facing Windows workflow

- [Viscereality](https://viscereality.org/) for the broader Quest research system that motivated part of this tooling

### Scope

- Companion tools inspect and operate Quest workflows; they are not the headset runtime itself

- Casting and MediaProjection are final-display inspection paths, not raw camera sources

- Catalogs and profiles are documented operator contracts, with study protocols kept out of public docs

- Earlier app names document implementation history; the reusable workflow is remote Quest operation, support, and evidence capture

 Use cases

## What this makes easier

 The practical target is a calmer Quest workflow. A contributor should be able
 to install a known APK, pass a runtime profile, launch the package, see the
 headset display, verify the foreground app, capture a screenshot, and export a
 diagnostic report without memorizing every command. A lab operator should be
 able to run the same sequence without becoming the build engineer.

 This operator workflow also makes mixed Rust, Unity, Android, and OpenXR work
 less fragile. It gives the system an external test and support workflow while the
 headset-side code keeps evolving.

### Typical workflows

- Install a local or release-asset APK and verify that it can be launched

- Run a camera, depth, or display-profile experiment with a recorded operator trace

- Cast the final headset display to Windows for inspection or demonstration

- Collect device, process, graphics, memory, and foreground-activity snapshots for bug reports

- Hand a portable tool to a collaborator without asking them to clone the full source tree
