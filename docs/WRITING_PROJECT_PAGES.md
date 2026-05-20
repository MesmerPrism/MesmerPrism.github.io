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

## Private-to-public handoff

Before editing a public writing page:

1. Run or refresh a private research pass in the owning writing repo.
2. Produce `PUBLIC_HANDOFF.md` with public-safe claims, caveats, and reference plan.
3. Remove private process framing and pitch language.
4. Add or update references in the public page.
5. Apply a humanizer pass for plain, direct prose.
6. Validate the static page locally.
7. Commit the private research pass separately from the website update.

