# Authenticated read recovery

`connection-recovery.js` exports `{ RecoveryController }` through CommonJS or
`globalThis.ViscerealityRecovery`. It has no experiment-command interface and
does not read storage, visibility or connectivity. The app owns these inputs
and its snapshot/command gates.

```js
const controller = new ViscerealityRecovery.RecoveryController({
  attempt: ({ signal, generation }) => gateway.recoverStatusOnce({ signal }),
  onState: event => { /* publish into this connection's view */ },
  // Optional: setTimeout(callback, ms), clearTimeout(handle).
});
controller.start();
// Hidden: controller.suspend(). Visible: controller.resume().
// Explicit disconnect: controller.stop().
```

`attempt` resolves to `{kind:"success", value}`, `{kind:"retry", error?}` or
`{kind:"blocked", error?}`. Thrown errors and malformed results block; callers
must explicitly classify ordinary retryable failures. Success ends scheduling.
Retry waits 1000, 2000, 4000, 8000, 15000 milliseconds, then 15000 repeatedly.
Delay starts after the failed attempt settles.

`onState` receives `{state, generation, ...details}`. States are `attempting`
(one-based `attempt`), `waiting` (`delayMs`, optional `error`), `recovered`
(`value`), `blocked` (`error`), `suspended`, and `stopped`. `start()` explicitly
replaces the run and resets backoff. `suspend()` aborts/removes work; `resume()`
requires a fresh read and resets backoff. Blocked runs remain blocked across
suspend/resume; explicit `start()` can replace them. `stop()` aborts/removes
work and makes resume inert. All four methods return no result. Replacement,
suspension, resumption and stop advance the generation.

There is at most one callback or retry timer. An abort-ignoring callback holds
its slot until it settles; replacement waits for that settlement. Cancelled
generations and old timer callbacks cannot publish a result or alter a new
timer. Attempts should honor cancellation for prompt replacement. Gateway
requests settle on cancellation even if platform I/O ignores its signal.

## Gateway results and acceptance

`transport.js` additionally exports `GatewayError`. Instances expose `kind` and
`code`; timeout errors preserve `name:"TimeoutError"` for existing consumers.

`await gateway.recoverStatusOnce({signal} = {})` performs at most one identity
GET and one authenticated status POST. It never joins, reads receipts, writes
commands, changes mode, or retries internally. It reuses the in-memory key and
controller, fresh nonces, existing HMAC domains, and connected device/gateway/
native identities. Local joins also bind the physical serial and require the
local native-epoch/Remote identity fields. Older enrollment/relay identities
without additive fields remain compatible; signed status still checks the
connected native epoch.

Results are `{kind:"success",value:status}`, `{kind:"retry",error}` or
`{kind:"blocked",error}`. External cancellation rejects with the signal reason;
closing the Gateway also rejects an in-flight attempt. The existing ten-second
LAN/identity and fifteen-second relay POST deadlines include body consumption.

| Error kind | Codes | Disposition |
| --- | --- | --- |
| `transient` | `network`, `timeout`, `http-408`, `http-429`, `http-5xx` | Retry; retain key, disable commands |
| `availability` | `remote-unavailable`, `native-unavailable`, `read-in-progress` | Retry; wait for owner |
| `availability` | `not-connected` | Block; establish verified connection first |
| `rejoin-needed` | `guest-expired`, `gateway-lifetime`, `native-lifetime`, `retired` | Block this Gateway; app may verify/rejoin same physical selector and reset old UI |
| `integrity` | `physical-identity`, `identity-schema`, `reply-binding`, `reply-mac`, `response-json`, `payload-json`, `response-size`, `unexpected`, other `http-N` | Block and erase credentials; explicit resolution required |

The native HTTP boundary uses generic rejections. A local guest status POST
401/403 means `guest-expired`: expiry and guest revocation cannot be
distinguished. In recovery this follows exact same-device/serial/lifetime
identity readback; an ordinary status rejection has no new identity proof.
Both cases require fresh physical-selector verification before any join and
never permit reuse of the rejected key. Identity GET
rejections, enrolled/relay credential rejections, wrong physical identity and
bad reply HMAC remain integrity blocks. Direct/Choose is represented by
`remote_available:false` and returns availability without a status POST or mode
mutation. Changed gateway/native lifetimes erase the old key and remain distinct
from wrong physical identity. Retirement preserves its typed reason.

The native retirement identity can carry `native_epoch:"0"` with both
`enabled:false` and `remote_available:false`. For the same verified physical
identity and existing positive gateway epoch, that exact shape returns
`availability/native-unavailable`, retaining the key with no status POST or
command authority. Wrong device/serial or malformed zero-owner fields remain
integrity failures. A later positive changed native/gateway lifetime still
requires verified rejoin.

Recovery success leaves `gateway.active` false. The app validates full snapshot
shape, ordering, freshness, Remote mode and original-command policy, then calls
`gateway.acceptRecoveredStatus(status)`. It returns true only for the exact
latest successful result object, once, with an unaborted signal and an unretired
Gateway. Copies, replaced results and cancelled results return false. Acceptance
enables the transport write gate; it does not validate app freshness or original
command resolution. The app continues to gate its UI independently. A new
recovery clears the unaccepted result; `close()` clears it and erases keys.

Existing `connect`, `read`, `write`, `recoverStatus` and `close` signatures remain
compatible. `connect` retains authenticated initial admission. Legacy two-attempt
`recoverStatus` still returns a DataView and retains bounded exhaustion. New
lifecycle integration uses the neutral scheduler and one-attempt API. Ordinary
status TypeError/timeout/retryable HTTP failures now retain the key and disable
writes. Command failures remain single-dispatch and retire the connection;
recovery never replays them. Credentials are never persisted and server guest
registry policy is unchanged.

Inert Node tests execute actual signing/verification, cancellation, owner checks,
scheduler timing and zero command replay. They do not establish physical device,
browser lifecycle or LAN behavior.
