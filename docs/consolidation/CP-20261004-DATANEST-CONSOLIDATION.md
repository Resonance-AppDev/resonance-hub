# CP-20261004 — DataNest consolidation into Resonance-AppDev

Status: PREPARED / WAITING FOR SOURCE ACCESS RESTORATION

## Canonical resume trigger

`Resonance-AppDev/resonance-hub → governance/prepare-datanest-consolidation-20261004 → restore DataNest-Supository access → complete source inventory → transfer Mirror-DataNest first → validate → reconcile DataNest PR/governance state → transfer DataNest → rebind integrations/domains → enforce protected-main governance → acceptance certification`

## Prepared artifacts

- `docs/consolidation/datanest-resonance-appdev-consolidation-plan.md`
- `docs/consolidation/repository-transfer-manifest.yaml`

## Verified target state at preparation

- Target organization: `Resonance-AppDev`
- Existing target repository: `Resonance-AppDev/resonance-hub`
- Active Resonance identity has admin/push authority on `resonance-hub`.
- `resonance-hub/main` at preparation: `aa2adacb1dfef869f8e011528ad5ed9bfeabb38a`.
- Main branch was not branch-protected at preparation time; CODEOWNERS ownership exists and must not be treated as equivalent to protected-main enforcement.

## Known source state

- `DataNest-Supository` API/admin access is currently unavailable because the source identity is suspended/invalid.
- Known source repositories:
  - `DataNest-Supository/DataNest`
  - `DataNest-Supository/Mirror-DataNest`
- Known DataNest main ref before preparation: `afd2ce44e9150eceb0b6b254bec58aa4476e81d5`.
- Known PR #469 head: `c581e0393aad6b3825e5c86eca749eacbc88669e`; live approval/thread state must be re-read after source access is restored.

## Required next actions after access restoration

1. List all repositories owned by `DataNest-Supository`; update the transfer manifest with every repository and exact default-branch SHA.
2. Inventory open PRs/issues, unresolved review threads, tags/releases, branch protections/rulesets, Pages/custom domains, Actions environments, integrations and deployment dependencies.
3. Do not record secret values; record only names/dependencies needed for migration.
4. Verify `Resonance-AppDev/<repo>` target names are free and organization transfer policy permits the move.
5. Capture backup/ref evidence.
6. Transfer `Mirror-DataNest` first and validate redirects, workflows, R&D Test Mode, Pages/custom domain, permissions and governance.
7. Re-read PR #469 and any other DataNest governance work. Do not transfer/merge around stale approvals or unresolved review findings.
8. Transfer `DataNest` only after Mirror rehearsal passes.
9. Update cross-repository links/remotes, Pages/custom-domain configuration, badges, workflows and integrations to the `Resonance-AppDev` namespace.
10. Apply/verify protected-main rules and required review/check policy, including `resonance-hub` where current branch protection is absent.
11. Run end-to-end governance acceptance and record certification evidence.

## Stop conditions

Stop and require explicit governance review if:

- source history or refs do not match the frozen inventory,
- repository-name collisions exist,
- transfer would alter repository visibility or billing unexpectedly,
- Pages/custom-domain ownership cannot be safely rebound,
- any critical workflow/integration cannot be mapped,
- an in-flight governance PR has a new head or unresolved review finding,
- GitHub Support requires a migration route other than native transfer.

No repository transfer, deletion, archival, history rewrite, or production deployment was performed by this checkpoint.
