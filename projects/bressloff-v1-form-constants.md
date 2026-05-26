# Bressloff V1 Form Constants

Source: https://mesmerprism.com/projects/bressloff-v1-form-constants.html
Canonical HTML: https://mesmerprism.com/projects/bressloff-v1-form-constants.html
Generated: 2026-05-26
Description: Animated notes on Bressloff visual-cortex form constants, Rule flicker modeling, and generated MacKay, Bolelli, and Nicks driven-field diagnostics.
Markdown: https://mesmerprism.com/projects/bressloff-v1-form-constants.md
Plain text: https://mesmerprism.com/projects/bressloff-v1-form-constants.txt
BibTeX references: https://mesmerprism.com/projects/bressloff-v1-form-constants.bib
CSL JSON references: https://mesmerprism.com/projects/bressloff-v1-form-constants.references.csl.json

---

Visual cortex and form constants

# Bressloff V1 Form Constants

 Use this page to compare animated V1 planforms with classic form-constant
 shapes: tunnels, spirals, cobwebs, lattices, and honeycombs.
 The Bressloff visual-cortex model gives a concrete way to ask how
 simple activity patterns in primary visual cortex could appear as
 tunnels, spirals, cobwebs, lattices, and honeycombs after the
 retino-cortical map. The useful test is modest and visual: choose a
 cortical planform, transform it through the visual-field map, and see
 whether the named Kluver-like form appears
 ([Bressloff et al., 2002](https://doi.org/10.1162/089976602317250861)).

 [Animated figures](https://mesmerprism.com/projects/bressloff-v1-form-constants.html#animated-figures)
 [Model deep dive](https://mesmerprism.com/projects/bressloff-v1-form-constants-deep-dive.html)
 [After Rule](https://mesmerprism.com/projects/bressloff-v1-form-constants.html#after-rule)
 [Driven reports](https://mesmerprism.com/projects/bressloff-v1-form-constants.html#driven-reports)
 [Source-target registry](https://mesmerprism.com/projects/bressloff-v1-form-constants.html#paper-calibration)
 [Source code](https://github.com/MesmerPrism/bressloff-v1-form-constants)
 [Original notebook](https://github.com/karacsm/V1-sim)
 [References](https://mesmerprism.com/projects/bressloff-v1-form-constants.html#references)

 Public status

## Status and rights boundary

 This page uses generated model images unless a caption explicitly says
 otherwise. Source-paper figures are named as calibration targets and
 references, not reproduced assets. No source-paper scans or crops are
 hosted here unless a license or permission statement appears in the caption.
 Full PDFs, page images, and source-figure crops are not published from this
 page.

 Rule et al. 2011 figures may be reused from PLOS Computational Biology
 under Creative Commons Attribution terms with attribution and change notes.
 Bressloff/Royal Society, Bressloff/Neural Computation, Ermentrout and
 Cowan/Springer, and IOP review figures require separate license
 verification or permission before direct reproduction
 ([PLOS license policy](https://journals.plos.org/ploscompbiol/s/licenses-and-copyright);
 [Royal Society permissions](https://royalsociety.org/journals/permissions/);
 [MIT Press permissions](https://mitpress.mit.edu/rights-permissions/);
 [Springer Nature permissions](https://www.springernature.com/gp/partners/rights-permissions-third-party-distribution);
 [IOP permissions FAQ](https://publishingsupport.iopscience.iop.org/permissionsfaq/)).

 The animations test whether V1 planforms can produce recognizable
 geometric forms after visual-field mapping. They do not predict individual
 hallucinations, psychedelic experience, clinical outcomes, or safe flicker
 exposure.

### How to read this page

- Start with the generated animations.

- Read the claim boundary before treating a visual match as evidence.

- Use the named presets to compare generated forms with source-paper targets.

- Open the deep dive for equations, calibration notes, and the Rule flicker model.

### Animation safety boundary

 These animations are explanatory model loops, not flicker stimuli or
 safety-cleared visual stimulation protocols.

 Limits

## The useful claim is narrow

 If V1 is treated as a two-dimensional cortical sheet with orientation
 structure, then
 symmetry-breaking activity patterns can become recognizable geometric
 visual forms after projection into retinal coordinates. That is a
 strong mechanistic sketch for form constants, while psychedelic
 imagery, visual meaning, and calibrated strobe-frequency prediction
 require additional models and evidence
 ([Ermentrout and Cowan, 1979](https://doi.org/10.1007/BF00336965);
 [Bressloff et al., 2002](https://doi.org/10.1162/089976602317250861)).

 Flicker can induce geometric visual hallucinations, and newer work
 studies those reports with richer phenomenological instruments. A V1
 planform model starts upstream of exact frequency claims: it first
 makes cortical pattern families tunable and visible. A later layer can
 try to connect input frequency, neural drive, participant state, and report
 structure
 ([Rule et al., 2011](https://doi.org/10.1371/journal.pcbi.1002158);
 [Hewitt et al., 2025](https://doi.org/10.1093/nc/niaf020)).

### Current visualization

- Slow browser animations of the main planform families

- Retino-cortical remapping from cortical stripes to visual-field forms

- Orientation-contour glyphs drawn as short local line segments

- 24 named source-target presets with source metadata and lattice-local branch readouts

- Calibration reports for rendered targets and stability diagnostics

### Current boundaries

- Frequency prediction remains uncalibrated

- Whole altered-state experience remains outside the model

- Clinical and therapeutic claims remain outside the scope

- Participant reconstruction data remains a separate evidence source

 Animated figure presets

## Planforms through the retino-cortical map

 These animations are exported from the Rust V1 planform renderer,
 then served as static WebP loops. They drift slowly to reveal
 structure rather than produce flicker. If reduced motion is enabled, the
 browser receives static PNG poster frames instead.

 Source-target registry

## Generated presets against named paper targets

 Each row links the source figure reference and places the current generated
 implementation beside the formula path used in the Rust renderer. The hosted
 images are generated assets from this repository; source-paper scans remain
 references until reuse permission or an open license is clear. For a
 non-journal visual explainer of this model lineage, see CountYourCulture's
 Bressloff notebook. Rights for original journal figures remain separate;
 this page uses generated images unless permission or an open license is
 stated.

 The interactive implementation now carries 24 named Bressloff presets:
 Figure 16/17 stability examples, Figure 29/30 non-contoured single-map
 planforms, Figure 31-36 double-map contour planforms including roll
 subpanels, and 2002 Figure 5-7 convenience targets
 ([Bressloff et al., 2001](https://doi.org/10.1098/rstb.2000.0769);
 [Bressloff et al., 2002](https://doi.org/10.1162/089976602317250861);
 [implementation repository](https://github.com/MesmerPrism/bressloff-v1-form-constants)).
 The generated report separates rendered-target checks from amplitude-branch
 diagnostics, so a square/cobweb image can be marked as visually rendered
 while its current branch selector still prefers the roll family.

### Figure 31 source target

 Square/cobweb even planform in the detailed Bressloff et al. Royal
 Society treatment.

 [Source figure reference](https://doi.org/10.1098/rstb.2000.0769)
 [Open visual comparison](https://isomerdesign.com/countyourculture/2011/03/13/form-constants-visual-cortex/)

### Implementation note

 Two orthogonal cortical modes are rendered through the double map.
 The target planform renders as cobweb/square; the same-lattice
 branch readout currently selects the roll/spiral branch.

### Figure 32 source target

 Odd square/cobweb variant for checking parity-dependent contour
 structure.

 [Source figure reference](https://doi.org/10.1098/rstb.2000.0769)
 [Open visual comparison](https://isomerdesign.com/countyourculture/2011/03/13/form-constants-visual-cortex/)

### Implementation note

 The odd branch uses the same square lattice target with the odd
 orientation eigenfunction. The rendered family matches the target;
 the local stability readout again falls to roll/spiral.

### Figure 33 source target

 Rhombic even planform, used here as the cleanest current
 same-family calibration case.

 [Source figure reference](https://doi.org/10.1098/rstb.2000.0769)
 [Open visual comparison](https://isomerdesign.com/countyourculture/2011/03/13/form-constants-visual-cortex/)

### Implementation note

 The rendered planform, family check, and same-lattice branch
 selector currently agree. This is the baseline for the later
 figure-by-figure geometry calibration.

### Figure 35 source target

 Hexagonal even phase variant. This row is the current phase-selection
 test for the quadratic amplitude term.

 [Source figure reference](https://doi.org/10.1098/rstb.2000.0769)
 [Open visual comparison](https://isomerdesign.com/countyourculture/2011/03/13/form-constants-visual-cortex/)

### Implementation note

 The renderer draws the requested hex-pi variant. The same-lattice
 branch selector chooses the honeycomb phase partner under the current
 quadratic-term sign convention.

 Interactive implementation

## Model controls behind the animations

 The animations come from a Rust V1 planform renderer with kernel
 parameters, an even/odd stability scan, perturbative orientation
 eigenfunctions, branch selection, and a retino-cortical viewer. Those
 controls make the model tunable enough to compare against the paper
 figures instead of treating each image as a fixed illustration.

 The
 [MIT-licensed implementation](https://github.com/MesmerPrism/bressloff-v1-form-constants)
 is MIT licensed and credits the public
 [karacsm/V1-sim](https://github.com/karacsm/V1-sim)
 notebook lineage. Brain Candy is relevant only as adjacent
 state-shift context; the implementation itself focuses on Bressloff's
 model equations. The current calibration layer exposes named source-target
 presets, orientation-channel exports, and side-by-side checks between
 target planforms, contour mode, same-lattice branch selection, stability
 diagnostics, and generated output.

### Code and related context

- [Bressloff V1 form constants repository](https://github.com/MesmerPrism/bressloff-v1-form-constants)

- [Bressloff and Rule modeling deep dive](https://mesmerprism.com/projects/bressloff-v1-form-constants-deep-dive.html)

- [Original V1-sim notebook](https://github.com/karacsm/V1-sim)

- [Deep Dream](https://mesmerprism.com/projects/deep-dream.html) for a different machine-vision hallucination lineage

- [Brain Candy](https://mesmerprism.com/projects/brain-candy.html) as adjacent state-shift context

### Current model outputs

- Kernel tuning for local and lateral interactions

- Linear critical-wavenumber scan

- Amplitude-equation branch readout

- Orientation-contour overlays

- Source-target catalog and v4 JSON calibration report

 Implementation roadmap

## The remaining work is calibration, not source collection

 The Bressloff papers now map to a public source-target registry and calibration
 report. The next fidelity layer is narrower: measure how well generated
 images match the source figures, fit phase and threshold conventions,
 digitize stability curves, and resolve the odd-hexagonal branch cases
 where higher-order terms matter
 ([future implementation plan](https://github.com/MesmerPrism/bressloff-v1-form-constants/blob/main/docs/BRESSLOFF_FUTURE_IMPLEMENTATION_PLAN.md)).

 That distinction matters for later flicker work. Rule, Stoffregen, and
 Ermentrout's flicker-induced phosphene model belongs beside this V1
 planform lab, but it should enter as a separate scalar excitatory/inhibitory
 model family rather than being folded into Bressloff's orientation-hypercolumn
 presets.

### Calibration layers

- Figure geometry and threshold matching

- Phase-specific square, honeycomb, hex-pi, and triangular variants

- Stability and bifurcation curve digitization

- Higher-order odd-hexagonal branch selection

### Model-family bridge

- Bressloff remains the orientation-hypercolumn track

- Rule enters as a flicker-driven scalar E/I track

- Both can share visual-field rendering where the math warrants it

 After Rule

## From spontaneous forms to driven fields

 Later neural-field work extends the classic form-constant lineage from
 spontaneous planforms and diffuse flicker toward driven systems. Nicks,
 Cocks, Avitabile, Johnston, and Coombes model Billock-Tsou-style
 orthogonal responses using spatial forcing and a 2:1 resonance
 ([Nicks et al., 2021](https://doi.org/10.1137/20M1366885)).
 Tamekue, Prandi, and Chitour treat MacKay-style effects as localized
 input-output problems in an Amari neural field
 ([Tamekue et al., 2024](https://doi.org/10.1137/23M1616686)).
 Bolelli and Prandi add time-periodic localized inputs and relate model
 afterimage contour width to flicker frequency and inhibition strength
 ([Bolelli and Prandi, 2025](https://doi.org/10.1007/s10851-025-01257-7)).

 These papers do not make the simulator a perception predictor. They show
 how the model family has moved from spontaneous forms toward
 stimulus-driven fields.

### Public-page use

- Nicks et al.: generated spatial-forcing and orthogonal-response diagnostics.

- Tamekue et al.: generated localized MacKay input diagnostics.

- Bolelli and Prandi: generated localized time-periodic input diagnostics.

### Claim boundary

 Frequency and input parameters are model variables, not safe exposure
 recommendations or promises about what an individual viewer will see.

 The [deep dive](https://mesmerprism.com/projects/bressloff-v1-form-constants-deep-dive.html#after-rule)
 carries the full taxonomy, rights ledger, and extension notes.

### Computational provenance

 The source papers name different author-side workflows: XPPAUT/AUTO,
 MATLAB, Julia, Mathematica, PETSc/Trilinos, and BifurcationKit appear
 in different parts of the lineage. Mesmer Prism records that methods
 context while keeping its own outputs generated and explicitly labeled.

 The [methods note](https://mesmerprism.com/projects/bressloff-v1-form-constants-deep-dive.html#source-methods)
 separates named source software from the Rust diagnostics shown here.

 Driven diagnostics

## Driven reports now expose source-target diagnostics

 The public simulator now exposes source-safe generated reports for
 localized MacKay input, localized time-periodic input, and
 Nicks-style orthogonal response. Bolelli now includes an
 accepted source-side pole-width convention, while Nicks
 includes Appendix-B kernel-derived coefficient diagnostics
 and source-equation Figure 8 boundary residual checks.
 These remain diagnostic outputs and compact numeric
 summaries, not copied paper figures and not calibrated
 perceptual predictions.

 ...
 registered driven examples, separated from Bressloff and Rule.

 ...
 registry entries with runnable generated diagnostics.

 ...
 entries with diagnostic coverage but missing source-calibrated targets.

 ...
 public JSON report families loaded by this page.

 Claim level
 diagnostic/source-target; not calibrated

 Formats
 loading report formats...

 Source
 loading generated report JSON...

 Reading the animations

## The pattern is the argument

### The visual-field image is downstream

 A stripe in cortical coordinates can become a ring, a ray, or a
 spiral in visual-field coordinates because the V1 map uses log-polar
 structure rather than a rectangular image copy. Near the center of gaze, retinal
 eccentricity and polar angle are expanded into a log-polar cortical
 sheet. The same wave family can therefore look qualitatively
 different after remapping.

### Contour glyphs are orientation hypotheses

 The short line overlays mark local dominant orientation channels:
 orientation hypotheses rather than separate moving objects. They are a
 compact way to show how an orientation-resolved model can turn scalar
 activity into contoured hallucination sketches, which is central to
 the later Bressloff account.

### The honest use is exploratory first

 A simulator is useful here when it lets the model fail in public.
 If the equations cannot generate the named family under any plausible
 parameter setting, that is informative. If a small parameter shift
 moves the model from cobweb to rhombic to honeycomb, that is also
 informative. The point is to put the mathematical description close
 enough to the image that the comparison becomes checkable.

 References

## Sources and model lineage

### Original model papers

- Ermentrout, G. B., and J. D. Cowan. "[A Mathematical Theory of Visual Hallucination Patterns](https://doi.org/10.1007/BF00336965)." Biological Cybernetics 34 (1979).

- Bressloff, P. C., J. D. Cowan, M. Golubitsky, P. J. Thomas, and M. C. Wiener. "[Geometric Visual Hallucinations, Euclidean Symmetry and the Functional Architecture of Striate Cortex](https://doi.org/10.1098/rstb.2000.0769)." Philosophical Transactions of the Royal Society B 356 (2001).

- Bressloff, P. C., J. D. Cowan, M. Golubitsky, P. J. Thomas, and M. C. Wiener. "[What Geometric Visual Hallucinations Tell Us About the Visual Cortex](https://doi.org/10.1162/089976602317250861)." Neural Computation 14, no. 3 (2002). [Public PDF mirror](https://gwern.net/doc/psychology/vision/2002-bressloff.pdf).

- Bressloff, P. C. "[Spatiotemporal Dynamics of Continuum Neural Fields](https://doi.org/10.1088/1751-8113/45/3/033001)." Journal of Physics A: Mathematical and Theoretical 45, no. 3 (2012). Stable DOI/IOP landing page for the review section that revisits cortical pattern formation and geometric hallucinations.

- Rule, M., M. Stoffregen, and B. Ermentrout. "[A Model for the Origin and Properties of Flicker-Induced Geometric Phosphenes](https://doi.org/10.1371/journal.pcbi.1002158)." PLOS Computational Biology 7, no. 9 (2011).

- Nicks, R., A. Cocks, D. Avitabile, A. Johnston, and S. Coombes. "[Understanding Sensory Induced Hallucinations: From Neural Fields to Amplitude Equations](https://doi.org/10.1137/20M1366885)." SIAM Journal on Applied Dynamical Systems 20, no. 4 (2021).

- Tamekue, C., D. Prandi, and Y. Chitour. "[A Mathematical Model of the Visual MacKay Effect](https://doi.org/10.1137/23M1616686)." SIAM Journal on Applied Dynamical Systems 23, no. 3 (2024).

- Bolelli, M. V., and D. Prandi. "[Neural Field Equations with Time-Periodic External Inputs and Some Applications to Visual Processing](https://doi.org/10.1007/s10851-025-01257-7)." Journal of Mathematical Imaging and Vision 67 (2025).

### Open visual comparisons

- CountYourCulture. "[Form Constants and the Visual Cortex](https://isomerdesign.com/countyourculture/2011/03/13/form-constants-visual-cortex/)." Non-journal visual explainer for the form-constant comparison lineage; source-journal figure rights remain separate.

- CountYourCulture. "[Form Constant Visualization - Type I](https://isomerdesign.com/countyourculture/2011/03/16/form-constant-visualization-type-1/)." Public tunnel, ripple, and spiral visualizations from sinusoidal cortical-noise examples.

- Qualia Research Institute. "[Oscilleditor Reference Manual](https://qri.org/oscilleditor/doc/reference-manual)." Public oscillator-tool documentation with log-polar controls for form-constant-like patterns.

- Amaya, I. A., et al. "[Effect of Frequency and Rhythmicity on Flicker Light-Induced Hallucinatory Phenomena](https://doi.org/10.1371/journal.pone.0284271)." PLOS ONE 18, no. 4 (2023).

- Hewitt et al. "[Stroboscopically Induced Visual Hallucinations: Historical, Phenomenological, and Neurobiological Perspectives](https://doi.org/10.1093/nc/niaf020)." Neuroscience of Consciousness (2025).

- Hewitt, T., E. J. Grove, A. Seth, and D. J. Schwartzman. "[Image Recreation Methods Enable Quantitative Characterization of Geometric Visual Hallucinations](https://doi.org/10.31234/osf.io/2gtsy_v1)." PsyArXiv preprint (2026). See also the [interactive image-recreation visualization](https://imagerecreationdataviz.netlify.app/).

- Mesmer Prism. "[Bressloff V1 Form Constants Lab](https://github.com/MesmerPrism/bressloff-v1-form-constants)." MIT-licensed Rust and browser implementation used for the animations.

- Mesmer Prism. "[Bressloff Future Implementation Plan](https://github.com/MesmerPrism/bressloff-v1-form-constants/blob/main/docs/BRESSLOFF_FUTURE_IMPLEMENTATION_PLAN.md)." Public implementation roadmap for calibration and cross-model work.

- Mesmer Prism. "[Driven Neural Fields Implementation Plan](https://github.com/MesmerPrism/bressloff-v1-form-constants/blob/main/docs/DRIVEN_NEURAL_FIELDS_IMPLEMENTATION_PLAN.md)." Public-safe implementation plan for MacKay, Bolelli, Nicks, and deferred architecture/color extensions.

- Mesmer Prism. "[Original Author Software Methods](https://github.com/MesmerPrism/bressloff-v1-form-constants/blob/main/docs/ORIGINAL_AUTHOR_SOFTWARE_METHODS.md)." Public-safe provenance note for software and numerical methods named in the source papers.

- karacsm. "[V1-sim](https://github.com/karacsm/V1-sim)." Public GitHub notebook for simulating V1 activity and retino-cortical visualization.

- Mesmer Prism. "[Deep Dream](https://mesmerprism.com/projects/deep-dream.html)." Related article on machine-vision hallucination simulation and cyberdelic comparison.

- Publisher rights pages. [PLOS licenses and copyright](https://journals.plos.org/ploscompbiol/s/licenses-and-copyright); [Royal Society permissions](https://royalsociety.org/journals/permissions/); [MIT Press rights and permissions](https://mitpress.mit.edu/rights-permissions/); [Springer Nature rights and permissions](https://www.springernature.com/gp/partners/rights-permissions-third-party-distribution); [IOP permissions FAQ](https://publishingsupport.iopscience.iop.org/permissionsfaq/).
