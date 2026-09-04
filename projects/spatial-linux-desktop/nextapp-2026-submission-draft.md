# next.app 2026 XR Showcase — submission draft

Form: https://docs.google.com/forms/d/e/1FAIpQLSf84S75yUXhgvL_HUaTB0c_OvvcFXEK1RF30wzjroAj4Dy1BQ/viewform

Application deadline shown by the form: **July 31, 2026**. Event: **October 7–9, 2026, CityCube Berlin**.

## Personal and studio fields

Fill these directly before submission:

- Email address
- Contact full name
- Preferred pronouns
- Job title
- City and country
- Mobile number
- Newsletter preference

Prepared studio fields:

- **Company / studio name:** Mesmer Prism
- **Company / studio website:** https://mesmerprism.com/
- **About the developer:** Mesmer Prism is the independent XR and research practice of Till Holzapfel, focused on mixed-reality systems, embodied interaction, open-source tools, and inspectable experimental infrastructure. Public work includes Meta Quest applications, Android and Windows companion tooling, biofeedback pipelines, visual instruments, and research publications. Spatial Linux Desktop is published as an MIT-licensed lab and reference project.

## Project fields

- **Project name:** Spatial Linux Desktop
- **Game / project genre:** Spatial computing / open-source developer tooling / Linux desktop
- **Short description — 416 characters:** Spatial Linux Desktop runs a complete, interactive Linux workstation locally on Meta Quest using Termux, Termux:X11 and a native Android/Spatial SDK panel. The showcase runs the Codex desktop app with ray-pointer control, right-click, virtual and Bluetooth keyboards, and synchronized Quest microphone input. The open-source system also supports Git and local Android builds—without an external PC during normal use.
- **Project website:** https://mesmerprism.com/projects/spatial-linux-desktop.html
- **Project state:** Demo
- **Platform:** Mobile VR/MR (Meta Quest, Pico, etc.)
- **Space requirement:** The project can be demonstrated seated or standing and does not require room-scale movement. Allow approximately 1.5 × 1.5 metres of clear space for one presenter. A small table and chair are helpful for the Bluetooth keyboard, but optional.
- **Wi-Fi / LAN / Internet:** Yes. The Linux desktop and its video/input transport run locally on the headset. The Codex showcase requires ordinary outbound internet access for the Codex service; stable venue Wi-Fi is therefore requested.
- **USK approval:** No. This is an open-source spatial-computing and developer-tool demonstration rather than a game. No age rating is currently assigned.
- **Age rating:** Leave blank.
- **Store page:** https://github.com/MesmerPrism/quest-termux-lab
- **Five-minute uncut demo video:** Add the shared Google Drive folder or final video URL here.
- **Trailer:** Leave blank until one exists.
- **Additional link:** https://github.com/MesmerPrism/quest-termux-lab
- **Company logo:** https://mesmerprism.com/projects/spatial-linux-desktop/assets/mesmer-prism-logo-300dpi.png
- **Project logo / key art:** https://mesmerprism.com/projects/spatial-linux-desktop/assets/spatial-linux-desktop-key-art.png
- **How you learned about the submission:** Confirm the exact wording. If accurate: “Personal recommendation and direct coordination with the XR Showcase team.”

## Suggested comments / feedback

Spatial Linux Desktop is a single-user Meta Quest demonstration that can be experienced seated or standing. We can provide the headset, controllers, and Bluetooth keyboard. A power outlet, a small table, and stable outbound internet access are helpful. The Linux environment and all desktop video/input transport run locally on the headset; internet access is used by the Codex service in the showcase.

## Five-minute uncut demo plan

Target length: 4:15–4:45. Record one continuous take from a spectator-friendly Quest capture or cast view. Keep setup and terminal boot footage out of the application video.

1. **0:00–0:25 — Establish the claim.** Launch Spatial Linux Desktop in Window mode. Show the full XFCE desktop and state aloud that Linux and the native panel are running locally on Quest.
2. **0:25–0:55 — Native presentation.** Switch to Spatial mode, grab and reposition the 16:9 panel, resize it, and reconnect if needed. Return to a comfortable working position.
3. **0:55–1:35 — Pointer fidelity.** Open the Codex desktop app. Demonstrate hover, one normal click, scrolling, deliberate drag, and a right-click context menu.
4. **1:35–2:05 — Keyboard coverage.** Type a short prompt with the Horizon virtual keyboard, then add or edit a line with the paired Bluetooth keyboard.
5. **2:05–2:40 — Voice bridge.** Hover the Codex voice control, press controller B, show the red Quest microphone-live indicator, dictate one short request, press B again, and show the transcription.
6. **2:40–3:45 — Agentic workflow.** Ask Codex to make a small visible change in a prepared Android sample. Show the changed file or diff, run the bounded tests/build, and show the successful APK build result. If the video must remain deterministic, prepare the repository and prompt so the edit completes quickly.
7. **3:45–4:20 — Git proof.** Show `git status` or the desktop Git view, review the exact change, and commit it locally. Do not include credentials, private remotes, serials, or signing information in the capture.
8. **4:20–4:40 — Close.** Return to the spatial panel view and state: open-source, no root, no external PC during normal use, and device-local desktop transport.

## Recording checklist

- Use a clean demo user and synthetic repository with no secrets or personal paths.
- Hide notifications and personal files.
- Keep the panel text large enough to read in a 1080p conference-review video.
- Verify microphone permission, stable `quest_mic`, Codex authentication, Bluetooth keyboard, and internet before recording.
- Warm the Linux desktop and Codex app before the take so startup does not dominate the video.
- Show the app-side red microphone-live indicator at least once.
- Do not show headset serials, ADB output, signing keys, raw logs, or private Git credentials.
- Upload the uncut file to the agreed shared Drive folder and confirm link access in a signed-out browser before submitting the form.
