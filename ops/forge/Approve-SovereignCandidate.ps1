#requires -Version 7.0
[CmdletBinding()]
param(
    [string]$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot '..\..')).Path,
    [Parameter(Mandatory)][string]$AuthorityPath,
    [Parameter(Mandatory)][string]$CandidateCommit,
    [Parameter(Mandatory)][string]$ValidationReceipt,
    [Parameter(Mandatory)][string]$ReviewerId,
    [Parameter(Mandatory)][string]$PrivateKeyPath,
    [Parameter(Mandatory)][string]$ApprovalId
)
$ErrorActionPreference = 'Stop'
# Requires a separate enrolled key and interactive exact-SHA human confirmation.
# Never run this on behalf of a reviewer without their explicit source-promotion decision.
& node (Join-Path $PSScriptRoot 'forge-control.mjs') sign `
    --source $RepoRoot --authority $AuthorityPath --candidate $CandidateCommit `
    --receiptPath $ValidationReceipt --reviewer $ReviewerId --privateKey $PrivateKeyPath --approvalId $ApprovalId
if ($LASTEXITCODE -ne 0) { throw 'Approval signing failed.' }
