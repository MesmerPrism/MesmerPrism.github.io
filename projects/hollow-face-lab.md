# Hollow Face Lab

Source: https://mesmerprism.com/projects/hollow-face-lab.html
Canonical HTML: https://mesmerprism.com/projects/hollow-face-lab.html
Generated: 2026-05-26
Description: Hollow Face Lab maps WebGL, WebXR, and Rusty XR implementation choices against hollow-face and depth-inversion research.
Markdown: https://mesmerprism.com/projects/hollow-face-lab.md
Plain text: https://mesmerprism.com/projects/hollow-face-lab.txt
BibTeX references: https://mesmerprism.com/projects/hollow-face-lab.bib
CSL JSON references: https://mesmerprism.com/projects/hollow-face-lab.references.csl.json

---

Depth inversion and research tooling

# Hollow Face Lab

 The hollow-face and hollow-mask illusion exposes a difficult boundary
 between bottom-up depth cues and top-down face interpretation. Hollow
 Face Lab treats that boundary as an instrument problem: a concave face
 stimulus has to run flat in a browser, enter WebXR where supported,
 and later connect with Rusty XR / OpenXR lab runtimes
 while preserving source-traceable variables.
 The goal is to make the hollow-face illusion testable in browser and XR
 settings, not merely to show a convincing illusion.
 Public use starts with comparing how concavity, texture, lighting,
 stereo/XR status, and response timing change the illusion.

 [Evidence map](https://mesmerprism.com/projects/hollow-face-lab.html#source-map)
 [Implementation](https://mesmerprism.com/projects/hollow-face-lab.html#implementation)
 [References](https://mesmerprism.com/projects/hollow-face-lab.html#references)
 [Rusty XR](https://mesmerprism.com/projects/rusty-xr.html)

 Instrument problem

## From illusion demo to instrument

 The hollow-face illusion is useful because a concave face can be experienced
 as convex even when some depth cues point the other way. The app is therefore
 being built around logged variables rather than a single polished visual trick:
 mesh identity, concavity, texture/noise, lighting, material, stereo/XR status,
 local probes, response timing, and runtime quality all need to survive export.

 Published sources and implementation choices have to stay separate:
 evidence can support variables and caveats without turning every
 design idea into an established finding.

### Source-backed variables

- Orientation, face familiarity, pigmentation, and shading.

- Realistic face texture versus random-dot or noise texture.

- Stereo, motion parallax, depth scaling, and local probe targets.

- Perceptual report, slow action, rapid action, and vergence as separable channels.

### Open design variables

- Triangle-particle surfaces and mesh oversampling as gestalt manipulations.

- Feature apertures around eyes, mouth, and nostrils.

- Shadow-factorial and specular-reflection conditions.

- Rights-reviewed face-mesh families beyond the V0 baseline mesh.

 Implementation stack

## Flat web, WebXR, and Rusty XR

 V0 is a Three.js/WebGL browser app with WebXR session detection and flat-web
 fallback. It currently uses the Apache-2.0 MediaPipe canonical face OBJ as a
 neutral runtime baseline. That asset is useful for topology, UVs, and
 coordinate mapping, but it is not being presented as an accepted hollow-face
 research mesh.

 The longer-term stack keeps three evidence tiers separate: flat browser use for
 public/low-control tasks, WebXR for browser-based immersive sessions where
 supported, and a later lab-native Rusty XR / OpenXR lane for controlled HMD
 studies, action endpoints, eye tracking, and timing-sensitive instrumentation.

### Current V0 controls

- Concave/convex face mode and concavity depth scale.

- Lighting presets with explicit key, fill, ambient, and reflectance values.

- Feature aperture modes for eyes, mouth, and nostrils.

- Native and oversampled mesh resolutions.

- Continuous mesh and triangle-particle rendering.

- Global and local response logging with confidence and timing.

### Study scope

- No diagnostic, therapeutic, or psychosis-prediction claim.

- No unsupervised strobe or physiology module in V0.

- No third-party asset import without a license and provenance note.

- No silent pooling of flat-web, WebXR, and lab-native data.

 References

## Current references

 These links anchor the current implementation map. Some sources support
 scientific variables; others support asset provenance or runtime
 standards.

### Hollow-face research

- Hill and Johnston. "[The hollow-face illusion: Object-specific knowledge, general assumptions or properties of the stimulus?](https://ro.uow.edu.au/ndownloader/files/50499303)" Perception , 2007.

- Krolikzak, Heard, Goodale, and Gregory. "[Dissociation of perception and action unmasked by the hollow-face illusion.](https://www.uwo.ca/bmi/goodalelab/pdf/hollow_face.pdf)" Brain Research , 2006.

- Grosjean, Rinkenauer, and Jainta. "[Where Do the Eyes Really Go in the Hollow-Face Illusion?](https://journals.plos.org/plosone/article?id=10.1371/journal.pone.0044706)" PLOS ONE , 2012.

- Keane, Silverstein, Wang, and Papathomas. "[Reduced Depth Inversion Illusions in Schizophrenia Are State-Specific and Occur for Multiple Object Types and Viewing Conditions.](https://ruccs.rutgers.edu/faculty/pylyshyn/Proseminar13/Keane-Papathomas_Depth-Schizophrenia_JournAbn.pdf)" Journal of Abnormal Psychology , 2013.

- Farkas, Papathomas, Silverstein, Kourtev, and Papayanopoulos. "[Dynamic 3-D computer graphics for designing a diagnostic tool for patients with schizophrenia.](https://pmc.ncbi.nlm.nih.gov/articles/PMC5156401/)" The Visual Computer , 2016.

### Implementation and provenance

- Google AI Edge / MediaPipe. "[canonical_face_model.obj](https://github.com/google-ai-edge/mediapipe/blob/master/mediapipe/modules/face_geometry/data/canonical_face_model.obj)" and "[Apache-2.0 license route](https://github.com/google-ai-edge/mediapipe/blob/master/LICENSE)."

- W3C Immersive Web Working Group. "[WebXR Device API.](https://www.w3.org/TR/webxr/)" Candidate Recommendation Draft.

- MDN Web Docs. "[WebXR Device API.](https://developer.mozilla.org/en-US/docs/Web/API/WebXR_Device_API)" Browser support and secure-context notes.

- Khronos Group. "[glTF 2.0 Specification.](https://registry.khronos.org/glTF/specs/2.0/glTF-2.0.html)" Runtime-neutral 3D asset format.

- Khronos Group. "[OpenXR Registry.](https://registry.khronos.org/OpenXR/)" Native XR runtime route for later lab builds.

- Michael Bach. "[Rotating face mask.](https://michaelbach.de/ot/fcs-hollowFace/)" Teaching/demo reference, not an implementation source to copy.
