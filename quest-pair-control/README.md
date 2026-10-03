# Quest pair console

Static public UI; no device keys, relay server, SDK, APK or installation authority is hosted here. Credentials and controller sessions remain in tab memory. BLE Disconnect clears that slot's diagnostic credential. Hub Connect clears its session input after handing it to the connection; Hub Disconnect closes that connection without revoking the owner session. Forget clears both slots and all credential inputs. The page does not store tokens or accept credentials in URLs.

This page's source and its copied Connection Hub protocol projection are available under AGPL-3.0-or-later; see `LICENSE`. The upstream projection remains an unchanged Rusty Quest source file, not a new website-owned wire contract.

## Existing routes reused

- Rusty Quest peer rendezvous BLE service `9a7b1001-7d6a-4b7f-9d4a-6f7c0a010001`, offer/control/status characteristics 2/3/4. RQRV1 configured diagnostic fields and RQRV2 compact observed array are independently authenticated with their original HMAC domain. Current protocol reference: Rusty Quest `7423eb5ef23c30fd05adc7e27d520bbf9cb9c5b0`, `apps/peer-rendezvous-android`.
- Connection Hub `/v1/socket`, exact v2 controller authentication and advertised surface commands. `hub-protocol.js` is the unchanged owner browser protocol projection from `apps/manifold-broker-android/src/main/assets/connection-hub/protocol.js`. Canonical command bytes retain the owner’s published vector hash. ACK/transport alone never becomes provider-applied success.

The browser can read both headsets and compare authenticated same-session/epoch complementary role fields. v1 is configured hints, including any `ready` hint. v2 reflects the owner’s sampled post-formation group identity. Neither qualifies cameras, streaming, Broker acceptance, or encrypted transport. Reading age is local browser receipt age, not an independent device-clock measurement.

The optional v1 exchange uses `browser-diagnostic` as the controller identity with a complementary configured role. It never impersonates the opposite headset. A post-send acceptance observation must bind the pre-send peer/session/epoch/configured role, sequence 3 and a changed acceptance nonce. RQRV1 does not echo the proposal nonce or controller identity, so this is explicitly **not** exact proposal acknowledgement or causal pairing proof. Retained unchanged acceptances and mismatched identities are rejected. v2 writes are deliberately unavailable: a browser cannot provide the Quest-local boot/group observation required by the existing handler. Existing device-to-device pairing continues to belong to the owner helper.

## Controls and deployment

Connect an existing, explicitly enrolled Connection Hub controller session to a TLS-capable endpoint. The console renders only live advertised surfaces and their empty-argument commands, matching the existing owner browser adapter. Unknown/expired sessions and malformed/unjoined receipts close the control channel. Commands have one in-flight request, a 10-second outcome bound and no automatic retry. Disconnect does not revoke a controller session; use the Hub’s owner page to revoke it.

GitHub Pages HTTPS cannot use the owner’s plaintext `ws://` trusted-LAN listener directly. The separate **Choose Hub BLE helper** route uses an explicitly wearer-started `connection-hub-ble-bridge-android` helper, its actual listener status and negotiated MTU, then carries the unchanged existing Hub authentication and command messages over Bluetooth GATT to fixed Quest loopback. This is GATT, not a Bluetooth WebSocket protocol; the internal experimental Hub hop remains WebSocket. The helper requires the Hub's signing certificate and existing read-only signature permission. That permission and a BLE connection create no controller/provider grant. The same real enrolled controller session, current registered provider and native command authorization remain mandatory. Only advertised empty Own/Peer commands are enabled on this carrier; a GATT write ACK never becomes provider-applied success.

The visible helper Activity must be enabled by the wearer. Its non-exported foreground service has a fixed fifteen-minute transport bound, no boot start, no authority renewal and an explicit Stop notification. The browser requires HTTPS, Web Bluetooth support and a user chooser gesture. Fragment size follows actual MTU (at most244 bytes), messages are bounded16KiB with a ten-second assembly bound, and disconnect/replay/expiry closes the channel. No automatic reconnect or credential persistence is used. Link confidentiality and production eligibility remain unqualified. If neither this helper nor TLS is available, use the Hub’s own local page. This console does not silently start listeners, connect Wi-Fi, reset apps or translate rendezvous BLE diagnostics into streaming commands.

Next owner adapter needed for direct browser-driven Quest-to-Quest formation: an advertised app-owned surface mapping closed typed pairing/stop/readiness actions to the existing guarded peer helper, with explicit enrollment, freshness/replay, runtime-applied receipts and a supported secure browser transport. No such command is invented in this page.

Deploy through the repository’s existing GitHub Pages main/root route after review. The distribution catalog and its release authorizations are unchanged.

## Focused checks

`node --test quest-pair-control/protocol.test.cjs` checks wire bytes, authentication damage, configured/observed separation, stale/conflicting group fields, endpoint safety, expired controller sessions, command receipt joins and the exact published canonical vector. Browser tests must keep simulated BLE/socket evidence explicitly separate from live device qualification.

`node --test quest-pair-control/hub-ble.test.cjs` exercises the production carrier with target-free GATT callbacks: exact UTF8 and MTU bounds, reordered/replayed fragments, expiry, unavailable helper status, unchanged native frames, serialized operations and retirement before a queued write. These checks do not qualify a real radio, Android service permission, wearer listener, controller grant or GPU effect.
