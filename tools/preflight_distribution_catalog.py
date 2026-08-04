#!/usr/bin/env python3
"""Read-only live owner-release admission for an ephemeral catalog projection."""

from __future__ import annotations

import argparse
import base64
import copy
import hashlib
import json
import os
import re
import sys
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path
from typing import Any

from connection_hub_catalog_contract import adapt_connection_hub
from test_distribution_catalog import validate_catalog


ROOT = Path(__file__).resolve().parents[1]
CATALOG_PATH = ROOT / "Rusty-Morphospace" / "catalog" / "catalog.json"
SHA40 = re.compile(r"^[0-9a-f]{40}$")
SHA64 = re.compile(r"^[0-9a-f]{64}$")
UPPER_SHA40 = re.compile(r"^[0-9A-F]{40}$")
OWNER_TAG = re.compile(r"^v(\d+\.\d+\.\d+)-alpha\.([1-9]\d*)$")
UPDATER_TAG = re.compile(r"^package-updater-v(0\.1\.0-alpha\.([1-9]\d*))$")
LATEST_TAG = re.compile(r"^[A-Za-z0-9][A-Za-z0-9._/-]{0,179}$")
ASSET_NAME = re.compile(r"^[A-Za-z0-9._-]{1,180}$")
MAX_JSON_BYTES = 2 * 1024 * 1024
MAX_METADATA_BYTES = 128 * 1024

OWNERS = {
    "questionable-file-manager": {
        "repository": "MesmerPrism/QuestIonAble-File-Manager",
        "metadata_name": re.compile(
            r"^questionable-file-manager-labs-owner-release\.json$"
        ),
        "adapter": "qfm",
    },
    "rusty-fleet": {
        "repository": "MesmerPrism/rusty-fleet",
        "metadata_name": re.compile(r"^release-descriptor\.receipt\.json$"),
        "adapter": "fleet",
    },
    "rusty-hostess": {
        "repository": "MesmerPrism/rusty-hostess",
        "metadata_name": re.compile(
            r"^RustyHostess-Labs-\d+\.\d+\.\d+-win-x64"
            r"\.release-metadata\.json$"
        ),
        "adapter": "hostess",
    },
    "rusty-kiosk": {
        "repository": "MesmerPrism/Rusty-Kiosk",
        "metadata_name": re.compile(r"^rusty-kiosk-labs-owner-release\.json$"),
        "adapter": "kiosk",
    },
    "rusty-quest-package-updater": {
        "repository": "MesmerPrism/rusty-quest",
        "metadata_name": re.compile(
            r"^rusty-quest-package-updater\.release\.json$"
        ),
        "adapter": "quest-updater",
    },
}

# This contract is intentionally not part of OWNERS. It cannot appear in a
# request, complete-owner set, generated catalog, publication receipt, or UI
# until a separately reviewed validation-authority change activates it.
DORMANT_OWNER_CONTRACTS = {
    "rusty-connection-hub": {
        "repository": "MesmerPrism/rusty-quest",
        "metadata_name": re.compile(r"^connection-hub-release-manifest\.json$"),
        "adapter": "connection-hub",
        "activation": "requires-external-validation-authority",
    },
}


class PreflightError(ValueError):
    """Fail-closed catalog preflight rejection."""


def fail(message: str) -> None:
    raise PreflightError(message)


def exact_object(value: Any, fields: set[str], label: str) -> dict[str, Any]:
    if not isinstance(value, dict) or set(value) != fields:
        fail(f"{label} fields are not exact")
    return value


def exact_string(value: Any, pattern: re.Pattern[str], label: str) -> str:
    if not isinstance(value, str) or pattern.fullmatch(value) is None:
        fail(f"{label} is not canonical")
    return value


def positive_int(value: Any, label: str) -> int:
    if isinstance(value, bool) or not isinstance(value, int) or value < 1:
        fail(f"{label} is not a positive integer")
    return value


def sha256_bytes(value: bytes) -> str:
    return hashlib.sha256(value).hexdigest()


def canonical_json_bytes(value: Any) -> bytes:
    return (
        json.dumps(value, ensure_ascii=True, indent=2, sort_keys=False) + "\n"
    ).encode("utf-8")


def inert_catalog(value: dict[str, Any]) -> dict[str, Any]:
    """Return the policy-only baseline without carrying release projections."""
    result = copy.deepcopy(value)
    products = result.get("products")
    if not isinstance(products, list):
        fail("catalog products are absent")
    for product in products:
        if not isinstance(product, dict):
            fail("catalog contains a non-object product")
        channels = product.get("product_channels")
        if not isinstance(channels, list):
            fail("catalog product channels are absent")
        for channel in channels:
            if not isinstance(channel, dict):
                fail("catalog contains a non-object channel")
            channel["availability"] = "unpublished"
            channel["release"] = None
    validate_catalog(result)
    return result


def strict_json_bytes(value: bytes, label: str, maximum: int) -> Any:
    if not value or len(value) > maximum:
        fail(f"{label} size is outside its bound")
    try:
        text = value.decode("utf-8")
    except UnicodeDecodeError as error:
        raise PreflightError(f"{label} is not strict UTF-8") from error

    def no_duplicates(pairs: list[tuple[str, Any]]) -> dict[str, Any]:
        result: dict[str, Any] = {}
        for key, item in pairs:
            if key in result:
                fail(f"{label} contains duplicate key {key}")
            result[key] = item
        return result

    try:
        return json.loads(
            text,
            object_pairs_hook=no_duplicates,
            parse_constant=lambda _: fail(f"{label} contains nonfinite number"),
        )
    except (json.JSONDecodeError, UnicodeError) as error:
        raise PreflightError(f"{label} is not strict JSON") from error


def tag_version(owner: str, tag: str) -> str:
    match = (
        UPDATER_TAG.fullmatch(tag)
        if owner == "rusty-quest-package-updater"
        else OWNER_TAG.fullmatch(tag)
    )
    if match is None:
        fail(f"{owner} tag is outside its labs product")
    return match.group(1) if owner == "rusty-quest-package-updater" else (
        f"{match.group(1)}-alpha.{match.group(2)}"
    )


def validate_request(
    value: Any, *, require_complete_labs_set: bool = False
) -> list[dict[str, str]]:
    request = exact_object(
        value,
        {"schema", "records"},
        "publication request",
    )
    if request["schema"] != "rusty.morphospace.catalog_preflight_request.v1":
        fail("publication request schema is unknown")
    records = request["records"]
    if not isinstance(records, list) or not 1 <= len(records) <= len(OWNERS):
        fail("publication request record count is outside its bound")
    result: list[dict[str, str]] = []
    seen: set[tuple[str, str]] = set()
    for index, raw in enumerate(records):
        record = exact_object(
            raw,
            {
                "owner",
                "product_channel",
                "maturity",
                "distribution_track",
                "tag",
                "expected_source_revision",
                "expected_owner_metadata_asset",
                "expected_owner_metadata_sha256",
            },
            f"publication request record {index}",
        )
        owner = record["owner"]
        if owner not in OWNERS:
            fail("publication request contains an unknown owner")
        if record["product_channel"] != "labs":
            fail("initial catalog preflight admits labs only")
        if record["maturity"] not in {"alpha", "beta", "rc", "released"}:
            fail("publication request maturity is outside its bound")
        if record["distribution_track"] != "github-prerelease":
            fail("initial Labs catalog preflight requires github-prerelease")
        if record["maturity"] != "alpha":
            fail("the first Labs candidate set must declare alpha maturity")
        tag_version(owner, record["tag"])
        exact_string(
            record["expected_source_revision"],
            SHA40,
            "expected source revision",
        )
        exact_string(
            record["expected_owner_metadata_sha256"],
            SHA64,
            "expected owner metadata SHA-256",
        )
        metadata_name = exact_string(
            record["expected_owner_metadata_asset"],
            ASSET_NAME,
            "expected owner metadata asset",
        )
        if OWNERS[owner]["metadata_name"].fullmatch(metadata_name) is None:
            fail("owner metadata asset name is outside the owner registry")
        key = (owner, record["product_channel"])
        if key in seen:
            fail("publication request duplicates an owner channel")
        seen.add(key)
        result.append(record)
    if require_complete_labs_set and seen != {
        (owner, "labs") for owner in OWNERS
    }:
        fail("catalog preflight request is not the complete labs owner set")
    return result


def owner_asset(
    *,
    name: str,
    sha256: str,
    size: int,
    installation_identity: str,
    source_revision: str,
    source_tree: str,
) -> dict[str, Any]:
    exact_string(name, ASSET_NAME, "primary artifact name")
    exact_string(sha256, SHA64, "primary artifact SHA-256")
    positive_int(size, "primary artifact byte count")
    if not installation_identity or not isinstance(installation_identity, str):
        fail("installation identity is absent")
    exact_string(source_revision, SHA40, "metadata source revision")
    exact_string(source_tree, SHA40, "metadata source tree")
    return {
        "name": name,
        "sha256": sha256,
        "bytes": size,
        "installation_identity": installation_identity,
        "source_revision": source_revision,
        "source_tree": source_tree,
    }


def adapt_qfm(metadata: Any, tag: str) -> dict[str, Any]:
    root = exact_object(
        metadata,
        {
            "schema",
            "product_channel",
            "maturity",
            "distribution_track",
            "release",
            "source",
            "installation",
            "primary_windows_setup",
            "validation_evidence",
        },
        "QFM metadata",
    )
    release = exact_object(
        root["release"],
        {"tag", "version", "windows_package_version"},
        "QFM release",
    )
    source = exact_object(root["source"], {"revision", "tree"}, "QFM source")
    installation = exact_object(
        root["installation"], {"package_identity"}, "QFM installation"
    )
    primary = exact_object(
        root["primary_windows_setup"],
        {"name", "sha256", "bytes"},
        "QFM primary setup",
    )
    evidence = exact_object(
        root["validation_evidence"], {"name", "schema"}, "QFM evidence"
    )
    version = tag_version("questionable-file-manager", tag)
    match = OWNER_TAG.fullmatch(tag)
    assert match is not None
    expected_windows_version = f"{match.group(1)}.{match.group(2)}"
    if (
        root["schema"] != "questionable-file-manager.owner-release.v2"
        or root["product_channel"] != "labs"
        or root["maturity"] != "alpha"
        or root["distribution_track"] != "github-prerelease"
        or release != {
            "tag": tag,
            "version": version,
            "windows_package_version": expected_windows_version,
        }
        or installation["package_identity"]
        != "MesmerPrism.QuestIonAbleFileManager.Labs"
        or primary["name"] != "QuestIonAbleFileManager-Labs-Setup.exe"
        or evidence
        != {
            "name": "release-validation.json",
            "schema": "questionable-file-manager.release-validation.v2",
        }
    ):
        fail("QFM owner metadata is not the exact labs contract")
    return owner_asset(
        name=primary["name"],
        sha256=primary["sha256"],
        size=primary["bytes"],
        installation_identity=installation["package_identity"],
        source_revision=source["revision"],
        source_tree=source["tree"],
    )


def adapt_fleet(metadata: Any, tag: str) -> dict[str, Any]:
    fields = {
        "schema",
        "result",
        "descriptor_id",
        "version",
        "product_channel",
        "maturity",
        "channel",
        "distribution_track",
        "release_tag",
        "installation_identity",
        "primary_artifact",
        "issued_at_ms",
        "expires_at_ms",
        "validity_duration_ms",
        "setup_sha256",
        "setup_size_bytes",
        "setup_signer_certificate_sha256",
        "setup_signer_subject",
        "setup_signer_thumbprint",
        "setup_signer_self_issued",
        "authenticode_trust_mode",
        "public_trust_claim",
        "timestamp_required",
        "setup_build_receipt_sha256",
        "source_revision",
        "source_tree",
        "canonical_pe_payload_sha256",
        "canonical_pe_payload_size_bytes",
        "descriptor_signer_spki_sha256",
        "descriptor_signer_spki_asset",
        "payload_sha256",
        "descriptor_sha256",
        "canonical_payload",
        "signature",
        "pages_path",
        "asset_url",
    }
    root = exact_object(metadata, fields, "Fleet descriptor receipt")
    primary = exact_object(
        root["primary_artifact"],
        {"role", "name", "sha256", "bytes", "url"},
        "Fleet primary artifact",
    )
    match = OWNER_TAG.fullmatch(tag)
    assert match is not None
    exact_string(
        root["setup_signer_certificate_sha256"],
        SHA64,
        "Fleet setup signer certificate SHA-256",
    )
    exact_string(
        root["setup_signer_thumbprint"],
        UPPER_SHA40,
        "Fleet setup signer thumbprint",
    )
    exact_string(
        root["setup_build_receipt_sha256"],
        SHA64,
        "Fleet setup build receipt SHA-256",
    )
    exact_string(
        root["descriptor_signer_spki_sha256"],
        SHA64,
        "Fleet descriptor signer SPKI SHA-256",
    )
    if (
        root["schema"]
        != "rusty.fleet.windows_release_descriptor_receipt.v5"
        or root["result"] != "pass"
        or root["version"] != match.group(1)
        or root["product_channel"] != "labs"
        or root["maturity"] != "alpha"
        or root["channel"] != "labs"
        or root["distribution_track"] != "github-prerelease"
        or root["release_tag"] != tag
        or root["installation_identity"] != "rusty-fleet-labs"
        or root["setup_signer_subject"] != "CN=MesmerPrism"
        or root["setup_signer_self_issued"] is not True
        or root["authenticode_trust_mode"]
        != "exact-pinned-self-issued-untrusted-root-only"
        or root["public_trust_claim"] is not False
        or root["timestamp_required"] is not True
        or root["pages_path"] != "Rusty-Fleet/metadata/labs/release.json"
        or primary["role"] != "complete-product"
        or primary["name"] != "RustyFleet-Labs-Setup.exe"
        or primary["url"] != root["asset_url"]
        or primary["sha256"] != root["setup_sha256"]
        or primary["bytes"] != root["setup_size_bytes"]
    ):
        fail("Fleet owner metadata is not the exact labs contract")
    return owner_asset(
        name=primary["name"],
        sha256=primary["sha256"],
        size=primary["bytes"],
        installation_identity=root["installation_identity"],
        source_revision=root["source_revision"],
        source_tree=root["source_tree"],
    )


def adapt_hostess(metadata: Any, tag: str) -> dict[str, Any]:
    root = exact_object(
        metadata,
        {
            "schema",
            "repository",
            "product",
            "product_channel",
            "maturity",
            "distribution_track",
            "prerelease",
            "version",
            "tag",
            "source",
            "installation_identity",
            "primary_artifact",
        },
        "Hostess metadata",
    )
    source = exact_object(
        root["source"], {"revision", "tree"}, "Hostess source"
    )
    primary = exact_object(
        root["primary_artifact"],
        {"role", "name", "sha256", "bytes"},
        "Hostess primary artifact",
    )
    match = OWNER_TAG.fullmatch(tag)
    assert match is not None
    if (
        root["schema"]
        != "rusty.hostess.windows_labs_release_metadata.v2"
        or root["repository"] != "MesmerPrism/rusty-hostess"
        or root["product"] != "rusty-hostess-labs"
        or root["product_channel"] != "labs"
        or root["maturity"] != "alpha"
        or root["distribution_track"] != "github-prerelease"
        or root["prerelease"] is not True
        or root["version"] != match.group(1)
        or root["tag"] != tag
        or root["installation_identity"] != "rusty-hostess-labs"
        or primary["role"] != "complete-product"
        or primary["name"]
        != f"RustyHostess-Labs-{match.group(1)}-win-x64.zip"
    ):
        fail("Hostess owner metadata is not the exact labs contract")
    return owner_asset(
        name=primary["name"],
        sha256=primary["sha256"],
        size=primary["bytes"],
        installation_identity=root["installation_identity"],
        source_revision=source["revision"],
        source_tree=source["tree"],
    )


def kiosk_version_code(version: str) -> int:
    match = re.fullmatch(
        r"(0|[1-9]\d{0,3})\.(0|[1-9]\d?)\.(0|[1-9]\d?)"
        r"-alpha\.([1-9]|[1-8]\d|9[0-8])",
        version,
    )
    if match is None or int(match.group(1)) > 2099:
        fail("Kiosk version is outside its owner version-code contract")
    return (
        int(match.group(1)) * 1_000_000
        + int(match.group(2)) * 10_000
        + int(match.group(3)) * 100
        + int(match.group(4))
    )


def adapt_kiosk(metadata: Any, tag: str) -> dict[str, Any]:
    root = exact_object(
        metadata,
        {
            "schema",
            "repository",
            "product",
            "product_channel",
            "maturity",
            "distribution_track",
            "prerelease",
            "tag",
            "version",
            "source_revision",
            "source_tree",
            "installation_identity",
            "coinstallable_lineage",
            "bundle_manifest",
            "primary_artifact",
        },
        "Kiosk metadata",
    )
    lineage = exact_object(
        root["coinstallable_lineage"],
        {
            "identity_mode",
            "package_name",
            "signer_sha256",
            "version_name",
            "version_code",
            "exit_policy",
        },
        "Kiosk coinstallable lineage",
    )
    manifest = exact_object(
        root["bundle_manifest"],
        {"schema", "name", "sha256", "bytes"},
        "Kiosk bundle manifest commitment",
    )
    primary = exact_object(
        root["primary_artifact"],
        {"role", "name", "sha256", "bytes"},
        "Kiosk primary artifact",
    )
    version = tag_version("rusty-kiosk", tag)
    version_code = kiosk_version_code(version)
    if (
        root["schema"] != "rusty.kiosk.labs_release_owner_metadata.v2"
        or root["repository"] != "MesmerPrism/Rusty-Kiosk"
        or root["product"] != "rusty-kiosk-labs"
        or root["product_channel"] != "labs"
        or root["maturity"] != "alpha"
        or root["distribution_track"] != "github-prerelease"
        or root["prerelease"] is not True
        or root["tag"] != tag
        or root["version"] != version
        or root["installation_identity"]
        != "io.github.mesmerprism.rustykiosk.labs"
        or lineage["identity_mode"] != "separate-coinstallable"
        or lineage["package_name"] != root["installation_identity"]
        or SHA64.fullmatch(lineage["signer_sha256"]) is None
        or lineage["version_name"] != version
        or lineage["version_code"] != version_code
        or lineage["exit_policy"]
        != "uninstall-labs-without-changing-stable"
        or manifest["schema"]
        != "meta.quest.file_manager.rusty_kiosk_bundle.v2"
        or manifest["name"] != "bundle-manifest.json"
        or SHA64.fullmatch(manifest["sha256"]) is None
        or positive_int(manifest["bytes"], "Kiosk manifest byte count")
        != manifest["bytes"]
        or primary["role"] != "complete-product"
        or primary["name"] != "rusty-kiosk.apk"
    ):
        fail("Kiosk owner metadata is not the exact coinstallable Labs contract")
    adapted = owner_asset(
        name=primary["name"],
        sha256=primary["sha256"],
        size=primary["bytes"],
        installation_identity=root["installation_identity"],
        source_revision=root["source_revision"],
        source_tree=root["source_tree"],
    )
    adapted["coinstallable_lineage"] = lineage
    adapted["bundle_manifest"] = manifest
    return adapted


def adapt_quest_updater(metadata: Any, tag: str) -> dict[str, Any]:
    root = exact_object(
        metadata,
        {
            "schema",
            "product",
            "release_tag",
            "release_version",
            "source_revision",
            "source_tree",
            "product_channel",
            "maturity",
            "distribution_track",
            "installation_identity",
            "apk_version_name",
            "apk_version_code",
            "updater_signer_sha256",
            "primary_apk",
        },
        "Quest updater metadata",
    )
    primary = exact_object(
        root["primary_apk"],
        {"name", "sha256", "bytes"},
        "Quest updater primary APK",
    )
    match = UPDATER_TAG.fullmatch(tag)
    assert match is not None
    sequence = int(match.group(2))
    if (
        root["schema"] != "rusty.quest.package_updater_product_release.v2"
        or root["product"] != "rusty-quest-package-updater-labs"
        or root["release_tag"] != tag
        or root["release_version"] != match.group(1)
        or root["product_channel"] != "labs"
        or root["maturity"] != "alpha"
        or root["distribution_track"] != "github-prerelease"
        or root["installation_identity"]
        != "io.github.mesmerprism.rustyquest.packageupdater.labs"
        or root["apk_version_name"] != match.group(1)
        or root["apk_version_code"] != sequence
        or not isinstance(root["updater_signer_sha256"], str)
        or not root["updater_signer_sha256"].startswith("sha256:")
        or SHA64.fullmatch(root["updater_signer_sha256"][7:]) is None
        or primary["name"] != "rusty-quest-package-updater.apk"
        or not isinstance(primary["sha256"], str)
        or not primary["sha256"].startswith("sha256:")
    ):
        fail("Quest updater owner metadata is not the exact labs contract")
    return owner_asset(
        name=primary["name"],
        sha256=primary["sha256"][7:],
        size=primary["bytes"],
        installation_identity=root["installation_identity"],
        source_revision=root["source_revision"],
        source_tree=root["source_tree"],
    )


ADAPTERS = {
    "qfm": adapt_qfm,
    "fleet": adapt_fleet,
    "hostess": adapt_hostess,
    "kiosk": adapt_kiosk,
    "quest-updater": adapt_quest_updater,
    "connection-hub": adapt_connection_hub,
}


class GitHubClient:
    def __init__(self, token: str) -> None:
        if not token:
            fail("live preflight requires GH_TOKEN")
        self.token = token

    def request(
        self,
        url: str,
        *,
        accept: str = "application/vnd.github+json",
        maximum: int = MAX_JSON_BYTES,
        allow_404: bool = False,
    ) -> tuple[bytes | None, str | None]:
        request = urllib.request.Request(
            url,
            headers={
                "Authorization": f"Bearer {self.token}",
                "Accept": accept,
                "X-GitHub-Api-Version": "2022-11-28",
                "User-Agent": "rusty-morphospace-catalog-preflight",
            },
        )
        try:
            with urllib.request.urlopen(request, timeout=30) as response:
                content_length = response.headers.get("Content-Length")
                if content_length and int(content_length) > maximum:
                    fail("GitHub response exceeds its size bound")
                value = response.read(maximum + 1)
                if len(value) > maximum:
                    fail("GitHub response exceeds its size bound")
                return value, response.geturl()
        except urllib.error.HTTPError as error:
            if allow_404 and error.code == 404:
                return None, None
            raise PreflightError(
                f"GitHub readback failed with HTTP {error.code}"
            ) from error

    def json(self, url: str, *, allow_404: bool = False) -> Any | None:
        value, _ = self.request(url, allow_404=allow_404)
        return (
            None
            if value is None
            else strict_json_bytes(value, "GitHub response", MAX_JSON_BYTES)
        )

    def snapshot(self, owner: str, tag: str) -> dict[str, Any]:
        repository = OWNERS[owner]["repository"]
        api = f"https://api.github.com/repos/{repository}"
        encoded_tag = urllib.parse.quote(tag, safe="")
        release = self.json(f"{api}/releases/tags/{encoded_tag}")
        ref = self.json(f"{api}/git/ref/tags/{encoded_tag}")
        if not isinstance(ref, dict) or not isinstance(ref.get("object"), dict):
            fail("Git tag ref response is malformed")
        current = ref["object"]
        tag_chain: list[dict[str, str]] = []
        seen: set[str] = set()
        for _ in range(6):
            if not isinstance(current, dict):
                fail("Git tag object is malformed")
            item_type = current.get("type")
            sha = current.get("sha")
            if item_type not in {"tag", "commit"} or not isinstance(sha, str):
                fail("Git tag object type is unsupported")
            if sha in seen:
                fail("Git tag peel contains a cycle")
            seen.add(sha)
            tag_chain.append({"type": item_type, "sha": sha})
            if item_type == "commit":
                break
            nested = self.json(f"{api}/git/tags/{sha}")
            if not isinstance(nested, dict) or not isinstance(
                nested.get("object"), dict
            ):
                fail("annotated Git tag response is malformed")
            current = nested["object"]
        if tag_chain[-1]["type"] != "commit":
            fail("Git tag peel exceeded its bound")
        commit = self.json(f"{api}/git/commits/{tag_chain[-1]['sha']}")
        if not isinstance(commit, dict) or not isinstance(commit.get("tree"), dict):
            fail("Git commit readback is malformed")
        latest = self.json(f"{api}/releases/latest", allow_404=True)
        if latest is None:
            latest_tag = None
        elif (
            not isinstance(latest, dict)
            or not isinstance(latest.get("tag_name"), str)
            or LATEST_TAG.fullmatch(latest["tag_name"]) is None
        ):
            fail("latest release readback is malformed")
        else:
            latest_tag = latest["tag_name"]
            if latest_tag == tag:
                fail("Labs release became repository latest")
        return {
            "release": release,
            "tag_chain": tag_chain,
            "commit_tree": commit["tree"].get("sha"),
            "latest_tag": latest_tag,
        }

    def readback_initial(
        self, owner: str, tag: str, metadata_name: str
    ) -> dict[str, Any]:
        repository = OWNERS[owner]["repository"]
        api = f"https://api.github.com/repos/{repository}"
        snapshot = self.snapshot(owner, tag)
        release = snapshot["release"]
        assets = release.get("assets") if isinstance(release, dict) else None
        if not isinstance(assets, list) or any(
            not isinstance(asset, dict) for asset in assets
        ):
            fail("release asset inventory is malformed")
        metadata_assets = (
            [asset for asset in assets if asset.get("name") == metadata_name]
        )
        if len(metadata_assets) != 1:
            fail("owner metadata release asset is missing or duplicated")
        asset_id = metadata_assets[0].get("id")
        if isinstance(asset_id, bool) or not isinstance(asset_id, int):
            fail("owner metadata asset ID is invalid")
        metadata_bytes, final_url = self.request(
            f"{api}/releases/assets/{asset_id}",
            accept="application/octet-stream",
            maximum=MAX_METADATA_BYTES,
        )
        if metadata_bytes is None or final_url is None:
            fail("owner metadata download is absent")
        final_host = urllib.parse.urlparse(final_url).hostname or ""
        if (
            final_host not in {"api.github.com", "github.com"}
            and not final_host.endswith(".githubusercontent.com")
        ):
            fail("owner metadata API redirected outside GitHub storage")
        snapshot["metadata_base64"] = base64.b64encode(metadata_bytes).decode(
            "ascii"
        )
        snapshot["supporting_json_base64"] = ""
        if owner == "rusty-kiosk":
            manifest_assets = [
                asset
                for asset in assets
                if asset.get("name") == "bundle-manifest.json"
            ]
            if len(manifest_assets) != 1:
                fail("Kiosk bundle manifest release asset is missing or duplicated")
            manifest_id = manifest_assets[0].get("id")
            if isinstance(manifest_id, bool) or not isinstance(manifest_id, int):
                fail("Kiosk bundle manifest asset ID is invalid")
            manifest_bytes, manifest_url = self.request(
                f"{api}/releases/assets/{manifest_id}",
                accept="application/octet-stream",
                maximum=MAX_METADATA_BYTES,
            )
            if manifest_bytes is None or manifest_url is None:
                fail("Kiosk bundle manifest download is absent")
            manifest_host = (
                urllib.parse.urlparse(manifest_url).hostname or ""
            )
            if (
                manifest_host not in {"api.github.com", "github.com"}
                and not manifest_host.endswith(".githubusercontent.com")
            ):
                fail("Kiosk manifest API redirected outside GitHub storage")
            snapshot["supporting_json_base64"] = base64.b64encode(
                manifest_bytes
            ).decode("ascii")
        return snapshot


def fixture_readbacks(value: Any) -> dict[str, dict[str, Any]]:
    root = exact_object(value, {"schema", "records"}, "readback fixture")
    if root["schema"] != "rusty.morphospace.owner_readback_fixture.v1":
        fail("readback fixture schema is unknown")
    if not isinstance(root["records"], list):
        fail("readback fixture records are not an array")
    result: dict[str, dict[str, Any]] = {}
    for raw in root["records"]:
        record = exact_object(
            raw,
            {
                "owner",
                "release",
                "tag_chain",
                "commit_tree",
                "latest_tag",
                "metadata_base64",
                "supporting_json_base64",
                "final_readback",
            },
            "readback fixture record",
        )
        if record["owner"] not in OWNERS:
            fail("readback fixture contains an unknown owner")
        if record["owner"] in result:
            fail("readback fixture duplicates an owner")
        exact_object(
            record["final_readback"],
            {"release", "tag_chain", "commit_tree", "latest_tag"},
            "final readback fixture",
        )
        result[record["owner"]] = record
    return result


def canonical_asset_url(repository: str, tag: str, name: str) -> str:
    return f"https://github.com/{repository}/releases/download/{tag}/{name}"


def find_release_asset(
    release: dict[str, Any],
    *,
    repository: str,
    tag: str,
    name: str,
    sha256: str,
    size: int,
) -> dict[str, Any]:
    assets = release.get("assets")
    if not isinstance(assets, list) or not assets:
        fail("release asset inventory is absent")
    if any(not isinstance(asset, dict) for asset in assets):
        fail("release asset inventory contains a non-object")
    names = [asset.get("name") for asset in assets]
    if len(names) != len(set(names)):
        fail("release asset inventory contains duplicate names")
    matches = [asset for asset in assets if asset.get("name") == name]
    if len(matches) != 1:
        fail("required release asset is absent or duplicated")
    asset = matches[0]
    expected_url = canonical_asset_url(repository, tag, name)
    if (
        asset.get("state") != "uploaded"
        or asset.get("digest") != f"sha256:{sha256}"
        or asset.get("size") != size
        or asset.get("browser_download_url") != expected_url
        or "/latest/" in expected_url
        or isinstance(asset.get("id"), bool)
        or not isinstance(asset.get("id"), int)
    ):
        fail("release asset readback differs from exact owner evidence")
    return asset


def validate_kiosk_manifest(
    manifest_value: Any,
    *,
    tag: str,
    adapted: dict[str, Any],
    release: dict[str, Any],
) -> list[dict[str, Any]]:
    manifest = exact_object(
        manifest_value,
        {
            "schema",
            "build_type",
            "product_channel",
            "maturity",
            "distribution_track",
            "prerelease",
            "tag",
            "version",
            "version_code",
            "identity_mode",
            "exit_policy",
            "source_url",
            "source_revision",
            "source_tree",
            "signer_sha256",
            "files",
        },
        "Kiosk bundle manifest",
    )
    version = tag_version("rusty-kiosk", tag)
    version_code = kiosk_version_code(version)
    lineage = adapted["coinstallable_lineage"]
    files = manifest["files"]
    if not isinstance(files, list) or len(files) != 4:
        fail("Kiosk bundle manifest payload inventory is not exact")
    by_name: dict[str, dict[str, Any]] = {}
    for index, raw in enumerate(files):
        if not isinstance(raw, dict):
            fail("Kiosk bundle manifest contains a non-object file")
        name = raw.get("name")
        if name in by_name:
            fail("Kiosk bundle manifest duplicates a file name")
        expected_fields = (
            {
                "name",
                "package_name",
                "version_name",
                "version_code",
                "sha256",
                "bytes",
            }
            if isinstance(name, str) and name.endswith(".apk")
            else {"name", "sha256", "bytes"}
        )
        entry = exact_object(
            raw, expected_fields, f"Kiosk bundle file {index}"
        )
        exact_string(entry["name"], ASSET_NAME, "Kiosk bundle file name")
        exact_string(entry["sha256"], SHA64, "Kiosk bundle file SHA-256")
        positive_int(entry["bytes"], "Kiosk bundle file byte count")
        by_name[entry["name"]] = entry
    expected_names = {
        "RUSTY-KIOSK-LICENSE.txt",
        "RUSTY-KIOSK-SOURCE.txt",
        "rusty-kiosk-setup-helper.apk",
        "rusty-kiosk.apk",
    }
    if set(by_name) != expected_names:
        fail("Kiosk bundle manifest payload names are not exact")
    primary = by_name["rusty-kiosk.apk"]
    helper = by_name["rusty-kiosk-setup-helper.apk"]
    if (
        manifest["schema"]
        != "meta.quest.file_manager.rusty_kiosk_bundle.v2"
        or manifest["build_type"] != "release"
        or manifest["product_channel"] != "labs"
        or manifest["maturity"] != "alpha"
        or manifest["distribution_track"] != "github-prerelease"
        or manifest["prerelease"] is not True
        or manifest["tag"] != tag
        or manifest["version"] != version
        or manifest["version_code"] != version_code
        or manifest["identity_mode"] != "separate-coinstallable"
        or manifest["exit_policy"]
        != "uninstall-labs-without-changing-stable"
        or manifest["source_url"]
        != "https://github.com/MesmerPrism/Rusty-Kiosk"
        or manifest["source_revision"] != adapted["source_revision"]
        or manifest["source_tree"] != adapted["source_tree"]
        or manifest["signer_sha256"] != lineage["signer_sha256"]
        or primary["package_name"]
        != "io.github.mesmerprism.rustykiosk.labs"
        or primary["version_name"] != version
        or primary["version_code"] != version_code
        or primary["sha256"] != adapted["sha256"]
        or primary["bytes"] != adapted["bytes"]
        or helper["package_name"]
        != "io.github.mesmerprism.rustykiosk.setuphelper.labs"
        or helper["version_name"] != version
        or helper["version_code"] != version_code
    ):
        fail("Kiosk bundle manifest is not the exact coinstallable Labs evidence")
    observed_assets: list[dict[str, Any]] = []
    for entry in files:
        observed_assets.append(
            find_release_asset(
                release,
                repository=OWNERS["rusty-kiosk"]["repository"],
                tag=tag,
                name=entry["name"],
                sha256=entry["sha256"],
                size=entry["bytes"],
            )
        )
    return observed_assets


def normalized_snapshot(
    owner: str, tag: str, readback: dict[str, Any]
) -> dict[str, Any]:
    repository = OWNERS[owner]["repository"]
    release = readback.get("release")
    if not isinstance(release, dict):
        fail("release readback is malformed")
    release_id = positive_int(release.get("id"), "release ID")
    if (
        release.get("tag_name") != tag
        or release.get("draft") is not False
        or release.get("prerelease") is not True
    ):
        fail("owner release is not the exact public labs prerelease")
    assets = release.get("assets")
    if not isinstance(assets, list) or not assets:
        fail("release asset inventory is absent")
    normalized_assets: list[dict[str, Any]] = []
    names: set[str] = set()
    ids: set[int] = set()
    for asset in assets:
        if not isinstance(asset, dict):
            fail("release asset inventory contains a non-object")
        name = exact_string(
            asset.get("name"), ASSET_NAME, "release asset name"
        )
        asset_id = positive_int(asset.get("id"), "release asset ID")
        size = positive_int(asset.get("size"), "release asset byte count")
        digest = asset.get("digest")
        if (
            not isinstance(digest, str)
            or not digest.startswith("sha256:")
            or SHA64.fullmatch(digest[7:]) is None
            or asset.get("state") != "uploaded"
            or asset.get("browser_download_url")
            != canonical_asset_url(repository, tag, name)
        ):
            fail("release asset inventory contains noncanonical evidence")
        if name in names or asset_id in ids:
            fail("release asset inventory contains duplicate identity")
        names.add(name)
        ids.add(asset_id)
        normalized_assets.append(
            {
                "id": asset_id,
                "name": name,
                "size": size,
                "digest": digest,
                "state": "uploaded",
                "browser_download_url": asset["browser_download_url"],
            }
        )
    if owner == "rusty-kiosk" and names != {
        "RUSTY-KIOSK-LICENSE.txt",
        "RUSTY-KIOSK-SOURCE.txt",
        "bundle-manifest.json",
        "rusty-kiosk-labs-owner-release.json",
        "rusty-kiosk-setup-helper.apk",
        "rusty-kiosk.apk",
    }:
        fail("Kiosk release inventory is not the exact six-asset contract")
    chain = readback.get("tag_chain")
    if not isinstance(chain, list) or not 1 <= len(chain) <= 6:
        fail("owner tag peel is incomplete")
    normalized_chain: list[dict[str, str]] = []
    seen: set[str] = set()
    for index, item in enumerate(chain):
        exact_object(item, {"type", "sha"}, "tag peel item")
        expected_type = "commit" if index == len(chain) - 1 else "tag"
        if item["type"] != expected_type:
            fail("owner tag peel ordering is unsupported")
        sha = exact_string(item["sha"], SHA40, "tag peel SHA")
        if sha in seen:
            fail("owner tag peel contains a cycle")
        seen.add(sha)
        normalized_chain.append({"type": item["type"], "sha": sha})
    tree = exact_string(
        readback.get("commit_tree"), SHA40, "owner commit tree"
    )
    latest_tag = readback.get("latest_tag")
    if latest_tag is not None:
        latest_tag = exact_string(
            latest_tag, LATEST_TAG, "latest repository release tag"
        )
        if latest_tag == tag:
            fail("Labs release became repository latest")
    return {
        "release": {
            "id": release_id,
            "tag_name": tag,
            "draft": False,
            "prerelease": True,
            "assets": sorted(normalized_assets, key=lambda item: item["name"]),
        },
        "tag_chain": normalized_chain,
        "commit_tree": tree,
        "latest_tag": latest_tag,
    }


def assert_same_run_stability(
    owner: str,
    tag: str,
    initial: dict[str, Any],
    final: dict[str, Any],
) -> None:
    if normalized_snapshot(owner, tag, initial) != normalized_snapshot(
        owner, tag, final
    ):
        fail("owner release, tag, tree, or latest state drifted during preflight")


def admit_record(
    request: dict[str, str],
    readback: dict[str, Any],
) -> tuple[dict[str, Any], dict[str, Any]]:
    owner = request["owner"]
    registry = OWNERS[owner]
    adapter_name = registry["adapter"]
    if adapter_name is None:
        fail(f"{owner} lacks a dedicated owner release metadata contract")
    repository = registry["repository"]
    normalized = normalized_snapshot(owner, request["tag"], readback)
    release = readback.get("release")
    assert isinstance(release, dict)
    tag = request["tag"]
    chain = normalized["tag_chain"]
    source_revision = request["expected_source_revision"]
    if chain[-1]["sha"] != source_revision:
        fail("owner tag does not peel to the protected source revision")
    source_tree = normalized["commit_tree"]
    try:
        metadata_bytes = base64.b64decode(
            readback.get("metadata_base64", ""), validate=True
        )
    except (ValueError, TypeError) as error:
        raise PreflightError("owner metadata bytes are not canonical base64") from error
    metadata_sha256 = sha256_bytes(metadata_bytes)
    if metadata_sha256 != request["expected_owner_metadata_sha256"]:
        fail("downloaded owner metadata differs from protected SHA-256")
    metadata = strict_json_bytes(
        metadata_bytes, "owner metadata", MAX_METADATA_BYTES
    )
    adapted = ADAPTERS[adapter_name](metadata, tag)
    if (
        adapted["source_revision"] != source_revision
        or adapted["source_tree"] != source_tree
    ):
        fail("owner metadata source does not match tag and commit readback")
    metadata_asset = find_release_asset(
        release,
        repository=repository,
        tag=tag,
        name=request["expected_owner_metadata_asset"],
        sha256=metadata_sha256,
        size=len(metadata_bytes),
    )
    primary_asset = find_release_asset(
        release,
        repository=repository,
        tag=tag,
        name=adapted["name"],
        sha256=adapted["sha256"],
        size=adapted["bytes"],
    )
    supporting_evidence: dict[str, Any] | None = None
    supporting_base64 = readback.get("supporting_json_base64")
    if owner == "rusty-kiosk":
        try:
            manifest_bytes = base64.b64decode(
                supporting_base64, validate=True
            )
        except (ValueError, TypeError) as error:
            raise PreflightError(
                "Kiosk bundle manifest bytes are not canonical base64"
            ) from error
        manifest_commitment = adapted["bundle_manifest"]
        if (
            sha256_bytes(manifest_bytes) != manifest_commitment["sha256"]
            or len(manifest_bytes) != manifest_commitment["bytes"]
        ):
            fail("Kiosk metadata does not bind the downloaded bundle manifest")
        manifest_value = strict_json_bytes(
            manifest_bytes, "Kiosk bundle manifest", MAX_METADATA_BYTES
        )
        manifest_asset = find_release_asset(
            release,
            repository=repository,
            tag=tag,
            name=manifest_commitment["name"],
            sha256=manifest_commitment["sha256"],
            size=manifest_commitment["bytes"],
        )
        payload_assets = validate_kiosk_manifest(
            manifest_value,
            tag=tag,
            adapted=adapted,
            release=release,
        )
        supporting_evidence = {
            "bundle_manifest": {
                "asset_id": manifest_asset["id"],
                "name": manifest_commitment["name"],
                "schema": manifest_commitment["schema"],
                "sha256": manifest_commitment["sha256"],
                "bytes": manifest_commitment["bytes"],
            },
            "coinstallable_lineage": adapted["coinstallable_lineage"],
            "manifest_payload_asset_ids": sorted(
                asset["id"] for asset in payload_assets
            ),
        }
    elif supporting_base64 != "":
        fail("owner readback contains unrequested supporting JSON")
    projection = {
        "tag": tag,
        "version": tag_version(owner, tag),
        "source_revision": source_revision,
        "artifact_name": adapted["name"],
        "artifact_url": canonical_asset_url(
            repository, tag, adapted["name"]
        ),
        "artifact_sha256": adapted["sha256"],
        "bytes": adapted["bytes"],
        "installation_identity": adapted["installation_identity"],
    }
    receipt = {
        "owner": owner,
        "product_channel": "labs",
        "maturity": request["maturity"],
        "distribution_track": request["distribution_track"],
        "repository": repository,
        "release_id": release["id"],
        "tag": tag,
        "peeled_source_revision": source_revision,
        "source_tree": source_tree,
        "owner_metadata": {
            "asset_id": metadata_asset["id"],
            "name": request["expected_owner_metadata_asset"],
            "sha256": metadata_sha256,
            "bytes": len(metadata_bytes),
        },
        "primary_artifact": {
            "asset_id": primary_asset["id"],
            "name": adapted["name"],
            "sha256": adapted["sha256"],
            "bytes": adapted["bytes"],
            "url": projection["artifact_url"],
        },
        "installation_identity": adapted["installation_identity"],
    }
    if supporting_evidence is not None:
        receipt["supporting_owner_evidence"] = supporting_evidence
    return projection, receipt


def run_preflight(
    request_value: Any,
    baseline_catalog: dict[str, Any],
    *,
    fixture: Any | None,
    token: str = "",
    require_complete_labs_set: bool = False,
) -> tuple[dict[str, Any], dict[str, Any]]:
    records = validate_request(
        request_value,
        require_complete_labs_set=require_complete_labs_set,
    )
    validate_catalog(baseline_catalog, allow_published=True)
    source_catalog = inert_catalog(baseline_catalog)
    readbacks = fixture_readbacks(fixture) if fixture is not None else None
    client = None if readbacks is not None else GitHubClient(token)
    generated = copy.deepcopy(source_catalog)
    receipt_records: list[dict[str, Any]] = []
    for request in records:
        owner = request["owner"]
        readback = (
            readbacks.get(owner)
            if readbacks is not None
            else client.readback_initial(
                owner, request["tag"], request["expected_owner_metadata_asset"]
            )
        )
        if readback is None:
            fail("requested owner readback is absent")
        projection, record_receipt = admit_record(request, readback)
        final_readback = (
            readback["final_readback"]
            if readbacks is not None
            else client.snapshot(owner, request["tag"])
        )
        assert_same_run_stability(
            owner, request["tag"], readback, final_readback
        )
        record_receipt["same_run_final_readback_verified"] = True
        product = next(
            item for item in generated["products"] if item["owner"] == owner
        )
        channel = next(
            item for item in product["product_channels"] if item["product_channel"] == "labs"
        )
        channel["availability"] = "published"
        channel["maturity"] = request["maturity"]
        channel["distribution_track"] = request["distribution_track"]
        channel["identity"]["installation_identity"] = projection[
            "installation_identity"
        ]
        channel["release"] = projection
        receipt_records.append(record_receipt)
    validate_catalog(generated, allow_published=True)
    source_bytes = canonical_json_bytes(source_catalog)
    generated_bytes = canonical_json_bytes(generated)
    receipt = {
        "schema": "rusty.morphospace.catalog_readonly_preflight.v1",
        "result": "pass",
        "mode": "offline-fixture" if fixture is not None else "live-readonly",
        "source_catalog_sha256": sha256_bytes(source_bytes),
        "generated_catalog_sha256": sha256_bytes(generated_bytes),
        "record_count": len(receipt_records),
        "complete_labs_owner_set": {
            record["owner"] for record in receipt_records
        }
        == set(OWNERS),
        "records": receipt_records,
        "owner_binary_downloaded": False,
        "supporting_owner_json_validated": sorted(
            record["owner"]
            for record in receipt_records
            if "supporting_owner_evidence" in record
        ),
        "publication_authorized": False,
        "pages_deployment_invoked": False,
    }
    return generated, receipt


def load_json(path: Path, label: str, maximum: int = MAX_JSON_BYTES) -> Any:
    return strict_json_bytes(path.read_bytes(), label, maximum)


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--request", required=True, type=Path)
    parser.add_argument("--catalog", type=Path, default=CATALOG_PATH)
    parser.add_argument("--fixture", type=Path)
    parser.add_argument("--out-catalog", required=True, type=Path)
    parser.add_argument("--out-receipt", required=True, type=Path)
    parser.add_argument(
        "--require-complete-labs-set",
        action="store_true",
        help="reject unless all registered labs owners are requested",
    )
    args = parser.parse_args()
    request = load_json(args.request, "publication request", MAX_METADATA_BYTES)
    catalog = load_json(args.catalog, "catalog source")
    fixture = (
        load_json(args.fixture, "readback fixture")
        if args.fixture is not None
        else None
    )
    generated, receipt = run_preflight(
        request,
        catalog,
        fixture=fixture,
        token=os.environ.get("GH_TOKEN", ""),
        require_complete_labs_set=args.require_complete_labs_set,
    )
    for path, value in (
        (args.out_catalog, generated),
        (args.out_receipt, receipt),
    ):
        path.parent.mkdir(parents=True, exist_ok=True)
        if path.exists():
            fail(f"refusing to overwrite {path.name}")
        path.write_bytes(canonical_json_bytes(value))
    print(
        "Catalog read-only preflight passed: "
        f"{receipt['record_count']} owner record(s), "
        f"catalog_sha256={receipt['generated_catalog_sha256']}"
    )
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except (PreflightError, OSError) as error:
        print(f"Catalog read-only preflight failed: {error}", file=sys.stderr)
        raise SystemExit(1)
