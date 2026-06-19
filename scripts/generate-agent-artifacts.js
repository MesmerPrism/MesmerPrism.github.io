const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const SITE_URL = "https://mesmerprism.com";
const GENERATED_DATE = process.env.MESMER_AGENT_ARTIFACT_DATE || new Date().toISOString().slice(0, 10);
const AUTHOR = "Till Holzapfel";
const SITE_NAME = "Mesmer Prism";
const EXCLUDED_HTML = new Set(["404.html"]);
const OPTIONAL_HTML = new Set([
  "plasmatic-multitudes/assets/calligraphy-reference-pack/board.html",
]);
const SIDECAR_EXTENSIONS = [".md", ".txt", ".bib", ".references.csl.json"];

function usage() {
  return [
    "Usage:",
    "  node scripts/generate-agent-artifacts.js",
    "  node scripts/generate-agent-artifacts.js --page projects/example.html",
    "  node scripts/generate-agent-artifacts.js --page projects/example.html --global",
    "",
    "Without --page, the script refreshes every public page and global indexes.",
    "With --page, it refreshes only that page's managed HTML block and sidecars.",
    "Add --global to also rebuild agent-index, llms, references, and sitemap files.",
  ].join("\n");
}

function normalizeTarget(value) {
  let target = String(value || "").trim();
  if (!target) return "";
  if (/^https?:\/\//i.test(target)) {
    target = new URL(target).pathname;
  }
  target = toPosix(target).replace(/^\/+/, "");
  if (!target) return "index.html";
  const rootPrefix = `${toPosix(ROOT)}/`;
  if (target.startsWith(rootPrefix)) {
    target = target.slice(rootPrefix.length);
  }
  target = target.replace(/^\.\//, "");
  if (target.endsWith("/")) {
    target += "index.html";
  }
  target = target
    .replace(/\.references\.csl\.json$/i, ".html")
    .replace(/\.(md|txt|bib)$/i, ".html");
  if (!target.endsWith(".html")) {
    target += ".html";
  }
  return target;
}

function parseArgs(argv) {
  const targets = [];
  let updateGlobal = false;
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--help" || arg === "-h") {
      console.log(usage());
      process.exit(0);
    }
    if (arg === "--page" || arg === "--only" || arg === "--target") {
      const value = argv[index + 1];
      if (!value) {
        throw new Error(`${arg} requires an HTML page path`);
      }
      targets.push(normalizeTarget(value));
      index += 1;
      continue;
    }
    if (arg === "--global" || arg === "--update-global") {
      updateGlobal = true;
      continue;
    }
    if (arg.startsWith("--")) {
      throw new Error(`Unknown option: ${arg}\n${usage()}`);
    }
    targets.push(normalizeTarget(arg));
  }
  const targetRels = new Set(targets.filter(Boolean));
  return {
    targetRels,
    targeted: targetRels.size > 0,
    updateGlobal: targetRels.size === 0 || updateGlobal,
  };
}

function toPosix(filePath) {
  return filePath.replace(/\\/g, "/");
}

function walk(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === ".git" || entry.name === "node_modules") continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(full, out);
    } else if (entry.isFile() && entry.name.endsWith(".html")) {
      out.push(full);
    }
  }
  return out;
}

function read(file) {
  return fs.readFileSync(file, "utf8");
}

function write(file, content) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, content, "utf8");
}

function stripManagedBlocks(html) {
  return html
    .replace(/\n[ \t]*<!-- BEGIN agent-readable metadata -->[\s\S]*?<!-- END agent-readable metadata -->\n?/g, "\n")
    .replace(/\n[ \t]*<!-- BEGIN page-export-links -->[\s\S]*?<!-- END page-export-links -->\n?/g, "\n");
}

function isNoindexOrRedirect(html) {
  return /<meta\b[^>]+name=["']robots["'][^>]+content=["'][^"']*\bnoindex\b/i.test(html)
    || /<meta\b[^>]+http-equiv=["']refresh["']/i.test(html);
}

function cleanupExcludedPage(file, rel, html) {
  const cleaned = stripManagedBlocks(html);
  if (cleaned !== html) write(file, cleaned);
  for (const extension of SIDECAR_EXTENSIONS) {
    const artifact = path.join(ROOT, artifactRel(rel, extension));
    if (fs.existsSync(artifact)) fs.unlinkSync(artifact);
  }
}

function removeArtifact(rel, extension) {
  const artifact = path.join(ROOT, artifactRel(rel, extension));
  if (fs.existsSync(artifact)) fs.unlinkSync(artifact);
}

function decodeEntities(value) {
  return value
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, "\"")
    .replace(/&#39;/g, "'")
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCharCode(parseInt(code, 16)));
}

function escapeHtml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function escapeBib(value) {
  return String(value || "")
    .replace(/\\/g, "\\textbackslash{}")
    .replace(/[{}]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function stripTags(html) {
  return decodeEntities(
    html
      .replace(/<script\b[\s\S]*?<\/script>/gi, "")
      .replace(/<style\b[\s\S]*?<\/style>/gi, "")
      .replace(/<svg\b[\s\S]*?<\/svg>/gi, "")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim(),
  );
}

function normalizeGeneratedText(value) {
  return String(value || "")
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .split("\n")
    .map((line) => line.trimEnd())
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function attr(tag, name) {
  const pattern = new RegExp(`${name}\\s*=\\s*("([^"]*)"|'([^']*)'|([^\\s"'>]+))`, "i");
  const match = tag.match(pattern);
  return match ? decodeEntities(match[2] || match[3] || match[4] || "") : "";
}

function metaContent(html, selector) {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const byName = html.match(new RegExp(`<meta\\b(?=[^>]*(?:name|property)=["']${escaped}["'])[^>]*>`, "i"));
  return byName ? attr(byName[0], "content") : "";
}

function titleFromHtml(html) {
  const match = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  return match ? stripTags(match[1]).replace(/\s+\|\s+Mesmer Prism$/, "").trim() : "";
}

function urlPathForHtml(rel) {
  if (rel === "index.html") return "/";
  if (rel.endsWith("/index.html")) return `/${rel.slice(0, -"index.html".length)}`;
  return `/${rel}`;
}

function canonicalFromHtml(html, rel) {
  const match = html.match(/<link\b(?=[^>]*rel=["']canonical["'])[^>]*>/i);
  return match ? attr(match[0], "href") : `${SITE_URL}${urlPathForHtml(rel)}`;
}

function artifactRel(rel, ext) {
  return rel.replace(/\.html$/i, ext);
}

function artifactHref(rel, ext) {
  return `/${artifactRel(rel, ext)}`;
}

function absoluteHref(pageRel, href) {
  if (!href) return "";
  if (/^(https?:)?\/\//i.test(href) || href.startsWith("mailto:") || href.startsWith("tel:")) {
    return href.startsWith("//") ? `https:${href}` : href;
  }
  if (href.startsWith("#")) return `${SITE_URL}${urlPathForHtml(pageRel)}${href}`;
  if (href.startsWith("/")) return `${SITE_URL}${href}`;
  const base = path.posix.dirname(urlPathForHtml(pageRel));
  return `${SITE_URL}${path.posix.normalize(path.posix.join(base, href))}`;
}

function extractMain(html) {
  const main = html.match(/<main\b[^>]*>([\s\S]*?)<\/main>/i);
  if (main) return main[1];
  const body = html.match(/<body\b[^>]*>([\s\S]*?)<\/body>/i);
  return body ? body[1] : html;
}

function htmlToMarkdown(html, pageRel) {
  let content = extractMain(html)
    .replace(/<!-- BEGIN page-export-links -->[\s\S]*?<!-- END page-export-links -->/g, "")
    .replace(/<script\b[\s\S]*?<\/script>/gi, "")
    .replace(/<style\b[\s\S]*?<\/style>/gi, "")
    .replace(/<svg\b[\s\S]*?<\/svg>/gi, "")
    .replace(/<nav\b[\s\S]*?<\/nav>/gi, "")
    .replace(/<figure\b[\s\S]*?<\/figure>/gi, "");

  content = content.replace(/<a\b([^>]*)>([\s\S]*?)<\/a>/gi, (full, attrs, label) => {
    const href = attr(`<a ${attrs}>`, "href");
    const text = stripTags(label);
    if (!text) return "";
    return `[${text}](${absoluteHref(pageRel, href)})`;
  });

  content = content
    .replace(/<h1\b[^>]*>([\s\S]*?)<\/h1>/gi, (_, text) => `\n# ${stripTags(text)}\n\n`)
    .replace(/<h2\b[^>]*>([\s\S]*?)<\/h2>/gi, (_, text) => `\n## ${stripTags(text)}\n\n`)
    .replace(/<h3\b[^>]*>([\s\S]*?)<\/h3>/gi, (_, text) => `\n### ${stripTags(text)}\n\n`)
    .replace(/<h4\b[^>]*>([\s\S]*?)<\/h4>/gi, (_, text) => `\n#### ${stripTags(text)}\n\n`)
    .replace(/<li\b[^>]*>([\s\S]*?)<\/li>/gi, (_, text) => `\n- ${stripTags(text)}\n`)
    .replace(/<\/p>/gi, "\n\n")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(?:section|article|div|ul|ol)>/gi, "\n")
    .replace(/<[^>]+>/g, " ");

  return normalizeGeneratedText(
    decodeEntities(content)
      .replace(/[ \t]+\r?\n/g, "\n")
      .replace(/[ \t]{2,}/g, " "),
  );
}

function markdownToText(markdown) {
  return normalizeGeneratedText(
    markdown
      .replace(/\[([^\]]+)\]\(([^)]+)\)/g, "$1 ($2)")
      .replace(/^#{1,6}\s+/gm, "")
      .replace(/^\s*[-*]\s+/gm, "- "),
  );
}

function slug(value) {
  return String(value || "item")
    .toLowerCase()
    .replace(/&[a-z]+;/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 56) || "item";
}

function firstYear(text) {
  const match = String(text || "").match(/\b(18|19|20)\d{2}\b/);
  return match ? match[0] : "";
}

function genericAnchorText(text) {
  return /^(archive|article|doi|docs?|documentation|github|journal page|link|open|page|paper|pdf|publisher|source|website)$/i
    .test(String(text || "").trim());
}

function enclosingListLead(html, index) {
  const start = html.lastIndexOf("<li", index);
  if (start < 0) return "";
  const end = html.indexOf("</li>", index);
  if (end < index) return "";
  return stripTags(html.slice(start, index)).replace(/\s+/g, " ").trim();
}

function inferAuthor(label) {
  const cleaned = String(label || "").trim();
  const sentence = cleaned.split(/[.;]/)[0].trim();
  if (!sentence || sentence.length > 90) return "";
  if (/\bet al\.?$/i.test(sentence) || /^[A-Z][A-Za-z'-]+(?:,| and |\s&\s)/.test(sentence)) {
    return sentence.replace(/[.:]+$/, "");
  }
  return "";
}

function doiFromUrl(url) {
  const match = decodeURIComponent(url).match(/10\.\d{4,9}\/[^\s?#)]+/i);
  return match ? match[0].replace(/[.,;]+$/, "") : "";
}

function referenceEntries(html, page) {
  const entries = [];
  const seen = new Set();
  const anchorPattern = /<a\b([^>]*)\bhref=["']([^"']+)["']([^>]*)>([\s\S]*?)<\/a>/gi;
  const preferReferenceLinks = /<a\b[^>]*\bclass=["'][^"']*\breference-link\b/i.test(html);
  let match;
  while ((match = anchorPattern.exec(html))) {
    if (preferReferenceLinks && !/\bclass=["'][^"']*\breference-link\b/i.test(match[0])) continue;
    const href = decodeEntities(match[2]);
    if (!/^https?:\/\//i.test(href) || seen.has(href)) continue;
    seen.add(href);
    const anchorText = stripTags(match[4]);
    const listStart = html.lastIndexOf("<li", match.index);
    const listEnd = html.indexOf("</li>", match.index);
    const listHtml = listStart >= 0 && listEnd >= match.index
      ? html.slice(listStart, listEnd + "</li>".length)
      : "";
    const start = Math.max(0, match.index - 600);
    const end = Math.min(html.length, match.index + match[0].length + 700);
    const context = html.slice(start, end);
    const strong = (listHtml.match(/<strong\b[^>]*>([\s\S]*?)<\/strong>/i)
      || context.match(/<strong\b[^>]*>([\s\S]*?)<\/strong>/i));
    const listLead = enclosingListLead(html, match.index);
    const contextLabel = stripTags(listHtml) || listLead || stripTags(context);
    const title = (!anchorText || genericAnchorText(anchorText))
      ? (listLead || anchorText || href)
      : anchorText;
    const author = strong
      ? stripTags(strong[1]).replace(/[.:]+$/, "")
      : (listLead ? inferAuthor(listLead) : (genericAnchorText(anchorText) ? "" : anchorText));
    const year = firstYear(contextLabel);
    const doi = doiFromUrl(href);
    const id = `${slug(author || new URL(href).hostname)}-${slug(title)}${year ? `-${year}` : ""}`;
    entries.push({
      id,
      title: title || href,
      author,
      year,
      url: href,
      doi,
      sourcePageTitle: page.title,
      sourcePageUrl: page.url,
    });
  }
  return entries;
}

function bibForEntries(entries) {
  if (!entries.length) {
    return `% No references were detected for this page.\n`;
  }
  const used = new Map();
  return entries.map((entry) => {
    const base = entry.id || "reference";
    const count = used.get(base) || 0;
    used.set(base, count + 1);
    const key = count ? `${base}-${count + 1}` : base;
    const fields = [
      ["title", entry.title],
      ["author", entry.author],
      ["year", entry.year],
      ["url", entry.url],
      ["doi", entry.doi],
      ["urldate", GENERATED_DATE],
      ["note", `Referenced by ${entry.sourcePageTitle}: ${entry.sourcePageUrl}`],
    ].filter(([, value]) => value);
    return `@misc{${key},\n${fields.map(([name, value]) => `  ${name} = {${escapeBib(value)}}`).join(",\n")}\n}`;
  }).join("\n\n") + "\n";
}

function cslForEntries(entries) {
  return JSON.stringify(entries.map((entry) => {
    const item = {
      id: entry.id,
      type: entry.doi ? "article-journal" : "webpage",
      title: entry.title,
      URL: entry.url,
      accessed: { "date-parts": [[Number(GENERATED_DATE.slice(0, 4)), Number(GENERATED_DATE.slice(5, 7)), Number(GENERATED_DATE.slice(8, 10))]] },
      note: `Referenced by ${entry.sourcePageTitle}: ${entry.sourcePageUrl}`,
    };
    if (entry.author) item.author = [{ literal: entry.author }];
    if (entry.year) item.issued = { "date-parts": [[Number(entry.year)]] };
    if (entry.doi) item.DOI = entry.doi;
    return item;
  }), null, 2) + "\n";
}

function pageMarkdown(page) {
  const lines = [
    `# ${page.title}`,
    "",
    `Source: ${page.url}`,
    `Canonical HTML: ${page.url}`,
    `Generated: ${GENERATED_DATE}`,
  ];
  if (page.description) lines.push(`Description: ${page.description}`);
  lines.push(`Markdown: ${SITE_URL}${page.markdownHref}`);
  lines.push(`Plain text: ${SITE_URL}${page.textHref}`);
  if (page.references.length) {
    lines.push(`BibTeX references: ${SITE_URL}${page.bibHref}`);
    lines.push(`CSL JSON references: ${SITE_URL}${page.cslHref}`);
  }
  lines.push("", "---", "", page.markdownBody, "");
  return normalizeGeneratedText(lines.join("\n")) + "\n";
}

function buildMetadataBlock(page) {
  const alternates = [
    `<link rel="alternate" type="text/markdown" href="${escapeHtml(page.markdownHref)}" title="Markdown version">`,
    `<link rel="alternate" type="text/plain" href="${escapeHtml(page.textHref)}" title="Plain text version">`,
  ];
  if (page.references.length) {
    alternates.push(`<link rel="alternate" type="application/x-bibtex" href="${escapeHtml(page.bibHref)}" title="BibTeX references">`);
    alternates.push(`<link rel="alternate" type="application/vnd.citationstyles.csl+json" href="${escapeHtml(page.cslHref)}" title="CSL JSON references">`);
  }
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: page.title,
    name: page.title,
    description: page.description || undefined,
    author: { "@type": "Person", name: AUTHOR },
    publisher: { "@type": "Organization", name: SITE_NAME, url: SITE_URL },
    isPartOf: { "@type": "WebSite", name: SITE_NAME, url: SITE_URL },
    url: page.url,
    dateModified: GENERATED_DATE,
    inLanguage: "en",
    encoding: [
      { "@type": "MediaObject", encodingFormat: "text/markdown", contentUrl: `${SITE_URL}${page.markdownHref}` },
      { "@type": "MediaObject", encodingFormat: "text/plain", contentUrl: `${SITE_URL}${page.textHref}` },
    ],
    citation: page.references.map((entry) => entry.url),
  };
  if (page.references.length) {
    jsonLd.encoding.push(
      { "@type": "MediaObject", encodingFormat: "application/x-bibtex", contentUrl: `${SITE_URL}${page.bibHref}` },
      { "@type": "MediaObject", encodingFormat: "application/vnd.citationstyles.csl+json", contentUrl: `${SITE_URL}${page.cslHref}` },
    );
  }
  const jsonText = JSON.stringify(jsonLd, null, 6).replace(/\n/g, "\n    ");
  return [
    "    <!-- BEGIN agent-readable metadata -->",
    ...alternates.map((line) => `    ${line}`),
    `    <meta name="citation_title" content="${escapeHtml(page.title)}">`,
    `    <meta name="citation_author" content="${escapeHtml(AUTHOR)}">`,
    `    <meta name="citation_publication_date" content="${escapeHtml(GENERATED_DATE)}">`,
    `    <meta name="citation_online_date" content="${escapeHtml(GENERATED_DATE)}">`,
    `    <meta name="citation_public_url" content="${escapeHtml(page.url)}">`,
    `    <meta name="citation_language" content="en">`,
    `    <script type="application/ld+json" data-agent-metadata>`,
    `    ${jsonText}`,
    "    </script>",
    "    <!-- END agent-readable metadata -->",
  ].join("\n");
}

function buildExportBlock(page) {
  const links = [
    `<a href="${escapeHtml(page.markdownHref)}" download>Markdown</a>`,
    `<a href="${escapeHtml(page.textHref)}" download>Text</a>`,
  ];
  if (page.references.length) {
    links.push(`<a href="${escapeHtml(page.bibHref)}" download>BibTeX</a>`);
    links.push(`<a href="${escapeHtml(page.cslHref)}" download>CSL JSON</a>`);
  }
  return [
    "        <!-- BEGIN page-export-links -->",
    "        <section class=\"agent-downloads\" aria-labelledby=\"page-downloads\">",
    "            <h2 id=\"page-downloads\">Page exports</h2>",
    "            <div class=\"agent-downloads__links\">",
    `                ${links.join("\n                ")}`,
    "            </div>",
    "        </section>",
    "        <!-- END page-export-links -->",
  ].join("\n");
}

function updateHtml(page) {
  let html = stripManagedBlocks(page.originalHtml);

  const metadata = buildMetadataBlock(page);
  html = html.replace(/[ \t\r\n]*<\/head>/i, `\n${metadata}\n</head>`);

  if (!page.optional && /<\/main>/i.test(html)) {
    html = html.replace(/[ \t\r\n]*<\/main>/i, `\n${buildExportBlock(page)}\n</main>`);
  }
  return html;
}

function pageGroup(rel) {
  if (rel === "index.html") return "Core";
  if (rel.startsWith("projects/")) return "Project pages";
  if (rel.startsWith("plasmatic-multitudes/")) return "Plasmatic Multitudes";
  if (rel.startsWith("Strobotorch/")) return "Strobotorch";
  return "Site pages";
}

function sitemapPriority(rel) {
  if (rel === "index.html") return "1.0";
  if (rel === "plasmatic-multitudes/index.html") return "0.9";
  if (rel.startsWith("projects/")) return "0.8";
  if (rel.startsWith("plasmatic-multitudes/")) return "0.7";
  if (rel.startsWith("Strobotorch/")) return "0.7";
  if (rel === "impressum.html" || rel === "datenschutz.html") return "0.3";
  return "0.5";
}

function buildSitemap(pages) {
  const urls = pages
    .filter((page) => !page.rel.endsWith("/board.html"))
    .map((page) => [
      "  <url>",
      `    <loc>${escapeHtml(page.url)}</loc>`,
      `    <lastmod>${GENERATED_DATE}</lastmod>`,
      `    <changefreq>${page.rel === "index.html" ? "weekly" : "monthly"}</changefreq>`,
      `    <priority>${sitemapPriority(page.rel)}</priority>`,
      "  </url>",
    ].join("\n"));
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join("\n")}\n</urlset>\n`;
}

function buildLlms(pages) {
  const groups = new Map();
  for (const page of pages) {
    const group = page.optional ? "Optional" : pageGroup(page.rel);
    if (!groups.has(group)) groups.set(group, []);
    groups.get(group).push(page);
  }
  const lines = [
    "# Mesmer Prism",
    "",
    "> Public website for Mesmer Prism: research notes, writing projects, XR and perception tools, source maps, and portfolio context.",
    "",
    "Use the Markdown alternates for compact reading. Use the BibTeX or CSL JSON alternates when importing references into tools such as Zotero. The canonical human pages remain the HTML URLs.",
    "",
    "## Machine-readable indexes",
    `- [Agent index](${SITE_URL}/agent-index.json): JSON list of public pages, summaries, machine-readable alternates, and reference-export paths.`,
    `- [All references BibTeX](${SITE_URL}/references/all.bib): Combined references detected from public pages.`,
    `- [All references CSL JSON](${SITE_URL}/references/all.csl.json): Combined references in CSL JSON.`,
    `- [Sitemap](${SITE_URL}/sitemap.xml): XML sitemap for canonical HTML pages.`,
    "",
  ];

  for (const [group, items] of groups) {
    lines.push(`## ${group}`);
    for (const page of items) {
      const note = page.description ? `: ${page.description}` : "";
      lines.push(`- [${page.title}](${SITE_URL}${page.markdownHref})${note}`);
    }
    lines.push("");
  }
  return lines.join("\n").replace(/\n{3,}/g, "\n\n").trim() + "\n";
}

function buildLlmsFull(pages) {
  return [
    "# Mesmer Prism Full Agent Context",
    "",
    `Generated: ${GENERATED_DATE}`,
    "",
    ...pages.map((page) => [
      `<page url="${page.url}" path="${page.rel}">`,
      pageMarkdown(page).trim(),
      "</page>",
      "",
    ].join("\n")),
  ].join("\n");
}

function main() {
  const options = parseArgs(process.argv.slice(2));
  const discovered = walk(ROOT)
    .map((file) => ({ file, rel: toPosix(path.relative(ROOT, file)) }))
    .sort((a, b) => a.rel.localeCompare(b.rel));

  const files = [];
  const discoveredRels = new Set(discovered.map((item) => item.rel));
  for (const item of discovered) {
    const originalHtml = read(item.file);
    if (EXCLUDED_HTML.has(item.rel) || isNoindexOrRedirect(originalHtml)) {
      if (!options.targeted || options.targetRels.has(item.rel)) {
        cleanupExcludedPage(item.file, item.rel, originalHtml);
      }
      continue;
    }
    files.push({ ...item, originalHtml: stripManagedBlocks(originalHtml) });
  }

  const missingTargets = [...options.targetRels].filter((rel) => !discoveredRels.has(rel));
  if (missingTargets.length) {
    throw new Error(`No matching HTML page found for: ${missingTargets.join(", ")}`);
  }

  const pages = files.map(({ file, rel, originalHtml }) => {
    const title = titleFromHtml(originalHtml) || rel;
    const description = metaContent(originalHtml, "description") || metaContent(originalHtml, "og:description");
    const url = canonicalFromHtml(originalHtml, rel);
    const markdownBody = htmlToMarkdown(originalHtml, rel);
    const page = {
      file,
      rel,
      originalHtml,
      title,
      description,
      url,
      markdownHref: artifactHref(rel, ".md"),
      textHref: artifactHref(rel, ".txt"),
      bibHref: artifactHref(rel, ".bib"),
      cslHref: artifactHref(rel, ".references.csl.json"),
      markdownBody,
      optional: OPTIONAL_HTML.has(rel),
      references: [],
    };
    page.references = referenceEntries(originalHtml, page);
    return page;
  });

  const pagesToWrite = options.targeted
    ? pages.filter((page) => options.targetRels.has(page.rel))
    : pages;

  for (const page of pagesToWrite) {
    write(path.join(ROOT, artifactRel(page.rel, ".md")), pageMarkdown(page));
    write(path.join(ROOT, artifactRel(page.rel, ".txt")), markdownToText(pageMarkdown(page)) + "\n");
    if (page.references.length) {
      write(path.join(ROOT, artifactRel(page.rel, ".bib")), bibForEntries(page.references));
      write(path.join(ROOT, artifactRel(page.rel, ".references.csl.json")), cslForEntries(page.references));
    } else {
      removeArtifact(page.rel, ".bib");
      removeArtifact(page.rel, ".references.csl.json");
    }
    write(page.file, updateHtml(page));
  }

  if (!options.updateGlobal) {
    console.log(JSON.stringify({
      generated: GENERATED_DATE,
      mode: "targeted",
      pages: pagesToWrite.length,
      globalIndexes: false,
      targets: [...options.targetRels],
    }, null, 2));
    return;
  }

  const allRefs = [];
  const seen = new Set();
  for (const page of pages) {
    for (const ref of page.references) {
      if (seen.has(ref.url)) continue;
      seen.add(ref.url);
      allRefs.push(ref);
    }
  }

  const index = {
    generated: GENERATED_DATE,
    site: SITE_URL,
    pages: pages.map((page) => ({
      title: page.title,
      description: page.description,
      path: page.rel,
      url: page.url,
      group: page.optional ? "Optional" : pageGroup(page.rel),
      markdown: `${SITE_URL}${page.markdownHref}`,
      text: `${SITE_URL}${page.textHref}`,
      bibtex: page.references.length ? `${SITE_URL}${page.bibHref}` : null,
      cslJson: page.references.length ? `${SITE_URL}${page.cslHref}` : null,
      references: page.references.length,
    })),
  };

  write(path.join(ROOT, "agent-index.json"), JSON.stringify(index, null, 2) + "\n");
  write(path.join(ROOT, "llms.txt"), buildLlms(pages));
  write(path.join(ROOT, "llms-full.txt"), buildLlmsFull(pages));
  write(path.join(ROOT, "references", "all.bib"), bibForEntries(allRefs));
  write(path.join(ROOT, "references", "all.csl.json"), cslForEntries(allRefs));
  write(path.join(ROOT, "references", "page-map.json"), JSON.stringify(index, null, 2) + "\n");
  write(path.join(ROOT, "sitemap.xml"), buildSitemap(pages));

  console.log(JSON.stringify({
    generated: GENERATED_DATE,
    mode: options.targeted ? "targeted-with-global" : "full",
    updatedPages: pagesToWrite.length,
    pages: pages.length,
    references: allRefs.length,
    globalIndexes: true,
    sitemapUrls: pages.filter((page) => !page.rel.endsWith("/board.html")).length,
  }, null, 2));
}

main();
