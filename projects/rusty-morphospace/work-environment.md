# Contributor Work Environment | Rusty Morphospace

Source: https://mesmerprism.com/projects/rusty-morphospace/work-environment.html
Canonical HTML: https://mesmerprism.com/projects/rusty-morphospace/work-environment.html
Generated: 2026-07-15
Description: Set up a reproducible Rusty Morphospace development environment with portable dependency checks, four installable skill routers, protocol-v2 project workspaces, validation, and release capsules.
Markdown: https://mesmerprism.com/projects/rusty-morphospace/work-environment.md
Plain text: https://mesmerprism.com/projects/rusty-morphospace/work-environment.txt
BibTeX references: https://mesmerprism.com/projects/rusty-morphospace/work-environment.bib
CSL JSON references: https://mesmerprism.com/projects/rusty-morphospace/work-environment.references.csl.json

---

Contributor setup and project workflow

# Start with a reproducible workspace

 The Rusty Morphospace work environment is the public onboarding point for
 contributors. It checks the local toolchain, installs four portable agent
 skill routers, scaffolds project-local composition and iteration state, and
 provides fail-closed validation and release tools without assuming one
 maintainer's directory layout.

 Reviewed July 15, 2026. Work environment release 0.4.0.

 [Setup path](https://mesmerprism.com/projects/rusty-morphospace/work-environment.html#setup)
 [Install skills](https://mesmerprism.com/projects/rusty-morphospace/work-environment.html#skills)
 [Project workspace](https://mesmerprism.com/projects/rusty-morphospace/work-environment.html#project-workspace)
 [Release model](https://mesmerprism.com/projects/rusty-morphospace/work-environment.html#release-capsules)
 [Build a native Quest app](https://mesmerprism.com/projects/rusty-morphospace/native-app-build-workflow.html)
 [Rusty Morphospace overview](https://mesmerprism.com/projects/rusty-morphospace.html)

## What 0.4.0 provides

 Portable setup
 Local paths stay in ignored configuration; public docs use placeholders.

 Four skill routers
 Morphospace context, system engineering, Rust work graphs, and Meta Quest workflow.

 Closed project composition
 Project specs and exact feature locks keep absent capabilities inert.

 Evidence-bearing iteration
 Bounded units, validation receipts, recovery records, and release capsules preserve what was actually checked.

## The environment and the platform have separate versions.

 Rusty Morphospace 0.1.0 is the current consolidated platform baseline.
 The work environment 0.4.0 is an independently versioned contributor and
 workflow release. Updating setup scripts or validation contracts does not
 silently change platform behavior.

 A project adopts the portable protocol locally. Its composition, feature
 lock, current work unit, evidence, and release decisions remain owned by
 that project rather than by the onboarding repository.

 Setup

## From a clean checkout to a validated workspace

 Clone only the repositories needed for the current task. The work environment
 accepts an explicit local layout instead of imposing one.

 Minimal commands

 Clone
 git clone https://github.com/MesmerPrism/rusty-morphospace-work-environment.git <workspace-root>/rusty-morphospace-work-environment

 Core validation
 Test-WorkEnvironment.ps1 -ConfigPath ./local/local.paths.json -Profile Core -Strict

 Skill installation
 Install-LocalSkills.ps1 -TargetRoot <codex-skills-root> -Action Plan , then repeat with -Action Install -Execute and -Action Verify .

 Project scaffold
 New-ProjectWorkspace.ps1 -ProjectRoot <project-root> -ProjectId <project-id> plans by default; add -Execute only after reviewing the target.

 The Core profile checks general development dependencies. Quest-specific
 profiles are necessary only when Android or headset work is actually in scope.
 Environment checks and project validators never authorize a live device action.

 Local skills

## Install routing knowledge into your own environment

 The installer targets an explicit skills root, refuses unmanaged
 overwrites, creates backups for managed updates, and records source
 provenance. The four skills divide orientation, architecture, graph
 evidence, and device execution instead of combining them into one guide.

### rusty-morphospace-context

 Routes work to Matter, Lattice, Manifold, Optics, LSL, GUI, Quest, Hostess, compatibility lanes, and the public/private boundary.

### system-engineering

 Separates authority, contracts, adapters, activation, observability, evidence, recovery, and release decisions.

### rust-work-graph

 Builds exact repo and instruction inventories, dependency or impact maps, and release-tree reconciliation evidence.

### meta-quest-workflow

 Routes explicit headset, ADB, APK, screenshot, logcat, performance, and Meta tooling operations to the public device workflow.

 Project protocol

## Keep specification, activation, state, and evidence separate

 A project-local morphospace/ directory is a small control
 surface, not a replacement for source code or Git history.

 Artifact roles

 Artifact
 Owns
 Does not prove

 project.spec.json
 Declared repository and module composition.
 Runtime activation or validation.

 feature.lock.json
 Exact resolved permissions, modules, routes, and effects.
 That a consumer applied the lock.

 workspace.state.json
 Compact current unit, validation checkpoint, and recovery projection.
 Historical audit by itself.

 Events and receipts
 Append-only transitions and addressable evidence.
 Authority beyond their bounded scope.

 New scaffolds use protocol v2. Unlisted modules and features remain inert. A
 selected feature still requires one descriptor-approved runtime input and a
 consumer-emitted effective receipt before its effects can be accepted.

 Release integrity

## A release is a sealed history point, not a frozen branch

 At a candidate cut, every declared public ref must equal its pinned commit,
 and the exact commit tree must validate cleanly. Later historical audits ask
 whether that commit is still an ancestor of the declared refs and materialize
 the sealed tree in isolation.

 This distinction lets contributors keep committing after a release without
 rewriting its meaning. Dirty local work is observed context, never historical
 payload. If an accepted evidence file is lost or hash-mismatched, the damage
 remains explicit; a reconstruction is a separately labelled artifact, not a
 replacement pretending to be the original bytes.

### Candidate cut

- Exact commit and tree for every repository

- Declared remote refs equal the pinned commits

- Clean isolated validation

- Hash-bound evidence and no-force publication receipts

### Historical closure

- Pinned commits remain ancestor-or-equal to current refs

- Exact historical trees materialize independently

- Later commits are allowed

- Rewrites, missing refs, or hash damage fail closed

 Public boundary

## Portable instructions, private machine state

### Safe public material

 Placeholder-based setup, public repo names, dependency categories, schemas, synthetic fixtures, command shapes, and validation tools that do not mutate devices by default.

### Keep local

 Absolute paths, device identities, package and signing material, APKs, raw logs, screenshots, captures, private payload semantics, credentials, and pairing material.

 Public sources

## Setup and workflow repositories

- MesmerPrism. "[rusty-morphospace-work-environment](https://github.com/MesmerPrism/rusty-morphospace-work-environment)." Public contributor setup, project-workspace protocol, validation, and release-capsule repository.

- MesmerPrism. "[Rusty Morphospace Work Environment 0.4.0](https://github.com/MesmerPrism/rusty-morphospace-work-environment/releases/tag/v0.4.0)." Published onboarding and workflow release, July 15, 2026.

- MesmerPrism. "[meta-quest-agent-workflow](https://github.com/MesmerPrism/meta-quest-agent-workflow)." Public operational workflow for explicit Quest device work.

- Mesmer Prism. "[Rusty Morphospace](https://mesmerprism.com/projects/rusty-morphospace.html)." Public platform overview and repository map.

- Mesmer Prism. "[Native App Build Workflow](https://mesmerprism.com/projects/rusty-morphospace/native-app-build-workflow.html)." Feature-locked native Quest application composition.
