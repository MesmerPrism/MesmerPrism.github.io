#!/usr/bin/env python3
"""Dormant fail-closed admission contract for Rusty Connection Hub releases."""

from __future__ import annotations

import json
import re
from pathlib import Path
from typing import Any

from jsonschema import Draft202012Validator


ROOT = Path(__file__).resolve().parents[1]
SCHEMA_PATH = (
    ROOT
    / "Rusty-Morphospace"
    / "catalog"
    / "connection-hub-owner-release-admission.schema.json"
)
OWNER = "rusty-connection-hub"
REPOSITORY = "MesmerPrism/rusty-quest"
METADATA_ASSET = "connection-hub-release-manifest.json"
INSTALLATION_IDENTITY = "io.github.mesmerprism.rustymanifold.broker"
TAG = re.compile(r"^connection-hub-v(0\.1\.0-alpha\.([1-9]\d*))$")

SCHEMA = json.loads(SCHEMA_PATH.read_text(encoding="utf-8"))
Draft202012Validator.check_schema(SCHEMA)
SCHEMA_VALIDATOR = Draft202012Validator(SCHEMA)


class ConnectionHubContractError(ValueError):
    """Fail-closed rejection of a dormant Connection Hub owner manifest."""


def fail(message: str) -> None:
    raise ConnectionHubContractError(message)


def tag_version(tag: str) -> str:
    if not isinstance(tag, str):
        fail("Connection Hub tag is not a string")
    match = TAG.fullmatch(tag)
    if match is None:
        fail("Connection Hub tag is outside connection-hub-v0.1.0-alpha.N")
    return match.group(1)


def adapt_connection_hub(metadata: Any, tag: str) -> dict[str, Any]:
    """Validate owner bytes and project only the generic catalog asset facts."""

    errors = sorted(
        SCHEMA_VALIDATOR.iter_errors(metadata),
        key=lambda error: tuple(str(item) for item in error.absolute_path),
    )
    if errors:
        fail(
            "Connection Hub owner metadata failed schema admission: "
            f"{errors[0].message}"
        )
    assert isinstance(metadata, dict)
    version = tag_version(tag)
    source_revision = metadata["source_revision"]
    if (
        metadata["release_tag"] != tag
        or metadata["version_name"] != version
        or metadata["artifact_name"] != f"rusty-connection-hub-{version}.apk"
        or metadata["source_url"]
        != (
            "https://github.com/MesmerPrism/rusty-quest/tree/"
            f"{source_revision}/apps/manifold-broker-android"
        )
    ):
        fail("Connection Hub owner metadata does not bind its exact tag and source")
    return {
        "name": metadata["artifact_name"],
        "sha256": metadata["artifact_sha256"],
        "bytes": metadata["artifact_size"],
        "installation_identity": INSTALLATION_IDENTITY,
        "source_revision": source_revision,
        "source_tree": metadata["source_tree"],
    }
