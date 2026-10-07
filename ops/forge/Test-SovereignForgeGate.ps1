#requires -Version 7.0
[CmdletBinding()]
param(
    [string]$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot '..\..')).Path,
    [Parameter(Mandatory)][ValidatePattern('^([0-9a-f]{40}|[0-9a-f]{64})$')][string]$ExpectedCommit,
    [Parameter(Mandatory)][string]$EvidencePath
)
$ErrorActionPreference = 'Stop'
$RootPath = [IO.Path]::GetFullPath($RepoRoot)
$ReceiptPath = [IO.Path]::GetFullPath($EvidencePath)
if ($ReceiptPath.StartsWith($RootPath.TrimEnd('\','/') + [IO.Path]::DirectorySeparatorChar, [StringComparison]::OrdinalIgnoreCase)) {
    throw 'Write the gate receipt outside the source worktree.'
}
if (Test-Path -LiteralPath $ReceiptPath) { throw 'Receipt already exists; use a fresh filename.' }
$Engine = Join-Path $PSScriptRoot 'forge-control.mjs'
function Assert-ExactSource {
    $Output = & node $Engine assert-source --source $RootPath --candidate $ExpectedCommit
    if ($LASTEXITCODE -ne 0) { throw 'Exact clean candidate check failed.' }
    return ($Output | ConvertFrom-Json)
}
$Before = Assert-ExactSource
$Checks = [ordered]@{}
$Pwsh = (Get-Command pwsh -ErrorAction Stop).Source
& $Pwsh -NoProfile -File (Join-Path $RootPath 'ops\validation\Test-ResonanceTraceability.ps1') -RepoRoot $RootPath
$Checks.traceability = ($LASTEXITCODE -eq 0)
if (-not $Checks.traceability) { throw 'Traceability gate failed.' }
& $Pwsh -NoProfile -File (Join-Path $RootPath 'platform\open-nova\scripts\verify-build-manifest.ps1') -RootPath (Join-Path $RootPath 'platform\open-nova')
$Checks.openNovaManifest = ($LASTEXITCODE -eq 0)
if (-not $Checks.openNovaManifest) { throw 'Open Nova gate failed.' }
Push-Location (Join-Path $RootPath 'platform\ronsas')
try {
    & node '.\scripts\verify-worker-ops-manifests.ts'
    $Checks.workerOps = ($LASTEXITCODE -eq 0)
} finally { Pop-Location }
if (-not $Checks.workerOps) { throw 'Worker manifest gate failed.' }
& git.exe -C $RootPath diff --check
$Checks.gitDiffCheck = ($LASTEXITCODE -eq 0)
if (-not $Checks.gitDiffCheck) { throw 'Diff check failed.' }
$Nested = Get-ChildItem -LiteralPath $RootPath -Directory -Filter '.git' -Recurse -Force -ErrorAction Stop |
    Where-Object { $_.FullName -ne (Join-Path $RootPath '.git') } | Select-Object -First 1
$Checks.noNestedGit = ($null -eq $Nested)
if (-not $Checks.noNestedGit) { throw "Nested Git directory: $($Nested.FullName)" }
$After = Assert-ExactSource
if ($After.tree -ne $Before.tree) { throw 'Candidate changed during validation.' }
$Receipt = [ordered]@{
    schema = 'resonance-forge-validation/v2'
    checkedAt = [DateTime]::UtcNow.ToString('o')
    candidate = $ExpectedCommit
    tree = $After.tree
    clean = $true
    checks = $Checks
    status = 'passed'
    applicationValidationPerformed = $false
}
$Parent = Split-Path -Parent $ReceiptPath
[void][IO.Directory]::CreateDirectory($Parent)
$Bytes = [Text.UTF8Encoding]::new($false).GetBytes(($Receipt | ConvertTo-Json -Depth 8) + "`n")
$Stream = [IO.File]::Open($ReceiptPath, [IO.FileMode]::CreateNew, [IO.FileAccess]::Write, [IO.FileShare]::None)
try { $Stream.Write($Bytes, 0, $Bytes.Length) } finally { $Stream.Dispose() }
$Receipt | ConvertTo-Json -Depth 8
"RECEIPT: $ReceiptPath"
