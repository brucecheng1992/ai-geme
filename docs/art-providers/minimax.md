# MiniMax ArtProviderAdapter

MiniMax is the first ArtProviderAdapter, not a business dependency. Business pipeline code should depend on provider-neutral capabilities such as `image.generate` and `image.image_to_image`, then select an adapter through the provider registry or explicit server-side wiring.

Provider-specific request fields, headers, response parsing, and error normalization stay inside `packages/asset-pipeline/src/art-providers/minimax/`. Do not import MiniMax payload details from business pipeline code.

## Environment

Required or supported environment variables:

```bash
MINIMAX_API_KEY=
MINIMAX_BASE_URL=https://api.minimax.io
MINIMAX_IMAGE_MODEL=image-01
RUN_MINIMAX_LIVE_TESTS=0
RUN_MINIMAX_ART_TASK_SMOKE=0
```

Never commit API keys. Do not use `NEXT_PUBLIC_MINIMAX_API_KEY`; the adapter is server-side only.

## Mock Tests

Run the offline MiniMax adapter tests:

```bash
npx vitest run tests/contracts/art-provider-minimax-adapter.test.ts tests/contracts/minimax-smoke-config.test.ts
```

These tests use injected `fetch` mocks and do not require `MINIMAX_API_KEY`.

## Live Smokes

Live smoke scripts are opt-in and must not run in CI by default.

### Adapter-only smoke

```bash
RUN_MINIMAX_LIVE_TESTS=1 MINIMAX_API_KEY=<redacted> npm run minimax:smoke
```

`minimax:smoke` calls the MiniMax adapter directly. It validates adapter transport only: it does not traverse `ArtTaskRunner` or `ProviderResolver` and cannot serve as current-HEAD shared-path same-run evidence. When `RUN_MINIMAX_LIVE_TESTS` is not `1`, it exits without a provider call. When enabled, it requests one `skill_icon` image with `responseFormat: "base64"` and writes the first result under `artifacts/minimax-smoke/`, which is already ignored by git.

### ArtTask shared-path smoke

```bash
RUN_MINIMAX_LIVE_TESTS=1 RUN_MINIMAX_ART_TASK_SMOKE=1 MINIMAX_API_KEY=<redacted> npm run art-task:minimax-smoke
```

`art-task:minimax-smoke` and its explicit alias `art-task:minimax-same-run-smoke` execute the same review-only shared runner. Both flags must be `1`; a missing smoke-specific flag skips with zero provider calls, and a missing key fails before provider setup.

The shared smoke follows `ArtTaskRunner -> ProviderResolver -> ArtProviderAdapter -> MiniMax adapter`, executes exactly one task and one logical provider call, and requests one image. Each run writes its candidate image and `smoke-result.json` beneath a unique run directory:

```text
artifacts/generated-assets/minimax-same-run-smoke/<run-id>/
```

The result records `productionApprovalStatus=pending_human_review`, `productionClosureStatus=open_pending_review`, `autoSelection=false`, `autoApproval=false`, and empty selected/approved asset-id lists. The generated asset stays in `generated` status for human review; no `ReviewDecision` is created by the smoke.

Generated is not selected. Generated is not approved. Provider smoke success is not production approval. Image content remains unreviewed. This smoke validates provider connectivity and the current execution contract only; it does not validate image quality, establish production cutover, or make MiniMax the default provider. Same-run evidence applies only to the exact HEAD executed, and any later code commit invalidates it.

If using `responseFormat: "url"`, provider URLs are temporary and must be copied into our own storage before they become durable asset sources.

## P0 Limitations

- Only `image.generate` and `image.image_to_image` are implemented.
- Image-to-image uses exactly one reference image and maps it to MiniMax `subject_reference`.
- Masked edit is not implemented.
- Sprite sheet automation is not implemented.
- 3D generation is not implemented.
- Provider auto-routing is not implemented.

## Compatibility & Cutover

| Check | Answer |
| --- | --- |
| Producer change | Added provider-neutral image adapter types, a duplicate-safe provider registry, MiniMax manifest/profile helpers, and a MiniMax HTTP adapter. |
| Consumer list | Offline contract tests, the opt-in smoke script, and future server-side business code that calls `ArtProviderAdapter` methods. Existing resolver runtime paths are unchanged. |
| Compatibility type | `LOSSLESS_COMPATIBLE` |
| Authority | `ArtProviderManifest` and provider-neutral input/result/error types are the semantic source of truth; MiniMax raw payloads are internal adapter details. |
| Legacy strategy | Existing fake, disabled-live, and live-dry-run art provider paths remain supported and unchanged. MiniMax is not inserted into normal generation by default. |
| Failure policy | Invalid inputs fail before network calls; missing `MINIMAX_API_KEY` fails only when a live call is attempted; HTTP and provider errors are normalized without leaking secrets. |
| Evidence | `tests/contracts/art-provider-minimax-adapter.test.ts` calls `generateImage` and `imageToImage` and asserts the downstream MiniMax payload, result normalization, errors, manifest, profile, and registry behavior. |
| Rollback | Remove the MiniMax adapter exports, script, docs, env placeholders, and tests without rewriting existing resolver/source-manifest semantics. |
