# Optical Movement Illusions

Source: https://mesmerprism.com/projects/optical-movement-illusions.html
Canonical HTML: https://mesmerprism.com/projects/optical-movement-illusions.html
Generated: 2026-08-07
Description: Optical Movement Illusions maps peripheral drift, Rotating Snakes, static motion illusions, color and luminance parameters, and the mechanism-design bridge into perceptual tooling.
Markdown: https://mesmerprism.com/projects/optical-movement-illusions.md
Plain text: https://mesmerprism.com/projects/optical-movement-illusions.txt
BibTeX references: https://mesmerprism.com/projects/optical-movement-illusions.bib
CSL JSON references: https://mesmerprism.com/projects/optical-movement-illusions.references.csl.json

---

Static motion and perceptual mechanics

# Optical Movement Illusions

 Static images that seem to move: peripheral drift,
 Rotating Snakes, and related motion illusions. The work matters because these
 figures sit exactly where psychophysics, retinal transients, cortical motion
 processing, and design practice meet.

 [Back to work](https://mesmerprism.com/#work)
 [Deep Dream](https://mesmerprism.com/projects/deep-dream.html)
 [References](https://mesmerprism.com/projects/optical-movement-illusions.html#references)

 Direction

## Mechanism

 A stationary image can appear to drift, rotate, shimmer, or flow even though
 its pixels do not change. “Static-motion illusion” is an umbrella label, not a
 single mechanism. This page centers on peripheral-drift and Fraser-Wilcox
 patterns, especially Rotating Snakes, while treating Enigma and other effects
 as adjacent families whose evidence cannot simply be transferred
 ([Fraser and Wilcox, 1979](https://doi.org/10.1038/281565a0);
 [Faubert and Herbert, 1999](https://doi.org/10.1068/p2825);
 [Troncoso et al., 2008](https://doi.org/10.1073/pnas.0709389105)).

 Three levels of explanation need to stay distinct. The image contains an
 asymmetric order of dark, light, and intermediate values. A temporal driver—such
 as onset, retinal slip, microsaccades, blinks, or pupil-linked changes in retinal
 illuminance—prevents the pattern from remaining temporally static to the visual
 system. Differences in response timing and nonlinear motion detection can then
 turn those changing signals into a directional bias
 ([Backus and Oruç, 2005](https://doi.org/10.1167/5.11.10);
 [Fermüller et al., 2010](https://doi.org/10.1016/j.visres.2009.11.021);
 [Otero-Millan et al., 2012](https://doi.org/10.1523/JNEUROSCI.5823-11.2012);
 [Bach and Atala-Gérard, 2020](https://doi.org/10.1177/2041669520958025)).

### Current focus

- Peripheral drift and Rotating Snakes mechanism reviews

- Parameter-space work around luminance order, contrast, color, color temperature, and illuminance

- Eye-movement, blink, and qualified pupil-linked accounts

- Implementation bridge into filters and experimental visual tooling

### Connected projects

- [Brain Candy](https://mesmerprism.com/projects/brain-candy.html) for induced-vision and pattern-design translation

- [Deep Dream](https://mesmerprism.com/projects/deep-dream.html) for a different class of altered-vision modeling

 Mechanism

## Why this line matters

 Stationary-motion illusions do not all share one cause. For peripheral-drift
 and Rotating Snakes patterns, repeated asymmetric luminance and contrast
 structure interacts with changes over time in retinal input and neural
 response. Which component dominates depends on the stimulus and viewing
 condition.

 Model reproduction can show that a computation is sufficient under chosen
 assumptions; it does not prove that the brain uses only that computation.
 Imaging can show where motion-selective networks participate without identifying
 a unique upstream cause. Predictive neural-network reproductions are also
 inconsistent across models
 ([Ashida et al., 2012](https://doi.org/10.1016/j.neuroimage.2012.03.033);
 [Bach and Atala-Gérard, 2020](https://doi.org/10.1177/2041669520958025);
 [Kirubeswaran and Storrs, 2023](https://doi.org/10.1016/j.visres.2023.108195)).

### Public focus

- Mechanism-grounded explanation over loose illusion folklore

- Parameter-sensitive design translation

- Evidence limits made explicit across models, imaging, and observer differences

 Synthesis

## Static images with temporal consequences

 The motion is illusory, but the signal that produces it is structured. The
 account below separates the stimulus, its temporal drivers, and the motion
 computations that respond to them.

### A static image is not static to the visual system

 Peripheral-drift and Rotating Snakes patterns can become time-varying retinal
 signals even when their pixels do not change. Fixation instability,
 microsaccades, saccades, and blinks alter retinal input or coincide with
 perceptual episodes. Otero-Millan and colleagues directly related
 microsaccades and blinks to illusory rotation in Rotating Snakes
 ([Otero-Millan et al., 2012](https://doi.org/10.1523/JNEUROSCI.5823-11.2012)).

 Pupil dynamics provide another recent account. Mather and Cavanagh related
 pupil-linked changes in retinal illuminance to the duration and direction of
 peripheral drift. This is important evidence for the tested stimuli, not a
 settled universal cause of every stationary-motion illusion
 ([Mather and Cavanagh, 2025](https://doi.org/10.1167/jov.25.2.13)).

### Why the pattern matters

 A canonical four-part luminance sequence is a useful starting point, but there
 is no universal “motion palette.” Local order, intermediate luminance values,
 contrast, edge width, spatial scale, eccentricity, chromatic arrangement,
 illuminance, and display transfer can all matter. Atala-Gérard and Bach mapped
 regions of luminance space that weakened or reversed perceived direction
 ([Atala-Gérard and Bach, 2017](https://doi.org/10.1177/2041669517691779)).

 Chromatic findings should remain study-specific. Uesaki and colleagues found a
 blue-yellow enhancement under their tested conditions, while Nishikawa and
 Kitaoka separately tested color temperature and illuminance. Neither result
 reduces to the claim that color in general “makes it move”
 ([Uesaki et al., 2024](https://doi.org/10.1177/20416695241242346);
 [Nishikawa and Kitaoka, 2026](https://doi.org/10.1177/20416695251412759)).

### Observer difference without overreading it

 People differ in how strongly they experience these effects, but the evidence
 does not justify a personality theory of illusion susceptibility. In one study,
 stronger illusory motion was associated with contrast discrimination, not
 generic motion sensitivity, self-reported visual discomfort, or migraine
 status
 ([He et al., 2020](https://doi.org/10.1167/iovs.61.8.43)).

 Observer variation should therefore be measured rather than explained through
 unsupported trait or personality claims. Fixation behavior,
 viewing distance, stimulus size, display conditions, and contrast sensitivity
 are concrete variables to record in future comparisons.

### Design translation

 Apparent motion can be treated as a controllable design variable, but a visual
 implementation should preserve measured luminance order after color conversion
 and treat edge geometry, carrier scale, eccentricity, brightness, illuminance,
 gamma, and color management as experimental parameters. Resampling can destroy
 the intended local sequence, and hue labels alone do not guarantee the required
 luminance relations.

 Direction and strength should not be promised across viewers or devices.
 Adjustable intensity, an off switch, and a static preview are conservative
 interface choices, not medical-safety thresholds. Canonical imagery should be
 linked to its institutional source rather than reproduced without a separate
 rights check
 ([Kitaoka, “Rotating Snakes”](https://www.psy.ritsumei.ac.jp/akitaoka/rotsnakee.html)).

 References

## Current references

 These works support the mechanism, parameter, boundary, and implementation
 claims above. The canonical Rotating Snakes page is linked for lineage and
 viewing context; its imagery is not reproduced here.

### Classics and mechanism papers

- Fraser and Wilcox. "[Perception of Illusory Movement](https://doi.org/10.1038/281565a0)." Nature (1979).

- Faubert and Herbert. "[The Peripheral Drift Illusion: A Motion Illusion in the Visual Periphery](https://doi.org/10.1068/p2825)." Perception (1999).

- Backus and Oruç. "[Illusory Motion from Change over Time in the Response to Contrast and Luminance](https://doi.org/10.1167/5.11.10)." Journal of Vision (2005).

- Conway. "[Neural Basis for a Powerful Static Motion Illusion](https://doi.org/10.1523/JNEUROSCI.1084-05.2005)." Journal of Neuroscience (2005).

- Fermüller, Ji, and Kitaoka. "[Illusory Motion Due to Causal Time Filtering](https://doi.org/10.1016/j.visres.2009.11.021)." Vision Research (2010).

- Troncoso et al. "[Microsaccades Drive Illusory Motion in the Enigma Illusion](https://doi.org/10.1073/pnas.0709389105)." Proceedings of the National Academy of Sciences (2008). Used only to mark the adjacent Enigma-family boundary.

### Eye movements, imaging, and parameter maps

- Otero-Millan, Macknik, and Martinez-Conde. "[Microsaccades and Blinks Trigger Illusory Rotation in the 'Rotating Snakes' Illusion](https://doi.org/10.1523/JNEUROSCI.5823-11.2012)." The Journal of Neuroscience (2012).

- Ashida et al. "[Direction-Specific fMRI Adaptation Reveals the Visual Cortical Network Underlying the 'Rotating Snakes' Illusion](https://doi.org/10.1016/j.neuroimage.2012.03.033)." NeuroImage (2012).

- Atala-Gérard and Bach. "[Rotating Snakes Illusion—Quantitative Analysis Reveals a Region in Luminance Space With Opposite Illusory Rotation](https://doi.org/10.1177/2041669517691779)." i-Perception (2017).

- Bach and Atala-Gérard. "[The Rotating Snakes Illusion Is a Straightforward Consequence of Nonlinearity in Arrays of Standard Motion Detectors](https://doi.org/10.1177/2041669520958025)." i-Perception (2020).

- Mather and Cavanagh. "[Pupil Dilation Underlies the Peripheral Drift Illusion](https://doi.org/10.1167/jov.25.2.13)." Journal of Vision (2025).

- Uesaki et al. "[Blue-Yellow Combination Enhances Perceived Motion in Rotating Snakes Illusion](https://doi.org/10.1177/20416695241242346)." i-Perception (2024).

- Nishikawa and Kitaoka. "[The Effects of Color Temperature and Illuminance on the Color-Dependent Fraser-Wilcox Illusion](https://doi.org/10.1177/20416695251412759)." i-Perception (2026).

### Evidence boundaries and stimulus lineage

- He et al. "[Illusory Motion Perception Is Associated with Contrast Discrimination but Not Motion Sensitivity, Self-Reported Visual Discomfort, or Migraine Status](https://doi.org/10.1167/iovs.61.8.43)." Investigative Ophthalmology & Visual Science (2020).

- Kirubeswaran and Storrs. "[Inconsistent Illusory Motion in Predictive Coding Deep Neural Networks](https://doi.org/10.1016/j.visres.2023.108195)." Vision Research (2023).

- Kitaoka. "[Rotating Snakes](https://www.psy.ritsumei.ac.jp/akitaoka/rotsnakee.html)." Ritsumeikan University institutional page. Linked for stimulus lineage and demonstration context.
