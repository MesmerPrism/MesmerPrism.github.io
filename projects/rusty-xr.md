# Rusty XR

Source: https://mesmerprism.com/projects/rusty-xr.html
Canonical HTML: https://mesmerprism.com/projects/rusty-xr.html
Generated: 2026-05-26
Description: Rusty XR is a public Rust workspace for reusable XR contracts, Quest diagnostics, camera/depth labels, broker models, public examples, and companion-tool workflows.
Markdown: https://mesmerprism.com/projects/rusty-xr.md
Plain text: https://mesmerprism.com/projects/rusty-xr.txt
BibTeX references: https://mesmerprism.com/projects/rusty-xr.bib
CSL JSON references: https://mesmerprism.com/projects/rusty-xr.references.csl.json

---

Rust for XR and Meta Quest experiments

# Rusty XR

 Rusty XR is a public Rust workspace for making Quest and XR experiments
 easier to repeat, inspect, and connect to outside tooling. It is not a
 single headset app. It holds shared contracts, schemas, diagnostics,
 camera and depth models, broker shapes, and public examples that app
 shells and companion tools can reuse without inheriting study-specific package
 names, study logic, or visual-effect code.
 Use Rusty XR when Quest experiments need to stay reproducible across machines,
 collaborators, and companion tools.

 [Source repo](https://github.com/MesmerPrism/Rusty-XR)
 [Project docs](https://mesmerprism.github.io/Rusty-XR/)
 [Passthrough guide](https://mesmerprism.github.io/Rusty-XR/passthrough.html)
 [Companion docs](https://mesmerprism.github.io/Rusty-XR-Companion-Apps/)
 [Polar H10 work](https://mesmerprism.com/projects/polar-h10.html)
 [Quest companion tools](https://mesmerprism.com/projects/viscereality-companion.html)

 Purpose

## What it is good for

 Rusty XR is good for the parts of XR work that need to survive beyond a single
 prototype: typed schemas, repeatable diagnostics, camera and depth reasoning,
 runtime profiles, broker messages, sensor payloads, and small examples that
 companion tools can install or verify. It makes the technical layer portable
 enough to support Viscereality, Meta Quest signal-source vocabulary, public
 examples, and future Rust-native XR experiments without collapsing them into
 one app.

 The current emphasis is Meta Quest because it is where the practical need is
 sharpest. Quest experiments involve headset builds, operator tools, raw camera
 questions, environment-depth data, display casting, MediaProjection
 inspection, and diagnostics. Rusty XR gives those pieces a common language so
 the work can move between research prototypes, documentation examples, and
 field tools without losing the source labels.

 Here, "source" means where a visual or sensor signal actually comes from:
 compositor passthrough, app-visible camera input, environment depth, casting,
 MediaProjection, or a generated app render.

### Start here

- Read the [Quest passthrough guide](https://mesmerprism.github.io/Rusty-XR/passthrough.html)

- Inspect the public Quest examples in the [source repository](https://github.com/MesmerPrism/Rusty-XR)

- Use the companion tools to install, launch, cast, and verify a build

### Useful for

- Keeping Quest experiments reproducible across machines and collaborators

- Sharing runtime profiles, diagnostics, catalog metadata, and schema contracts with companion tools

- Testing camera, depth, passthrough, final-display, broker, and strobe workflows with clear source labels

- Connecting sensor streams, visual primitives, hand/particle data, and operator-side evidence capture

### Connected work

- [Quest passthrough guide](https://mesmerprism.github.io/Rusty-XR/passthrough.html) supplies the API and signal-source discipline

- [Quest Companion Tools](https://mesmerprism.com/projects/viscereality-companion.html) turn the same contracts into install, launch, cast, and diagnostics workflows

- [Viscereality](https://mesmerprism.com/projects/viscereality.html) provides the research-system context where this kind of tooling becomes necessary

 Quest examples

## Reproducible XR Experiments

 A lot of Quest work becomes confusing when every visual output gets called
 passthrough. Rusty XR helps keep the experimental vocabulary clean: compositor
 passthrough, app-visible camera input, environment depth, casting, and
 MediaProjection each describe a different kind of evidence. That distinction
 matters during tool building, capture debugging, and explanations of what a
 prototype can actually access.

 That structure also supports the companion apps. A Windows or
 Android operator tool can install a build, launch a profile, cast the final
 display, capture a screenshot, run a broker or media probe, and export
 diagnostics while Rusty XR supplies the shared contracts and reference behavior
 behind the run.

### Current themes

- Rust-native Quest examples that can be launched and verified from companion tools

- Camera, depth, passthrough, and MediaProjection experiments with separate evidence labels

- Broker, OSC, LSL, Polar H10, and stream-manifest contracts for research-facing data paths

- Hand mesh, particles, SDF, room mesh, and visual-strobe descriptors kept as reusable public contracts

- Diagnostics and visual proof that make headset behavior easier to discuss remotely

### Connected projects

- [Quest Companion Tools](https://mesmerprism.com/projects/viscereality-companion.html) for Windows and Android operator workflows

- [Polar H10 Work](https://mesmerprism.com/projects/polar-h10.html) for BLE, PMD, LSL, and Quest broker sensor paths

- [Quest passthrough guide](https://mesmerprism.github.io/Rusty-XR/passthrough.html) for API and source-vocabulary discipline

- [Viscereality](https://mesmerprism.com/projects/viscereality.html) for the broader Quest-based research-system context

 References

## Project docs

 Mesmer Prism keeps the conceptual overview here. Implementation details,
 onboarding, release notes, Quest source documentation, and command-level
 workflows belong in the dedicated project documentation.

### Rusty XR

- MesmerPrism. "[Rusty-XR](https://github.com/MesmerPrism/Rusty-XR)." Public GitHub repository.

- Rusty XR. "[Project Documentation](https://mesmerprism.github.io/Rusty-XR/)." Technical docs, architecture notes, and workflow guidance.

- Rusty XR. "[Quest Passthrough Documentation](https://mesmerprism.github.io/Rusty-XR/passthrough.html)." Source map for compositor passthrough, raw camera, depth, and final-display inspection.

- Rusty XR. "[Quest Visual Source Taxonomy](https://github.com/MesmerPrism/Rusty-XR/blob/main/docs/QUEST_VISUAL_SOURCE_TAXONOMY.md)." The detailed source-map document for camera, depth, passthrough, and display evidence.

### Companion tooling

- MesmerPrism. "[Rusty XR Companion Docs](https://mesmerprism.github.io/Rusty-XR-Companion-Apps/)." User-facing docs for install, launch, casting, diagnostics, and releases.

- MesmerPrism. "[Rusty-XR-Companion-Apps](https://github.com/MesmerPrism/Rusty-XR-Companion-Apps)." Source repository for the Windows companion and related tooling.
