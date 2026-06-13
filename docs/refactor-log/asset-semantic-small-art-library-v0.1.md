# Asset Semantic Small Art Library v0.1 Intake Gate

最新维护时间：2026-06-13

## 1. Purpose

Step 9A defines the review gate for the first small real-resource dry-run after Step 8d.
Step 9B imports the first small fixture subset and sidecar metadata under that gate.

This small art library is a canary / dry-run input for validating metadata, export, canary reporting, and future bridge boundaries. It is not production/default runtime integration, and it must not change resolver selection, repair behavior, Phaser loading, QA aggregation, Workbench UI, or default asset pack loading.

Step 9A is docs-only. It imports no assets, creates no sidecar manifests, adds no tests, and wires no runtime consumers.
Step 9B imports a 10-asset fixture only; it still wires no runtime consumers.

## 2. Relationship To Previous Steps

- Step 8a established taxonomy v0.2 for currently unsupported canary wording.
- Step 8b promoted supported canary fixtures into the default canary set.
- Step 8c expanded the small canary pack to v0.2 with 18 runnable cases.
- Step 8d established deterministic comparison between default and repair-enabled canary summaries.
- Step 9A now defines the gate for a small real art library dry-run before any real art library import.

## 3. Small Art Library Definition

A Step 9 small art library is intentionally small:

- Target size: 10 to 30 assets.
- Maximum size: 50 assets.
- Anything above 50 assets is not Step 9 and must move to a separate large-library rollout gate.

Allowed asset spread:

- Character / creature.
- Prop.
- Environment.
- UI / HUD / icon.
- Material / texture.
- Vehicle or weapon-like concept only when already safe under current taxonomy and metadata policy.
- 1 to 3 edge cases for semantic mismatch / unsupported-boundary review.

The library does not need to cover every category if real resources are not available. A smaller but well-described set is preferred over a broad dump.

## 4. Proposed Layout

Default recommended location:

```txt
tests/fixtures/art-library-small-v0.1/
  README.md
  assets/
  metadata/
  thumbnails/
```

Rationale:

- Step 9 is a test/dry-run fixture, not production asset ingestion.
- Existing asset semantic canary inputs already live under `tests/fixtures`.
- Keeping the small library under `tests/fixtures` makes it visibly non-production and easier to exclude from runtime/default loading.

Alternative location:

```txt
assets/canary/art-library-small-v0.1/
  README.md
  assets/
  metadata/
  thumbnails/
```

Use `assets/canary/art-library-small-v0.1` only if the repository first establishes an asset-canary convention under `assets/canary`. Step 9A does not create either directory; Step 9B must create the chosen layout only when it imports the small fixture.

## 5. Binary Asset Policy

Step 9 must avoid a production art dump.

Rules:

- Do not commit large binary art files to normal git history.
- Use small fixture-sized assets only.
- Use Git LFS only if this repository already adopts it and the team explicitly agrees before Step 9B.
- Otherwise prefer placeholders, tiny fixtures, or external artifact references documented in the fixture README.
- Do not import the large asset library.
- Do not add generated runtime export artifacts.

Step 9B must set exact file-size limits before import if they are still unknown. Minimum required policy before import:

- Per-file size limit.
- Total fixture directory size limit.
- Allowed binary formats.
- Whether thumbnails count toward the total limit.
- How external artifact references are represented when binaries are not committed.

Until those limits are documented, Step 9B must stop before importing assets.

## 6. Metadata Requirements

Every Step 9B asset must have a sidecar metadata manifest before it enters validation.

Required metadata properties:

- Passes existing metadata validation.
- Compatible with taxonomy v0.2.
- Safe for runtime export allowlist.
- Contains no internal prompt, seed, legal review notes, review workflow notes, or third-party source details in runtime output.
- Contains no absolute local paths.
- Uses deterministic `asset_id`.
- Declares explicit `asset_type`.
- Provides semantic, gameplay, and technical coverage.
- Keeps source-of-truth metadata separate from generated runtime export artifacts.

Step 9B may add sidecar metadata for the small fixture only. It must not start Metadata Step 4A, asset pack bridge, resolver diagnostics, or runtime/default integration.

## 7. Validation / Export / Canary Requirements

Step 9B / Step 9C must document and run the narrowest relevant command set for the chosen library path:

```bash
npm run metadata:validate -- <small-library-metadata-dir>
npm run metadata:validate -- --json <small-library-metadata-dir>
npm run metadata:export-runtime -- --json <small-library-metadata-dir>
npm run qa:asset-semantic:canary -- --fixture <small-library-canary-briefs.json>
npm run qa:asset-semantic:canary -- --repair-enabled --fixture <small-library-canary-briefs.json>
npm run qa:asset-semantic:compare -- --default-summary <default-summary.json> --repair-enabled-summary <repair-summary.json> --out <comparison.json>
```

The current canary runner already exposes `--fixture <path>` for canary brief input. If the small art library needs a different input shape than canary briefs, Step 9B or Step 9C may add a narrow canary-only input option. That option must:

- Be explicitly canary-only.
- Not alter default canary behavior.
- Not alter production/default runtime loading.
- Not alter resolver default decisions.
- Not make repair-enabled behavior default.
- Produce deterministic summary / comparison output.

If the existing `--fixture` path is insufficient and the next step is not allowed to add the narrow option, the step must stop and report the missing canary-only capability instead of wiring runtime/default consumers.

## 8. Runtime / Default Non-Goals

The small art library dry-run does not enter production/default runtime.

Explicit non-goals:

- No asset pack loading change.
- No Phaser runtime loading change.
- No Workbench integration.
- No resolver default decision change.
- No QA aggregation or status behavior change.
- No repair-enabled default change.
- No source metadata auto-repair writeback.
- No Metadata Step 4A asset pack bridge / resolver diagnostics.
- No large asset library rollout.
- No database, DAM, vector index, image embedding, Unity / Unreal / glTF / USD export, or C2PA pipeline.

## 9. Future Step Boundaries

Step 9B: small art library metadata intake / fixture import.

- Import or create the small art library fixture.
- Add sidecar metadata.
- Keep target size 10 to 30 assets and absolute maximum 50 assets.
- Validate metadata.
- Do not wire to runtime/default asset loading.
- Do not start Metadata Step 4A.
- Do not import a large resource library.

Step 9B selected source:

- Kenney Cube Pets source page: `https://kenney.nl/assets/cube-pets`
- Download package: `https://kenney.nl/media/pages/assets/cube-pets/44e58e945f-1774520254/kenney_cube-pets_1.0.zip`
- License: Creative Commons Zero, CC0.
- Imported fixture path: `tests/fixtures/art-library-small-v0.1/`.
- Imported subset: `animal-bee`, `animal-bunny`, `animal-cat`, `animal-crab`, `animal-dog`, `animal-fish`, `animal-fox`, `animal-lion`, `animal-penguin`, `animal-tiger`.
- Imported formats: `.glb` assets, `.png` thumbnails, `.asset.json` sidecars, `source/LICENSE.txt`, and fixture README.
- Excluded formats / files: the remaining Cube Pets assets, FBX, OBJ, overview / preview / URL helper files, downloaded zip, and generated runtime export artifacts.
- Size policy: target 10 to 30 assets, maximum 50 assets, preferred total <= 5 MB, hard total <= 10 MB, preferred per-file <= 512 KB, hard per-file <= 1 MB, thumbnails <= 256 KB and counted in total.

Step 9C: dry-run validation / canary / comparison.

- Run metadata validate / JSON validate / runtime-safe export over the small library.
- Run default canary, repair-enabled canary, and comparison over the small library or documented canary-only equivalent.
- Generate deterministic dry-run report.
- Do not wire to runtime/default asset loading.

Later separate gates:

- Metadata Step 4A / 4B asset pack bridge / resolver diagnostics.
- Any real runtime/default loading integration.
- Large asset library rollout.

## 10. Review Gate Severity

P0:

- Step 9A imports real assets or large art library data.
- Step 9A changes runtime/default asset loading behavior.
- Step 9A starts Metadata Step 4A bridge/resolver work.
- Step 9A implies the small library is production-ready.
- Step 9A allows large binary assets without storage policy.
- Step 9A allows assets without sidecar metadata.
- Step 9A allows repair-enabled source writeback.
- Step 9A allows the small library to bypass validation/export/comparison gates.

P1:

- Small library size limit is unclear.
- File layout is unclear.
- Binary asset policy is unclear.
- Metadata requirements are unclear.
- Validation/export/canary requirements are unclear.
- Docs imply runtime integration is complete.
- Step 9B / Step 9C boundaries are ambiguous.

P2:

- No explicit non-goals.
- No large asset library exclusion statement.
- No review log update.
- No asset semantic plan update.
- No migration from Step 8d to Step 9 explained.
- No criteria for stopping if external canary input support is missing.

P3:

- Naming issues.
- Formatting issues.
- Cross-link cleanup.
- Small wording issues.

## 11. Status

- Step 8d: done.
- Step 9A: done.
- Step 9B: current / done after review and commit.
- Step 9C: not started; next later step is small library dry-run validation / canary / comparison.
- Metadata Step 4A: parked.
- Large asset library: parked.
