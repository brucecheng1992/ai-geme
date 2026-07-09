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
```

Never commit API keys. Do not use `NEXT_PUBLIC_MINIMAX_API_KEY`; the adapter is server-side only.

## Mock Tests

Run the offline MiniMax adapter tests:

```bash
npx vitest run tests/contracts/art-provider-minimax-adapter.test.ts tests/contracts/minimax-smoke-config.test.ts
```

These tests use injected `fetch` mocks and do not require `MINIMAX_API_KEY`.

## Live Smoke

The live smoke script is opt-in and must not run in CI by default.

```bash
RUN_MINIMAX_LIVE_TESTS=1 MINIMAX_API_KEY=<redacted> npm run minimax:smoke
```

When `RUN_MINIMAX_LIVE_TESTS` is not `1`, the script prints `Skipping MiniMax live smoke test` and exits with status 0. When enabled, it requests one `skill_icon` image with `responseFormat: "base64"` and writes the first result under `artifacts/minimax-smoke/`, which is already ignored by git.

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
