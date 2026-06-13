# Asset Pack Metadata Bridge Step 4A Gate

完成时间：2026-06-13

## 1. Purpose

Step 4A 是 asset pack metadata bridge / resolver diagnostics 的 review gate。它只定义后续 Step 4B 可以如何把现有 metadata validation、runtime-safe export、small art library dry-run 和 canary comparison 输出连接到 bridge / diagnostics 层。

Step 4A 不是实现步骤：

- 不新增代码。
- 不新增测试。
- 不修改 runtime/default behavior。
- 不改变 resolver decision。
- 不接入 QA、Workbench、Phaser runtime 或 asset pack loading。
- 不扫描、导入或处理 large asset library。

## 2. Previous Lane Closure

Step 8 已完成 taxonomy / canary comparison 相关工作：

- Step 8a 只补当前 unsupported canary wording 所需 taxonomy v0.2。
- Step 8b 将已支持 canary wording 从 `expectedUnsupported` 提升到默认 canary。
- Step 8c 扩展 small canary fixture pack v0.2。
- Step 8d 增加 default / repair-enabled canary comparison，repair 仍保持显式开启，不成为默认。

Step 9 已完成 small art library intake 和 dry-run：

- Step 9A 定义 small art library intake review gate。
- Step 9B 导入 10 个 Kenney Cube Pets 小型 fixture assets 与 sidecar metadata。
- Step 9C 证明 small library 可以通过 metadata validation、runtime-safe export、default canary、repair-enabled canary 和 default vs repair-enabled comparison。

Step 9C branch boundary 已通过 `--ff-only` 合并关闭。Step 4A 从这个已关闭的小型 dry-run lane 之后开始，但不把 small library 接入 runtime/default asset packs，也不暗示 runtime/default integration 已完成。

## 3. Bridge Scope For Step 4B

未来 Step 4B 的 asset pack metadata bridge 只能做 report-only 的 deterministic bridge layer。允许范围：

- 读取 runtime-safe metadata artifacts。
- 读取 small art library dry-run outputs 或 small fixture metadata。
- 复用现有 metadata validation / runtime-safe export API。
- 生成 deterministic asset pack bridge summary。
- 报告 compatibility、missing metadata、duplicate id、unsupported semantic diagnostics。

Step 4B bridge 不允许：

- mutate metadata。
- 修改 source assets。
- 修改 runtime/default asset loading。
- 修改 resolver final decision。
- 把 unsupported assets 静默提升为 supported。
- 将 small library 变成 production/default asset pack。

## 4. Resolver Diagnostics Scope

未来 resolver diagnostics 必须保持 report-only：

- diagnostics 输出必须 deterministic。
- diagnostic code / severity / message style 必须稳定。
- diagnostics 可以说明 bridge compatibility、missing metadata、duplicate id、unsupported semantic、runtime-safe artifact mismatch。
- diagnostics 不改变 resolver ranking、selection、fallback、hard gate 或 repair trigger。
- diagnostics 不改变 runtime/default behavior。
- diagnostics 不执行 repair writeback。
- diagnostics 不静默 promotion unsupported assets。
- diagnostics 不接入 production/default asset loading。

## 5. Step 4B Implementation Boundary

Step 4B 可以新增：

- asset pack metadata bridge helper。
- resolver diagnostic helper。
- focused tests。
- deterministic report schema。
- docs update。

Step 4B 不可以新增：

- runtime/default loading。
- production asset pack integration。
- Workbench UI。
- QA implementation changes。
- Phaser runtime loading。
- large library rollout。
- repair-enabled default。
- source metadata rewrite。
- large asset library scan/import。
- asset pack loading behavior changes。

## 6. Inputs

Step 4B 可以使用：

- small library fixture 导出的 runtime-safe metadata。
- Step 9C default / repair-enabled canary summaries。
- Step 9C comparison output。
- small fixture relative paths。
- existing metadata validation / export APIs。

Step 4B 不得要求：

- large asset library。
- production asset pack replacement。
- runtime consumer integration。
- Workbench / QA / Phaser runtime integration。
- repair-enabled mode as default。

Small library dry-run output 可以作为 Step 4B input，但只能作为 fixture / canary / bridge diagnostic input，不能因此成为 production/default asset loading 输入。

## 7. Outputs

未来 Step 4B output 应该 deterministic，例如：

- bridge summary JSON。
- resolver diagnostics JSON。
- compatibility report。

输出约束：

- 不写 non-deterministic timestamp，除非 timestamp 来自固定 fixture 或显式 deterministic input。
- 不写 absolute local paths。
- 不写 host-specific temp paths。
- 不提交 generated artifacts，除非后续步骤明确把某些 deterministic fixture 作为测试输入。
- schema 字段、diagnostic codes 和排序规则必须稳定。

## 8. Review Gate

P0：

- Step 4A implements code。
- Step 4A changes runtime/default asset loading behavior。
- Step 4A starts Step 4B implementation。
- Step 4A scans or imports large asset library。
- Step 4A wires small library into production/default asset packs。
- Step 4A changes resolver decisions。
- Step 4A allows diagnostics to mutate metadata。
- Step 4A allows repair-enabled mode to become default。
- Step 4A allows unsupported assets to be silently promoted。
- Step 4A implies runtime integration is complete。

P1：

- bridge scope is unclear。
- resolver diagnostic scope is unclear。
- Step 4B boundaries are unclear。
- docs imply production/default rollout is complete。
- docs imply large library intake is allowed。
- deterministic output requirements are unclear。
- diagnostic semantics are unclear。

P2：

- no previous lane closure note。
- no explicit large library exclusion。
- no explicit runtime/default non-goal。
- no review log update。
- no plan update。
- no Step 4B implementation boundary。
- no rollback/deferred rollout note。

P3：

- naming issues。
- formatting issues。
- cross-link cleanup。
- small wording issues。

## 9. Docs Status Update

Step status after this docs-only gate:

- Step 9C：done and branch boundary closed by fast-forward merge.
- Step 4A：current docs-only gate; done after this change is reviewed and committed.
- Step 4B：next future implementation boundary for asset pack metadata bridge / resolver diagnostics.
- large asset library：parked.
- runtime/default integration：parked.

Review log requirements for Step 4A:

- Step 4A is docs-only.
- no code implemented.
- no tests added or changed.
- no runtime/default behavior changed.
- no resolver behavior changed.
- no QA / Workbench / Phaser / asset pack loading changed.
- no large art library touched.
- Step 4B remains future implementation.

## 10. Deferred Route

After Step 4A, the route remains split into explicit gates:

1. Step 4B asset pack metadata bridge / resolver diagnostics implementation.
2. Small library bridge canary, still fixture-only and non-production.
3. Non-default runtime integration behind an explicit opt-in lane.
4. Workbench / QA preview for bridge diagnostics, still non-production until gated.
5. Large library gate for size, licensing, scan/import policy and rollout criteria.
6. Production rollout gate for default asset pack behavior, resolver consumer changes and runtime loading.

Each future route must keep its own review gate, validation evidence and Oracle review. Step 4A does not approve any of those future changes; it only records the boundary.

## 11. Validation For Step 4A

Required validation:

    git diff --check

Required final repository checks:

- Only docs changed.
- No code changed.
- No tests changed.
- No assets or metadata sidecars changed.
- No generated artifacts were added.
- No runtime/resolver/QA/Workbench/Phaser/asset pack loading files changed.
- Large asset library was not touched.
- Step 4B was not started.

## 12. Review Record

Oracle review:

- P0：未发现；确认 Step 4A 没有代码、测试、asset、metadata sidecar、runtime、resolver、QA、Workbench、Phaser 或 asset pack loading 变更。
- P1：未发现；bridge scope、resolver diagnostics scope、Step 4B boundary、deterministic output 和 diagnostic semantics 已明确。
- P2：未发现；Step 9C lane closure、large library exclusion、runtime/default non-goal、review log update、plan update、Step 4B implementation boundary 和 deferred rollout route 已覆盖。
- P3：未发现阻塞项；仅提醒新文档提交前需要显式 staged。

Oracle conclusion：Step 4A docs-only gate 在主 agent 重新确认 `git diff --check`、`git status --short --branch` 和 staged diff 范围后可以提交。

## 13. Step 4B Follow-Up

Step 4B has implemented the future boundary defined by this gate as pure report-only helpers:

- `createAssetPackMetadataBridgeSummary`
- `createAssetResolverDiagnosticsSummary`

Step 4B did not implement runtime/default integration, resolver decision changes, QA / Workbench / Phaser integration, production/default asset pack loading, repair writeback, unsupported semantic inference, large asset library scan/import or generated artifact commit.

Detailed Step 4B record: `docs/refactor-log/asset-pack-metadata-bridge-step-4b.md`.
