# Batch 002b ChiYan Side-Runner Production Pass

Batch 002b is the production-oriented follow-up to Batch 002 for `赤炎战场 / ChiYan Battlefield`.

Batch 002 remains a moodboard and visual exploration result. Batch 002b does not delete, overwrite, or rerun Batch 002. It narrows the generation contract to a `side-scrolling run-and-gun` game format so the outputs can be reviewed as production candidates for a horizontal 2D action game.

## Scope

- Uses the existing MiniMax `ArtProviderAdapter`.
- Uses `ArtTaskRunner -> ProviderResolver -> ArtProviderAdapter -> MiniMax adapter`.
- Keeps `ArtTask` provider-agnostic.
- Records concrete provider/model details in `ProviderCall`.
- Writes our own `GeneratedAsset` records and local files.
- Does not add providers, routing, 3D, sprite sheets, animation, skeletons, or game-engine import.

## DSL Source

Batch 002b requires a real side-runner ChiYan DSL. The repo-reviewed source is:

```text
docs/art-pipeline/dsl/chiyan-battlefield-side-runner.dsl
```

The DSL must contain:

- `LIVE_GENERATION_ALLOWED true`
- `game_format: side-scrolling run-and-gun`
- strict side-view / side-on camera constraints
- horizontal combat lane and platform readability constraints
- fantasy ChiYan ranged weapon language
- no generic fantasy fallback

The script rejects fixture DSL markers, missing live markers, and DSL files that do not include the side-scrolling run-and-gun constraints. It does not use `docs/art-pipeline/batch-002b-chiyan-side-runner.md` as a source DSL fallback.

## Required Env

Live generation is opt-in:

```bash
RUN_CHIYAN_BATCH_002B=1 \
RUN_MINIMAX_LIVE_TESTS=1 \
MINIMAX_BASE_URL=https://api.minimaxi.com \
MINIMAX_IMAGE_MODEL=image-01 \
MINIMAX_API_KEY=<redacted> \
CHIYAN_BATTLEFIELD_DSL_PATH=docs/art-pipeline/dsl/chiyan-battlefield-side-runner.dsl \
npm run art-task:batch-002b
```

If `RUN_CHIYAN_BATCH_002B` is not `1`, the script prints `Skipping ChiYan Batch 002b` and exits 0. If live mode is enabled but the API key or DSL is missing, it exits 1 before any provider call.

## Batch Definition

Batch 002b creates seven `ArtTask` records:

- `player_character_concept_chiyan`: 3 images.
- `enemy_concept_chiyan`: 2 images.
- `scene_background_chiyan`: 2 images.
- `skill_icon_chiyan_flame_slash`: 1 image.
- `skill_icon_chiyan_ash_guard`: 1 image.
- `skill_icon_chiyan_battle_burst`: 1 image.
- `ui_concept_chiyan_battle_hud`: 1 image.

Total requested images are capped at 11. There are no retries and no regeneration loop.

## Output Paths

Generated outputs are local and ignored by git:

```text
artifacts/generated-assets/batch-002b/
```

The script writes:

```text
artifacts/generated-assets/batch-002b/review-manifest.json
artifacts/generated-assets/batch-002b/review-index.md
```

The manifest records `gameFormat: side_scrolling_run_and_gun`, source DSL path/hash, task ids, provider-call ids, asset ids, local paths, generated statuses, and prompt lineage.

## Review Rules

Batch 002b leaves every generated asset in `generated` state.

It does not call:

- `selectAsset`
- `approveAsset`

Human review should check:

- side-view / side-scrolling run-and-gun fit
- ChiYan direction fit
- gameplay readability
- processability
- style consistency
- approve / selected / needs_revision / rejected

## Review Finding

Batch 002b succeeded as a side-scrolling direction pass. It is not final production-approved.

Known blockers from review:

- watermark / logo / fake text / signature artifacts
- title-card or mark-like artifacts in some outputs
- some character/enemy outputs still read as splash-art or 3/4-view rather than strict side-view gameplay assets

These findings become `ProductionCleanSideRunnerV1` quality gates for Batch 002c and later production batches.

## Compatibility & Cutover

| Check | Required answer |
| --- | --- |
| Producer change | Added the canonical ChiYan side-runner DSL plus Batch 002b review artifacts carrying `gameFormat`, source DSL path/hash, prompt lineage, provider-call references, and generated asset references. |
| Consumer list | `scripts/art-task-batch-002b.ts`, `tests/contracts/art-task-batch-002b.test.ts`, and the human review index read the new DSL and artifact fields. Existing game/runtime asset consumers are unchanged. |
| Compatibility type | `NEW_CONSUMER_REQUIRED` |
| Authority | `docs/art-pipeline/dsl/chiyan-battlefield-side-runner.dsl` is the semantic authority for Batch 002b. The review manifest records lineage to that authority. |
| Legacy strategy | Batch 002 remains immutable moodboard evidence. Batch 002b is an opt-in review batch and is not a default production/runtime route. |
| Failure policy | Missing, test-only, live-disallowed, or structurally incomplete DSL input; missing live authorization/key; prompt-limit violations; or provider failures stop before silent fallback or automatic approval. |
| Evidence | `tests/contracts/art-task-batch-002b.test.ts` reads and validates the canonical DSL, verifies prompt lineage and side-runner constraints, and exercises fail-closed paths without provider calls. Production approval remains gated by human image review. |
| Rollback | Disable `RUN_CHIYAN_BATCH_002B` and remove the runner/alias/DSL consumer. Historical Batch 002 evidence stays intact and no generated asset is promoted automatically. |

## Safety Notes

- Do not commit API keys.
- Do not print Authorization headers.
- Do not print the full DSL.
- Do not commit generated artifacts.
- Do not allow generic fantasy fallback.
- Do not allow readable text, fake text, logos, or watermarks in production prompts.
- Confirm `artifacts/` remains ignored after live generation.
