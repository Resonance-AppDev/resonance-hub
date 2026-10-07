#requires -Version 7.0
[CmdletBinding()]
param(
    [Parameter(Mandatory)][string]$AuthorityPath,
    [string]$MirrorPath
)
$ErrorActionPreference = 'Stop'
$Arguments = @((Join-Path $PSScriptRoot 'forge-control.mjs'), 'verify', '--authority', $AuthorityPath)
if ($MirrorPath) { $Arguments += @('--mirror', $MirrorPath) }
& node @Arguments
if ($LASTEXITCODE -ne 0) { throw 'Local forge verification failed.' }
