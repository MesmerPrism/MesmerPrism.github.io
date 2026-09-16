const test = require("node:test");
const assert = require("node:assert/strict");
const { referenceEntries } = require("./generate-agent-artifacts.js");
const page = { title: "Test", url: "https://example.org/" };

test("head link tags and later authors cannot become an anchor's parent", () => {
  const html = '<link href="/styles.css"><a href="https://example.org/group">Research group</a>' +
    '<ul><li><strong>Someone Else.</strong> <a href="https://example.org/paper">Paper</a> (2025)</li></ul>';
  const entries = referenceEntries(html, page);
  assert.equal(entries[0].title, "Research group");
  assert.equal(entries[0].author, "");
  assert.equal(entries[0].year, "");
  assert.equal(entries[1].author, "Someone Else");
  assert.equal(entries[1].year, "2025");
});

test("closed list items cannot leak author or year into later anchors", () => {
  const html = '<li><strong>Old Author.</strong> Text (1999)</li>' +
    '<p><a href="https://example.org/new">New project</a></p>';
  const [entry] = referenceEntries(html, page);
  assert.equal(entry.author, "");
  assert.equal(entry.year, "");
  assert.equal(entry.title, "New project");
});

test("explicit reference links exclude navigation and keep full author initials", () => {
  const html = '<a href="https://example.org/nav">Navigation</a><ol><li>' +
    '<strong>Jacobs, A. Z., and Wallach, H.</strong> “<a class="reference-link" ' +
    'href="https://doi.org/10.1145/3442188.3445901">Measurement and Fairness</a>.” (2021)</li></ol>';
  const entries = referenceEntries(html, page);
  assert.equal(entries.length, 1);
  assert.equal(entries[0].author, "Jacobs, A. Z., and Wallach, H");
  assert.equal(entries[0].doi, "10.1145/3442188.3445901");
  assert.equal(entries[0].title, "Measurement and Fairness");
});
