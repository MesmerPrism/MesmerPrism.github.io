# Local setup

The [hosted browser controller](https://mesmerprism.com/reachy-mini/) is the preferred Wireless entry point. This guide covers the separate local Node bridge fallback, whose motion monitoring and measured-hold Stop differ from the browser SDK transport.

Install Node **22.12+ or 24**, download and extract the source ZIP linked from the hosted page, and open a terminal in that directory.

Wireless runs its daemon on the robot. Initial Wi-Fi configuration uses the official Reachy Mini Control application's first-connection wizard; browser control needs no desktop helper once setup is complete. See the [official Wireless guide](https://huggingface.co/docs/reachy_mini/platforms/reachy_mini/get_started). Lite instead uses USB and its supplied power adapter, with a daemon on the computer, commonly `http://localhost:8000`. See the [official Lite guide](https://huggingface.co/docs/reachy_mini/platforms/reachy_mini_lite/get_started) and [REST API guide](https://huggingface.co/docs/reachy_mini/API/rest-api).

```sh
npm ci
npm run setup
npm run build
npm start
```

Setup asks for your daemon's plain HTTP origin. Wireless commonly uses `http://reachy-mini.local:8000`; enter the address appropriate to your network. No machine-specific address or hardware identity is bundled.

The wizard requests only `GET /api/daemon/status`, checks its hardware identity and requires daemon **1.10.0**, supported by this local adapter. Other versions fail without saving. Setup never changes Wi-Fi or daemon settings, wakes the robot or sends motion. Consult official instructions if the daemon is unavailable; do not change its version merely to bypass this check.

After confirmation, setup writes ignored `local/config.json`. Existing configuration is preserved unless you type `REPLACE` or pass `--replace`. Replacement writes a new configuration; retain any custom settings before choosing it. Setup never clears `local/unknown-outcome.json`. Open **http://localhost:18750** after starting. The bridge binds to loopback; do not expose it directly to the internet.

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
