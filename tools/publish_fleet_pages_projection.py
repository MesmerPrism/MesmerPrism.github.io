#!/usr/bin/env python3
"""Validate and install an exact Fleet-owned Pages projection."""

from __future__ import annotations

import argparse
import base64
import hashlib
import json
import os
from pathlib import Path
import re
import shutil
import subprocess
import tempfile
from typing import Any


class ProjectionError(RuntimeError):
    """Raised when the central Pages projection cannot fail closed."""


CENTRAL_REPOSITORY = "MesmerPrism/MesmerPrism.github.io"
FLEET_REPOSITORY = "MesmerPrism/rusty-fleet"
REQUEST_SCHEMA = "rusty.fleet.pages_projection_request.v1"
ENVELOPE_SCHEMA = "rusty.fleet.pages_projection_dispatch.v1"
RECEIPT_SCHEMA = "rusty.morphospace.fleet_pages_projection_receipt.v1"
MAX_REQUEST_BYTES = 45_000
MAX_DISPATCH_BYTES = 65_535
HEX_40 = re.compile(r"^[0-9a-f]{40}$")
HEX_64 = re.compile(r"^[0-9a-f]{64}$")
THUMBPRINT = re.compile(r"^[0-9A-F]{40}$")
VERSION = re.compile(r"^[0-9]+\.[0-9]+\.[0-9]+$")
RUN_ID = re.compile(r"^[1-9][0-9]{0,19}$")
EXPECTED_FILES = {
    "release.json": 32_768,
    "release-descriptor.receipt.json": 32_768,
    "release-descriptor.spki.der": 8_192,
    "deployment-handoff.json": 32_768,
    "metadata-preflight.json": 65_536,
}
PAGES_METADATA_FILES = {
    "release.json",
    "release-descriptor.receipt.json",
    "release-descriptor.spki.der",
    "deployment-handoff.json",
}
REQUEST_KEYS = {
    "schema",
    "source_repository",
    "target_repository",
    "source_run_id",
    "version",
    "product_channel",
    "maturity",
    "distribution_track",
    "release_tag",
    "source_revision",
    "source_tree",
    "fleet_signer_thumbprint",
    "hostess_signer_thumbprint",
    "descriptor_signer_spki_sha256",
    "files",
}
FILE_KEYS = {"name", "sha256", "size_bytes", "content_base64"}


def sha256_bytes(value: bytes) -> str:
    return hashlib.sha256(value).hexdigest()


def duplicate_rejecting_pairs(pairs: list[tuple[str, Any]]) -> dict[str, Any]:
    result: dict[str, Any] = {}
    for key, value in pairs:
        if key in result:
            raise ProjectionError(f"duplicate JSON key: {key}")
        result[key] = value
    return result


def strict_json_bytes(
    value: bytes,
    label: str,
    maximum: int,
    *,
    allow_trailing_lf: bool = False,
) -> Any:
    if not value or len(value) > maximum or value.startswith(b"\xef\xbb\xbf"):
        raise ProjectionError(f"{label} size or encoding is outside its bound")
    normalized = value[:-1] if allow_trailing_lf and value.endswith(b"\n") else value
    try:
        text = normalized.decode("utf-8")
        parsed = json.loads(text, object_pairs_hook=duplicate_rejecting_pairs)
    except (UnicodeDecodeError, json.JSONDecodeError) as exc:
        raise ProjectionError(f"{label} is not strict UTF-8 JSON") from exc
    if text != text.strip():
        raise ProjectionError(f"{label} contains surrounding whitespace")
    return parsed


def require_object(value: Any, label: str) -> dict[str, Any]:
    if not isinstance(value, dict):
        raise ProjectionError(f"{label} is not an object")
    return value


def require_exact_keys(value: dict[str, Any], expected: set[str], label: str) -> None:
    if set(value) != expected:
        raise ProjectionError(f"{label} shape is not closed")


def decode_base64(value: Any, label: str, maximum: int) -> bytes:
    if not isinstance(value, str) or not value:
        raise ProjectionError(f"{label} base64 is absent")
    try:
        decoded = base64.b64decode(value, validate=True)
    except (ValueError, base64.binascii.Error) as exc:
        raise ProjectionError(f"{label} base64 is malformed") from exc
    if not decoded or len(decoded) > maximum:
        raise ProjectionError(f"{label} decoded size is outside its bound")
    return decoded


def validate_axes(request: dict[str, Any]) -> None:
    if request["source_repository"] != FLEET_REPOSITORY:
        raise ProjectionError("unexpected Fleet source repository")
    if request["target_repository"] != CENTRAL_REPOSITORY:
        raise ProjectionError("unexpected central Pages repository")
    if not isinstance(request["source_run_id"], str) or not RUN_ID.fullmatch(
        request["source_run_id"]
    ):
        raise ProjectionError("source run id is malformed")
    version = request["version"]
    if not isinstance(version, str) or not VERSION.fullmatch(version):
        raise ProjectionError("version is malformed")
    channel = request["product_channel"]
    maturity = request["maturity"]
    track = request["distribution_track"]
    tag = request["release_tag"]
    if channel == "labs":
        if maturity not in {"alpha", "beta", "rc"} or track != "github-prerelease":
            raise ProjectionError("Labs axes are inconsistent")
        expected_tag = rf"^v{re.escape(version)}-{maturity}\.[1-9][0-9]*$"
    elif channel == "stable":
        if maturity != "released" or track != "github-release":
            raise ProjectionError("Stable axes are inconsistent")
        expected_tag = rf"^v{re.escape(version)}$"
    else:
        raise ProjectionError("product channel is not publishable")
    if not isinstance(tag, str) or re.fullmatch(expected_tag, tag) is None:
        raise ProjectionError("release tag does not match its axes")
    if request.get("source_revision") is None or not HEX_40.fullmatch(
        request["source_revision"]
    ):
        raise ProjectionError("source revision is malformed")
    if request.get("source_tree") is None or not HEX_40.fullmatch(
        request["source_tree"]
    ):
        raise ProjectionError("source tree is malformed")
    if not THUMBPRINT.fullmatch(request.get("fleet_signer_thumbprint", "")):
        raise ProjectionError("Fleet signer thumbprint is malformed")
    if not THUMBPRINT.fullmatch(request.get("hostess_signer_thumbprint", "")):
        raise ProjectionError("Hostess signer thumbprint is malformed")
    if request["fleet_signer_thumbprint"] != request["hostess_signer_thumbprint"]:
        raise ProjectionError("Fleet and Hostess signer thumbprints disagree")
    if not HEX_64.fullmatch(request.get("descriptor_signer_spki_sha256", "")):
        raise ProjectionError("descriptor signer SPKI digest is malformed")


def require_fields(value: dict[str, Any], expected: dict[str, Any], label: str) -> None:
    for key, expected_value in expected.items():
        if value.get(key) != expected_value:
            raise ProjectionError(f"{label} field does not match: {key}")


def validate_public_metadata(request: dict[str, Any], files: dict[str, bytes]) -> None:
    release = require_object(
        strict_json_bytes(
            files["release.json"],
            "release.json",
            32_768,
            allow_trailing_lf=True,
        ),
        "release.json",
    )
    require_exact_keys(
        release,
        {"schema", "payload_base64url", "signature_base64url", "signer_spki_sha256"},
        "release.json",
    )
    if (
        release["schema"] != "rusty.fleet.release_descriptor_envelope.v4"
        or release["signer_spki_sha256"]
        != request["descriptor_signer_spki_sha256"]
        or not isinstance(release["payload_base64url"], str)
        or not isinstance(release["signature_base64url"], str)
    ):
        raise ProjectionError("release descriptor envelope is inconsistent")

    receipt = require_object(
        strict_json_bytes(
            files["release-descriptor.receipt.json"],
            "release descriptor receipt",
            32_768,
            allow_trailing_lf=True,
        ),
        "release descriptor receipt",
    )
    require_fields(
        receipt,
        {
            "schema": "rusty.fleet.windows_release_descriptor_receipt.v5",
            "result": "pass",
            "version": request["version"],
            "product_channel": request["product_channel"],
            "maturity": request["maturity"],
            "channel": request["product_channel"],
            "distribution_track": request["distribution_track"],
            "release_tag": request["release_tag"],
            "source_revision": request["source_revision"],
            "source_tree": request["source_tree"],
            "descriptor_signer_spki_sha256": request[
                "descriptor_signer_spki_sha256"
            ],
            "setup_signer_thumbprint": request["fleet_signer_thumbprint"],
            "descriptor_sha256": sha256_bytes(files["release.json"]),
            "pages_path": (
                f"Rusty-Fleet/metadata/{request['product_channel']}/release.json"
            ),
        },
        "release descriptor receipt",
    )
    if receipt.get("pages_binary_count") not in (None, 0):
        raise ProjectionError("descriptor receipt claims a Pages binary")

    handoff = require_object(
        strict_json_bytes(
            files["deployment-handoff.json"],
            "deployment handoff",
            32_768,
            allow_trailing_lf=True,
        ),
        "deployment handoff",
    )
    require_fields(
        handoff,
        {
            "schema": "rusty.fleet.windows_release_metadata_handoff.v2",
            "result": "pass",
            "version": request["version"],
            "product_channel": request["product_channel"],
            "maturity": request["maturity"],
            "channel": request["product_channel"],
            "distribution_track": request["distribution_track"],
            "tag": request["release_tag"],
            "source_revision": request["source_revision"],
            "source_tree": request["source_tree"],
            "descriptor_signer_spki_sha256": request[
                "descriptor_signer_spki_sha256"
            ],
            "binary_authority": "github_releases",
            "pages_binary_count": 0,
            "pages_path": f"Rusty-Fleet/metadata/{request['product_channel']}",
        },
        "deployment handoff",
    )

    preflight = require_object(
        strict_json_bytes(
            files["metadata-preflight.json"],
            "publication preflight",
            65_536,
            allow_trailing_lf=True,
        ),
        "publication preflight",
    )
    require_fields(
        preflight,
        {
            "schema": "rusty.fleet.windows_publication_receipt.v3",
            "result": "pass",
            "mode": "preflight",
            "version": request["version"],
            "product_channel": request["product_channel"],
            "maturity": request["maturity"],
            "channel": request["product_channel"],
            "distribution_track": request["distribution_track"],
            "tag": request["release_tag"],
            "source_revision": request["source_revision"],
            "source_tree": request["source_tree"],
            "descriptor_sha256": sha256_bytes(files["release.json"]),
            "descriptor_receipt_sha256": sha256_bytes(
                files["release-descriptor.receipt.json"]
            ),
            "descriptor_signer_spki_sha256": request[
                "descriptor_signer_spki_sha256"
            ],
            "asset_count": 10,
            "token_used": False,
            "gh_invoked": False,
            "draft_verified": False,
            "visible_verified": False,
            "remote_tag_verified": False,
            "remote_integrity_verified": False,
            "resumed_draft": False,
            "uploaded_asset_count": 0,
        },
        "publication preflight",
    )

    if sha256_bytes(files["release-descriptor.spki.der"]) != request[
        "descriptor_signer_spki_sha256"
    ]:
        raise ProjectionError("descriptor SPKI bytes do not match their public pin")
    if handoff.get("publication_preflight_receipt_sha256") != sha256_bytes(
        files["metadata-preflight.json"]
    ):
        raise ProjectionError("deployment handoff does not bind the preflight receipt")


def validate_request(request_bytes: bytes) -> tuple[dict[str, Any], dict[str, bytes]]:
    request = require_object(
        strict_json_bytes(request_bytes, "projection request", MAX_REQUEST_BYTES),
        "projection request",
    )
    require_exact_keys(request, REQUEST_KEYS, "projection request")
    if request["schema"] != REQUEST_SCHEMA:
        raise ProjectionError("projection request schema is unsupported")
    validate_axes(request)
    records = request["files"]
    if not isinstance(records, list) or len(records) != len(EXPECTED_FILES):
        raise ProjectionError("projection request file inventory is not closed")
    decoded: dict[str, bytes] = {}
    for record_value in records:
        record = require_object(record_value, "projection file record")
        require_exact_keys(record, FILE_KEYS, "projection file record")
        name = record["name"]
        if name not in EXPECTED_FILES or name in decoded:
            raise ProjectionError("projection file name is unexpected or duplicated")
        if not isinstance(record["size_bytes"], int) or isinstance(
            record["size_bytes"], bool
        ):
            raise ProjectionError(f"projection file size is malformed: {name}")
        if not isinstance(record["sha256"], str) or not HEX_64.fullmatch(
            record["sha256"]
        ):
            raise ProjectionError(f"projection file digest is malformed: {name}")
        content = decode_base64(
            record["content_base64"], name, EXPECTED_FILES[name]
        )
        if len(content) != record["size_bytes"] or sha256_bytes(content) != record[
            "sha256"
        ]:
            raise ProjectionError(f"projection file bytes do not match: {name}")
        decoded[name] = content
    if set(decoded) != set(EXPECTED_FILES):
        raise ProjectionError("projection file inventory is incomplete")
    validate_public_metadata(request, decoded)
    return request, decoded


def write_bytes_atomic(path: Path, value: bytes) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with tempfile.NamedTemporaryFile(dir=path.parent, delete=False) as handle:
        handle.write(value)
        temporary = Path(handle.name)
    os.replace(temporary, path)


def materialize(event_path: Path, output: Path, github_output: Path | None) -> None:
    event = require_object(
        strict_json_bytes(event_path.read_bytes().strip(), "GitHub event", 1_048_576),
        "GitHub event",
    )
    payload = require_object(event.get("client_payload"), "client payload")
    require_exact_keys(
        payload, {"schema", "request_sha256", "request_base64"}, "client payload"
    )
    if payload["schema"] != ENVELOPE_SCHEMA:
        raise ProjectionError("dispatch envelope schema is unsupported")
    compact_payload = json.dumps(
        payload, sort_keys=True, separators=(",", ":"), ensure_ascii=True
    ).encode("utf-8")
    if len(compact_payload) > MAX_DISPATCH_BYTES:
        raise ProjectionError("dispatch client payload exceeds GitHub's bound")
    if not isinstance(payload["request_sha256"], str) or not HEX_64.fullmatch(
        payload["request_sha256"]
    ):
        raise ProjectionError("dispatch request digest is malformed")
    request_bytes = decode_base64(
        payload["request_base64"], "projection request", MAX_REQUEST_BYTES
    )
    if sha256_bytes(request_bytes) != payload["request_sha256"]:
        raise ProjectionError("dispatch request digest does not match")
    request, files = validate_request(request_bytes)
    if output.exists():
        raise ProjectionError("projection materialization output already exists")
    output.mkdir(parents=True)
    write_bytes_atomic(output / "request.json", request_bytes)
    for name, value in files.items():
        write_bytes_atomic(output / "files" / name, value)
    if github_output is not None:
        lines = {
            "request_sha256": sha256_bytes(request_bytes),
            "release_tag": request["release_tag"],
            "source_revision": request["source_revision"],
            "source_tree": request["source_tree"],
            "product_channel": request["product_channel"],
            "version": request["version"],
            "maturity": request["maturity"],
            "distribution_track": request["distribution_track"],
            "fleet_signer_thumbprint": request["fleet_signer_thumbprint"],
            "hostess_signer_thumbprint": request["hostess_signer_thumbprint"],
            "descriptor_signer_spki_sha256": request[
                "descriptor_signer_spki_sha256"
            ],
        }
        with github_output.open("a", encoding="utf-8", newline="\n") as handle:
            for key, value in lines.items():
                handle.write(f"{key}={value}\n")


def file_inventory(root: Path) -> dict[str, str]:
    if not root.exists():
        return {}
    result: dict[str, str] = {}
    for path in sorted(root.rglob("*")):
        relative_path = path.relative_to(root)
        if relative_path.parts and relative_path.parts[0] in {".git", "_fleet-source"}:
            continue
        if path.is_symlink():
            raise ProjectionError(f"projection tree contains a symbolic link: {path}")
        if path.is_file():
            relative = relative_path.as_posix()
            result[relative] = sha256_bytes(path.read_bytes())
    return result


def tree_digest(inventory: dict[str, str]) -> str:
    encoded = json.dumps(
        inventory, sort_keys=True, separators=(",", ":"), ensure_ascii=True
    ).encode("utf-8")
    return sha256_bytes(encoded)


def git_output(site_root: Path, *args: str) -> bytes:
    try:
        result = subprocess.run(
            ["git", "-C", str(site_root), *args],
            check=True,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
        )
    except (OSError, subprocess.CalledProcessError) as exc:
        raise ProjectionError("central Git index cannot be verified") from exc
    return result.stdout


def nul_paths(value: bytes, label: str) -> set[str]:
    try:
        return {
            item.decode("utf-8")
            for item in value.split(b"\0")
            if item
        }
    except UnicodeDecodeError as exc:
        raise ProjectionError(f"{label} contains a non-UTF-8 path") from exc


def verify_staged_fleet(site_root: Path) -> None:
    fleet_root = site_root / "Rusty-Fleet"
    worktree_inventory = file_inventory(fleet_root)
    if not worktree_inventory:
        raise ProjectionError("Fleet projection worktree is empty")
    expected_paths = {f"Rusty-Fleet/{name}" for name in worktree_inventory}
    indexed_paths = nul_paths(
        git_output(site_root, "ls-files", "-z", "--", "Rusty-Fleet"),
        "Fleet Git index",
    )
    if indexed_paths != expected_paths:
        raise ProjectionError("Fleet Git index inventory is not exact")
    changed_paths = nul_paths(
        git_output(
            site_root,
            "diff",
            "--cached",
            "--name-only",
            "-z",
            "--",
            "Rusty-Fleet",
        ),
        "staged Fleet projection",
    )
    if not changed_paths.issubset(expected_paths):
        raise ProjectionError("staged Fleet projection inventory is not closed")
    for relative, expected_digest in worktree_inventory.items():
        path = f"Rusty-Fleet/{relative}"
        indexed = git_output(site_root, "cat-file", "blob", f":{path}")
        if sha256_bytes(indexed) != expected_digest:
            raise ProjectionError(f"Git staging changed projected bytes: {path}")


def project(
    request_path: Path,
    fleet_staging: Path,
    fleet_source_site: Path,
    site_root: Path,
    receipt: Path,
) -> None:
    request_bytes = request_path.read_bytes()
    request, files = validate_request(request_bytes)
    if not site_root.is_dir() or (site_root / ".git").exists() is False:
        raise ProjectionError("central site root is not an exact Git worktree")
    if not fleet_staging.is_dir():
        raise ProjectionError("Fleet Pages staging root is unavailable")
    if not fleet_source_site.is_dir():
        raise ProjectionError("exact Fleet source site is unavailable")
    source_site_inventory = file_inventory(fleet_source_site)
    if set(source_site_inventory) != {"index.html", "styles.css"}:
        raise ProjectionError("exact Fleet source site inventory is not closed")
    staging_inventory = file_inventory(fleet_staging)
    channel = request["product_channel"]
    expected_staging = {
        "index.html",
        "styles.css",
        *(f"Rusty-Fleet/metadata/{channel}/{name}" for name in PAGES_METADATA_FILES),
    }
    observed_target = {
        name
        for name in staging_inventory
        if not name.startswith("Rusty-Fleet/metadata/")
        or name.startswith(f"Rusty-Fleet/metadata/{channel}/")
    }
    if observed_target != expected_staging:
        raise ProjectionError("Fleet Pages staging inventory is not closed")
    for name in ("index.html", "styles.css"):
        if (fleet_staging / name).read_bytes() != (fleet_source_site / name).read_bytes():
            raise ProjectionError(f"Fleet staging changed exact source site bytes: {name}")
    for name in PAGES_METADATA_FILES:
        staged = fleet_staging / "Rusty-Fleet" / "metadata" / channel / name
        if staged.read_bytes() != files[name]:
            raise ProjectionError(f"Fleet staging changed dispatched metadata: {name}")

    central_fleet = site_root / "Rusty-Fleet"
    central_before = file_inventory(site_root)
    preserved_before = {
        name: digest
        for name, digest in central_before.items()
        if not name.startswith("Rusty-Fleet/")
        or name.startswith("Rusty-Fleet/metadata/")
        and not name.startswith(f"Rusty-Fleet/metadata/{channel}/")
    }

    temporary_root = site_root / f".fleet-pages-projection-{os.getpid()}"
    if temporary_root.exists():
        raise ProjectionError("temporary Fleet projection path already exists")
    staged_fleet = temporary_root / "Rusty-Fleet"
    try:
        staged_fleet.mkdir(parents=True)
        shutil.copy2(fleet_staging / "index.html", staged_fleet / "index.html")
        shutil.copy2(fleet_staging / "styles.css", staged_fleet / "styles.css")
        if central_fleet.exists():
            metadata_root = central_fleet / "metadata"
            if metadata_root.exists():
                for entry in metadata_root.iterdir():
                    if entry.name == channel:
                        continue
                    if entry.is_symlink():
                        raise ProjectionError("existing non-target metadata is a link")
                    destination = staged_fleet / "metadata" / entry.name
                    if entry.is_dir():
                        shutil.copytree(entry, destination, copy_function=shutil.copy2)
                    elif entry.is_file():
                        destination.parent.mkdir(parents=True, exist_ok=True)
                        shutil.copy2(entry, destination)
                    else:
                        raise ProjectionError("existing non-target metadata is irregular")
        target_metadata = staged_fleet / "metadata" / channel
        target_metadata.mkdir(parents=True, exist_ok=True)
        for name in PAGES_METADATA_FILES:
            write_bytes_atomic(target_metadata / name, files[name])
        file_inventory(staged_fleet)

        backup = temporary_root / "previous-Rusty-Fleet"
        if central_fleet.exists():
            os.replace(central_fleet, backup)
        os.replace(staged_fleet, central_fleet)
        if backup.exists():
            shutil.rmtree(backup)
    finally:
        if temporary_root.exists():
            shutil.rmtree(temporary_root)

    central_after = file_inventory(site_root)
    preserved_after = {
        name: digest
        for name, digest in central_after.items()
        if not name.startswith("Rusty-Fleet/")
        or name.startswith("Rusty-Fleet/metadata/")
        and not name.startswith(f"Rusty-Fleet/metadata/{channel}/")
    }
    if preserved_after != preserved_before:
        raise ProjectionError("central projection changed a non-target byte")
    target_inventory = {
        name: digest
        for name, digest in central_after.items()
        if name.startswith("Rusty-Fleet/")
        and not (
            name.startswith("Rusty-Fleet/metadata/")
            and not name.startswith(f"Rusty-Fleet/metadata/{channel}/")
        )
    }
    result = {
        "schema": RECEIPT_SCHEMA,
        "result": "pass",
        "publication_authorized": True,
        "target_repository": CENTRAL_REPOSITORY,
        "source_repository": FLEET_REPOSITORY,
        "source_run_id": request["source_run_id"],
        "version": request["version"],
        "product_channel": channel,
        "maturity": request["maturity"],
        "distribution_track": request["distribution_track"],
        "release_tag": request["release_tag"],
        "source_revision": request["source_revision"],
        "source_tree": request["source_tree"],
        "pages_path": f"Rusty-Fleet/metadata/{channel}",
        "pages_binary_count": 0,
        "projected_files": target_inventory,
        "preserved_file_count": len(preserved_after),
        "preserved_tree_sha256": tree_digest(preserved_after),
    }
    write_bytes_atomic(
        receipt,
        (json.dumps(result, indent=2, sort_keys=True) + "\n").encode("utf-8"),
    )


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    subparsers = parser.add_subparsers(dest="command", required=True)
    materialize_parser = subparsers.add_parser("materialize")
    materialize_parser.add_argument("--event", type=Path, required=True)
    materialize_parser.add_argument("--output", type=Path, required=True)
    materialize_parser.add_argument("--github-output", type=Path)
    project_parser = subparsers.add_parser("project")
    project_parser.add_argument("--request", type=Path, required=True)
    project_parser.add_argument("--fleet-staging", type=Path, required=True)
    project_parser.add_argument("--fleet-source-site", type=Path, required=True)
    project_parser.add_argument("--site-root", type=Path, required=True)
    project_parser.add_argument("--out-receipt", type=Path, required=True)
    verify_index_parser = subparsers.add_parser("verify-index")
    verify_index_parser.add_argument("--site-root", type=Path, required=True)
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    if args.command == "materialize":
        materialize(args.event, args.output, args.github_output)
    elif args.command == "project":
        project(
            args.request,
            args.fleet_staging,
            args.fleet_source_site,
            args.site_root,
            args.out_receipt,
        )
    else:
        verify_staged_fleet(args.site_root)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
