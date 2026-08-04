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
Fleet admission requires the v5 descriptor receipt and its explicit
exact-pinned, self-issued Authenticode trust disclosure; the catalog repeats
that owner claim without converting it into public trust.
It emits only a private, seven-day workflow artifact containing an ephemeral
catalog and Pages-owned readback receipt. It has no Pages, OIDC, release, push,
or deployment permission and records `publication_authorized=false`. The
protected workflow requires the complete five-owner labs set.

Kiosk admission additionally downloads only its small JSON bundle manifest,
never either APK. The owner metadata must hash-bind those exact manifest bytes;
the Pages adapter validates the closed six-asset release inventory, manifest
payload digests and byte counts, package identities, signer, tag-derived
version code, coinstallable lineage, and uninstall-only Labs exit policy.

The checked-in catalog is inert until an exact five-owner projection is
separately authorized. The dispatch-only catalog publication workflow admits
one successful protected read-only preflight run and its exact artifact ID,
archive digest, generated-catalog digest, and receipt digest. A read-only job
closes that external artifact; a main-only environment job runs only central
code, replaces `catalog.json`, records `publication.json`, stages only those
two paths, and requests the canonical Pages build. Renewal first reconstructs
the inert policy baseline, so an older public release record is never carried
forward without fresh owner readback. Both Fleet subtrees and every unrelated
site byte remain outside the projection. The Fleet metadata projection is not
catalog publication authority. This repository never derives owner metadata
from a GitHub `latest` download and never downloads or publishes owner binaries.
The `latest` endpoint is observed only for same-run drift and to ensure the
requested prerelease did not become the repository default. A latest release
owned by another product in a multi-product repository is retained as opaque,
bounded evidence and is not reinterpreted as this product's Stable release.

## Dormant Connection Hub Candidate Contract

The repository carries a fail-closed Pages admission adapter for a possible
sixth product, Rusty Connection Hub. It is deliberately dormant. The owner is
not present in `OWNERS`, the checked-in catalog, the catalog schema owner enum,
the browser allowlist, the protected complete-owner set, or the publication
projection. A structurally valid manifest therefore remains insufficient and
the current preflight rejects a `rusty-connection-hub` request as unknown.

The adapter schema at
`/Rusty-Morphospace/catalog/connection-hub-owner-release-admission.schema.json`
validates, but does not redefine, owner-authored
`rusty.quest.connection_hub_labs_release.v1` metadata. It admits only:

- tags matching `connection-hub-v0.1.0-alpha.N`, with positive canonical `N`;
- owner metadata named `connection-hub-release-manifest.json`;
- the package `io.github.mesmerprism.rustymanifold.broker` and matching
  `rusty-connection-hub-0.1.0-alpha.N.apk` primary artifact;
- exactly those two public release assets, with no extra name, duplicate name,
  duplicate asset ID, missing member, or substituted member;
- exact Rusty Quest source commit/tree and source URL, exact Manifold source
  commit/tree, signer, build-manifest digest, artifact digest, and byte count;
- a release APK with the debug shell operator absent and listener stopped by
  default;
- `transport_classification=trusted_lan_experimental`,
  `confidentiality=none`, `production_eligible=false`, and an explicit insecure
  trusted-LAN opt-in;
- no arbitrary remote-command surface and no high-rate media data plane.

The current generic GitHub readback remains the immutable distribution gate:
the exact tag must peel to the protected source revision, the release must be
public, `draft=false`, `prerelease=true`, and not the repository's latest
release, and every admitted asset must retain its exact-tag GitHub URL, digest,
byte count, uploaded state, and same-run identity. Initial and final readback
must preserve the complete normalized two-asset GitHub inventory exactly. A
release body, generated
manifest, workflow artifact, `latest/download` URL, or schema-valid fixture is
not publication evidence.

Pairing authenticates a controller but does not encrypt the current plaintext
WebSocket transport. Any future human card must show a conspicuous warning that
the option is only for a private trusted LAN, has no confidentiality, is not
production eligible, and starts only through explicit wearer action. The
catalog currently has no standalone Connection Hub guided installer; an APK or
documentation link must not be relabelled as one.

Activating this candidate changes validation authority. It requires the
two-PR external-validation route: independently seal and review the activation
commit; merge one exact base-policy approval binding its complete path/mode/
size/SHA-256 set; merge that new base into the unchanged candidate; then run
base-owned static Git-object admission and separate credential-free dynamic
tests. Only the later activation may add the sixth owner, change the catalog
count or projection, or dispatch a six-owner readback and publication.

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
five-owner adapter and damage matrix. That runner also executes the dormant
Connection Hub contract damage matrix while proving that the five-owner catalog
and publication projection remain authoritative and unchanged.
