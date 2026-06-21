# Rusty Morphospace

Source: https://mesmerprism.com/projects/rusty-morphospace.html
Canonical HTML: https://mesmerprism.com/projects/rusty-morphospace.html
Generated: 2026-06-21
Description: Rusty Morphospace is a modular Rust platform for computational-form systems with separate model, relation, command, inspection, packaging, and evidence layers.
Markdown: https://mesmerprism.com/projects/rusty-morphospace.md
Plain text: https://mesmerprism.com/projects/rusty-morphospace.txt
BibTeX references: https://mesmerprism.com/projects/rusty-morphospace.bib
CSL JSON references: https://mesmerprism.com/projects/rusty-morphospace.references.csl.json

---

Modular Rust platform for computational-form systems

# Rusty Morphospace

 Rusty Morphospace is a modular Rust platform for building systems where
 computational state, spatial relation, commands, visual inspection, app
 packaging, and runtime evidence need to stay separate but connected.
 It is a repo family and architecture, not one XR app.

 Reviewed June 21, 2026.

 [What it is for](https://mesmerprism.com/projects/rusty-morphospace.html#what-for)
 [Core model](https://mesmerprism.com/projects/rusty-morphospace.html#start-here)
 [Build a Quest APK](https://mesmerprism.com/projects/rusty-morphospace/native-app-build-workflow.html)
 [Inspect current evidence](https://mesmerprism.com/projects/rusty-morphospace.html#current-work)
 [Examples](https://mesmerprism.com/projects/rusty-morphospace.html#example-domains)
 [Find repositories](https://mesmerprism.com/projects/rusty-morphospace.html#repositories)
 [Read legacy Rusty XR](https://mesmerprism.com/projects/rusty-morphospace/rusty-xr.html)

## Rusty Morphospace at a glance

 What it is
 An AGPL-first Rust repo family for computational-form systems.

 What exists now
 Public core repos, app-build feature locks, native Quest/OpenXR/Vulkan routes, Makepad/Hostess validation paths, Matter/Optics teaching models, and legacy Rusty XR material.

 What it is for
 Keeping model state, spatial relation, command flow, visual inspection, and platform evidence separate.

 What it is not
 Not a single XR application, renderer, HSI framework, clinical system, robotics backend, or raw camera/passthrough claim.

 Public source
 Device evidence
 Application-domain examples
 Legacy reference
 Not a clinical claim

 Use

## What can you use it for?

 Use Rusty Morphospace when a project needs clear boundaries between the
 state being modeled, the device or space around it, the commands that can
 change it, the views used to inspect it, and the evidence proving what ran.

 Practical uses

 Build computational-form simulations
 Matter owns particles, fields, surfaces, SDF/ADF structures, and simulation state.

 Keep spatial/device context separate
 Lattice owns spaces, poses, calibration, validity, confidence, and device capability snapshots.

 Route commands and streams explicitly
 Manifold owns sessions, streams, commands, clocks, leases, audit, and runtime regulation.

 Inspect state without hard-coding a renderer
 Optics owns renderer-neutral cameras, views, materials, projections, and debug payloads.

 Build GUI and editor surfaces
 GUI and Studio describe controls, panels, graph canvases, package review, and authoring.

 Target platforms without making them the core model
 Quest, Makepad, Quest-Makepad, Hostess, and sidecar routes validate deployment and evidence.

 Keep application domains modular
 HSI, bioelectricity, biosignals, morphogenesis references, and XR examples use the core but do not define it.

 What it is and is not

 Rusty Morphospace is...
 Rusty Morphospace is not...

 A modular Rust architecture and repo family.
 One finished XR app.

 A way to keep simulation, relation, control, inspection, and runtime evidence separate.
 A renderer by itself.

 A domain-neutral base for computational-form experiments.
 An HSI framework by itself.

 A platform-neutral set of contracts with browser, desktop, headset, and host-validation routes.
 Quest-only software.

 A way to build inspectable experiments and validation paths.
 A clinical, therapeutic, or social-science claim.

## The problem it solves

 Experimental systems often tangle too many responsibilities in one app:
 simulation state, input devices, spatial transforms, renderer assumptions,
 command policy, platform permissions, and validation evidence.

 Rusty Morphospace separates those responsibilities so a project can
 change one part without silently changing the others. A particle surface
 should be able to keep the same Matter state while being inspected through
 a browser view, adapted into a Makepad shell, or validated on Quest. The
 particle state should not become Quest logic, and the Quest adapter should
 not become simulation truth.

## Core verbs

 Model
 What exists and changes. Lane: Matter.

 Situate
 Where it is relative to spaces, devices, cameras, and views. Lane: Lattice.

 Regulate
 What can change it, when, and under which policy. Lane: Manifold.

 Inspect
 How state can be seen or debugged before choosing one renderer. Lane: Optics.

 Author
 Which controls, panels, graph surfaces, and package-review tools expose it. Lanes: GUI and Studio.

 Adapt
 Which toolkit or platform hosts it. Lanes: browser, Makepad, Quest, native routes.

 Validate
 What evidence proves the route behaved as claimed. Lanes: Hostess, app build, platform receipts.

 Names
 The repo names are stable homes for those responsibilities, not a vocabulary test.

## Architecture map

 The layers compose, but each layer keeps a different decision local.

 Matter
 Computes fields, particles, surfaces, SDF/ADF forms, and simulation state.

 Optics
 Describes what can be inspected before a renderer draws it.

 Makepad / Browser / Quest
 Adapt views into concrete app surfaces without owning simulation truth.

 Lattice
 Records spaces, poses, calibration, confidence, and device capability snapshots.

 Manifold
 Decides which commands, sessions, streams, clocks, and audit records count.

 Hostess
 Installs, launches, stages, replays, and packages evidence around the runtime.

 GUI / Studio
 Provides authoring and review surfaces over contracts rather than hidden behavior.

 Rusty Quest
 Proves what the headset package, permissions, profile, and renderer actually did.

 Rusty XR
 Preserves older examples and source vocabulary as a legacy/reference collection.

 Purpose

## Computational form as a working medium

 Rusty Morphospace is a way to build computational form without turning every
 proof into one large XR application. It separates the substance being modeled,
 the spaces and devices around it, the command authority that changes it, the
 views that inspect it, and the headset routes that validate it.

 The current public family has moved beyond naming notes. Matter, Manifold,
 Optics, Lattice, GUI, Makepad, Quest, Quest-Makepad, Manifold Packages,
 Studio, Hostess, and the Quest sidecar lane now form a public source stack
 with explicit boundaries, license notes, and validation surfaces.

 Deep dive: why the layers are separate

 Computational substance, reference spaces, command flow, inspection,
 authoring, and headset behavior need different ownership boundaries. When
 those boundaries blur, a prototype starts carrying platform policy,
 rendering assumptions, runtime authority, and study-specific names in the
 same layer.

 Morphospace makes that separation visible: define computational material,
 place it in a relation field, route state through explicit authority
 surfaces, inspect it through renderer-neutral optics, and then host it in
 desktop, browser, or headset contexts.

 Deep dive: research references

 The [Bioelectricity and Morphogenesis](https://mesmerprism.com/projects/bioelectricity.html)
 slice shows the Matter/Optics boundary in a public teaching model:
 Matter owns the planarian surface graph, voltage-like fields,
 conductance-like coupling, memory, readouts, and qualitative fixtures;
 Optics owns browser inspection over those payloads.

 A separate DiffeoMorph reference lane covers learned many-agent
 morphogenesis. The
 [DiffeoMorph paper](https://arxiv.org/abs/2512.17129)
 and
 [official implementation](https://github.com/hormoz-lab/diffeomorph)
 are useful sources for target-shape scoring, update rules, replay
 vocabulary, and robustness gates. They do not become Morphospace runtime
 authority.

 Deep dive: legacy Rusty XR

 The point is not to rename every existing Rusty XR surface. Rusty XR
 remains useful as history, compatibility, and public Quest evidence. New
 computational-form work belongs under the cleaner Morphospace lanes.

### Current frame

- Umbrella: Rusty Morphospace

- Clean source repos: Matter, Manifold, Optics, Lattice, GUI, Makepad, Quest, Quest-Makepad

- Package and host repos: Manifold Packages, Studio, Hostess, Quest Sidecar Mesh

- Current proofs: remote camera framing, native Quest rendering, direct Camera2/HWB import, MediaProjection display-composite feedback, live/recorded hand surfaces, SDF/ADF debug paths, particles, and bounded GPU readbacks

- Licensing: AGPL-3.0-or-later for active Morphospace-owned source; MIT retained for legacy/reference and lab lanes where noted

### License quick map

- AGPL-3.0-or-later: Matter, Optics, Manifold, Lattice, GUI, Makepad, Quest, Quest-Makepad, Manifold Packages, Studio, Hostess, and Quest Sidecar Mesh

- MIT: Rusty XR compatibility/history collection and Quest Termux Lab

- External references, such as DiffeoMorph, keep their upstream paper and code licenses

### Layer names

- Runtime authority: Rusty Manifold

- Computational substance: Rusty Matter

- Visual inspection: Rusty Optics

- Situated relations: Rusty Lattice

- Graphical descriptors: Rusty GUI

- Makepad adaptation: Rusty Makepad and Rusty Quest Makepad

- Platform edge and native headset renderer: Rusty Quest

### Useful for

- Keeping simulation truth separate from renderer and platform adapters

- Designing environments where tracked relations are first-class data

- Routing commands, streams, leases, clocks, and diagnostics explicitly

- Making visual state inspectable without tying it to one render backend

- Proving headset paths with bounded evidence before claiming runtime backends

- Building Quest-native OpenXR/Vulkan diagnostics without making platform adapters simulation authority

### Core routes

- [Native App Build Workflow](https://mesmerprism.com/projects/rusty-morphospace/native-app-build-workflow.html) explains how APK profiles select only the required Rusty Quest feature modules

- [Rusty Quest](https://github.com/MesmerPrism/rusty-quest) carries runtime profiles, Quest permission/tooling surfaces, and the native Rust/OpenXR/Vulkan renderer route

- [Rusty Quest Makepad](https://github.com/MesmerPrism/rusty-quest-makepad) carries Quest-specific Makepad adapter work

- [Rusty Hostess](https://github.com/MesmerPrism/rusty-hostess) provides install, staging, launch, replay, and evidence capture

### Example domains

- [Bioelectricity and Morphogenesis](https://mesmerprism.com/projects/bioelectricity.html) shows the Matter/Optics boundary in a teaching model

- [Mixed-Ability HSI](https://mesmerprism.com/plasmatic-multitudes/mixed-ability-hsi.html) is a planned application domain for explicit mappings, not the core architecture

- [Polar H10 Work](https://mesmerprism.com/projects/polar-h10.html) shows the same boundary discipline applied to biosignal routes

### Reference and legacy

- [Rusty XR](https://mesmerprism.com/projects/rusty-morphospace/rusty-xr.html) remains the public compatibility and Quest reference surface

- [Quest Termux Lab](https://github.com/MesmerPrism/quest-termux-lab) is a public MIT lab/reference source

- [DiffeoMorph](https://arxiv.org/abs/2512.17129) is an external morphogenesis reference, not Morphospace runtime authority

- [Quest Companion Tools](https://mesmerprism.com/projects/viscereality-companion.html) document operator-side install, launch, cast, and evidence workflows

 Small example

## A dynamic particle surface

 Suppose you want to build a particle surface that can be inspected in a
 browser, controlled from a panel, and later tested on a headset. The surface
 can use the same core contracts in each route.

 Matter owns the particles, fields, surface, and simulation step. Optics
 describes debug views of that state without choosing the final renderer.
 Lattice records where the surface, camera, device, or tracked input sits.
 Manifold decides which commands and streams can change the state. GUI and
 Studio expose controls and package-review surfaces. Browser, Makepad, and
 Quest routes adapt the same contracts to concrete runtimes. Hostess and
 app-build evidence prove which package, settings, and runtime markers were
 actually used.

 Larger domains such as mixed-ability HSI, bioelectricity, biosignals, and XR
 diagnostics can use this same separation. They are not required to understand
 the core system.

### Layer sequence

- Model: Matter owns the surface state.

- Inspect: Optics describes views and debug payloads.

- Situate: Lattice records spaces, poses, and device context.

- Regulate: Manifold owns commands, streams, clocks, and policy state.

- Operate: GUI and Studio expose controls and review surfaces.

- Adapt: browser, Makepad, Quest, and native routes host the contracts.

- Validate: Hostess and app-build receipts prove what ran.

 Module map

## Ownership boundaries

 Each name marks a responsibility boundary. The names are useful only when
 they keep implementation layers from inheriting each other's authority.

 Computational substance

### [Rusty Matter](https://github.com/MesmerPrism/rusty-matter)

 Geometry, fields, particles, dynamics, SDF/TSDF data, sampling,
 deterministic fixtures, simulation state, and the current
 [bioelectric morphogenesis](https://mesmerprism.com/projects/bioelectricity.html)
 teaching runtime.

 Situated relation

### [Rusty Lattice](https://github.com/MesmerPrism/rusty-lattice)

 Reference spaces, transforms, tracked poses, view sets, spatial roles,
 calibration, confidence, validity, frame-time binding, and runtime
 capability snapshots.

 Runtime authority

### [Rusty Manifold](https://github.com/MesmerPrism/rusty-manifold)

 Commands, sessions, streams, ports, valves, leases, gauges, clocks,
 transports, audit, and control surfaces.

 Appearance and inspection

### [Rusty Optics](https://github.com/MesmerPrism/rusty-optics)

 Renderer-neutral views, cameras, projections, lenses, material
 descriptors, visual payloads, and debug visualization contracts.

 Graphical descriptors

### [Rusty GUI](https://github.com/MesmerPrism/rusty-gui)

 Portable panels, widgets, inspectors, graph canvases, layout hints,
 themes, and command binding descriptors without owning command authority.

 Makepad adaptation

### [Rusty Makepad](https://github.com/MesmerPrism/rusty-makepad)

 Generic Makepad adapters and canonical app settings surfaces, kept
 separate from Quest platform writes and app-specific headset behavior.

 Quest platform

### [Rusty Quest](https://github.com/MesmerPrism/rusty-quest)

 Quest runtime profiles, permissions, launch planning, Android property
 hygiene, validation receipts, native OpenXR/Vulkan rendering examples,
 and platform write/readback evidence.

 Quest Makepad apps

### [Rusty Quest Makepad](https://github.com/MesmerPrism/rusty-quest-makepad)

 Quest-specific Makepad app adapters for camera-shell profiles, recorded
 hand replay, Matter surface runtime handoff, SDF/ADF debug visuals,
 particles, and bounded GPU evidence.

 Authoring and validation

### Studio and Hostess

 Authoring, package review, installation, diagnostics, deployment, and
 operator workflows around the core layers without becoming Manifold
 authority.

 Public repository family

## Where the pieces live

 The clean Morphospace repos are public now. They are meant to be read as a
 small stack: core contracts first, then graphical and platform adapters,
 packages, authoring, host validation, and Quest-side integration around those
 contracts. Adjacent lab/reference repos are listed only where they feed a
 Morphospace boundary without owning that boundary.

 Repository groups

 Core contracts
 rusty-matter, rusty-lattice, rusty-manifold, rusty-optics, rusty-gui

 Build, package, and authoring
 rusty-manifold-packages, rusty-studio, rusty-hostess

 Platform and adapter routes
 rusty-makepad, rusty-quest, rusty-quest-makepad, rusty-quest-sidecar-mesh

 Reference and legacy
 Rusty-XR, quest-termux-lab, DiffeoMorph

 Core / Matter

### [rusty-matter](https://github.com/MesmerPrism/rusty-matter)

 Computational matter: geometry, mesh surfaces, fields, SDF grids,
 particles, deterministic fixtures, schema catalogs, and Rust/Wasm
 reference runtimes.

 Status
 Public main
 License
 AGPL-3.0-or-later
 Use
 Simulation truth and render-neutral payloads

 [Repository](https://github.com/MesmerPrism/rusty-matter)

 Core / Optics

### [rusty-optics](https://github.com/MesmerPrism/rusty-optics)

 Renderer-neutral visual contracts over Matter payloads: views,
 projections, appearance policy, debug visualization, browser previews,
 and visual fixture validation.

 Status
 Public main
 License
 AGPL-3.0-or-later
 Use
 Inspection without owning simulation or renderer backends

 [Repository](https://github.com/MesmerPrism/rusty-optics)

 Core / Manifold

### [rusty-manifold](https://github.com/MesmerPrism/rusty-manifold)

 Typed contracts for command, stream, module, host, lease, clock,
 session, audit, and package authority. It is the default lane for
 runtime regulation.

 Status
 Public main
 License
 AGPL-3.0-or-later
 Use
 Control-plane authority and validation fixtures

 [Repository](https://github.com/MesmerPrism/rusty-manifold)

 Core / Lattice

### [rusty-lattice](https://github.com/MesmerPrism/rusty-lattice)

 Situated relation contracts for display view sets, reference spaces,
 tracked poses, frame-state binding, validity, confidence, staleness,
 and capability evidence.

 Status
 Public main
 License
 AGPL-3.0-or-later
 Use
 Relation snapshots without OpenXR, Quest, or renderer imports

 [Repository](https://github.com/MesmerPrism/rusty-lattice)

 Core / GUI

### [rusty-gui](https://github.com/MesmerPrism/rusty-gui)

 Framework-neutral graphical descriptors for panels, widgets, inspectors,
 graph canvases, controls, command bindings, layout hints, and themes.

 Status
 Public main
 License
 AGPL-3.0-or-later
 Use
 Graphical operation descriptors without runtime authority

 [Repository](https://github.com/MesmerPrism/rusty-gui)

 Adapter / Makepad

### [rusty-makepad](https://github.com/MesmerPrism/rusty-makepad)

 Generic Makepad app settings contracts, deterministic effective-settings
 resolution, hotload proposals and decisions, and toolkit adapter
 boundaries for Morphospace GUI surfaces.

 Status
 Public main
 License
 AGPL-3.0-or-later
 Use
 Makepad settings and adapter contracts, not Quest platform writes

 [Repository](https://github.com/MesmerPrism/rusty-makepad)

 Platform / Quest

### [rusty-quest](https://github.com/MesmerPrism/rusty-quest)

 Quest platform runtime profiles, Android property hygiene, permissions,
 launch planning, validation receipts, platform tooling wrappers, and the
 Rust-first native Quest renderer package for direct Camera2/HWB,
 passthrough, MediaProjection, environment-depth, and stimulus-volume
 diagnostics.

 Status
 Public main
 License
 AGPL-3.0-or-later
 Use
 Quest platform evidence and native renderer diagnostics without owning Matter semantics

 [Repository](https://github.com/MesmerPrism/rusty-quest)

 Adapter / Quest Makepad

### [rusty-quest-makepad](https://github.com/MesmerPrism/rusty-quest-makepad)

 Quest-specific Makepad camera-shell profile bundles, recorded mesh and
 hand-source replay, Matter surface runtime adapters, ADF/SDF debug
 boundaries, particle payloads, and GPU proof markers.

 Status
 Public main
 License
 AGPL-3.0-or-later
 Use
 Headset Makepad adapters over Matter, Optics, Quest, and Lattice contracts

 [Repository](https://github.com/MesmerPrism/rusty-quest-makepad)

 Packages / Manifold

### [rusty-manifold-packages](https://github.com/MesmerPrism/rusty-manifold-packages)

 First-party package manifests, fixtures, and deterministic processor
 cores for synthetic, biosignal, projected-motion, Polar H10, and
 hand-animation package lanes.

 Status
 Public main
 License
 AGPL-3.0-or-later
 Use
 Package evidence without runtime host authority

 [Repository](https://github.com/MesmerPrism/rusty-manifold-packages)

 Authoring / Studio

### [rusty-studio](https://github.com/MesmerPrism/rusty-studio)

 Schema-first authoring, graph validation, export planning, host-profile
 selection, and Makepad-backed review surfaces over the package and
 shell handoff model.

 Status
 Public main
 License
 AGPL-3.0-or-later
 Use
 Design and review workflows without device execution authority

 [Repository](https://github.com/MesmerPrism/rusty-studio)

 Host validation / Hostess

### [rusty-hostess](https://github.com/MesmerPrism/rusty-hostess)

 Default install, replay, capture, telemetry, and host-validation shell
 for proving Manifold packages across desktop, mobile, and headset
 profiles.

 Status
 Public main
 License
 AGPL-3.0-or-later
 Use
 Evidence capture and host-side validation

 [Repository](https://github.com/MesmerPrism/rusty-hostess)

 Quest sidecar / Integration

### [rusty-quest-sidecar-mesh](https://github.com/MesmerPrism/rusty-quest-sidecar-mesh)

 Public-safe Quest sidecar mesh contracts and synthetic fixtures for
 Termux-style Linux sidecar observation, handoff preparation, and
 Manifold/Hostess boundary review.

 Status
 Public main
 License
 AGPL-3.0-or-later
 Use
 Quest integration planning without live device authority

 [Repository](https://github.com/MesmerPrism/rusty-quest-sidecar-mesh)

 Related lab / Termux

### [quest-termux-lab](https://github.com/MesmerPrism/quest-termux-lab)

 Public MIT lab material for Termux, Termux:X11, Proot, VNC,
 outbound-agent, and peer-mesh experiments on Quest. It remains an
 upstream lab/reference source; Morphospace integration happens through
 the Rusty Quest sidecar bridge.

 Status
 Public lab/reference main
 License
 MIT
 Use
 Sanitized sidecar evidence source, not runtime authority

 [Repository](https://github.com/MesmerPrism/quest-termux-lab)

 Compatibility / History

### [Rusty-XR](https://github.com/MesmerPrism/Rusty-XR)

 Existing MIT-licensed Rusty XR reference work remains the compatibility
 and Quest evidence surface. New Morphospace layers should not use it as
 the default authority model.

 Status
 Public legacy/reference lane
 License
 MIT
 Use
 Quest examples, compatibility notes, and historical evidence

 [Repository](https://github.com/MesmerPrism/Rusty-XR)
 [Overview](https://mesmerprism.com/projects/rusty-morphospace/rusty-xr.html)

 Reference / Morphogenesis

### [DiffeoMorph](https://arxiv.org/abs/2512.17129)

 Public paper and official code for differentiable agent-based
 morphogenesis. The work is useful to Rusty Morphospace as a reference for
 target-shape metrics, learned many-agent controllers, replay/checkpoint
 boundaries, and robustness evaluation.

 Status
 Public paper and official implementation reference
 Use
 Morphology-control vocabulary and future validation targets
 Boundary
 Reference lane, not simulation authority

 [Paper](https://arxiv.org/abs/2512.17129)
 [Official code](https://github.com/hormoz-lab/diffeomorph)

 Current work

## What is current as of June 21, 2026

 The active implementation line now has two Quest fronts. Quest Makepad still
 consumes Matter-owned live or recorded hand-surface truth, adapts
 renderer-neutral payloads to headset Makepad shells, and uses Hostess for
 install, staging, launch, and evidence capture. Rusty Quest now also carries a
 separate Rust-first NativeActivity/OpenXR/Vulkan stack for low-level native
 headset experiments
 ([rusty-quest](https://github.com/MesmerPrism/rusty-quest)).

 Current proof surfaces

 Surface
 Current claim
 Caveat

 Native Quest renderer
 OpenXR/Vulkan session, stereo swapchain, profiles, and runtime markers.
 Diagnostic/proof route, not a finished participant UI.

 Camera2/HWB
 Direct app-visible camera import path through AHardwareBuffer sampling.
 Camera route only; it is not compositor passthrough access.

 MediaProjection
 Display-composite feedback witness.
 Not raw passthrough, camera, environment-depth, or scene geometry evidence.

 Environment depth
 Diagnostic validation surface for depth and scene-map routes.
 Not a finished participant tool.

 Quest Makepad / Hostess
 Recorded/live hand surfaces, SDF/ADF, particles, and bounded GPU readback.
 Validation route, not the authority model.

 Remote camera
 RMANVID1 framing and single-device evidence.
 No two-peer readiness claim yet.

 The native path is not only a launch wrapper. It has public profiles for direct
 Quest Camera2/AHardwareBuffer import into Vulkan external images, metadata-owned
 camera target rectangles and orientation, native Meta passthrough profiles,
 solid-black control profiles, resident GPU hand meshes and graft copies,
 compact live OpenXR hand input, hand-anchor particles, target-space GPU SDF
 diagnostics, stimulus-volume routes, and environment-depth particle/scene-map
 diagnostics. Its MediaProjection route is a display-composite feedback witness:
 Android grants capture tokens, Rust owns the AImage/AHardwareBuffer handoff,
 and a shared Vulkan AHardwareBuffer import helper is used by camera and
 display-composite sampling.

 The current caveat is important. The native renderer has headset evidence and
 profile/static validation for these routes, but MediaProjection is evidence of
 the app-visible display composite, not raw passthrough texture, raw camera,
 environment-depth, or scene geometry. Environment-depth and stimulus-volume
 routes are diagnostic validation surfaces rather than finished participant
 tools. Remote-camera work remains deliberately bounded as Manifold-aligned
 RMANVID1 H.264 framing plus single-device evidence until physical two-peer
 Quest or Quest-to-phone validation passes.

### Validated shape

- Camera-free Hostess Quest Makepad APK route with generated Quest manifest

- Native Rusty Quest Android package with OpenXR/Vulkan session, stereo swapchain, profile matrix, and runtime markers

- Reusable AHardwareBuffer Vulkan import module shared by Camera2 and display-composite sampling

- Direct HWB camera quality profiles with stream metadata for target rectangles, aspect, orientation, and sync policy

- Native passthrough and solid-black profiles for hand meshes, graft copies, and anchor-particle diagnostics

- MediaProjection display-composite feedback profile with gated capture, opaque shrunken projection, and GPU readback evidence

- Environment-depth and stimulus-volume diagnostic profiles behind explicit runtime-profile validation

- App-private settings plus sibling data-plane staging through Hostess tooling

- Recorded and live hand providers shaped as bind mesh plus compact joint frames

- Matter CPU oracle comparison for skinning, full mesh residency, mesh-SDF, ADF debug, and particle paths

- Manifold-aligned remote-camera framing with high-rate video kept out of command JSON

### Architecture guards

- Matter remains simulation, field, SDF/ADF, particle, and bioelectric truth

- Manifold owns command/session authority, stream metadata, and audit

- Rusty Quest owns Quest platform profiles, permission/tooling surfaces, and native renderer diagnostics, not Matter or Optics semantics

- Makepad and the native renderer are separate app routes; neither owns simulation truth

- Quest-Makepad owns Makepad adapter markers and headset app profile bundles

- Hostess owns install, staging, launch, and evidence capture

- MediaProjection evidence is display-composite evidence, not raw passthrough, camera, depth, or geometry truth

- Camera and display-composite imports share reusable AHardwareBuffer mechanics without coupling their source policies

- High-rate mesh, field, particle, and GPU buffers stay out of settings/control JSON

### Next engineering pressure

- Keep reusable AHardwareBuffer import/render code outside the large frame loop and outside camera-specific ownership

- Keep display-composite projection area, aspect, orientation, opacity, and gain as stream/profile metadata rather than shader assumptions

- Promote environment-depth only after known-distance, motion, and source-layer agreement evidence stays clean

- Scale dense SDF or indexed ADF only after bounded oracle checks and cadence evidence stay clean

- Run physical two-peer camera validation before claiming peer streaming readiness

- Keep GPU proof readbacks on ticket/poll or explicit evidence-command paths and keep particle force authority singular in normal profiles

 Examples

## Application domains using Morphospace

 Rusty Morphospace is domain-neutral. These projects use or inform the
 architecture, but they do not define the core system.

 Educational model

### [Bioelectricity and Morphogenesis](https://mesmerprism.com/projects/bioelectricity.html)

 Demonstrates Matter/Optics separation through educational surface-field
 models and source-bounded planarian atlas layers.

 Planned application domain

### [Mixed-Ability HSI](https://mesmerprism.com/plasmatic-multitudes/mixed-ability-hsi.html)

 Uses Morphospace as a possible scaffold for input mappings, provenance,
 authoring, replay, and adapter swaps. HSI does not define the core
 architecture; it is one downstream use of the same boundaries.

 Biosignal packages

### [Polar H10 / biosignals](https://mesmerprism.com/projects/polar-h10.html)

 Shows stream and package boundary discipline for physiological data routes
 without turning sensor transport into application logic.

 Platform evidence

### [Quest diagnostics](https://mesmerprism.com/projects/rusty-morphospace.html#current-work)

 Validates platform routes, permissions, rendering paths, app-build locks,
 and evidence capture without making Quest the core model.

 External reference

### [DiffeoMorph](https://arxiv.org/abs/2512.17129)

 Provides public vocabulary for many-agent morphology control and possible
 future validation targets. It is a reference lane, not runtime authority.

 Name

## Why "Morphospace"?

 A morphospace is a space of possible forms. Here, that means more than
 meshes or surfaces. It includes the state being modeled, the relations around
 that state, the commands allowed to change it, the views used to inspect it,
 and the platform constraints that shape what can run.

 The practical point is separation. Material state, relation state, command
 authority, and visual state can vary independently while still connecting
 through explicit contracts.

 Optional detail: compact architecture sentence

 One shorthand is: Matter describes substance, Lattice describes relation,
 Manifold describes regulation, and Optics describes appearance.

 That sentence is only a mnemonic. In day-to-day work, the safer rule is to
 ask which layer owns the decision, then keep adapters and examples from
 becoming hidden authority.

 Boundary

## Rusty XR stays useful, but narrower

 Rusty XR remains compatibility history and public Quest evidence. It is not
 the authority model for every new Morphospace layer.

### Rusty XR remains stable

 Existing public Rusty XR repositories can continue to document Quest
 experiments, public examples, passthrough notes, companion tooling, and
 historical evidence without becoming the umbrella for new architecture.

### Generic XR-shaped work moves to Lattice

 When the work is really about reference spaces, poses, eye views, tracked
 input roles, calibration, or frame-state validity, the clean lane is
 Rusty Lattice and the schema direction is rusty.lattice.* .
 OpenXR, Makepad, and Quest remain adapter or platform names at the edge.

### Licensing follows the boundary

 Morphospace-owned source code is AGPL-first. Legacy Rusty XR compatibility
 repositories and the Makepad-derived fork stay on their existing MIT lane
 unless a separate migration is approved.

 References

## External sources and public repos for this page

- MesmerPrism. "[rusty-matter](https://github.com/MesmerPrism/rusty-matter)." Public Rusty Matter repository for computational matter, surface, field, particle, SDF, and fixture contracts.

- MesmerPrism. "[rusty-optics](https://github.com/MesmerPrism/rusty-optics)." Public Rusty Optics repository for renderer-neutral projection, appearance, and visual validation contracts.

- MesmerPrism. "[rusty-manifold](https://github.com/MesmerPrism/rusty-manifold)." Public Rusty Manifold repository for command, stream, session, module, and audit authority.

- MesmerPrism. "[rusty-lattice](https://github.com/MesmerPrism/rusty-lattice)." Public Rusty Lattice repository for reference-space, tracked-pose, view-set, and capability contracts.

- MesmerPrism. "[rusty-gui](https://github.com/MesmerPrism/rusty-gui)." Public Rusty GUI repository for framework-neutral panels, widgets, inspectors, and graphical descriptors.

- MesmerPrism. "[rusty-makepad](https://github.com/MesmerPrism/rusty-makepad)." Public Rusty Makepad repository for Makepad settings and adapter contracts.

- MesmerPrism. "[rusty-quest](https://github.com/MesmerPrism/rusty-quest)." Public Rusty Quest repository for Quest profiles, permission/tooling surfaces, remote-camera contracts, and the native Quest OpenXR/Vulkan renderer route.

- MesmerPrism. "[rusty-quest-makepad](https://github.com/MesmerPrism/rusty-quest-makepad)." Public Quest Makepad adapter repository for camera-shell, recorded hand, SDF/ADF, particle, and GPU-proof evidence routes.

- MesmerPrism. "[rusty-hostess](https://github.com/MesmerPrism/rusty-hostess)." Public Hostess repository for install, staging, launch, evidence, and operator workflows around Morphospace packages and Quest validation.

- MesmerPrism. "[rusty-manifold-packages](https://github.com/MesmerPrism/rusty-manifold-packages)." Public package repository for first-party synthetic, biosignal, projected-motion, Polar H10, and hand-animation lanes.

- MesmerPrism. "[rusty-studio](https://github.com/MesmerPrism/rusty-studio)." Public Rusty Studio repository for authoring and review surfaces around Morphospace packages.

- MesmerPrism. "[rusty-quest-sidecar-mesh](https://github.com/MesmerPrism/rusty-quest-sidecar-mesh)." Public Quest sidecar mesh repository for integration contracts and synthetic fixtures.

- MesmerPrism. "[quest-termux-lab](https://github.com/MesmerPrism/quest-termux-lab)." Public Quest Termux lab source feeding Quest sidecar bridge work.

- MesmerPrism. "[Rusty-XR](https://github.com/MesmerPrism/Rusty-XR)." Public Rusty XR compatibility and historical Quest evidence surface.

- Pahng et al. "[DiffeoMorph: Learning to Morph 3D Shapes Using Differentiable Agent-Based Simulations](https://arxiv.org/abs/2512.17129)." arXiv 2512.17129 (submitted 2025; revised 2026).

- hormoz-lab. "[diffeomorph](https://github.com/hormoz-lab/diffeomorph)." Official implementation repository for the DiffeoMorph paper.
