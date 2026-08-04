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
PUBLICATION_PATH = CATALOG_ROOT / "publication.json"
SCHEMA_PATH = CATALOG_ROOT / "catalog.schema.json"
PAGE_PATH = CATALOG_ROOT / "index.html"
TARGET_FILES = [
    CATALOG_PATH,
    SCHEMA_PATH,
    CATALOG_ROOT / "connection-hub-owner-release-admission.schema.json",
    PAGE_PATH,
    CATALOG_ROOT / "catalog.css",
    CATALOG_ROOT / "catalog.js",
    ROOT / "tools" / "requirements-distribution-catalog.txt",
] + ([PUBLICATION_PATH] if PUBLICATION_PATH.is_file() else [])
OWNERS = {
    "questionable-file-manager",
    "rusty-fleet",
    "rusty-hostess",
    "rusty-kiosk",
    "rusty-quest-package-updater",
}
CHANNELS = {"stable", "labs"}
REQUIRED_FEEDBACK = [
    "product_channel",
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
UPDATER_TAG = re.compile(
    r"^package-updater-v(0\.1\.0-alpha\.[1-9]\d*)$"
)
SHA40 = re.compile(r"^[0-9a-f]{40}$")
SHA64 = re.compile(r"^[0-9a-f]{64}$")
ARTIFACT_DIGEST = re.compile(r"^sha256:[0-9a-f]{64}$")
UTC_SECOND = re.compile(r"^20\d\d-[01]\d-[0-3]\dT[0-2]\d:[0-5]\d:[0-5]\dZ$")
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


def validate_catalog(catalog: dict, *, allow_published: bool = False) -> None:
    SCHEMA_VALIDATOR.validate(catalog)
    validate_catalog_semantics(catalog, allow_published=allow_published)


def validate_publication(catalog: dict) -> None:
    if not PUBLICATION_PATH.is_file() or PUBLICATION_PATH.is_symlink():
        fail("published catalog lacks a safe publication authorization")
    try:
        publication = json.loads(PUBLICATION_PATH.read_text(encoding="utf-8"))
    except (UnicodeDecodeError, json.JSONDecodeError) as error:
        raise AssertionError("publication authorization is malformed") from error
    top = {
        "schema",
        "result",
        "projection",
        "authorized_at",
        "publication_target",
        "publication_authorized",
        "pages_build_request_mode",
        "source_preflight",
    }
    source_keys = {
        "repository",
        "workflow_run_id",
        "workflow_url",
        "workflow_head_sha",
        "artifact_id",
        "artifact_name",
        "artifact_digest",
        "artifact_size_bytes",
        "readback_receipt_sha256",
        "source_catalog_sha256",
        "published_catalog_sha256",
        "record_count",
        "complete_labs_owner_set",
        "owner_binary_downloaded",
        "read_only_preflight_publication_authorized",
        "read_only_preflight_pages_deployment_invoked",
    }
    if not isinstance(publication, dict) or set(publication) != top:
        fail("publication authorization fields are not exact")
    source = publication["source_preflight"]
    if not isinstance(source, dict) or set(source) != source_keys:
        fail("publication preflight fields are not exact")
    run_id = source["workflow_run_id"]
    if (
        publication["schema"]
        != "rusty.morphospace.catalog_publication_authorization.v1"
        or publication["result"] != "authorized"
        or publication["projection"] != "complete-five-owner-labs-set"
        or not isinstance(publication["authorized_at"], str)
        or UTC_SECOND.fullmatch(publication["authorized_at"]) is None
        or publication["publication_target"]
        != "/Rusty-Morphospace/catalog/catalog.json"
        or publication["publication_authorized"] is not True
        or publication["pages_build_request_mode"]
        != "post-commit-github-api"
        or source["repository"] != "MesmerPrism/MesmerPrism.github.io"
        or isinstance(run_id, bool)
        or not isinstance(run_id, int)
        or run_id < 1
        or source["workflow_url"]
        != (
            "https://github.com/MesmerPrism/MesmerPrism.github.io/"
            f"actions/runs/{run_id}"
        )
        or not isinstance(source["workflow_head_sha"], str)
        or SHA40.fullmatch(source["workflow_head_sha"]) is None
        or isinstance(source["artifact_id"], bool)
        or not isinstance(source["artifact_id"], int)
        or source["artifact_id"] < 1
        or source["artifact_name"]
        != f"distribution-catalog-readonly-preflight-{run_id}"
        or not isinstance(source["artifact_digest"], str)
        or ARTIFACT_DIGEST.fullmatch(source["artifact_digest"]) is None
        or isinstance(source["artifact_size_bytes"], bool)
        or not isinstance(source["artifact_size_bytes"], int)
        or source["artifact_size_bytes"] < 1
        or not all(
            isinstance(source[key], str) and SHA64.fullmatch(source[key])
            for key in (
                "readback_receipt_sha256",
                "source_catalog_sha256",
                "published_catalog_sha256",
            )
        )
        or source["published_catalog_sha256"]
        != hashlib.sha256(CATALOG_PATH.read_bytes()).hexdigest()
        or source["record_count"] != 5
        or source["complete_labs_owner_set"] is not True
        or source["owner_binary_downloaded"] is not False
        or source["read_only_preflight_publication_authorized"] is not False
        or source["read_only_preflight_pages_deployment_invoked"] is not False
    ):
        fail("publication authorization is not exact")


def validate_catalog_semantics(
    catalog: dict, *, allow_published: bool = False
) -> None:
    if catalog.get("schema") != "rusty.morphospace.public_distribution_catalog.v2":
        fail("unknown catalog schema")
    if catalog.get("default_product_channel") != "stable":
        fail("stable must remain the default")
    if catalog.get("authority") != "owner-release-metadata-only":
        fail("catalog attempted to become release authority")
    fleet = catalog.get("fleet_pages_contract", {})
    if fleet != {
        "composition": "preserve-complete-site-replace-owner-channel-subtree",
        "stable_metadata_path": "/Rusty-Fleet/metadata/stable/release.json",
        "labs_metadata_path": "/Rusty-Fleet/metadata/labs/release.json",
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

        channels = product.get("product_channels")
        channel_names = [item.get("product_channel") for item in channels]
        expected_channels = (
            ["labs"]
            if product["owner"] in {
                "rusty-hostess", "rusty-quest-package-updater"
            }
            else ["stable", "labs"]
        )
        if not isinstance(channels, list) or channel_names != expected_channels:
            fail("owner channel set or stable-first ordering is invalid")
        by_channel = {item["product_channel"]: item for item in channels}
        for channel_name, channel in by_channel.items():
            if channel_name not in CHANNELS:
                fail("unknown channel")
            if channel.get("opt_in") is not (channel_name == "labs"):
                fail("stable/labs opt-in policy drifted")
            if channel.get("maturity") not in {"alpha", "beta", "rc", "released"}:
                fail("product channel and release maturity were conflated")
            if channel_name == "stable" and channel.get("maturity") != "released":
                fail("the stable default must project released maturity")
            if channel.get("distribution_track") not in {
                "github-release", "github-prerelease", "meta-store-app"
            }:
                fail("distribution track is absent or outside its bound")
            expected_track = (
                "github-release" if channel_name == "stable"
                else "github-prerelease"
            )
            if channel.get("distribution_track") != expected_track:
                fail("owner-release distribution track was conflated with product channel")
            if channel["identity"].get("identity_authority") != (
                "owner-release-metadata"
            ):
                fail("catalog claimed owner installation-identity authority")
            availability = channel.get("availability")
            release = channel.get("release")
            if availability == "unpublished":
                if release is not None:
                    fail("unpublished channel claimed release metadata")
            elif availability == "published":
                if not allow_published:
                    fail(
                        "published catalog records require authoritative owner readback"
                    )
                validate_release(product, channel_name, channel)
            else:
                fail("unknown availability")

        labs_identity = by_channel["labs"]["identity"]
        if product["owner"] == "rusty-hostess":
            notes = product.get("distribution_notes")
            if (
                product["repository"]
                != "https://github.com/MesmerPrism/rusty-hostess"
                or labs_identity["installation_identity"]
                != "rusty-hostess-labs"
                or labs_identity["platform"] != "windows"
                or labs_identity["relationship_to_stable"] != "labs-only"
                or by_channel["labs"]["transition"]
                != "remove-labs-without-changing-other-products"
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
                        "meta-software-redistribution",
                        "presentation effectiveness",
                        "recording",
                        "input forwarding",
                        "extended-FOV restoration",
                        "device cleanup",
                    ],
                    "removal": (
                        "Uninstalling Rusty Hostess Labs removes only its "
                        "separate Windows labs identity and does not change "
                        "other products."
                    ),
                }
            ):
                fail("Hostess labs owner scope or unpublished identity drifted")
        elif product["owner"] == "rusty-quest-package-updater":
            if (
                labs_identity["installation_identity"]
                != "io.github.mesmerprism.rustyquest.packageupdater.labs"
                or labs_identity["relationship_to_stable"]
                != "labs-only"
                or by_channel["labs"]["transition"]
                != "remove-labs"
            ):
                fail("Package Updater must remain labs-only with its exact identity")
        elif product["owner"] == "rusty-kiosk":
            if (
                labs_identity["relationship_to_stable"]
                != "separate-coinstallable"
                or labs_identity["installation_identity"]
                != "io.github.mesmerprism.rustykiosk.labs"
                or by_channel["labs"]["transition"]
                != "uninstall-labs-without-changing-stable"
            ):
                fail("Kiosk Labs must remain coinstallable and leave stable unchanged")
        else:
            stable_identity = by_channel["stable"]["identity"]
            if (
                labs_identity["relationship_to_stable"]
                != "separate-coinstallable"
                or by_channel["labs"]["transition"]
                != "uninstall-labs-without-changing-stable"
            ):
                fail("separate labs identity policy drifted")
            known_stable = stable_identity["installation_identity"]
            known_labs = labs_identity["installation_identity"]
            if known_stable is not None and known_labs is not None:
                if known_stable == known_labs:
                    fail("stable and separate labs identities were substituted")
            expected_labs_identity = {
                "questionable-file-manager": "MesmerPrism.QuestIonAbleFileManager.Labs",
                "rusty-fleet": "rusty-fleet-labs",
            }[product["owner"]]
            if known_labs != expected_labs_identity:
                fail("Labs installation identity drifted")


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
    match = (
        UPDATER_TAG.fullmatch(release["tag"])
        if product["owner"] == "rusty-quest-package-updater"
        else TAG.fullmatch(release["tag"])
    )
    if not match or release["version"] != match.group(1):
        fail("release tag/version mismatch")
    is_labs = "-alpha." in release["tag"]
    if is_labs != (channel_name == "labs"):
        fail("stable/labs release substitution")
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
        fail("stable/labs installation identity substitution")


def published_fixture(catalog: dict, owner: str, channel_name: str) -> dict:
    candidate = copy.deepcopy(catalog)
    product = next(item for item in candidate["products"] if item["owner"] == owner)
    channel = next(
        item for item in product["product_channels"] if item["product_channel"] == channel_name
    )
    version = "1.2.3-alpha.4" if channel_name == "labs" else "1.2.3"
    identity = channel["identity"]["installation_identity"] or (
        "MesmerPrism.RustyFleet.Labs"
        if channel_name == "labs"
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
        catalog, "questionable-file-manager", "labs"
    )
    if list(SCHEMA_VALIDATOR.iter_errors(published)):
        fail("schema rejected a structurally valid publication projection")
    try:
        validate_catalog_semantics(published)
    except AssertionError as error:
        if "authoritative owner readback" not in str(error):
            raise
    else:
        fail("semantic gate accepted a locally fabricated publication")
    validate_catalog(published, allow_published=True)

    cases: list[tuple[str, dict]] = []

    mutable = published_fixture(catalog, "rusty-fleet", "labs")
    mutable_release = mutable["products"][1]["product_channels"][1]["release"]
    mutable_release["artifact_url"] = (
        "https://github.com/MesmerPrism/rusty-fleet/releases/latest/"
        "download/owner-product.zip"
    )
    cases.append(("mutable URL", mutable))

    missing = published_fixture(catalog, "rusty-fleet", "labs")
    del missing["products"][1]["product_channels"][1]["release"]["source_revision"]
    cases.append(("missing provenance", missing))

    substituted = published_fixture(
        catalog, "questionable-file-manager", "labs"
    )
    substituted["products"][0]["product_channels"][1]["release"]["tag"] = "v1.2.3"
    substituted["products"][0]["product_channels"][1]["release"]["version"] = "1.2.3"
    cases.append(("stable release in labs", substituted))

    identity = published_fixture(
        catalog, "questionable-file-manager", "labs"
    )
    identity["products"][0]["product_channels"][1]["release"][
        "installation_identity"
    ] = "MesmerPrism.MetaQuestFileManager"
    cases.append(("stable identity in labs", identity))

    owner = copy.deepcopy(catalog)
    owner["products"][0]["owner"] = "unknown-owner"
    cases.append(("unknown owner", owner))

    channel = copy.deepcopy(catalog)
    channel["products"][0]["product_channels"][1]["product_channel"] = "preview"
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
    hostess["product_channels"].insert(0, copy.deepcopy(
        catalog["products"][0]["product_channels"][0]
    ))
    cases.append(("invented Hostess stable channel", hostess_stable))

    hostess_identity = copy.deepcopy(catalog)
    hostess = next(
        product for product in hostess_identity["products"]
        if product["owner"] == "rusty-hostess"
    )
    hostess["product_channels"][0]["identity"]["installation_identity"] = "rusty-hostess"
    cases.append(("wrong Hostess labs identity", hostess_identity))

    hostess_claim = copy.deepcopy(catalog)
    hostess = next(
        product for product in hostess_claim["products"]
        if product["owner"] == "rusty-hostess"
    )
    hostess["distribution_notes"]["authority_exclusions"].remove("recording")
    cases.append(("Hostess authority overclaim", hostess_claim))

    identity_authority = copy.deepcopy(catalog)
    identity_authority["products"][0]["product_channels"][0]["identity"][
        "identity_authority"
    ] = "catalog-policy"
    cases.append(("catalog identity-authority overclaim", identity_authority))

    for name, candidate in cases:
        try:
            validate_catalog(candidate, allow_published=True)
        except (AssertionError, ValidationError):
            continue
        fail(f"negative fixture was accepted: {name}")


def negative_schema_tests(catalog: dict) -> None:
    fixtures: list[tuple[str, dict]] = []

    missing = copy.deepcopy(catalog)
    del missing["default_product_channel"]
    fixtures.append(("missing required property", missing))

    expanded = copy.deepcopy(catalog)
    expanded["release_authority"] = True
    fixtures.append(("unknown top-level property", expanded))

    owner = copy.deepcopy(catalog)
    owner["products"][0]["owner"] = "unknown-owner"
    fixtures.append(("unknown schema owner", owner))

    channel = copy.deepcopy(catalog)
    channel["products"][0]["product_channels"][1]["product_channel"] = "preview"
    fixtures.append(("unknown schema channel", channel))

    inconsistent = copy.deepcopy(catalog)
    inconsistent_channel = inconsistent["products"][0]["product_channels"][1]
    inconsistent_channel["availability"] = "published"
    inconsistent_channel["release"] = None
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
            for identity in product["product_channels"]
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
        "channel.product_channel",
        "channel.maturity",
        "channel.distribution_track",
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
    published = any(
        channel["availability"] != "unpublished" or channel["release"] is not None
        for product in catalog["products"]
        for channel in product["product_channels"]
    )
    validate_catalog(catalog, allow_published=published)
    if published:
        validate_publication(catalog)
    elif PUBLICATION_PATH.exists():
        fail("inert catalog unexpectedly carries publication authorization")
    negative_schema_tests(catalog)
    negative_tests(catalog)
    validate_page(catalog)
    validate_public_boundary()
    validate_local_http()
    digest = hashlib.sha256(CATALOG_PATH.read_bytes()).hexdigest()
    channel_count = sum(len(product["product_channels"]) for product in catalog["products"])
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
