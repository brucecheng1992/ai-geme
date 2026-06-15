# Step 13B — Large Library Inventory Dry-Run

Status: current read-only inventory dry-run for Kenney Pirate Kit.

## Goal

Inventory the large library without importing, copying, or modifying files.

This Step 13B instance uses only the explicit preflighted Kenney Pirate Kit direct archive URL:

`https://kenney.nl/media/pages/assets/pirate-kit/e6d4bb1525-1771333093/kenney_pirate-kit.zip`

Source page evidence:

- Page: `https://kenney.nl/assets/pirate-kit`
- Title: `Pirate Kit`
- Category: `3D`
- Features: `Animation`
- Files: `70x`
- License: `Creative Commons CC0`

## Allowed

- count files;
- classify file formats;
- estimate total size;
- detect candidate thumbnails;
- estimate metadata gaps;
- produce deterministic inventory report.

For this run, the exact archive may be downloaded only to ignored local artifacts under `artifacts/asset-semantic-large-library-inventory/`.

## Not Allowed

- file movement;
- copying into repo;
- metadata generation;
- runtime integration;
- repair writeback;
- source file mutation.

Additional forbidden operations for this run:

- archive extraction;
- crawling or searching alternate sources;
- hashing;
- image dimension probing;
- thumbnail generation;
- metadata sidecar generation;
- Step 13C batch-zero import;
- QA / Workbench / Phaser / resolver / asset pack loading changes.

## Required Report Shape

```json
{
  "inventory_version": "0.1",
  "source": "external-or-redacted-library-reference",
  "file_count": 0,
  "total_size_bytes": 0,
  "formats": {},
  "candidate_asset_count": 0,
  "missing_metadata_count": 0,
  "missing_thumbnail_count": 0,
  "diagnostics": []
}
```

Committed reports must not include absolute local machine paths.

## Step 13B Kenney Pirate Kit Result

Ignored local artifacts:

- `<LOCAL_ARTIFACT_SOURCE_ZIP>`
- `artifacts/asset-semantic-large-library-inventory/step-13b-pirate-kit-v0.1/raw-entries.json`
- `artifacts/asset-semantic-large-library-inventory/step-13b-pirate-kit-v0.1/inventory-summary.json`

Summary:

- Downloaded archive byte size: `3154665`
- Total entries: `379`
- Files: `370`
- Directories: `9`
- Total uncompressed bytes: `9335467`
- Total compressed bytes from entry listing: `3049249`
- Extension counts: `fbx=72`, `glb=72`, `obj=72`, `mtl=72`, `png=77`, `txt=1`, `html=1`, `url=3`
- Coarse media counts: `model_3d=216`, `image_texture=77`, `documentation=2`, `unknown=75`
- License / readme candidate: `License.txt`
- Preview / reference image candidates: `74`
- Filename-convention animation-specific entries: `0`
- Candidate asset count by unique model basename: `72`
- Metadata sidecar entries detected: `0`
- Missing metadata estimate by unique model basename: `72`
- Thumbnail/reference coverage by unique model basename: `72/72`
- Missing thumbnail/reference estimate by unique model basename: `0`
- Coverage method: archive-entry paths only; no extraction, hashing, image reads or image dimension probes.

Step 13C recommendation:

- suitable for a future batch-zero proposal, subject to explicit Step 13C approval;
- pick one runtime-friendly format family, likely GLB;
- keep batch zero at or below 10 assets unless a later gate changes Step 13A limits;
- generate sidecar metadata only in Step 13C or later, not in Step 13B.

## Validation

```bash
npm run test:contracts
npm run typecheck
git diff --check
```

## Review Gate

P0:

- mutates large library;
- imports large library into repo;
- changes runtime/default behavior;
- report includes sensitive absolute paths;
- rights-sensitive information exposed improperly.

P1:

- inventory nondeterministic;
- format classification unclear;
- report too large or unreviewable.

P2:

- no missing metadata estimate;
- no missing thumbnail estimate;
- no total size estimate.

P3:

- wording, naming, formatting, cross-link cleanup.
