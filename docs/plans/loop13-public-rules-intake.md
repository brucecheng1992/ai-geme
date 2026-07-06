# Loop13 Public Readiness And Required Rules Intake

## Current Atomic Step

checkpoint_id: loop13.public_readiness_required_rules_intake
closure_scope: atomic_step
status: recorded
recorded_at: 2026-07-07
repo: brucecheng1992/ai-geme
default_branch: main
local_branch: codex/loop13-intake-20260707-public-rules
base_commit: d07e01d9e653af4a4972d22181027300409b2dbc
parent_loop_status: running
global_exit_conditions_met: false
next_action: CONTINUE_PARENT_LOOP
next_atomic_step: loop13.required_rules_end_to_end_pr_probe

## Scope

This intake records the public-readiness and required-rules state after the
Loop12 PR Validation workflow landed on `main`.

Included:

- audit public repo readiness with current GitHub and local tracked-file facts
- clear stale local remote-tracking evidence for the merged Loop12 fix branch
- verify repository visibility
- verify the PR Validation workflow and job-level `required` gate
- create and verify the default-branch required status-check ruleset
- define the next Loop13 atom without changing runtime, DSL, provider, asset, or QA semantics

Excluded:

- no runtime, DSL, capability registry, generated artifact, provider, or QA implementation changes
- no claim that Step37/Step38 semantic runtime closure advanced
- no real provider call
- no merge, push, or mark-ready action from this intake branch

## Readiness Facts

| Area | Result | Evidence |
| --- | --- | --- |
| Repository visibility | `PUBLIC` | `gh repo view --json nameWithOwner,isPrivate,visibility,defaultBranchRef,viewerPermission,url` returned `isPrivate=false`, `visibility=PUBLIC`, `viewerPermission=ADMIN`. |
| Open PRs | none | `gh pr list --state open --limit 20` returned `[]`. |
| Default branch head | `d07e01d9e653af4a4972d22181027300409b2dbc` | `gh api repos/brucecheng1992/ai-geme/branches/main`. |
| Local branch base | aligned to `origin/main` | `git log --oneline -1` returned `d07e01d9 Fix PR validation full-test prerequisites (#17)`. |
| Tracked env files | `.env` not tracked; `.env.example` tracked | `git ls-files` and `git ls-tree -r --name-only origin/main` found `.env.example` only. |
| High-confidence token/private-key grep | no matches | `git grep -n -i -E '(ghp_|gho_|sk-|BEGIN ... PRIVATE KEY|AIza|xox)' origin/main --` returned no matches. |
| GitHub secret scanning | no open alerts | `gh api 'repos/brucecheng1992/ai-geme/secret-scanning/alerts?state=open&per_page=100'` returned `[]`. |
| Secret scanning settings | enabled push protection | repo security payload reported `secret_scanning=enabled` and `secret_scanning_push_protection=enabled`. |

Sensitive-word grep still finds expected non-secret references: environment
variable names, GitHub Secret references, placeholders such as
`DEEPSEEK_API_KEY=your_deepseek_api_key`, and test fixtures that assert
redaction behavior.

## Stale Branch Cleanup

- PR #17 `codex/loop12-ci-required-checks-ci-fix` is merged with merge commit `d07e01d9e653af4a4972d22181027300409b2dbc`.
- GitHub branch API no longer exposes `codex/loop12-ci-required-checks-ci-fix`; the remote branch was already gone.
- The stale local remote-tracking ref `origin/codex/loop12-ci-required-checks-ci-fix` was deleted with `git branch -dr origin/codex/loop12-ci-required-checks-ci-fix`.
- Other historical remote branches were left untouched because this intake only had merged Loop12 required-checks cleanup evidence.

## PR Validation Workflow Verification

workflow: PR Validation
workflow_id: 307891965
run_id: 28806050467
event: workflow_dispatch
head_branch: main
head_sha: d07e01d9e653af4a4972d22181027300409b2dbc
conclusion: success
ruleset_state_at_run: active

Verified jobs:

- `safety-guards`: success
- `contract-tests`: success
- `typecheck`: success
- `full-test`: success
- `required`: success

The `required` check-run comes from GitHub Actions app `integration_id=15368`
and is the only status-check context required by the ruleset. The child jobs
remain workflow-internal dependencies of the `required` aggregate job.
GitHub emitted Node 20 deprecation annotations for `actions/checkout@v4` and
`actions/setup-node@v4`; these were warnings only and did not affect the run
conclusion.

## Required Rules Verification

ruleset_id: 18578656
ruleset_name: main-required-pr-validation
ruleset_url: https://github.com/brucecheng1992/ai-geme/rules/18578656
target: branch
enforcement: active
conditions: `~DEFAULT_BRANCH`
bypass_actors: []
current_user_can_bypass: never

Required status check:

```json
{
  "context": "required",
  "integration_id": 15368,
  "strict_required_status_checks_policy": true,
  "do_not_enforce_on_create": false
}
```

Verification evidence:

- `gh api repos/brucecheng1992/ai-geme/rulesets/18578656` returned active ruleset details with the required status check above.
- `gh api repos/brucecheng1992/ai-geme/rules/branches/main` returned an applied `required_status_checks` rule from ruleset `18578656`.
- `gh api repos/brucecheng1992/ai-geme/branches/main` returned `protected=true`.
- Classic branch protection endpoint still returns 404; protection is currently provided by repository rulesets, not classic branch protection.

## Compatibility & Cutover

| Check | Required answer |
| --- | --- |
| Producer change | Repository ruleset `18578656` now requires the GitHub Actions `required` check on the default branch. |
| Consumer list | GitHub rules engine for `main`, PR mergeability checks, branch update protection, and the `PR Validation` workflow check-runs. |
| Compatibility type | `NEW_CONSUMER_REQUIRED` for remote branch update policy because classic branch protection remains absent and repository rulesets are now the active consumer. |
| Authority | GitHub repository ruleset `main-required-pr-validation` is the authority for required-check enforcement; post-rules workflow run `28806050467` proves the current `required` context exists and passes. |
| Legacy strategy | Classic branch protection is not used as success evidence. Historical workflow green runs before ruleset creation are comparison evidence only. |
| Failure policy | If the `required` check is missing, failing, from the wrong integration, or not based on the latest target branch, GitHub must block matching default-branch updates. |
| Evidence | Applied branch rules API returns `required_status_checks`; `branches/main` reports `protected=true`; current head has a successful GitHub Actions `required` check from integration `15368`. |
| Rollback | Delete ruleset `18578656` to return the repo to the pre-ruleset state without rewriting workflow history or repository commits. |

Completion note: this intake records API-level rules enforcement evidence. The
next atom remains a fresh end-to-end PR probe so Loop13 can prove mergeability
and required-check blocking behavior through the actual PR surface after the
ruleset is active.

## Next Atomic Step

loop13.required_rules_end_to_end_pr_probe:

1. Create a tiny docs-only probe branch from current `main`.
2. Open a draft PR or local-only dry-run PR probe as authorized by the user.
3. Confirm the PR surface lists `required` as required and blocks merge until PR Validation passes.
4. Close/delete the probe artifacts after evidence is recorded.
5. Keep Step37 runtime/DSL parent loop state separate from repository-rules readiness.
