#!/usr/bin/env python3
"""Damage matrix for the dormant Rusty Connection Hub catalog contract."""

from __future__ import annotations

import copy
import json
import unittest
from pathlib import Path
from unittest.mock import patch

import preflight_distribution_catalog as preflight
from connection_hub_catalog_contract import (
    INSTALLATION_IDENTITY,
    METADATA_ASSET,
    OWNER,
    REPOSITORY,
    ConnectionHubContractError,
    adapt_connection_hub,
    tag_version,
)


ROOT = Path(__file__).resolve().parents[1]
FIXTURE_ROOT = ROOT / "tools" / "fixtures" / "distribution-catalog"
VALID_FIXTURE = FIXTURE_ROOT / "connection-hub-owner-release.valid.json"
DAMAGED_FIXTURE = (
    FIXTURE_ROOT / "connection-hub-owner-release.confidentiality-drift.json"
)
TAG = "connection-hub-v0.1.0-alpha.1"
VERSION = "0.1.0-alpha.1"


def load(path: Path) -> dict:
    return json.loads(path.read_text(encoding="utf-8"))


def release_snapshot() -> dict:
    repository = f"https://github.com/{REPOSITORY}"
    assets = [
        {
            "id": 101,
            "name": METADATA_ASSET,
            "size": VALID_FIXTURE.stat().st_size,
            "digest": "sha256:" + "8" * 64,
            "state": "uploaded",
            "browser_download_url": (
                f"{repository}/releases/download/{TAG}/{METADATA_ASSET}"
            ),
        },
        {
            "id": 102,
            "name": f"rusty-connection-hub-{VERSION}.apk",
            "size": 123456,
            "digest": "sha256:" + "6" * 64,
            "state": "uploaded",
            "browser_download_url": (
                f"{repository}/releases/download/{TAG}/"
                f"rusty-connection-hub-{VERSION}.apk"
            ),
        },
    ]
    return {
        "release": {
            "id": 100,
            "tag_name": TAG,
            "draft": False,
            "prerelease": True,
            "assets": assets,
        },
        "tag_chain": [{"type": "commit", "sha": "1" * 40}],
        "commit_tree": "2" * 40,
        "latest_tag": "package-updater-v0.1.0-alpha.3",
    }


class ConnectionHubCatalogContractTest(unittest.TestCase):
    def test_valid_owner_manifest_projects_only_generic_asset_facts(self) -> None:
        manifest = load(VALID_FIXTURE)
        self.assertEqual(tag_version(TAG), VERSION)
        self.assertEqual(
            adapt_connection_hub(manifest, TAG),
            {
                "name": f"rusty-connection-hub-{VERSION}.apk",
                "sha256": "6" * 64,
                "bytes": 123456,
                "installation_identity": INSTALLATION_IDENTITY,
                "source_revision": "1" * 40,
                "source_tree": "2" * 40,
            },
        )

    def test_security_and_exact_binding_damage_matrix_rejects(self) -> None:
        valid = load(VALID_FIXTURE)
        mutations = {
            "unknown field": lambda value: value.update({"endpoint": "ws://lan"}),
            "wrong owner schema": lambda value: value.update({"$schema": "other"}),
            "wrong product": lambda value: value.update({"product": "Broker"}),
            "stable channel": lambda value: value.update({"channel": "stable"}),
            "released maturity": lambda value: value.update(
                {"maturity": "released"}
            ),
            "missing signer": lambda value: value.pop("signer_sha256"),
            "boolean version code": lambda value: value.update(
                {"version_code": True}
            ),
            "package substitution": lambda value: value.update(
                {"package_name": "io.example.other"}
            ),
            "tag substitution": lambda value: value.update(
                {"release_tag": "connection-hub-v0.1.0-alpha.2"}
            ),
            "version substitution": lambda value: value.update(
                {"version_name": "0.1.0-alpha.2"}
            ),
            "source URL substitution": lambda value: value.update(
                {"source_url": "https://github.com/MesmerPrism/rusty-quest"}
            ),
            "artifact substitution": lambda value: value.update(
                {"artifact_name": "other.apk"}
            ),
            "debug operator present": lambda value: value.update(
                {"release_manifest_debug_operator_absent": False}
            ),
            "listener starts by default": lambda value: value.update(
                {"listener_default": "started"}
            ),
            "transport relabel": lambda value: value.update(
                {"transport_classification": "secure_lan"}
            ),
            "confidentiality relabel": lambda value: value.update(
                {"confidentiality": "tls"}
            ),
            "production claim": lambda value: value.update(
                {"production_eligible": True}
            ),
            "implicit insecure LAN": lambda value: value.update(
                {"insecure_trusted_lan_requires_explicit_opt_in": False}
            ),
            "arbitrary commands": lambda value: value.update(
                {"arbitrary_remote_commands": True}
            ),
            "high-rate data plane": lambda value: value.update(
                {"high_rate_media_data_plane": True}
            ),
            "zero artifact": lambda value: value.update({"artifact_size": 0}),
            "uppercase digest": lambda value: value.update(
                {"artifact_sha256": "A" * 64}
            ),
            "uppercase source": lambda value: value.update(
                {"source_revision": "A" * 40}
            ),
            "invalid build binding": lambda value: value.update(
                {"build_manifest_sha256": "invalid"}
            ),
        }
        for label, mutate in mutations.items():
            with self.subTest(label=label):
                candidate = copy.deepcopy(valid)
                mutate(candidate)
                with self.assertRaises(ConnectionHubContractError):
                    adapt_connection_hub(candidate, TAG)

        with self.assertRaises(ConnectionHubContractError):
            adapt_connection_hub(load(DAMAGED_FIXTURE), TAG)

    def test_tag_grammar_is_connection_hub_alpha_only(self) -> None:
        for damaged in (
            "v0.1.0-alpha.1",
            "connection-hub-v0.1.0",
            "connection-hub-v0.1.0-alpha.0",
            "connection-hub-v0.1.0-alpha.01",
            "connection-hub-v0.2.0-alpha.1",
            "package-updater-v0.1.0-alpha.1",
        ):
            with self.subTest(tag=damaged):
                with self.assertRaises(ConnectionHubContractError):
                    tag_version(damaged)

    def test_generic_readback_requires_immutable_nonlatest_prerelease(self) -> None:
        registry = copy.deepcopy(preflight.DORMANT_OWNER_CONTRACTS[OWNER])
        registry.pop("activation")
        with patch.dict(preflight.OWNERS, {OWNER: registry}, clear=False):
            accepted = preflight.normalized_snapshot(OWNER, TAG, release_snapshot())
            self.assertTrue(accepted["release"]["prerelease"])
            self.assertEqual(accepted["latest_tag"], "package-updater-v0.1.0-alpha.3")

            for label, mutate in {
                "draft": lambda value: value["release"].update({"draft": True}),
                "not prerelease": lambda value: value["release"].update(
                    {"prerelease": False}
                ),
                "became latest": lambda value: value.update({"latest_tag": TAG}),
                "mutable URL": lambda value: value["release"]["assets"][1].update(
                    {
                        "browser_download_url": (
                            f"https://github.com/{REPOSITORY}/releases/latest/download/"
                            f"rusty-connection-hub-{VERSION}.apk"
                        )
                    }
                ),
                "missing digest": lambda value: value["release"]["assets"][1].update(
                    {"digest": None}
                ),
            }.items():
                with self.subTest(label=label):
                    candidate = release_snapshot()
                    mutate(candidate)
                    with self.assertRaises(preflight.PreflightError):
                        preflight.normalized_snapshot(OWNER, TAG, candidate)

    def test_contract_is_dormant_and_current_projection_is_unchanged(self) -> None:
        self.assertNotIn(OWNER, preflight.OWNERS)
        self.assertIn(OWNER, preflight.DORMANT_OWNER_CONTRACTS)
        self.assertIs(preflight.ADAPTERS["connection-hub"], adapt_connection_hub)
        dormant = preflight.DORMANT_OWNER_CONTRACTS[OWNER]
        self.assertEqual(dormant["repository"], REPOSITORY)
        self.assertEqual(
            dormant["activation"], "requires-external-validation-authority"
        )
        self.assertIsNotNone(dormant["metadata_name"].fullmatch(METADATA_ASSET))

        request = {
            "schema": "rusty.morphospace.catalog_preflight_request.v1",
            "records": [
                {
                    "owner": OWNER,
                    "product_channel": "labs",
                    "maturity": "alpha",
                    "distribution_track": "github-prerelease",
                    "tag": TAG,
                    "expected_source_revision": "1" * 40,
                    "expected_owner_metadata_asset": METADATA_ASSET,
                    "expected_owner_metadata_sha256": "8" * 64,
                }
            ],
        }
        with self.assertRaises(preflight.PreflightError):
            preflight.validate_request(request)

        catalog = load(ROOT / "Rusty-Morphospace" / "catalog" / "catalog.json")
        self.assertEqual(len(catalog["products"]), 5)
        self.assertNotIn(OWNER, {item["owner"] for item in catalog["products"]})
        catalog_schema = load(
            ROOT / "Rusty-Morphospace" / "catalog" / "catalog.schema.json"
        )
        products = catalog_schema["properties"]["products"]
        owner_enum = catalog_schema["$defs"]["product"]["properties"]["owner"][
            "enum"
        ]
        self.assertEqual((products["minItems"], products["maxItems"]), (5, 5))
        self.assertNotIn(OWNER, owner_enum)
        browser = (
            ROOT / "Rusty-Morphospace" / "catalog" / "catalog.js"
        ).read_text(encoding="utf-8")
        self.assertNotIn(OWNER, browser)
        publication = load(
            ROOT / "Rusty-Morphospace" / "catalog" / "publication.json"
        )
        self.assertEqual(publication["projection"], "complete-five-owner-labs-set")
        self.assertEqual(publication["source_preflight"]["record_count"], 5)


if __name__ == "__main__":
    unittest.main()
