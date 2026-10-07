#requires -Version 7.0
[CmdletBinding()]
param(
    [string]$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot '..\..')).Path,
    [Parameter(Mandatory)][string]$AuthorityPath,
    [string]$MirrorPath,
    [Parameter(Mandatory)][string]$ExpectedSourceCommit,
    [Parameter(Mandatory)][string]$ExpectedAuthorityMain,
    [Parameter(Mandatory)][string]$ValidationReceipt,
    [Parameter(Mandatory)][string]$ReviewerPublicKeys,
    [string]$RepositoryId = 'DataNest-Supository'
)
$ErrorActionPreference = 'Stop'
# Installs controls on EXPLICIT EXISTING repositories. It never creates an authority,
# changes remotes, creates reviewer keys, advances refs, or issues an approval.
$Arguments = @(
    (Join-Path $PSScriptRoot 'forge-control.mjs'), 'install',
    '--source', $RepoRoot, '--authority', $AuthorityPath,
    '--expectedSource', $ExpectedSourceCommit, '--expectedMain', $ExpectedAuthorityMain,
    '--receiptPath', $ValidationReceipt, '--reviewersPath', $ReviewerPublicKeys,
    '--repositoryId', $RepositoryId
)
if ($MirrorPath) { $Arguments += @('--mirror', $MirrorPath) }
& node @Arguments
if ($LASTEXITCODE -ne 0) { throw 'Control installation failed. Preserve any partial governance directory and its config backup for review.' }
