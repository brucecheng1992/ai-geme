# Asset Semantic Large Library Step 13C-A Batch Zero Gate

最新维护时间：2026-06-13

## Purpose

Step 13C-A gates the first actual batch-zero import from the previously inventoried Kenney Pirate Kit archive.

This step is not the import itself. It is docs-only and does not extract assets, import assets, create sidecar metadata, generate thumbnails, add tests, add scripts, or change runtime/default behavior.

Step 13C-B remains the future implementation step.

## Previous Evidence

- Step 13A defined large-library intake rules: external / ignored source, strict batch limits, metadata coverage, thumbnail policy, license / rights tracking, rollback policy and no runtime/default integration.
- Step 13B preflighted and inventoried Kenney Pirate Kit read-only.
- Step 13B source page evidence recorded `Pirate Kit`, category `3D`, feature `Animation`, `70x` files and license `Creative Commons CC0`.
- Step 13B confirmed the direct archive is a zip of `3154665` bytes, with `379` entries, `370` files, `9` directories and `9335467` uncompressed bytes.
- Step 13B inventory was read-only: no extraction, no import, no sidecar metadata, no thumbnails, no hashing and no image dimension probes.

## Approved Source For Step 13C-B

Step 13C-B may use only this source page and archive:

```yaml
source_page: https://kenney.nl/assets/pirate-kit
archive_url: https://kenney.nl/media/pages/assets/pirate-kit/e6d4bb1525-1771333093/kenney_pirate-kit.zip
license: Creative Commons CC0, based on Step 13B source page evidence
```

Step 13C-B must not use any other source URL, mirror, search result or asset page unless a separate gate approves it.

Step 13C-B may download the exact approved archive again, but only to an ignored temp path under:

```text
artifacts/asset-semantic-large-library-batch-zero/tmp/
```

Step 13C-B may extract only the selected approved archive-relative files to an ignored temp path under:

```text
artifacts/asset-semantic-large-library-batch-zero/extracted-selected/
```

Step 13C-B must not extract the entire archive into the repo.

## Batch Zero Size

General batch-zero policy:

- target: `10` to `30` assets;
- hard max: `50` assets;
- selected assets must be representative and reviewable;
- exact selected archive-relative paths must be listed before import;
- do not import the whole Pirate Kit archive;
- do not import more than the approved batch.

Pirate Kit Step 13C-B policy:

- approved batch-zero asset count: `10`;
- approved runtime-friendly model format: `GLB`;
- approved thumbnails / reference images: use selected existing `Previews/*.png` files only;
- no FBX / OBJ / MTL duplicate format import unless a later gate explicitly changes this.

## Approved Candidate Set

Step 13C-B may import only these archive-relative model files and their selected preview/reference PNGs.

| Asset candidate | Model archive path | Model bytes | Preview archive path | Preview bytes |
| --- | --- | ---: | --- | ---: |
| `barrel` | `Models/GLB format/barrel.glb` | 14092 | `Previews/barrel.png` | 2062 |
| `chest` | `Models/GLB format/chest.glb` | 25240 | `Previews/chest.png` | 2280 |
| `crate` | `Models/GLB format/crate.glb` | 9232 | `Previews/crate.png` | 2352 |
| `cannon` | `Models/GLB format/cannon.glb` | 24024 | `Previews/cannon.png` | 2165 |
| `flag-pirate` | `Models/GLB format/flag-pirate.glb` | 15204 | `Previews/flag-pirate.png` | 1524 |
| `palm-straight` | `Models/GLB format/palm-straight.glb` | 36524 | `Previews/palm-straight.png` | 1596 |
| `rocks-a` | `Models/GLB format/rocks-a.glb` | 27644 | `Previews/rocks-a.png` | 1701 |
| `ship-pirate-small` | `Models/GLB format/ship-pirate-small.glb` | 131464 | `Previews/ship-pirate-small.png` | 1667 |
| `tower-complete-small` | `Models/GLB format/tower-complete-small.glb` | 58412 | `Previews/tower-complete-small.png` | 1926 |
| `boat-row-small` | `Models/GLB format/boat-row-small.glb` | 17616 | `Previews/boat-row-small.png` | 1529 |

Selection rationale:

- archive-relative paths only;
- small GLB files with clear names;
- representative spread across props, structure, nature, vehicle and pirate-themed scene objects;
- no FBX / OBJ / MTL duplicate production formats;
- no license/readme files counted as assets;
- preview/reference PNGs selected only when paired with an approved model candidate.

Step 13C-B must record any deviation from this candidate set as a new gate decision before import.

## Target Layout For Step 13C-B

Recommended fixture layout:

```text
tests/fixtures/art-library-batch-zero-pirate-kit-v0.1/
  README.md
  assets/
  metadata/
  source/
  thumbnails/
```

Step 13C-B may copy only approved selected files into this fixture root:

- model files into `assets/`;
- selected existing preview PNGs into `thumbnails/`;
- license/source evidence into `source/`;
- sidecar metadata into `metadata/`.

Step 13C-B must not use production `assets/asset-packs/`, production/default asset pack loading, or runtime/default wiring.

## Metadata Policy

Every imported asset in Step 13C-B must have one sidecar `.asset.json` in the fixture `metadata/` directory.

Metadata must:

- pass existing metadata validation;
- be compatible with taxonomy v0.2;
- use deterministic `asset_id` values;
- use project-relative paths only;
- avoid absolute local paths;
- include license/source evidence for Kenney Pirate Kit and Creative Commons CC0;
- keep `asset_type`, `semantic`, `gameplay` and `technical` fields explicit;
- keep runtime-safe export allowlist behavior intact;
- avoid internal prompt, seed, review notes, legal notes and source provenance details in runtime-safe output.

Step 13C-B must not generate sidecar metadata for non-selected archive files.

## Thumbnail Policy

Step 13C-B should use existing small preview/reference images from the archive when clearly paired with selected model candidates.

Approved thumbnail/reference sources are the selected `Previews/*.png` paths listed in this gate.

Step 13C-B must not generate thumbnails automatically. Generated thumbnails require a later explicit gate.

If a selected preview fails validation or path safety checks, Step 13C-B must either remove that asset from the batch before commit or stop and request a gate update. Do not patch runtime/default behavior to make an invalid thumbnail pass.

## Step 13C-B Allowed Operations

Step 13C-B may:

- download the exact approved archive to the ignored temp path;
- extract only selected approved files to the ignored selected-extraction temp path first;
- copy only approved selected files into `tests/fixtures/art-library-batch-zero-pirate-kit-v0.1/`;
- create sidecar metadata only for selected imported assets;
- add README and license/source evidence;
- run metadata validate / export checks;
- run canary / bridge dry-run checks only if Step 13C-B scope includes them and only against the batch-zero fixture.

Step 13C-B must not:

- extract the entire archive into the repo;
- import the whole archive;
- generate metadata for non-selected files;
- generate thumbnails unless a later gate approves it;
- modify production asset packs;
- change runtime/default behavior;
- change resolver behavior;
- change QA / Workbench / Phaser / asset pack loading;
- start production rollout.

## Required Step 13C-B Validation

Step 13C-B must run:

```bash
npm run metadata:validate -- tests/fixtures/art-library-batch-zero-pirate-kit-v0.1/metadata
npm run metadata:validate -- --json tests/fixtures/art-library-batch-zero-pirate-kit-v0.1/metadata
npm run metadata:validate -- --check-paths tests/fixtures/art-library-batch-zero-pirate-kit-v0.1/metadata
npm run metadata:export-runtime -- --json tests/fixtures/art-library-batch-zero-pirate-kit-v0.1/metadata
npm run test:contracts
npm test
npm run typecheck
git diff --check
```

Step 13C-B should add focused fixture tests only if needed to prove the batch-zero fixture contract. Any canary / bridge checks must:

- run only against `tests/fixtures/art-library-batch-zero-pirate-kit-v0.1/`;
- not wire into default runtime;
- not touch the large library beyond approved selected files.

## Review Gate

P0:

- Step 13C-A imports or extracts assets;
- Step 13C-A implements code, tests or scripts;
- Step 13C-A changes runtime/default behavior;
- Step 13C-A touches production asset packs;
- Step 13C-A allows full archive import;
- Step 13C-A allows unapproved source URLs;
- Step 13C-A allows assets without sidecar metadata;
- Step 13C-A allows absolute local paths;
- Step 13C-A allows repair writeback;
- Step 13C-A implies production rollout is complete.

P1:

- batch-zero source is unclear;
- selected file policy is unclear;
- target layout is unclear;
- metadata policy is unclear;
- thumbnail policy is unclear;
- validation requirements are unclear;
- docs imply runtime/default integration is complete.

P2:

- no Step 13B evidence summary;
- no hard max batch size;
- no explicit no-whole-archive-import rule;
- no plan / review log update;
- no Step 13C-B boundary;
- no rollback / deletion policy for failed import.

P3:

- naming issues;
- formatting issues;
- cross-link cleanup;
- wording issues.

## Rollback / Failure Policy

If Step 13C-B import fails validation:

- remove the batch-zero fixture changes;
- do not keep partial imported assets;
- do not keep invalid sidecars;
- do not commit generated artifacts;
- do not patch runtime/default behavior to make invalid assets pass.

Step 13C-B rollback is a normal git revert or branch cleanup of the fixture changes. It must not delete source archives outside ignored temp artifacts.

## Step 13C-B Boundary

Step 13C-B is future implementation. It may start only after this Step 13C-A gate is committed and reviewed.

Step 13C-B remains separate from:

- runtime/default integration;
- production asset pack rollout;
- resolver behavior changes;
- QA / Workbench / Phaser behavior changes;
- repair writeback.

## Step 13C-A Validation And Review

Local validation passed for this branch snapshot:

```bash
git diff --check
git status --short --branch
git diff --name-only
find tests/fixtures/art-library-batch-zero-pirate-kit-v0.1 artifacts/asset-semantic-large-library-batch-zero -maxdepth 3 -print 2>/dev/null || true
```

Validation results:

- `git diff --check`: passed.
- `git status --short --branch`: only allowed docs changes and the new Step 13C-A gate document.
- `git diff --name-only`: only allowed existing docs changed.
- fixture / artifact absence check: no output; no batch-zero fixture, extraction temp directory or generated artifacts were created.

Sage/Oracle review passed:

- P0/P1/P2: none.
- P3: initial review noted this section and the review log still said validation / review pending after local validation had run. This was updated before commit.
