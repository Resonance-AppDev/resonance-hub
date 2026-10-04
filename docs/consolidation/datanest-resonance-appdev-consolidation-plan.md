# DataNest → Resonance-AppDev consolidation plan

Status: **PREPARED / NO TRANSFERS EXECUTED**  
Prepared: 2026-10-04  
Target ownership boundary: `Resonance-AppDev`

## Objective

Consolidate the Resonance application and DataNest repository estate under the `Resonance-AppDev` GitHub organization without collapsing distinct runtime, governance, and R&D responsibilities into one repository.

The target operating model is:

- `Resonance-AppDev/resonance-hub` — product/runtime repository and public Hub application.
- `Resonance-AppDev/DataNest` — governance, registry, certification, audit, and control-plane repository.
- `Resonance-AppDev/Mirror-DataNest` — R&D/test-mode mirror used for visual and functional validation before governed promotion.
- Any additional repositories owned by `DataNest-Supository` — inventory after source-account access is restored, then transfer individually under `Resonance-AppDev` unless an explicit exception is approved.

This is an **organization consolidation**, not a source-tree merge or monorepo conversion.

## Current verified state

- `Resonance-AppDev/resonance-hub` is accessible with administrative permissions through the active Resonance identity.
- Hub default branch: `main`.
- Hub `main` at preparation: `aa2adacb1dfef869f8e011528ad5ed9bfeabb38a`.
- The Hub currently has CODEOWNERS-based governance, but its `main` branch is not protected at the GitHub branch level at preparation time.
- The `DataNest-Supository` GitHub identity is currently suspended/invalid for API access, so a complete source-repository inventory and transfer cannot yet be executed.
- Known source repositories include `DataNest-Supository/DataNest` and `DataNest-Supository/Mirror-DataNest`.
- Last verified DataNest refs before this preparation: `main` = `afd2ce44e9150eceb0b6b254bec58aa4476e81d5`; PR #469 head = `c581e0393aad6b3825e5c86eca749eacbc88669e` and remains a governance item to reconcile before or during transfer.

## Transfer strategy

Use **GitHub native repository transfer** as the primary migration method once source access is restored. Do not replace it with a plain clone/push migration unless GitHub Support makes native transfer impossible.

Native transfer is preferred because it preserves repository history and GitHub repository state such as issues, pull requests, releases, stars/watchers, and associated repository integrations. Existing repository URLs redirect to the new owner after transfer. GitHub Pages requires separate validation because Pages URLs are not redirected the same way.

### Transfer order

1. Restore `DataNest-Supository` access through GitHub appeal/reinstatement.
2. Inventory every repository owned by `DataNest-Supository` and freeze the inventory in `repository-transfer-manifest.yaml`.
3. Validate `Resonance-AppDev` target permissions, repository-name availability, organization policies, billing/plan implications, Pages/custom-domain ownership, and Actions/security settings.
4. Create independent backup evidence for every source repository: default-branch SHA, all refs/tags, releases, open PRs/issues, branch/ruleset settings, Pages/custom-domain settings, Actions/environment names, webhook/deploy-key presence, and repository visibility.
5. Transfer `Mirror-DataNest` first as the low-risk rehearsal.
6. Validate redirects, Actions, Pages/custom-domain behavior, permissions, governance, and R&D Test Mode integration.
7. Transfer `DataNest` only after the Mirror rehearsal passes and all open governance items are reconciled or explicitly accepted for transfer.
8. Rebind repository references, remotes, badges, workflows, deployment integrations, Pages/custom domains, and cross-repository links to `Resonance-AppDev/*`.
9. Apply/verify protected-main governance and required review/check policies on the transferred repositories and on `resonance-hub`.
10. Run end-to-end acceptance: Hub ↔ DataNest registration, Mirror R&D mode, Audit Optimizer, human approval, version certification, Pages/public routes, and canonical-to-Mirror synchronization.

## Non-negotiable governance rules

- Do not delete or archive the source repositories before successful transfer validation.
- Do not recreate repositories at the old `DataNest-Supository/<name>` locations after transfer; doing so can destroy GitHub redirect behavior.
- Do not force-push or rewrite protected/canonical history as part of consolidation.
- Do not merge DataNest runtime/governance code into `resonance-hub` merely to reduce repository count.
- Preserve DataNest as the governance/certification authority and Mirror-DataNest as the R&D validation surface.
- Preserve human-review approval for production synchronization.
- Any head change to an in-flight governance PR invalidates prior check/approval freshness and must be revalidated.

## Readiness gates

A transfer may proceed only when all of the following are true:

- Source GitHub access is restored and source administrator authority is verified.
- Target `Resonance-AppDev` ownership/admin authority and repository-creation/transfer permissions are verified.
- Complete DataNest repository inventory is captured.
- Target repository names are verified available.
- Backup/ref evidence is captured for every source repository.
- Open PRs/issues and unresolved review threads are inventoried.
- Pages/custom-domain and deployment dependencies are mapped.
- Actions secrets/environment names are inventoried without copying secret values into repository documentation.
- Branch/ruleset and CODEOWNERS policy is mapped for post-transfer enforcement.
- A rollback owner and decision point are identified before each transfer.

## Rollback posture

The consolidation is staged, one repository at a time. The transfer is considered provisional until post-transfer verification passes. No old-location repository may be recreated during the validation period. If a transfer must be reversed, use GitHub-supported ownership transfer back to the original owner only after permissions and redirect implications are reviewed.

## Immediate blocker

The only hard blocker to source-side execution is restoration of administrative access to `DataNest-Supository`. Preparation under `Resonance-AppDev` can continue while the appeal is pending, but no source transfer should be attempted through alternate identities or history-copy workarounds that would bypass repository governance/state.
