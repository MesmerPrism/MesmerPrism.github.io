# Calligraphy Reference Pack

This folder holds a small, rights-checked museum reference set for future `plasmatic-multitudes-pages` styling passes.

It is intentionally narrow:

- official source pages only
- museum images only when the source exposes public-domain / open-access usage
- a small local subset chosen for paper, ink, seal, and layout value rather than collection breadth

## Sources

- Cleveland Museum of Art Open Access API:
  `https://openaccess-api.clevelandart.org/`
- The Met Open Access and Collection API:
  `https://www.metmuseum.org/about-the-met/policies-and-documents/open-access`
  `https://metmuseum.github.io/`
- Smithsonian / National Museum of Asian Art Open Access tooling:
  `https://www.si.edu/openaccess/devtools`
  `https://asia.si.edu/explore-art-culture/collections/search/?edan_fq%5B%5D=media_usage%3ACC0&edan_fq%5B%5D=object_type%3ACalligraphy+%28visual+works%29`

## What is here

- `original/`: downloaded museum previews used as the ground-truth visual reference set
- `derived/`: direct-use crops pulled from the originals for future hero ornaments, separators, paper fields, and accent marks
- `manifest.json`: source metadata, rights proof, local filenames, and integration notes
- `palette.json`: sampled color tokens from the set
- `board.html`: a quick visual board for reviewing the pack in one place

## Intended use

- Use the originals as the visual truth when the CSS starts drifting toward generic parchment or generic brush motifs.
- Use the derived crops only as lightweight ornaments or atmospheric surfaces.
- Keep accents sparse. The pack is strongest when black ink and paper tone do most of the work and vermilion stays rare.
- Prefer crop-based integration over dropping full artworks into the site chrome.

## Rebuild

Run:

```powershell
.\scripts\build-calligraphy-reference-pack.ps1
```

That script re-downloads the curated set and regenerates `manifest.json`, `palette.json`, and the files under `derived/`.
