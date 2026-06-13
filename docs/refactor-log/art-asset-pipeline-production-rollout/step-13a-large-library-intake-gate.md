# Step 13A — Large Library Intake Gate

Status: future docs-only gate. This is the first step that may discuss touching the large art library, but it must not inspect or import it.

## Goal

Define storage, licensing, batching, validation, and rollback rules before any large art library inventory or import.

## Required Decisions

- large library location;
- storage mode: repo, Git LFS, or external artifact store;
- allowed formats;
- batch size;
- per-file and total-size limits;
- required metadata coverage before import;
- thumbnail policy;
- rights/licensing tracking;
- sampled asset review owner;
- rollback path;
- failure budget.

## Not Allowed

- no import;
- no inventory execution;
- no metadata generation;
- no runtime integration;
- no source file mutation.

## Validation

```bash
git diff --check
```

## Review Gate

P0:

- imports large library before gate approval;
- commits bulk binaries without policy;
- allows missing sidecar metadata without policy;
- allows unknown-rights assets into pipeline;
- changes runtime/default behavior;
- allows repair writeback.

P1:

- storage policy unclear;
- batch size unclear;
- rights policy unclear;
- validation budget unclear;
- rollback unclear.

P2:

- no review ownership;
- no sampling policy;
- no failure handling;
- no plan/review log update.

P3:

- wording, naming, formatting, cross-link cleanup.
