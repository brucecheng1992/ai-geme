# Step 12B — Workbench / QA Preview Implementation

Status: current code/test step. Step 12A decided preview is required before large-library rollout.

## Goal

Add preview-only internal visibility for small art library metadata, thumbnails, or diagnostics.

## Implementation Summary

Step 12B adds a small-fixture-only Workbench / QA preview lane:

- `packages/asset-pipeline/src/art-asset-workbench-preview.ts` builds a read-only preview DTO from runtime-safe metadata export plus deterministic bridge / resolver diagnostics summaries.
- `apps/maker-api/src/art-asset-preview/*` exposes `GET /api/art-assets/preview/small-library`.
- `apps/maker-workbench/src/App.tsx` optionally fetches the small-library preview; endpoint failure does not affect project status, QA report, repair report or build log.
- `apps/maker-workbench/src/AssetStatusPanel.tsx` renders a compact preview-only section when the DTO is available.
- `tests/contracts/art-asset-workbench-preview.test.ts` guards source scope, read-only behavior, deterministic output, sensitive-field exclusion and out-of-scope path fail-closed behavior.

The preview DTO uses the Step 12A allowlist and does not expose raw sidecar JSON, `technical.source_path`, rights/legal/creator/source details, workflow/review notes, search/embedding fields, AI generation fields, absolute local paths, production/default asset pack paths or large-library paths.

## Allowed

- preview UI or QA report;
- read-only diagnostics display;
- small fixture only;
- explicit safe field allowlist;
- focused tests.

## Not Allowed

- production/default runtime integration;
- large library access;
- metadata mutation;
- repair writeback;
- exposing prompt, seed, legal, or review notes;
- making Workbench default depend on the large library.

## Required Tests

- preview source is small fixture only;
- preview is read-only;
- sensitive fields are absent;
- diagnostics display deterministically;
- default runtime behavior unchanged.

Implemented coverage:

- preview source is `small-library-runtime-safe-export`;
- fixture is fixed to `tests/fixtures/art-library-small-v0.1`;
- preview is `read_only: true`;
- generated preview has 10 assets and deterministic zero-diagnostic bridge / resolver summaries;
- preview generation does not mutate the runtime metadata artifact;
- out-of-scope runtime metadata paths fail closed before preview serialization;
- maker-api service returns the same safe preview;
- preview assets do not include `technical.source_path`;
- serialized preview does not include raw sidecar-only fields or production/default / machine-local paths.

## Validation

```bash
npx vitest run tests/contracts/art-asset-workbench-preview.test.ts
npm run typecheck:root
npm run test:contracts
npm test
npm run typecheck
git diff --check
```

Completed validation:

```bash
npx vitest run tests/contracts/art-asset-workbench-preview.test.ts
npm run typecheck:root
npm run test:contracts
npm run typecheck
npm test
curl -s http://localhost:3000/api/art-assets/preview/small-library
Playwright smoke against http://127.0.0.1:5173/
git diff --check
```

Result:

- Focused Workbench preview contract passed: 4 tests.
- Root typecheck passed.
- Contract suite passed: 21 files, 197 tests.
- Full typecheck passed for root, maker-api and maker-workbench.
- Full test suite passed: contracts 21 files / 197 tests, workspace 12 files / 125 tests.
- API smoke passed for `GET /api/art-assets/preview/small-library`: `ok: true`, 10 assets, `read_only: true`, 0 bridge diagnostics, 0 resolver diagnostics, no exposed `source_path` on preview asset technical data.
- Workbench Playwright smoke passed: after generating a project, `Small library preview`, `Ready`, and safe thumbnail path text rendered with no console/page errors.
- `git diff --check` passed.

## Review Gate

P0:

- sensitive fields exposed;
- preview mutates metadata;
- preview changes runtime/default behavior;
- large library touched.

P1:

- source of truth unclear;
- field allowlist incomplete;
- diagnostics semantics unclear.

P2:

- no read-only test;
- no sensitive-field exclusion test;
- no docs update.

P3:

- wording, naming, formatting, cross-link cleanup.

## Review Result

- Oracle review completed after one P1 fix pass: P0/P1/P2/P3 findings none.
- First Oracle review found a P1 because preview paths were not fail-closed to the small fixture root. The implementation now validates runtime artifact `source_path` / `thumbnail_path` before constructing candidates, diagnostics or DTO output, and the negative contract test covers `assets/asset-packs/large-library/...` fail-closed behavior without leaking the raw path or mutating the artifact.
- Oracle复审 confirmed the P1 is closed, no sensitive path / large-library / default behavior / QA verdict / docs consistency issues remain, and Step 12B can enter the commit gate.
