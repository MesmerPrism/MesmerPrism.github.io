#!/usr/bin/env python3
"""Offline damage matrix for the read-only owner-release preflight."""

from __future__ import annotations

import base64
import copy
import json
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
)


SOURCE = "1" * 40
TREE = "2" * 40
PRIMARY_HASH = "3" * 64
SIGNER_HASH = "4" * 64
PRIMARY_BYTES = 1234
HELPER_HASH = "5" * 64
LICENSE_HASH = "6" * 64
SOURCE_TEXT_HASH = "7" * 64


def fail(message: str) -> None:
    raise AssertionError(message)


def exact_fleet_metadata(tag: str) -> dict:
    return {
        "schema": "rusty.fleet.windows_release_descriptor_receipt.v3",
        "result": "pass",
        "descriptor_id": "v1.2.3-alpha-owner-test",
        "version": "1.2.3",
        "channel": "alpha",
        "release_tag": tag,
        "installation_identity": "rusty-fleet-alpha",
        "primary_artifact": {
            "role": "complete-product",
            "name": "RustyFleet-Alpha-Setup.exe",
            "sha256": PRIMARY_HASH,
            "bytes": PRIMARY_BYTES,
            "url": canonical_asset_url(
                OWNERS["rusty-fleet"]["repository"],
                tag,
                "RustyFleet-Alpha-Setup.exe",
            ),
        },
        "issued_at_ms": 1800000000000,
        "expires_at_ms": 1800003600000,
        "validity_duration_ms": 3600000,
        "setup_sha256": PRIMARY_HASH,
        "setup_size_bytes": PRIMARY_BYTES,
        "setup_signer_certificate_sha256": SIGNER_HASH,
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
        "pages_path": "Rusty-Fleet/metadata/alpha/release.json",
        "asset_url": canonical_asset_url(
            OWNERS["rusty-fleet"]["repository"],
            tag,
            "RustyFleet-Alpha-Setup.exe",
        ),
    }


def exact_kiosk_manifest(tag: str) -> dict:
    return {
        "schema": "meta.quest.file_manager.rusty_kiosk_bundle.v1",
        "build_type": "release",
        "channel": "alpha",
        "prerelease": True,
        "tag": tag,
        "version": "1.2.3-alpha.4",
        "version_code": 1020304,
        "identity_mode": "same-package-in-place",
        "exit_policy": (
            "in-place; install a later same-signer stable build with a "
            "higher versionCode"
        ),
        "source_url": "https://github.com/MesmerPrism/Rusty-Kiosk",
        "source_revision": SOURCE,
        "source_tree": TREE,
        "signer_sha256": SIGNER_HASH,
        "files": [
            {
                "name": "rusty-kiosk.apk",
                "package_name": "io.github.mesmerprism.rustykiosk",
                "version_name": "1.2.3-alpha.4",
                "version_code": 1020304,
                "sha256": PRIMARY_HASH,
                "bytes": PRIMARY_BYTES,
            },
            {
                "name": "rusty-kiosk-setup-helper.apk",
                "package_name":
                    "io.github.mesmerprism.rustykiosk.setuphelper",
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
                "schema": "questionable-file-manager.alpha-owner-release.v1",
                "channel": "alpha",
                "release": {
                    "tag": tag,
                    "version": "1.2.3-alpha.4",
                    "windows_package_version": "1.2.3.4",
                },
                "source": {"revision": SOURCE, "tree": TREE},
                "installation": {
                    "package_identity":
                        "MesmerPrism.QuestIonAbleFileManager.Alpha"
                },
                "primary_windows_setup": {
                    "name": "QuestIonAbleFileManager-Alpha-Setup.exe",
                    "sha256": PRIMARY_HASH,
                    "bytes": PRIMARY_BYTES,
                },
                "validation_evidence": {
                    "name": "release-validation.json",
                    "schema": "questionable-file-manager.release-validation.v1",
                },
            },
            "QuestIonAbleFileManager-Alpha-Setup.exe",
        )
    if owner == "rusty-fleet":
        return exact_fleet_metadata(tag), "RustyFleet-Alpha-Setup.exe"
    if owner == "rusty-hostess":
        return (
            {
                "schema":
                    "rusty.hostess.windows_alpha_release_metadata.v1",
                "repository": "MesmerPrism/rusty-hostess",
                "product": "rusty-hostess-alpha",
                "channel": "alpha",
                "prerelease": True,
                "version": "1.2.3",
                "tag": tag,
                "source": {"revision": SOURCE, "tree": TREE},
                "installation_identity": "rusty-hostess-alpha",
                "primary_artifact": {
                    "role": "complete-product",
                    "name": "RustyHostess-Alpha-1.2.3-win-x64.zip",
                    "sha256": PRIMARY_HASH,
                    "bytes": PRIMARY_BYTES,
                },
            },
            "RustyHostess-Alpha-1.2.3-win-x64.zip",
        )
    if owner == "rusty-kiosk":
        manifest_bytes = canonical_json_bytes(exact_kiosk_manifest(tag))
        return (
            {
                "schema": "rusty.kiosk.alpha_release_owner_metadata.v1",
                "repository": "MesmerPrism/Rusty-Kiosk",
                "product": "rusty-kiosk",
                "channel": "alpha",
                "prerelease": True,
                "tag": tag,
                "version": "1.2.3-alpha.4",
                "source_revision": SOURCE,
                "source_tree": TREE,
                "installation_identity":
                    "io.github.mesmerprism.rustykiosk",
                "same_package_lineage": {
                    "identity_mode": "same-package-in-place",
                    "package_name": "io.github.mesmerprism.rustykiosk",
                    "signer_sha256": SIGNER_HASH,
                    "version_name": "1.2.3-alpha.4",
                    "version_code": 1020304,
                    "exit_policy": (
                        "in-place; install a later same-signer stable build "
                        "with a higher versionCode"
                    ),
                },
                "bundle_manifest": {
                    "schema":
                        "meta.quest.file_manager.rusty_kiosk_bundle.v1",
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
                "schema": "rusty.quest.package_updater_product_release.v1",
                "product": "rusty-quest-package-updater",
                "release_tag": tag,
                "release_version": "0.1.0-alpha.7",
                "source_revision": SOURCE,
                "source_tree": TREE,
                "channel": "alpha",
                "installation_identity":
                    "io.github.mesmerprism.rustyquest.packageupdater.alpha",
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
    fail(f"unsupported fixture owner: {owner}")


def owner_tag(owner: str) -> str:
    return (
        "package-updater-v0.1.0-alpha.7"
        if owner == "rusty-quest-package-updater"
        else "v1.2.3-alpha.4"
    )


def make_record(owner: str) -> tuple[dict, dict]:
    tag = owner_tag(owner)
    metadata, primary_name = exact_metadata(owner, tag)
    metadata_bytes = canonical_json_bytes(metadata)
    metadata_name = {
        "questionable-file-manager":
            "questionable-file-manager-alpha-owner-release.json",
        "rusty-fleet": "release-descriptor.receipt.json",
        "rusty-hostess":
            "RustyHostess-Alpha-1.2.3-win-x64.release-metadata.json",
        "rusty-kiosk": "rusty-kiosk-alpha-owner-release.json",
        "rusty-quest-package-updater":
            "rusty-quest-package-updater.release.json",
    }[owner]
    repository = OWNERS[owner]["repository"]
    request = {
        "owner": owner,
        "channel": "alpha",
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
        "latest_tag": "v9.9.9",
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
    baseline = json.loads(CATALOG_PATH.read_text(encoding="utf-8"))
    request, fixture = complete_fixture()
    generated, receipt = run_preflight(
        request,
        baseline,
        fixture=fixture,
        require_complete_alpha_set=True,
    )
    generated_two, receipt_two = run_preflight(
        copy.deepcopy(request),
        baseline,
        fixture=copy.deepcopy(fixture),
        require_complete_alpha_set=True,
    )
    if generated != generated_two or receipt != receipt_two:
        fail("offline preflight is not deterministic")
    published = {
        product["owner"]: product["channels"][-1]
        for product in generated["products"]
        if product["channels"][-1]["availability"] == "published"
    }
    if (
        set(published)
        != {
            "questionable-file-manager",
            "rusty-fleet",
            "rusty-hostess",
            "rusty-kiosk",
            "rusty-quest-package-updater",
        }
        or published["rusty-quest-package-updater"]["release"]["tag"]
        != "package-updater-v0.1.0-alpha.7"
        or published["rusty-quest-package-updater"]["release"]["version"]
        != "0.1.0-alpha.7"
        or receipt["record_count"] != 5
        or receipt["complete_alpha_owner_set"] is not True
        or receipt["publication_authorized"] is not False
        or receipt["pages_deployment_invoked"] is not False
        or receipt["owner_binary_downloaded"] is not False
        or receipt["supporting_owner_json_validated"] != ["rusty-kiosk"]
        or not all(
            item["same_run_final_readback_verified"] is True
            for item in receipt["records"]
        )
    ):
        fail("happy-path read-only projection or receipt is incomplete")
    kiosk = next(
        item for item in generated["products"] if item["owner"] == "rusty-kiosk"
    )
    if (
        kiosk["channels"][1]["availability"] != "published"
        or kiosk["channels"][1]["release"]["artifact_name"]
        != "rusty-kiosk.apk"
    ):
        fail("Kiosk owner release was not projected exactly")

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
            require_complete_alpha_set=True,
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
            "draft release",
            lambda _, f: f["records"][0]["release"].update({"draft": True}),
        ),
        (
            "non-prerelease alpha",
            lambda _, f: f["records"][0]["release"].update(
                {"prerelease": False}
            ),
        ),
        (
            "alpha became latest",
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
            lambda _, f: f["records"][0].update(
                {"latest_tag": "not-a-stable-tag"}
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
            require_complete_alpha_set=True,
        ),
        "incomplete central alpha owner set",
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
            if asset["name"] == "rusty-kiosk-alpha-owner-release.json":
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
        "--require-complete-alpha-set",
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
        "5 owner adapters with strict Kiosk manifest lineage, "
        f"{len(mutations) + 4 + kiosk_damage_count} damage classes"
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
