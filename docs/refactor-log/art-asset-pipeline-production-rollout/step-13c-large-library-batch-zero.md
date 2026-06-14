# Step 13C — Large Library Metadata Batch Zero

Status: future small import / fixture batch. Start only after Step 13B and storage/rights approval.

## Goal

Import a tiny first batch from the large library under strict limits.

## Size

```txt
target: 10-30 assets
maximum: 50 assets
```

## Allowed

- batch-zero assets or references according to storage policy;
- sidecar metadata for every asset;
- thumbnails if required;
- batch README;
- validation tests.

## Not Allowed

- broad import;
- default runtime loading;
- production asset pack wiring;
- repair writeback;
- unsupported silent promotion.

## Required Validation

```bash
npm run metadata:validate -- <batch-zero-metadata-dir>
npm run metadata:validate -- --check-paths <batch-zero-metadata-dir>
npm run metadata:export-runtime -- --json <batch-zero-metadata-dir>
npm run test:contracts
npm test
npm run typecheck
git diff --check
```

## Review Gate

P0:

- imports more than approved batch size;
- commits binaries against storage policy;
- imports assets without sidecars;
- changes runtime/default behavior;
- repair writeback occurs.

P1:

- rights/licensing status unclear;
- rollback unclear;
- validation budget exceeded.

P2:

- no batch README;
- no validation evidence;
- no docs update.

P3:

- wording, naming, formatting, cross-link cleanup.
