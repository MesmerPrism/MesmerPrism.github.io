# Combinatorial Swarmability

Source: https://mesmerprism.com/projects/combinatorial-swarmability.html
Canonical HTML: https://mesmerprism.com/projects/combinatorial-swarmability.html
Generated: 2026-09-16
Description: Mixed-ability human–swarm interaction: combining different forms of participation through shared, changing systems. Research by Till Holzapfel at UDE / RC Trust.
Markdown: https://mesmerprism.com/projects/combinatorial-swarmability.md
Plain text: https://mesmerprism.com/projects/combinatorial-swarmability.txt
BibTeX references: https://mesmerprism.com/projects/combinatorial-swarmability.bib
CSL JSON references: https://mesmerprism.com/projects/combinatorial-swarmability.references.csl.json

---

# Combinatorial Swarmability

 People contribute to a shared activity in different ways. Combinatorial
 Swarmability asks how a changing, many-part system might let those
 contributions combine, while leaving the people involved able to negotiate
 what their actions mean. The research joins mixed-ability interaction,
 swarm systems, artificial life, and shared embodiment.

 This is the research direction of Till Holzapfel's PhD in mixed-ability
 human–swarm interaction, in Prof. Giulia Barbareschi's
 [Inclusive Technology and Collective Engagement group](https://rc-trust.ai/groups/inclusive-technology-and-collective-engagement)
 at the University of Duisburg-Essen / RC Trust.

 Research direction and literature context, September 2026. The systems and studies proposed below are work ahead.

## Combining abilities without making everyone act alike

 A shared task need not require identical actions. Someone might contribute through
 speech, a switch, a gesture, or an intentionally slow text exchange. They might
 direct movement, change a rhythm, set a boundary, or decide when to pause.
 The design question is how these contributions depend on one another and how
 much influence each person can exercise. Giving everyone an input is only a start.

 Ability-based design asks systems to respond to what people can do, rather than
 requiring people to fit a fixed interface. Work on interdependence extends the
 question beyond an individual user: access is also produced through relationships,
 assistance, and the organization of an activity. A review of ability-diverse
 collaboration makes this collective setting an explicit design concern
 ([Wobbrock et al., 2011](https://doi.org/10.1145/1952383.1952384);
 [Bennett et al., 2018](https://doi.org/10.1145/3234695.3236348);
 [Xiao et al., 2024](https://doi.org/10.1145/3613904.3641930)).

 Recent interviews with 18 members of mixed-ability teams describe accessibility
 as ongoing work within virtual collaboration, including coordination, relationships,
 and responsibility. Those accounts help identify questions to bring to co-design;
 they do not supply an automatic way to infer an individual's needs
 ([Jung et al., 2026](https://doi.org/10.1145/3772318.3790419)).

 Here, combinatorial means exploring arrangements of contributions:
 different inputs, roles, timings, and forms of feedback. Swarmability
 names the possibility of acting through a shared, many-part body whose behaviour
 can change. This is a proposed design approach, not a measure of a person's
 ability. It does not presume that a swarm dissolves hierarchy. A shared system
 could just as easily give one participant more authority or make another's
 contribution hard to recognize.

## A shared medium that keeps changing

 A swarm is interesting here because its overall form can emerge from interactions
 among many elements. Reynolds' flocking model is a foundational example: local
 movement rules produce coordinated aggregate motion without prescribing every
 trajectory separately. Artificial-life systems broaden the available forms and
 behaviours, without requiring each simulated element to stand for a robot or a
 person
 ([Reynolds, 1987](https://doi.org/10.1145/37402.37406);
 [Kumar et al., 2025](https://doi.org/10.1162/artl.a.8)).

 Control can therefore mean more than steering. Participants could alter local
 rules, shape an attractor, change how strongly parts respond to one another, or
 choose a different mode of behaviour. They could also negotiate the mapping
 itself: which input affects which property, whose changes take precedence, and
 how to undo an unwanted result. These are proposed interaction choices to test,
 not a claim that a particular control scheme is already accessible.

### Behaviour maps as a design resource

 Automated Search for Artificial Life (ASAL) uses foundation-model representations
 to search for target appearances, novelty, and diverse behaviours across systems
 including Boids and Lenia. Its Boids atlas is especially useful as a way to think
 about possible motion. In that implementation, search changes a neural local
 controller, rather than only adjusting the familiar three flocking weights.
 The visual atlas is a projection of model representations, not a taxonomy of
 social relationships or an experimentally validated account of what people see
 ([Kumar et al., 2025](https://doi.org/10.1162/artl.a.8)).

 Semantic-feedback work offers a complementary route: participants use language
 to influence the evolution of artificial-life forms. Li and colleagues combine
 a trained prompt-to-parameter model, evolutionary search, and a vision-language
 similarity signal. This provides a concrete precedent for language-mediated
 shaping of dynamics, but it is not evidence that an LLM can faithfully read a
 group's relationships
 ([Li et al., 2025](https://doi.org/10.1145/3757369.3767620)).

 An agentic layer could help propose mappings, search a behaviour library, or
 explain a change. That layer would need bounded authority: participant approval,
 visible reasons, recoverable earlier configurations, and a way to stop it.
 A prompt such as “make this more collaborative” should invite discussion of
 what collaboration means, not silently turn into an optimization target.

## From the felt body to the relations between bodies

 [Plasmatic Multitudes](https://mesmerprism.com/projects/plasmatic-multitudes.html) explores
 bodies whose boundaries are porous: particles gather, disperse, overlap, and
 become recognizable through movement. It grows out of Holzapfel's avatar work
 at the Intangible Realities Lab, in the context of Isness, the lab's collaboration
 with aNUma, and numadelic aesthetics. In this design lineage, luminous and
 fluid bodies offer ways of questioning ordinary bodily boundaries
 ([IRL, Isness](https://www.intangiblerealitieslab.org/projects/isness);
 [IRL, Numadelic Flow](https://www.intangiblerealitieslab.org/projects/numadelic-flow);
 [aNUma, Science](https://anuma.com/science)).

 Research on Isness-D describes shared VR in which participants experience
 diffuse, luminous bodies and can coalesce with one another. Its findings concern
 connectedness and self-transcendent experience. They do not establish that shared
 embodiment produces equitable collaboration or meets the access needs of a
 mixed-ability group
 ([Glowacki et al., 2022](https://doi.org/10.1038/s41598-022-12637-z)).

 [Viscereality](https://mesmerprism.com/projects/viscereality.html) supplies another part of
 the lineage: physiological signals coupled to a changing visual environment.
 Its published design uses breathing and coupled oscillators to organize spatial
 particle feedback
 ([Fejer et al., 2025](https://doi.org/10.18420/MUC2025-MCI-WS11-174)).
 The proposed connection to swarm interaction is methodological: a dynamic
 system can give a signal a form that people experience and respond to.
 Moving from bodily feedback to social feedback introduces a further problem:
 the meaning of the signal has to be negotiated among people.

## A meeting reflected through a living form

 One proposed application is a sensory presence during a meeting: a dynamic
 simulation that reflects selected aspects of an unfolding conversation. A group
 might use it to discuss whether questions receive attention, whether decisions
 remain open, or whether participants have the time and channels they need to
 contribute. Language could be one input; deliberate annotations and accessible
 non-speech contributions could be equally important.

 The first version could be a workshop object, with a facilitator or participants
 changing its behaviour manually. Its value would lie in the discussion it makes
 possible. Only later, if the mappings prove useful and acceptable, would it make
 sense to explore a more continuous process monitor. A vivid animation can prompt
 reflection before it is a valid measurement instrument; those are different
 achievements.

### What existing meeting systems offer

 MeetMap turns online dialogue into editable maps, comparing manual and
 AI-assisted mapping in a study with 20 participants. It offers a useful precedent
 for revisable representations rather than a single final summary. Its study
 does not establish usefulness for mixed-ability meetings
 ([Chen et al., 2025](https://doi.org/10.1145/3711030)).
 Meeting AIssist explores tangible feedback about speaking time in two workplace
 meetings. Its cues were controlled by a researcher in a Wizard-of-Oz study;
 the findings concern responses to the intervention, not validated autonomous AI
 facilitation
 ([Kleinau and Hoggan, 2025](https://doi.org/10.48340/ecscw2025_cp04)).

 These systems suggest things to test: editable representations, gentle prompts,
 tangible feedback, and different ways to acknowledge or reject an intervention.
 They also expose the difficulty of deciding what a signal means. Speaking time
 is observable under some conditions; inclusion is a much broader and contested
 construct. A person may be listening by choice, waiting for interpretation, using
 another channel, or struggling to enter the conversation. The same silence can
 have very different meanings.

 Measurement research distinguishes a construct from the procedure used to
 represent it. Applying that distinction here means asking whether a chosen
 signal actually supports the interpretation placed on it, for this group and
 activity. Reliability alone is insufficient: a consistently produced score can
 consistently represent the wrong thing
 ([Jacobs and Wallach, 2021](https://doi.org/10.1145/3442188.3445901)).

### Conditions for a responsible prototype

- Participants define the meeting's goals and can disagree about the mappings.

- The display distinguishes observations, model interpretations, and participant annotations.

- Contributions through text, assisted communication, pauses, and other agreed channels remain legible.

- People can correct, refuse, pause, or remove a representation without having to disclose a diagnosis.

- The group agrees what is sensed, stored, and shared; identifiable traces are minimized.

- The visualization has alternatives for people who cannot comfortably see, hear, or inhabit it.

 These are proposed requirements for the research. The simulation should not
 assign an emotional state, a trust score, or a judgement of someone's value to
 the group. Its most defensible early role is a contestable reflection that people
 can use together.

## Research through shared use

 The planned work begins with co-design and exploratory use: which forms of
 collective action people want, what they wish to keep private, and what would
 make participation worth the effort. That orientation fits the group's stated
 commitment to participatory work with marginalized communities
 ([Inclusive Technology and Collective Engagement](https://rc-trust.ai/groups/inclusive-technology-and-collective-engagement)).

 Shared virtual environments can make different arrangements available for
 comparison. Creative exploration could be followed by more structured activities
 in which participants negotiate roles, change rules, and recover from conflict
 or misunderstanding. Evaluation would need to consider both the observable
 interaction and participants' interpretations: who influenced an outcome,
 whose contribution was recognized, what was tiring, and whether repair was
 possible. Equal activity and a pleasing swarm animation would not settle
 those questions.

 [Rusty Morphospace](https://mesmerprism.com/projects/rusty-morphospace.html) connects this
 research to continuing open-source development. Its modular approach separates
 computational state, commands, visual inspection, and application packaging.
 Practical VR tools can reduce the work of operating research environments.
 Extending that infrastructure toward robots such as Reachy Mini is a planned
 direction, not a released swarm-control capability.

 The programme's central test is whether people can use these systems to shape
 their relations on terms they can understand and revise. Some prototypes may
 remain useful mainly as ways of starting a conversation. Others may support
 more sustained shared activity. The evidence for that distinction has to come
 from the people involved.

## References and context

 Papers support the distinctions above; institutional pages document the research and design context. The proposed combinations remain research questions.

- Wobbrock, J. O., et al. “[Ability-Based Design: Concept, Principles and Examples](https://doi.org/10.1145/1952383.1952384).” ACM Transactions on Accessible Computing 3(3) (2011).

- Bennett, C. L., Brady, E., and Branham, S. M. “[Interdependence as a Frame for Assistive Technology Research and Design](https://doi.org/10.1145/3234695.3236348).” ASSETS (2018).

- Xiao, L., et al. “[A Systematic Review of Ability-Diverse Collaboration through Ability-Based Lens in HCI](https://doi.org/10.1145/3613904.3641930).” CHI (2024).

- Jung, C., Cheng, K., Heung, S., Jung, M. F., and Azenkot, S. “[Understanding How Accessibility Practices Impact Teamwork in Mixed-Ability Teams that Collaborate Virtually](https://doi.org/10.1145/3772318.3790419).” CHI (2026). [Open manuscript](https://arxiv.org/abs/2602.04015).

- Reynolds, C. W. “[Flocks, Herds, and Schools: A Distributed Behavioral Model](https://doi.org/10.1145/37402.37406).” SIGGRAPH (1987), 25–34.

- Kumar, A., et al. “[Automating the Search for Artificial Life With Foundation Models](https://doi.org/10.1162/artl.a.8).” Artificial Life 31(3) (2025), 368–396. [Interactive atlas](https://asal.sakana.ai/).

- Li, S., et al. “[Participatory Evolution of Artificial Life Systems via Semantic Feedback](https://doi.org/10.1145/3757369.3767620).” SIGGRAPH Asia Art Papers (2025).

- Glowacki, D. R., et al. “[Group VR experiences can produce ego attenuation and connectedness comparable to psychedelics](https://doi.org/10.1038/s41598-022-12637-z).” Scientific Reports 12, 8995 (2022).

- Fejer, G., et al. “[Viscereality: A Bio-responsive VR System for Breath-Based Interactions and Coupled Oscillator Dynamics to Augment Altered States of Consciousness](https://doi.org/10.18420/MUC2025-MCI-WS11-174).” Mensch und Computer 2025 – Workshopband (2025). Published design work, not clinical validation.

- Chen, X., Yap, N., Lu, X., Gunal, A., and Wang, X. “[MeetMap: Real-Time Collaborative Dialogue Mapping with LLMs in Online Meetings](https://doi.org/10.1145/3711030).” Proceedings of the ACM on Human-Computer Interaction 9(2), CSCW132 (2025).

- Kleinau, J., and Hoggan, E. “[Mediating Meeting Dynamics: An Exploration of AI-Based Multimodal Feedback in Hybrid Meetings](https://doi.org/10.48340/ecscw2025_cp04).” ECSCW (2025). Wizard-of-Oz study of Meeting AIssist.

- Jacobs, A. Z., and Wallach, H. “[Measurement and Fairness](https://doi.org/10.1145/3442188.3445901).” FAccT (2021).

- Intangible Realities Lab. “[Isness](https://www.intangiblerealitieslab.org/projects/isness)” and “[Numadelic Flow](https://www.intangiblerealitieslab.org/projects/numadelic-flow).” Project and design context; accessed September 16, 2026.

- aNUma. “[Science](https://anuma.com/science).” Isness research context; accessed September 16, 2026. Institutional provenance, not an independent efficacy assessment.

- RC Trust. “[Inclusive Technology and Collective Engagement](https://rc-trust.ai/groups/inclusive-technology-and-collective-engagement).” Group led by Prof. Dr. Giulia Barbareschi, University of Duisburg-Essen; accessed September 16, 2026.
