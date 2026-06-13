# Rusty XR Legacy Reference | Rusty Morphospace

Source: https://mesmerprism.com/projects/rusty-morphospace/rusty-xr.html
Canonical HTML: https://mesmerprism.com/projects/rusty-morphospace/rusty-xr.html
Generated: 2026-06-13
Description: Rusty XR is the legacy/reference Quest and XR compatibility surface under Rusty Morphospace, preserving public examples, passthrough notes, diagnostics, and companion-tool history.
Markdown: https://mesmerprism.com/projects/rusty-morphospace/rusty-xr.md
Plain text: https://mesmerprism.com/projects/rusty-morphospace/rusty-xr.txt
BibTeX references: https://mesmerprism.com/projects/rusty-morphospace/rusty-xr.bib
CSL JSON references: https://mesmerprism.com/projects/rusty-morphospace/rusty-xr.references.csl.json

---

Legacy Quest and XR reference

# Rusty XR

 Rusty XR is now the legacy/reference lane inside Rusty Morphospace.
 It preserves the public Quest examples, passthrough vocabulary,
 camera/depth diagnostics, broker models, and companion-tool history
 that informed the current Morphospace split. New generic relation,
 command, Matter, Optics, GUI, Makepad, and Quest work belongs in the
 newer Morphospace repos; Rusty XR remains useful when old examples or
 compatibility evidence need to be inspected.

 [Rusty Morphospace](https://mesmerprism.com/projects/rusty-morphospace.html)
 [Source repo](https://github.com/MesmerPrism/Rusty-XR)
 [Project docs](https://mesmerprism.github.io/Rusty-XR/)
 [Passthrough guide](https://mesmerprism.github.io/Rusty-XR/passthrough.html)
 [Companion docs](https://mesmerprism.github.io/Rusty-XR-Companion-Apps/)
 [Polar H10 work](https://mesmerprism.com/projects/polar-h10.html)
 [Quest companion tools](https://mesmerprism.com/projects/viscereality-companion.html)

 Purpose

## What remains useful

 Rusty XR remains valuable as a public record of Quest and XR mechanics that
 needed to survive beyond a single prototype: typed schemas, repeatable
 diagnostics, camera and depth reasoning, runtime profiles, broker messages,
 sensor payloads, and small examples that companion tools could install or
 verify. Those lessons now feed the cleaner Morphospace lanes instead of
 defining a single umbrella architecture.

 The reference emphasis is still Meta Quest because that is where the
 practical pressure first became visible: headset builds, operator tools, raw
 camera questions, environment-depth data, display casting, MediaProjection
 inspection, and diagnostics. Rusty XR keeps those source labels available for
 compatibility and explanation while Rusty Quest, Rusty Lattice, Rusty
 Manifold, Rusty Matter, and Rusty Optics carry new active architecture work.

 Here, "source" means where a visual or sensor signal actually comes from:
 compositor passthrough, app-visible camera input, environment depth, casting,
 MediaProjection, or a generated app render.

### Start here

- Read the [Quest passthrough guide](https://mesmerprism.github.io/Rusty-XR/passthrough.html)

- Inspect the public Quest examples in the [source repository](https://github.com/MesmerPrism/Rusty-XR)

- Use the companion tools to install, launch, cast, and verify a build

### Useful for

- Looking up legacy Quest examples and public compatibility contracts

- Tracing passthrough, camera, depth, final-display, broker, and strobe vocabulary

- Understanding why the Morphospace split separates Lattice, Manifold, Matter, Optics, Quest, and adapters

- Connecting older companion-tool workflows to their current Morphospace boundaries

### Connected work

- [Quest passthrough guide](https://mesmerprism.github.io/Rusty-XR/passthrough.html) supplies the API and signal-source discipline

- [Quest Companion Tools](https://mesmerprism.com/projects/viscereality-companion.html) turn the same contracts into install, launch, cast, and diagnostics workflows

- [Viscereality](https://mesmerprism.com/projects/viscereality.html) provides the research-system context where this kind of tooling becomes necessary

 Quest examples

## Reference experiments

 A lot of Quest work became confusing when every visual output got called
 passthrough. Rusty XR helps keep the experimental vocabulary clean: compositor
 passthrough, app-visible camera input, environment depth, casting, and
 MediaProjection each describe a different kind of evidence. That distinction
 matters during tool building, capture debugging, and explanations of what a
 prototype can actually access.

 That structure still helps when reading the companion app history. A Windows
 or Android operator tool can install a build, launch a profile, cast the final
 display, capture a screenshot, run a broker or media probe, and export
 diagnostics; the active Morphospace lanes now decide which pieces are
 platform behavior, command authority, relation state, or data-plane payloads.

### Current themes

- Rust-native Quest examples that can be compared against newer Morphospace adapters

- Camera, depth, passthrough, and MediaProjection experiments with separate evidence labels

- Broker, OSC, LSL, Polar H10, and stream-manifest contracts that informed Manifold package and stream work

- Hand mesh, particles, SDF, room mesh, and visual-strobe descriptors preserved as public reference material

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
