# Notices and provenance

The browser port is authored for MesmerPrism / Till Holzapfel. The selected browser subset, including same-axis neighbour coupling, was authorized for public implementation by the project owner on 5 November 2026. Excluded coupling behavior is not included in this source or its generated bundle. No source history from the native application is imported.

The hand skinning, compact-joint expansion, pinned surface sampling, same-axis numerical reference and stimulus constants are adapted from the Study 6 runtime source at `c5c2d4982bced5aeaf2d312f8fc31acd95134a20` (read through documentation-only descendant `7f442a9645aebb2f8c8cb74b31bfabbff29d7c38`). That project declares AGPL-3.0-only. The port uses no Android or Meta Spatial SDK dependencies.

The runtime hand rig and sample assets retain the Rusty Quest inventory lineage `2d00b3d5259b6208ab6082734335217d91e919ae`; particle graphs, sphere values and mask retain the mesh-runtime lineage `bda7522b16f91c1873d1e34e0d13ef595b4e584a`. Exact source names and per-file SHA-256 values are recorded in the three asset manifests and the two provenance documents. These are runtime bind assets, not raw hand-motion recordings. User authorization of this subset does not assert a broader license for upstream SDK assets.

The original mesh browser app supplied the instanced WebGL billboard pattern; Hollow Face Lab supplied the Three.js XR session pattern; Optics supplied the neutral particle-frame separation; and the Viscereality browser tuner informed the separated GPU-state/draw layout. The mixed tuner shader, private experiments, participant data, audio, raw motion captures, credentials, signing material and APKs are not copied.

Three.js is MIT-licensed. Vite and its tooling retain their own dependency licenses. The lockfile fixes the delivered dependency versions. System fonts are used without external font downloads.
