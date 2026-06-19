---
description: Repository-local global rules for ai-game-maker agents.
alwaysApply: true
version: 0.1
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
