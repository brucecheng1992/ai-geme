# Consolidated Review Gates

## Universal P0

Any of these blocks the step:

- touches large library before Step 13A;
- changes runtime/default behavior before Step 14A/14B;
- changes resolver decisions in diagnostics-only steps;
- wires fixture/canary assets into production/default asset packs;
- makes repair-enabled mode default;
- silently repairs or rewrites source metadata;
- silently promotes unsupported assets;
- commits generated artifacts accidentally;
- uses absolute local machine paths in committed fixtures or reports;
- produces nondeterministic output in tests or reports;
- bypasses metadata validation/export gates;
- pushes, syncs, moves tags, deletes tags, or drops stashes without instruction.

## Universal P1

- unclear step scope;
- unclear input/output shape;
- unstable diagnostic codes or JSON shape;
- docs imply a later step is complete;
- tests depend on production/default paths in a canary-only step;
- output contains timestamps or machine-specific paths;
- feature flags or defaults are ambiguous.

## Universal P2

- happy-path-only tests;
- no deterministic output test;
- no negative diagnostics test where applicable;
- no plan/review log update;
- no explicit large-library exclusion;
- no generated-artifact exclusion check;
- no branch-boundary closure before next step.

## Universal P3

- naming issues;
- formatting issues;
- cross-link cleanup;
- small wording issues.

## Step-Specific P0 Additions

Step 11B:

- feature flag is on by default;
- flag-off behavior changes;
- invalid runtime artifact is loaded;
- large library is read.

Step 12B:

- sensitive internal/provenance fields exposed;
- preview mutates metadata;
- preview changes runtime/default behavior.

Step 13B:

- inventory mutates or copies source library files;
- report exposes sensitive absolute paths.

Step 13C:

- imports more than approved batch size;
- commits bulk binaries against policy;
- imports assets without sidecar metadata.

Step 14B:

- production change without rollback;
- production change without QA/rights signoff;
- performance budget ignored.
