# Art Production Quality Gates

Production art batches must declare a reusable quality gate profile. The current profile is:

```text
ProductionCleanSideRunnerV1
```

This profile was introduced after Batch 002b. Batch 002b proved that the ChiYan direction and side-scrolling run-and-gun format were viable, but it also exposed production blockers: watermark-like marks, fake text, logo/signature artifacts, title-card layout, and some character/enemy outputs that were still too splash-art or 3/4-view.

## ProductionCleanSideRunnerV1

`ProductionCleanSideRunnerV1` applies to ChiYan side-scrolling run-and-gun production batches, starting with Batch 002c.

Automated checks include:

- DSL path exists in the manifest.
- DSL hash exists in the manifest.
- Every task records `promptTemplateId`.
- Every task records `compiledPromptHash`.
- Every task can be traced back to the source DSL.
- Batch declares `gameFormat: side_scrolling_run_and_gun`.
- Prompts contain side-view / side-on constraints.
- Prompts contain side-scrolling and run-and-gun constraints.
- Prompts contain no text / logo / watermark / signature constraints.
- `reviewState` is `pending_human_review`.
- `autoApproval` is `false`.
- `autoSelection` is `false`.

Human review is still required for:

- whether the image actually contains text
- whether the image actually contains logo-like marks
- whether the image actually contains a watermark
- whether the image actually contains a signature
- whether the image actually contains a corner mark or footer
- whether the image actually contains fake text
- whether UI images contain fake labels
- whether side-view is strict enough
- whether gameplay-scale readability is sufficient
- whether character proportions are animation-ready
- whether backgrounds can be separated into parallax layers
- whether UI images truly avoid readable labels

The gate checks prompt, manifest, and review requirements. It does not claim to detect image content automatically.

## Prompt Compliance Is Not Image Compliance

The combined Batch 002c preflight can automatically verify prompt, manifest, and source-DSL constraints. `ProductionCleanSideRunnerV1` evaluates the prompt and manifest portion; the Batch 002c DSL validator separately rejects generic-fantasy fallback before the profile runs:

- DSL exists.
- DSL hash exists.
- Prompt lineage exists.
- No generic fantasy fallback is allowed.
- Side-scrolling run-and-gun constraints are present.
- No text / logo / watermark / signature prompt constraints are present.
- `autoApproval` is `false`.
- `autoSelection` is `false`.
- `reviewState` is `pending_human_review`.

It cannot guarantee that the generated image actually contains no text, logo, watermark, signature, corner mark, footer, or fake UI label.

Batch 002c is the concrete case: automated prompt/manifest checks returned `pass`, but image content human review failed for production approval. The batch remains useful as diagnostic/reference material, but its production approval status is `production_blocked`.

Production approval must therefore depend on an `ImageContentGate` outcome:

- `manual_review_required`: generated assets are waiting for human review.
- `manual_failed`: image content review failed; the batch or asset cannot be production approved.
- `manual_passed`: image content review passed and production approval may proceed if other gates also pass.

Under the current batch-level review schema, `production_approved` also requires at least one approved asset and no asset left in `selected`, `needs_revision`, or `rejected`. A workflow that wants to approve only a subset must first introduce an explicit selected-deliverables contract instead of silently treating unresolved candidates as a clean batch.

Any asset containing actual text, fake text, logo, watermark, signature, corner mark, footer, or fake UI label must be `rejected` or `needs_revision`; it cannot be `approved`.

The manifest `blockingIssues` field contains only failures produced by the current automated evaluation. Potential human-review issue categories remain in the profile/check metadata and do not appear as active blockers while the prompt gate passes.

Future OCR or vision post-checks may assist review, but until such a pipeline exists and is validated, image-content compliance remains a manual gate.

## Production Status Model

Production review uses five separate dimensions. None may be inferred from generated-asset counts alone:

- `GenerationExecutionStatus` records only whether execution was skipped, failed before/provider-side, or completed.
- `promptGateStatus` records the persisted review receipt's `passed` / `failed` prompt result; it adapts the shared gate's `pass` / `fail` wording without changing that existing contract.
- `ImageContentGateStatus` records pending, failed, manual-passed, or validated automated-passed image-content review.
- `ProductionApprovalStatus` remains `pending_human_review`, `production_blocked`, or `production_approved`.
- `ProductionClosureStatus` makes open review, blocked closure, and approved closure explicit.

`generation_completed` and prompt `passed` never imply production approval. Pending human review maps to `open_pending_review`. A consistent explicit review outcome maps `production_blocked` to `closed_blocked`; this is a valid blocked closeout, not production success. `closed_approved` requires image-content pass, manifest-owned expected-asset coverage, explicit approved outcomes for the full set, and no selected or blocking asset.

Provider-connectivity smoke follows the same boundary. The ArtTask shared-path smoke can record `generation_completed`, but it always remains `pending_human_review` / `open_pending_review`, never creates selected or approved review decisions, and never feeds its output into formal asset selection. Same-run connectivity evidence is scoped to the exact executed HEAD; any later code commit invalidates that evidence and requires a new controlled smoke.

`evaluateArtBatchReviewOutcome` receives expected asset ids separately from the human-review receipt. This prevents a receipt from authorizing its own coverage. Unknown ids, missing required coverage, selected/approved list mismatches, blocking reasons, or inconsistent approval/closure claims fail closed.

## Runtime Review Input Contract

Compile-time TypeScript types do not replace a runtime input contract. Persisted review JSON must pass `parseArtBatchReviewOutcomeJson` and its strict Zod schema before it can reach `evaluateArtBatchReviewOutcome`; `JSON.parse` alone proves only JSON syntax. Malformed JSON, missing or mistyped fields, illegal enum values, invalid nested/array shapes, and unknown fields fail closed with a structured `BLOCKED` diagnostic. Parser failures must not be swallowed and reclassified as ordinary art-quality findings.

The structured parser diagnostic records a stable error code, input source, fixture id, parser stage, Zod issue path/code, expected type, actual runtime type, and failure kind without echoing input values. The Zod schema is the single runtime shape authority and is compile-time checked against the public `ArtBatchReviewOutcome` type.

Module responsibilities remain deliberately narrow:

- `scripts/art-quality-gates.ts` owns the quality-gate profile, prompt/manifest checks, public status types, and the compatibility re-exports.
- `scripts/art-production-status.ts` owns the strict runtime schema/parser and review-outcome approval/closure derivation.

The original `scripts/art-quality-gates.ts` import path remains supported for the schema, parser, evaluator, and public types. The extracted module uses type-only imports back to the public contract, so it does not create a runtime import cycle or a second schema source of truth. This extraction is structural only: it does not change provider routing, live flags, CLI command names, or generated-asset behavior.

## Asset-Type Generation Strategy

### Character And Enemy Concepts

Character and enemy concepts can continue using image providers for candidates, but they require human inspection before production approval.

Preferred outputs are isolated sprite-candidate concepts:

- strict side-view / side-on pose
- gameplay-scale readable silhouette
- animation-ready proportions
- no poster layout
- no concept-sheet title area
- no text, logo, watermark, signature, footer, or corner mark

Image provider output is acceptable as exploratory source material until human review passes production gates.

### Skill Icons

Skill icons should prefer deterministic vector/glyph production.

If an image provider is used for exploration, the target must be:

- isolated glyph only
- no frame
- no card
- no badge
- no character
- no lettering
- no numbers
- no logo
- no watermark

Provider-generated icons with card frames, badge layouts, fake text, logo marks, corner marks, signatures, or watermark-like artifacts must not be approved.

### UI Concepts

Final HUD output should not be generated directly by an image provider.

Production HUD should use deterministic SVG/HTML/React layout for bars, skill slots, meters, progress indicators, and placeholders. Image provider output can be used as moodboard material only and cannot be directly production-approved if it contains fake labels, decorative typography, fake English, fake Chinese, letters, numbers, logo marks, or watermark-like artifacts.

## Required Production Batch Declaration

Every new production batch must declare a profile:

```json
{
  "qualityGateProfile": "ProductionCleanSideRunnerV1",
  "qualityGateVersion": "1.0"
}
```

If a future production batch omits `qualityGateProfile`, it must fail closed before provider calls.

## Compatibility & Cutover

| Check | Required answer |
| --- | --- |
| Producer change | Added explicit generation-execution and production-closure states, persisted review status fields, manifest-owned expected-asset binding, and candidate-only review-index disclosures. |
| Consumer list | The strict parser and `evaluateArtBatchReviewOutcome` in `scripts/art-production-status.ts`, the compatibility exports in `scripts/art-quality-gates.ts`, the Batch 002c manifest/index/summary builders, contract tests, and human review docs consume and act on the new fields. |
| Compatibility type | NEW_CONSUMER_REQUIRED |
| Authority | `ProductionCleanSideRunnerV1` defines prompt/review requirements; manifest-owned expected asset ids plus the explicit human review outcome determine derived approval and closure. |
| Legacy strategy | Historical generated artifacts remain read-only and are not rewritten. Existing `pass` / `fail` prompt-gate fields remain supported; new persisted review receipts use the explicit adapter wording. |
| Failure policy | Malformed/shape-invalid persisted review input, missing quality gates, unknown/missing expected assets, mismatched selected/approved ids, blocking reasons, or inconsistent approval/closure claims fail closed. |
| Evidence | Contract tests directly exercise malformed and shape-invalid parser failures, the public compatibility import, legal review outcomes, the evaluator, and Batch 002c future index/fixture/summary consumers without provider calls; automated prompt checks do not establish image-content compliance or approval. |
| Rollback | Disable the opt-in batch runner and stop producing the additive status fields; preserve historical artifacts and review outcomes without rewriting their semantics. |
