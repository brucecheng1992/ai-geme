# Step 13B — Large Library Inventory Dry-Run

Status: future read-only tooling/report step. Start only after Step 13A completes.

## Goal

Inventory the large library without importing, copying, or modifying files.

## Allowed

- count files;
- classify file formats;
- estimate total size;
- detect candidate thumbnails;
- estimate metadata gaps;
- produce deterministic inventory report.

## Not Allowed

- file movement;
- copying into repo;
- metadata generation;
- runtime integration;
- repair writeback;
- source file mutation.

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
