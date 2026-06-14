# Step 13A — Large Library Intake Gate

Status: current docs-only gate. This is the first step that discusses touching the large art library, but it must not inspect or import it.

## Goal

Define storage, licensing, batching, validation, and rollback rules before any large art library inventory or import.

## Required Decisions

- large library location;
- storage mode: repo, Git LFS, or external artifact store;
- allowed formats;
- batch size;
- per-file and total-size limits;
- required metadata coverage before import;
- thumbnail policy;
- rights/licensing tracking;
- sampled asset review owner;
- rollback path;
- failure budget.

## Gate Decisions

Large library location:

- No large-library path is approved in Step 13A.
- Step 13B may start only after the user provides one explicit read-only source location or external artifact reference.
- The source location must be outside production/default runtime paths and must not be copied into the repo during inventory.

Storage mode:

- Default mode: source library remains external or in a local ignored read-only directory.
- Repo storage is forbidden for bulk binaries.
- Git LFS is not approved by this step; it requires a later explicit storage approval.
- Committed outputs from Step 13B may only be small deterministic inventory reports, with no absolute paths and no sensitive provenance details.

Allowed formats for future batch-zero consideration:

- metadata sidecars: `.asset.json`;
- runtime source candidates: `.glb`, `.gltf`, `.png`, `.webp`, `.svg`;
- thumbnails: `.png`, `.webp`;
- unsupported formats must be reported, not converted or imported.

Batch size:

- Step 13B inventory may scan/report only; it imports nothing.
- Step 13C batch zero, if reached, may include at most 10 assets.
- Any expansion beyond batch zero requires Step 13E approval.

Size limits:

- Inventory report must include per-file sizes and aggregate size estimates.
- Batch-zero candidate limit: each source asset must be no larger than 5 MB, each thumbnail no larger than 512 KB, and total batch-zero committed fixture payload no larger than 30 MB unless a later gate explicitly changes the limit.
- Files above limits are excluded from batch zero and reported as over budget.

Required metadata coverage:

- Every imported batch-zero asset must have a sidecar metadata file before import.
- Required sidecar coverage is 100%.
- Missing, invalid, or unvalidated metadata blocks import.
- Runtime-safe export must pass before any runtime / preview / dry-run use.

Thumbnail policy:

- Every batch-zero asset needs a thumbnail before preview/signoff.
- Thumbnails must be relative to the approved batch fixture root.
- Missing thumbnails block preview signoff.

Rights / licensing tracking:

- Unknown-rights assets are forbidden from pipeline import.
- Allowed only if license, commercial-use status, creator/source attribution policy and rights risk are documented in sidecar metadata.
- Rights/legal/source details remain internal metadata and must not be exposed in runtime-safe or Workbench preview output unless a later gate explicitly approves a safe display subset.

Sampled asset review owner:

- Main agent prepares deterministic reports.
- Oracle performs read-only gate review.
- User approval is required before any Step 13C batch-zero import.

Sampling policy:

- Step 13B inventory report must identify a proposed batch-zero candidate set, but must not import it.
- Step 13C batch-zero review must sample 100% of the proposed batch-zero assets.
- If future batches exceed 10 assets, the next gate must define a new sampling policy before expansion.
- Sampled review must include metadata validity, rights/license fields, thumbnail presence, file size, allowed format and runtime-safe path checks.

Rollback path:

- Step 13B rollback is deleting ignored local reports only; no source mutation is allowed.
- Step 13C rollback must remove the batch-zero fixture directory and metadata docs from git in a normal revert commit.
- Production/default rollback remains out of scope until Step 14.

Failure budget:

- Step 13B inventory may report failures but must not fix them.
- Step 13C batch zero has zero tolerance for invalid metadata, unknown rights, unsafe runtime paths, missing thumbnails or over-budget files.
- Any source mutation, production/default path touch, or repair writeback is a P0 stop.

## Not Allowed

- no import;
- no inventory execution;
- no metadata generation;
- no runtime integration;
- no source file mutation;
- no source path probing before the user provides an approved location;
- no bulk binaries in git;
- no rights-unknown asset promotion;
- no QA / Workbench / Phaser / resolver behavior change.

## Step 13B Boundary

If Step 13B is opened, it may only:

- accept one user-provided large-library source location;
- run read-only inventory tooling;
- emit a deterministic report under an ignored or explicitly approved report path;
- summarize counts, formats, sizes, metadata coverage, thumbnail coverage and rights/license coverage;
- report unsupported or over-budget assets without importing or converting them.

Step 13B must not:

- copy source files;
- generate metadata;
- write sidecars;
- mutate source assets;
- import into repo fixtures;
- touch runtime/default paths;
- connect to Workbench / QA / Phaser / resolver behavior.

## Validation

```bash
git diff --check
```

Completed validation:

```bash
git diff --check
```

Result:

- Passed.

## Review Gate

P0:

- imports large library before gate approval;
- commits bulk binaries without policy;
- allows missing sidecar metadata without policy;
- allows unknown-rights assets into pipeline;
- changes runtime/default behavior;
- allows repair writeback.

P1:

- storage policy unclear;
- batch size unclear;
- rights policy unclear;
- validation budget unclear;
- rollback unclear.

P2:

- no review ownership;
- no sampling policy;
- no failure handling;
- no plan/review log update.

P3:

- wording, naming, formatting, cross-link cleanup.

## Review Result

- Oracle review completed: P0/P1/P2/P3 findings none.
- Oracle confirmed Step 13A does not approve, touch, inventory or import any large library; storage, formats, batch/size, metadata, thumbnail, rights, rollback and failure budget are clear; review ownership and sampling policy are clear; Step 13B remains read-only report-only and requires a user-provided source location.
