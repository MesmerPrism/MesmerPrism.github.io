# MesmerPrism.github.io

Personal homepage for Till Holzapfel.

## Local preview

From the repository root:

```powershell
python -m http.server 8000
```

Then open `http://localhost:8000`.

## Deployment

This repository is intended to publish through GitHub Pages from the `main`
branch root.

## Custom domain

The target public domain for this site is:

- `mesmerprism.com`

The repository includes a `CNAME` file for the custom domain and a
[`DOMAIN_SETUP.md`](DOMAIN_SETUP.md) checklist for the Squarespace -> GitHub
Pages DNS cutover.

## Pretext Hero

The homepage includes an optional experimental hero enhancement in
[`scripts/pretext-hero.js`](scripts/pretext-hero.js).

- It uses a local vendored copy of the MIT-licensed `@chenglou/pretext`
  layout module and its runtime dependencies, so the public site does not
  contact jsDelivr during page load.
- The fallback text stays in the HTML for no-JS and failure cases.
- On desktop pointers, the intro text reflows around the cursor and settles back to a
  static block when the pointer leaves.
- On touch devices and reduced-motion setups, it stays static.
- Disable it instantly by changing
  `data-pretext-hero="on"` to `data-pretext-hero="off"` in
  [`index.html`](index.html).

## Plasmatic Multitudes

The Plasmatic Multitudes public pages live directly inside this site under
[`plasmatic-multitudes/`](plasmatic-multitudes/). The former standalone
`plasmatic-multitudes-pages` repo is only a legacy redirect shell for old
GitHub Pages links.

## Rusty Morphospace release channels

The public stable/labs policy catalog lives at
[`Rusty-Morphospace/catalog/`](Rusty-Morphospace/catalog/). It contains no
binaries and makes no release claim until an owning workflow supplies complete
exact-tag provenance. See
[`docs/DISTRIBUTION_CATALOG.md`](docs/DISTRIBUTION_CATALOG.md) for the owner
authority, Fleet Pages composition, feedback, and validation contracts.
It currently models five complete-product owners, including the unpublished,
opt-in Rusty Hostess Windows labs owner without asserting a stable release.
The protected read-only preflight can validate exact live owner releases and
retain private review evidence, but it has no Pages deployment or publication
permission and never changes the checked-in unpublished baseline. Its central
workflow requires all five Labs owners; Kiosk adds strict JSON-manifest and
coinstallable-lineage validation without downloading either APK. Product
channel, release maturity, and distribution track remain separate bounded
facts; first Labs candidates use the `github-prerelease` track and may retain
`-alpha.N` maturity tags. Kiosk Meta Store distribution remains owned by its
separate launcher metadata, outside this GitHub-bundle catalog projection.
Installation identities likewise remain owner-metadata facts; the catalog is
never their authority.

Fleet's renewable signed metadata uses a separate dispatch-only central
workflow. Fleet signs and preflights the candidate, then sends a bounded
hash-bound public request. This repository checks out the exact Fleet release
tag, reruns Fleet's Pages staging verifier, replaces only `Rusty-Fleet/`,
commits that owned subtree, requests the canonical Pages build, and leaves the
catalog plus every unrelated byte unchanged. This route publishes no owner
binary and grants no catalog publication authority.

## Privacy-sensitive assets

The site serves its fonts from [`assets/fonts.css`](assets/fonts.css) and local
WOFF2 files instead of loading Google Fonts from Google's servers.
