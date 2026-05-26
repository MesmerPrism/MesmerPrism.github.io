# Writing Project Pages

Mesmer Prism is the public surface for selected private writing projects.
Almost every writing project should eventually have:

- a private development/source repo under `S:\Work\writing\active`;
- a public-facing page or section on `mesmerprism.com`;
- a source-checked handoff from private notes into public prose.

## Public page purpose

Public pages should focus on the topic itself:

- the phenomenon, object, method, historical line, or argument;
- the current evidence and source landscape;
- the strongest distinctions needed to read the topic carefully;
- connections to other Mesmer Prism pages when the connection clarifies the content;
- a comprehensive references section with working hyperlinks.

Public pages should not focus on the private project process:

- no "this project tracks...";
- no "this archive collects...";
- no "I am using this to...";
- no private pitch framing, grant framing, or "PhD project pitch" language;
- no repo-maintenance, source-audit, or worklog language;
- no claims about what the page "does" for the author.

Use the title subject as the public subject. For example, a Prophantasia page
should explain prophantasia, imagery change, source lines, evidence, and open
questions. It should not describe itself as a PhD pitch.

## Expected page shape

A typical writing-project page should contain:

- a direct lead about the subject;
- history or context;
- core concepts and distinctions;
- source-checked evidence or current state;
- limitations and open questions;
- connections to related pages where useful;
- references.

The page does not need a visible "about this project" section unless the page is
specifically a portfolio or process page.

## Deep Dream quality bar

Use `projects/deep-dream.html` as the current model for long-form writing
project pages. The standard is an in-depth, source-rich public article, not a
thin project blurb with a bibliography attached.

The article should be readable by an intelligent newcomer:

- open by naming the topic in plain language;
- define the key phenomenon, method, or argument before using specialist terms;
- explain why the topic matters without assuming project context;
- introduce the main lineages, communities, methods, and controversies early;
- separate "what this resembles", "what this measures", and "what this proves";
- give credit to non-academic, technical, community, artistic, and institutional
  contributors when they materially shaped the field;
- keep source types distinct: papers, repositories, community pages, trials,
  datasets, standards, press, and living project pages do different jobs;
- include a concise evidence or current-state audit so the reader can tell which
  claims are solid, partial, speculative, or merely current-status claims.

The article should also reward expert readers:

- track enough source detail that a reader can follow the field without
  reverse-engineering the bibliography;
- name important gaps, boundary cases, and failed overclaims;
- expose provenance when methods moved through communities, code, media, labs,
  institutions, or public discourse;
- prefer careful distinctions over heroic narrative arcs.

## Inline citation links

A references section is not enough for major writing-project pages. Important
claims should carry inline citation links at the point of use so readers can open
the original source in a new tab without losing their place.

Use this pattern in prose:

```html
(<a class="inline-citation" href="https://doi.org/example" target="_blank" rel="noopener noreferrer">Author et al., Year</a>)
```

For multiple sources in one citation cluster, separate links with semicolons:

```html
(<a class="inline-citation" href="URL-1" target="_blank" rel="noopener noreferrer">Author, Year</a>;
<a class="inline-citation" href="URL-2" target="_blank" rel="noopener noreferrer">Project Name</a>)
```

Inline citation rules:

- every non-obvious factual, historical, technical, empirical, or current-status
  claim should be locally anchored;
- citation links should open the original source, DOI, repository, registry,
  project page, or strongest public landing page in a new tab;
- use author-year labels for papers and stable source-name labels for tools,
  repositories, communities, and living pages;
- do not cite every sentence mechanically; cite at claim boundaries and at the
  end of paragraphs that synthesize one source cluster;
- avoid unlinked parenthetical name-dropping;
- avoid citation padding: if a source is not supporting, bounding, or
  contextualizing the local claim, leave it out;
- when a source supports only status, provenance, or community practice, say so
  in the prose or the reference entry rather than letting it imply validation.

The CSS class `inline-citation` is already available in `styles.css`. If a page
uses a different template, preserve the same behavior: accent-colored compact
links, `target="_blank"`, `rel="noopener noreferrer"`, and mobile-safe wrapping.

## References

Each writing-project page should maintain a visible references section.

Preferred citation style for public pages:

```html
<li><strong>Author.</strong> "<a class="reference-link" href="URL" target="_blank" rel="noopener noreferrer">Title</a>." <em>Venue</em> volume/issue (Year).</li>
```

Use the same pattern for books, chapters, patents, standards, trials, websites,
and datasets with appropriate substitutions:

- Papers: author, linked title, journal/book/conference, year, DOI when possible.
- Books/chapters: author/editor, linked title/chapter, book title, publisher if useful, year.
- Patents: inventor/assignee when clear, linked patent title or record number, jurisdiction/status, year.
- Clinical trials: registry, linked trial title/identifier, sponsor when useful, status/date checked.
- Websites and living project pages: organization/author, linked page title, publication/update date if visible, access date for current-state claims.
- Source code or datasets: organization/author, linked repository/dataset title, version/commit/date when relevant.

References should be comprehensive enough that a reader can follow the page's
claims back to original sources. Avoid citation padding: every reference should
support, contextualize, or bound a claim on the page.

Inline citation coverage and the final references section should agree. If a
source is cited in the text, it should usually appear in the references section;
if a source is listed in references, it should usually support a visible claim
in the page.

## Private-to-public handoff

Before editing a public writing page:

1. Run or refresh a private research pass in the owning writing repo.
2. Produce `PUBLIC_HANDOFF.md` with public-safe claims, caveats, and reference plan.
3. Remove private process framing and pitch language.
4. Add or update references in the public page.
5. Add inline citation links throughout the page, not only at the end.
6. Apply a humanizer pass for plain, direct prose.
7. Validate the static page locally, including citation-link checks and mobile
   overflow checks.
8. Commit the private research pass separately from the website update.

Minimum validation for a citation-heavy page:

- static parse confirms no duplicate IDs or missing internal anchors;
- all `.inline-citation` links have `target="_blank"` and
  `rel="noopener noreferrer"`;
- local HTTP check returns 200 for the page;
- desktop and mobile viewport checks show no horizontal overflow;
- `git diff --check` has no whitespace errors beyond normal line-ending notices.

## Agent artifacts

When a change affects only one public page, refresh only that page's managed
agent block and sidecar files:

```powershell
node scripts\generate-agent-artifacts.js --page projects\example.html
```

Use `--global` only when the edit should also refresh site-wide indexes such as
`agent-index.json`, `llms.txt`, references exports, or the sitemap:

```powershell
node scripts\generate-agent-artifacts.js --page projects\example.html --global
```
