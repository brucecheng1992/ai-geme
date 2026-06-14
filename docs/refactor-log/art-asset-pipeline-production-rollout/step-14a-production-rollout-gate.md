# Step 14A — Production Rollout Gate

Status: docs-only approval gate.

Latest update: 2026-06-14.

## Purpose

Step 14A gates a future controlled production rollout of the art asset semantic pipeline.

This step does not implement rollout. It does not change runtime/default behavior, production asset packs, resolver behavior, QA, Workbench, Phaser, asset pack loading, metadata sidecars, thumbnails, generated artifacts or tests.

Step 14A answers only:

```txt
Is the current evidence enough to start a limited Step 14B rollout implementation, and under which guards?
```

## Evidence Summary

Current evidence is enough to consider a limited, opt-in Step 14B rollout path. It is not enough for broad/default production rollout.

Evidence already collected:

- metadata schema, controlled vocabulary and validation commands exist;
- runtime-safe metadata export exists and excludes non-runtime provenance fields;
- small library dry-run passed;
- bridge and resolver-adjacent diagnostics exist as pure report-only helpers;
- Pirate Kit batch-zero source was inventoried read-only with Creative Commons CC0 page evidence;
- Pirate Kit batch-zero fixture passed with 10 GLB assets, 10 selected existing previews and 10 metadata sidecars;
- Pirate Kit controlled expansion passed with 20 GLB assets, 20 selected existing previews and 20 metadata sidecars;
- expanded fixture metadata validation, JSON validation, check-path validation and runtime-safe export passed;
- expanded fixture default canary passed: `runnable=20`, `passed=20`, `failed=0`;
- expanded fixture repair-enabled canary passed: `runnable=20`, `passed=20`, `failed=0`, `repair.attemptedCount=0`;
- expanded fixture comparison passed: `ok=true`, `case.total=20`, `default.failed=0`, `repair.failed=0`;
- bridge summary passed where applicable: `ok=true`, `matched_count=20`, `diagnostic_count=0`;
- resolver-adjacent diagnostics passed where applicable: `ok=true`, `requested_count=20`, `resolved_count=20`, `diagnostic_count=0`;
- baseline examples and small fixture metadata validate/export passed after expansion;
- `npm run test:contracts`, `npm test`, `npm run typecheck` and `git diff --check` passed for Step 13E-B;
- runtime/default behavior has not changed;
- resolver behavior has not changed;
- QA / Workbench / Phaser / asset pack loading has not changed;
- production asset packs have not changed;
- generated canary/comparison artifacts remain ignored under `artifacts/`.

## Rollout Scope Decision

Step 14A approves only a limited Step 14B implementation proposal.

Maximum allowed Step 14B scope:

- opt-in / feature-flagged only;
- disabled by default unless a later explicit approval changes this;
- deterministic config, artifact path and fixture selection;
- no broad production asset pack replacement;
- no large-library full rollout;
- no repair-enabled default;
- no source metadata repair or writeback;
- no automatic unsupported semantic promotion;
- no unreviewed asset import;
- no generated thumbnail creation;
- no metadata sidecar mutation;
- no production/default behavior change.

Step 14B must use the already validated Pirate Kit fixture evidence only:

```txt
tests/fixtures/art-library-batch-zero-pirate-kit-v0.1/
approved maximum asset count: 20
approved source/license: Kenney Pirate Kit, Creative Commons CC0
```

Large-library archive bulk loading remains excluded. The 72 unique Pirate Kit model basenames from the full archive remain outside rollout scope except for the 20 committed, validated fixture assets.

## Candidate Rollout Modes

### Mode A: Docs-Only Closeout

- closes the production rollout lane without runtime rollout;
- keeps all runtime/default behavior unchanged;
- uses Step 13E-B evidence only as fixture-validation proof.

### Mode B: Non-Default Feature Flag Path

- creates or uses an explicit off-by-default flag;
- allows only a fixture-backed or runtime-safe artifact-backed path for the approved 20-asset Pirate Kit fixture;
- proves flag off equals current behavior;
- proves flag on affects only the approved scope;
- keeps default gameplay, resolver decisions and production asset packs unchanged.

### Mode C: Limited Internal Preview / QA-Only Path

- exposes the approved runtime-safe artifact only through an internal preview or QA-only surface;
- keeps the default gameplay path unchanged;
- keeps production asset packs unchanged;
- requires explicit owner signoff before any user-visible behavior change.

Recommended Step 14B mode: **Mode B**, with Mode C allowed only if Step 14B needs an internal QA surface to inspect the same approved fixture-backed output.

Mode A remains acceptable if the team decides not to start implementation. Broad/default production rollout is not approved.

## Feature Flag / Guard Policy

Step 14B must define or reuse an explicit opt-in guard with these properties:

- off by default;
- deterministic configuration source;
- narrow approved scope;
- single rollback switch;
- no implicit enablement in local, test, preview or production defaults;
- clear behavior when the approved artifact is missing or invalid.

Step 14B must add tests proving:

- flag off equals current behavior;
- flag on only affects the approved Step 14A scope;
- invalid or missing runtime-safe artifact fails closed;
- rollback switch restores flag-off behavior;
- repair-enabled remains non-default.

## Production Asset Pack Policy

Step 14B must not mutate production/default asset packs.

Allowed:

- consume a generated runtime-safe artifact or fixture-backed output from the approved 20-asset Pirate Kit fixture;
- keep source and license evidence in docs / metadata source fields already validated;
- document exact project-relative paths used by the opt-in path.

Not allowed:

- editing `assets/asset-packs/` production/default packs;
- replacing default local pack contents;
- importing more assets;
- adding metadata sidecars for unreviewed assets;
- moving fixture assets into production pack locations;
- committing generated canary/comparison artifacts.

Any production pack mutation requires a later gate.

## Runtime / Default Behavior Policy

Step 14B must prove:

- default behavior remains unchanged;
- runtime integration is opt-in only;
- resolver decisions remain unchanged unless explicitly guarded by the Step 14B flag and tests;
- repair-enabled remains non-default;
- fallback path still works;
- unsupported assets are not silently promoted;
- metadata repair/writeback remains disabled.

Flag-off behavior is the primary regression boundary. If flag-off behavior changes, Step 14B must stop.

## QA / Workbench / Phaser Policy

Step 14B should avoid production runtime changes.

Step 14B may touch QA, Workbench, Phaser runtime or asset pack loading only if all of these are true:

- the change is internal or opt-in;
- the default gameplay path remains unchanged;
- the change is required to inspect the approved fixture-backed output;
- tests prove flag-off behavior is unchanged;
- rollback removes the opt-in surface or restores previous behavior.

Step 14B must not turn QA preview evidence into default gameplay behavior.

## Rollback Policy

Step 14B must document and test rollback before merge.

Rollback must be possible by:

- disabling the feature flag / opt-in guard;
- removing or ignoring generated runtime-safe artifact references;
- restoring previous config defaults;
- leaving production asset packs untouched;
- leaving source metadata untouched.

Rollback confirmation must include:

- flag-off equivalence test;
- invalid/missing artifact fails-closed test;
- fallback-path test;
- `git diff --check`;
- the focused tests added by Step 14B.

Rollback is mandatory if any rollout metric or validation shows:

- default behavior changed unexpectedly;
- asset count mismatch;
- metadata validation failure;
- runtime export failure;
- canary failure;
- comparison failure;
- bridge or resolver-adjacent diagnostic error;
- check-path failure;
- absolute path leakage;
- generated artifact accidentally tracked;
- performance or load regression above the Step 14B budget;
- unreviewed asset or metadata change.

## Failure Budget

Step 14B must stop before merge on any P0 failure below:

- metadata validation failure;
- runtime-safe export failure;
- default canary failure;
- repair-enabled canary failure;
- comparison failure;
- bridge diagnostic error on the approved green path;
- resolver-adjacent diagnostic error on the approved green path;
- `--check-paths` failure;
- absolute local path in committed docs, metadata or runtime-safe output;
- generated artifact tracked outside approved fixture files;
- performance regression beyond the documented budget;
- asset count mismatch from the approved 20-asset fixture;
- production asset pack mutation;
- runtime/default behavior change while the flag is off;
- repair-enabled default;
- metadata repair/writeback;
- unreviewed third-party asset or unresolved rights note.

## Performance / Size Policy

Step 14B must document:

- approved asset count;
- runtime-safe artifact size;
- total referenced fixture size;
- largest referenced asset;
- loading impact;
- bundle/package impact if any;
- whether any runtime scan is introduced.

Budgets inherited from Step 13E-B evidence:

```txt
approved asset count: 20
total committed fixture size: 719199 bytes
largest imported file: tests/fixtures/art-library-batch-zero-pirate-kit-v0.1/assets/ship-pirate-small.glb, 131464 bytes
```

Step 14B must not introduce large-library bulk loading or unbounded runtime scans.

## Rights / License Policy

Pirate Kit evidence is Creative Commons CC0 based on the Step 13B source page and Step 13C/13E fixture records.

Step 14B must preserve:

- source page evidence;
- license evidence;
- committed fixture source references;
- runtime-safe output without unresolved rights notes;
- no unreviewed third-party assets.

If rights evidence is missing or ambiguous for any asset, Step 14B must stop.

## Step 14B Allowed Boundary

Step 14B may implement only:

- non-default feature flag path;
- fixture-backed or runtime-safe artifact-backed use of the approved 20-asset Pirate Kit fixture;
- deterministic tests for flag off, flag on, rollback and invalid artifact behavior;
- focused docs update recording validation and review results.

Step 14B may not:

- enable default rollout broadly;
- import more assets;
- mutate production packs;
- make repair-enabled default;
- repair or write back metadata;
- use large-library bulk scan;
- bypass validation, export, canary or compare gates;
- silently promote unsupported semantics;
- touch runtime/default behavior outside the explicit flag guard.

## Required Step 14B Validation

Step 14B must define exact focused commands after the implementation shape is known. Minimum required gates:

```bash
npx vitest run <focused Step 14B test file(s)>
npm run metadata:validate -- tests/fixtures/art-library-batch-zero-pirate-kit-v0.1/metadata
npm run metadata:validate -- --json tests/fixtures/art-library-batch-zero-pirate-kit-v0.1/metadata
npm run metadata:validate -- --check-paths tests/fixtures/art-library-batch-zero-pirate-kit-v0.1/metadata
npm run metadata:export-runtime -- --json tests/fixtures/art-library-batch-zero-pirate-kit-v0.1/metadata
npm run qa:asset-semantic:canary -- --fixture tests/fixtures/art-library-batch-zero-pirate-kit-v0.1
npm run qa:asset-semantic:canary -- --repair-enabled --fixture tests/fixtures/art-library-batch-zero-pirate-kit-v0.1
npm run qa:asset-semantic:compare -- --default-summary <default-summary.json> --repair-enabled-summary <repair-summary.json> --out <comparison-summary.json>
npm run test:contracts
npm test
npm run typecheck
git diff --check
```

Step 14B must additionally prove flag-off equivalence and rollback behavior with focused tests. If any command fails, stop and report before attempting a broader rollout.

## Step 14A Validation

Step 14A is docs-only. Required validation:

```bash
git diff --check
git diff --name-only
```

## Review Gate

P0:

- Step 14A implements code, tests or scripts;
- Step 14A changes runtime/default behavior;
- Step 14A modifies production asset packs;
- Step 14A starts Step 14B implementation;
- Step 14A permits broad production rollout without feature flag;
- Step 14A permits repair-enabled default;
- Step 14A permits metadata repair/writeback;
- Step 14A permits unbounded large-library scan;
- Step 14A permits unresolved licensing into rollout;
- Step 14A permits unreviewed asset import;
- Step 14A commits generated artifacts.

P1:

- rollout mode unclear;
- feature flag / guard policy unclear;
- production pack policy unclear;
- default behavior policy unclear;
- rollback policy unclear;
- QA / Workbench / Phaser boundary unclear;
- performance budget unclear;
- failure budget unclear.

P2:

- evidence summary incomplete;
- asset count or fixture scope unclear;
- rights/license policy missing;
- Step 14B allowed boundary missing;
- no plan/review log update.

P3:

- wording, naming, formatting or cross-link cleanup.
