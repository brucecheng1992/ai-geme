# Decision Points and Exit Criteria

## After Step 10B

Proceed to Step 11A only if:

- bridge green canary passes;
- resolver-adjacent green canary passes;
- negative diagnostics are separate;
- no runtime/default behavior changed;
- no large library was touched;
- Oracle or documented self-review has no P0/P1/P2 blockers.

Current repository note: Step 10B and Steps 11A through 13D-B are already complete; this section remains historical exit criteria for that boundary.

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

## Before Step 13E-B

Proceed only if:

- Step 13E-A docs-only gate is complete;
- Step 13D-B batch-zero semantic dry-run / bridge evidence remains the baseline;
- the approved source remains the same Kenney Pirate Kit family;
- the additional batch size is capped at 10 assets;
- the committed Pirate Kit fixture total is capped at 20 assets after Step 13E-B;
- every added asset has matching sidecar metadata and an existing selected preview/reference image;
- no generated thumbnails or generated artifacts will be committed;
- 100% of added assets have main-agent implementation evidence and Oracle read-only review coverage for source path, committed path, preview path, sidecar path, license/source inheritance, file size, runtime-safe path and semantic-role rationale;
- validation includes metadata validate, runtime-safe export, default canary, repair-enabled canary, comparison, bridge diagnostics, contracts, full tests and typecheck;
- rollback can restore the Step 13D-B 10-asset batch-zero fixture by removing only the Step 13E-B additions.

## Before Step 14A

Proceed only if:

- Step 13E-A has either approved Step 13E-B boundaries or explicitly deferred expansion;
- any executed Step 13E-B expansion is validated and reviewed;
- runtime/default integration remains parked unless Step 14A explicitly opens it;
- production asset packs remain untouched;
- rights/licensing, storage, QA and rollback evidence are ready for production-gate review.

## Before Step 14B

Proceed only if:

- Step 14A gate is approved and still points to the same 20-asset Pirate Kit fixture evidence;
- Step 14B scope is Mode B non-default feature flag path, or Mode C internal preview / QA-only path if required for the same approved output;
- the feature flag / opt-in guard is off by default;
- flag-off equivalence tests are designed;
- flag-on tests are limited to the approved fixture-backed or runtime-safe artifact-backed scope;
- rollback switch and invalid/missing artifact fail-closed tests are designed;
- production/default asset packs remain untouched unless a separate later gate approves a tiny reversible mutation;
- runtime/default behavior remains unchanged while the flag is off;
- repair-enabled remains non-default;
- source metadata repair/writeback remains disallowed;
- large-library bulk scan remains disallowed;
- QA signoff path exists;
- rights/licensing signoff path exists and preserves Kenney Pirate Kit Creative Commons CC0 evidence;
- performance / size budget exists for asset count, artifact size, loading impact and bundle/package impact;
- failure budget blocks metadata validation failures, runtime export failures, canary failures, comparison failures, bridge/resolver-adjacent diagnostic errors, check-path failures, absolute path leakage, tracked generated artifacts, performance regression, asset count mismatch and unreviewed asset changes.

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
