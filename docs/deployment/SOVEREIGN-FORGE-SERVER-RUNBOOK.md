# Sovereign Forge: local authority and signed promotion

## Current scope

The established local authority is
`C:\Resonance AppDev-DataNest_05102026\LOCAL-GIT\DataNest.git`, with checkpoint main
`0794ffad8e3a1cc8277f69ee3bc53a3770ce9252`. This is a historical checkpoint to
reverify before operations, not a permanently pinned future main.

The source repair does not create another forge, install active hooks, enroll a
reviewer, commit, advance main, start services or deploy. Earlier host-specific
Weed paths and network bootstrap instructions are superseded for this local-only
workflow. Historical evidence dated October 4 remains historical; it does not
certify the repaired controls or the current application runtime.

## Requirements and trust

Use PowerShell 7, Node 20+ and Git. The engine has no npm dependencies. Scripts use
absolute local-disk repository paths; remote aliases, URLs and UNC paths are not
accepted. Git network protocols are disabled for engine child processes. URL
rewrite configuration and existing client pre-push hooks cause publication to
stop for separate review. Global Git configuration is never changed.

The administrator explicitly enrolls a human reviewer's Ed25519 public key. Store
private keys outside repositories, artifact bundles, CI and shared evidence.
Protect private keys, installed controls, policy, Git config and refs using OS
permissions. A writer with only Git receive access cannot forge a trusted signature;
an administrator with direct filesystem access remains trusted and can alter Git
refs or hooks. Version 2 is not an ACL-management or key-distribution system.

Prepare a reviewer registry JSON mapping an agreed reviewer ID to an independently
verified Ed25519 public PEM, for example `{"reviewer-id":"-----BEGIN PUBLIC KEY-----\n..."}`.
No real keys are generated, chosen or enrolled automatically. Do not use test keys.
Key generation, identity verification and Windows ACL setup require a separate
local operator step before live control installation.

## 1. Apply and test the source repair

Use the repair package's guarded installer against the detached reconciliation
worktree only. It verifies input and payload hashes, parses PowerShell, runs the
Node governance tests, backs up old files and records a receipt. It does not stage
files. Keep the six oddly named untracked files preserved; do not use `git add -A`.

Run governance regression tests again only after relevant changes:

```powershell
node --test .\ops\forge\tests\forge-control.test.mjs
```

The tests create independent temporary Git repositories and ephemeral test keys.
They exercise real receive hooks and delete their own fixtures. They do not open
your authority or mirror.

## 2. Freeze a reviewed candidate

Review and selectively commit intended source changes, leaving paste-fragment
files out of the commit. Use a separate clean worktree for that candidate if the
reconciliation worktree still contains preserved untracked files. Record its full
commit SHA. Never normalize or discard preserved files just to pass a clean check.
Recheck application/runtime evidence when the selected source changes require it.
The existing 605-test pass and successful local build predate this forge repair.

## 3. Validate the exact clean candidate

```powershell
.\ops\forge\Test-SovereignForgeGate.ps1 `
  -RepoRoot '<absolute clean candidate worktree>' `
  -ExpectedCommit '<full candidate SHA>' `
  -EvidencePath '<fresh absolute receipt path outside the worktree>'
```

HEAD must equal the expected commit before and after validation. The source must
remain clean. The receipt records the candidate/tree and the five source checks.
It does not claim application validation, production authorization or a runtime
health probe. Failure leaves no passing receipt.

## 4. Install controls on existing local repositories

This is a separate administrator operation after key enrollment and candidate
review. Do not run it merely to apply source files.

```powershell
.\ops\forge\Initialize-SovereignForge.ps1 `
  -RepoRoot '<absolute clean candidate worktree>' `
  -ExpectedSourceCommit '<full candidate SHA>' `
  -AuthorityPath 'C:\Resonance AppDev-DataNest_05102026\LOCAL-GIT\DataNest.git' `
  -ExpectedAuthorityMain '<verified current main SHA>' `
  -ValidationReceipt '<gate receipt>' `
  -ReviewerPublicKeys '<public reviewer registry JSON>' `
  -MirrorPath '<explicit existing local bare mirror>'
```

The mirror parameter is optional until a mirror path has been established. Neither
repository is created implicitly. Installation creates a server-owned `governance`
directory containing a fixed engine, hooks, public policy and a backup of the prior
Git configuration. It changes repository-local hook/receive settings, not refs.
It refuses to overwrite an existing governance installation. On a partial failure,
preserve the directory and config backup for diagnosis; do not rerun blindly.

Main updates require a valid signed approval and fast-forward ancestry. Main
creation/deletion, tags and other canonical refs are rejected. Mirror `rnd/*`
branches permit creation, force updates and deletion. Mirror `canonical-main` may
only advance to the exact main of the bound authority; it cannot be deleted or
rewritten to an arbitrary R&D commit. It is a controlled moving baseline, not an
immutable ref.

## 5. Human review and signature

After examining the candidate, source gate and application/runtime evidence, the
enrolled reviewer runs this in their own interactive terminal:

```powershell
.\ops\forge\Approve-SovereignCandidate.ps1 `
  -RepoRoot '<clean candidate worktree>' `
  -AuthorityPath '<bound local authority>' `
  -CandidateCommit '<full reviewed SHA>' `
  -ValidationReceipt '<gate receipt>' `
  -ReviewerId '<enrolled ID>' `
  -PrivateKeyPath '<protected Ed25519 PKCS8 PEM path>' `
  -ApprovalId '<unique ID>'
```

The tool requires typing `APPROVE <full candidate SHA>` and verifies the key against
the enrolled public key. This implementation reads a PEM key protected by OS access
controls; hardware-backed/encrypted-key-agent integration is not implemented.
Commit only the generated JSON directly on the candidate. Do not rerun the source
gate against that approval-only commit and relabel it as the reviewed candidate.

## 6. Explicit local promotion

```powershell
.\ops\forge\Publish-SovereignForge.ps1 `
  -RepoRoot '<clean worktree at approval-only commit>' `
  -AuthorityPath '<bound local authority>' `
  -ExpectedHead '<full approval-only commit SHA>' `
  -ApprovalId '<unique ID>'
```

The publisher verifies the exact HEAD, clean state, installed controls and signed
candidate receipt; pushes the exact SHA to the explicit local path; checks main
and the post-receive receipt; then writes a promotion receipt. A changed main makes
the old approval stale. There is no tag-push option. Post-receive records actual
accepted main updates, including a valid direct Git push; pre-receive acceptance
alone is not logged as a completed promotion. Receipts are new files, not overwritten
or described as tamper-proof. A logging failure after receive may leave main advanced;
inspect refs and receipts before retrying.

## 7. Mirror synchronization and verification

```powershell
.\ops\forge\Sync-SovereignMirror.ps1 -AuthorityPath '<authority>' -MirrorPath '<mirror>'
.\ops\forge\Verify-SovereignForge.ps1 -AuthorityPath '<authority>' -MirrorPath '<mirror>'
```

Synchronization uses a local push through the mirror hook, not a fetch/update-ref
that bypasses receive controls. It preserves R&D branches. Verification checks
policy bindings, installed engine/hook hashes, active hook path, receive settings,
Git object integrity and (when supplied) mirror baseline alignment.

## Release boundary

Source promotion is not deployment. Production needs separately approved build
artifacts, runtime configuration, runtime probes, rollback evidence and the user's
release decision. This repair contains no network activation, DNS change, migration,
service restart or automatic production operation.
