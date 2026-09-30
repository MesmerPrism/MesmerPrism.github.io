# Reachy Mini browser control

A browser interface for Reachy Mini camera, audio, antenna and head controls, emotes, and measured state. The public viewer uses an original schematic model. This independent prototype uses Reachy's existing interfaces and does not replace official device setup or firmware tools.

## Hosted browser mode

Open **[mesmerprism.com/reachy-mini](https://mesmerprism.com/reachy-mini/)** and choose guided setup or the Wireless controls. The controller uses the official JavaScript SDK without a local Node bridge during control. Setup shows one step at a time: choose a route, check compatibility, connect Wi-Fi, then enable browser control.

The experimental Bluetooth route probes PING, Wi-Fi status and encrypted provisioning in sequence without requiring a daemon version beforehand. It stops at the first failed check. Only an exact unsupported-command reply establishes that command is absent; timeouts and malformed replies remain inconclusive. PIN and Wi-Fi submission are available only after all checks pass, and require explicit user actions. The form waits for matching network status rather than treating an acknowledgement as a successful connection.

If Bluetooth is unavailable or cannot complete setup, the helper guides manual access-point selection and separate robot-owned browser tabs: daemon status, Settings, then dashboard. Pasted status retains only bounded version/model/status facts in memory; changing the host or replacing status with invalid JSON clears the previous guidance. Stock daemon 1.2.11 has source-confirmed Wi-Fi Settings; unknown versions are candidates to inspect, not promised compatible. Use a dedicated temporary network password for older HTTP forms. Complete fresh-device commissioning still needs attended verification. The official alternative is Reachy Mini Control, described in the [Wireless guide](https://huggingface.co/docs/reachy_mini/platforms/reachy_mini/get_started).

Setup code loads with the page; keep its tab open during network changes. The PIN and network password stay in the active tab and are cleared after Wi-Fi submission or disconnection. Reachy's stock encryption protects passive observation but does not authenticate against an active Bluetooth impersonator; use an isolated temporary network for initial testing. Current forms configure personal Wi-Fi, not eduroam/802.1X. Hugging Face registration is a separate robot-hosted browser handoff after joining the network; links are offered only for checked daemon versions. Review the requested scopes yourself. Setup sends no motion, Wake, audio or firmware-update commands.

The encryption preflight does not prove Bluetooth access or device discovery. Select Reachy to open the browser chooser; allow about 30 seconds for a named Reachy entry. An unknown or unsupported entry alone does not establish robot identity. Browser availability checks are advisory; the explicit chooser reports permission or policy failures separately from robot connection failures.

Enter your robot's Hugging Face identity and read token as prompted. The token stays in memory during the connection; it is not saved in browser storage or included in downloads. The supported daemon version is **1.10.0**. Camera and microphone features require browser permissions.

Hosted SDK transport and the local bridge have different motion and Stop capabilities. The local bridge's identity checks, recovery and measured-hold guarantees do not automatically apply to hosted connections. Follow the connection status and capability limitations shown in the UI. Stop is software control, not a hardware emergency stop.

## Local guarded bridge

Download the source ZIP linked from the hosted page. Install Node **22.12+ or 24**, extract the archive, and run:

```sh
npm ci
npm run setup
npm run build
npm start
```

Open **http://localhost:18750**. Setup performs read-only daemon discovery, requires **1.10.0**, and saves your origin and hardware identity in ignored `local/config.json`. Existing configuration requires explicit replacement. See [the setup guide](docs/SETUP.md) for Wireless versus USB-tethered Lite and unattended options.

Local head movement is disabled by default. `npm run setup -- --head-follow` approves attended manual head controls and webcam following, enabling ±20° turn and ±15° nod without claiming physical axis verification. Movement still requires explicit UI input. Manual tilt is ±15° and position axes ±10 mm; these are application limits, not certified robot bounds.

The local controller validates finite targets, excludes competing writers, discards queued motion after disconnect and distinguishes requested from measured state. Stop drains in-flight writes before holding fresh measured positions. Uncertain mutations or a foreign controller can lock movement until a safe stop is confirmed. Closing the interface does not automatically put the robot to sleep.

## Development and assets

```sh
npm test
npm run build
npm run demo
```

Demo mode simulates a robot without hardware commands. The project uses React, Vite and Node, with no Unity or WebXR dependency. Automated tests do not operate hardware.

Public downloads exclude official CAD binaries and private configuration. Local build preparation can retrieve pinned official CAD for private staging. Its hardware licensing is separate from this project's MIT software license: official notices describe Creative Commons BY-SA-NC without resolving every asset's version or vendor provenance. Read [third-party notices and CAD rights](THIRD_PARTY_NOTICES.md) before redistributing generated models. The original public schematic avoids those CAD files.

Bundled dependencies retain their own license notices. Do not publish local configuration, hardware identities, tokens, caches or generated private models.
