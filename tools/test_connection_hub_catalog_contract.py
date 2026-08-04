#!/usr/bin/env python3
"""Damage matrix for the active Rusty Connection Hub catalog contract."""

from __future__ import annotations

import copy
import hashlib
import json
import unittest
from pathlib import Path

import preflight_distribution_catalog as preflight
from connection_hub_catalog_contract import (
    AUXILIARY_ASSETS,
    INSTALLATION_IDENTITY,
    METADATA_ASSET,
    OWNER,
    REPOSITORY,
    ConnectionHubContractError,
    adapt_connection_hub,
    required_release_asset_names,
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

CATALOG_PATH = ROOT / "Rusty-Morphospace" / "catalog" / "catalog.json"
PUBLICATION_PATH = ROOT / "Rusty-Morphospace" / "catalog" / "publication.json"
EXPECTED_SECURITY_NOTICE = {
    "transport_classification": "trusted_lan_experimental",
    "confidentiality": "none",
    "production_eligible": False,
    "pairing_authenticates_but_does_not_encrypt": True,
    "listener_default": "stopped",
    "explicit_wearer_opt_in_required": True,
}
EXPECTED_COMPANION_ROUTES = [
    {
        "owner": "questionable-file-manager",
        "product_channel": "labs",
        "purpose": "quest-installation",
        "relationship": "distinct-product",
    },
    {
        "owner": "rusty-hostess",
        "product_channel": "labs",
        "purpose": "windows-control-companion",
        "relationship": "distinct-product",
    },
]
EXPECTED_PUBLISHED_RELEASE = {
    "tag": "connection-hub-v0.1.0-alpha.3",
    "version": "0.1.0-alpha.3",
    "source_revision": "90dee15aebbe150c074550c5510900b393191f28",
    "artifact_name": "rusty-connection-hub-0.1.0-alpha.3.apk",
    "artifact_url": (
        "https://github.com/MesmerPrism/rusty-quest/releases/download/"
        "connection-hub-v0.1.0-alpha.3/"
        "rusty-connection-hub-0.1.0-alpha.3.apk"
    ),
    "artifact_sha256": (
        "494e0996e99ac598d1f20c49ac4c7fd8a079dcf1e5329aa064cea076b04195bc"
    ),
    "bytes": 19711402,
    "installation_identity": INSTALLATION_IDENTITY,
}


def load(path: Path) -> dict:
    return json.loads(path.read_text(encoding="utf-8"))


def catalog_bytes(value: dict) -> bytes:
    return (json.dumps(value, indent=2, ensure_ascii=True) + "\n").encode("utf-8")


def legacy_five_owner_hash(catalog: dict) -> str:
    legacy = copy.deepcopy(catalog)
    legacy["products"] = [
        product for product in legacy["products"] if product.get("owner") != OWNER
    ]
    return hashlib.sha256(catalog_bytes(legacy)).hexdigest()


def validate_checked_in_catalog_state(raw_catalog: bytes, publication: dict) -> None:
    catalog = json.loads(raw_catalog.decode("utf-8"))
    if catalog.get("schema") != "rusty.morphospace.public_distribution_catalog.v2":
        raise ValueError("catalog schema differs")
    products = catalog.get("products")
    if not isinstance(products, list) or len(products) != len(preflight.OWNERS):
        raise ValueError("catalog product set is incomplete")
    owners = [product.get("owner") for product in products]
    if len(set(owners)) != len(owners) or set(owners) != set(preflight.OWNERS):
        raise ValueError("catalog owner set differs")

    hubs = [product for product in products if product.get("owner") == OWNER]
    if len(hubs) != 1:
        raise ValueError("Connection Hub owner is not unique")
    hub = hubs[0]
    channels = hub.get("product_channels")
    if not isinstance(channels, list) or len(channels) != 1:
        raise ValueError("Connection Hub channel set differs")
    channel = channels[0]
    expected_channel = {
        "product_channel": "labs",
        "maturity": "alpha",
        "distribution_track": "github-prerelease",
        "opt_in": True,
        "identity": {
            "platform": "android",
            "installation_identity": INSTALLATION_IDENTITY,
            "identity_authority": "owner-release-metadata",
            "relationship_to_stable": "labs-only",
        },
        "transition": "remove-labs",
    }
    for key, expected in expected_channel.items():
        if channel.get(key) != expected:
            raise ValueError(f"Connection Hub channel field differs: {key}")
    if hub.get("security_notice") != EXPECTED_SECURITY_NOTICE:
        raise ValueError("Connection Hub security notice differs")
    if hub.get("companion_routes") != EXPECTED_COMPANION_ROUTES:
        raise ValueError("Connection Hub companion routes differ")
    authority_exclusions = hub.get("distribution_notes", {}).get(
        "authority_exclusions"
    )
    if not isinstance(authority_exclusions, list) or (
        "standalone guided installer" not in authority_exclusions
    ):
        raise ValueError("Connection Hub no-installer boundary differs")

    publication_keys = {
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
    if set(publication) != publication_keys:
        raise ValueError("publication fields differ")
    if publication.get("schema") != (
        "rusty.morphospace.catalog_publication_authorization.v1"
    ):
        raise ValueError("publication schema differs")
    if (
        publication.get("result") != "authorized"
        or publication.get("publication_authorized") is not True
        or publication.get("publication_target")
        != "/Rusty-Morphospace/catalog/catalog.json"
        or publication.get("pages_build_request_mode")
        != "post-commit-github-api"
    ):
        raise ValueError("publication authority differs")
    source = publication.get("source_preflight")
    if not isinstance(source, dict) or set(source) != source_keys:
        raise ValueError("publication source preflight is missing")
    run_id = source.get("workflow_run_id")
    if (
        source.get("repository") != "MesmerPrism/MesmerPrism.github.io"
        or isinstance(run_id, bool)
        or not isinstance(run_id, int)
        or run_id < 1
        or source.get("workflow_url")
        != (
            "https://github.com/MesmerPrism/MesmerPrism.github.io/"
            f"actions/runs/{run_id}"
        )
        or source.get("artifact_name")
        != f"distribution-catalog-readonly-preflight-{run_id}"
    ):
        raise ValueError("publication source identity differs")

    availability = channel.get("availability")
    if availability == "unpublished":
        if channel.get("release") is not None:
            raise ValueError("inert Connection Hub channel has a release")
        if (
            publication.get("projection") != "complete-five-owner-labs-set"
            or source.get("record_count") != 5
            or source.get("published_catalog_sha256")
            != legacy_five_owner_hash(catalog)
        ):
            raise ValueError("inert channel lacks prior five-owner authority")
        return
    if availability != "published":
        raise ValueError("Connection Hub availability is outside its lifecycle")

    if channel.get("release") != EXPECTED_PUBLISHED_RELEASE:
        raise ValueError("published Connection Hub release differs")
    if publication.get("projection") != "complete-six-owner-labs-set":
        raise ValueError("published channel lacks six-owner authority")
    if (
        source.get("record_count") != len(preflight.OWNERS)
        or source.get("complete_labs_owner_set") is not True
        or source.get("owner_binary_downloaded") is not False
        or source.get("read_only_preflight_publication_authorized") is not False
        or source.get("read_only_preflight_pages_deployment_invoked") is not False
    ):
        raise ValueError("six-owner preflight boundary differs")
    actual_hash = hashlib.sha256(raw_catalog).hexdigest()
    if source.get("published_catalog_sha256") != actual_hash:
        raise ValueError("publication does not hash-bind the catalog")
    for product in products:
        labs = [
            item
            for item in product.get("product_channels", [])
            if item.get("product_channel") == "labs"
        ]
        if len(labs) != 1 or labs[0].get("availability") != "published":
            raise ValueError("complete six-owner Labs set is not published")


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
        {
            "id": 103,
            "name": "LICENSE",
            "size": 34523,
            "digest": "sha256:" + "7" * 64,
            "state": "uploaded",
            "browser_download_url": f"{repository}/releases/download/{TAG}/LICENSE",
        },
        {
            "id": 104,
            "name": "SOURCE-NOTICE.md",
            "size": 1122,
            "digest": "sha256:" + "5" * 64,
            "state": "uploaded",
            "browser_download_url": (
                f"{repository}/releases/download/{TAG}/SOURCE-NOTICE.md"
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
            required_release_asset_names(TAG),
            {
                METADATA_ASSET,
                f"rusty-connection-hub-{VERSION}.apk",
                *AUXILIARY_ASSETS,
            },
        )
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

    def test_release_inventory_is_closed_and_stable(self) -> None:
        def remove_asset(value: dict, name: str) -> None:
            value["release"]["assets"] = [
                asset
                for asset in value["release"]["assets"]
                if asset["name"] != name
            ]

        def unexpected_asset(name: str, asset_id: int) -> dict:
            return {
                "id": asset_id,
                "name": name,
                "size": 42,
                "digest": "sha256:" + "9" * 64,
                "state": "uploaded",
                "browser_download_url": (
                    f"https://github.com/{REPOSITORY}/releases/download/"
                    f"{TAG}/{name}"
                ),
            }

        inventory_damage = {
            "extra asset": lambda value: value["release"]["assets"].append(
                unexpected_asset("README.txt", 105)
            ),
            "missing owner manifest": lambda value: remove_asset(
                value, METADATA_ASSET
            ),
            "missing primary APK": lambda value: remove_asset(
                value, f"rusty-connection-hub-{VERSION}.apk"
            ),
            "missing LICENSE": lambda value: remove_asset(value, "LICENSE"),
            "missing SOURCE-NOTICE": lambda value: remove_asset(
                value, "SOURCE-NOTICE.md"
            ),
            "duplicate name": lambda value: value["release"]["assets"].append(
                {
                    **copy.deepcopy(value["release"]["assets"][0]),
                    "id": 105,
                }
            ),
            "duplicate ID": lambda value: value["release"]["assets"][1].update(
                {"id": value["release"]["assets"][0]["id"]}
            ),
            "wrong-name substitution": lambda value: (
                value["release"]["assets"][1].update(
                    unexpected_asset("rusty-connection-hub-other.apk", 102)
                )
            ),
        }
        for label, mutate in inventory_damage.items():
            with self.subTest(label=label):
                candidate = release_snapshot()
                mutate(candidate)
                with self.assertRaises(preflight.PreflightError):
                    preflight.normalized_snapshot(OWNER, TAG, candidate)

        initial = release_snapshot()
        final = release_snapshot()
        final["release"]["assets"][1]["size"] += 1
        with self.assertRaises(preflight.PreflightError):
            preflight.assert_same_run_stability(OWNER, TAG, initial, final)

    def test_contract_is_active_across_the_authorized_catalog_lifecycle(self) -> None:
        self.assertIn(OWNER, preflight.OWNERS)
        self.assertIs(preflight.ADAPTERS["connection-hub"], adapt_connection_hub)
        active = preflight.OWNERS[OWNER]
        self.assertEqual(active["repository"], REPOSITORY)
        self.assertIsNotNone(active["metadata_name"].fullmatch(METADATA_ASSET))

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
        self.assertEqual(preflight.validate_request(request)[0]["owner"], OWNER)

        raw_catalog = CATALOG_PATH.read_bytes()
        catalog = json.loads(raw_catalog.decode("utf-8"))
        self.assertEqual(len(catalog["products"]), 6)
        hub = next(item for item in catalog["products"] if item["owner"] == OWNER)
        self.assertEqual(hub["security_notice"]["confidentiality"], "none")
        self.assertFalse(hub["security_notice"]["production_eligible"])
        self.assertEqual(
            [route["owner"] for route in hub["companion_routes"]],
            ["questionable-file-manager", "rusty-hostess"],
        )
        catalog_schema = load(
            ROOT / "Rusty-Morphospace" / "catalog" / "catalog.schema.json"
        )
        products = catalog_schema["properties"]["products"]
        owner_enum = catalog_schema["$defs"]["product"]["properties"]["owner"][
            "enum"
        ]
        self.assertEqual((products["minItems"], products["maxItems"]), (6, 6))
        self.assertIn(OWNER, owner_enum)
        browser = (
            ROOT / "Rusty-Morphospace" / "catalog" / "catalog.js"
        ).read_text(encoding="utf-8")
        self.assertIn(OWNER, browser)
        self.assertIn("Pairing authenticates a controller", browser)
        publication = load(PUBLICATION_PATH)
        validate_checked_in_catalog_state(raw_catalog, publication)

        inert = copy.deepcopy(catalog)
        inert_hub = next(item for item in inert["products"] if item["owner"] == OWNER)
        inert_hub["product_channels"][0]["availability"] = "unpublished"
        inert_hub["product_channels"][0]["release"] = None
        prior_publication = copy.deepcopy(publication)
        prior_publication["projection"] = "complete-five-owner-labs-set"
        prior_publication["source_preflight"]["record_count"] = 5
        prior_publication["source_preflight"]["published_catalog_sha256"] = (
            legacy_five_owner_hash(inert)
        )
        validate_checked_in_catalog_state(
            catalog_bytes(inert), prior_publication
        )

    def test_published_catalog_authority_damage_matrix_rejects(self) -> None:
        catalog = load(CATALOG_PATH)
        publication = load(PUBLICATION_PATH)

        def bind(candidate: dict, authority: dict) -> None:
            authority["source_preflight"]["published_catalog_sha256"] = (
                hashlib.sha256(catalog_bytes(candidate)).hexdigest()
            )

        damages: list[tuple[str, dict, dict]] = []

        unauthorized = copy.deepcopy(publication)
        unauthorized["publication_authorized"] = False
        damages.append(("published without authorization", catalog, unauthorized))

        publication_drift = copy.deepcopy(publication)
        publication_drift["projection"] = "complete-five-owner-labs-set"
        damages.append(("publication drift", catalog, publication_drift))

        catalog_drift = copy.deepcopy(catalog)
        catalog_drift["schema"] = "other"
        catalog_drift_authority = copy.deepcopy(publication)
        bind(catalog_drift, catalog_drift_authority)
        damages.append(("catalog drift", catalog_drift, catalog_drift_authority))

        hash_drift = copy.deepcopy(catalog)
        hash_drift["products"][0]["name"] += " drift"
        damages.append(("catalog hash drift", hash_drift, publication))

        authorization_hash_drift = copy.deepcopy(publication)
        authorization_hash_drift["source_preflight"]["published_catalog_sha256"] = (
            "0" * 64
        )
        damages.append(
            ("publication hash drift", catalog, authorization_hash_drift)
        )

        owner_drift = copy.deepcopy(catalog)
        owner_drift["products"][0]["owner"] = "other-owner"
        owner_drift_authority = copy.deepcopy(publication)
        bind(owner_drift, owner_drift_authority)
        damages.append(("owner drift", owner_drift, owner_drift_authority))

        partial = copy.deepcopy(catalog)
        partial["products"].pop()
        partial_authority = copy.deepcopy(publication)
        bind(partial, partial_authority)
        damages.append(("partial owner set", partial, partial_authority))

        security_drift = copy.deepcopy(catalog)
        security_hub = next(
            item for item in security_drift["products"] if item["owner"] == OWNER
        )
        security_hub["security_notice"]["confidentiality"] = "tls"
        security_authority = copy.deepcopy(publication)
        bind(security_drift, security_authority)
        damages.append(
            ("Connection Hub security drift", security_drift, security_authority)
        )

        release_drift = copy.deepcopy(catalog)
        release_hub = next(
            item for item in release_drift["products"] if item["owner"] == OWNER
        )
        release_hub["product_channels"][0]["release"]["artifact_sha256"] = (
            "9" * 64
        )
        release_authority = copy.deepcopy(publication)
        bind(release_drift, release_authority)
        damages.append(
            ("Connection Hub release drift", release_drift, release_authority)
        )

        alternate = copy.deepcopy(catalog)
        alternate_hub = next(
            item for item in alternate["products"] if item["owner"] == OWNER
        )
        alternate_hub["product_channels"][0]["availability"] = "withdrawn"
        alternate_authority = copy.deepcopy(publication)
        bind(alternate, alternate_authority)
        damages.append(("alternate availability", alternate, alternate_authority))

        for label, damaged_catalog, damaged_publication in damages:
            with self.subTest(label=label):
                with self.assertRaises(ValueError):
                    validate_checked_in_catalog_state(
                        catalog_bytes(damaged_catalog), damaged_publication
                    )


if __name__ == "__main__":
    unittest.main()
