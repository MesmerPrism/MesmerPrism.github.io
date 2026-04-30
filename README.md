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
  layout module, so the public site does not contact jsDelivr during page load.
- The fallback text stays in the HTML for no-JS and failure cases.
- On desktop pointers, the intro text reflows around the cursor and settles back to a
  static block when the pointer leaves.
- On touch devices and reduced-motion setups, it stays static.
- Disable it instantly by changing
  `data-pretext-hero="on"` to `data-pretext-hero="off"` in
  [`index.html`](index.html).

## Privacy-sensitive assets

The site serves its fonts from [`assets/fonts.css`](assets/fonts.css) and local
WOFF2 files instead of loading Google Fonts from Google's servers.
