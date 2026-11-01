"""Check the finite owner export and isolation of the public bilateral app."""
import argparse
import hashlib
import json
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


def validate_export(app, source_root=None):
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
    for entry in inventory:
        assert entry['sha256'] == digest(app / entry['path']), entry['path']
        assert entry['sourcePath'] == 'src/QuestMultiStream.Browser/wwwroot/' + entry['path']
        assert re.fullmatch('[0-9a-f]{64}', entry['sourceSha256'])
        if source_root:
            assert entry['sourceSha256'] == digest(Path(source_root) / entry['sourcePath'])
    if source_root:
        assert exported['exporterSha256'] == digest(Path(source_root) / 'tools/Export-PublicBilateralPwa.ps1')
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

    def test_export_is_deterministic_and_rejects_unreviewed_inventory(self):
        if not self.source_root:
            self.skipTest('--source-root enables the owner exporter behavior test')
        script = self.source_root / 'tools/Export-PublicBilateralPwa.ps1'
        with tempfile.TemporaryDirectory() as directory:
            destination = Path(directory) / 'bilateral-control'
            command = ['pwsh', '-NoProfile', '-File', str(script), '-DestinationPath', str(destination)]
            subprocess.run(command, check=True, capture_output=True, text=True)
            validate_export(destination, self.source_root)
            first = {p.relative_to(destination).as_posix(): digest(p) for p in destination.rglob('*') if p.is_file()}
            subprocess.run(command, check=True, capture_output=True, text=True)
            self.assertEqual(first, {p.relative_to(destination).as_posix(): digest(p) for p in destination.rglob('*') if p.is_file()})
            (destination / 'private-config.json').write_text('{"secret":"not-public"}')
            rejected = subprocess.run(command, capture_output=True, text=True)
            self.assertNotEqual(rejected.returncode, 0)
            self.assertEqual((destination / 'private-config.json').read_text(), '{"secret":"not-public"}')
            (destination / 'private-config.json').unlink()
            (destination / 'app.mjs').write_text('tampered')
            with self.assertRaises(AssertionError):
                validate_export(destination, self.source_root)


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--source-root', type=Path)
    parser.add_argument('--export-only', action='store_true')
    args = parser.parse_args()
    ExportBehavior.source_root = args.source_root
    result = unittest.TextTestRunner().run(unittest.defaultTestLoader.loadTestsFromTestCase(ExportBehavior))
    if not result.wasSuccessful():
        raise SystemExit(1)
    site = Path(__file__).resolve().parents[1]
    validate_export(site / 'bilateral-control', args.source_root)
    if not args.export_only:
        validate_site(site)
    print('Bilateral public export, privacy, identity and isolation checks passed.')
