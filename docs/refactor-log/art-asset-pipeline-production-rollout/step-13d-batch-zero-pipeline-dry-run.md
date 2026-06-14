# Step 13D — Batch Zero Pipeline Dry-Run

Status: future dry-run/report step. Start only after Step 13C passes validation.

## Goal

Run batch zero through the same pipeline used by the small library:

```txt
metadata validate
runtime export
canary
comparison
bridge diagnostics
resolver-adjacent diagnostics
```

## Not Allowed

- production/default runtime loading;
- large-scale import;
- repair writeback;
- unsupported silent promotion.

## Validation

```bash
npm run metadata:validate -- <batch-zero-metadata-dir>
npm run metadata:export-runtime -- --json <batch-zero-metadata-dir>
npm run qa:asset-semantic:canary -- --fixture <batch-zero-fixture>
npm run qa:asset-semantic:canary -- --repair-enabled --fixture <batch-zero-fixture>
npm run qa:asset-semantic:compare -- --default-summary <path> --repair-enabled-summary <path> --out <path>
npm run test:contracts
npm test
npm run typecheck
git diff --check
```

## Review Gate

P0:

- dry-run mutates source metadata;
- default runtime behavior changes;
- generated reports contain absolute paths;
- repair-enabled becomes default.

P1:

- report shape unstable;
- comparison semantics unclear;
- failed assets are silently promoted.

P2:

- no negative diagnostics;
- no deterministic report check;
- no docs update.

P3:

- wording, naming, formatting, cross-link cleanup.
