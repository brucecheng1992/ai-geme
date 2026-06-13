# Step 12A — Workbench / QA Preview Gate

Status: current docs-only gate. Step 11C is complete and the non-default runtime canary lane is closed.

## Goal

Define whether and how small art library metadata, bridge diagnostics, and runtime-safe metadata should be previewed in internal tooling.

## Allowed

- preview scope document;
- user stories;
- data-source boundaries;
- safe field allowlist;
- read-only policy;
- P0/P1/P2/P3 gate;
- Step 12B implementation boundary.

## Not Allowed

- code changes;
- UI changes;
- runtime changes;
- QA runner changes;
- production/default integration;
- large library access.

## Required Decisions

- Is Workbench preview required before large library rollout?
- Is QA CLI/report enough?
- What asset fields are safe to display?
- Are thumbnails displayed?
- Are diagnostics displayed?
- Is the preview read-only?
- What is the source of truth: sidecars, runtime-safe export, or bridge summary?

## Decisions

- Workbench preview is required before large-library rollout, but only after this docs-only gate is reviewed.
- QA CLI/report is necessary evidence but not sufficient for human preview signoff; Step 12B may add an internal preview-only surface for the small fixture.
- The preview must be read-only. It must not mutate metadata, repair manifests, write generated artifacts, or change runtime/default verdicts.
- Source of truth for preview is runtime-safe export plus deterministic bridge / resolver diagnostics summaries.
- Sidecar metadata may be used only as input to the existing runtime-safe export path; Workbench / QA preview must not read or render raw sidecar-only fields directly.
- Thumbnails may be displayed only from the small fixture runtime-safe `technical.thumbnail_path`, and only if the path stays under `tests/fixtures/art-library-small-v0.1/`.
- Diagnostics may be displayed only when they are deterministic and sanitized.
- Step 12B, if executed, remains small-fixture-only and preview-only.

## Safe Field Allowlist

Asset-level fields allowed for preview:

- `asset_id`
- `asset_type`
- `title`
- `description`
- `status`
- `version`
- `semantic.tags`
- `semantic.visual_style`
- `semantic.world`
- `semantic.mood`
- `gameplay.role`
- `gameplay.affordances`
- `gameplay.allowed_contexts`
- `gameplay.blocked_contexts`
- `technical.file_format`
- `technical.thumbnail_path`
- `technical.texture_resolution`
- `technical.polycount_lod0`
- `technical.platform_budget`
- `relations.variant_of`
- `relations.compatible_with`

Artifact-level fields allowed for preview:

- `runtime_metadata_version`
- `generated_by`
- `asset_count`

Diagnostic fields allowed for preview:

- stable diagnostic code;
- severity;
- asset id;
- JSON path;
- sanitized message;
- sanitized relative fixture path only when produced by an existing safe diagnostic helper.

## Sensitive Field Blocklist

The preview must not expose:

- prompt text;
- seed values;
- raw AI generation parameters;
- internal workflow owner, reviewer or review notes;
- rights / legal / creator / third-party source details;
- embedding input;
- absolute local paths;
- production/default asset pack paths;
- large-library paths;
- raw sidecar JSON.

## Step 12B Boundary

If Step 12B is opened, it may only:

- add preview-only internal visibility for the small fixture;
- use runtime-safe export and bridge / diagnostics summaries as input;
- render the safe allowlist fields above;
- prove sensitive fields are absent with focused tests;
- prove preview is read-only;
- prove default runtime behavior is unchanged.

Step 12B must not:

- use large-library assets;
- read raw sidecar metadata directly in UI / QA preview;
- expose rights, workflow, search or AI generation fields;
- alter `PLAYABLE` / `QA PASSED` verdict semantics;
- wire the preview into production/default runtime behavior.

## Non-Goals

- No code, UI, runtime, QA runner or Workbench changes in Step 12A.
- No large-library access.
- No production/default integration.
- No metadata mutation.
- No repair writeback.
- No QA signoff claim.
- No AI image provider integration.

## Privacy / Sensitivity Note

Runtime-safe export is the only approved source for previewable asset metadata because it intentionally removes prompt, seed, rights, workflow, review note, third-party source and embedding fields. Any future preview implementation must keep this allowlist explicit and must fail closed when a requested field is not on the allowlist.

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

- implements code;
- changes production/default behavior;
- exposes internal/provenance-sensitive fields;
- touches large library;
- implies QA signoff is complete.

P1:

- preview source unclear;
- safe display fields unclear;
- read-only policy unclear;
- diagnostics semantics unclear.

P2:

- no non-goals;
- no plan/review log update;
- no privacy/sensitivity note.

P3:

- wording, naming, formatting, cross-link cleanup.

## Review Result

- Oracle review completed: P0/P1/P2/P3 findings none.
- Oracle confirmed this remains docs-only, the preview source is runtime-safe export plus deterministic diagnostics summaries, raw sidecar direct rendering is forbidden, the allowlist/blocklist is explicit, read-only policy is clear, diagnostics must be deterministic and sanitized, Step 12B remains small-fixture-only preview-only, and rollout indexes are consistent.
