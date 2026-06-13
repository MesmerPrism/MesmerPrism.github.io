# Strobotorch Android Signal Tooling

Source: https://mesmerprism.com/Strobotorch/
Canonical HTML: https://mesmerprism.com/Strobotorch/
Generated: 2026-06-13
Description: Strobotorch is an Android flashlight-signaling and diagnostics tool for torch and camera APIs, visible-light signal tests, device logging, and flashing-light safety.
Markdown: https://mesmerprism.com/Strobotorch/index.md
Plain text: https://mesmerprism.com/Strobotorch/index.txt
BibTeX references: https://mesmerprism.com/Strobotorch/index.bib
CSL JSON references: https://mesmerprism.com/Strobotorch/index.references.csl.json

---

Flashlight signaling safety

# Strobotorch

 Strobotorch is an Android flashlight signaling and diagnostics tool. It uses
 torch and camera APIs for visible-light signal experiments, device-behavior
 logging, visual signal encoding and decoding, and safety
 documentation.

 [Read the safety guide](https://mesmerprism.com/Strobotorch/flashing-light-safety/)
 [Scope](https://mesmerprism.com/Strobotorch/project-boundary/)
 [Sources](https://mesmerprism.com/Strobotorch/sources/)
 [V1 model context](https://mesmerprism.com/projects/bressloff-v1-form-constants.html)
 [Safety limits](https://mesmerprism.com/Strobotorch/#boundaries)
 [Permissions](https://mesmerprism.com/Strobotorch/#permissions)

## Safety Limits

### Do Not Stare Into The Flashlight

 Bright rhythmic flicker can produce discomfort, migraine symptoms,
 disorientation, visual hallucination-like effects, and photosensitive
 seizures in susceptible people. Strobotorch should be pointed away from
 faces, eyes, animals, traffic, reflective surfaces, and anyone who has not
 consented to possible exposure.

### Direct Viewing Cap

 The direct-viewing path is capped at 3 Hz. Higher requested rates, including
 point-away 40 Hz and 60 Hz diagnostics, are command-rate requests only. They
 are not proof of measured optical LED output.

### Source Background

 The public guide summarizes seizure-risk guidance, stroboscopic
 hallucination research, the Hewitt et al. historical review, 10 Hz
 Ganzflicker/flicker work, 40 Hz gamma-sensory-stimulation research, and
 the newer 60 Hz visual-neurostimulation line. The
 [Bressloff V1 page](https://mesmerprism.com/projects/bressloff-v1-form-constants.html)
 provides a separate model context for geometric hallucination planforms.
 The
 [source library](https://mesmerprism.com/Strobotorch/sources/) lists the academic
 citations and public registries behind that safety discussion.

## Related But Separate Work

 Strobotorch is Android flashlight-signaling and diagnostics tooling. Patterned
 light, Bressloff V1 models, and Brain Candy are related context, but this app
 remains focused on torch/camera APIs, visible-light signal tests, device
 logging, and flashing-light safety.

### Scope

 Strobotorch is independent from
 [Brain Candy](https://braincandyapp.com/).
 It is not a hallucination, meditation, psychedelic, wellness, medical,
 clinical, or brainwave-entrainment tool.

### Engineering Focus

 Strobotorch is about Android torch APIs, camera diagnostics, visual signal
 encoding, visual signal decoding, device variance, capture artifacts, and
 clear notes on what phone hardware and public Android APIs can measure.

## Public Code And License

 Strobotorch is intended to be a public MIT-licensed Android project. The app
 source and project documentation use the MIT License; Android, Kotlin, Gradle,
 AndroidX, Jetpack Compose, JUnit, org.json, and kotlinx.coroutines remain under
 their own upstream licenses.

 Source code:
 [github.com/MesmerPrism/Strobotorch](https://github.com/MesmerPrism/Strobotorch).

## Permissions

 The default flashlight path does not request Android camera permission. Audio
 Reactive Mode may request microphone permission to compute local audio features
 such as loudness, band energy, onset confidence, and timing. Playback capture also
 requires Android's screen/audio capture consent because Android routes capturable
 app playback through MediaProjection.

 The app explains these requests before Android shows its permission screen. Raw
 audio samples are discarded after feature extraction by default.
