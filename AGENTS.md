---
description: Repository-local global rules for ai-game-maker agents.
alwaysApply: true
version: 0.3
---

# ai-game-maker Agent Rules

## Compatibility & Cutover Check

Every new Step that changes a producer contract, schema, artifact, field, runtime behavior or QA evidence must include a `Compatibility & Cutover` section before the Step can be marked complete. Adding or validating a schema is not enough to claim the feature is implemented.

The section must answer every item below.

| Check | Required answer |
| --- | --- |
| Producer change | What contract, field or artifact was added or changed. |
| Consumer list | Which parser, normalizer, compiler, runtime, QA gate or Workbench surface reads it. |
| Compatibility type | Whether the change is lossless, adapter-backed, impossible for legacy, or requires a new consumer. |
| Authority | Which artifact is the source of truth for the semantic meaning. |
| Legacy strategy | Whether legacy is still supported, explicitly flagged, read-only migration only, or forbidden. |
| Failure policy | How the pipeline fails closed when no real consumer exists. |
| Evidence | How the Step proves downstream consumption, not just field acceptance. |
| Rollback | How a failed cutover rolls back without losing or rewriting semantics. |

Use this fixed disposition vocabulary:

```ts
type CompatibilityDisposition =
  | "LOSSLESS_COMPATIBLE"
  | "ADAPTER_REQUIRED"
  | "NEW_CONSUMER_REQUIRED"
  | "LEGACY_FORBIDDEN";
```

Disposition meanings:

- `LOSSLESS_COMPATIBLE`: all listed consumers preserve the new semantics without an adapter.
- `ADAPTER_REQUIRED`: legacy or existing consumers can continue only through a named adapter with tests and runtime evidence.
- `NEW_CONSUMER_REQUIRED`: the producer can express semantics that no current consumer can realize; the Step remains open or blocked until a real consumer is active.
- `LEGACY_FORBIDDEN`: legacy execution cannot safely consume the semantics and may run only as explicitly authorized rollback or read-only migration evidence.

Completion rule:

- A Step cannot be closed when the disposition is `ADAPTER_REQUIRED`, `NEW_CONSUMER_REQUIRED` or `LEGACY_FORBIDDEN` unless the Step records same-run evidence that the named downstream consumer actually read and acted on the new contract.
- A successful schema parse, generated JSON file or accepted field is only producer evidence. It is not consumer evidence.
- If no listed consumer can preserve the new semantics, the pipeline must fail closed instead of silently dropping fields, shortening intent, rewriting authority or falling back to a fixed template.

## Prompt Completeness & Default Duration

The project must preserve normal product usability. A normal Workbench or user prompt is allowed to omit explicit game duration, and missing duration alone must not make the generation `FAILED`, block preview/build/QA, create `unsupported_required_capabilities=["duration"]`, or mark canonical DSL generation as missing.

Distinguish strict validation fixtures from normal product prompts:

- Strict Step37/Step38 fixtures that explicitly require an 8-12 minute product duration must preserve and validate the explicit `480..720` second intent.
- Normal product and Workbench prompts without duration must resolve through product/profile defaults and continue generation.

Duration defaulting must be recorded as machine-readable evidence. The pipeline must write a duration resolution gate, such as `duration_resolution_gate`, showing:

- `duration_intent_resolved=true`
- `duration_defaulted=true` when the prompt omitted duration
- `duration_source="product_default"` or `"profile_default"` for defaulted prompts
- `missing_duration_was_fatal=false`
- `generation_failed_due_to_missing_duration=false`

Defaulting duration is not a DSL consumption failure. It must not weaken unrelated gates: art fidelity, gameplay route, win/lose state, manual review, Step38 review gates, and final loop completion remain blocked until their own evidence passes.

## Legacy Asset & Resource Cutover

After a Step updates an art pipeline, asset materializer, runtime renderer, resource manifest, DSL-to-runtime consumer, or generated playable contract, the updated production path must not keep using old assets or old resource logic as success evidence.

This applies even when the output files are newly generated, run-scoped, loaded by the runtime, bound to render objects, or marked `placeholder=false`. Re-generated files still count as old resource logic when they are produced by legacy hardcoded sprite templates, fixed role-to-shape renderers, stale generated assets, stale manifests, or legacy fallback/resource paths.

Completion evidence must prove both:

- provenance: the current run's canonical authority produced the asset/resource/manifest used by runtime objects;
- cutover quality: the updated consumer no longer relies on the old template, fallback, placeholder-style, stale, or resource-manifest logic being replaced.

If a fresh browser/manual review shows the visible result is materially unchanged after the update, or still reads as legacy template output, the Step must fail closed with a blocker such as `legacy_resource_logic_still_active`, `stale_asset_reused`, `legacy_template_asset_logic_still_active`, or `production_art_fidelity_failed`. Text labels, metadata, asset counts, `placeholder=false`, and runtime binding flags cannot override this blocker.

## Hierarchical Completion Scope

Completion is always scoped. Closing an atomic step, creating a candidate commit, receiving Oracle PASS, writing a receipt, or passing post-commit checks only closes that atomic step; it does not close the parent Stage, parent Loop, or final Step37 goal.

After every atomic closure, run the Parent Loop Driver or equivalent state evaluation. The only legal parent-loop outcomes are `CONTINUE_PARENT_LOOP`, `PAUSE_FOR_USER`, and `COMPLETE_GLOBAL_LOOP`.

- Use `COMPLETE_GLOBAL_LOOP` only when all global exit conditions are true.
- Use `PAUSE_FOR_USER` only when a verified blocker genuinely requires a user decision.
- Otherwise use `CONTINUE_PARENT_LOOP` and record a non-empty `next_atomic_step`.

When global exits are unmet and no verified user blocker exists, missing `next_atomic_step` is a validation failure, not a fourth outcome. The driver must fail closed with a structured error such as `NEXT_ATOMIC_STEP_REQUIRED`; it must not return `CONTINUE_PARENT_LOOP` with a null step, convert the state to pause/complete, or treat the atomic closure as the parent-loop stop.

`parent_stage.status` only expresses lifecycle and may be `running` or `complete`; blockers and recovery failures belong in separate fields.

Running loops must not use unscoped `stop marker`, `completed`, `closed`, `task finished`, or similar wording as a stopping reason. Use structured scoped fields such as `closure_scope: atomic_step`, `parent_loop.status`, `parent_loop.global_exit_conditions_met`, `parent_loop.next_action`, and `parent_loop.next_atomic_step`.

After compaction, resume, or a new session, rebuild loop state from repository facts: current worktree, branch, `HEAD`, status, plan/checkpoint identity, closure contract, and current evidence. New feedback belongs to the next atomic step and must not expand a step already being closed.

Focused validation must follow the actual diff impact. If a step changes telemetry event identity, event names, schema version, required or optional fields, field types, enum values, or producer/reader field shape, include the telemetry schema freeze contract such as `tests/contracts/contract-freeze.test.ts` in the focused set. Focused GREEN is local evidence only and never replaces full related contracts, `npm test`, typecheck, diff check, final diff scope review, or external Skill freshness checks.
