# Art Asset Pipeline Production Rollout Index

来源：`/Users/dahufa/Documents/workspace/art_asset_pipeline_production_rollout_plan.zip`

当前状态：Step 10B small library bridge canary 已在当前仓库提交为 `2ede0c0 test: add small library bridge canary`。本目录把 zip 中的大 rollout 计划拆成可逐步执行、逐步审查、逐步验证的小文档。

## 当前下一步

1. 关闭 Step 10B 分支边界：确认是否将 `test/asset-semantic-step-10b-small-library-bridge-canary` fast-forward 回 `main`。
2. 新建 Step 11A 专用分支。
3. 执行 [Step 11A non-default runtime integration gate](step-11a-non-default-runtime-integration-gate.md)。

在 Step 11A gate 完成前，不实现 runtime integration、不接 Workbench / QA preview、不触碰 large asset library。

## 硬边界

- One step per branch.
- One step per commit unless the step explicitly allows multiple commits.
- Start every implementation step from a clean worktree.
- Do not push, sync, move tags, delete tags, or drop stashes unless explicitly instructed.
- Do not touch the large art library before Step 13A.
- Do not change runtime/default behavior before Step 14A/14B.
- Do not make repair-enabled mode default.
- Do not silently repair or rewrite source metadata.
- Do not silently promote unsupported assets.
- Do not commit generated artifacts unless they are explicit stable test fixtures.
- Do not use production/default asset pack loading inside canary or diagnostics-only steps.
- Do not call `resolveLocalAssetPack` or `selectLocalAssetPack` in bridge-canary or diagnostics-only steps unless a future gate explicitly allows it.

## Step Index

| Step | Document | Type | Status |
| --- | --- | --- | --- |
| Step 10B | `tests/contracts/asset-pack-small-library-bridge-canary.test.ts` + existing logs | Test + docs | Done in `2ede0c0` |
| Step 11A | [Non-default runtime integration gate](step-11a-non-default-runtime-integration-gate.md) | Docs-only | Next |
| Step 11B | [Non-default runtime canary implementation](step-11b-non-default-runtime-canary.md) | Code + tests | Future |
| Step 11C | [Runtime canary closure](step-11c-runtime-canary-closure.md) | Docs/report | Future |
| Step 12A | [Workbench / QA preview gate](step-12a-workbench-qa-preview-gate.md) | Docs-only | Future |
| Step 12B | [Workbench / QA preview implementation](step-12b-workbench-qa-preview.md) | Code + tests | Future |
| Step 12C | [QA preview signoff](step-12c-qa-preview-signoff.md) | Docs/report | Future |
| Step 13A | [Large library intake gate](step-13a-large-library-intake-gate.md) | Docs-only | Future |
| Step 13B | [Large library inventory dry-run](step-13b-large-library-inventory.md) | Read-only report/tooling | Future |
| Step 13C | [Large library batch zero](step-13c-large-library-batch-zero.md) | Small fixture import | Future |
| Step 13D | [Batch zero pipeline dry-run](step-13d-batch-zero-pipeline-dry-run.md) | Dry-run/report | Future |
| Step 13E | [Batch expansion gate](step-13e-batch-expansion-gate.md) | Docs-only | Future |
| Step 14A | [Production rollout gate](step-14a-production-rollout-gate.md) | Docs-only | Future |
| Step 14B | [Controlled rollout implementation](step-14b-controlled-rollout.md) | Code + tests | Future |
| Step 14C | [Production verification and rollback drill](step-14c-production-verification-rollback.md) | Verification/report | Future |
| Step 14D | [Rollout closeout](step-14d-rollout-closeout.md) | Docs/tag optional | Future |

Supporting docs:

- [Validation and CI matrix](validation-and-ci-matrix.md)
- [Review gates](review-gates.md)
- [Artifact storage policy](artifact-storage-policy.md)
- [Decision points and exit criteria](decision-points-and-exit-criteria.md)

## Review-Gated Execution Rule

Every step must complete this sequence before the next step starts:

1. Confirm scope and forbidden ranges.
2. Inspect relevant code/docs/tests.
3. Make one small change set.
4. Run focused validation.
5. Run Oracle read-only review, or explicitly record main-agent self-review only if Oracle is unavailable.
6. Update the step document with validation and review results.
7. Re-run doc/diff checks.

## Branch Boundary

Do not continue Step 11A on the Step 10B branch. The expected boundary is:

```bash
git status --short --branch
git switch main
git merge --ff-only test/asset-semantic-step-10b-small-library-bridge-canary
git switch -c docs/art-asset-step-11a-runtime-integration-gate
```

If fast-forward merge fails, stop and report.
