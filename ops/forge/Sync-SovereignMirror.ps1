#requires -Version 7.0
[CmdletBinding()]
param(
    [Parameter(Mandatory)][string]$AuthorityPath,
    [Parameter(Mandatory)][string]$MirrorPath
)
$ErrorActionPreference = 'Stop'
# Uses receive hooks through a local push; never bypasses protection with fetch/update-ref.
& node (Join-Path $PSScriptRoot 'forge-control.mjs') sync --authority $AuthorityPath --mirror $MirrorPath
if ($LASTEXITCODE -ne 0) { throw 'Mirror baseline synchronization failed.' }
