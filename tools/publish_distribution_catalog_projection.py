#!/usr/bin/env python3
"""Install a hash-bound five-owner catalog projection from read-only evidence."""

from __future__ import annotations

import argparse
import json
import re
from pathlib import Path
from typing import Any

from jsonschema import ValidationError

from preflight_distribution_catalog import (
    OWNERS,
    canonical_json_bytes,
    inert_catalog,
    sha256_bytes,
    strict_json_bytes,
)
from test_distribution_catalog import validate_catalog


CATALOG_RELATIVE = Path("Rusty-Morphospace/catalog/catalog.json")
PUBLICATION_RELATIVE = Path("Rusty-Morphospace/catalog/publication.json")
SHA40 = re.compile(r"^[0-9a-f]{40}$")
SHA64 = re.compile(r"^[0-9a-f]{64}$")
ARTIFACT_DIGEST = re.compile(r"^sha256:[0-9a-f]{64}$")
UTC_SECOND = re.compile(r"^20\d\d-[01]\d-[0-3]\dT[0-2]\d:[0-5]\d:[0-5]\dZ$")
MAX_JSON_BYTES = 2 * 1024 * 1024


class ProjectionError(ValueError):
    """The supplied preflight evidence cannot authorize this projection."""


def fail(message: str) -> None:
    raise ProjectionError(message)


def exact_object(value: Any, keys: set[str], label: str) -> dict[str, Any]:
    if not isinstance(value, dict) or set(value) != keys:
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


def read_json(path: Path, label: str) -> tuple[dict[str, Any], bytes]:
    if not path.is_file() or path.is_symlink():
        fail(f"{label} is absent or unsafe")
    value = path.read_bytes()
    parsed = strict_json_bytes(value, label, MAX_JSON_BYTES)
    if not isinstance(parsed, dict):
        fail(f"{label} is not an object")
    return parsed, value


def validate_receipt(
    receipt: dict[str, Any],
    catalog: dict[str, Any],
    catalog_bytes: bytes,
    source_catalog: dict[str, Any],
) -> None:
    exact_object(
        receipt,
        {
            "schema",
            "result",
            "mode",
            "source_catalog_sha256",
            "generated_catalog_sha256",
            "record_count",
            "complete_labs_owner_set",
            "records",
            "owner_binary_downloaded",
            "supporting_owner_json_validated",
            "publication_authorized",
            "pages_deployment_invoked",
        },
        "preflight receipt",
    )
    if (
        receipt["schema"]
        != "rusty.morphospace.catalog_readonly_preflight.v1"
        or receipt["result"] != "pass"
        or receipt["mode"] != "live-readonly"
        or receipt["record_count"] != len(OWNERS)
        or receipt["complete_labs_owner_set"] is not True
        or receipt["owner_binary_downloaded"] is not False
        or receipt["supporting_owner_json_validated"] != ["rusty-kiosk"]
        or receipt["publication_authorized"] is not False
        or receipt["pages_deployment_invoked"] is not False
        or receipt["generated_catalog_sha256"] != sha256_bytes(catalog_bytes)
        or receipt["source_catalog_sha256"]
        != sha256_bytes(canonical_json_bytes(inert_catalog(source_catalog)))
    ):
        fail("preflight receipt is not exact read-only complete-set evidence")
    records = receipt["records"]
    if not isinstance(records, list) or len(records) != len(OWNERS):
        fail("preflight receipt record set is incomplete")
    seen: set[str] = set()
    products = {item["owner"]: item for item in catalog["products"]}
    base_keys = {
        "owner",
        "product_channel",
        "maturity",
        "distribution_track",
        "repository",
        "release_id",
        "tag",
        "peeled_source_revision",
        "source_tree",
        "owner_metadata",
        "primary_artifact",
        "installation_identity",
        "same_run_final_readback_verified",
    }
    for raw in records:
        if not isinstance(raw, dict):
            fail("preflight receipt contains a non-object record")
        allowed = base_keys | ({"supporting_owner_evidence"} if raw.get("owner") == "rusty-kiosk" else set())
        exact_object(raw, allowed, "preflight owner record")
        owner = raw["owner"]
        if owner not in OWNERS or owner in seen:
            fail("preflight receipt owner set is unknown or duplicated")
        seen.add(owner)
        if (
            raw["product_channel"] != "labs"
            or raw["maturity"] != "alpha"
            or raw["distribution_track"] != "github-prerelease"
            or raw["repository"] != OWNERS[owner]["repository"]
            or raw["same_run_final_readback_verified"] is not True
        ):
            fail("preflight owner record policy is not exact")
        positive_int(raw["release_id"], "owner release ID")
        exact_string(raw["peeled_source_revision"], SHA40, "owner source revision")
        exact_string(raw["source_tree"], SHA40, "owner source tree")
        metadata = exact_object(
            raw["owner_metadata"],
            {"asset_id", "name", "sha256", "bytes"},
            "owner metadata evidence",
        )
        primary = exact_object(
            raw["primary_artifact"],
            {"asset_id", "name", "sha256", "bytes", "url"},
            "owner primary artifact evidence",
        )
        positive_int(metadata["asset_id"], "owner metadata asset ID")
        positive_int(metadata["bytes"], "owner metadata byte count")
        exact_string(metadata["sha256"], SHA64, "owner metadata SHA-256")
        positive_int(primary["asset_id"], "primary artifact ID")
        positive_int(primary["bytes"], "primary artifact byte count")
        exact_string(primary["sha256"], SHA64, "primary artifact SHA-256")
        product = products[owner]
        labs = next(
            channel
            for channel in product["product_channels"]
            if channel["product_channel"] == "labs"
        )
        release = labs["release"]
        if (
            labs["availability"] != "published"
            or release["tag"] != raw["tag"]
            or release["source_revision"] != raw["peeled_source_revision"]
            or release["artifact_name"] != primary["name"]
            or release["artifact_url"] != primary["url"]
            or release["artifact_sha256"] != primary["sha256"]
            or release["bytes"] != primary["bytes"]
            or release["installation_identity"] != raw["installation_identity"]
        ):
            fail("generated catalog does not match the exact owner receipt")
    if seen != set(OWNERS):
        fail("preflight receipt does not cover every owner")


def publish_projection(
    *,
    catalog_path: Path,
    receipt_path: Path,
    site_root: Path,
    preflight_run_id: int,
    preflight_head_sha: str,
    artifact_id: int,
    artifact_name: str,
    artifact_digest: str,
    artifact_size_bytes: int,
    authorized_at: str,
) -> dict[str, Any]:
    if preflight_run_id < 1 or artifact_id < 1 or artifact_size_bytes < 1:
        fail("preflight workflow identity is malformed")
    exact_string(preflight_head_sha, SHA40, "preflight workflow head")
    exact_string(artifact_digest, ARTIFACT_DIGEST, "preflight artifact digest")
    exact_string(authorized_at, UTC_SECOND, "authorization timestamp")
    expected_name = f"distribution-catalog-readonly-preflight-{preflight_run_id}"
    if artifact_name != expected_name:
        fail("preflight artifact name is not run-bound")
    catalog, catalog_bytes = read_json(catalog_path, "generated catalog")
    receipt, receipt_bytes = read_json(receipt_path, "preflight receipt")
    try:
        validate_catalog(catalog, allow_published=True)
    except (AssertionError, ValidationError) as error:
        raise ProjectionError("generated catalog failed its contract") from error
    current_path = site_root / CATALOG_RELATIVE
    current, _ = read_json(current_path, "current public catalog")
    try:
        validate_catalog(current, allow_published=True)
    except (AssertionError, ValidationError) as error:
        raise ProjectionError("current public catalog failed its contract") from error
    validate_receipt(receipt, catalog, catalog_bytes, current)
    publication = {
        "schema": "rusty.morphospace.catalog_publication_authorization.v1",
        "result": "authorized",
        "projection": "complete-five-owner-labs-set",
        "authorized_at": authorized_at,
        "publication_target": "/Rusty-Morphospace/catalog/catalog.json",
        "publication_authorized": True,
        "pages_build_request_mode": "post-commit-github-api",
        "source_preflight": {
            "repository": "MesmerPrism/MesmerPrism.github.io",
            "workflow_run_id": preflight_run_id,
            "workflow_url": (
                "https://github.com/MesmerPrism/MesmerPrism.github.io/"
                f"actions/runs/{preflight_run_id}"
            ),
            "workflow_head_sha": preflight_head_sha,
            "artifact_id": artifact_id,
            "artifact_name": artifact_name,
            "artifact_digest": artifact_digest,
            "artifact_size_bytes": artifact_size_bytes,
            "readback_receipt_sha256": sha256_bytes(receipt_bytes),
            "source_catalog_sha256": receipt["source_catalog_sha256"],
            "published_catalog_sha256": sha256_bytes(catalog_bytes),
            "record_count": len(OWNERS),
            "complete_labs_owner_set": True,
            "owner_binary_downloaded": False,
            "read_only_preflight_publication_authorized": False,
            "read_only_preflight_pages_deployment_invoked": False,
        },
    }
    publication_bytes = canonical_json_bytes(publication)
    publication_path = site_root / PUBLICATION_RELATIVE
    if current_path.is_symlink() or publication_path.is_symlink():
        fail("catalog publication target is a symbolic link")
    current_path.write_bytes(catalog_bytes)
    publication_path.write_bytes(publication_bytes)
    return publication


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--catalog", required=True, type=Path)
    parser.add_argument("--receipt", required=True, type=Path)
    parser.add_argument("--site-root", required=True, type=Path)
    parser.add_argument("--preflight-run-id", required=True, type=int)
    parser.add_argument("--preflight-head-sha", required=True)
    parser.add_argument("--artifact-id", required=True, type=int)
    parser.add_argument("--artifact-name", required=True)
    parser.add_argument("--artifact-digest", required=True)
    parser.add_argument("--artifact-size-bytes", required=True, type=int)
    parser.add_argument("--authorized-at", required=True)
    args = parser.parse_args()
    publication = publish_projection(
        catalog_path=args.catalog,
        receipt_path=args.receipt,
        site_root=args.site_root,
        preflight_run_id=args.preflight_run_id,
        preflight_head_sha=args.preflight_head_sha,
        artifact_id=args.artifact_id,
        artifact_name=args.artifact_name,
        artifact_digest=args.artifact_digest,
        artifact_size_bytes=args.artifact_size_bytes,
        authorized_at=args.authorized_at,
    )
    print(json.dumps(publication, separators=(",", ":")))
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except (ProjectionError, AssertionError) as error:
        print(f"Catalog publication failed: {error}")
        raise SystemExit(1)
