# Local Sovereign Forge handoff — repaired controls

Follow `docs/deployment/SOVEREIGN-FORGE-SERVER-RUNBOOK.md` version 2 for the active
local-only process. Earlier default Weed-host bootstrap commands are superseded.

Existing checkpoint authority:
`C:\Resonance AppDev-DataNest_05102026\LOCAL-GIT\DataNest.git`.
Checkpoint main: `0794ffad8e3a1cc8277f69ee3bc53a3770ce9252`.
Reverify that ref before any future action; do not reset it to this checkpoint.

The repair package updates only the reconciliation worktree. It does not initialize
an authority, enroll a reviewer, install hooks, sign an approval or promote source.
Next stages are source review, selective candidate commit, exact-candidate source
validation, separate reviewer enrollment/control installation, human signature,
and exact-SHA local promotion. Runtime testing and deployment remain separate.

New controls:
- Ed25519 reviewer signature, strict JSON envelope and expiry.
- Approval binds old main, candidate commit/tree and full source gate receipt.
- Exactly one approval-only commit after the reviewed candidate.
- Explicit existing local authority path; no remote-name or branch-name inference.
- Canonical main fast-forward only; no deletion, bootstrap push or tag push.
- Mirror baseline follows only the bound authority; R&D `rnd/*` stays unrestricted.
- Server post-receive evidence records completed main updates.

Reviewer keys and server controls need operator-managed filesystem permissions.
This package does not establish cross-node trust, network transport or public hosting.
