# Asset Semantic Large Library Step 13B Inventory

最新维护时间：2026-06-13

## Scope

Step 13B 只做 Kenney Pirate Kit large-library read-only inventory dry-run。

Source page evidence:

- Page: `https://kenney.nl/assets/pirate-kit`
- Title: `Pirate Kit`
- Category: `3D`
- Features: `Animation`
- Files: `70x`
- License: `Creative Commons CC0`

Archive source:

- URL: `https://kenney.nl/media/pages/assets/pirate-kit/e6d4bb1525-1771333093/kenney_pirate-kit.zip`
- Source kind: direct archive
- Preflight Content-Length: `3154665`

## Boundary

Allowed in this step:

- download the exact preflighted archive only to ignored local artifacts;
- list archive entries without extracting;
- summarize archive-relative paths, extensions, compressed / uncompressed sizes and coarse media type counts;
- record deterministic inventory results in docs.

Not allowed in this step:

- extract archive contents;
- copy assets into repo or production asset packs;
- import assets or generate metadata sidecars;
- generate thumbnails, embeddings, hashes or image dimension probes;
- crawl or search for alternate sources;
- change runtime/default behavior, resolver behavior, QA, Workbench, Phaser or asset pack loading;
- start Step 13C.

## Local Ignored Artifacts

Ignored local artifacts were written under:

- `artifacts/asset-semantic-large-library-inventory/tmp/kenney_pirate-kit.zip`
- `artifacts/asset-semantic-large-library-inventory/step-13b-pirate-kit-v0.1/raw-entries.json`
- `artifacts/asset-semantic-large-library-inventory/step-13b-pirate-kit-v0.1/inventory-summary.json`

These files are under the ignored `artifacts/` root and are not committed.

## Inventory Result

- Downloaded archive byte size: `3154665`
- Archive listing total entries: `379`
- Files: `370`
- Directories: `9`
- Total uncompressed bytes: `9335467`
- Total compressed bytes from entry listing: `3049249`

Extension counts:

| Extension | Count |
| --- | ---: |
| `fbx` | 72 |
| `glb` | 72 |
| `html` | 1 |
| `mtl` | 72 |
| `obj` | 72 |
| `png` | 77 |
| `txt` | 1 |
| `url` | 3 |

Coarse media type counts:

| Type | Count |
| --- | ---: |
| `documentation` | 2 |
| `image_texture` | 77 |
| `model_3d` | 216 |
| `unknown` | 75 |

Detected inventory signals:

- License / readme candidate: `License.txt`
- Preview / reference image candidates: `74`, including `Preview.png`, `Sample.png` and `Previews/*.png`
- Model candidates: `216`
- Texture / image candidates: `77`
- Animation-specific archive entries detected by filename convention: `0`

Coverage estimates:

- Candidate asset count by unique model basename: `72`
- Model file count before FBX / GLB / OBJ format dedupe: `216`
- Metadata sidecar entries detected: `0`
- Missing metadata estimate by unique model basename: `72`
- Thumbnail/reference PNG entries in `Previews/`: `72`
- Thumbnail/reference coverage by unique model basename: `72/72`
- Missing thumbnail/reference estimate by unique model basename: `0`
- Coverage method: archive-entry paths only; no extraction, hashing, image reads or image dimension probes.

Largest file examples:

| Path | Extension | Uncompressed bytes |
| --- | --- | ---: |
| `Models/GLB format/ship-wreck.glb` | `glb` | 223676 |
| `Models/FBX format/ship-wreck.fbx` | `fbx` | 207264 |
| `Models/OBJ format/ship-wreck.obj` | `obj` | 192013 |
| `Models/GLB format/ship-pirate-large.glb` | `glb` | 177216 |
| `Models/GLB format/ship-pirate-medium.glb` | `glb` | 166388 |

## Step 13C Recommendation

The archive appears suitable for a future Step 13C batch-zero proposal because it is small, has visible CC0 page evidence, includes `License.txt`, and contains GLB model candidates plus preview/reference PNGs.

Step 13C still requires explicit user approval. It should choose one runtime-friendly format family, likely GLB, and keep the batch at or below the Step 13A limit of 10 assets unless a later gate changes that limit.

Step 13C must generate or validate sidecar metadata in its own branch because Step 13B detected no sidecar metadata entries in the source archive. Step 13C must not reuse Step 13B as import approval.

## Confirmations

- Archive entries were listed without extraction.
- No archive entries were copied into tracked source paths.
- No assets were imported into the repo or production asset packs.
- No sidecar metadata was generated.
- No thumbnails were generated.
- No hashing was performed.
- No image dimension probing was performed.
- Runtime/default behavior was not touched.
- Resolver behavior was not touched.
- QA, Workbench, Phaser and asset pack loading were not touched.
- Step 13C was not started.

## Review Status

Local validation passed for this branch snapshot:

```bash
npm run test:contracts
npm test
npm run typecheck
git diff --check
git status --short --branch
git diff --name-only
git status --ignored --short artifacts/asset-semantic-large-library-inventory || true
git ls-files artifacts/asset-semantic-large-library-inventory
```

Validation results:

- `npm run test:contracts`: passed, 21 files / 197 tests.
- `npm test`: passed, including contracts and workspace tests.
- `npm run typecheck`: passed for root, maker-api and maker-workbench.
- `git diff --check`: passed.
- `git status --short --branch`: only docs changes are tracked/untracked.
- `git status --ignored --short artifacts/asset-semantic-large-library-inventory || true`: reports ignored `artifacts/`.
- `git ls-files artifacts/asset-semantic-large-library-inventory`: no tracked files.

Sage/Oracle review passed:

- Initial review found two P2 issues: missing metadata / thumbnail coverage estimates, and stale Step 13A status text in the step index.
- Both P2 issues were fixed with archive-entry-path-only coverage estimates and updated Step 13B status text.
- Re-review result: P0/P1/P2 all clear.
- P3 note: Sage suggested a docs-prefixed commit message, but the Step 13B task explicitly requested `test: inventory large art library candidates`; keep the user-specified commit message.
