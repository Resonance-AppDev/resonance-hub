# Signed human source approvals

An unsigned JSON status is not proof of human approval. Version 2 accepts only a
canonical JSON envelope containing a base64 payload and an Ed25519 signature.
Use `ops/forge/Approve-SovereignCandidate.ps1`; do not hand-edit an envelope.

The trusted public-key registry is **outside Git-controlled source**, in the
explicit bare authority's `governance/policy.json`. Only the administrator may
enroll reviewers. A key proves control of that enrolled key, not a legal identity;
the administrator must establish the human identity during enrollment. Keep the
reviewer's private key outside source, backups of source, CI and this repair ZIP.
Protect keys and the server policy/hooks/config/refs with OS access controls.
An administrator able to change server files can bypass hooks; this is not a
protection against the machine owner.

The signed payload binds repository identity, current old main, candidate SHA and
tree, the full source-validation receipt, reviewer identity, 24-hour expiry and
source-only scope. The envelope is one new `evidence/approvals/<id>.json` file.
Commit **only that file** directly on the candidate. Promotion rejects any other
change, extra commit, merge approval commit, stale main, unknown reviewer, expired
approval, invalid signature or malformed/noncanonical JSON.

The source gate covers traceability, Open Nova manifests, worker manifests, diff
integrity and nested-repository checks. It explicitly does not replace application
or runtime certification. Review application and runtime evidence separately.

A repair approval in chat does not create a source-promotion signature. No real
reviewer key or signed approval is shipped with the repair. Test keys and receipts
are generated only inside disposable test repositories and then removed.

See `docs/deployment/SOVEREIGN-FORGE-SERVER-RUNBOOK.md` for the operator sequence.
