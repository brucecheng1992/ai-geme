# Batch 002 ChiYan Battlefield Art Direction Calibration

Batch 002 validates whether the ChiYan Battlefield source DSL or art bible can drive real MiniMax image generation through the provider-agnostic `ArtTask` pipeline.

Batch 001 proved provider quality and pipeline viability with broad 2D game asset prompts. Batch 002 is narrower: it checks project art direction consistency for `赤炎战场 / ChiYan Battlefield`.

## Scope

- Uses the existing MiniMax `ArtProviderAdapter`.
- Uses `ArtTaskRunner -> ProviderResolver -> ArtProviderAdapter -> MiniMax adapter`.
- Keeps `ArtTask` provider-agnostic.
- Records concrete provider/model details in `ProviderCall`.
- Writes our own `GeneratedAsset` records and local files.
- Does not add providers, routing, 3D, sprite sheets, animation, skeletons, or game-engine import.

## DSL Source Requirement

Batch 002 must have a real ChiYan Battlefield DSL or art bible. It must not invent a generic fantasy fallback.

The script first checks repo candidate paths such as:

```text
docs/art-pipeline/chiyan-battlefield-dsl.md
docs/art-pipeline/chiyan-battlefield-art-bible.md
docs/art-pipeline/chiyan-battlefield-world-bible.md
```

If the DSL is stored elsewhere, provide:

```bash
CHIYAN_BATTLEFIELD_DSL_PATH=docs/art-pipeline/chiyan-battlefield-dsl.md
```

The script records only `sourceDslPath` and `sourceDslHash` in the manifest. It does not print the full DSL.

## Required Env

Live generation is opt-in:

```bash
RUN_CHIYAN_BATCH_002=1 \
RUN_MINIMAX_LIVE_TESTS=1 \
MINIMAX_BASE_URL=https://api.minimaxi.com \
MINIMAX_IMAGE_MODEL=image-01 \
MINIMAX_API_KEY=<redacted> \
CHIYAN_BATTLEFIELD_DSL_PATH=docs/art-pipeline/chiyan-battlefield-dsl.md \
npm run art-task:batch-002
```

If `RUN_CHIYAN_BATCH_002` is not `1`, the script prints `Skipping ChiYan Batch 002` and exits 0. If live mode is enabled but the API key or DSL is missing, it exits 1 before any provider call.

## Batch Definition

Batch 002 creates seven real `ArtTask` records:

- `player_character_concept_chiyan`: 3 images.
- `enemy_concept_chiyan`: 2 images.
- `scene_background_chiyan`: 2 images.
- `skill_icon_chiyan_flame_slash`: 1 image.
- `skill_icon_chiyan_ash_guard`: 1 image.
- `skill_icon_chiyan_battle_burst`: 1 image.
- `ui_concept_chiyan_battle_hud`: 1 image.

Total requested images are capped at 11. There are no retries and no regeneration loop.

## Prompt Compilation

The prompt compiler derives a concise ChiYan style block from the source DSL and combines it with each asset-specific instruction. It stores prompt lineage in the review manifest:

- `sourceDslId`
- `sourceDslPath`
- `sourceDslHash`
- `artBibleId`
- `promptTemplateId`
- `compiledPromptHash`
- `compiledAt`

If a compiled prompt exceeds the MiniMax manifest prompt limit, the script fails before calling the provider and prints only the task type, prompt length, and provider limit.

## Output Paths

Generated outputs are local and ignored by git:

```text
artifacts/generated-assets/batch-002/
```

The script writes:

```text
artifacts/generated-assets/batch-002/review-manifest.json
artifacts/generated-assets/batch-002/review-index.md
```

`review-manifest.json` records task ids, provider-call ids, asset ids, local paths, generated statuses, source DSL hash, and prompt lineage. `review-index.md` groups assets by task and includes local relative links for manual review.

## Review Process

Batch 002 leaves every generated asset in `generated` state.

It does not call:

- `selectAsset`
- `approveAsset`

Human review should check:

- task fit
- ChiYan direction fit
- gameplay readability
- processability
- style consistency
- approve / selected / needs_revision / rejected

## Compatibility & Cutover

| Check | Required answer |
| --- | --- |
| Producer change | Added Batch 002 review artifacts with ChiYan prompt-lineage fields, source DSL path/hash, compiled prompt hash, provider-call references, and generated asset references. |
| Consumer list | `scripts/art-task-batch-002.ts`, `tests/contracts/art-task-batch-002.test.ts`, and the human review index read the new contract. Existing game/runtime asset consumers are unchanged. |
| Compatibility type | `NEW_CONSUMER_REQUIRED` |
| Authority | The DSL selected by `CHIYAN_BATTLEFIELD_DSL_PATH`, identified by its recorded path and SHA-256 hash, is the semantic authority. The review manifest is evidence, not a replacement authority. |
| Legacy strategy | Batch 001 remains historical review evidence. Batch 002 is opt-in and does not enter the default resolver, runtime, or production asset path. |
| Failure policy | Missing, test-only, or live-disallowed DSL input; missing live authorization/key; an over-limit compiled prompt; or a provider failure stops the batch without generic-fantasy fallback or automatic approval. |
| Evidence | `tests/contracts/art-task-batch-002.test.ts` exercises DSL resolution, live-source rejection, prompt compilation/lineage, image caps, and fail-closed execution without provider calls. A production-runtime cutover is not claimed. |
| Rollback | Disable `RUN_CHIYAN_BATCH_002` and remove the runner/alias. Existing ignored review artifacts remain local and no DSL semantics or historical batches are rewritten. |

## Safety Notes

- Do not commit API keys.
- Do not print Authorization headers.
- Do not print the full DSL.
- Do not commit generated artifacts.
- Confirm `artifacts/` remains ignored after live generation.
