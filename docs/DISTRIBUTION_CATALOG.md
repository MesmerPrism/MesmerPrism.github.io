# Rusty Morphospace Distribution Catalog

The public catalog at `/Rusty-Morphospace/catalog/` explains stable and labs
channel policy across six complete products. It is a projection surface, not
a release authority, binary host, update feed, or substitute for owner
metadata.

## Authority

Each product owner remains the only authority for:

- whether a release exists;
- its exact tag, version, source revision, artifact name, size, and SHA-256;
- its installation identity and signer policy;
- the immutable `releases/download/<exact-tag>/<asset>` URL;
- promotion, rollback, replacement, and withdrawal decisions.

The preflight derives an inert policy baseline with
`availability: unpublished` and `release: null` for every channel. A checked-in
published projection additionally requires its exact `publication.json`
authorization. The schema can validate an ephemeral published projection, but
the normal semantic validator rejects one unless its caller explicitly
identifies it as a preflight-generated projection. Human cards say “No
cataloged release yet” for unpublished channels and must not construct, guess,
probe, or expose a download URL for them.

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
protected workflow requires the complete six-owner labs set.

Kiosk admission additionally downloads only its small JSON bundle manifest,
never either APK. The owner metadata must hash-bind those exact manifest bytes;
the Pages adapter validates the closed six-asset release inventory, manifest
payload digests and byte counts, package identities, signer, tag-derived
version code, coinstallable lineage, and uninstall-only Labs exit policy.

The dispatch-only catalog publication workflow admits
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

## Active Connection Hub Owner Contract

Rusty Connection Hub is the sixth labs-only product owner. It is present in the
closed owner registry, checked-in catalog policy, schema owner enum, browser
allowlist, and protected complete-owner set. Its checked-in channel starts
`unpublished`; a structurally valid manifest alone remains insufficient to
publish it.

The adapter schema at
`/Rusty-Morphospace/catalog/connection-hub-owner-release-admission.schema.json`
validates, but does not redefine, owner-authored
`rusty.quest.connection_hub_labs_release.v1` metadata. It admits only:

- tags matching `connection-hub-v0.1.0-alpha.N`, with positive canonical `N`;
- owner metadata named `connection-hub-release-manifest.json`;
- the package `io.github.mesmerprism.rustymanifold.broker` and matching
  `rusty-connection-hub-0.1.0-alpha.N.apk` primary artifact;
- exactly those two tag-bound assets plus the fixed `LICENSE` and
  `SOURCE-NOTICE.md` auxiliary assets, with no extra name, duplicate name,
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
must preserve the complete normalized four-asset GitHub inventory exactly. A
release body, generated manifest, workflow artifact, `latest/download` URL, or
schema-valid fixture is not publication evidence.

Pairing authenticates a controller but does not encrypt the current plaintext
WebSocket transport. The human card shows a conspicuous warning that the option
is only for a private trusted LAN, has no confidentiality, is not production
eligible, starts stopped, and requires explicit wearer action. The catalog has
no standalone Connection Hub guided installer; an APK or documentation link
must not be relabelled as one.

The Hub card links to QuestIonAble File Manager Labs only as a separate Quest
installation route and to Rusty Hostess Labs only as a separate Windows control
companion. The first reviewed six-owner request binds QFM
`v0.5.0-alpha.12`, Hostess `v0.1.0-alpha.7`, and Connection Hub
`connection-hub-v0.1.0-alpha.3` under their own owners. It does not copy either
companion's release URL or metadata into Hub authority.
That exact request is retained at
`tools/fixtures/distribution-catalog/connection-hub-six-owner-activation-request.json`;
fresh live readback remains mandatory because the fixture is reviewed input,
not release or publication evidence.

This activation changes validation authority and follows the two-PR external-
validation route: independently seal and review the activation commit; merge
one exact base-policy approval binding its complete path/mode/size/SHA-256 set;
merge that new base into the unchanged candidate; then run base-owned static
Git-object admission and separate credential-free dynamic tests. Neither the
candidate nor its tests authorize merge or publication.

The checked-in `publication.json` initially remains the immutable authorization
for its earlier five-owner catalog bytes. During this transition it may validate
only the exact five-product projection obtained by removing the unpublished Hub
record; it cannot authorize a Hub release. The next successful six-owner live
preflight and separately authorized publication replaces it with
`complete-six-owner-labs-set` and a six-record source receipt. No workflow ID,
artifact digest, timestamp, or publication claim is fabricated in this
activation candidate.

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
- Rusty Connection Hub exposes only labs,
  `io.github.mesmerprism.rustymanifold.broker`. Removing it does not remove its
  distinct QFM or Hostess companions. Its trusted-LAN plaintext option remains
  explicit opt-in and provides no confidentiality.

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
`python tools/test_distribution_catalog_preflight.py` for the strict six-owner
adapter and damage matrix. That runner executes the active Connection Hub
four-asset contract matrix and validates the exact reviewed six-owner request.
Run the request through the protected read-only workflow for fresh public owner
readback before any six-owner publication.
