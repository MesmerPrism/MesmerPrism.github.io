# Quest browser dependency

`gatt-lifetime.js` is the exact static artifact from the Quest producer named
in `source.json`. Both browser controls load this one file. It serializes GATT
operations and rejects late completion from retired connections; it does not
grant control authority or confirm an app effect.

Update this copy only from an immutable reviewed producer revision and refresh
the SHA-256 pin. `node --test shared/quest-ble/*.test.cjs` checks the bytes and
the installed production script order. Producer package tests are retained
unchanged beside the artifact. The website owns no new wire protocol.
