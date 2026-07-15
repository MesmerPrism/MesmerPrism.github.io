# Rusty Morphospace

Source: https://mesmerprism.com/projects/rusty-morphospace.html
Canonical HTML: https://mesmerprism.com/projects/rusty-morphospace.html
Generated: 2026-07-15
Description: Rusty Morphospace is an AGPL-first Rust platform for computational-form systems, with a 0.1.0 platform baseline and a public 0.4.0 contributor work environment.
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

 Reviewed July 15, 2026.

 [What it is for](https://mesmerprism.com/projects/rusty-morphospace.html#what-for)
 [Set up a workspace](https://mesmerprism.com/projects/rusty-morphospace/work-environment.html)
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
 A consolidated 0.1.0 platform baseline, public core repos, protocol-v2 project workspaces, native Quest/OpenXR/Vulkan and Spatial SDK routes, and legacy compatibility material.

 What it is for
 Keeping model state, spatial relation, command flow, visual inspection, and platform evidence separate.

 What it is not
 Not a single XR application, renderer, HSI framework, clinical system, robotics backend, or raw camera/passthrough claim.

 Platform 0.1.0
 Work environment 0.4.0
 Active development continues
 Makepad and Rusty XR: legacy/reference

## Current public baseline

 Two version numbers describe different things. Rusty Morphospace
 0.1.0 is the consolidated platform baseline across the
 source lanes. The independently versioned
 [work environment 0.4.0](https://github.com/MesmerPrism/rusty-morphospace-work-environment/releases/tag/v0.4.0)
 is the public onboarding, project-workflow, validation, and release-audit
 toolkit. Updating that toolkit does not silently change the platform.

 Version and development status

 Platform baseline
 Rusty Morphospace 0.1.0: the current consolidated architecture and module-ownership baseline.

 Contributor environment
 Version 0.4.0: reproducible local setup, four installable agent skill routers, protocol-v2 project workspaces, closed feature locks, validation receipts, and release capsules.

 Ongoing development
 Repository branches continue normally. A release records exact commits and trees; it does not require active branches or local worktrees to remain frozen.

 Runtime direction
 New Quest work defaults to native OpenXR/Vulkan or Meta Spatial SDK. Makepad remains available for explicit compatibility, regression, and migration work.

 [Contributor setup guide](https://mesmerprism.com/projects/rusty-morphospace/work-environment.html)
 [Work environment repository](https://github.com/MesmerPrism/rusty-morphospace-work-environment)
 [0.4.0 release](https://github.com/MesmerPrism/rusty-morphospace-work-environment/releases/tag/v0.4.0)

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
 GUI describes portable controls and command bindings; Hostess projects operator workflows through WPF and CLI/API-equivalent routes.

 Target platforms without making them the core model
 Native Quest, Meta Spatial SDK, browser, and WPF routes adapt the contracts. Makepad routes remain explicit compatibility surfaces.

 Integrate LSL without merging authority models
 Rusty LSL provides independently authored compatibility and typed observations or proposals; Manifold still owns accepted sessions, routes, revisions, and audit.

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
 a browser view, hosted by a native Quest or WPF surface, or replayed through
 a legacy Makepad compatibility shell. The
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
 Which toolkit or platform hosts it. Default routes: browser, native Quest/OpenXR, Spatial SDK, and WPF; Makepad is compatibility-only.

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

 Native Quest / WPF / Browser
 Adapt views and operator actions into concrete surfaces without owning simulation truth.

 Lattice
 Records spaces, poses, calibration, confidence, and device capability snapshots.

 Manifold
 Decides which commands, sessions, streams, clocks, and audit records count.

 Rusty LSL
 Provides independently authored LSL compatibility and typed observations or proposals without replacing Manifold authority.

 Hostess
 Installs, launches, stages, replays, and packages evidence around the runtime.

 GUI / Studio
 Provides authoring and review surfaces over contracts rather than hidden behavior.

 Rusty Quest
 Proves what the headset package, permissions, profile, and renderer actually did.

 Rusty XR
 Preserves older examples and source vocabulary as a legacy/reference collection.

 Makepad compatibility
 Preserves explicit regression and migration routes without setting the default runtime direction.

 Purpose

## Computational form as a working medium

 Rusty Morphospace is a way to build computational form without turning every
 proof into one large XR application. It separates the substance being modeled,
 the spaces and devices around it, the command authority that changes it, the
 views that inspect it, and the headset routes that validate it.

 The current public family has moved beyond naming notes. Matter, Manifold,
 Optics, Lattice, Rusty LSL, GUI, Quest, Manifold Packages, Hostess, and the
 project work environment form the primary source stack. Studio, sidecar,
 Rusty XR, and Makepad repositories remain useful authoring, integration,
 compatibility, or reference lanes with explicit boundaries.

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

- Platform baseline: Rusty Morphospace 0.1.0

- Portable onboarding and workflow release: work environment 0.4.0

- Primary source repos: Matter, Manifold, Manifold Packages, Optics, Lattice, Rusty LSL, GUI, Quest, and Hostess

- Current source lines include peer/media authority, closed Android broker packaging, particle and hand conformance, native Quest/OpenXR rendering, Spatial SDK panels, and WPF/CLI operator routes

- Licensing: AGPL-3.0-or-later for active Morphospace-owned source; MIT retained for legacy/reference and lab lanes where noted

### License quick map

- AGPL-3.0-or-later: the work environment and current Morphospace-owned source repos, including Matter, Optics, Manifold, Lattice, Rusty LSL, GUI, Quest, Hostess, and maintained compatibility lanes

- MIT: Rusty XR compatibility/history collection and Quest Termux Lab

- External references, such as DiffeoMorph, keep their upstream paper and code licenses

### Layer names

- Runtime authority: Rusty Manifold

- Computational substance: Rusty Matter

- Visual inspection: Rusty Optics

- Situated relations: Rusty Lattice

- LSL compatibility and typed observations/proposals: Rusty LSL

- Graphical descriptors: Rusty GUI

- Platform edge and native headset renderer: Rusty Quest

- Legacy Makepad adaptation: Rusty Makepad and Rusty Quest Makepad

### Useful for

- Keeping simulation truth separate from renderer and platform adapters

- Designing environments where tracked relations are first-class data

- Routing commands, streams, leases, clocks, and diagnostics explicitly

- Making visual state inspectable without tying it to one render backend

- Proving headset paths with bounded evidence before claiming runtime backends

- Building Quest-native OpenXR/Vulkan diagnostics without making platform adapters simulation authority

### Core routes

- [Native App Build Workflow](https://mesmerprism.com/projects/rusty-morphospace/native-app-build-workflow.html) explains how APK profiles select only the required Rusty Quest feature modules

- [Contributor Work Environment](https://mesmerprism.com/projects/rusty-morphospace/work-environment.html) explains local setup, project workspaces, skill installation, validation, and release capsules

- [Rusty Quest](https://github.com/MesmerPrism/rusty-quest) carries runtime profiles, Quest permission/tooling surfaces, and the native Rust/OpenXR/Vulkan renderer route

- [Rusty Hostess](https://github.com/MesmerPrism/rusty-hostess) provides WPF and CLI/API-equivalent install, staging, launch, replay, and evidence routes

- [Rusty Quest Makepad](https://github.com/MesmerPrism/rusty-quest-makepad) remains available for explicit compatibility and migration work

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
 Hostess expose controls and package-review surfaces through CLI/API and WPF
 projections. Browser and native Quest routes adapt the same contracts to
 concrete runtimes; Makepad can replay the route when compatibility work calls
 for it. Hostess and
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

- Operate: GUI and Hostess expose controls and review surfaces through CLI/API-equivalent routes.

- Adapt: browser, native Quest/OpenXR, Spatial SDK, and WPF host the contracts; Makepad is an explicit compatibility route.

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

 LSL compatibility

### [Rusty LSL](https://github.com/MesmerPrism/rusty-lsl)

 Independently authored LSL compatibility, protocol behavior, fixtures,
 and typed observations or proposals. It does not replace Manifold's
 session, route, subscription, lease, revision, or audit authority.

 Legacy Makepad adaptation

### [Rusty Makepad](https://github.com/MesmerPrism/rusty-makepad)

 Generic Makepad adapters and canonical app settings surfaces, kept
 separate from Quest platform writes and app-specific headset behavior.
 This is now a compatibility, regression, and migration lane.

 Quest platform

### [Rusty Quest](https://github.com/MesmerPrism/rusty-quest)

 Quest runtime profiles, permissions, launch planning, Android property
 hygiene, validation receipts, native OpenXR/Vulkan rendering examples,
 and platform write/readback evidence.

 Legacy Quest Makepad apps

### [Rusty Quest Makepad](https://github.com/MesmerPrism/rusty-quest-makepad)

 Explicit compatibility adapters for camera-shell profiles, recorded
 hand replay, Matter surface runtime handoff, SDF/ADF debug visuals,
 particles, and bounded GPU evidence.

 Authoring and validation

### Studio and Hostess

 Studio remains an authoring/review lane. Hostess is the current Windows
 operator lane for WPF projections backed by CLI/API-equivalent install,
 diagnostics, deployment, and evidence routes. Neither becomes Manifold
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
 rusty-matter, rusty-lattice, rusty-manifold, rusty-optics, rusty-lsl, rusty-gui

 Onboarding and project workflow
 rusty-morphospace-work-environment

 Build, package, and authoring
 rusty-manifold-packages, rusty-studio, rusty-hostess

 Platform and integration routes
 rusty-quest, rusty-hostess, rusty-quest-sidecar-mesh

 Compatibility, reference, and legacy
 rusty-makepad, rusty-quest-makepad, makepad-morphospace, Rusty-XR, quest-termux-lab, DiffeoMorph

 Onboarding / Workflow

### [rusty-morphospace-work-environment](https://github.com/MesmerPrism/rusty-morphospace-work-environment)

 Portable machine setup, repo-lane orientation, four installable Codex
 skill routers, protocol-v2 project workspaces, closed feature locks,
 bounded work units, validators, and immutable release capsules.

 Status
 Public release 0.4.0
 License
 AGPL-3.0-or-later
 Use
 Contributor onboarding and portable project workflow

 [Setup guide](https://mesmerprism.com/projects/rusty-morphospace/work-environment.html)
 [Repository](https://github.com/MesmerPrism/rusty-morphospace-work-environment)

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

 Compatibility / LSL

### [rusty-lsl](https://github.com/MesmerPrism/rusty-lsl)

 Independently authored LSL protocol and API compatibility, conformance
 fixtures, and typed Morphospace observations or proposals. Accepted
 runtime routing and audit remain Manifold responsibilities.

 Status
 Public main
 License
 AGPL-3.0-or-later
 Use
 LSL interoperability without authority substitution

 [Repository](https://github.com/MesmerPrism/rusty-lsl)

 Legacy adapter / Makepad

### [rusty-makepad](https://github.com/MesmerPrism/rusty-makepad)

 Generic Makepad app settings contracts, deterministic effective-settings
 resolution, hotload proposals and decisions, and toolkit adapter
 boundaries for Morphospace GUI surfaces.

 Status
 Public legacy/compatibility main
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

 Legacy adapter / Quest Makepad

### [rusty-quest-makepad](https://github.com/MesmerPrism/rusty-quest-makepad)

 Quest-specific Makepad camera-shell profile bundles, recorded mesh and
 hand-source replay, Matter surface runtime adapters, ADF/SDF debug
 boundaries, particle payloads, and GPU proof markers.

 Status
 Public legacy/compatibility main
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

 WPF and CLI/API-equivalent install, replay, capture, telemetry, and
 host-validation routes for proving Manifold packages across desktop,
 mobile, and headset profiles.

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

## What is current as of July 15, 2026

 The public 0.1.0 baseline now has a clearer default direction. Native
 OpenXR/Vulkan and Meta Spatial SDK apps in Rusty Quest are the primary Quest
 routes; WPF backed by CLI/API-equivalent commands is the primary Windows
 operator route. Makepad remains maintained for explicit compatibility and
 migration work rather than defining new development
 ([rusty-quest](https://github.com/MesmerPrism/rusty-quest);
 [rusty-hostess](https://github.com/MesmerPrism/rusty-hostess)).

 Recent public developments

 Area
 Published development
 Boundary

 Contributor workflow
 Work environment 0.4.0 adds clean-machine onboarding, four installable skill routers, protocol-v2 project workspaces, fail-closed validation, and immutable release capsules.
 It versions the workflow, not the platform runtime.

 Manifold authority
 Peer sessions, signed enrollment and leases, bounded N-peer membership, source-neutral media sessions, packaged broker authority, and client admission now have explicit contracts.
 Rendezvous, Android networking, and transport acknowledgements remain evidence or adapters.

 Particle and hand substrate
 Matter, Lattice, and Optics now carry conformance for particle payloads, situated anchors, provider-neutral hand frames, skinning, and identity-preserving visual profiles.
 Renderer and platform resources remain downstream.

 Rusty LSL
 The clean Rusty LSL lane now provides independently authored compatibility, protocol fixtures, and typed observations or proposals.
 It does not replace Manifold route, subscription, lease, revision, or audit authority.

 Quest platform
 Native OpenXR/Vulkan, Spatial SDK panels, closed broker packaging, direct Wi-Fi media, and receiver-first media adoption now coexist as explicit opt-in source routes.
 Available source and profiles do not activate a feature without the selected lock and runtime input.

 0.1.0 platform evidence surfaces

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
 Historical recorded/live hand surfaces, SDF/ADF, particles, and bounded GPU readback remain available.
 Explicit compatibility evidence, not the default runtime or authority model.

 Native direct Wi-Fi media
 Same-group full-stereo duplex was promoted for the native OpenXR route; packed side-by-side remains an explicit profile.
 Legacy Makepad media remains a separate compatibility lane, and Android Network availability is not fabricated when absent.

 The native path has public profiles for direct
 Quest Camera2/AHardwareBuffer import into Vulkan external images, metadata-owned
 camera target rectangles and orientation, native Meta passthrough profiles,
 solid-black control profiles, resident GPU hand meshes and graft copies,
 compact live OpenXR hand input, hand-anchor particles, target-space GPU SDF
 diagnostics, stimulus-volume routes, and environment-depth particle/scene-map
 diagnostics, plus a separate Spatial SDK panel lane and receiver-first media
 adoption. Its MediaProjection route is a display-composite feedback witness:
 Android grants capture tokens, Rust owns the AImage/AHardwareBuffer handoff,
 and a shared Vulkan AHardwareBuffer import helper is used by camera and
 display-composite sampling.

 The 0.1.0 baseline binds specific source and
 evidence; later commits remain ongoing development until a new release
 candidate is cut. The native renderer has headset evidence and
 profile/static validation for these routes, but MediaProjection is evidence of
 the app-visible display composite, not raw passthrough texture, raw camera,
 environment-depth, or scene geometry. Environment-depth and stimulus-volume
 routes are diagnostic validation surfaces rather than finished participant
 tools. Native same-group full-stereo media has a promoted route, while
 compatibility remote-camera and Makepad paths retain their narrower evidence
 and do not become parallel authority.

### Validated shape

- Camera-free Hostess Quest Makepad APK route with generated Quest manifest

- Native Rusty Quest Android package with OpenXR/Vulkan session, stereo swapchain, profile matrix, and runtime markers

- Separate Meta Spatial SDK panel lane with behavior-neutral project-workspace adoption

- Receiver-first media composition and native same-group full-stereo duplex over Rust-owned direct-P2P sockets

- Manifold broker packaging from exact product and client locks rather than ambient permission unions

- Reusable AHardwareBuffer Vulkan import module shared by Camera2 and display-composite sampling

- Direct HWB camera quality profiles with stream metadata for target rectangles, aspect, orientation, and sync policy

- Native passthrough and solid-black profiles for hand meshes, graft copies, and anchor-particle diagnostics

- MediaProjection display-composite feedback profile with gated capture, opaque shrunken projection, and GPU readback evidence

- Environment-depth and stimulus-volume diagnostic profiles behind explicit runtime-profile validation

- App-private settings plus sibling data-plane staging through Hostess tooling

- Recorded and live hand providers shaped as bind mesh plus compact joint frames

- Matter CPU oracle comparison for skinning, full mesh residency, mesh-SDF, ADF debug, and particle paths

- Manifold-aligned media contracts with high-rate video kept out of command JSON

### Architecture guards

- Matter remains simulation, field, SDF/ADF, particle, and bioelectric truth

- Manifold owns command/session authority, stream metadata, and audit

- Rusty Quest owns Quest platform profiles, permission/tooling surfaces, and native renderer diagnostics, not Matter or Optics semantics

- Makepad and the native renderer are separate app routes; Makepad is now compatibility-only and neither owns simulation truth

- Hostess owns WPF/CLI-equivalent install, staging, launch, and evidence routes

- MediaProjection evidence is display-composite evidence, not raw passthrough, camera, depth, or geometry truth

- Camera and display-composite imports share reusable AHardwareBuffer mechanics without coupling their source policies

- High-rate mesh, field, particle, and GPU buffers stay out of settings/control JSON

### Next engineering pressure

- Keep reusable AHardwareBuffer import/render code outside the large frame loop and outside camera-specific ownership

- Keep display-composite projection area, aspect, orientation, opacity, and gain as stream/profile metadata rather than shader assumptions

- Promote environment-depth only after known-distance, motion, and source-layer agreement evidence stays clean

- Scale dense SDF or indexed ADF only after bounded oracle checks and cadence evidence stay clean

- Cut a new candidate before presenting post-0.1.0 source as a released platform baseline

- Keep native full-stereo and packed side-by-side routes separately selectable and independently evidenced

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

- MesmerPrism. "[rusty-morphospace-work-environment](https://github.com/MesmerPrism/rusty-morphospace-work-environment)." Public contributor onboarding, project-workflow, validation, and release-capsule repository; current release 0.4.0.

- MesmerPrism. "[rusty-matter](https://github.com/MesmerPrism/rusty-matter)." Public Rusty Matter repository for computational matter, surface, field, particle, SDF, and fixture contracts.

- MesmerPrism. "[rusty-optics](https://github.com/MesmerPrism/rusty-optics)." Public Rusty Optics repository for renderer-neutral projection, appearance, and visual validation contracts.

- MesmerPrism. "[rusty-manifold](https://github.com/MesmerPrism/rusty-manifold)." Public Rusty Manifold repository for command, stream, session, module, and audit authority.

- MesmerPrism. "[rusty-lattice](https://github.com/MesmerPrism/rusty-lattice)." Public Rusty Lattice repository for reference-space, tracked-pose, view-set, and capability contracts.

- MesmerPrism. "[rusty-lsl](https://github.com/MesmerPrism/rusty-lsl)." Public independently authored LSL compatibility repository for protocol behavior, conformance fixtures, and typed Morphospace observations or proposals.

- MesmerPrism. "[rusty-gui](https://github.com/MesmerPrism/rusty-gui)." Public Rusty GUI repository for framework-neutral panels, widgets, inspectors, and graphical descriptors.

- MesmerPrism. "[rusty-makepad](https://github.com/MesmerPrism/rusty-makepad)." Public Rusty Makepad repository for Makepad settings and adapter contracts.

- MesmerPrism. "[rusty-quest](https://github.com/MesmerPrism/rusty-quest)." Public Rusty Quest repository for Quest profiles, permission/tooling surfaces, remote-camera contracts, and the native Quest OpenXR/Vulkan renderer route.

- MesmerPrism. "[rusty-quest-makepad](https://github.com/MesmerPrism/rusty-quest-makepad)." Public Quest Makepad adapter repository for camera-shell, recorded hand, SDF/ADF, particle, and GPU-proof evidence routes.

- MesmerPrism. "[rusty-hostess](https://github.com/MesmerPrism/rusty-hostess)." Public Hostess repository for install, staging, launch, evidence, and operator workflows around Morphospace packages and Quest validation.

- MesmerPrism. "[rusty-manifold-packages](https://github.com/MesmerPrism/rusty-manifold-packages)." Public package repository for first-party synthetic, biosignal, projected-motion, Polar H10, and hand-animation lanes.

- MesmerPrism. "[rusty-studio](https://github.com/MesmerPrism/rusty-studio)." Public Rusty Studio repository for authoring and review surfaces around Morphospace packages.

- MesmerPrism. "[rusty-quest-sidecar-mesh](https://github.com/MesmerPrism/rusty-quest-sidecar-mesh)." Public Quest sidecar mesh repository for integration contracts and synthetic fixtures.

- MesmerPrism. "[quest-termux-lab](https://github.com/MesmerPrism/quest-termux-lab)." Public Quest Termux lab source feeding Quest sidecar bridge work.

- MesmerPrism. "[meta-quest-agent-workflow](https://github.com/MesmerPrism/meta-quest-agent-workflow)." Public device-operation workflow for Quest build, install, launch, and evidence collection.

- MesmerPrism. "[Rusty-XR](https://github.com/MesmerPrism/Rusty-XR)." Public Rusty XR compatibility and historical Quest evidence surface.

- Pahng et al. "[DiffeoMorph: Learning to Morph 3D Shapes Using Differentiable Agent-Based Simulations](https://arxiv.org/abs/2512.17129)." arXiv 2512.17129 (submitted 2025; revised 2026).

- hormoz-lab. "[diffeomorph](https://github.com/hormoz-lab/diffeomorph)." Official implementation repository for the DiffeoMorph paper.
