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
`release: null` until an owner workflow supplies a complete validated release
record. Human pages must say “No cataloged release yet” and must not construct,
guess, probe, or expose a download URL.

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

An owner workflow may supply catalog release fields only after its own release
creation and readback checks pass. The Pages composition step validates the
candidate catalog before deployment. This repository never derives owner
metadata from a GitHub “latest” endpoint and never publishes owner binaries.

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
warnings, immutable URL shape, provenance requirements, identity isolation,
unknown owner/channel rejection, and public-boundary leakage patterns.
