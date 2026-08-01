#!/usr/bin/env python3
"""Offline damage matrix for the central Fleet Pages projection."""

from __future__ import annotations

import base64
import copy
import hashlib
import json
from pathlib import Path
import tempfile

from publish_fleet_pages_projection import (
    ENVELOPE_SCHEMA,
    MAX_DISPATCH_BYTES,
    MAX_REQUEST_BYTES,
    ProjectionError,
    materialize,
    project,
)


VERSION = "0.1.0"
TAG = "v0.1.0-alpha.5"
SOURCE = "1" * 40
TREE = "2" * 40
THUMBPRINT = "A" * 40


def encoded_json(value: object) -> bytes:
    return json.dumps(value, separators=(",", ":")).encode("utf-8")


def digest(value: bytes) -> str:
    return hashlib.sha256(value).hexdigest()


def make_request() -> tuple[dict, dict[str, bytes]]:
    spki = b"exact-test-spki"
    spki_hash = digest(spki)
    release = encoded_json(
        {
            "schema": "rusty.fleet.release_descriptor_envelope.v4",
            "payload_base64url": "e30",
            "signature_base64url": "AA",
            "signer_spki_sha256": spki_hash,
        }
    )
    descriptor_receipt = encoded_json(
        {
            "schema": "rusty.fleet.windows_release_descriptor_receipt.v5",
            "result": "pass",
            "version": VERSION,
            "product_channel": "labs",
            "maturity": "alpha",
            "channel": "labs",
            "distribution_track": "github-prerelease",
            "release_tag": TAG,
            "source_revision": SOURCE,
            "source_tree": TREE,
            "descriptor_signer_spki_sha256": spki_hash,
            "setup_signer_thumbprint": THUMBPRINT,
            "descriptor_sha256": digest(release),
            "pages_path": "Rusty-Fleet/metadata/labs/release.json",
        }
    )
    preflight = encoded_json(
        {
            "schema": "rusty.fleet.windows_publication_receipt.v3",
            "result": "pass",
            "mode": "preflight",
            "version": VERSION,
            "product_channel": "labs",
            "maturity": "alpha",
            "channel": "labs",
            "distribution_track": "github-prerelease",
            "tag": TAG,
            "source_revision": SOURCE,
            "source_tree": TREE,
            "descriptor_sha256": digest(release),
            "descriptor_receipt_sha256": digest(descriptor_receipt),
            "descriptor_signer_spki_sha256": spki_hash,
            "asset_count": 10,
            "token_used": False,
            "gh_invoked": False,
            "draft_verified": False,
            "visible_verified": False,
            "remote_tag_verified": False,
            "remote_integrity_verified": False,
            "resumed_draft": False,
            "uploaded_asset_count": 0,
        }
    )
    handoff = encoded_json(
        {
            "schema": "rusty.fleet.windows_release_metadata_handoff.v2",
            "result": "pass",
            "version": VERSION,
            "product_channel": "labs",
            "maturity": "alpha",
            "channel": "labs",
            "distribution_track": "github-prerelease",
            "tag": TAG,
            "source_revision": SOURCE,
            "source_tree": TREE,
            "descriptor_signer_spki_sha256": spki_hash,
            "binary_authority": "github_releases",
            "pages_binary_count": 0,
            "pages_path": "Rusty-Fleet/metadata/labs",
            "publication_preflight_receipt_sha256": digest(preflight),
        }
    )
    files = {
        "release.json": release,
        "release-descriptor.receipt.json": descriptor_receipt,
        "release-descriptor.spki.der": spki,
        "deployment-handoff.json": handoff,
        "metadata-preflight.json": preflight,
    }
    request = {
        "schema": "rusty.fleet.pages_projection_request.v1",
        "source_repository": "MesmerPrism/rusty-fleet",
        "target_repository": "MesmerPrism/MesmerPrism.github.io",
        "source_run_id": "123456789",
        "version": VERSION,
        "product_channel": "labs",
        "maturity": "alpha",
        "distribution_track": "github-prerelease",
        "release_tag": TAG,
        "source_revision": SOURCE,
        "source_tree": TREE,
        "fleet_signer_thumbprint": THUMBPRINT,
        "hostess_signer_thumbprint": THUMBPRINT,
        "descriptor_signer_spki_sha256": spki_hash,
        "files": [
            {
                "name": name,
                "sha256": digest(value),
                "size_bytes": len(value),
                "content_base64": base64.b64encode(value).decode("ascii"),
            }
            for name, value in sorted(files.items())
        ],
    }
    return request, files


def make_event(request: dict) -> dict:
    request_bytes = encoded_json(request)
    return {
        "client_payload": {
            "schema": ENVELOPE_SCHEMA,
            "request_sha256": digest(request_bytes),
            "request_base64": base64.b64encode(request_bytes).decode("ascii"),
        }
    }


def write_event(path: Path, event: dict) -> None:
    path.write_bytes(encoded_json(event))


def assert_rejected(action, label: str) -> None:
    try:
        action()
    except ProjectionError:
        return
    raise AssertionError(f"projection accepted damage: {label}")


def materialize_event(root: Path, event: dict) -> Path:
    root.mkdir(parents=True, exist_ok=True)
    event_path = root / "event.json"
    output = root / "materialized"
    write_event(event_path, event)
    materialize(event_path, output, None)
    return output


def main() -> int:
    request, files = make_request()
    event = make_event(request)
    if len(encoded_json(event["client_payload"])) >= MAX_DISPATCH_BYTES:
        raise AssertionError("valid dispatch fixture unexpectedly exceeds GitHub's bound")
    with tempfile.TemporaryDirectory(prefix="fleet-pages-projection-test-") as value:
        root = Path(value)
        materialized = materialize_event(root, event)
        for name, expected in files.items():
            if (materialized / "files" / name).read_bytes() != expected:
                raise AssertionError(f"materialization changed {name}")

        fleet_staging = root / "fleet-staging"
        fleet_staging.mkdir()
        (fleet_staging / "index.html").write_text("fleet page\n", encoding="utf-8")
        (fleet_staging / "styles.css").write_text("fleet css\n", encoding="utf-8")
        fleet_source_site = root / "fleet-source-site"
        fleet_source_site.mkdir()
        (fleet_source_site / "index.html").write_bytes(
            (fleet_staging / "index.html").read_bytes()
        )
        (fleet_source_site / "styles.css").write_bytes(
            (fleet_staging / "styles.css").read_bytes()
        )
        metadata = fleet_staging / "Rusty-Fleet" / "metadata" / "labs"
        metadata.mkdir(parents=True)
        for name in (
            "release.json",
            "release-descriptor.receipt.json",
            "release-descriptor.spki.der",
            "deployment-handoff.json",
        ):
            (metadata / name).write_bytes(files[name])

        site = root / "site"
        (site / ".git").mkdir(parents=True)
        (site / "CNAME").write_text("mesmerprism.com\n", encoding="utf-8")
        (site / "unrelated.txt").write_text("preserve\n", encoding="utf-8")
        stable = site / "Rusty-Fleet" / "metadata" / "stable"
        stable.mkdir(parents=True)
        (stable / "sentinel.json").write_text("stable\n", encoding="utf-8")
        old_labs = site / "Rusty-Fleet" / "metadata" / "labs"
        old_labs.mkdir()
        (old_labs / "stale.json").write_text("stale\n", encoding="utf-8")
        receipt = root / "projection-receipt.json"
        project(
            materialized / "request.json",
            fleet_staging,
            fleet_source_site,
            site,
            receipt,
        )
        projected = json.loads(receipt.read_text(encoding="utf-8"))
        observed_labs = {
            path.name for path in (site / "Rusty-Fleet" / "metadata" / "labs").iterdir()
        }
        if (
            observed_labs
            != {
                "release.json",
                "release-descriptor.receipt.json",
                "release-descriptor.spki.der",
                "deployment-handoff.json",
            }
            or (site / "CNAME").read_text(encoding="utf-8") != "mesmerprism.com\n"
            or (site / "unrelated.txt").read_text(encoding="utf-8") != "preserve\n"
            or (stable / "sentinel.json").read_text(encoding="utf-8") != "stable\n"
            or projected["result"] != "pass"
            or projected["publication_authorized"] is not True
            or projected["pages_binary_count"] != 0
            or projected["release_tag"] != TAG
        ):
            raise AssertionError("happy-path central projection is incomplete")

    damage_count = 0
    with tempfile.TemporaryDirectory(prefix="fleet-pages-damage-") as value:
        root = Path(value)

        expanded = copy.deepcopy(event)
        expanded["client_payload"]["authority"] = True
        assert_rejected(
            lambda: materialize_event(root / "expanded", expanded),
            "expanded dispatch envelope",
        )
        damage_count += 1

        wrong_digest = copy.deepcopy(event)
        wrong_digest["client_payload"]["request_sha256"] = "9" * 64
        assert_rejected(
            lambda: materialize_event(root / "digest", wrong_digest),
            "request digest mismatch",
        )
        damage_count += 1

        request_damages = [
            (
                "expanded request",
                lambda value: value.update({"publication_authorized": True}),
            ),
            (
                "wrong repository",
                lambda value: value.update({"target_repository": "MesmerPrism/other"}),
            ),
            (
                "cross-axis tag",
                lambda value: value.update({"release_tag": "v0.1.0"}),
            ),
            (
                "duplicate file",
                lambda value: value["files"].append(copy.deepcopy(value["files"][0])),
            ),
            (
                "path traversal file",
                lambda value: value["files"][0].update({"name": "../release.json"}),
            ),
            (
                "file digest mismatch",
                lambda value: value["files"][0].update({"sha256": "9" * 64}),
            ),
            (
                "signer thumbprint substitution",
                lambda value: value.update(
                    {
                        "fleet_signer_thumbprint": "B" * 40,
                        "hostess_signer_thumbprint": "B" * 40,
                    }
                ),
            ),
        ]
        for index, (label, mutate) in enumerate(request_damages):
            damaged_request = copy.deepcopy(request)
            mutate(damaged_request)
            assert_rejected(
                lambda current=make_event(damaged_request), slot=index: materialize_event(
                    root / f"request-{slot}", current
                ),
                label,
            )
            damage_count += 1

        damaged_request, _ = make_request()
        receipt_record = next(
            item
            for item in damaged_request["files"]
            if item["name"] == "release-descriptor.receipt.json"
        )
        receipt_value = json.loads(
            base64.b64decode(receipt_record["content_base64"])
        )
        receipt_value["source_revision"] = "9" * 40
        receipt_bytes = encoded_json(receipt_value)
        receipt_record.update(
            {
                "content_base64": base64.b64encode(receipt_bytes).decode("ascii"),
                "size_bytes": len(receipt_bytes),
                "sha256": digest(receipt_bytes),
            }
        )
        assert_rejected(
            lambda: materialize_event(
                root / "metadata-binding", make_event(damaged_request)
            ),
            "metadata source substitution",
        )
        damage_count += 1

        oversized_bytes = b"{" + (b" " * MAX_REQUEST_BYTES) + b"}"
        oversized = {
            "client_payload": {
                "schema": ENVELOPE_SCHEMA,
                "request_sha256": digest(oversized_bytes),
                "request_base64": base64.b64encode(oversized_bytes).decode("ascii"),
            }
        }
        assert_rejected(
            lambda: materialize_event(root / "oversized", oversized),
            "request above the base64-safe raw bound",
        )
        damage_count += 1

    workflow_path = (
        Path(__file__).resolve().parents[1]
        / ".github"
        / "workflows"
        / "fleet-pages-projection.yml"
    )
    if workflow_path.exists():
        workflow = workflow_path.read_text(encoding="utf-8")
        for token in (
            "repository_dispatch:",
            "fleet-pages-projection",
            "environment: fleet-pages-publication",
            "permissions:",
            "contents: write",
            "pages: write",
            "persist-credentials: false",
            "publish_fleet_pages_projection.py materialize",
            "New-WindowsPagesDeployment.ps1",
            "actions/upload-artifact@",
            "actions/download-artifact@",
            "publish_fleet_pages_projection.py project",
            "--fleet-source-site",
            "gh auth setup-git",
            "git push origin HEAD:main",
            "repos/MesmerPrism/MesmerPrism.github.io/pages/builds",
        ):
            if token not in workflow:
                raise AssertionError(f"central workflow is missing token: {token}")
        for forbidden in ("pull_request:", "schedule:", "workflow_dispatch:"):
            if forbidden in workflow:
                raise AssertionError(f"central workflow exposes route: {forbidden}")

    print(
        "Fleet central Pages projection tests passed: exact owner subtree, "
        f"non-target preservation, and {damage_count} damage classes"
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
