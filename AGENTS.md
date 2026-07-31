# Mesmer Prism Site Agent Guide

This repository is the public website for Mesmer Prism:

```text
https://mesmerprism.com
```

For writing-project pages, read:

1. `docs/WRITING_PROJECT_PAGES.md`
2. `S:\Work\writing\AGENTS.md`
3. `S:\Work\writing\_registry\STRUCTURE_STANDARD.md`
4. the owning private writing project's `AGENTS.md`

Most public project pages correspond to a private writing/research repo under
`S:\Work\writing\active`. The private repo owns original sources, source
audits, drafts, claim ledgers, and worklogs. The public website owns synthesis,
reader-facing context, and linked references.

Public pages should explain the subject matter directly. Avoid meta talk about
what the private project, repo, archive, or pitch does for the author. Internal
process language belongs in the private repo, not on the website.

For the Rusty Morphospace distribution catalog, read
`docs/DISTRIBUTION_CATALOG.md`. Product owners retain release authority.
Catalog entries may project only complete owner-validated exact-tag metadata;
never publish binaries, use `latest/download`, infer an unreleased version, or
overwrite Fleet's sibling channel or unrelated complete-site metadata.
Every checked-in channel must remain `unpublished` with `release: null`;
structurally plausible release fields are not publication evidence. The
read-only preflight may generate a published projection only after exact live
owner readback, and its receipt must keep `publication_authorized=false` and
`pages_deployment_invoked=false`. It may not write the site or owner releases.
The protected central run requires all five alpha owners. Kiosk admission may
download its hash-bound JSON bundle manifest for closed lineage validation but
must never download either APK or infer authority from manifest array order.
Apply `catalog.schema.json` with the pinned Draft 2020-12 validator before
semantic admission. The human product cards render only from validated local
catalog data using safe DOM construction; do not duplicate release state in
HTML. Feedback issue paths must exactly extend the declared owner repository.
The catalog includes five owners. Rusty Hostess is alpha-only unless its owner
publishes a reviewed stable identity; keep MQDH and `Casting.exe` external and
preserve the Hostess cast-adapter authority exclusions.
