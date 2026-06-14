# Artifact Storage Policy

## Generated Artifacts

Generated artifacts should stay under ignored paths such as `artifacts/`. Do not commit generated runtime, canary, comparison, or inventory artifacts unless a future step explicitly promotes a small deterministic fixture.

Committed reports must be:

- deterministic;
- small and reviewable;
- free of local absolute paths;
- free of timestamps unless the timestamp is deterministic fixture data;
- free of sensitive provenance, legal, prompt, seed, or review notes.

## Small Fixture Assets

Approved small fixture path:

```txt
tests/fixtures/art-library-small-v0.1/
```

Current policy:

- target size: 10-30 assets;
- maximum size: 50 assets;
- sidecar metadata required for every asset;
- no production asset dump;
- no large source files unless explicitly approved.

## Large Library Assets

The large art library remains forbidden until Step 13A completes. Step 13A must define:

- storage location;
- per-file and total-size limits;
- allowed formats;
- thumbnail policy;
- Git LFS or external artifact-store policy;
- rights/licensing handling;
- rollback policy.

## Runtime-Safe Metadata

Runtime-safe metadata artifacts must exclude:

- prompts;
- seeds;
- raw AI generation parameters;
- internal review notes;
- copyright/legal notes;
- creator/credit fields unless separately approved;
- absolute local paths.

## Repair Output

Repair-enabled paths must not write back to source metadata unless a future explicit gate approves it.

Current policy:

```txt
repair writeback: forbidden
repair-enabled default: forbidden
```
