#!/usr/bin/env python3
"""Static and negative admission tests for the public distribution catalog."""

from __future__ import annotations

import copy
import hashlib
import http.server
import json
import re
import sys
import threading
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import parse_qs, urlparse
from urllib.request import urlopen

from jsonschema import Draft202012Validator
from jsonschema.exceptions import ValidationError


ROOT = Path(__file__).resolve().parents[1]
CATALOG_ROOT = ROOT / "Rusty-Morphospace" / "catalog"
CATALOG_PATH = CATALOG_ROOT / "catalog.json"
SCHEMA_PATH = CATALOG_ROOT / "catalog.schema.json"
PAGE_PATH = CATALOG_ROOT / "index.html"
TARGET_FILES = [
    CATALOG_PATH,
    SCHEMA_PATH,
    PAGE_PATH,
    CATALOG_ROOT / "catalog.css",
    CATALOG_ROOT / "catalog.js",
    ROOT / "tools" / "requirements-distribution-catalog.txt",
]
OWNERS = {
    "questionable-file-manager",
    "rusty-fleet",
    "rusty-hostess",
    "rusty-kiosk",
    "rusty-quest-package-updater",
}
CHANNELS = {"stable", "alpha"}
REQUIRED_FEEDBACK = [
    "channel",
    "version",
    "source_revision",
    "artifact_sha256",
    "operating_system",
    "device_class",
]
PRIVACY_WARNING = (
    "Do not include credentials, personal data, device serials, network "
    "addresses, pairing material, or private logs."
)
TAG = re.compile(r"^v(\d+\.\d+\.\d+(?:-alpha\.[1-9]\d*)?)$")
SHA40 = re.compile(r"^[0-9a-f]{40}$")
SHA64 = re.compile(r"^[0-9a-f]{64}$")
SCHEMA = json.loads(SCHEMA_PATH.read_text(encoding="utf-8"))
Draft202012Validator.check_schema(SCHEMA)
SCHEMA_VALIDATOR = Draft202012Validator(SCHEMA)


class LinkParser(HTMLParser):
    def __init__(self) -> None:
        super().__init__()
        self.links: list[dict[str, str]] = []
        self.ids: list[str] = []

    def handle_starttag(
        self, tag: str, attrs: list[tuple[str, str | None]]
    ) -> None:
        values = {key: value or "" for key, value in attrs}
        if "id" in values:
            self.ids.append(values["id"])
        if tag == "a":
            self.links.append(values)


class QuietHandler(http.server.SimpleHTTPRequestHandler):
    def log_message(self, format: str, *args: object) -> None:
        pass


def fail(message: str) -> None:
    raise AssertionError(message)


def validate_catalog(catalog: dict) -> None:
    SCHEMA_VALIDATOR.validate(catalog)
    validate_catalog_semantics(catalog)


def validate_catalog_semantics(catalog: dict) -> None:
    if catalog.get("schema") != "rusty.morphospace.public_distribution_catalog.v1":
        fail("unknown catalog schema")
    if catalog.get("default_channel") != "stable":
        fail("stable must remain the default")
    if catalog.get("authority") != "owner-release-metadata-only":
        fail("catalog attempted to become release authority")
    fleet = catalog.get("fleet_pages_contract", {})
    if fleet != {
        "composition": "preserve-complete-site-replace-owner-channel-subtree",
        "stable_metadata_path": "/Rusty-Fleet/metadata/stable/release.json",
        "alpha_metadata_path": "/Rusty-Fleet/metadata/alpha/release.json",
    }:
        fail("Fleet Pages composition contract drifted")

    products = catalog.get("products")
    if not isinstance(products, list) or len(products) != 5:
        fail("catalog must contain exactly five product owners")
    owners = [product.get("owner") for product in products]
    if set(owners) != OWNERS or len(set(owners)) != len(owners):
        fail("unknown, missing, or duplicated owner")

    for product in products:
        if product.get("complete_product") is not True:
            fail(f"{product.get('owner')} is not declared complete-product")
        repository = product.get("repository", "")
        if not re.fullmatch(
            r"https://github\.com/MesmerPrism/[A-Za-z0-9._-]+", repository
        ):
            fail("owner repository is not a canonical public GitHub URL")
        feedback = product.get("feedback", {})
        if feedback.get("required_fields") != REQUIRED_FEEDBACK:
            fail("feedback provenance fields are incomplete or reordered")
        if feedback.get("privacy_warning") != PRIVACY_WARNING:
            fail("feedback privacy warning drifted")
        issue = urlparse(feedback.get("issue_url", ""))
        repository_url = urlparse(repository)
        if (
            issue.scheme != "https"
            or issue.netloc != "github.com"
            or issue.netloc != repository_url.netloc
            or issue.path != f"{repository_url.path}/issues/new"
        ):
            fail("feedback does not route to the owning GitHub repository")
        body = parse_qs(issue.query).get("body", [""])[0]
        for phrase in (
            "Channel:",
            "Version:",
            "Source revision:",
            "Artifact SHA-256:",
            "Operating system:",
            "Device class:",
            PRIVACY_WARNING,
        ):
            if phrase not in body:
                fail(f"feedback template is missing {phrase}")

        channels = product.get("channels")
        channel_names = [item.get("channel") for item in channels]
        expected_channels = (
            ["alpha"]
            if product["owner"] in {
                "rusty-hostess", "rusty-quest-package-updater"
            }
            else ["stable", "alpha"]
        )
        if not isinstance(channels, list) or channel_names != expected_channels:
            fail("owner channel set or stable-first ordering is invalid")
        by_channel = {item["channel"]: item for item in channels}
        for channel_name, channel in by_channel.items():
            if channel_name not in CHANNELS:
                fail("unknown channel")
            if channel.get("opt_in") is not (channel_name == "alpha"):
                fail("stable/alpha opt-in policy drifted")
            availability = channel.get("availability")
            release = channel.get("release")
            if availability == "unpublished":
                if release is not None:
                    fail("unpublished channel claimed release metadata")
            elif availability == "published":
                fail(
                    "published catalog records require authoritative owner readback"
                )
            else:
                fail("unknown availability")

        alpha_identity = by_channel["alpha"]["identity"]
        if product["owner"] == "rusty-hostess":
            notes = product.get("distribution_notes")
            if (
                product["repository"]
                != "https://github.com/MesmerPrism/rusty-hostess"
                or alpha_identity["installation_identity"]
                != "rusty-hostess-alpha"
                or alpha_identity["platform"] != "windows"
                or alpha_identity["relationship_to_stable"] != "alpha-only"
                or by_channel["alpha"]["transition"]
                != "remove-alpha-without-changing-other-products"
                or by_channel["alpha"]["availability"] != "unpublished"
                or by_channel["alpha"]["release"] is not None
                or notes != {
                    "included": [
                        "source-owned WPF companion",
                        "source-owned CLI and tools",
                        "Meta Cinematic Cast adapter source",
                    ],
                    "external": [
                        "Meta Quest Developer Hub",
                        "Casting.exe",
                    ],
                    "authority_exclusions": [
                        "presentation effectiveness",
                        "recording",
                        "input forwarding",
                        "extended-FOV restoration",
                        "device cleanup",
                    ],
                    "removal": (
                        "Uninstalling Rusty Hostess Alpha removes only its "
                        "separate Windows alpha identity and does not change "
                        "other products."
                    ),
                }
            ):
                fail("Hostess alpha owner scope or unpublished identity drifted")
        elif product["owner"] == "rusty-quest-package-updater":
            if (
                alpha_identity["installation_identity"]
                != "io.github.mesmerprism.rustyquest.packageupdater.alpha"
                or alpha_identity["relationship_to_stable"]
                != "alpha-only"
                or by_channel["alpha"]["transition"]
                != "remove-alpha"
            ):
                fail("Package Updater must remain alpha-only with its exact identity")
        elif product["owner"] == "rusty-kiosk":
            stable_identity = by_channel["stable"]["identity"]
            if (
                alpha_identity["relationship_to_stable"]
                != "same-package-in-place"
                or alpha_identity["installation_identity"]
                != stable_identity["installation_identity"]
                or by_channel["alpha"]["transition"]
                != "forward-only-to-later-stable"
            ):
                fail("Kiosk alpha must replace stable in place and exit forward")
        else:
            stable_identity = by_channel["stable"]["identity"]
            if (
                alpha_identity["relationship_to_stable"]
                != "separate-coinstallable"
                or by_channel["alpha"]["transition"]
                != "uninstall-alpha-without-changing-stable"
            ):
                fail("separate alpha identity policy drifted")
            known_stable = stable_identity["installation_identity"]
            known_alpha = alpha_identity["installation_identity"]
            if known_stable is not None and known_alpha is not None:
                if known_stable == known_alpha:
                    fail("stable and separate alpha identities were substituted")


def validate_release(product: dict, channel_name: str, channel: dict) -> None:
    release = channel.get("release")
    if not isinstance(release, dict):
        fail("published channel is missing release provenance")
    required = {
        "tag",
        "version",
        "source_revision",
        "artifact_name",
        "artifact_url",
        "artifact_sha256",
        "bytes",
        "installation_identity",
    }
    if set(release) != required:
        fail("published release provenance is missing or expanded")
    match = TAG.fullmatch(release["tag"])
    if not match or release["version"] != match.group(1):
        fail("release tag/version mismatch")
    is_alpha = "-alpha." in release["tag"]
    if is_alpha != (channel_name == "alpha"):
        fail("stable/alpha release substitution")
    if not SHA40.fullmatch(release["source_revision"]):
        fail("missing source revision")
    if not SHA64.fullmatch(release["artifact_sha256"]):
        fail("missing artifact hash")
    if not isinstance(release["bytes"], int) or release["bytes"] < 1:
        fail("missing artifact size")
    expected_url = (
        f"{product['repository']}/releases/download/{release['tag']}/"
        f"{release['artifact_name']}"
    )
    if release["artifact_url"] != expected_url:
        fail("artifact URL is mutable, cross-owner, or not exact-tag")
    if "/latest/" in release["artifact_url"]:
        fail("mutable latest URL")
    policy_identity = channel["identity"]["installation_identity"]
    if (
        policy_identity is not None
        and release["installation_identity"] != policy_identity
    ):
        fail("stable/alpha installation identity substitution")


def published_fixture(catalog: dict, owner: str, channel_name: str) -> dict:
    candidate = copy.deepcopy(catalog)
    product = next(item for item in candidate["products"] if item["owner"] == owner)
    channel = next(
        item for item in product["channels"] if item["channel"] == channel_name
    )
    version = "1.2.3-alpha.4" if channel_name == "alpha" else "1.2.3"
    identity = channel["identity"]["installation_identity"] or (
        "MesmerPrism.RustyFleet.Alpha"
        if channel_name == "alpha"
        else "MesmerPrism.RustyFleet"
    )
    channel["availability"] = "published"
    channel["release"] = {
        "tag": f"v{version}",
        "version": version,
        "source_revision": "a" * 40,
        "artifact_name": "owner-product.zip",
        "artifact_url": (
            f"{product['repository']}/releases/download/v{version}/"
            "owner-product.zip"
        ),
        "artifact_sha256": "b" * 64,
        "bytes": 123,
        "installation_identity": identity,
    }
    return candidate


def negative_tests(catalog: dict) -> None:
    published = published_fixture(
        catalog, "questionable-file-manager", "alpha"
    )
    if not list(SCHEMA_VALIDATOR.iter_errors(published)):
        fail("schema did not reject a locally fabricated publication")
    try:
        validate_catalog_semantics(published)
    except AssertionError as error:
        if "authoritative owner readback" not in str(error):
            raise
    else:
        fail("semantic gate accepted a locally fabricated publication")

    cases: list[tuple[str, dict]] = []
    cases.append((
        "locally fabricated QFM publication",
        published_fixture(catalog, "questionable-file-manager", "alpha"),
    ))
    cases.append((
        "locally fabricated Fleet publication",
        published_fixture(catalog, "rusty-fleet", "alpha"),
    ))

    mutable = published_fixture(catalog, "rusty-fleet", "alpha")
    mutable_release = mutable["products"][1]["channels"][1]["release"]
    mutable_release["artifact_url"] = (
        "https://github.com/MesmerPrism/rusty-fleet/releases/latest/"
        "download/owner-product.zip"
    )
    cases.append(("mutable URL", mutable))

    missing = published_fixture(catalog, "rusty-fleet", "alpha")
    del missing["products"][1]["channels"][1]["release"]["source_revision"]
    cases.append(("missing provenance", missing))

    substituted = published_fixture(
        catalog, "questionable-file-manager", "alpha"
    )
    substituted["products"][0]["channels"][1]["release"]["tag"] = "v1.2.3"
    substituted["products"][0]["channels"][1]["release"]["version"] = "1.2.3"
    cases.append(("stable release in alpha", substituted))

    identity = published_fixture(
        catalog, "questionable-file-manager", "alpha"
    )
    identity["products"][0]["channels"][1]["release"][
        "installation_identity"
    ] = "MesmerPrism.MetaQuestFileManager"
    cases.append(("stable identity in alpha", identity))

    owner = copy.deepcopy(catalog)
    owner["products"][0]["owner"] = "unknown-owner"
    cases.append(("unknown owner", owner))

    channel = copy.deepcopy(catalog)
    channel["products"][0]["channels"][1]["channel"] = "preview"
    cases.append(("unknown channel", channel))

    feedback = copy.deepcopy(catalog)
    feedback["products"][0]["feedback"]["issue_url"] = (
        "https://github.com/MesmerPrism/rusty-fleet/issues/new?"
        "title=misrouted&body=Channel%3A"
    )
    cases.append(("cross-owner feedback repository", feedback))

    hostess_stable = copy.deepcopy(catalog)
    hostess = next(
        product for product in hostess_stable["products"]
        if product["owner"] == "rusty-hostess"
    )
    hostess["channels"].insert(0, copy.deepcopy(
        catalog["products"][0]["channels"][0]
    ))
    cases.append(("invented Hostess stable channel", hostess_stable))

    hostess_identity = copy.deepcopy(catalog)
    hostess = next(
        product for product in hostess_identity["products"]
        if product["owner"] == "rusty-hostess"
    )
    hostess["channels"][0]["identity"]["installation_identity"] = "rusty-hostess"
    cases.append(("wrong Hostess alpha identity", hostess_identity))

    hostess_claim = copy.deepcopy(catalog)
    hostess = next(
        product for product in hostess_claim["products"]
        if product["owner"] == "rusty-hostess"
    )
    hostess["distribution_notes"]["authority_exclusions"].remove("recording")
    cases.append(("Hostess authority overclaim", hostess_claim))

    for name, candidate in cases:
        try:
            validate_catalog(candidate)
        except (AssertionError, ValidationError):
            continue
        fail(f"negative fixture was accepted: {name}")


def negative_schema_tests(catalog: dict) -> None:
    fixtures: list[tuple[str, dict]] = []

    missing = copy.deepcopy(catalog)
    del missing["default_channel"]
    fixtures.append(("missing required property", missing))

    expanded = copy.deepcopy(catalog)
    expanded["release_authority"] = True
    fixtures.append(("unknown top-level property", expanded))

    owner = copy.deepcopy(catalog)
    owner["products"][0]["owner"] = "unknown-owner"
    fixtures.append(("unknown schema owner", owner))

    channel = copy.deepcopy(catalog)
    channel["products"][0]["channels"][1]["channel"] = "preview"
    fixtures.append(("unknown schema channel", channel))

    inconsistent = copy.deepcopy(catalog)
    inconsistent_channel = inconsistent["products"][0]["channels"][1]
    inconsistent_channel["availability"] = "published"
    fixtures.append(("published channel without release", inconsistent))

    for name, fixture in fixtures:
        if not list(SCHEMA_VALIDATOR.iter_errors(fixture)):
            fail(f"Draft 2020-12 schema accepted negative fixture: {name}")


def validate_page(catalog: dict) -> None:
    page = PAGE_PATH.read_text(encoding="utf-8")
    parser = LinkParser()
    parser.feed(page)
    if len(parser.ids) != len(set(parser.ids)):
        fail("page contains duplicate IDs")
    if "latest/download" in page or "/releases/download/" in page:
        fail("unpublished page contains a download URL")
    if (
        'id="product-grid"' not in page
        or 'src="catalog.js"' not in page
        or "issues/new" in page
        or any(
            identity["identity"]["installation_identity"] in page
            for product in catalog["products"]
            for identity in product["channels"]
            if identity["identity"]["installation_identity"] is not None
        )
    ):
        fail("human product state is duplicated outside catalog-driven rendering")

    script = (CATALOG_ROOT / "catalog.js").read_text(encoding="utf-8")
    for forbidden in ("innerHTML", "outerHTML", "document.write", "eval("):
        if forbidden in script:
            fail(f"catalog renderer uses unsafe DOM operation: {forbidden}")
    for required in (
        'fetch("catalog.json"',
        "document.createElement",
        "textContent",
        "replaceChildren",
        "product.feedback.issue_url",
        "release.artifact_url",
        "release.installation_identity",
        "product.distribution_notes",
        "product.distribution_notes.authority_exclusions",
    ):
        if required not in script:
            fail(f"catalog renderer is disconnected from metadata field: {required}")


def validate_public_boundary() -> None:
    leakage = [
        re.compile(r"(?i)(?:password|secret|token|private[_ -]?key)\s*[:=]\s*\S+"),
        re.compile(r"(?i)\b(?:device[_ -]?serial|serial)\s*[:=]\s*[A-Za-z0-9]{6,}"),
        re.compile(r"\b[A-Za-z]:\\"),
        re.compile(r"-----BEGIN [A-Z ]*PRIVATE KEY-----"),
    ]
    for path in TARGET_FILES:
        text = path.read_text(encoding="utf-8")
        for pattern in leakage:
            if pattern.search(text):
                fail(f"public-boundary leakage pattern in {path.relative_to(ROOT)}")


def validate_local_http() -> None:
    handler = lambda *args, **kwargs: QuietHandler(
        *args, directory=str(ROOT), **kwargs
    )
    server = http.server.ThreadingHTTPServer(("127.0.0.1", 0), handler)
    thread = threading.Thread(target=server.serve_forever, daemon=True)
    thread.start()
    try:
        for relative in (
            "Rusty-Morphospace/catalog/",
            "Rusty-Morphospace/catalog/catalog.json",
            "Rusty-Morphospace/catalog/catalog.schema.json",
        ):
            with urlopen(
                f"http://127.0.0.1:{server.server_port}/{relative}",
                timeout=5,
            ) as response:
                if response.status != 200 or not response.read():
                    fail(f"local HTTP check failed for {relative}")
    finally:
        server.shutdown()
        server.server_close()
        thread.join(timeout=5)


def main() -> int:
    catalog = json.loads(CATALOG_PATH.read_text(encoding="utf-8"))
    if SCHEMA.get("$id") != (
        "https://mesmerprism.com/Rusty-Morphospace/catalog/"
        "catalog.schema.json"
    ):
        fail("schema ID is not canonical")
    validate_catalog(catalog)
    if any(
        channel["availability"] != "unpublished" or channel["release"] is not None
        for product in catalog["products"]
        for channel in product["channels"]
    ):
        fail("catalog publication must remain disabled without owner readback")
    negative_schema_tests(catalog)
    negative_tests(catalog)
    validate_page(catalog)
    validate_public_boundary()
    validate_local_http()
    digest = hashlib.sha256(CATALOG_PATH.read_bytes()).hexdigest()
    channel_count = sum(len(product["channels"]) for product in catalog["products"])
    print(
        "Distribution catalog contract passed: "
        f"5 owners, {channel_count} channel policies, catalog_sha256={digest}"
    )
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except AssertionError as error:
        print(f"Distribution catalog contract failed: {error}", file=sys.stderr)
        raise SystemExit(1)
