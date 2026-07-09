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
RUN_MINIMAX_LIVE_TESTS=1 MINIMAX_API_KEY=<redacted> npm run minimax:smoke
```

Keep `RUN_MINIMAX_LIVE_TESTS=0` unless a live validation step explicitly authorizes provider calls.

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
| Producer change | Added provider-agnostic `ArtTask`, `ProviderCall`, `GeneratedAsset`, and `ReviewDecision` records plus an in-memory runner/repository path. |
| Consumer list | `ArtTaskRunner`, in-memory repositories, local generated-asset storage, mock business smoke script, and contract tests. Existing game/runtime asset consumers are unchanged. |
| Compatibility type | `LOSSLESS_COMPATIBLE` |
| Authority | `ArtTask` and the provider-neutral `ArtProviderAdapter` input/result types are the source of truth for this P0 business flow. |
| Legacy strategy | Existing fake, disabled-live, live-dry-run, and MiniMax adapter paths remain supported and unchanged. MiniMax is not inserted into normal generation by default. |
| Failure policy | Unsupported capabilities fail before provider calls; provider errors create failed `ProviderCall` records and mark the task failed; generated assets are not approved automatically. |
| Evidence | `tests/contracts/art-task-flow.test.ts` exercises task creation, provider-agnostic adapter calls, provider-call records, generated-asset records, review decisions, failure recording, and no-key mock execution. |
| Rollback | Remove `art-tasks` exports, `art-task:mock`, the contract test, and this doc without changing provider adapter semantics or existing resolver/runtime paths. |
