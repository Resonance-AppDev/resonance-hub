#requires -Version 7.0
[CmdletBinding()]
param(
    [string]$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot '..\..')).Path,
    [Parameter(Mandatory)][string]$AuthorityPath,
    [Parameter(Mandatory)][string]$ExpectedHead,
    [Parameter(Mandatory)][string]$ApprovalId
)
$ErrorActionPreference = 'Stop'
# ExpectedHead is the approval-only commit; the signed receipt binds the candidate.
# No branch-name default, remote alias, tag publication or deployment operation.
& node (Join-Path $PSScriptRoot 'forge-control.mjs') publish `
    --source $RepoRoot --authority $AuthorityPath --expectedHead $ExpectedHead --approvalId $ApprovalId
if ($LASTEXITCODE -ne 0) { throw 'Governed local source promotion failed; inspect output before retrying.' }
