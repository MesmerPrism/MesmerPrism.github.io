# Rusty Morphospace

Source: https://mesmerprism.com/projects/rusty-morphospace.html
Canonical HTML: https://mesmerprism.com/projects/rusty-morphospace.html
Generated: 2026-06-12
Description: Rusty Morphospace is a modular Rust platform for computational matter, situated relations, runtime authority, renderer-neutral inspection, and Quest validation.
Markdown: https://mesmerprism.com/projects/rusty-morphospace.md
Plain text: https://mesmerprism.com/projects/rusty-morphospace.txt
BibTeX references: https://mesmerprism.com/projects/rusty-morphospace.bib
CSL JSON references: https://mesmerprism.com/projects/rusty-morphospace.references.csl.json

---

Computational morphology platform

# Rusty Morphospace

 Rusty Morphospace is the umbrella frame for a modular Rust platform that
 treats form as more than geometry. A form can be simulated matter, a spatial
 relation, a feedback circuit, a renderer-neutral view, an operator workflow,
 or a headset-hosted environment. The project names the space where those
 pieces can be built without collapsing them into one XR app.

 [Repositories](https://mesmerprism.com/projects/rusty-morphospace.html#repositories)
 [Module map](https://mesmerprism.com/projects/rusty-morphospace.html#module-map)
 [Current work](https://mesmerprism.com/projects/rusty-morphospace.html#current-work)
 [Why Morphospace](https://mesmerprism.com/projects/rusty-morphospace.html#why)
 [Rusty XR boundary](https://mesmerprism.com/projects/rusty-morphospace.html#boundary)
 [Rusty XR](https://mesmerprism.com/projects/rusty-xr.html)
 [References](https://mesmerprism.com/projects/rusty-morphospace.html#references)

 Purpose

## Computational form as a working medium

 The platform is being organized so responsibilities stay separate while still
 composing into one toolchain. Computational substance, reference spaces,
 command flow, inspection, authoring, and headset behavior need different
 ownership boundaries. When those boundaries are blurred, every prototype
 starts carrying platform policy, rendering assumptions, runtime authority, and
 study-specific names in the same layer.

 Morphospace is meant to make that separation visible. It provides a way to
 define computational material, place it in a relation field, route state and
 feedback through explicit authority surfaces, inspect it through
 renderer-neutral optics, and host it in desktop, browser, or headset contexts.

 The current source family has moved beyond naming notes. Matter, Manifold,
 Optics, Lattice, GUI, Makepad, Quest, and Quest-Makepad now have clean public
 repos with explicit ownership boundaries, AGPL-first licensing for
 Morphospace-owned source, and local validation gates. Studio, Hostess,
 Manifold Packages, and the Quest sidecar lane sit around those contracts as
 authoring, package, evidence, and integration surfaces.

 The [Bioelectricity and Morphogenesis](https://mesmerprism.com/projects/bioelectricity.html)
 slice shows the Matter/Optics boundary in a public teaching model: Matter owns
 the planarian surface graph, voltage-like fields, conductance-like coupling,
 memory, readouts, and qualitative fixtures; Optics owns browser inspection
 over those payloads; and Manifold remains the lane for future command,
 session, and audit surfaces.

 A separate DiffeoMorph reference lane now covers learned many-agent
 morphogenesis: the paper
 [DiffeoMorph: Learning to Morph 3D Shapes Using Differentiable Agent-Based Simulations](https://arxiv.org/abs/2512.17129)
 and the
 [hormoz-lab/diffeomorph implementation](https://github.com/hormoz-lab/diffeomorph)
 are useful public sources for target-shape scoring, many-agent update rules,
 replay/checkpoint vocabulary, and robustness gates. They do not become the
 runtime authority for the current bioelectric Matter/Optics teaching model.

 The point is not to rename every existing Rusty XR surface. Rusty XR remains
 useful history, compatibility, and public Quest evidence. Rusty Morphospace is
 the cleaner umbrella for new computational-form work.

### Current frame

- Umbrella: Rusty Morphospace

- Clean source repos: Matter, Manifold, Optics, Lattice, GUI, Makepad, Quest, Quest-Makepad

- Package and host repos: Manifold Packages, Studio, Hostess, Quest Sidecar Mesh

- Current surface proof: recorded hand mesh to Matter CPU oracle to Quest Makepad GPU evidence

- Licensing: AGPL-3.0-or-later for Morphospace-owned source

### Layer names

- Runtime authority: Rusty Manifold

- Computational substance: Rusty Matter

- Visual inspection: Rusty Optics

- Situated relations: Rusty Lattice

- Graphical descriptors: Rusty GUI

- Makepad adaptation: Rusty Makepad and Rusty Quest Makepad

- Platform edge: Rusty Quest

### Useful for

- Keeping simulation truth separate from renderer and platform adapters

- Designing environments where tracked relations are first-class data

- Routing commands, streams, leases, clocks, and diagnostics explicitly

- Making visual state inspectable without tying it to one render backend

- Proving headset paths with bounded evidence before claiming runtime backends

### Connected work

- [Bioelectricity and Morphogenesis](https://mesmerprism.com/projects/bioelectricity.html) shows the Matter/Optics boundary applied to planarian surface-field dynamics

- [DiffeoMorph](https://arxiv.org/abs/2512.17129) provides a public computational-morphogenesis reference for many-agent target-forming bodies, separate from Morphospace runtime authority

- [Rusty Quest Makepad](https://github.com/MesmerPrism/rusty-quest-makepad) carries the current recorded-hand, SDF/ADF, particle, and GPU-proof adapter work

- [Rusty Hostess](https://github.com/MesmerPrism/rusty-hostess) provides the install, staging, launch, and evidence shell used to validate those headset paths

- [Rusty XR](https://mesmerprism.com/projects/rusty-xr.html) remains the public compatibility and Quest reference surface

- [Quest Termux Lab](https://github.com/MesmerPrism/quest-termux-lab) is a public MIT lab source that feeds the Rusty Quest sidecar bridge

- [Quest Companion Tools](https://mesmerprism.com/projects/viscereality-companion.html) show why operator-side contracts matter

- [Polar H10 Work](https://mesmerprism.com/projects/polar-h10.html) shows the same boundary discipline applied to biosignal streams

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
 hygiene, validation receipts, and platform write/readback evidence.

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
 launch planning, validation receipts, and platform tooling wrappers.

 Status
 Public main
 License
 AGPL-3.0-or-later
 Use
 Platform write/readback evidence without owning app simulation

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
 [Overview](https://mesmerprism.com/projects/rusty-xr.html)

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

## What is current as of June 12, 2026

 The active implementation line is the Quest Makepad Matter surface runtime:
 recorded hand data becomes Matter-owned mesh and joint-frame truth, Optics
 prepares renderer-neutral debug payloads, Quest-Makepad adapts those payloads
 to headset Makepad shells, and Hostess installs, stages, launches, and records
 evidence. That path is now a real cross-repo validation route rather than a
 naming exercise.

 The latest Quest evidence proves bounded GPU correctness checkpoints over the
 recorded-hand surface. Full skinned vertex/index buffer residency and a tiny
 mesh-to-dense-SDF construction probe both match Matter CPU oracle samples. The
 mesh-SDF proof has moved from same-call wait-idle readback to a submit ticket
 and later fence-poll completion, with the marker emitted only after completion.

 That result is deliberately narrow. It proves storage-buffer residency,
 bounded compute/readback, and CPU-oracle comparison for a small field. It is
 not yet a scaled frame-critical GPU backend. The remaining proof readbacks
 still need the same ticket/poll treatment before dense SDF dimensions or
 indexed ADF construction should be scaled.

### Validated shape

- Camera-free Hostess Quest Makepad APK route with generated Quest manifest

- App-private settings and data-plane staging through Hostess tooling

- Recorded hand provider shaped as bind mesh plus compact joint frames

- Matter CPU oracle comparison for hand skinning and tiny mesh-SDF samples

- Quest Makepad marker path for mesh-SDF submit, poll, and readback completion

### Architecture guards

- Matter remains simulation and SDF/ADF/particle truth

- Makepad owns generic XR/Vulkan dispatch plumbing, not Matter semantics

- Quest-Makepad owns adapter markers and headset app profile bundles

- Hostess owns install, staging, launch, and evidence capture

- High-rate mesh, field, particle, and GPU buffers stay out of settings/control JSON

### Next engineering pressure

- Move remaining GPU proof readbacks to ticket/poll completion

- Keep Vulkan probe implementations split into sibling modules

- Scale dense SDF or indexed ADF only after bounded oracle checks stay clean

- Keep particle force authority singular in normal profiles

 Why the name

## A space of possible forms

 A morphospace is a space of possible forms. In Rusty Morphospace, those forms
 are digital, dynamic, and situated: not only meshes or surfaces, but relations,
 regulatory circuits, views, workflows, and platform constraints that change
 what a system can become.

 That makes the name practical rather than only conceptual. It describes the
 engineering surface where material state, relation state, authority state, and
 visual state can vary independently while remaining connected enough to build
 tools and environments.

### Architecture sentence

 Matter is the morphology of substance, Lattice is the morphology of relation,
 Manifold is the morphology of regulation, and Optics is the morphology of
 appearance.

 The overlap is intentional. Data and its environment relationships are the
 engineering substrate, not incidental metadata around an app.

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

## External sources for this page

- Pahng et al. "[DiffeoMorph: Learning to Morph 3D Shapes Using Differentiable Agent-Based Simulations](https://arxiv.org/abs/2512.17129)." arXiv 2512.17129 (submitted 2025; revised 2026).

- hormoz-lab. "[diffeomorph](https://github.com/hormoz-lab/diffeomorph)." Official implementation repository for the DiffeoMorph paper.
