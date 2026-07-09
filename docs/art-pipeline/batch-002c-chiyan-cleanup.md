# Batch 002c ChiYan Production-Candidate Cleanup Generation Batch

Batch 002c is a selective production-candidate cleanup generation batch after Batch 002b. It does not delete, overwrite, or rerun Batch 002 or Batch 002b.

Batch 002b established `side_scrolling_run_and_gun` direction evidence, but human review found production blockers:

- watermark / logo / fake text / signature / title-card artifacts
- some character and enemy outputs still reading as 3/4 splash art instead of strict side-view gameplay assets

Batch 002c keeps the same ChiYan side-runner direction and focuses on cleaner production candidates.

## Scope

- Uses the existing MiniMax `ArtProviderAdapter`.
- Uses `ArtTaskRunner -> ProviderResolver -> ArtProviderAdapter -> MiniMax adapter`.
- Keeps `ArtTask` provider-agnostic.
- Records concrete provider/model details in `ProviderCall`.
- Uses `ProductionCleanSideRunnerV1` as the production quality gate.
- Does not add providers, routing, 3D, sprite sheets, animation, skeletons, or game-engine import.

## DSL Source

Batch 002c uses:

```text
docs/art-pipeline/dsl/chiyan-battlefield-side-runner-cleanup.dsl
```

The DSL must contain:

- `LIVE_GENERATION_ALLOWED true`
- side-scrolling / run-and-gun constraints
- strict side-view / side-on constraints
- cleanup constraints for watermark, logo, fake text, signature, title, footer, corner marks, letters, and numbers

Fixture DSL is rejected. Markdown docs are not used as source DSL fallback.

## Required Env

Live generation is opt-in:

```bash
RUN_CHIYAN_BATCH_002C=1 \
RUN_MINIMAX_LIVE_TESTS=1 \
MINIMAX_BASE_URL=https://api.minimaxi.com \
MINIMAX_IMAGE_MODEL=image-01 \
MINIMAX_API_KEY=<redacted> \
CHIYAN_BATTLEFIELD_DSL_PATH=docs/art-pipeline/dsl/chiyan-battlefield-side-runner-cleanup.dsl \
npm run art-task:batch-002c
```

If `RUN_CHIYAN_BATCH_002C` is not `1`, the script prints `Skipping ChiYan Batch 002c` and exits 0. Missing live key or DSL fails before provider calls.

## Batch Definition

Batch 002c creates six `ArtTask` records:

- `player_character_concept_chiyan_clean`: 3 images.
- `enemy_concept_chiyan_clean`: 3 images.
- `skill_icon_chiyan_flame_slash_clean`: 2 images.
- `skill_icon_chiyan_ash_guard_clean`: 2 images.
- `skill_icon_chiyan_battle_burst_clean`: 2 images.
- `ui_concept_chiyan_battle_hud_clean`: 1 image.

Total requested images: 13.

## Output Paths

Generated outputs are local and ignored by git:

```text
artifacts/generated-assets/batch-002c/
```

The script writes:

```text
artifacts/generated-assets/batch-002c/review-manifest.json
artifacts/generated-assets/batch-002c/review-index.md
```

## Review Rules

Batch 002c leaves every generated asset in `generated` state.

It does not call:

- `selectAsset`
- `approveAsset`

Human review must check:

- game format fit
- gameplay readability
- ChiYan direction fit
- processability
- style consistency
- text/logo/watermark/signature check
- approve / selected / needs_revision / rejected

## Live Review Finding

Batch 002c generated 13 review candidates. Production approval is decided only by explicit human review outcome.

- Automated prompt and manifest checks returned `pass`; this did not establish image-content compliance or production approval.
- Prompt gates passed, but image content human review failed; `productionApprovalStatus=production_blocked`.
- `ProductionCleanSideRunnerV1` was applied.
- No asset was auto-selected.
- No asset was auto-approved.
- Human image-content review found persistent text/logo/watermark/signature issues.
- The batch production approval status is `production_blocked`.

Observed blockers:

- watermark / logo / signature / corner mark artifacts
- fake text / unreadable Chinese-like or English-like labels
- UI fake labels and decorative typography
- icon outputs that still read as card frames, badges, or logo layouts
- character/enemy outputs that remain concept-sheet or poster-like instead of clean isolated production assets

The next action is not another blind prompt-only cleanup rerun. The next action is ImageContentGate outcome tracking and asset-type pipeline split:

- character/enemy: isolated sprite-candidate concepts with manual review
- icons: deterministic vector/glyph pipeline preferred
- HUD: deterministic SVG/HTML/React layout preferred

Human review outcome is recorded in:

```text
docs/art-pipeline/review-outcomes/batch-002c-human-review.json
```

## Compatibility & Cutover

| Check | Required answer |
| --- | --- |
| Producer change | Added explicit execution/prompt/image/approval/closure fields, candidate-only index disclosures, summary counts/messages, and a blocked human-review outcome receipt. |
| Consumer list | The Batch 002c manifest factory, future review-index renderer, run-summary builder, strict Zod review-outcome parser, `evaluateArtBatchReviewOutcome`, and contract tests consume and act on the fields. |
| Compatibility type | NEW_CONSUMER_REQUIRED |
| Authority | The cleanup DSL and `ProductionCleanSideRunnerV1` govern generation/prompt requirements; manifest asset ids and the explicit human review outcome govern final approval/closure. |
| Legacy strategy | Batch 002 and Batch 002b remain historical artifacts and are not rewritten. |
| Failure policy | Missing DSL, cleanup constraints or live authorization fails before provider calls; malformed/shape-invalid review input, review integrity errors, or approval/closure mismatches fail closed without promoting assets. |
| Evidence | No-provider contracts directly render all five future index statuses, build summary status/count messages, parse the raw fixture through the strict runtime boundary, and validate the 13-asset blocked review receipt against an independent expected-id list. |
| Rollback | Disable `RUN_CHIYAN_BATCH_002C`; existing Batch 002/002b artifacts remain intact. |
