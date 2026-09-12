# Spatial Linux Desktop | Termux-powered Linux on Meta Quest

Source: https://mesmerprism.com/projects/spatial-linux-desktop.html
Canonical HTML: https://mesmerprism.com/projects/spatial-linux-desktop.html
Generated: 2026-09-12
Description: A local, interactive Linux workstation for Meta Quest, presented through a native Android app in Horizon window and Spatial SDK panel modes.
Markdown: https://mesmerprism.com/projects/spatial-linux-desktop.md
Plain text: https://mesmerprism.com/projects/spatial-linux-desktop.txt
BibTeX references: https://mesmerprism.com/projects/spatial-linux-desktop.bib
CSL JSON references: https://mesmerprism.com/projects/spatial-linux-desktop.references.csl.json

---

# Linux, locally in your headset.

 A Termux-powered desktop for Meta Quest, presented through a native Android and Spatial SDK interface.

 [View source](https://github.com/MesmerPrism/quest-termux-lab)
 [Explore the interaction system](https://mesmerprism.com/projects/spatial-linux-desktop.html#inputs)

## A desktop bridge, built for Quest.

 Termux, Termux:X11 and XFCE own the Linux session. A native Android app carries the pixels and input over device-local loopback.

 Meta Quest

 Native panel

 loopback RFB

 Termux:X11

 Linux desktop

## Every practical way to interact.

 One shared input system works in both Horizon-managed window mode and a grabbable Spatial SDK panel.

- Ray pointer hover · tap · drag

- Right click armed · controller

- Virtual keyboard Horizon IME

- Bluetooth keyboard physical keys

- Quest microphone synchronized voice

 sld@quest: ~/workspace MIC LIVE

 workspace/
├─ app/
│ ├─ src/
│ └─ build.gradle.kts
├─ README.md
└─ LICENSE

 You
Add a small status action and test it.

 Codex
I’ll inspect the project, make the change,
run the tests, and show you the diff.

✓ source updated
✓ tests passed
✓ APK assembled

 Ask Codex… ● voice input active

## The showcase: agentic work, entirely on Quest.

 Run the Codex desktop app inside the local Linux environment. Point, right-click, type with a virtual or Bluetooth keyboard, dictate through the Quest microphone, work with Git, and build Android apps on the headset.

 Inkscape, camera import and local printing are also validated.

 Related work and alternatives

## Part of a much wider ecosystem.

 Linux on Quest is established prior work. Local userlands appeared on the original Quest, a Quest 2 demonstration combined XFCE with noVNC, and current projects offer direct Termux:X11, PRoot/VNC, local compatibility runtimes, and remote spatial desktops. Our contribution is this specific local Termux:X11, loopback RFB, and hybrid Spatial SDK integration—not a claim to have invented Linux in a headset. ([RangerMauve, 2019](https://medium.com/@RangerMauve/linux-on-the-oculus-quest-406ba5d0c982); [Eternal_Density, 2020](https://www.reddit.com/r/OculusQuest/comments/ji9k7z/xfce_desktop_environment_on_my_quest_2_running_in/))

 We make no “first,” “only,” or “unprecedented” claim.

 2018

### Local Linux + native VR VNC

 Tokoro paired UserLAnd, OVRVNC, and a Bluetooth keyboard on Oculus Go—adjacent hardware, but important standalone precedent. ([Tokoro, 2018](https://blog.tokor.org/2018/11/27/Oculus-Go%E3%81%A7%E3%82%B9%E3%82%BF%E3%83%B3%E3%83%89%E3%82%A2%E3%83%AD%E3%83%B3VR%E4%BD%9C%E6%A5%AD%E7%92%B0%E5%A2%83%E3%82%92%E4%BD%9C%E3%81%A3%E3%81%9F/); [OVRVNC](https://github.com/y-fujii/ovrvnc))

 2019–20

### Linux reaches Quest

 The 2019 record establishes a local UserLAnd workflow; the 2020 Quest 2 record supplies the earlier graphical XFCE/noVNC evidence found in this scan.

 2025

### Reproducible Quest 3 routes

 Direct Termux:X11, UserLAnd, and Andronix/bVNC guides made the conventional local desktop route increasingly accessible. ([legokichi](https://qiita.com/legokichi/items/66975c203aebb5a4121c); [Ben Kaiser](https://benkaiser.dev/web-development-in-vr/); [DevWithZachary](https://www.youtube.com/watch?v=Xshj_xjwVjc))

 2026

### Spatial SDK desktops

 A native Meta Spatial SDK Ubuntu client demonstrated panel-coordinate input, right-click, scrolling, keyboard forwarding, and hardware HEVC decode from an external Linux host. ([Hughes, 2026](https://github.com/yveshughes/remote-desktop-for-ubuntu))

### Choose by where the workload runs.

 A spatial panel is only one design choice. For many users, direct X11 or a mature generic VNC client is the simpler answer; for demanding workloads, a remote Linux workstation can be the better answer.

 Route
 Runs on
 Presentation
 Best fit
 Boundary

 Direct Termux:X11
 Quest
 Horizon-managed Android window
 The shortest local display path
 No application-owned XR panel ([legokichi](https://qiita.com/legokichi/items/66975c203aebb5a4121c))

 Andronix / UserLAnd + VNC
 Quest
 Generic VNC app or browser
 Familiar distribution setup and mature client behavior
 Normally PRoot and a virtual VNC desktop, not privileged chroot or a Spatial SDK surface ([Andronix architecture](https://docs.andronix.app/get-started/how-does-andronix-work))

 DroidDesk
 Android / Quest-compatible route
 Direct Termux:X11 or its standalone Android app
 Consolidated installation and desktop packaging
 No Quest-specific spatial renderer was established in the inspected material ([DroidDesk](https://github.com/orailnoor/DroidDesk))

 WinlatorXR
 Quest
 Purpose-built native XR frontend
 Locally executing Windows applications
 Wine/CPU translation and a local X server, rather than native ARM Linux/XFCE or Meta Spatial SDK ([WinlatorXR](https://github.com/WinlatorXR/WinlatorXR/tree/cmod_bionic))

 Spatial Linux Desktop
 Quest
 Horizon window or Spatial SDK panel
 Local Linux plus Quest-specific input and device bridges
 More setup and local transport work; deliberately bounded compatibility

 Spatial SDK remote desktop
 External Ubuntu/PC host
 Native video surface and spatial panel
 Desktop-class compute and efficient media transport
 Requires a host and network ([remote-desktop-for-ubuntu](https://github.com/yveshughes/remote-desktop-for-ubuntu); [Moonlight-SpatialSDK](https://github.com/XXJones21/Moonlight-SpatialSDK))

 WayVR + WiVRn
 External Linux host
 Linux-native spatial workspace streamed to Quest
 Several apps, richer compute, and open Linux XR
 Not an Android-hosted local desktop ([WayVR](https://github.com/wayvr-org/wayvr); [WiVRn](https://github.com/WiVRn/WiVRn))

 01

### Finish text input

 Unicode, dead keys, composition, selection, and clipboard behavior are a more consequential adopter gap than another application screenshot. noVNC and mature Android VNC clients are useful protocol references, subject to their licenses. ([noVNC](https://github.com/novnc/noVNC))

 02

### Measure the whole local path

 Direct Termux:X11, retained RFB, and any hardware-video experiment should run the same visible tasks. Local encoding, copies, queueing, decode, text clarity, latency, thermal state, and battery all count.

 03

### Study direct surfaces

 WinlatorXR and the Ubuntu Spatial SDK client are useful references for direct local rendering boundaries and decoder-to-panel surfaces. Neither proves that a zero-copy Termux:X11 handoff already exists.

 04

### Treat lifecycle and trust as features

 Release held input, stop the microphone on interruption, bound reconnects, and authenticate local peers if hostile same-device applications enter the threat model. Loopback limits exposure; it is not per-app authentication.

 Research boundary.
 The 12 September 2026 scan tracked 53 target, candidate, upstream, adjacent, and lead records plus 74 source/access entries. It did not independently reproduce other projects, perform a legal prior-art search, or exhaust every video, archive, fork, language, or app store. “Not verified” does not mean “absent.”

 [Read the engineering comparison and research queue](https://github.com/MesmerPrism/quest-termux-lab/blob/codex/spatial-desktop-panel/docs/quest-linux-desktop-ecosystem.md)

## Selected references

- MesmerPrism. “[Spatial Desktop Panel implementation snapshot](https://github.com/MesmerPrism/quest-termux-lab/tree/1ed3a4544ac3883e4c4928c4f114b22466c7c783/examples/spatial-desktop-panel).” 2026.

- Tokoro. “[A standalone VR work environment on Oculus Go](https://blog.tokor.org/2018/11/27/Oculus-Go%E3%81%A7%E3%82%B9%E3%82%BF%E3%83%B3%E3%83%89%E3%82%A2%E3%83%AD%E3%83%B3VR%E4%BD%9C%E6%A5%AD%E7%92%B0%E5%A2%83%E3%82%92%E4%BD%9C%E3%81%A3%E3%81%9F/).” 2018.

- y-fujii. “[OVRVNC](https://github.com/y-fujii/ovrvnc).” Source repository.

- RangerMauve. “[Linux on the Oculus Quest](https://medium.com/@RangerMauve/linux-on-the-oculus-quest-406ba5d0c982).” 2019.

- Eternal_Density. “[XFCE desktop environment on Quest 2](https://www.reddit.com/r/OculusQuest/comments/ji9k7z/xfce_desktop_environment_on_my_quest_2_running_in/).” 2020.

- legokichi. “[Standalone Linux with Termux on Meta Quest 3](https://qiita.com/legokichi/items/66975c203aebb5a4121c).” 2025.

- Ben Kaiser. “[Web development in VR](https://benkaiser.dev/web-development-in-vr/).” 2025.

- DevWithZachary. “[Ubuntu Desktop on Meta Quest 3](https://www.youtube.com/watch?v=Xshj_xjwVjc).” Video, 2025. Architecture cross-checked against [Andronix documentation](https://docs.andronix.app/get-started/how-does-andronix-work).

- orailnoor. “[DroidDesk](https://github.com/orailnoor/DroidDesk).” Source repository and [compliance record](https://github.com/orailnoor/DroidDesk/blob/main/COMPLIANCE.md).

- WinlatorXR contributors. “[WinlatorXR](https://github.com/WinlatorXR/WinlatorXR/tree/cmod_bionic).” See the inspected [XR controller implementation](https://github.com/WinlatorXR/WinlatorXR/blob/d4c830526eb5562067d21685a975845ab705da60/app/src/main/java/com/winlator/xr/XrController.java).

- Yves Hughes. “[Remote desktop for Ubuntu](https://github.com/yveshughes/remote-desktop-for-ubuntu).” Meta Spatial SDK client, 2026.

- XXJones21. “[Moonlight-SpatialSDK](https://github.com/XXJones21/Moonlight-SpatialSDK).” Source repository.

- WayVR and WiVRn contributors. “[WayVR](https://github.com/wayvr-org/wayvr)” and “[WiVRn](https://github.com/WiVRn/WiVRn).” Open-source Linux XR workspace and transport.

- Termux contributors. “[Termux](https://github.com/termux/termux-app)” and “[Termux:X11](https://github.com/termux/termux-x11).” Core upstream projects.

- LibVNC and noVNC contributors. “[x11vnc](https://github.com/LibVNC/x11vnc)” and “[noVNC](https://github.com/novnc/noVNC).” Display-transport references.

## A working reference, not a black box.

 The Android client, bounded RFB transport, Linux setup, fixtures and validation notes are public and MIT licensed. Third-party applications remain user-installed dependencies under their own terms.

 [Open the GitHub repository](https://github.com/MesmerPrism/quest-termux-lab)
 [Read the architecture](https://github.com/MesmerPrism/quest-termux-lab/blob/main/docs/spatial-desktop-panel.md)
 [Explore related work](https://github.com/MesmerPrism/quest-termux-lab/blob/codex/spatial-desktop-panel/docs/quest-linux-desktop-ecosystem.md)

## Press kit

 [Project logo · SVG](https://mesmerprism.com/projects/spatial-linux-desktop/assets/spatial-linux-desktop-logo.svg)
 [Project logo · PNG · 300 dpi](https://mesmerprism.com/projects/spatial-linux-desktop/assets/spatial-linux-desktop-logo.png)
 [Key art · PNG · 300 dpi](https://mesmerprism.com/projects/spatial-linux-desktop/assets/spatial-linux-desktop-key-art.png)
 [Mesmer Prism logo · EPS vector](https://mesmerprism.com/assets/brand/mesmer-prism-logo.eps)
 [Mesmer Prism logo · PNG · 300 dpi](https://mesmerprism.com/projects/spatial-linux-desktop/assets/mesmer-prism-logo-300dpi.png)
