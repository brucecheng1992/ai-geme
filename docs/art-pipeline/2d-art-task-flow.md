# 2D ArtTask Flow

This document records the first business-level 2D art production path. MiniMax live smoke has passed, but MiniMax remains an `ArtProviderAdapter`, not business logic.

## Flow

```text
ArtTask
  -> ProviderResolver
  -> ArtProviderAdapter.generateImage
  -> ProviderCall
  -> GeneratedAsset
  -> ReviewDecision
```

`ArtTask` is provider-agnostic. It stores the project, requested art type, required capability, prompt fields, output spec, optional provider selection, and task status.

`ProviderResolver` is intentionally minimal for P0. It resolves one registered provider/profile and returns a provider id, model id, profile, and adapter. It does not score providers, route between providers, or fallback automatically.

`ProviderCall` records the concrete provider/model/operation, input hash, status, output asset ids, sanitized error context, latency, and timestamps.

`GeneratedAsset` is our asset record. For P0, base64 images are copied into the ignored local folder `artifacts/generated-assets/`. Provider temporary URLs are not treated as durable storage.

`ReviewDecision` controls selected/approved/rejected state. Selecting or approving an asset records a review decision and updates both the asset and task status.

## Smoke Scripts

Run the provider-agnostic mock business smoke:

```bash
npm run art-task:mock
```

This uses a mock provider, writes a disposable file under `artifacts/generated-assets/`, selects and approves it, and prints task/provider-call/asset ids. It does not read `MINIMAX_API_KEY` and does not call MiniMax.

The MiniMax live smoke remains opt-in only:

```bash
RUN_MINIMAX_LIVE_TESTS=1 MINIMAX_BASE_URL=https://api.minimaxi.com MINIMAX_IMAGE_MODEL=image-01 MINIMAX_API_KEY=<redacted> npm run minimax:smoke
```

Run the opt-in business-level MiniMax smoke:

```bash
RUN_MINIMAX_LIVE_TESTS=1 MINIMAX_BASE_URL=https://api.minimaxi.com MINIMAX_IMAGE_MODEL=image-01 MINIMAX_API_KEY=<redacted> npm run art-task:minimax-smoke
```

`minimax:smoke` calls the raw MiniMax adapter and is useful for provider connectivity. `art-task:minimax-smoke` creates a real `skill_icon` `ArtTask`, resolves MiniMax through the minimal provider profile/resolver path, runs `ArtTaskRunner`, writes a `GeneratedAsset`, and records selected/approved `ReviewDecision` states. The business flow remains provider-agnostic; MiniMax-specific headers, payloads, and response parsing stay inside the adapter.

Keep `RUN_MINIMAX_LIVE_TESTS=0` unless a live validation step explicitly authorizes provider calls.

## Batch 001 Real 2D Asset Testing

Batch 001 is an opt-in real-provider test batch for early 2D game asset review. It is not formal production generation, does not add providers, and does not approve assets automatically.

Run it only when a live provider call has been explicitly authorized:

```bash
RUN_MINIMAX_LIVE_TESTS=1 RUN_REAL_2D_ASSET_BATCH=1 MINIMAX_BASE_URL=https://api.minimaxi.com MINIMAX_IMAGE_MODEL=image-01 MINIMAX_API_KEY=<redacted> npm run art-task:batch-001
```

If either live flag is missing, the script prints a skip message and exits successfully without reading a provider key or creating tasks. When both flags are enabled, `MINIMAX_API_KEY` must be present.

Batch 001 creates seven provider-agnostic `ArtTask` records and runs them through `ArtTaskRunner` with MiniMax behind `ArtProviderAdapter`:

- `player_character_concept`: 3 images.
- `enemy_concept`: 3 images.
- `scene_background`: 2 images.
- `skill_icon_slash`: 1 image.
- `skill_icon_guard`: 1 image.
- `skill_icon_burst`: 1 image.
- `ui_concept`: 1 image.

The batch is capped at 12 requested images. It performs no retries, no regeneration loop, no sprite-sheet work, no animation work, and no provider routing.

Generated files are written under the ignored local folder:

```text
artifacts/generated-assets/batch-001/
```

The script also writes:

```text
artifacts/generated-assets/batch-001/review-manifest.json
artifacts/generated-assets/batch-001/review-index.md
```

`review-manifest.json` records task ids, provider-call ids, asset ids, local paths, statuses, and sanitized errors if a task fails. `review-index.md` gives a human-readable checklist for reviewing generated assets. Assets remain in `generated` status for human review; the script does not call `selectAsset` or `approveAsset`.

## P0 Non-Goals

- No new provider.
- No provider routing beyond the minimal profile/resolver path.
- No Bailian, GLM, Seedream, StepFun, Tripo, 3D, sprite-sheet, animation, or full production pipeline.
- No object storage upload.
- No default live provider call.
- No cache-based duplicate suppression yet; `ProviderCall.inputHash` is recorded as the future cache key.

## Compatibility & Cutover

| Check | Answer |
| --- | --- |
| Producer change | Added provider-agnostic `ArtTask`, `ProviderCall`, `GeneratedAsset`, and `ReviewDecision` records plus an in-memory runner/repository path. Batch 001 adds ignored local review artifacts: `review-manifest.json` and `review-index.md`. |
| Consumer list | `ArtTaskRunner`, in-memory repositories, local generated-asset storage, mock business smoke script, live ArtTask smoke script, Batch 001 script, manual review readers, and contract tests. Existing game/runtime asset consumers are unchanged. |
| Compatibility type | `LOSSLESS_COMPATIBLE` |
| Authority | `ArtTask` and the provider-neutral `ArtProviderAdapter` input/result types are the source of truth for this P0 business flow. Batch 001 review artifacts are local evidence indexes, not runtime authority. |
| Legacy strategy | Existing fake, disabled-live, live-dry-run, and MiniMax adapter paths remain supported and unchanged. MiniMax is not inserted into normal generation by default. |
| Failure policy | Unsupported capabilities fail before provider calls; provider errors create failed `ProviderCall` records and mark the task failed; generated assets are not approved automatically. Batch 001 stops on first failed task and writes the partial review manifest. |
| Evidence | `tests/contracts/art-task-flow.test.ts` exercises task creation, provider-agnostic adapter calls, provider-call records, generated-asset records, review decisions, failure recording, and no-key mock execution. `tests/contracts/art-task-batch-001.test.ts` proves Batch 001 skips without live flags and stays within the 12-image cap. |
| Rollback | Remove `art-tasks` exports, `art-task:mock`, `art-task:minimax-smoke`, `art-task:batch-001`, the related contract tests, and this doc without changing provider adapter semantics or existing resolver/runtime paths. |
