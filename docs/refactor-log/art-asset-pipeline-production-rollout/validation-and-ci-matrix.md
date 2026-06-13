# Validation and CI Matrix

## Baseline

Docs-only steps:

```bash
git diff --check
```

Code/test steps:

```bash
git diff --check
npm run test:contracts
npm test
npm run typecheck
```

## Metadata Example Gates

```bash
npm run metadata:validate -- assets/metadata/examples
npm run metadata:validate -- --json assets/metadata/examples
npm run metadata:export-runtime -- --json assets/metadata/examples
```

## Small Library Gates

```bash
npm run metadata:validate -- tests/fixtures/art-library-small-v0.1/metadata
npm run metadata:validate -- --json tests/fixtures/art-library-small-v0.1/metadata
npm run metadata:validate -- --check-paths tests/fixtures/art-library-small-v0.1/metadata
npm run metadata:export-runtime -- --json tests/fixtures/art-library-small-v0.1/metadata
```

## Step 10B Focused Gates

```bash
npx vitest run tests/contracts/asset-pack-small-library-bridge-canary.test.ts
npx vitest run tests/contracts/asset-pack-metadata-bridge.test.ts tests/contracts/asset-pack-resolver-diagnostics.test.ts
```

## Step 11 Runtime Integration Gates

Minimum:

```bash
npm run test:contracts
npm test
npm run typecheck
git diff --check
```

Additional requirements:

- flag off equals old behavior;
- flag on loads small fixture only;
- invalid runtime artifact fails closed;
- no large library access;
- no repair writeback.

## Step 12 Preview Gates

Minimum:

```bash
npm run test:contracts
npm test
npm run typecheck
git diff --check
```

Additional requirements:

- preview read-only;
- safe field allowlist;
- no sensitive prompt/seed/legal/review fields;
- diagnostics deterministic.

## Step 13 Large Library Gates

Step 13A docs-only:

```bash
git diff --check
```

Step 13B inventory:

```bash
npm run test:contracts
npm run typecheck
git diff --check
```

Step 13C batch zero:

```bash
npm run metadata:validate -- <batch-zero-metadata-dir>
npm run metadata:validate -- --check-paths <batch-zero-metadata-dir>
npm run metadata:export-runtime -- --json <batch-zero-metadata-dir>
npm run test:contracts
npm test
npm run typecheck
git diff --check
```

Step 13D pipeline dry-run:

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

## Step 14 Production Gates

Step 14A must define rollout-specific commands. Minimum:

```bash
npm run test:contracts
npm test
npm run typecheck
git diff --check
```

Additional requirements:

- runtime flag-off tests;
- runtime flag-on tests;
- performance budget check;
- rollback drill check;
- QA signoff evidence;
- rights/licensing signoff evidence.
