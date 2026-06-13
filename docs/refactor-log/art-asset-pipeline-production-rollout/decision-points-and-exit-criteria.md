# Decision Points and Exit Criteria

## After Step 10B

Proceed to Step 11A only if:

- bridge green canary passes;
- resolver-adjacent green canary passes;
- negative diagnostics are separate;
- no runtime/default behavior changed;
- no large library was touched;
- Oracle or documented self-review has no P0/P1/P2 blockers.

Current repository note: Step 10B is committed as `2ede0c0`; the remaining branch-boundary decision is whether to fast-forward it into `main` before Step 11A.

## Before Step 11B

Proceed only if:

- Step 11A docs-only gate is complete;
- feature flag name and default state are defined;
- flag-off equivalence tests are designed;
- rollback path is documented.

## Before Step 12B

Proceed only if:

- Step 12A gate is complete;
- preview users/owners are defined;
- safe field allowlist is defined;
- preview is read-only;
- sensitive fields are excluded.

## Before Step 13A

Proceed only if:

- small fixture pipeline is complete;
- bridge diagnostics are complete;
- runtime/preview decisions are complete or explicitly deferred;
- storage-policy discussion is ready.

## Before Step 13B

Proceed only if:

- Step 13A gate is complete;
- large library location is known;
- inventory command cannot mutate or copy source files;
- report path is safe.

## Before Step 13C

Proceed only if:

- inventory dry-run is complete;
- storage policy is approved;
- rights/licensing policy is approved;
- batch size is approved;
- rollback policy is defined.

## Before Step 14B

Proceed only if:

- Step 14A gate is approved;
- QA signoff exists;
- rights/licensing signoff exists;
- rollback plan exists;
- feature flag/stage plan exists;
- performance budget exists;
- monitoring plan exists.

## Final Exit Criteria

The production rollout lane is complete only if:

- production rollout was controlled;
- rollback drill completed;
- default behavior change was approved;
- unsupported assets are not silently promoted;
- repair writeback remains controlled or explicitly approved;
- large library policy is followed;
- QA and rights signoffs are recorded;
- final docs are updated.
