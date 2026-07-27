# Rusty Fleet onboarding

Source: https://mesmerprism.com/Rusty-Fleet/
Canonical HTML: https://mesmerprism.com/Rusty-Fleet/
Generated: 2026-07-27
Description: A development-preview onboarding guide to Rusty Fleet, its Windows console, Hub, CLI and API, signed-release model, and opt-in Quest and hotspot capabilities.
Markdown: https://mesmerprism.com/Rusty-Fleet/index.md
Plain text: https://mesmerprism.com/Rusty-Fleet/index.txt
BibTeX references: https://mesmerprism.com/Rusty-Fleet/index.bib
CSL JSON references: https://mesmerprism.com/Rusty-Fleet/index.references.csl.json

---

Meta Quest fleet operations for Windows

# Rusty Fleet

 Rusty Fleet is a dedicated operator control surface for monitoring and
 managing a group of enrolled Meta Quest headsets. It keeps fleet policy in
 Fleet while routing every effect to the application that actually owns it.

 Development-preview guide reviewed July 27, 2026.

 [Understand the future install path](https://mesmerprism.com/Rusty-Fleet/#install)
 [How distribution works](https://mesmerprism.com/Rusty-Fleet/#distribution)
 [Read the trust boundary](https://mesmerprism.com/Rusty-Fleet/#safety)

## Current status: development preview

 Source exists
 The Hub, Console, fleetctl , local API, owner adapters, and deterministic validation are under active development.

 No supported download yet
 There is no signed Rusty Fleet Windows release or public guided installer to download from this page.

 Local tests are not a release
 Source checkpoints and synthetic tests do not claim a published bundle, attended headset pass, or production support.

 This page is the guide
 It documents the intended supported path without turning an unpublished build into an implied release.

 Development preview
 Signed release pending
 No public download link

## Where code, downloads, and guidance live

 The distribution layers have different jobs. A page, repository checkout,
 or provider description never substitutes for a verified release.

 Rusty Fleet distribution model

 Surface
 What it owns
 What it does not prove

 GitHub source repository
 Public source, architecture, contracts, tests, and exact development history.
 A checkout or branch is not an installed or supported Windows product.

 GitHub Releases
 The future binary authority: signed artifacts, immutable release manifest, versions, hashes, and release notes.
 A release name alone does not authorize a provider or a headset operation.

 MesmerPrism.com
 The human-facing install, onboarding, safety, and troubleshooting guide.
 This site does not host an alternative unverified Fleet binary.

 QuestIonAble File Manager
 A future convenience route that can verify a configured signed Fleet release and open its guided installer.
 File Manager does not select a release silently, become Fleet authority, or make headset approvals disappear.

 [Inspect Rusty Fleet source](https://github.com/MesmerPrism/rusty-fleet)
 [Install QuestIonAble File Manager](https://mesmerprism.com/QuestIonAble-File-Manager/)

## What the Fleet product contains

 Fleet is one product with several projections over the same
 authority-aware engine. It is not a new name for File Manager.

### Fleet Hub

 The local service owns the enrolled device directory, accepted
 observations, operation lifecycle, audit records, saved views, and
 adapter registry. The supported first deployment keeps its operator API
 local to the Windows host unless a separately documented ingress is
 explicitly configured.

### Fleet Console

 The native Windows dashboard presents the dense fleet table, device
 inspector, previews, confirmations, progress, evidence, and recovery
 states. It is the human projection, not a separate state engine.

### fleetctl and the local API

 Automation receives structured CLI and HTTP access to the same
 operations and evidence. A GUI-only capability is incomplete: operator
 actions require CLI or local API parity.

### Release-pinned providers

 A future signed Windows bundle is intended to carry the exact
 Windows-side provider components declared by its release manifest,
 including the Rusty Hostess provider for Windows hotspot work. Hostess
 retains effect ownership. File Manager, Kiosk, the headset Fleet Agent,
 and Termux remain independent owner components with explicit
 installation and activation.

## Supported onboarding path once a signed release exists

 These steps describe the release contract. They are not an invitation to
 treat the current local source candidate as a public installer.

- ### Start with the File Manager guide Install [QuestIonAble File Manager](https://mesmerprism.com/QuestIonAble-File-Manager/) through its guided Windows setup. Confirm the displayed product and publisher before accepting Windows trust prompts.

- ### Select Fleet only when a signed release is configured The Fleet option must remain unavailable until File Manager has a configured release manifest and can verify its identity, signature, version, and hashes. It then opens Fleet's installer; it does not install an arbitrary branch or an executable discovered on the machine.

- ### Review the bundle manifest The release must enumerate Fleet Hub, Fleet Console, fleetctl , the local API contract, included providers, exact versions, hashes, and rollback instructions. Optional headset apps stay visibly separate.

- ### Enroll one headset before adding a cohort Establish the headset Fleet Agent and Manifold identity, then wait for a fresh signed check-in. Base monitoring is app-level and must not require ADB.

- ### Enable capabilities individually Configure exact provider pins and private device bindings locally. Preview and test one owner-routed capability at a time before using a multi-device target snapshot.

## Capabilities and their real owners

 Fleet owns operator intent, exact targets, authorization flow, bounded
 dispatch, and the audit projection. The component that can observe or
 perform the effect remains its owner.

 Opt-in capability routes

 Capability
 Owner route
 Important condition

 Fleet monitoring
 Rusty Quest Fleet Agent → signed Manifold admission → Fleet Hub
 Works without ADB; stale or untrusted check-ins stay visibly stale or rejected.

 Quest awake controls
 Fleet policy → Manifold authorization → pinned File Manager provider
 The Meta development hold is bounded to at most eight hours. Windows and on-device watchdogs are explicit modes with separate stop and restore-normal actions.

 Quest Wi-Fi ADB
 Fleet policy → File Manager provider → Kiosk request → Meta wearer approval → signed Quest capability
 The request is not usable-shell proof. Fleet requires a fresh enrolled check-in derived from an on-device Termux loopback result of exactly uid=2000(shell) .

 Classic USB tcpip
 Pinned File Manager provider with an exact authorized USB target
 This is a separate recovery/bootstrap route, not evidence that the modern Kiosk/Meta request succeeded.

 Windows Mobile Hotspot
 Fleet host policy → pinned Rusty Hostess provider → Windows networking API
 It is one host-scoped resource, not a headset setting and not File Manager ownership.

## Why Wi-Fi ADB remains attended

 The modern route deliberately preserves the headset's protected approval.
 A successful sequence has several distinct facts:

- Fleet freezes the exact enrolled target and obtains command authorization.

- The pinned File Manager provider resolves private connection details without exposing them to Fleet.

- Kiosk asks Android to present the wireless-debugging request.

- The wearer puts on the headset and approves Meta's protected prompt.

- An on-device Termux check uses loopback ADB and observes uid=2000(shell) .

- The Rusty Quest Fleet Agent signs the fresh capability evidence into its next enrolled check-in.

- Fleet admits that signed owner evidence before reporting an effective usable shell.

 A request receipt, visible prompt, open port, ADB process, or provider exit code
 can describe progress, but none is interchangeable with the final signed shell
 capability.

## Provider descriptions are not permissions

 Fleet can ask a known, locally configured provider for bounded
 --describe-json metadata. The catalog can show a provider's
 identity, contract version, advertised actions, artifact digest, freshness,
 and validation result.

### What discovery may do

- Explain which independently installed owner supplies a capability.

- Reject malformed, stale, unexpected, or incorrectly pinned descriptions.

- Present unconfigured, unavailable, descriptive, stale, and rejected states consistently in Console, CLI, and API.

### What discovery may never do

- Turn a path, action name, or provider-supplied command line into dynamic execution.

- Claim that a provider is authorized, healthy, connected, or safe to run.

- Reveal device serials, credentials, private paths, pairing material, or hotspot secrets.

## Security and privacy checklist

- Keep enrollment keys, exact device bindings, serials, endpoints, paths, tokens, pairing material, and network secrets in private machine configuration.

- Pin provider executables and supporting tools by exact artifact identity; do not fall back to whichever executable appears on PATH .

- Require immutable preview, explicit confirmation, command authorization, owner acknowledgement, effective result, and cleanup evidence as separate stages.

- Treat missing configuration as inert. Do not auto-download, auto-pair, auto-enable, or silently widen a target cohort.

- Keep the operator API loopback-only by default and protect every separately enabled ingress according to its documented threat model.

- Never automate Meta's protected wearer confirmation or relabel a Windows/ADB observation as headset-owner proof.

## Disable, recovery, and troubleshooting

 Prefer returning to an explicit known state over retrying an effect until it
 appears to work.

### Fleet cannot see a headset

 Check enrollment, signed check-in age, device time, network reachability,
 and the Fleet Agent first. Do not assume ADB is the base monitoring route.

### Wi-Fi ADB disappears

 Reboot, network changes, authorization changes, or service loss can end
 the shell. Reconnect through the documented USB bootstrap if needed, make
 a new request, approve it in-headset, and wait for a new signed
 uid=2000(shell) proof. Never reuse an expired proof.

### Disable Wi-Fi ADB completely

 Disable the current wireless-debugging request and disable any separate
 request-after-boot policy. Confirm the owner readback and then confirm the
 signed usable-shell capability disappears or expires.

### Awake behavior persists

 Stop Windows and on-device watchdog modes, then use the explicit
 restore-normal action. A bounded Meta hold is not a permanent policy and
 must not be reported as one.

### Hotspot state is uncertain

 Refresh through the Hostess owner, inspect whether the hotspot is
 external or Fleet-owned, and use the explicit stop route only when the
 current ownership generation permits it. A provider restart invalidates
 prior ownership assumptions.

### A provider is missing or rejected

 Leave the capability unavailable. Reinstall from the matching signed
 release or correct the private pin; do not browse for a similarly named
 executable or bypass its descriptor/artifact checks.

## Independent software and wearer control

 Rusty Fleet and the related tools are independent projects and are not
 affiliated with or endorsed by Meta. Meta Quest is a trademark of Meta
 Platforms, Inc. Device protections, visible Android surfaces, and wearer
 approvals remain part of the system design.

 [Rusty Fleet source](https://github.com/MesmerPrism/rusty-fleet)
 [QuestIonAble File Manager guide](https://mesmerprism.com/QuestIonAble-File-Manager/)
 [Rusty Morphospace overview](https://mesmerprism.com/projects/rusty-morphospace.html)

## Project links

 Use the source repository for development evidence and the File Manager page for its currently published installer guidance.

- Mesmer Prism. [Rusty Fleet source repository](https://github.com/MesmerPrism/rusty-fleet). Development source and public architecture; not a signed Fleet release.

- Mesmer Prism. [QuestIonAble File Manager onboarding](https://mesmerprism.com/QuestIonAble-File-Manager/). Current File Manager download, setup, and first-device guide.
