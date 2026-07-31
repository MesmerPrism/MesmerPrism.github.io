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
]
OWNERS = {
    "questionable-file-manager",
    "rusty-fleet",
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
    if not isinstance(products, list) or len(products) != 4:
        fail("catalog must contain exactly four product owners")
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
        if (
            issue.scheme != "https"
            or issue.netloc != "github.com"
            or not issue.path.endswith("/issues/new")
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
        if not isinstance(channels, list) or [
            item.get("channel") for item in channels
        ] != ["stable", "alpha"]:
            fail("stable must be first and alpha must be the only opt-in channel")
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
                validate_release(product, channel_name, channel)
            else:
                fail("unknown availability")

        stable_identity = by_channel["stable"]["identity"]
        alpha_identity = by_channel["alpha"]["identity"]
        if product["owner"] == "rusty-kiosk":
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
    validate_catalog(published_fixture(
        catalog, "questionable-file-manager", "alpha"
    ))
    validate_catalog(published_fixture(catalog, "rusty-fleet", "alpha"))

    cases: list[tuple[str, dict]] = []
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

    for name, candidate in cases:
        try:
            validate_catalog(candidate)
        except AssertionError:
            continue
        fail(f"negative fixture was accepted: {name}")


def validate_page(catalog: dict) -> None:
    page = PAGE_PATH.read_text(encoding="utf-8")
    parser = LinkParser()
    parser.feed(page)
    if len(parser.ids) != len(set(parser.ids)):
        fail("page contains duplicate IDs")
    if "latest/download" in page or "/releases/download/" in page:
        fail("unpublished page contains a download URL")
    for product in catalog["products"]:
        if product["name"] not in page:
            fail(f"page omits {product['name']}")
        expected = product["feedback"]["issue_url"].replace("&", "&amp;")
        if expected not in page:
            fail(f"page feedback route drifted for {product['owner']}")
    external = [
        link
        for link in parser.links
        if link.get("href", "").startswith("https://")
    ]
    if not external or any(
        link.get("target") != "_blank"
        or "noopener" not in link.get("rel", "").split()
        or "noreferrer" not in link.get("rel", "").split()
        for link in external
    ):
        fail("external feedback links lack safe browser attributes")
    required_kiosk = (
        "Not coinstallable and not directly reversible.",
        "Installing alpha replaces the installed stable Kiosk package in place.",
        "later, same-signer stable release with a higher version code",
    )
    if any(text not in page for text in required_kiosk):
        fail("Kiosk in-place transition warning is incomplete")


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
    schema = json.loads(SCHEMA_PATH.read_text(encoding="utf-8"))
    if schema.get("$id") != (
        "https://mesmerprism.com/Rusty-Morphospace/catalog/"
        "catalog.schema.json"
    ):
        fail("schema ID is not canonical")
    validate_catalog(catalog)
    negative_tests(catalog)
    validate_page(catalog)
    validate_public_boundary()
    validate_local_http()
    digest = hashlib.sha256(CATALOG_PATH.read_bytes()).hexdigest()
    print(
        "Distribution catalog contract passed: "
        f"4 owners, 8 channel policies, catalog_sha256={digest}"
    )
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except AssertionError as error:
        print(f"Distribution catalog contract failed: {error}", file=sys.stderr)
        raise SystemExit(1)
