# Bioelectricity and Morphogenesis

Source: https://mesmerprism.com/projects/bioelectricity.html
Canonical HTML: https://mesmerprism.com/projects/bioelectricity.html
Generated: 2026-06-19
Description: Bioelectricity and morphogenesis across Rusty Morphospace and Planarian Regeneration XR: source-bounded planarian teaching models, WebXR atlas controls, curated records, and observed geometry overlays.
Markdown: https://mesmerprism.com/projects/bioelectricity.md
Plain text: https://mesmerprism.com/projects/bioelectricity.txt
BibTeX references: https://mesmerprism.com/projects/bioelectricity.bib
CSL JSON references: https://mesmerprism.com/projects/bioelectricity.references.csl.json

---

Rusty Morphospace and tissue-scale patterning

# Bioelectricity and Morphogenesis

 Bioelectric morphogenesis asks how voltage-like state, tissue coupling,
 perturbations, and memory can help shape living form. The current Mesmer
 Prism line stays deliberately modest: Rusty Morphospace keeps inspectable
 educational surface-field models, while Planarian Regeneration XR turns the
 same source-boundary discipline into a WebXR-first atlas of body, graph,
 experiment record, and outcome. Observed records, educational abstractions,
 and model-inspired overlays remain separate layers.

 [Current slice](https://mesmerprism.com/projects/bioelectricity.html#current-slice)
 [Planarian XR atlas](https://mesmerprism.com/projects/bioelectricity.html#planarian-xr)
 [Showcase export](https://mesmerprism.com/projects/bioelectricity.html#showcase-export)
 [Source status](https://mesmerprism.com/projects/bioelectricity.html#source-target-status)
 [Adjacent dynamics](https://mesmerprism.com/projects/bioelectricity.html#cross-project-bridge)
 [Why planarians](https://mesmerprism.com/projects/bioelectricity.html#planarian)
 [Reference lanes](https://mesmerprism.com/projects/bioelectricity.html#reference-lanes)
 [Claim boundary](https://mesmerprism.com/projects/bioelectricity.html#boundary)
 [Rusty Morphospace](https://mesmerprism.com/projects/rusty-morphospace.html)
 [References](https://mesmerprism.com/projects/bioelectricity.html#references)

 Computational medium

## Fields, circuits, and form without overclaiming

 A planarian fragment does not only carry genes and geometry. It also carries
 physiological state across tissue: membrane potentials, gap-junction-like
 communication, wound signals, and downstream patterning responses. The
 experimental literature around planarian regeneration makes that a useful
 teaching case, because early bioelectric state can affect anterior/posterior
 polarity and regenerated head/tail outcomes
 ([Durant et al., 2019](https://doi.org/10.1016/j.bpj.2019.01.029);
 [Beane et al., 2011](https://doi.org/10.1016/j.chembiol.2010.11.012)).

 The Rusty Morphospace model does not try to become a full physiology
 simulator. It treats bioelectricity as an inspectable layer over a stable
 surface graph: sample nodes on a body mesh, conductance edges between
 neighboring samples, normalized voltage state, perturbation bands, memory
 state, and readout fields. This is enough to teach the architecture of a
 tissue-scale model while leaving calibrated wet-lab prediction outside the
 current claim.

 Current slice

## Rusty Matter owns dynamics; Rusty Optics owns inspection

 Within Rusty Morphospace, the useful boundary is simple: Matter computes the
 state; Optics prepares views and browser inspection; Manifold is deferred
 until commands, sessions, packages, and audit surfaces need to become
 first-class.

 Matter now carries compact source/target anchor IDs inside the planarian
 scenario metadata. Those anchors identify which publication target shaped a
 scenario; they do not turn the current fixtures into source-fitted
 physiological predictions.

 Simulation truth

### [Rusty Matter](https://github.com/MesmerPrism/rusty-matter)

 Matter owns mesh-surface samples, scalar and vector fields,
 bioelectric circuit state, deterministic stepping, edit results, schema
 fixtures, validation, and Wasm runtime exports.

 Current model
 Planarian AP bioelectric surface field
 State
 Normalized voltage, conductance, memory, readouts
 Claim
 Qualitative educational dynamics

 [Repository](https://github.com/MesmerPrism/rusty-matter)

 Visual contracts

### [Rusty Optics](https://github.com/MesmerPrism/rusty-optics)

 Optics owns renderer-neutral frames, color policy, pick/edit-intent
 contracts, readout panels, activity layers, conductance-edge picking,
 and browser presentation over Matter-owned payloads.

 Current view
 Browser Planarian 3D preview
 Interaction
 Node edits, edge gates, neighborhood brush
 Telemetry
 Split sim, view, render, and UI timing

 [Repository](https://github.com/MesmerPrism/rusty-optics)

 Deferred authority

### [Rusty Manifold](https://github.com/MesmerPrism/rusty-manifold)

 Manifold is the later lane for commands, sessions, packages, reproducible
 edit traces, and audit. It should request Matter work; it should not own
 field arrays or circuit dynamics.

 Status
 Deferred for this slice
 Future use
 Commands, package descriptors, session audit
 Boundary
 Control plane, not simulation state

 [Repository](https://github.com/MesmerPrism/rusty-manifold)

 Planarian XR atlas

## Observed, curated, and educational layers stay separated

 Planarian Regeneration XR is the WebXR-first atlas surface for this
 biological teaching case. Its central loop is body to graph to experiment
 record to regeneration outcome. The app now carries a reviewed PlanformDB
 subset with 20 selected source records and 54 outcome details, bundled
 observed posterior and anterior muscle SpatialGraph GLB line overlays derived
 from the Zenodo ETLSM dataset, and one registered model-inspired schematic replay manifest for the
 Sketchfab educational mesh. The observed Zenodo GLBs are not simulation
 substrates. A validation chain keeps source files, raw downloads, decoder
 tooling, and conversion intermediates outside the public bundle
 ([PlanformDB](https://lobolab.umbc.edu/planform/download/);
 [Lu, 2024](https://zenodo.org/records/11724834)).

 The atlas can enter WebXR and the non-XR browser flow remains complete:
 anatomy selection, graph synchronization, cut controls, lazy source-record
 loading, provenance panels, graph export, screenshots, and explicit
 educational/source-backed labels. That does not make the atlas a live
 regeneration simulator.

 The current app opens in a Source Atlas mode with the reviewed Zenodo GLBs
 hotlisted by default, then separates Records, Layers, Model Replay, and
 Teaching as secondary evidence modes. Pending lanes for PlanformDB record
 browsing/filters, Zenodo 12533272 , observed-geometry dynamics, and
 Quest Browser validation remain statused rather than central.

 Data layers

### Source-bounded atlas records

 The app separates observed geometry, curated literature/database records,
 model-inspired overlays, and educational abstractions at the dataset
 schema level.

 Observed
 Zenodo posterior and anterior muscle SpatialGraph GLB line overlays
 Curated
 20 reviewed PlanformDB Experiment records with 54 outcome details
 Educational
 Procedural body, field overlays, lessons, and schematic transitions
 Replay
 One model-inspired adapter manifest bound only to the Sketchfab educational mesh

 Interaction

### Body, graph, cut, and outcome loop

 Anatomy nodes, graph nodes, cut states, perturbations, records, outcomes,
 field overlays, and lessons are all inspectable without hiding their
 evidence type or visualization status.

 Desktop/mobile
 Full atlas controls and source-aware panels
 Modes
 Source Atlas, Records, Layers, Model Replay, and Teaching
 Immersive
 WebXR entry with controller selection seams
 Export
 Graph JSON and screenshot evidence paths

 Validation

### Public bundle checks before claims

 The local readiness chain validates data references, geometry notices,
 source labels, build output, public asset boundaries, and the documented
 implementation-plan gates before a build is treated as coherent.

 Passed
 Data validation, geometry QA, production build, and public metadata scan
 Formal gate
 Headset evidence remains a separate Quest Browser report step
 Limit
 No raw microscopy, PlanformDB database, or source conversion artifacts are bundled

 Showcase export

## Validated Planarian 3D surface and graph loops

 These exports show the current Optics-owned preview/export path over
 Matter-owned synthetic educational state: a 720-node planarian graph, opaque
 body material, neon RGB activity/readout color, stable portrait framing, and a
 seamless reset-activity showcase loop. The animation is a visual teaching
 mode for surface-field inspection, not a calibrated planarian physiology
 trace.

 Both GIFs were generated at the exact export size and decoded after export as
 96-frame, 720 x 860 animations at 12 fps. The surface view emphasizes the
 body field; the graph view exposes the same activity through node and edge
 structure. The public assets match the latest Optics export smoke outputs.

 Adjacent dynamics

## A side source for dynamics, not the center of the work

 Bioelectricity matters to Mesmer Prism because it gives another concrete
 vocabulary for multi-level patterning: voltage-like fields, conductance,
 gap-junction-like coupling, perturbation, memory, readout, repair, and
 target-state change. In Michael Levin's broader framing, cells, tissues, and
 organs are not passive materials. They are nested problem-solving systems whose
 physiological networks help navigate anatomical morphospace
 ([Levin, 2023a](https://doi.org/10.1007/s00018-023-04790-z);
 [Levin, 2023b](https://doi.org/10.1007/s10071-023-01780-3)).

 That does not make Plasmatic Multitudes, Mixed-Ability HSI, or Rusty
 Morphospace biological projects. The useful transfer is more constrained:
 bioelectric morphogenesis suggests synthetic dynamics for fields, coupling,
 memory, regeneration-like repair, and multi-scale agency. Those dynamics can
 inspire virtual swarm bodies or educational prosthetic/biotech questions later,
 while the current implementation remains a source-linked teaching model rather
 than a medical, prosthetic, or wet-lab system
 ([Levin, 2021](https://doi.org/10.1016/j.cell.2021.02.034);
 [Levin, 2022](https://doi.org/10.3389/fnsys.2022.768201)).

 DiffeoMorph belongs on this adjacent side too: the paper
 [DiffeoMorph: Learning to Morph 3D Shapes Using Differentiable Agent-Based Simulations](https://arxiv.org/abs/2512.17129)
 and the
 [hormoz-lab/diffeomorph implementation](https://github.com/hormoz-lab/diffeomorph)
 are useful for target-shape metrics and learned many-agent controllers, but
 they are not bioelectric or planarian physiology sources.

### Useful transfer

- Fields and coupling as dynamic material rules.

- Memory and readout as state, not only appearance.

- Repair as a system-level process, not only undo.

- Target states as navigable morphospace regions.

### Boundary

 Current public work uses bioelectricity as a qualitative dynamics source
 and implementation test case for Rusty Matter and Rusty Optics. Any future
 prosthetic, regenerative, or biotech claim would need a separate evidence,
 ethics, and validation path.

 Source status

## Matched to original sources, but not calibrated yet

 The current implementation is source-linked at the target level. Two source
 families already have qualitative Matter fixtures, and the derived
 PlanformDB/metric/taxonomy layer now has a curated provenance fixture mirrored
 into Matter. Planarian Regeneration XR carries a reviewed PlanformDB subset,
 reviewed observed GLB overlays for posterior and anterior muscle SpatialGraph
 objects, and a Quest Browser validation lane that needs a refreshed headset
 pass whenever the production build changes.
 Remaining targets are intentionally planned until source figures, tables,
 categories, or datasets have been extracted into derived, rights-safe
 artifacts.

 Target
 Original sources
 Current implementation
 Status

 ap_transient_memory
 [Durant et al., 2019](https://doi.org/10.1016/j.bpj.2019.01.029)
 Matter transient-depolarization memory scenario plus no-memory control; Optics can display the resulting sequence.
 Qualitative fixture exists; numeric timing/value targets still need source extraction.

 gap_block_conductance
 [Oviedo et al., 2010](https://doi.org/10.1016/j.ydbio.2009.12.012); [Emmons-Bell et al., 2015](https://doi.org/10.3390/ijms161126065)
 Matter gap-block scenario reduces cross-band conductance and records outcome traces.
 Qualitative fixture exists; figure/table targets still need extraction before thresholds.

 head_vs_tail_voltage
 [Beane et al., 2011](https://doi.org/10.1016/j.chembiol.2010.11.012)
 Represented only as normalized AP voltage and head/tail readout context.
 Planned annotation layer; no named ion-channel or millivolt claim yet.

 head_size_scaling
 [Beane et al., 2013](https://doi.org/10.1242/dev.086900)
 Normalized region-extent metrics exist for annotation and validation fixtures.
 No calibrated organ-size or physical morphometry claim yet.

 species_like_head_labels
 [Emmons-Bell et al., 2015](https://doi.org/10.3390/ijms161126065)
 Synthetic species-like head-shape taxonomy fixture exists for educational labeling.
 Non-calibrated; generated labels avoid paper figure reuse.

 planformdb_curated_subset
 [PlanformDB](https://lobolab.umbc.edu/planform/download/); [Lobo et al., 2013](https://doi.org/10.1093/bioinformatics/btt088)
 Rights-safe derived fixture records 14 selected Oviedo 2010 source IDs covering octanol crop-position, ventral nerve cord timing, and innexin RNAi crop-position labels, with transform notes, notice text, and use limits.
 Expanded review fixture exists in Hub and Matter; metadata/annotation only, not runtime dynamics authority or a predictor.

 zenodo_muscle_spatialgraph_overlays
 [Lu, 2024](https://zenodo.org/records/11724834); [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/)
 Planarian Regeneration XR bundles reviewed GLB line overlays derived from posterior.Smt.SptGraph and anterior-filtered(2).CorrelationLines : 61,744 / 17,880 vertices, 30,872 / 8,940 line segments, SHA-256 daab05fbf234bb6db8b6618520982c1d159ca553a067825eba42929449478a2f and aa462e4141be28a5f7bb5d187a7b074a945815f19d3397110e90a8e102428ac7 , source DOI/object IDs, attribution, and geometry notice.
 Observed source-derived atlas geometry only; raw Zenodo files, source exports, decoder tooling, and conversion intermediates remain outside the public bundle, and the overlays are not a regeneration simulation.

 zenodo_12533272_volume_record
 [Lu, 2024 dataset2](https://zenodo.org/records/12533272); [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/)
 Intake evidence only. This Zenodo TLSM volume record has no reviewed browser-safe GLB derivative bundled in Planarian Regeneration XR.
 Deferred; no source volume, source export, intermediate, decoder output, or GLB derivative from this record is published in the current public bundle.

 planarian_xr_schematic_replay_manifest
 Planarian XR schematic transition adapter; Sketchfab educational mesh substrate
 The app registers sim_schematic_regeneration_replay_v0 , a model-inspired adapter descriptor for src/worm/RegenerationAnimator with a SHA-256 replay-descriptor hash.
 Display replay only. It is not calibrated, mechanistic, predictive, or bound to the observed Zenodo GLB overlays.

 Why planarians

## A compact biological teaching case

 Planarians are useful here because regeneration is spatially legible. A
 transverse cut gives a wound band, an anterior/posterior axis, and a clear
 readout problem: head-like and tail-like identity must resolve in the right
 places. Experimental work gives qualitative constraints for an educational
 model, including gap-junction-mediated polarity effects and persistent
 altered morphology after transient perturbations
 ([Oviedo et al., 2010](https://doi.org/10.1016/j.ydbio.2009.12.012);
 [Emmons-Bell et al., 2015](https://doi.org/10.3390/ijms161126065)).

 The first scenarios therefore stay simple: baseline anterior/posterior
 separation, transverse-cut wound response, conductance-block perturbation,
 transient depolarization with memory, and a no-memory control. Those
 scenarios are not meant to predict a real animal. They are checks that the
 model can express the right kind of tissue-scale relationship before any
 calibrated source data is introduced.

 Head size and organ scaling studies add another useful lesson: voltage-like
 state can be read as an instructive patterning variable, not just a passive
 byproduct of cell state
 ([Beane et al., 2013](https://doi.org/10.1242/dev.086900)).
 In the current model, that idea appears as readout fields driven by normalized
 voltage and memory state.

### Qualitative checks

- Anterior and posterior readouts separate in the baseline state.

- Wound response stays localized to the cut band.

- Gap-block scenarios change cross-band conductance and field spread.

- Transient perturbation persists when memory is enabled.

- No-memory controls relax toward baseline.

### Current unit policy

 Voltage is normalized in the current educational layer. Calibrated
 millivolt claims require a separate source, unit, and validation gate.

 Reference lanes

## Legacy projects feed the Morphospace line

 The older planarian and xenobot work is useful, but it should not become an
 uncontrolled runtime authority for the Rusty Morphospace implementation.
 Planarian Regeneration XR is the current atlas surface for the planarian side
 of that boundary.

 Planarian reference

### Planarian Regeneration XR atlas

 The planarian atlas contributes educational region labels, body geometry
 lessons, outcome labels, source/provenance habits, reviewed PlanformDB
 records, and observed source-derived posterior and anterior muscle
 overlays.
 Matter still builds its own computational surface graph and validation
 fixtures.

 Use now
 Region semantics, reviewed records, geometry review, outcome labels
 Not used as
 Mechanistic predictor or runtime physiology authority

 Xenobot reference

### Xenobot simulator planning

 The xenobot planning material frames later body-surface and behavior
 questions. It is not the first implementation target. The current path
 builds a generic surface-field substrate first, then leaves locomotion,
 cilia, hydrodynamics, fabrication, and full xenobot simulation for later.

 Use now
 Planning vocabulary and future expansion pressure
 Not used as
 First runtime or wet-lab simulator

 Computational morphogenesis reference

### [DiffeoMorph](https://arxiv.org/abs/2512.17129)

 DiffeoMorph supplies public reference material for many-agent target-shape
 learning, shape-matching metrics, and robustness vocabulary. It can inform
 future Rusty Morphospace validation language without becoming a source for
 the planarian bioelectric model.

 Use later
 Target-shape metrics and many-agent control vocabulary
 Not used as
 Bioelectric physiology evidence or planarian runtime authority

 [Paper](https://arxiv.org/abs/2512.17129)
 [Official code](https://github.com/hormoz-lab/diffeomorph)

 Curated metadata source

### [Planform / PlanformDB](https://lobolab.umbc.edu/planform/)

 PlanformDB now enters through a reviewed, rights-safe metadata subset:
 selected experiment/result IDs, 54 outcome details, normalized labels, source
 notices, and transform notes across 12 source publication IDs. It remains
 annotation and validation context, not raw runtime authority or a shortcut to
 calibrated physiology.

 Use now
 Traceable source IDs, labels, and review metadata
 Use later
 Broader phenotype targets after curated provenance review

 [Planform page](https://lobolab.umbc.edu/planform/)

 Discovery map

### [Bioelectricity Nexus](https://bioelectricitynexus.com/)

 Bioelectricity Nexus is useful for field navigation: papers, tools,
 researchers, and resource leads such as BETSE and PlanMine. It is a
 discovery source, not primary evidence for the biological claims on this
 page.

 Use now
 Find source and tool leads
 Gate needed
 Primary-source and license review

 [Nexus](https://bioelectricitynexus.com/)
 [BETSE](https://github.com/betsee/betse)
 [PlanMine](https://planmine.mpibpc.mpg.de/)

 Claim boundary

## What this model does not claim

 The current implementation is not [BETSE](https://github.com/betsee/betse),
 a named-ion-channel simulator, a wet-lab planning system, a calibrated
 PlanformDB predictor, or a full xenobot/anthrobot world model. It uses
 normalized state and synthetic scenarios to make tissue-scale relationships
 visible before the project takes on heavier physiology or real-data claims.

 That boundary is an engineering choice. It keeps the page readable, keeps
 code ownership clear, and avoids presenting educational dynamics as empirical
 prediction. The current PlanformDB slice is deliberately metadata-only. More
 detailed source-derived work can be added later when source IDs, license
 notices, transformations, and validation targets are explicit. The observed
 Zenodo muscle overlays are atlas geometry layers, not anatomical models of
 regeneration; source-paper figures, raw datasets, decoder tooling, source
 exports, and conversion intermediates should remain outside the public page
 unless rights and provenance have been reviewed.

### Next public-safe steps

- Expose scenario source/target anchors in the browser-facing teaching UI.

- Add a teaching panel for AP separation, wound localization, gap block, and memory controls.

- Make voltage-unit policy explicit per preset.

- Keep expanding PlanformDB only through small, traceable, rights-safe derived fixtures.

- Keep Quest Browser evidence current before making broader immersive validation claims.

- Design the immersive 3D environment after the atlas/data boundaries remain stable.

 References

## Sources and public project surfaces

- Levin. "[Bioelectric Signaling: Reprogrammable Circuits Underlying Embryogenesis, Regeneration, and Cancer](https://doi.org/10.1016/j.cell.2021.02.034)." Cell 184(8) (2021).

- Levin. "[Technological Approach to Mind Everywhere: An Experimentally-Grounded Framework for Understanding Diverse Bodies and Minds](https://doi.org/10.3389/fnsys.2022.768201)." Frontiers in Systems Neuroscience 16 (2022).

- Levin. "[Darwin's Agential Materials: Evolutionary Implications of Multiscale Competency in Developmental Biology](https://doi.org/10.1007/s00018-023-04790-z)." Cellular and Molecular Life Sciences 80 (2023).

- Levin. "[Bioelectric Networks: The Cognitive Glue Enabling Evolutionary Scaling from Physiology to Mind](https://doi.org/10.1007/s10071-023-01780-3)." Animal Cognition 26 (2023).

- Durant et al. "[The role of early bioelectric signals in the regeneration of planarian anterior/posterior polarity](https://doi.org/10.1016/j.bpj.2019.01.029)." Biophysical Journal 116 (2019).

- Beane et al. "[A chemical genetics approach reveals H,K-ATPase-mediated membrane voltage is required for planarian head regeneration](https://doi.org/10.1016/j.chembiol.2010.11.012)." Chemistry & Biology 18 (2011).

- Oviedo et al. "[Long-range neural and gap junction protein-mediated cues control polarity during planarian regeneration](https://doi.org/10.1016/j.ydbio.2009.12.012)." Developmental Biology 339 (2010).

- Beane et al. "[Bioelectric signaling regulates head and organ size during planarian regeneration](https://doi.org/10.1242/dev.086900)." Development 140 (2013).

- Emmons-Bell et al. "[Gap junctional blockade stochastically induces different species-specific head anatomies in genetically wild-type Girardia dorotocephala flatworms](https://doi.org/10.3390/ijms161126065)." International Journal of Molecular Sciences 16 (2015).

- Grodstein and Levin. "[A Computational Approach to Explaining Bioelectrically-induced Persistent, Stochastic Changes of Axial Polarity in Planarian Regeneration](https://doi.org/10.1089/bioe.2021.0036)." Bioelectricity 4 (2022).

- Lobo, Malone, and Levin. "[Planform: an application and database of graph-encoded planarian regenerative experiments](https://doi.org/10.1093/bioinformatics/btt088)." Bioinformatics 29 (2013).

- Lobo Lab. "[PlanformDB download page](https://lobolab.umbc.edu/planform/download/)." University of Maryland, Baltimore County.

- Lu, Jing. "[3D Reconstruction of Neuronal Allometry and Neuromuscular Projections in Asexual Planarians Using Expansion Tiling Light Sheet Microscopy dataset1](https://zenodo.org/records/11724834)." Zenodo dataset, version v1 (2024). DOI: 10.5281/zenodo.11724834.

- Lu, Jing. "[3D Reconstruction of Neuronal Allometry and Neuromuscular Projections in Asexual Planarians Using Expansion Tiling Light Sheet Microscopy dataset2](https://zenodo.org/records/12533272)." Zenodo dataset, version v1 (2024). DOI: 10.5281/zenodo.12533272.

- Creative Commons. "[Attribution 4.0 International (CC BY 4.0)](https://creativecommons.org/licenses/by/4.0/)." License text.

- Bioelectricity Nexus. "[Bioelectricity Nexus](https://bioelectricitynexus.com/)." Field resource index.

- BETSE. "[Bioelectric Tissue Simulation Engine](https://github.com/betsee/betse)." Open-source software repository.

- PlanMine. "[PlanMine planarian database](https://planmine.mpibpc.mpg.de/)." Public resource lead.

- Pahng et al. "[DiffeoMorph: Learning to Morph 3D Shapes Using Differentiable Agent-Based Simulations](https://arxiv.org/abs/2512.17129)." arXiv 2512.17129 (submitted 2025; revised 2026).

- hormoz-lab. "[diffeomorph](https://github.com/hormoz-lab/diffeomorph)." Official implementation repository for the DiffeoMorph paper.

- Mesmer Prism. "[Rusty Morphospace](https://mesmerprism.com/projects/rusty-morphospace.html)." Public project page.

- MesmerPrism. "[Rusty Matter](https://github.com/MesmerPrism/rusty-matter)." GitHub repository.

- MesmerPrism. "[Rusty Optics](https://github.com/MesmerPrism/rusty-optics)." GitHub repository.
