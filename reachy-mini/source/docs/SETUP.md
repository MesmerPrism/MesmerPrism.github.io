# Local setup

The [hosted browser controller](https://mesmerprism.com/reachy-mini/) is the preferred Wireless entry point. This guide covers the separate local Node bridge fallback, whose motion monitoring and measured-hold Stop differ from the browser SDK transport.

Install Node **22.12+ or 24**, download and extract the source ZIP linked from the hosted page, and open a terminal in that directory.

Wireless runs its daemon on the robot. The hosted page’s [guided setup](https://mesmerprism.com/reachy-mini/#setup) checks Bluetooth capabilities in sequence and offers robot-owned browser pages when provisioning is unavailable. Browser setup depends on the installed image; network setup and control compatibility are checked separately. The official alternative is Reachy Mini Control’s first-connection wizard, described in the [Wireless guide](https://huggingface.co/docs/reachy_mini/platforms/reachy_mini/get_started). Lite instead uses USB and its supplied power adapter, with a daemon on the computer, commonly `http://localhost:8000`. See the [official Lite guide](https://huggingface.co/docs/reachy_mini/platforms/reachy_mini_lite/get_started) and [REST API guide](https://huggingface.co/docs/reachy_mini/API/rest-api).

```sh
npm ci
npm run setup
npm run build
npm start
```

Setup asks for your daemon's plain HTTP origin. Wireless commonly uses `http://reachy-mini.local:8000`; enter the address appropriate to your network. No machine-specific address or hardware identity is bundled.

The wizard requests only `GET /api/daemon/status`, checks its hardware identity and requires daemon **1.10.0**, supported by this local adapter. Other versions fail without saving. Setup never changes Wi-Fi or daemon settings, wakes the robot or sends motion. Consult official instructions if the daemon is unavailable; do not change its version merely to bypass this check.

After confirmation, setup writes ignored `local/config.json`. Existing configuration is preserved unless you type `REPLACE` or pass `--replace`. Replacement writes a new configuration; retain any custom settings before choosing it. Setup never clears `local/unknown-outcome.json`. Open **http://localhost:18750** after starting. The bridge binds to loopback; do not expose it directly to the internet.

## Agent diagnostics CLI

This optional Node tool supports unattended diagnostics and publication checks.
The hosted webpage and simulation still work without a helper download.
Use Node 22.12+ or 24 and the same source package:

```sh
npm run agent -- --help
npm run agent -- status --host reachy-mini.local
npm run agent -- guidance --status-file local/daemon-status.json
npm run agent -- validate-export
npm run agent -- verify-site --url https://mesmerprism.com/reachy-mini/
```

For JSON-only stdout, call `node tools/Agent-Diagnostics.mjs` directly with the
same arguments. Exit 0 means completed; exit 2 means failed with a sanitized
error code. `guidance --stdin` accepts status JSON from a pipe. Reports omit
hardware identity, network names, addresses, raw errors and credentials.

`status` makes one bounded GET request to the specified private/local host,
without redirects, network scanning, config reading or config writes. It shares
the browser helper's status parser and version guidance. Daemon 1.2.11 is a
successful diagnostic result with legacy setup guidance, even though the
controller is still unsupported. A daemon version never proves the separately
installed Bluetooth service's capabilities.

`validate-export` runs the existing publication privacy audit without exporting.
`verify-site` checks every declared build/source file and the source ZIP against
manifest sizes and SHA-256 hashes. For a local preview use
`verify-site --site-dir <website-root>/reachy-mini`. This establishes publication
consistency, not independent authenticity, rendered browser behavior, or robot
health. Build manifests do not inventory the separately copied MediaPipe models.

The CLI has no mutation commands. Browser first pairing requires a device
chooser, and account authorization remains an explicit browser handoff. For
automated browser testing, the repository's `test/fixtures/setup-qa.html` uses
synthetic GATT rather than hardware; `npm test` retains the protocol regression
tests. Do not replace these with a test that assumes one shipped daemon version.

## Approve head controls

Head movement is disabled by default. For attended manual head controls and webcam following:

```sh
npm run setup -- --head-follow
```

An existing configuration requires explicit replacement. This enables **±20° turn / ±15° nod**, recording operator approval while keeping physical axis verification false. Manual tilt is ±15° and position axes ±10 mm. These are application limits, not certified hardware bounds. Setup never moves the robot; webcam movement requires the UI's explicit hold control. Check direction and clearance while attended. Software Stop holds measured pose; it is not emergency power-off.

## Noninteractive options

```sh
npm run setup -- --url http://reachy-mini.local:8000 --head-follow --yes
npm run setup -- --help
```

`--yes` requires `--url`. Add `--replace` only to replace existing configuration. Credentials, URL paths, queries and fragments are rejected. Setup output does not print the detected hardware identity.

Public downloads omit official CAD binaries and use an original schematic. Local build preparation can retrieve pinned official models for private staging; their unresolved hardware redistribution terms are separate from this application's MIT license. Review [third-party notices](../THIRD_PARTY_NOTICES.md) before sharing generated models. Configuration, downloaded caches and official generated assets remain ignored.

## Hosted first-time network setup

Open the public [setup wizard](https://mesmerprism.com/reachy-mini/#setup) and
choose **Bluetooth** or **Wi-Fi**. Keep the tab loaded when changing networks.
Neither route changes the computer's Wi-Fi automatically.

Bluetooth checks the actual installed service's public reply, Wi-Fi status and
encrypted provisioning before offering PIN and credential submission. Direct
Wi-Fi asks for Reachy's address and checks the daemon and Wi-Fi status through
its local HTTP API. Supporting browsers may request Local Network Access
permission. Requests are limited to the explicit private/local host, with no
address scan, redirects, cookies, storage or cloud relay.

Direct Wi-Fi currently supports audited Wireless daemon 1.2.11. Newer source
restricts website origins and cannot be admitted from API shape alone. Unknown
versions, blocked browser access and unsupported Bluetooth keep the separate
robot-owned Settings/dashboard workflow. Do not disable browser protections.

For direct Wi-Fi, keep the daemon OFF and use a dedicated temporary hotspot
password. The 1.2.11 API accepts the password in a local HTTP request URL;
robot/browser diagnostic logs may contain it. This is an upstream interface
limitation, disclosed before the explicit submit button. Existing saved profiles
may reuse their saved password instead of replacing it with the submitted one.

An accepted request is not proof of joining. A network transition can disconnect
the old access point and produce an apparent page error despite successful setup.
Join the target network on the computer, enter Reachy's current address and
check status. Only the intended SSID in WLAN mode confirms the request. An
unconfirmed write blocks another submission, including switching to Bluetooth,
while this setup instance remains open. Leaving setup cancels local work and
clears credentials; a submitted robot request can still finish. Reloading clears
in-memory evidence, so observe the robot before submitting again. Nothing is
replayed. Internet access and remote-control compatibility are separate checks.

The adapter is independently written MIT code against the audited Pollen
[Wi-Fi API](https://github.com/pollen-robotics/reachy_mini/blob/e25d28a52f657354716b693ca6d557fe3595702a/src/reachy_mini/daemon/app/routers/wifi_config.py).
See Chrome's [Local Network Access documentation](https://developer.chrome.com/blog/local-network-access).

### Browser software update after network setup

For an observed Wireless daemon 1.2.11, Step 4 now links directly to the robot's
own Settings updater. The robot needs internet to download the official packages;
the user does not need to download an installer on their computer. Check the
offered version, leave pre-release unchecked, and explicitly start an update on
the robot page only when ready. Keep robot power and network available throughout.
The legacy updater selects the current stable package at installation time; it
cannot select our controller's audited version. This page never starts an update
automatically and the handoff button only opens the robot's page.

After the restart, return to the wizard and inspect/paste the fresh daemon status.
A job reporting done, a Completed label or a closed connection is not verification:
the legacy subprocess wrapper does not check installer exit codes, and its job
records do not survive daemon restart. Only a new healthy daemon/version readback
establishes the observed result. Unknown controller versions remain blocked.
Newer daemons can restrict direct public-origin API reads; opening their raw status
page and pasting its bounded response remains the browser-only verification route.
For failures, use the official recovery guide rather than automatically repeating
an uncertain update.

Reviewed source: [1.2.11 update router](https://github.com/pollen-robotics/reachy_mini/blob/e25d28a52f657354716b693ca6d557fe3595702a/src/reachy_mini/daemon/app/routers/update.py),
[installer](https://github.com/pollen-robotics/reachy_mini/blob/e25d28a52f657354716b693ca6d557fe3595702a/src/reachy_mini/utils/wireless_version/update.py),
and [subprocess wrapper](https://github.com/pollen-robotics/reachy_mini/blob/e25d28a52f657354716b693ca6d557fe3595702a/src/reachy_mini/utils/wireless_version/utils.py).
