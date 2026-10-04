# DataNest / Hub consolidation discovery and resume plan

Status: partial discovery; source comparison blocked.
Recorded: 2026-10-04 (Africa/Johannesburg).
Hub baseline: `aa2adacb1dfef869f8e011528ad5ed9bfeabb38a` on `main`.
Scope: repository discovery and planning only. This document does not authorize a source-of-truth transfer, production deployment, database migration, or commercial-policy change.

## Verified observations

- Resonance account access successfully read `Resonance-AppDev/resonance-hub`.
- The DataNest-Supository account returned HTTP 403, "Sorry. Your account was suspended".
- Reading `DataNest-Supository/DataNest` through the Resonance account returned HTTP 404. This does not establish whether the repository was deleted, renamed, private, or inaccessible.
- Hub main's recursive tree was complete (`truncated: false`). No `AGENTS.md` appeared in that tree.
- Hub already contains `src/lib/datanest/`, `scripts/datanest/`, five DataNest MCP tool files, DataNest verification tests, and DataNest-named database migration files.
- `docs/myify/MYIFY-DATANEST.md` describes a distinct carrier-capacity accounting module. Do not conflate it with repository governance or the memory subsystem merely because all use the DataNest name.
- `README.md` declares Hub billing, entitlement, telemetry and shared-governance authority.
- `src/lib/promotion.ts` sets `FREE_PROMOTION_ACTIVE = true`. `src/lib/billing-catalog.ts` returns empty packs/SKUs and `checkoutAvailable: false`. `scripts/verify-commercial-mode.ts` guards the promotion. Preserve this current behavior; retaining billing authority does not mean enabling checkout.
- Branch metadata reports `protected: false` and status enforcement off for main. The repository rulesets endpoint returned an empty array. CODEOWNERS exists, but its presence alone does not enforce approval.
- `docs/ci/required-checks.md` uses an older repository-owner path and an example with zero required approving reviews. It should not be applied blindly to a human-approval migration.
- `package.json` defines Bun unit tests and a commercial-mode prebuild. README's description of a Vitest suite and of prebuild is stale relative to these scripts.
- Hub has separate Cloudflare, local Node, and Railway build configurations. No deployment target is selected or changed by this plan.

Evidence: the above paths were read at the pinned Hub baseline. Repository access, main branch metadata, the recursive tree, and the rulesets endpoint were read through the GitHub connection. No live database, runtime, or production behavior was verified.

## Proposed authority boundaries

These are requirements for a future integration, not claims that they are already enforced.

| Concern | Authority / boundary |
| --- | --- |
| Hub application, commercial configuration, checkout and entitlements | Hub; preserve current free-promotion behavior |
| Original DataNest source and operational governance | DataNest remains canonical until explicit human approval changes authority |
| Mirror-DataNest R&D | Retain accessible R&D testing and its evidence path; inspect actual source before implementing |
| Promotion to production | Mirror evidence → Audit Optimizer review → human approval → certified version → deployment |
| Hub's existing DataNest memory and MCP implementation | Existing Hub implementation; compare contracts before connecting or replacing anything |
| MYIFY DataNest accounting | Distinct domain; retain its existing boundaries |
| Shared code | Extract only after semantic equivalence and ownership are demonstrated |

R&D accessibility must not bypass production approval or expose private evidence. Define the precise access scope from actual DataNest configuration before integration.

## Deterministic consolidation map

The source-side entries are unresolved until DataNest can be read. This is a provisional decision map, not a completed file-by-file migration map.

| Current Hub area | Initial action | Requirement before any change |
| --- | --- | --- |
| `src/lib/datanest/` | Keep in place | Compare source formats, lifecycle, IDs, visibility, redaction and evidence contracts |
| `src/lib/mcp/tools/datanest-*.ts` | Keep in place | Reconcile tool contracts and source authority |
| `scripts/datanest/` | Keep in place | Separate artifact/history ingestion from repository consolidation |
| `docs/myify/MYIFY-DATANEST.md` and MYIFY implementation | Keep in place | Prove domain overlap before sharing code |
| Billing / checkout / entitlement functions and routes | Keep in place | Preserve promotion and non-billable DataNest boundary |
| Root package, lockfiles, Vite and TypeScript configuration | Keep in place | Compare versions, aliases, runtime and build targets |
| Root `.github/workflows/` and CODEOWNERS | Keep in place | Review trigger scope, permissions, ownership and required checks |
| Database migration trees | No execution or relocation | Schema inventory, applied-version evidence, isolated validation and rollback review |
| External DataNest application | Remain separate initially | Obtain exact source commit, history and operational settings |
| Potential `apps/datanest/` subtree | Deferred | Approved authority model plus complete mapping and dependency review |
| Potential shared assets/configuration | Deferred | Hash and semantic comparison; named owner; avoid speculative deduplication |

If subtree import is later approved, pin its source commit and omit squash to retain reachable history. Do not assume `main` is DataNest's default branch. A subtree does not transfer repository settings, issues, secrets, protection rules or deployment services. Never flatten source into Hub's root.

## Resume triggers

Use this document from the review branch or PR until merged. Each step must record source commits, changed paths, checks, evidence, and remaining blockers.

1. **RESUME-DATANEST-ACCESS** — establish the exact accessible DataNest repository URL through an authorized account. If GitHub remains unavailable, prepare a history-preserving Git bundle through an accessible transfer route; do not require a giant filesystem ZIP. Confirm default branch, commit, LFS pointers/objects, submodules, and local uncommitted work. Completion: both source snapshots and histories are available.
2. **RESUME-DATANEST-INVENTORY** — read source instructions, package/lockfiles, CI, deployment configuration, governance, mirror controls and evidence manifests. Produce an exact source-path → target-path → action → owner map. Completion: all retained, excluded, moved and duplicate items have explicit reasons.
3. **RESUME-DATANEST-CONTRACTS** — distinguish repository governance, Hub memory/MCP, and MYIFY; compare canonical-source ownership and existing database models. Completion: interface and conflict-resolution decisions are documented.
4. **RESUME-DATANEST-GOVERNANCE** — propose current required-check names and at least one human reviewer, inspect feasible enforcement for this account/repository, and document Audit Optimizer's actual interface. Do not claim certification from CODEOWNERS or test success alone. Completion: enforcement and evidence requirements are reviewable; any settings changes have appropriate authorization.
5. **RESUME-DATANEST-INTEGRATION** — implement only the mapped integration in an isolated branch after the source and authority decisions are approved. Keep independent build/deployment boundaries initially. Completion: reviewable diff and provenance with no competing editable canonical source.
6. **RESUME-DATANEST-VALIDATION** — run appropriate Bun unit tests, lint, commercial-mode prebuild and the chosen build-target checks; exercise non-billable access and unchanged checkout behavior, source/evidence lineage, mirror navigation, human approval, visual/function testing and rollback. Record failures without claiming success. Completion: evidence tied to exact commits.
7. **RESUME-DATANEST-PROMOTION** — human review of evidence, Audit Optimizer outcome and version certification; then approved deployment and post-deployment verification. Completion: approved release record and recoverable prior version.

## Cloud handoff

Use an authorized Codex Cloud environment containing accessible snapshots of both repositories. First run discovery against pinned commits and continue from the earliest incomplete trigger above. Persist progress and evidence in Git so a resumed task does not depend on chat memory. No cloud task was launched as part of this discovery.

## Validation and rollback of this proposal

This proposal only adds this Markdown file. Paths and script names were checked against the pinned Hub tree and selected file contents. No application tests were run because no application code changed. Full two-repository comparison remains blocked. To withdraw the proposal, close the draft PR or revert its documentation commit; no production rollback is required.
