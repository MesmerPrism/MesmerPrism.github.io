#!/usr/bin/env python3
"""Offline damage matrix for the read-only owner-release preflight."""

from __future__ import annotations

import base64
import copy
import json
import unittest
from pathlib import Path

from preflight_distribution_catalog import (
    CATALOG_PATH,
    OWNERS,
    PreflightError,
    canonical_asset_url,
    canonical_json_bytes,
    run_preflight,
    sha256_bytes,
    strict_json_bytes,
    validate_request,
)
from test_connection_hub_catalog_contract import ConnectionHubCatalogContractTest


SOURCE = "1" * 40
TREE = "2" * 40
PRIMARY_HASH = "3" * 64
SIGNER_HASH = "4" * 64
FLEET_SIGNER_THUMBPRINT = "A" * 40
PRIMARY_BYTES = 1234
HELPER_HASH = "5" * 64
LICENSE_HASH = "6" * 64
SOURCE_TEXT_HASH = "7" * 64
ACTIVATION_REQUEST = (
    Path(__file__).resolve().parent
    / "fixtures"
    / "distribution-catalog"
    / "connection-hub-six-owner-activation-request.json"
)


def fail(message: str) -> None:
    raise AssertionError(message)


def exact_fleet_metadata(tag: str) -> dict:
    return {
        "schema": "rusty.fleet.windows_release_descriptor_receipt.v5",
        "result": "pass",
        "descriptor_id": "v1.2.3-labs-owner-test",
        "version": "1.2.3",
        "product_channel": "labs",
        "maturity": "alpha",
        "channel": "labs",
        "distribution_track": "github-prerelease",
        "release_tag": tag,
        "installation_identity": "rusty-fleet-labs",
        "primary_artifact": {
            "role": "complete-product",
            "name": "RustyFleet-Labs-Setup.exe",
            "sha256": PRIMARY_HASH,
            "bytes": PRIMARY_BYTES,
            "url": canonical_asset_url(
                OWNERS["rusty-fleet"]["repository"],
                tag,
                "RustyFleet-Labs-Setup.exe",
            ),
        },
        "issued_at_ms": 1800000000000,
        "expires_at_ms": 1800003600000,
        "validity_duration_ms": 3600000,
        "setup_sha256": PRIMARY_HASH,
        "setup_size_bytes": PRIMARY_BYTES,
        "setup_signer_certificate_sha256": SIGNER_HASH,
        "setup_signer_subject": "CN=MesmerPrism",
        "setup_signer_thumbprint": FLEET_SIGNER_THUMBPRINT,
        "setup_signer_self_issued": True,
        "authenticode_trust_mode":
            "exact-pinned-self-issued-untrusted-root-only",
        "public_trust_claim": False,
        "timestamp_required": True,
        "setup_build_receipt_sha256": "5" * 64,
        "source_revision": SOURCE,
        "source_tree": TREE,
        "canonical_pe_payload_sha256": "6" * 64,
        "canonical_pe_payload_size_bytes": 1200,
        "descriptor_signer_spki_sha256": "7" * 64,
        "descriptor_signer_spki_asset": "release-descriptor.spki.der",
        "payload_sha256": "8" * 64,
        "descriptor_sha256": "9" * 64,
        "canonical_payload": "rfc8785_jcs_closed_shape",
        "signature": "rsa_pss_sha256",
        "pages_path": "Rusty-Fleet/metadata/labs/release.json",
        "asset_url": canonical_asset_url(
            OWNERS["rusty-fleet"]["repository"],
            tag,
            "RustyFleet-Labs-Setup.exe",
        ),
    }


def exact_kiosk_manifest(tag: str) -> dict:
    return {
        "schema": "meta.quest.file_manager.rusty_kiosk_bundle.v2",
        "build_type": "release",
        "product_channel": "labs",
        "maturity": "alpha",
        "distribution_track": "github-prerelease",
        "prerelease": True,
        "tag": tag,
        "version": "1.2.3-alpha.4",
        "version_code": 1020304,
        "identity_mode": "separate-coinstallable",
        "exit_policy": "uninstall-labs-without-changing-stable",
        "source_url": "https://github.com/MesmerPrism/Rusty-Kiosk",
        "source_revision": SOURCE,
        "source_tree": TREE,
        "signer_sha256": SIGNER_HASH,
        "files": [
            {
                "name": "rusty-kiosk.apk",
                "package_name": "io.github.mesmerprism.rustykiosk.labs",
                "version_name": "1.2.3-alpha.4",
                "version_code": 1020304,
                "sha256": PRIMARY_HASH,
                "bytes": PRIMARY_BYTES,
            },
            {
                "name": "rusty-kiosk-setup-helper.apk",
                "package_name":
                    "io.github.mesmerprism.rustykiosk.setuphelper.labs",
                "version_name": "1.2.3-alpha.4",
                "version_code": 1020304,
                "sha256": HELPER_HASH,
                "bytes": 2345,
            },
            {
                "name": "RUSTY-KIOSK-LICENSE.txt",
                "sha256": LICENSE_HASH,
                "bytes": 3456,
            },
            {
                "name": "RUSTY-KIOSK-SOURCE.txt",
                "sha256": SOURCE_TEXT_HASH,
                "bytes": 4567,
            },
        ],
    }


def exact_metadata(owner: str, tag: str) -> tuple[dict, str]:
    if owner == "questionable-file-manager":
        return (
            {
                "schema": "questionable-file-manager.owner-release.v2",
                "product_channel": "labs",
                "maturity": "alpha",
                "distribution_track": "github-prerelease",
                "release": {
                    "tag": tag,
                    "version": "1.2.3-alpha.4",
                    "windows_package_version": "1.2.3.4",
                },
                "source": {"revision": SOURCE, "tree": TREE},
                "installation": {
                    "package_identity":
                        "MesmerPrism.QuestIonAbleFileManager.Labs"
                },
                "primary_windows_setup": {
                    "name": "QuestIonAbleFileManager-Labs-Setup.exe",
                    "sha256": PRIMARY_HASH,
                    "bytes": PRIMARY_BYTES,
                },
                "validation_evidence": {
                    "name": "release-validation.json",
                    "schema": "questionable-file-manager.release-validation.v2",
                },
            },
            "QuestIonAbleFileManager-Labs-Setup.exe",
        )
    if owner == "rusty-fleet":
        return exact_fleet_metadata(tag), "RustyFleet-Labs-Setup.exe"
    if owner == "rusty-hostess":
        return (
            {
                "schema":
                    "rusty.hostess.windows_labs_release_metadata.v2",
                "repository": "MesmerPrism/rusty-hostess",
                "product": "rusty-hostess-labs",
                "product_channel": "labs",
                "maturity": "alpha",
                "distribution_track": "github-prerelease",
                "prerelease": True,
                "version": "1.2.3",
                "tag": tag,
                "source": {"revision": SOURCE, "tree": TREE},
                "installation_identity": "rusty-hostess-labs",
                "primary_artifact": {
                    "role": "complete-product",
                    "name": "RustyHostess-Labs-1.2.3-win-x64.zip",
                    "sha256": PRIMARY_HASH,
                    "bytes": PRIMARY_BYTES,
                },
            },
            "RustyHostess-Labs-1.2.3-win-x64.zip",
        )
    if owner == "rusty-kiosk":
        manifest_bytes = canonical_json_bytes(exact_kiosk_manifest(tag))
        return (
            {
                "schema": "rusty.kiosk.labs_release_owner_metadata.v2",
                "repository": "MesmerPrism/Rusty-Kiosk",
                "product": "rusty-kiosk-labs",
                "product_channel": "labs",
                "maturity": "alpha",
                "distribution_track": "github-prerelease",
                "prerelease": True,
                "tag": tag,
                "version": "1.2.3-alpha.4",
                "source_revision": SOURCE,
                "source_tree": TREE,
                "installation_identity":
                    "io.github.mesmerprism.rustykiosk.labs",
                "coinstallable_lineage": {
                    "identity_mode": "separate-coinstallable",
                    "package_name": "io.github.mesmerprism.rustykiosk.labs",
                    "signer_sha256": SIGNER_HASH,
                    "version_name": "1.2.3-alpha.4",
                    "version_code": 1020304,
                    "exit_policy": "uninstall-labs-without-changing-stable",
                },
                "bundle_manifest": {
                    "schema":
                        "meta.quest.file_manager.rusty_kiosk_bundle.v2",
                    "name": "bundle-manifest.json",
                    "sha256": sha256_bytes(manifest_bytes),
                    "bytes": len(manifest_bytes),
                },
                "primary_artifact": {
                    "role": "complete-product",
                    "name": "rusty-kiosk.apk",
                    "sha256": PRIMARY_HASH,
                    "bytes": PRIMARY_BYTES,
                },
            },
            "rusty-kiosk.apk",
        )
    if owner == "rusty-quest-package-updater":
        return (
            {
                "schema": "rusty.quest.package_updater_product_release.v2",
                "product": "rusty-quest-package-updater-labs",
                "release_tag": tag,
                "release_version": "0.1.0-alpha.7",
                "source_revision": SOURCE,
                "source_tree": TREE,
                "product_channel": "labs",
                "maturity": "alpha",
                "distribution_track": "github-prerelease",
                "installation_identity":
                    "io.github.mesmerprism.rustyquest.packageupdater.labs",
                "apk_version_name": "0.1.0-alpha.7",
                "apk_version_code": 7,
                "updater_signer_sha256": f"sha256:{SIGNER_HASH}",
                "primary_apk": {
                    "name": "rusty-quest-package-updater.apk",
                    "sha256": f"sha256:{PRIMARY_HASH}",
                    "bytes": PRIMARY_BYTES,
                },
            },
            "rusty-quest-package-updater.apk",
        )
    if owner == "rusty-connection-hub":
        version = tag.removeprefix("connection-hub-v")
        sequence = int(version.rsplit(".", 1)[1])
        return (
            {
                "$schema": "rusty.quest.connection_hub_labs_release.v1",
                "product": "Rusty Connection Hub",
                "release_tag": tag,
                "channel": "labs",
                "maturity": "alpha",
                "package_name": "io.github.mesmerprism.rustymanifold.broker",
                "version_code": 10000 + sequence,
                "version_name": version,
                "source_revision": SOURCE,
                "source_tree": TREE,
                "source_url": (
                    "https://github.com/MesmerPrism/rusty-quest/tree/"
                    f"{SOURCE}/apps/manifold-broker-android"
                ),
                "manifold_source_revision": "8" * 40,
                "manifold_source_tree": "9" * 40,
                "signer_sha256": SIGNER_HASH,
                "artifact_name": f"rusty-connection-hub-{version}.apk",
                "artifact_sha256": PRIMARY_HASH,
                "artifact_size": PRIMARY_BYTES,
                "build_manifest_sha256": "8" * 64,
                "release_manifest_debug_operator_absent": True,
                "listener_default": "stopped",
                "transport_classification": "trusted_lan_experimental",
                "confidentiality": "none",
                "production_eligible": False,
                "insecure_trusted_lan_requires_explicit_opt_in": True,
                "arbitrary_remote_commands": False,
                "high_rate_media_data_plane": False,
            },
            f"rusty-connection-hub-{version}.apk",
        )
    fail(f"unsupported fixture owner: {owner}")


def owner_tag(owner: str) -> str:
    if owner == "rusty-quest-package-updater":
        return "package-updater-v0.1.0-alpha.7"
    if owner == "rusty-connection-hub":
        return "connection-hub-v0.1.0-alpha.4"
    return "v1.2.3-alpha.4"


def make_record(owner: str) -> tuple[dict, dict]:
    tag = owner_tag(owner)
    metadata, primary_name = exact_metadata(owner, tag)
    metadata_bytes = canonical_json_bytes(metadata)
    metadata_name = {
        "questionable-file-manager":
            "questionable-file-manager-labs-owner-release.json",
        "rusty-fleet": "release-descriptor.receipt.json",
        "rusty-hostess":
            "RustyHostess-Labs-1.2.3-win-x64.release-metadata.json",
        "rusty-kiosk": "rusty-kiosk-labs-owner-release.json",
        "rusty-quest-package-updater":
            "rusty-quest-package-updater.release.json",
        "rusty-connection-hub": "connection-hub-release-manifest.json",
    }[owner]
    repository = OWNERS[owner]["repository"]
    request = {
        "owner": owner,
        "product_channel": "labs",
        "maturity": "alpha",
        "distribution_track": "github-prerelease",
        "tag": tag,
        "expected_source_revision": SOURCE,
        "expected_owner_metadata_asset": metadata_name,
        "expected_owner_metadata_sha256": sha256_bytes(metadata_bytes),
    }
    assets = [
        {
            "id": 101,
            "name": metadata_name,
            "size": len(metadata_bytes),
            "digest": f"sha256:{sha256_bytes(metadata_bytes)}",
            "state": "uploaded",
            "browser_download_url": canonical_asset_url(
                repository, tag, metadata_name
            ),
        },
        {
            "id": 102,
            "name": primary_name,
            "size": PRIMARY_BYTES,
            "digest": f"sha256:{PRIMARY_HASH}",
            "state": "uploaded",
            "browser_download_url": canonical_asset_url(
                repository, tag, primary_name
            ),
        },
    ]
    supporting_bytes = b""
    if owner == "rusty-kiosk":
        supporting_bytes = canonical_json_bytes(exact_kiosk_manifest(tag))
        extra_assets = [
            ("bundle-manifest.json", sha256_bytes(supporting_bytes),
             len(supporting_bytes)),
            ("rusty-kiosk-setup-helper.apk", HELPER_HASH, 2345),
            ("RUSTY-KIOSK-LICENSE.txt", LICENSE_HASH, 3456),
            ("RUSTY-KIOSK-SOURCE.txt", SOURCE_TEXT_HASH, 4567),
        ]
        for asset_id, (name, digest, size) in enumerate(
            extra_assets, start=103
        ):
            assets.append(
                {
                    "id": asset_id,
                    "name": name,
                    "size": size,
                    "digest": f"sha256:{digest}",
                    "state": "uploaded",
                    "browser_download_url": canonical_asset_url(
                        repository, tag, name
                    ),
                }
            )
    elif owner == "rusty-connection-hub":
        for asset_id, (name, digest, size) in enumerate(
            (
                ("LICENSE", "6" * 64, 34523),
                ("SOURCE-NOTICE.md", "7" * 64, 1122),
            ),
            start=103,
        ):
            assets.append(
                {
                    "id": asset_id,
                    "name": name,
                    "size": size,
                    "digest": f"sha256:{digest}",
                    "state": "uploaded",
                    "browser_download_url": canonical_asset_url(
                        repository, tag, name
                    ),
                }
            )
    readback = {
        "owner": owner,
        "release": {
            "id": 100,
            "tag_name": tag,
            "draft": False,
            "prerelease": True,
            "assets": assets,
        },
        "tag_chain": [{"type": "commit", "sha": SOURCE}],
        "commit_tree": TREE,
        "latest_tag": (
            "windows-hotspot-provider-v0.1.3"
            if owner == "rusty-hostess"
            else "v9.9.9"
        ),
        "metadata_base64": base64.b64encode(metadata_bytes).decode("ascii"),
        "supporting_json_base64": base64.b64encode(
            supporting_bytes
        ).decode("ascii"),
    }
    readback["final_readback"] = copy.deepcopy(
        {
            "release": readback["release"],
            "tag_chain": readback["tag_chain"],
            "commit_tree": readback["commit_tree"],
            "latest_tag": readback["latest_tag"],
        }
    )
    return request, readback


def complete_fixture() -> tuple[dict, dict]:
    requests = []
    readbacks = []
    for owner in (
        "questionable-file-manager",
        "rusty-fleet",
        "rusty-hostess",
        "rusty-kiosk",
        "rusty-quest-package-updater",
        "rusty-connection-hub",
    ):
        request, readback = make_record(owner)
        requests.append(request)
        readbacks.append(readback)
    return (
        {
            "schema": "rusty.morphospace.catalog_preflight_request.v1",
            "records": requests,
        },
        {
            "schema": "rusty.morphospace.owner_readback_fixture.v1",
            "records": readbacks,
        },
    )


def assert_rejected(action, label: str) -> None:
    try:
        action()
    except PreflightError:
        return
    fail(f"preflight accepted damage: {label}")


def main() -> int:
    connection_hub_suite = unittest.defaultTestLoader.loadTestsFromTestCase(
        ConnectionHubCatalogContractTest
    )
    connection_hub_result = unittest.TextTestRunner(verbosity=1).run(
        connection_hub_suite
    )
    if not connection_hub_result.wasSuccessful():
        fail("active Connection Hub catalog contract tests failed")

    baseline = json.loads(CATALOG_PATH.read_text(encoding="utf-8"))
    reviewed_request = strict_json_bytes(
        ACTIVATION_REQUEST.read_bytes(),
        "reviewed six-owner activation request",
        65536,
    )
    validated_request = validate_request(
        reviewed_request,
        require_complete_labs_set=True,
    )
    if {
        record["owner"]: record["tag"] for record in validated_request
    } != {
        "questionable-file-manager": "v0.5.0-alpha.12",
        "rusty-fleet": "v0.1.0-alpha.8",
        "rusty-hostess": "v0.1.0-alpha.7",
        "rusty-kiosk": "v0.6.6-alpha.9",
        "rusty-quest-package-updater": "package-updater-v0.1.0-alpha.3",
        "rusty-connection-hub": "connection-hub-v0.1.0-alpha.3",
    }:
        fail("reviewed six-owner activation request drifted")
    request, fixture = complete_fixture()
    generated, receipt = run_preflight(
        request,
        baseline,
        fixture=fixture,
        require_complete_labs_set=True,
    )
    generated_two, receipt_two = run_preflight(
        copy.deepcopy(request),
        baseline,
        fixture=copy.deepcopy(fixture),
        require_complete_labs_set=True,
    )
    if generated != generated_two or receipt != receipt_two:
        fail("offline preflight is not deterministic")
    renewed, renewal_receipt = run_preflight(
        copy.deepcopy(request),
        generated,
        fixture=copy.deepcopy(fixture),
        require_complete_labs_set=True,
    )
    if (
        renewed != generated
        or renewal_receipt["source_catalog_sha256"]
        != receipt["source_catalog_sha256"]
    ):
        fail("published catalog did not renew from the inert policy baseline")
    published = {
        product["owner"]: product["product_channels"][-1]
        for product in generated["products"]
        if product["product_channels"][-1]["availability"] == "published"
    }
    if (
        set(published)
        != {
            "questionable-file-manager",
            "rusty-fleet",
            "rusty-hostess",
            "rusty-kiosk",
            "rusty-quest-package-updater",
            "rusty-connection-hub",
        }
        or published["rusty-quest-package-updater"]["release"]["tag"]
        != "package-updater-v0.1.0-alpha.7"
        or published["rusty-quest-package-updater"]["release"]["version"]
        != "0.1.0-alpha.7"
        or receipt["record_count"] != 6
        or receipt["complete_labs_owner_set"] is not True
        or receipt["publication_authorized"] is not False
        or receipt["pages_deployment_invoked"] is not False
        or receipt["owner_binary_downloaded"] is not False
        or receipt["supporting_owner_json_validated"] != ["rusty-kiosk"]
        or not all(
            item["same_run_final_readback_verified"] is True
            for item in receipt["records"]
        )
        or not all(
            item["product_channel"] == "labs"
            and item["maturity"] == "alpha"
            and item["distribution_track"] == "github-prerelease"
            for item in receipt["records"]
        )
        or not all(
            channel["product_channel"] == "labs"
            and channel["maturity"] == "alpha"
            and channel["distribution_track"] == "github-prerelease"
            for channel in published.values()
        )
    ):
        fail("happy-path read-only projection or receipt is incomplete")
    kiosk = next(
        item for item in generated["products"] if item["owner"] == "rusty-kiosk"
    )
    if (
        kiosk["product_channels"][1]["availability"] != "published"
        or kiosk["product_channels"][1]["release"]["artifact_name"]
        != "rusty-kiosk.apk"
    ):
        fail("Kiosk owner release was not projected exactly")
    hub = next(
        item for item in generated["products"]
        if item["owner"] == "rusty-connection-hub"
    )
    hub_labs = hub["product_channels"][0]
    if (
        hub_labs["availability"] != "published"
        or hub_labs["release"]["tag"]
        != "connection-hub-v0.1.0-alpha.4"
        or hub_labs["release"]["artifact_name"]
        != "rusty-connection-hub-0.1.0-alpha.4.apk"
        or hub["security_notice"]["confidentiality"] != "none"
        or hub["security_notice"][
            "pairing_authenticates_but_does_not_encrypt"
        ] is not True
        or [route["owner"] for route in hub["companion_routes"]]
        != ["questionable-file-manager", "rusty-hostess"]
    ):
        fail("Connection Hub owner release or safety policy was not projected")

    def damaged(
        mutate,
        *,
        request_value: dict | None = None,
        fixture_value: dict | None = None,
    ) -> None:
        current_request = copy.deepcopy(request_value or request)
        current_fixture = copy.deepcopy(fixture_value or fixture)
        mutate(current_request, current_fixture)
        run_preflight(
            current_request,
            baseline,
            fixture=current_fixture,
            require_complete_labs_set=True,
        )

    mutations = [
        (
            "expanded request record",
            lambda r, _: r["records"][0].update({"authority": True}),
        ),
        (
            "duplicate owner channel",
            lambda r, _: r["records"].append(copy.deepcopy(r["records"][0])),
        ),
        (
            "unbounded maturity",
            lambda r, _: r["records"][0].update({"maturity": "nightly"}),
        ),
        (
            "wrong distribution track",
            lambda r, _: r["records"][0].update(
                {"distribution_track": "github-release"}
            ),
        ),
        (
            "draft release",
            lambda _, f: f["records"][0]["release"].update({"draft": True}),
        ),
        (
            "non-prerelease labs",
            lambda _, f: f["records"][0]["release"].update(
                {"prerelease": False}
            ),
        ),
        (
            "labs became latest",
            lambda r, f: f["records"][0].update(
                {"latest_tag": r["records"][0]["tag"]}
            ),
        ),
        (
            "malformed latest response",
            lambda _, f: f["records"][0].update({"latest_tag": 7}),
        ),
        (
            "noncanonical latest response",
            lambda _, f: (
                f["records"][0].update({"latest_tag": "not a tag"}),
                f["records"][0]["final_readback"].update(
                    {"latest_tag": "not a tag"}
                ),
            ),
        ),
        (
            "moved tag",
            lambda _, f: f["records"][0].update(
                {"tag_chain": [{"type": "commit", "sha": "9" * 40}]}
            ),
        ),
        (
            "wrong commit tree",
            lambda _, f: f["records"][0].update({"commit_tree": "9" * 40}),
        ),
        (
            "protected metadata digest mismatch",
            lambda r, _: r["records"][0].update(
                {"expected_owner_metadata_sha256": "9" * 64}
            ),
        ),
        (
            "primary digest mismatch",
            lambda _, f: f["records"][0]["release"]["assets"][1].update(
                {"digest": f"sha256:{'9' * 64}"}
            ),
        ),
        (
            "primary byte mismatch",
            lambda _, f: f["records"][0]["release"]["assets"][1].update(
                {"size": PRIMARY_BYTES + 1}
            ),
        ),
        (
            "primary URL mismatch",
            lambda _, f: f["records"][0]["release"]["assets"][1].update(
                {
                    "browser_download_url":
                        "https://github.com/MesmerPrism/rusty-fleet/"
                        "releases/latest/download/wrong.exe"
                }
            ),
        ),
        (
            "primary state incomplete",
            lambda _, f: f["records"][0]["release"]["assets"][1].update(
                {"state": "new"}
            ),
        ),
        (
            "duplicate metadata asset",
            lambda _, f: f["records"][0]["release"]["assets"].append(
                copy.deepcopy(f["records"][0]["release"]["assets"][0])
            ),
        ),
        (
            "release drift after metadata validation",
            lambda _, f: f["records"][0]["final_readback"]["release"][
                "assets"
            ][1].update({"size": PRIMARY_BYTES + 1}),
        ),
        (
            "tag drift after metadata validation",
            lambda _, f: f["records"][0]["final_readback"].update(
                {"tag_chain": [{"type": "commit", "sha": "9" * 40}]}
            ),
        ),
        (
            "latest drift after metadata validation",
            lambda r, f: f["records"][0]["final_readback"].update(
                {"latest_tag": r["records"][0]["tag"]}
            ),
        ),
    ]
    for label, mutation in mutations:
        assert_rejected(lambda m=mutation: damaged(m), label)

    partial_request, partial_fixture = complete_fixture()
    partial_request["records"].pop()
    partial_fixture["records"].pop()
    assert_rejected(
        lambda: run_preflight(
            partial_request,
            baseline,
            fixture=partial_fixture,
            require_complete_labs_set=True,
        ),
        "incomplete central labs owner set",
    )

    expanded_request, expanded_fixture = complete_fixture()
    metadata_bytes = base64.b64decode(
        expanded_fixture["records"][0]["metadata_base64"]
    )
    metadata = json.loads(metadata_bytes)
    metadata["authority"] = True
    damaged_bytes = canonical_json_bytes(metadata)
    expanded_fixture["records"][0]["metadata_base64"] = base64.b64encode(
        damaged_bytes
    ).decode("ascii")
    expanded_request["records"][0][
        "expected_owner_metadata_sha256"
    ] = sha256_bytes(damaged_bytes)
    asset = expanded_fixture["records"][0]["release"]["assets"][0]
    asset["size"] = len(damaged_bytes)
    asset["digest"] = f"sha256:{sha256_bytes(damaged_bytes)}"
    assert_rejected(
        lambda: run_preflight(
            expanded_request, baseline, fixture=expanded_fixture
        ),
        "expanded owner metadata",
    )

    cross_request, cross_fixture = complete_fixture()
    qfm_bytes = cross_fixture["records"][0]["metadata_base64"]
    hostess_index = 2
    cross_fixture["records"][hostess_index]["metadata_base64"] = qfm_bytes
    raw = base64.b64decode(qfm_bytes)
    cross_request["records"][hostess_index][
        "expected_owner_metadata_sha256"
    ] = sha256_bytes(raw)
    hostess_asset = cross_fixture["records"][hostess_index]["release"][
        "assets"
    ][0]
    hostess_asset["size"] = len(raw)
    hostess_asset["digest"] = f"sha256:{sha256_bytes(raw)}"
    assert_rejected(
        lambda: run_preflight(
            cross_request, baseline, fixture=cross_fixture
        ),
        "cross-owner metadata",
    )

    fleet_damage_count = 0

    def assert_fleet_metadata_damage(label: str, mutate) -> None:
        nonlocal fleet_damage_count
        damaged_request, damaged_fixture = complete_fixture()
        fleet_index = 1
        fixture_record = damaged_fixture["records"][fleet_index]
        metadata = json.loads(
            base64.b64decode(fixture_record["metadata_base64"])
        )
        mutate(metadata)
        metadata_bytes = canonical_json_bytes(metadata)
        fixture_record["metadata_base64"] = base64.b64encode(
            metadata_bytes
        ).decode("ascii")
        damaged_request["records"][fleet_index][
            "expected_owner_metadata_sha256"
        ] = sha256_bytes(metadata_bytes)
        metadata_asset = fixture_record["release"]["assets"][0]
        metadata_asset["digest"] = f"sha256:{sha256_bytes(metadata_bytes)}"
        metadata_asset["size"] = len(metadata_bytes)
        fixture_record["final_readback"]["release"] = copy.deepcopy(
            fixture_record["release"]
        )
        assert_rejected(
            lambda: run_preflight(
                damaged_request, baseline, fixture=damaged_fixture
            ),
            label,
        )
        fleet_damage_count += 1

    fleet_metadata_mutations = [
        (
            "Fleet descriptor reverted to v4",
            lambda value: value.update(
                {"schema": "rusty.fleet.windows_release_descriptor_receipt.v4"}
            ),
        ),
        (
            "Fleet signer is no longer self-issued",
            lambda value: value.update({"setup_signer_self_issued": False}),
        ),
        (
            "Fleet descriptor claims public trust",
            lambda value: value.update({"public_trust_claim": True}),
        ),
        (
            "Fleet signer thumbprint is noncanonical",
            lambda value: value.update(
                {"setup_signer_thumbprint": FLEET_SIGNER_THUMBPRINT.lower()}
            ),
        ),
        (
            "Fleet trust mode is weakened",
            lambda value: value.update({"authenticode_trust_mode": "system"}),
        ),
        (
            "Fleet signer subject is unexpected",
            lambda value: value.update({"setup_signer_subject": "CN=Other"}),
        ),
        (
            "Fleet timestamp requirement is disabled",
            lambda value: value.update({"timestamp_required": False}),
        ),
        (
            "Fleet timestamp disclosure is missing",
            lambda value: value.pop("timestamp_required"),
        ),
    ]
    for label, mutation in fleet_metadata_mutations:
        assert_fleet_metadata_damage(label, mutation)

    kiosk_damage_count = 0

    def assert_kiosk_manifest_damage(label: str, mutate) -> None:
        nonlocal kiosk_damage_count
        damaged_request, damaged_fixture = complete_fixture()
        kiosk_index = 3
        fixture_record = damaged_fixture["records"][kiosk_index]
        manifest = json.loads(
            base64.b64decode(fixture_record["supporting_json_base64"])
        )
        mutate(manifest)
        manifest_bytes = canonical_json_bytes(manifest)
        fixture_record["supporting_json_base64"] = base64.b64encode(
            manifest_bytes
        ).decode("ascii")
        metadata = json.loads(
            base64.b64decode(fixture_record["metadata_base64"])
        )
        metadata["bundle_manifest"]["sha256"] = sha256_bytes(manifest_bytes)
        metadata["bundle_manifest"]["bytes"] = len(manifest_bytes)
        metadata_bytes = canonical_json_bytes(metadata)
        fixture_record["metadata_base64"] = base64.b64encode(
            metadata_bytes
        ).decode("ascii")
        request_record = damaged_request["records"][kiosk_index]
        request_record["expected_owner_metadata_sha256"] = sha256_bytes(
            metadata_bytes
        )
        for asset in fixture_record["release"]["assets"]:
            if asset["name"] == "rusty-kiosk-labs-owner-release.json":
                asset["digest"] = f"sha256:{sha256_bytes(metadata_bytes)}"
                asset["size"] = len(metadata_bytes)
            elif asset["name"] == "bundle-manifest.json":
                asset["digest"] = f"sha256:{sha256_bytes(manifest_bytes)}"
                asset["size"] = len(manifest_bytes)
        fixture_record["final_readback"]["release"] = copy.deepcopy(
            fixture_record["release"]
        )
        assert_rejected(
            lambda: run_preflight(
                damaged_request, baseline, fixture=damaged_fixture
            ),
            label,
        )
        kiosk_damage_count += 1

    kiosk_manifest_mutations = [
        (
            "Kiosk manifest wrong identity mode",
            lambda value: value.update({"identity_mode": "side-by-side"}),
        ),
        (
            "Kiosk manifest wrong signer",
            lambda value: value.update({"signer_sha256": "8" * 64}),
        ),
        (
            "Kiosk manifest wrong version code",
            lambda value: value.update({"version_code": 1020305}),
        ),
        (
            "Kiosk manifest wrong exit policy",
            lambda value: value.update({"exit_policy": "downgrade"}),
        ),
        (
            "Kiosk primary APK wrong version code",
            lambda value: value["files"][0].update(
                {"version_code": 1020305}
            ),
        ),
        (
            "Kiosk helper wrong package",
            lambda value: value["files"][1].update(
                {"package_name": "io.example.helper"}
            ),
        ),
        (
            "expanded Kiosk manifest",
            lambda value: value.update({"authority": True}),
        ),
        (
            "duplicate Kiosk manifest payload",
            lambda value: value["files"].append(
                copy.deepcopy(value["files"][0])
            ),
        ),
    ]
    for label, mutation in kiosk_manifest_mutations:
        assert_kiosk_manifest_damage(label, mutation)

    extra_request, extra_fixture = complete_fixture()
    kiosk_record = extra_fixture["records"][3]
    extra_asset = {
        "id": 999,
        "name": "unexpected.apk",
        "size": 1,
        "digest": f"sha256:{'8' * 64}",
        "state": "uploaded",
        "browser_download_url": canonical_asset_url(
            OWNERS["rusty-kiosk"]["repository"],
            owner_tag("rusty-kiosk"),
            "unexpected.apk",
        ),
    }
    kiosk_record["release"]["assets"].append(extra_asset)
    kiosk_record["final_readback"]["release"] = copy.deepcopy(
        kiosk_record["release"]
    )
    assert_rejected(
        lambda: run_preflight(
            extra_request, baseline, fixture=extra_fixture
        ),
        "expanded Kiosk release inventory",
    )
    kiosk_damage_count += 1

    assert_rejected(
        lambda: strict_json_bytes(
            b'{"schema":"a","schema":"b"}',
            "duplicate JSON fixture",
            1024,
        ),
        "duplicate JSON key",
    )
    workflow = (
        Path(__file__).resolve().parents[1]
        / ".github"
        / "workflows"
        / "distribution-catalog-preflight.yml"
    ).read_text(encoding="utf-8")
    for token in (
        "workflow_dispatch:",
        "environment: distribution-catalog-preflight",
        "runs-on: ubuntu-24.04",
        "actions/checkout@3d3c42e5aac5ba805825da76410c181273ba90b1",
        "actions/setup-python@a26af69be951a213d495a4c3e4e4022e16d87065",
        "python-version: 3.12.10",
        "tools/test_distribution_catalog_preflight.py",
        "tools/preflight_distribution_catalog.py",
        "--require-complete-labs-set",
        "actions/upload-artifact@ea165f8d65b6e75b540449e92b4886f43607fa02",
    ):
        if token not in workflow:
            fail(f"read-only preflight workflow is missing token: {token}")
    for forbidden in (
        "pages: write",
        "id-token: write",
        "actions/deploy-pages",
        "actions/upload-pages-artifact",
        "git push",
        "gh release",
        "\npush:",
        "\npull_request:",
        "\nschedule:",
    ):
        if forbidden in workflow:
            fail(f"read-only preflight workflow contains route: {forbidden}")
    print(
        "Distribution catalog read-only preflight tests passed: "
        "6 active owner adapters including Connection Hub, "
        "strict Kiosk manifest lineage, "
        f"{len(mutations) + 4 + fleet_damage_count + kiosk_damage_count} "
        "damage classes"
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
