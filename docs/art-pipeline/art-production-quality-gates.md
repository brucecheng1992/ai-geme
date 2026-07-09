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

Batch 002c is the concrete case: prompt gates passed, but image content human review failed for production approval. The batch remains useful as diagnostic/reference material, but its production approval status is `production_blocked`.

Production approval must therefore depend on an `ImageContentGate` outcome:

- `manual_review_required`: generated assets are waiting for human review.
- `manual_failed`: image content review failed; the batch or asset cannot be production approved.
- `manual_passed`: image content review passed and production approval may proceed if other gates also pass.

Under the current batch-level review schema, `production_approved` also requires at least one approved asset and no asset left in `selected`, `needs_revision`, or `rejected`. A workflow that wants to approve only a subset must first introduce an explicit selected-deliverables contract instead of silently treating unresolved candidates as a clean batch.

Any asset containing actual text, fake text, logo, watermark, signature, corner mark, footer, or fake UI label must be `rejected` or `needs_revision`; it cannot be `approved`.

The manifest `blockingIssues` field contains only failures produced by the current automated evaluation. Potential human-review issue categories remain in the profile/check metadata and do not appear as active blockers while the prompt gate passes.

Future OCR or vision post-checks may assist review, but until such a pipeline exists and is validated, image-content compliance remains a manual gate.

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
| Producer change | Added reusable production art gate profile and manifest quality-gate fields for production batches. |
| Consumer list | `scripts/art-quality-gates.ts`, Batch 002c runner, contract tests, and human review docs consume the profile. |
| Compatibility type | NEW_CONSUMER_REQUIRED |
| Authority | `ProductionCleanSideRunnerV1` in `scripts/art-quality-gates.ts`. |
| Legacy strategy | Batch 002 and Batch 002b remain historical artifacts; Batch 002c and later production batches declare quality gates. |
| Failure policy | Missing quality gate profile, missing prompt lineage, missing side-runner constraints, or missing human-review state fails closed before provider calls. |
| Evidence | Contract tests cover pass/fail quality-gate behavior without provider calls. |
| Rollback | Disable the new batch flag; historical artifacts remain intact. |
