# Rusty Morphospace Distribution Catalog

The public catalog at `/Rusty-Morphospace/catalog/` explains stable and labs
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
are rejected. `product_channel` is the persistent installation lane
(`stable` or `labs`); `maturity` is independently bounded to `alpha`, `beta`,
`rc`, or `released`; and `distribution_track` is independently bounded to
`github-release`, `github-prerelease`, or `meta-store-app`. The inert owner-release
catalog uses `github-release` for Stable and `github-prerelease` for current
Labs candidates. An `-alpha.N` tag describes maturity only and never renames
the Labs product channel.

## Fleet Pages Composition

Rusty Fleet continues to own:

- `/Rusty-Fleet/metadata/stable/release.json`;
- `/Rusty-Fleet/metadata/labs/release.json`.

The catalog does not write either path and does not reinterpret Fleet
signatures. The dispatch-only `fleet-pages-projection` workflow is the
central deployment authority for those Fleet paths. It accepts a bounded,
hash-bound public request from Fleet, checks out the exact release tag,
regenerates the staging tree with Fleet's verifier, replaces only the
`Rusty-Fleet` human surface and target metadata channel, commits that exact
subtree, and requests the canonical legacy Pages build. Updating Fleet Labs
metadata must preserve Fleet Stable metadata and every unrelated site byte;
updating this catalog must preserve both Fleet subtrees.

An owner release must exist and pass its own readback before Pages may project
it. The protected `distribution-catalog-preflight` workflow independently
reads the exact tag, peeled source revision and tree, immutable owner metadata
asset, and primary artifact digest and byte count from the owner repository.
It emits only a private, seven-day workflow artifact containing an ephemeral
catalog and Pages-owned readback receipt. It has no Pages, OIDC, release, push,
or deployment permission and records `publication_authorized=false`. The
protected workflow requires the complete five-owner labs set.

Kiosk admission additionally downloads only its small JSON bundle manifest,
never either APK. The owner metadata must hash-bind those exact manifest bytes;
the Pages adapter validates the closed six-asset release inventory, manifest
payload digests and byte counts, package identities, signer, tag-derived
version code, coinstallable lineage, and uninstall-only Labs exit policy.

The checked-in catalog remains unpublished. Its separately authorized public
projection must preserve both Fleet subtrees and independently admit the
five-owner preflight receipt. The Fleet metadata projection is not catalog
publication authority. This repository never derives owner metadata from a
GitHub `latest` download and never downloads or publishes owner binaries.

## Channel Policy

Stable is the ecosystem default wherever an owner has declared a stable
channel. Labs is conspicuous and opt-in. A Labs-only owner is represented
without inventing a stable channel, identity, or transition.

- QuestIonAble File Manager uses a separate Windows labs package identity.
- Rusty Fleet uses the separate Windows Labs identity `rusty-fleet-labs`.
  Its stable identity remains owner-metadata-authoritative.
- Rusty Hostess currently exposes only the opt-in Windows labs identity
  `rusty-hostess-labs`; no stable Hostess product identity or release is
  asserted. Its complete product includes the source-owned WPF companion,
  CLI/tools, and Meta Cinematic Cast adapter source. MQDH and `Casting.exe`
  remain external. Hostess claims no Meta software redistribution,
  presentation effectiveness, recording, input forwarding, extended-FOV
  restoration, or device cleanup authority.
  Removing labs removes only Hostess Labs and does not change other products.
- Rusty Kiosk Labs uses the coinstallable Android identity
  `io.github.mesmerprism.rustykiosk.labs`. Uninstalling Labs does not change
  the stable package. Its separate launcher metadata owns the Meta Store
  distribution track; this catalog's Kiosk owner-release record projects the
  GitHub bundle track (`github-prerelease`). The existing
  [Stable Store launcher](https://www.meta.com/en-gb/experiences/rusty-kiosk-launcher/1241943475671333/)
  remains the Stable front door; the Labs launcher requires a separate Store
  app registration and is not asserted as published by this catalog.
- Rusty Quest Package Updater currently exposes only labs,
  `io.github.mesmerprism.rustyquest.packageupdater.labs`. The catalog asserts
  no stable updater package or identity.

Every channel entry represents the complete current owner product, not a
feature-reduced build.

Installation identities are always owner-issued facts. The catalog may project
an exact identity from owner metadata, but `identity_authority` remains
`owner-release-metadata`; Pages never becomes identity authority by repeating
the value in an inert policy record.

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
stable-first ordering, owner-specific feedback routes, Kiosk coinstallable
warnings, disabled publication admission, identity isolation, unknown
owner/channel rejection, and public-boundary leakage patterns. Structural
release fields remain reserved for a future owner-readback projection and are
not publication evidence by themselves. Run
`python tools/test_distribution_catalog_preflight.py` for the strict
five-owner adapter and damage matrix.
