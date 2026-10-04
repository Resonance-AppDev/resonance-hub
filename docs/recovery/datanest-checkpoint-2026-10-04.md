# Hub recovery checkpoint — 2026-10-04

## Verified source and access

- Repository: `Resonance-AppDev/resonance-hub`.
- Source pin: `ff745cf4706ec21cf9f56cb3db7d5fcaf445d178`.
- `main` matched that pin when checked on 2026-10-04.
- Recovery branch: `recovery/datanest-baseline-2026-10-04`.
- ChatGPT Codex Connector installation `167732787` is scoped to this repository only.
- Branch creation through the connector succeeded after installation, verifying actual write access.

## Preserved behavior

The pinned source already contains the Open Nova Studio and Start creating homepage CTAs,
the Latest Updates section, `/content/updates.json`, and the unauthenticated
`/api/public/app-status/health` endpoint. Source presence is not proof of a working deployment.
The current source describes a temporary free promotion with new billing paused; retain that
behavior. Hub billing and entitlement authority remain in this repository; DataNest registration
must not move commercial server functionality into the DataNest site.

## Acceptance and certification

Run against an explicitly chosen deployed candidate:

```sh
node scripts/verify-recovery-deployment.mjs https://YOUR-CANDIDATE-ORIGIN > recovery-acceptance.json
```

The check rejects redirects/sign-in walls and verifies rendered CTAs, updates data,
and the public status schema/registry, including Nova Studio from the pinned source
(the September 19 status snapshot predates that entry). Its registry check does not independently probe spoke
availability or certify billing, authentication, database state, or visual layout.
Capture desktop/mobile screenshots and functional evidence separately. Attach the exact
candidate commit, deployment origin, JSON result, screenshots, Audit Optimizer findings,
and human-reviewer approval before certifying or promoting a version.

## Remaining blocker and resume trigger

The connected `DataNest-Supository` account returned GitHub's account-suspended error.
DataNest PR #470 could not be read through either available account, so its reported
registration changeset is not independently verified or reproduced here.

Resume instruction: Read DataNest PR #470 and its current diff after repository access is
restored. Compare its exact pins and registration changeset with this checkpoint. Implement
only the reviewed DataNest changes on an isolated branch, run its checks, obtain Audit
Optimizer evidence and human approval, then synchronize through the governed pipeline.
Do not treat this checkpoint or source recovery as deployment certification.
