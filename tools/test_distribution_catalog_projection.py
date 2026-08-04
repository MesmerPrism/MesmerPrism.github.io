#!/usr/bin/env python3
"""Offline damage matrix for authorized catalog publication."""

from __future__ import annotations

import copy
import json
import tempfile
from pathlib import Path

from preflight_distribution_catalog import CATALOG_PATH, canonical_json_bytes, run_preflight
from publish_distribution_catalog_projection import (
    CATALOG_RELATIVE,
    PUBLICATION_RELATIVE,
    ProjectionError,
    publish_projection,
)
from test_distribution_catalog import validate_catalog
from test_distribution_catalog_preflight import complete_fixture


RUN_ID = 123456789
HEAD_SHA = "a" * 40
ARTIFACT_ID = 987654321
ARTIFACT_NAME = f"distribution-catalog-readonly-preflight-{RUN_ID}"
ARTIFACT_DIGEST = f"sha256:{'b' * 64}"
ARTIFACT_SIZE = 4567
AUTHORIZED_AT = "2026-08-01T21:30:00Z"


def fail(message: str) -> None:
    raise AssertionError(message)


def materialize(
    root: Path,
    source: dict,
    catalog: dict,
    receipt: dict,
) -> tuple[Path, Path, Path]:
    site_root = root / "site"
    current = site_root / CATALOG_RELATIVE
    current.parent.mkdir(parents=True)
    current.write_bytes(canonical_json_bytes(source))
    (site_root / "unrelated.txt").write_text("preserve\n", encoding="utf-8")
    catalog_path = root / "catalog.generated.json"
    receipt_path = root / "readback.receipt.json"
    catalog_path.write_bytes(canonical_json_bytes(catalog))
    receipt_path.write_bytes(canonical_json_bytes(receipt))
    return site_root, catalog_path, receipt_path


def invoke(
    root: Path,
    source: dict,
    catalog: dict,
    receipt: dict,
    **overrides,
) -> dict:
    site_root, catalog_path, receipt_path = materialize(
        root, source, catalog, receipt
    )
    arguments = {
        "catalog_path": catalog_path,
        "receipt_path": receipt_path,
        "site_root": site_root,
        "preflight_run_id": RUN_ID,
        "preflight_head_sha": HEAD_SHA,
        "artifact_id": ARTIFACT_ID,
        "artifact_name": ARTIFACT_NAME,
        "artifact_digest": ARTIFACT_DIGEST,
        "artifact_size_bytes": ARTIFACT_SIZE,
        "authorized_at": AUTHORIZED_AT,
    }
    arguments.update(overrides)
    return publish_projection(**arguments)


def assert_rejected(action, label: str) -> None:
    try:
        action()
    except (ProjectionError, AssertionError):
        return
    fail(f"catalog publication accepted damage: {label}")


def main() -> int:
    source = json.loads(CATALOG_PATH.read_text(encoding="utf-8"))
    request, fixture = complete_fixture()
    generated, receipt = run_preflight(
        request,
        source,
        fixture=fixture,
        require_complete_labs_set=True,
    )
    receipt["mode"] = "live-readonly"
    with tempfile.TemporaryDirectory(prefix="catalog-projection-") as value:
        root = Path(value)
        publication = invoke(root, source, generated, receipt)
        site_root = root / "site"
        published = json.loads(
            (site_root / CATALOG_RELATIVE).read_text(encoding="utf-8")
        )
        validate_catalog(published, allow_published=True)
        if (
            published != generated
            or publication["publication_authorized"] is not True
            or publication["projection"] != "complete-six-owner-labs-set"
            or publication["source_preflight"]["record_count"] != 6
            or (site_root / "unrelated.txt").read_text(encoding="utf-8")
            != "preserve\n"
            or not (site_root / PUBLICATION_RELATIVE).is_file()
        ):
            fail("happy-path publication or preservation evidence is incomplete")
        renewal_root = root / "renewal"
        renewed = invoke(renewal_root, published, generated, receipt)
        if renewed["source_preflight"] != publication["source_preflight"]:
            fail("renewable publication changed immutable preflight evidence")

    damages = []

    damaged = copy.deepcopy(receipt)
    damaged["publication_authorized"] = True
    damages.append(("read-only receipt claimed publication", generated, damaged, {}))

    damaged = copy.deepcopy(receipt)
    damaged["owner_binary_downloaded"] = True
    damages.append(("owner binary download", generated, damaged, {}))

    damaged = copy.deepcopy(receipt)
    damaged["records"].pop()
    damages.append(("incomplete owner set", generated, damaged, {}))

    damaged = copy.deepcopy(receipt)
    damaged["records"][0]["same_run_final_readback_verified"] = False
    damages.append(("missing final readback", generated, damaged, {}))

    damaged = copy.deepcopy(receipt)
    damaged["records"][0]["primary_artifact"]["sha256"] = "9" * 64
    damages.append(("catalog and receipt artifact mismatch", generated, damaged, {}))

    expanded = copy.deepcopy(generated)
    expanded["authority"] = "pages-release-authority"
    damages.append(("damaged generated catalog", expanded, receipt, {}))

    damages.append(
        (
            "artifact name not run-bound",
            generated,
            receipt,
            {"artifact_name": "other"},
        )
    )
    damages.append(
        (
            "artifact digest malformed",
            generated,
            receipt,
            {"artifact_digest": "sha256:bad"},
        )
    )

    for index, (label, catalog, evidence, overrides) in enumerate(damages):
        with tempfile.TemporaryDirectory(
            prefix=f"catalog-projection-damage-{index}-"
        ) as value:
            assert_rejected(
                lambda c=catalog, e=evidence, o=overrides, r=Path(value): invoke(
                    r, source, c, e, **o
                ),
                label,
            )
    workflow = (
        Path(__file__).resolve().parents[1]
        / ".github"
        / "workflows"
        / "distribution-catalog-publish.yml"
    ).read_text(encoding="utf-8")
    for token in (
        "workflow_dispatch:",
        "environment: distribution-catalog-publication",
        "permissions:\n      actions: read\n      contents: write\n      pages: write",
        "catalog-publication-prepared-${{ github.run_id }}",
        "tools/test_distribution_catalog_projection.py",
        "tools/publish_distribution_catalog_projection.py",
        "git push origin HEAD:main",
        'gh api --method POST "repos/$GITHUB_REPOSITORY/pages/builds"',
        "refs/heads/main",
    ):
        if token not in workflow:
            fail(f"catalog publication workflow is missing token: {token}")
    for forbidden in (
        "\npull_request:",
        "\npush:",
        "\nschedule:",
        "id-token: write",
        "actions/deploy-pages",
        "actions/upload-pages-artifact",
        "gh release",
    ):
        if forbidden in workflow:
            fail(f"catalog publication workflow contains route: {forbidden}")
    run_indent: int | None = None
    for line in workflow.splitlines():
        stripped = line.lstrip()
        indent = len(line) - len(stripped)
        if stripped in {"run: |", "run: >-"}:
            run_indent = indent
            continue
        if run_indent is not None and stripped and indent <= run_indent:
            run_indent = None
        if run_indent is not None and "${{ inputs." in line:
            fail("catalog publication run block directly interpolates input")
    print(
        "Distribution catalog publication tests passed: renewable exact "
        f"projection and {len(damages)} damage classes"
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
