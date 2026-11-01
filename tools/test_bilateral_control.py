"""Check the finite owner export and isolation of the public bilateral app."""
import argparse
import hashlib
import json
import os
import re
import subprocess
import tempfile
import unittest
from pathlib import Path

ASSETS = {
    'app.mjs', 'bilateral-owner.mjs', 'capture-mode.mjs', 'decoder-policy.mjs',
    'frame-status.mjs', 'gateway.mjs', 'hub.css', 'hub.mjs', 'index.html',
    'live-owner.mjs', 'manifest.webmanifest', 'public-cache.mjs', 'public-sw.mjs',
    'pwa.mjs', 'session-view.mjs', 'style.css', 'view.mjs', 'viewer.html',
    'icons/apple-touch-icon.png', 'icons/quest-multi-stream-192.png',
    'icons/quest-multi-stream-512.png',
}
SCOPE = '/bilateral-control/'
REPOSITORY = 'https://github.com/MesmerPrism/QuestMultiStream'


def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def git_blob(root, revision, path):
    return subprocess.check_output(['git', '-C', str(root), 'show', f'{revision}:{path}'])


def validate_export(app, source_root=None, require_committed=False):
    app = Path(app)
    actual = {p.relative_to(app).as_posix() for p in app.rglob('*') if p.is_file()}
    assert actual == ASSETS | {'export-manifest.json'}, f'Unexpected public inventory: {actual ^ (ASSETS | {"export-manifest.json"})}'
    exported = json.loads((app / 'export-manifest.json').read_text(encoding='utf-8'))
    assert exported['schema'] == 'questms.public-bilateral-export.v1'
    assert exported['sourceRepository'] == REPOSITORY
    assert re.fullmatch('[0-9a-f]{40}', exported['sourceRevision'])
    assert re.fullmatch('[0-9a-f]{64}', exported['exporterSha256'])
    assert exported['appScope'] == SCOPE
    inventory = exported['files']
    assert len(inventory) == len(ASSETS)
    assert {f['path'] for f in inventory} == ASSETS
    canonical_hashes = {}
    for entry in inventory:
        assert entry['sha256'] == digest(app / entry['path']), entry['path']
        assert entry['sourcePath'] == 'src/QuestMultiStream.Browser/wwwroot/' + entry['path']
        assert re.fullmatch('[0-9a-f]{64}', entry['sourceSha256'])
        if source_root:
            blob = git_blob(source_root, exported['sourceRevision'], entry['sourcePath'])
            assert entry['sourceSha256'] == hashlib.sha256(blob).hexdigest(), entry['sourcePath']
            if Path(entry['path']).suffix == '.png':
                assert (app / entry['path']).read_bytes() == blob, entry['path']
                canonical = blob
            else:
                canonical = blob.decode('utf-8', errors='replace').replace('\r\n', '\n').encode('utf-8')
            canonical_hashes[entry['path']] = hashlib.sha256(canonical).hexdigest()
    if source_root:
        revision = subprocess.check_output(['git', '-C', str(source_root), 'rev-parse', 'HEAD'], text=True).strip()
        assert exported['sourceRevision'] == revision, 'Export must select the committed owner HEAD'
        exporter = git_blob(source_root, revision, 'tools/Export-PublicBilateralPwa.ps1')
        assert exported['exporterSha256'] == hashlib.sha256(exporter).hexdigest()
        version_input = exported['exporterSha256'] + '\n' + '\n'.join(
            f"{entry['path']}:{canonical_hashes[entry['path']]}" for entry in inventory)
        assert exported['cacheVersion'] == hashlib.sha256(version_input.encode('utf-8')).hexdigest()
    for name in ASSETS | {'export-manifest.json'}:
        if Path(name).suffix in ('.mjs', '.css', '.html', '.webmanifest', '.json'):
            text = (app / name).read_bytes()
            text.decode('utf-8')
            assert b'\r\n' not in text, f'Public text must use LF bytes: {name}'
    if require_committed:
        # Exact dispatched bytes include the generated manifest, not just runtime assets.
        for name in ASSETS | {'export-manifest.json'}:
            blob = git_blob(app.parent, 'HEAD', f'bilateral-control/{name}')
            assert (app / name).read_bytes() == blob, f'Checkout differs from committed public bytes: {name}'
    manifest = json.loads((app / 'manifest.webmanifest').read_text(encoding='utf-8'))
    assert [manifest[k] for k in ('id', 'scope', 'start_url')] == [SCOPE] * 3
    assert manifest['display'] == 'standalone'
    for icon in manifest['icons']:
        assert icon['src'] in ASSETS and icon['src'].startswith('icons/')
    for name in ('index.html', 'viewer.html'):
        html = (app / name).read_text(encoding='utf-8')
        assert 'data-public-gateway="true"' in html
        assert '<meta name="referrer" content="no-referrer">' in html
        assert not re.search(r'(?:src|href)=["\']http://', html)
    index = (app / 'index.html').read_text(encoding='utf-8')
    assert 'type="password"' in index and 'id="trustedLanConsent"' in index
    assert 'plaintext' in index and '/projects/bilateral-streaming.html' in index
    assert REPOSITORY in index
    worker = (app / 'public-sw.mjs').read_text(encoding='utf-8')
    cache_paths = json.loads(re.search(r'const STATIC_PATHS=(\[.*?\]);', worker).group(1))
    expected = {SCOPE} | {SCOPE + p for p in ASSETS - {'public-sw.mjs'}}
    assert len(cache_paths) == len(expected) and set(cache_paths) == expected
    assert "const CACHE_PREFIX='questms-public-bilateral-v1-';" in worker
    assert "const CACHE_VERSION='unexported';" not in worker
    assert f"const CACHE_VERSION='{exported['cacheVersion']}';" in worker
    # Export never carries private endpoints, query credentials, keys or test fixtures.
    for name in ASSETS:
        if Path(name).suffix in ('.mjs', '.css', '.html', '.webmanifest'):
            text = (app / name).read_text(encoding='utf-8')
            assert not re.search(r'http://(?:10\.\d|192\.168\.\d|172\.(?:1[6-9]|2\d|3[01])\.)', text), name
            assert 'BEGIN PRIVATE KEY' not in text and 'S:\\Work\\' not in text, name
    return exported


def validate_site(site):
    project = (site / 'projects/bilateral-streaming.html').read_text(encoding='utf-8')
    assert '/bilateral-control/' in project
    assert REPOSITORY in project
    assert '/projects/bilateral-streaming.html' in (site / 'index.html').read_text(encoding='utf-8')
    assert '/projects/bilateral-streaming.html' in (site / 'sitemap.xml').read_text(encoding='utf-8')
    # Every checked-in installable sibling has a distinct install identity/scope.
    for path in site.rglob('*.webmanifest'):
        if path.parent.name == 'bilateral-control' or '.git' in path.parts:
            continue
        sibling = json.loads(path.read_text(encoding='utf-8'))
        assert sibling.get('scope') != SCOPE and sibling.get('id') != SCOPE, str(path)


class ExportBehavior(unittest.TestCase):
    source_root = None

    def fixture_source(self, directory):
        """Commit only the finite source blobs and the candidate exporter in a tiny repo."""
        if not self.source_root:
            self.skipTest('--source-root enables owner exporter behavior tests')
        seed = Path(directory) / 'seed'
        seed.mkdir()
        self.fixture_env = {**os.environ, 'GIT_CONFIG_GLOBAL': os.devnull,
                            'GIT_CONFIG_NOSYSTEM': '1',
                            'GIT_AUTHOR_DATE': '2026-11-01T12:00:00+00:00',
                            'GIT_COMMITTER_DATE': '2026-11-01T12:00:00+00:00'}
        template = Path(directory) / 'empty-template'
        template.mkdir()
        self.git(seed, 'init', '--quiet', '--initial-branch=fixture', f'--template={template}')
        self.git(seed, 'config', 'core.autocrlf', 'false')
        self.git(seed, 'config', 'user.name', 'Bilateral exporter fixture')
        self.git(seed, 'config', 'user.email', 'bilateral-fixture@example.invalid')
        for name in ASSETS:
            relative = 'src/QuestMultiStream.Browser/wwwroot/' + name
            target = seed / relative
            target.parent.mkdir(parents=True, exist_ok=True)
            target.write_bytes(git_blob(self.source_root, 'HEAD', relative))
        exporter = seed / 'tools/Export-PublicBilateralPwa.ps1'
        exporter.parent.mkdir()
        # Allows TDD before the owner commit; the fixture itself is fully committed.
        exporter.write_bytes((self.source_root / 'tools/Export-PublicBilateralPwa.ps1').read_bytes().replace(b'\r\n', b'\n'))
        self.git(seed, 'add', '--all')
        self.git(seed, '-c', 'commit.gpgsign=false', 'commit', '--quiet', '-m', 'Finite bilateral exporter fixture')
        return seed

    def git(self, root, *arguments):
        return subprocess.check_output(['git', '-C', str(root), *arguments], env=self.fixture_env, stderr=subprocess.PIPE)

    def export(self, source, destination, check=True):
        result = subprocess.run(['pwsh', '-NoProfile', '-File', str(source / 'tools/Export-PublicBilateralPwa.ps1'),
                                 '-DestinationPath', str(destination)],
                                capture_output=True, text=True, env=self.fixture_env)
        if check and result.returncode:
            self.fail(f'Fixture exporter failed: {result.stderr}')
        return result

    def test_checkout_line_endings_cannot_change_public_bytes_or_provenance(self):
        with tempfile.TemporaryDirectory() as directory:
            seed = self.fixture_source(directory)
            outputs = []
            revisions = []
            checkout_bytes = []
            for label, autocrlf in [('lf', 'false'), ('crlf', 'true')]:
                checkout = Path(directory) / label
                self.git(seed, '-c', f'core.autocrlf={autocrlf}', 'clone', '--quiet', '--no-hardlinks', str(seed), str(checkout))
                self.git(checkout, 'config', 'core.autocrlf', autocrlf)
                revisions.append(self.git(checkout, 'rev-parse', 'HEAD').strip())
                checkout_bytes.append((checkout / 'src/QuestMultiStream.Browser/wwwroot/capture-mode.mjs').read_bytes())
                destination = Path(directory) / (label + '-export') / 'bilateral-control'
                self.export(checkout, destination)
                outputs.append({p.relative_to(destination).as_posix(): p.read_bytes() for p in destination.rglob('*') if p.is_file()})
            self.assertEqual(revisions[0], revisions[1])
            self.assertNotIn(b'\r\n', checkout_bytes[0])
            self.assertIn(b'\r\n', checkout_bytes[1], 'Fixture must really exercise a CRLF checkout')
            self.assertEqual(outputs[0], outputs[1], 'One committed source must produce identical public bytes on LF and CRLF checkouts')
            for name, payload in outputs[0].items():
                if Path(name).suffix in ('.html', '.mjs', '.css', '.webmanifest', '.json'):
                    self.assertNotIn(b'\r\n', payload, name)
            for label in ('lf', 'crlf'):
                validate_export(Path(directory) / (label + '-export') / 'bilateral-control', Path(directory) / label)

    def test_uncommitted_source_is_refused_before_any_export_write(self):
        with tempfile.TemporaryDirectory() as directory:
            source = self.fixture_source(directory)
            destination = Path(directory) / 'bilateral-control'
            self.export(source, destination)
            before = {p.relative_to(destination).as_posix(): p.read_bytes() for p in destination.rglob('*') if p.is_file()}
            source_file = source / 'src/QuestMultiStream.Browser/wwwroot/capture-mode.mjs'
            original = source_file.read_bytes()
            source_file.write_bytes(original + b'\n// uncommitted source\n')
            rejected = self.export(source, destination, check=False)
            self.assertNotEqual(rejected.returncode, 0)
            self.assertEqual(before, {p.relative_to(destination).as_posix(): p.read_bytes() for p in destination.rglob('*') if p.is_file()})
            source_file.write_bytes(original)
            (source / 'untracked-private.json').write_text('{}')
            self.assertNotEqual(self.export(source, destination, check=False).returncode, 0)
            self.assertEqual(before, {p.relative_to(destination).as_posix(): p.read_bytes() for p in destination.rglob('*') if p.is_file()})

    def test_require_committed_rejects_rehashed_but_uncommitted_public_bytes(self):
        with tempfile.TemporaryDirectory() as directory:
            source = self.fixture_source(directory)
            site = Path(directory) / 'site'
            destination = site / 'bilateral-control'
            self.export(source, destination)
            self.git(site, 'init', '--quiet', '--initial-branch=fixture', f'--template={Path(directory) / "empty-template"}')
            self.git(site, 'config', 'core.autocrlf', 'false')
            self.git(site, 'config', 'user.name', 'Bilateral exporter fixture')
            self.git(site, 'config', 'user.email', 'bilateral-fixture@example.invalid')
            self.git(site, 'add', '--all')
            self.git(site, '-c', 'commit.gpgsign=false', 'commit', '--quiet', '-m', 'Canonical public export fixture')
            validate_export(destination, source, require_committed=True)
            payload = destination / 'capture-mode.mjs'
            payload.write_bytes(payload.read_bytes() + b'\n// Uncommitted public edit\n')
            manifest_path = destination / 'export-manifest.json'
            manifest = json.loads(manifest_path.read_text(encoding='utf-8'))
            next(entry for entry in manifest['files'] if entry['path'] == 'capture-mode.mjs')['sha256'] = digest(payload)
            manifest_path.write_bytes((json.dumps(manifest, indent=2) + '\n').encode('utf-8'))
            validate_export(destination, source)
            with self.assertRaisesRegex(AssertionError, 'Checkout differs from committed public bytes'):
                validate_export(destination, source, require_committed=True)

    def test_export_is_deterministic_and_rejects_unreviewed_inventory(self):
        with tempfile.TemporaryDirectory() as directory:
            source = self.fixture_source(directory)
            destination = Path(directory) / 'bilateral-control'
            self.export(source, destination)
            validate_export(destination, source)
            first = {p.relative_to(destination).as_posix(): digest(p) for p in destination.rglob('*') if p.is_file()}
            self.export(source, destination)
            self.assertEqual(first, {p.relative_to(destination).as_posix(): digest(p) for p in destination.rglob('*') if p.is_file()})
            (destination / 'private-config.json').write_text('{"secret":"not-public"}')
            rejected = self.export(source, destination, check=False)
            self.assertNotEqual(rejected.returncode, 0)
            self.assertEqual((destination / 'private-config.json').read_text(), '{"secret":"not-public"}')
            (destination / 'private-config.json').unlink()
            (destination / 'app.mjs').write_text('tampered')
            with self.assertRaises(AssertionError):
                validate_export(destination, source)


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--source-root', type=Path)
    parser.add_argument('--export-only', action='store_true')
    parser.add_argument('--require-committed', action='store_true', help='Require exact public checkout/HEAD Git blob byte equality')
    args = parser.parse_args()
    ExportBehavior.source_root = args.source_root
    result = unittest.TextTestRunner().run(unittest.defaultTestLoader.loadTestsFromTestCase(ExportBehavior))
    if not result.wasSuccessful():
        raise SystemExit(1)
    site = Path(__file__).resolve().parents[1]
    validate_export(site / 'bilateral-control', args.source_root, args.require_committed)
    if not args.export_only:
        validate_site(site)
    print('Bilateral public export, privacy, identity and isolation checks passed.')
