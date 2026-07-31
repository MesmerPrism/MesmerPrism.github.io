# Rusty Morphospace Distribution Catalog

The public catalog at `/Rusty-Morphospace/catalog/` explains stable and alpha
channel policy across five complete products. It is a projection surface, not
a release authority, binary host, update feed, or substitute for owner
metadata.

## Authority

Each product owner remains the only authority for:

- whether a release exists;
- its exact tag, version, source revision, artifact name, size, and SHA-256;
- its installation identity and signer policy;
- the immutable `releases/download/<exact-tag>/<asset>` URL;
- promotion, rollback, replacement, and withdrawal decisions.

The checked-in catalog therefore uses `availability: unpublished` and
`release: null`. The schema can validate an ephemeral published projection,
but the normal semantic validator rejects one unless its caller explicitly
identifies it as a preflight-generated projection. Human pages must say “No
cataloged release yet” and must not construct, guess, probe, or expose a
download URL.

Published records use exact owner repository URLs and canonical
`vX.Y.Z` or `vX.Y.Z-alpha.N` tags. `latest/download`, redirects, ranges,
branches, workflow artifacts, Pages-hosted binaries, and partial provenance
are rejected.

## Fleet Pages Composition

Rusty Fleet continues to own:

- `/Rusty-Fleet/metadata/stable/release.json`;
- `/Rusty-Fleet/metadata/alpha/release.json`.

The catalog does not write either path and does not reinterpret Fleet
signatures. A deployment composes the complete existing site, then replaces
only the subtree explicitly staged by the current owner workflow. Updating
Fleet alpha metadata must preserve Fleet stable metadata and every unrelated
site byte; updating this catalog must preserve both Fleet subtrees.

An owner release must exist and pass its own readback before Pages may project
it. The protected `distribution-catalog-preflight` workflow independently
reads the exact tag, peeled source revision and tree, immutable owner metadata
asset, and primary artifact digest and byte count from the owner repository.
It emits only a private, seven-day workflow artifact containing an ephemeral
catalog and Pages-owned readback receipt. It has no Pages, OIDC, release, push,
or deployment permission and records `publication_authorized=false`. The
protected workflow requires the complete five-owner alpha set.

Kiosk admission additionally downloads only its small JSON bundle manifest,
never either APK. The owner metadata must hash-bind those exact manifest bytes;
the Pages adapter validates the closed six-asset release inventory, manifest
payload digests and byte counts, package identities, signer, tag-derived
version code, same-package mode, and forward-only exit policy.

The checked-in catalog remains unpublished. A later single deployment
authority must preserve both Fleet subtrees and independently admit the
preflight receipt before any public projection. This repository never derives
owner metadata from a GitHub `latest` download and never downloads or
publishes owner binaries.

## Channel Policy

Stable is the ecosystem default wherever an owner has declared a stable
channel. Alpha is conspicuous and opt-in. An alpha-only owner is represented
without inventing a stable channel, identity, or transition.

- QuestIonAble File Manager uses a separate Windows alpha package identity.
- Rusty Fleet uses a separate Windows alpha identity. Exact stable and alpha
  identity values remain null here until Fleet owner metadata supplies them.
- Rusty Hostess currently exposes only the opt-in Windows alpha identity
  `rusty-hostess-alpha`; no stable Hostess product identity or release is
  asserted. Its complete product includes the source-owned WPF companion,
  CLI/tools, and Meta Cinematic Cast adapter source. MQDH and `Casting.exe`
  remain external. Hostess claims no presentation effectiveness, recording,
  input forwarding, extended-FOV restoration, or device cleanup authority.
  Removing alpha removes only Hostess Alpha and does not change other products.
- Rusty Kiosk alpha uses the stable Android package identity in place. It is
  not coinstallable and Android downgrade is not an exit route. Install a
  later same-signer stable build with a higher version code to leave alpha.
- Rusty Quest Package Updater currently exposes only alpha,
  `io.github.mesmerprism.rustyquest.packageupdater.alpha`. The catalog asserts
  no stable updater package or identity.

Every channel entry represents the complete current owner product, not a
feature-reduced build.

## Feedback

Feedback links open the owning repository’s GitHub issue route with fields for
channel, version, source revision, artifact SHA-256, operating system, and
device class. Reports must not contain credentials, personal data, device
serials, network addresses, pairing material, private logs, or proprietary
payloads.

## Validation

Run:

```powershell
python tools/test_distribution_catalog.py
```

Install the exactly pinned validator from
`tools/requirements-distribution-catalog.txt` in the validation environment.
The test applies the published Draft 2020-12 schema before semantic checks.
It validates the static policy and schema, catalog-driven page rendering,
stable-first ordering, owner-specific feedback routes, Kiosk in-place
warnings, disabled publication admission, identity isolation, unknown
owner/channel rejection, and public-boundary leakage patterns. Structural
release fields remain reserved for a future owner-readback projection and are
not publication evidence by themselves. Run
`python tools/test_distribution_catalog_preflight.py` for the strict
five-owner adapter and damage matrix.
