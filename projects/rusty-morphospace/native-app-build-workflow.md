# Native App Build Workflow | Rusty Morphospace

Source: https://mesmerprism.com/projects/rusty-morphospace/native-app-build-workflow.html
Canonical HTML: https://mesmerprism.com/projects/rusty-morphospace/native-app-build-workflow.html
Generated: 2026-06-21
Description: A public onboarding guide to the Rusty Morphospace native app-build workflow: feature library, app-build specs, generated settings, feature locks, adapters, and validation.
Markdown: https://mesmerprism.com/projects/rusty-morphospace/native-app-build-workflow.md
Plain text: https://mesmerprism.com/projects/rusty-morphospace/native-app-build-workflow.txt
BibTeX references: https://mesmerprism.com/projects/rusty-morphospace/native-app-build-workflow.bib
CSL JSON references: https://mesmerprism.com/projects/rusty-morphospace/native-app-build-workflow.references.csl.json

---

Native app-build workflow

# Build only the app you meant

 Rusty Morphospace native apps are assembled from explicit feature IDs, not
 copied runtime profiles. An app-building agent starts with a source-only app
 spec, resolves the smallest feature closure, checks the generated settings
 surface, and builds the APK from a feature lock. Runtime profiles, Android
 manifests, property write plans, and build inputs are generated adapters
 around that master settings surface.

 [Workflow](https://mesmerprism.com/projects/rusty-morphospace/native-app-build-workflow.html#workflow)
 [Feature library](https://mesmerprism.com/projects/rusty-morphospace/native-app-build-workflow.html#feature-library)
 [Settings authority](https://mesmerprism.com/projects/rusty-morphospace/native-app-build-workflow.html#settings-authority)
 [Validation](https://mesmerprism.com/projects/rusty-morphospace/native-app-build-workflow.html#validation)
 [Rusty Morphospace](https://mesmerprism.com/projects/rusty-morphospace.html)
 [Rusty Quest](https://github.com/MesmerPrism/rusty-quest)

 Purpose

## Why this page exists

 The native Quest stack has grown into a real library: camera routes, display
 composite feedback, environment depth, hand surfaces, particles, SDF visuals,
 stimulus volumes, video projection, Makepad compatibility, and private
 downstream extension points. That is useful only if new APKs select features
 deliberately. A broad copied profile can silently pull in permissions,
 properties, shaders, services, or runtime markers that the target app does
 not need.

 The app-build workflow turns that risk into a contract. The app spec says
 which features are requested, which families must stay absent, which manifest
 entries are expected, and which runtime markers prove the app actually used
 the resolved settings. The resolver then produces a feature lock and generated
 app settings before anything is built.

 This is an agent-facing workflow. It is written for people and automation
 creating new native APK profiles, especially when the safest answer is a
 smaller app, not another module added to an existing stack.

### Core rule

 Start from an app-build spec and a feature ID list. Do not start from a
 nearby runtime profile, Android manifest, or launch script.

### Master artifact

 native-app-settings.json is the generated master settings surface for a
 native app profile. Other files adapt those settings to platform, build,
 and validation surfaces.

### Acceptance rule

 Raw property readback is transport evidence only. Acceptance requires the
 consuming runtime to emit the expected effective markers for the selected
 app profile.

 Workflow

## The app-building path

 The sequence is intentionally narrow. It makes feature selection, dependency
 closure, settings authority, and evidence review visible before an APK is
 installed on a headset.

 Step 1

### Choose feature IDs

 Browse fixtures/native-app-features/ by module path and request the
 smallest stable feature_id set that describes the app. Nested families
 such as particles should be selected through their explicit submodules.

 Step 2

### Write the app spec

 Create fixtures/native-app-builds/<app>.app.json . List requested
 features, denied features, expected manifest entries, expected render
 mode, settings assertions, required modules, forbidden modules, and
 runtime markers.

 Step 3

### Resolve the closure

 Run tools/Resolve-NativeAppBuild.ps1 -DryRun . The resolver validates
 schemas, follows dependencies, rejects incompatible or denied features,
 blocks high-rate JSON/property misuse, and writes generated artifacts
 under local-artifacts/native-app-builds/ .

 Step 4

### Inspect settings and lock

 Review feature-lock.json and native-app-settings.json . The settings
 file must contain every selected module, disable every forbidden module
 family, and make the selected render mode explicit.

 Step 5

### Build from the lock

 Run tools/Build-NativeRendererAndroid.ps1 -AppBuildLock ... . The APK
 build consumes the resolved lock instead of rediscovering features from
 environment variables or hand-authored launch settings.

 Step 6

### Validate the runtime

 Use static checks first, then APK build evidence, then device smoke when
 the target requires it. The final proof is the runtime marker set produced
 by the consuming app, not a property transport readback alone.

 Feature library

## What a feature descriptor owns

 A native app feature descriptor is a small public contract, not a bundle of
 arbitrary app code. It names a stable feature_id , a hierarchical
 module_path , its owner lane, its public/private boundary, and the exact
 pieces it contributes to settings, manifest, runtime profile, build inputs,
 and validation.

 Descriptors also declare dependencies, incompatibilities, exclusive groups,
 required markers, forbidden markers, assets, shaders, clear-families, and
 expected render modes. The resolver uses those fields to construct the
 transitive feature closure and to reject an app spec that tries to combine
 incompatible surfaces.

 The library is recursive so large families can stay comprehensible. A
 particle renderer does not have to imply every particle source. A camera
 route does not have to imply display-composite feedback. A Makepad
 compatibility surface does not have to enter a native-only APK unless the app
 requests it.

### Module families

- core/ for the Quest NativeActivity/OpenXR/Vulkan substrate

- background/ for mutually exclusive background render routes

- particles/private/ and particles/hand-anchor/ for nested particle capabilities

- camera/ , display/ , environment/ , hand/ , input/ , projection-target/ , sdf/ , stimulus/ , and video/ for explicit app features

- makepad/ , manifold/ , and private-layer/ for adapter or bridge surfaces that should never arrive by accident

### Descriptor fields

- feature_id and module_path identify the module

- depends_on , incompatible_with , and exclusive_groups shape the closure

- settings_surface says which master settings schema owns the result

- android_manifest , runtime_profile , and build_inputs describe generated adapters

- markers and validation describe acceptance evidence

 Nested example

## Particles are a family, not one switch

 The particle library shows why feature IDs need hierarchy. A small downstream
 private-particle canary can request a solid-black background plus the private
 particle renderer without accidentally selecting camera input, hand mesh,
 environment depth, Makepad runtime, video projection, SDF visuals, or stimulus
 volume.

 Base

### core/openxr-vulkan

 The native Quest substrate: NativeActivity, OpenXR, Vulkan, and the
 minimal manifest features required before renderer modules can run.

 Background

### background/solid-black

 A deliberately small background route that keeps compositor passthrough,
 camera projection, display composite, and video projection out of the APK.

 Private particles

### payload-slot

 A public ABI slot for a downstream payload without publishing or baking a
 project-specific data source into the platform layer.

 Private particles

### placeholder

 A deterministic placeholder compute path used when the public stack needs
 to prove the renderer route without shipping downstream content.

 Private particles

### ordering/gpu-index-remap

 Resident GPU ordering so particle layout policy is explicit instead of
 being smuggled through a broad renderer option.

 Private particles

### mask/r8-texture

 A bounded texture-mask surface that can be validated independently from
 camera, video, or environment-depth modules.

 Private particles

### tracers

 Optional trace behavior as its own feature so diagnostics and visual
 persistence do not become an implicit renderer default.

 Private particles

### renderer

 The aggregate renderer feature depends on the submodules it truly needs
 and leaves unrelated native app families disabled.

 Settings authority

## One master surface, many adapters

 Native app behavior should not be split across launch modes, Android
 properties, manifest edits, environment variables, and UI defaults. The app
 spec resolves into native-app-settings.json , and that generated settings
 file is the master surface for the selected profile.

 Runtime profile files, property plans, Android manifests, build manifests,
 and build environment values are adapters. They carry settings into the
 platform and build tools, but they do not become separate definitions of app
 behavior. If an adapter writes a value that the runtime ignores, validation
 must fail.

 This is the same authority rule used elsewhere in Rusty Morphospace: the
 local owner defines the parameter, other entry points adapt into that owner,
 and acceptance evidence comes from the consuming runtime's effective state.

### Generated from settings

- runtime profile and property write plan

- Android manifest surface

- build environment and build manifest

- expected runtime marker list

### Must stay explicit

- render mode and background route

- selected module paths and disabled module families

- permissions, services, activities, assets, and shaders

- high-rate payload transport boundaries

 Validation

## What evidence should exist before a profile is trusted

 The validation ladder keeps cheap rejection close to the source and reserves
 device work for profiles that already have coherent source contracts.

 Static

### Library and schema gates

 The feature descriptors and app specs must parse, use unique feature IDs,
 include required seed features, reject malformed descriptors, and avoid
 public/private boundary leaks in committed fixtures.

 Static

### Damaged fixtures

 Invalid app specs are first-class tests: denied feature requests,
 permission supersets, render-mode mismatches, and high-rate JSON/property
 misuse must be rejected before APK generation.

 Generated

### Feature lock review

 The lock records the exact transitive closure, selected modules, adapter
 outputs, and assertions. A build that bypasses the lock is no longer the
 app that was reviewed.

 Build

### APK from resolved inputs

 The Android build should consume only the resolved feature lock and its
 generated inputs. Build provenance should make it clear which app spec and
 feature closure produced the APK.

 Runtime

### Effective markers

 The app must emit required markers such as render mode and selected
 module state, and it must not emit forbidden markers from unrelated
 modules.

 Device

### Headset smoke when needed

 Headset validation should be serial-scoped and profile-specific. It is
 useful after static resolution, not as a substitute for source contracts.

 Agent checklist

## Before making a new APK

 A new app profile should be easy to review from its source artifacts. Someone
 reading the spec should see why each feature is present, why related features
 are absent, what settings are generated, and what runtime evidence will count
 as success.

### Do

- request feature IDs by name

- deny nearby feature families that must stay absent

- review native-app-settings.json before building

- keep high-rate payloads out of properties and JSON settings

- require effective runtime markers for acceptance

### Do not

- copy a runtime profile as the starting point for a new app

- hide app behavior in a launch mode or one-off script

- add camera, display, hand, video, Makepad, or private-layer surfaces unless requested

- treat Android property readback as runtime proof

 References

## Public source family

 The overview lives here. Source contracts, schemas, fixtures, and validation
 scripts live in the public Rusty Morphospace repositories.

### Workflow sources

- MesmerPrism. "[rusty-quest](https://github.com/MesmerPrism/rusty-quest)." Public repository for Quest platform contracts, native renderer profiles, app-build specs, feature descriptors, and validation tools.

- MesmerPrism. "[rusty-quest-makepad](https://github.com/MesmerPrism/rusty-quest-makepad)." Public repository for Quest-specific Makepad adapter profiles, effective settings, and headset app staging routes.

### Architecture context

- Mesmer Prism. "[Rusty Morphospace](https://mesmerprism.com/projects/rusty-morphospace.html)." Public overview of the Morphospace source family and architecture boundaries.

- Mesmer Prism. "[Rusty XR Legacy Reference](https://mesmerprism.com/projects/rusty-morphospace/rusty-xr.html)." Compatibility and Quest reference lane for older public Rusty XR work.
