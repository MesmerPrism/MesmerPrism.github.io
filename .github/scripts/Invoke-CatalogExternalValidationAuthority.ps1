[CmdletBinding()]
param(
    [Parameter(Mandatory = $true)][string]$BaseRoot,
    [Parameter(Mandatory = $true)][string]$VerifierRoot,
    [Parameter(Mandatory = $true)][string]$Repository,
    [Parameter(Mandatory = $true)][string]$BaseRepository,
    [Parameter(Mandatory = $true)][string]$BaseRef,
    [Parameter(Mandatory = $true)][string]$HeadRepository,
    [Parameter(Mandatory = $true)][string]$EventName,
    [Parameter(Mandatory = $true)][string]$BaseCommit,
    [Parameter(Mandatory = $true)][string]$CandidateCommit,
    [Parameter(Mandatory = $true)][string]$PullRequestNumber
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$ExpectedRepository = 'MesmerPrism/MesmerPrism.github.io'
$ExpectedVerifierCommit = '50a4c5222c9d6c4567bac09405e43049c61b126f'
$ExpectedVerifierTree = 'ead3855a2ecc5e1240e271d81a938985457f10e8'
$ForbiddenGitEnvironmentVariables = @(
    'GIT_ALTERNATE_OBJECT_DIRECTORIES',
    'GIT_CEILING_DIRECTORIES',
    'GIT_COMMON_DIR',
    'GIT_CONFIG_COUNT',
    'GIT_CONFIG_GLOBAL',
    'GIT_CONFIG_NOSYSTEM',
    'GIT_CONFIG_PARAMETERS',
    'GIT_CONFIG_SYSTEM',
    'GIT_DIFF_OPTS',
    'GIT_DIR',
    'GIT_DISCOVERY_ACROSS_FILESYSTEM',
    'GIT_GLOB_PATHSPECS',
    'GIT_ICASE_PATHSPECS',
    'GIT_INDEX_FILE',
    'GIT_LITERAL_PATHSPECS',
    'GIT_NAMESPACE',
    'GIT_NOGLOB_PATHSPECS',
    'GIT_OBJECT_DIRECTORY',
    'GIT_QUARANTINE_PATH',
    'GIT_REPLACE_REF_BASE',
    'GIT_SHALLOW_FILE',
    'GIT_WORK_TREE'
)

function Test-ForbiddenGitEnvironmentName {
    param([Parameter(Mandatory = $true)][string]$Name)
    return (
        $ForbiddenGitEnvironmentVariables -icontains $Name -or
        $Name.StartsWith('GIT_CONFIG_KEY_', [StringComparison]::OrdinalIgnoreCase) -or
        $Name.StartsWith('GIT_CONFIG_VALUE_', [StringComparison]::OrdinalIgnoreCase)
    )
}

function Assert-CleanGitEnvironment {
    $present = @(
        Get-ChildItem Env: |
            Where-Object { Test-ForbiddenGitEnvironmentName ([string]$_.Name) } |
            ForEach-Object { [string]$_.Name } |
            Sort-Object -CaseSensitive
    )
    if ($present.Count -ne 0) {
        throw 'ambient Git repository/object-store environment is forbidden'
    }
}

function Invoke-GitText {
    param(
        [Parameter(Mandatory = $true)][string]$Root,
        [Parameter(Mandatory = $true)][string[]]$Arguments
    )
    $output = @(& git -C $Root @Arguments 2>&1)
    if ($LASTEXITCODE -ne 0) {
        throw "Git command failed: git $($Arguments -join ' ')"
    }
    return (($output | ForEach-Object { [string]$_ }) -join "`n").Trim()
}

function Assert-PinnedVerifierObject {
    param(
        [Parameter(Mandatory = $true)][string]$Root,
        [Parameter(Mandatory = $true)][string]$Path,
        [Parameter(Mandatory = $true)][string]$ExpectedBlob,
        [Parameter(Mandatory = $true)][int64]$ExpectedBytes
    )
    $blob = Invoke-GitText -Root $Root -Arguments @('rev-parse', "HEAD:$Path")
    $bytes = Invoke-GitText -Root $Root -Arguments @('cat-file', '-s', $blob)
    if ($blob -cne $ExpectedBlob -or [int64]$bytes -ne $ExpectedBytes) {
        throw "pinned external verifier object differs: $Path"
    }
}

function Assert-PullRequestObjectCoherence {
    param(
        [Parameter(Mandatory = $true)][string]$FetchedHead,
        [Parameter(Mandatory = $true)][string]$FetchedMerge,
        [Parameter(Mandatory = $true)][string[]]$MergeParents,
        [Parameter(Mandatory = $true)][string]$BaseCommit,
        [Parameter(Mandatory = $true)][string]$CandidateCommit
    )
    if ($FetchedHead -cne $CandidateCommit) {
        throw 'fetched pull-request head does not match event candidate'
    }
    if ($MergeParents.Count -ne 3 -or
        $MergeParents[0] -cne $FetchedMerge -or
        $MergeParents[1] -cne $BaseCommit -or
        $MergeParents[2] -cne $CandidateCommit) {
        throw 'current GitHub merge witness is not exactly event base plus head'
    }
}

Assert-CleanGitEnvironment
if ($EventName -cne 'pull_request_target' -or
    $Repository -cne $ExpectedRepository -or
    $BaseRepository -cne $ExpectedRepository -or
    $BaseRef -cne 'main' -or
    $HeadRepository -cnotmatch '^[A-Za-z0-9_.-]{1,100}/[A-Za-z0-9_.-]{1,100}$' -or
    $BaseCommit -cnotmatch '^[0-9a-f]{40}$' -or
    $CandidateCommit -cnotmatch '^[0-9a-f]{40}$' -or
    $PullRequestNumber -cnotmatch '^[1-9][0-9]*$' -or
    $BaseCommit -ceq $CandidateCommit) {
    throw 'pull-request identity is incomplete, malformed, or outside main'
}

$BaseRoot = (Resolve-Path -LiteralPath $BaseRoot).Path
$VerifierRoot = (Resolve-Path -LiteralPath $VerifierRoot).Path
$baseTop = Invoke-GitText -Root $BaseRoot -Arguments @('rev-parse', '--show-toplevel')
if (-not [IO.Path]::GetFullPath($baseTop).Equals(
    [IO.Path]::GetFullPath($BaseRoot), [StringComparison]::OrdinalIgnoreCase
)) {
    throw 'trusted-base path is not the repository root'
}
$checkedOut = Invoke-GitText -Root $BaseRoot -Arguments @('rev-parse', 'HEAD')
if ($checkedOut -cne $BaseCommit) {
    throw 'trusted-base checkout is not the exact event base'
}
$status = Invoke-GitText -Root $BaseRoot -Arguments @('status', '--porcelain=v1')
if (-not [string]::IsNullOrEmpty($status)) {
    throw 'trusted-base checkout is not clean'
}

$verifierCommit = Invoke-GitText -Root $VerifierRoot -Arguments @('rev-parse', 'HEAD')
$verifierTree = Invoke-GitText -Root $VerifierRoot -Arguments @('rev-parse', 'HEAD^{tree}')
if ($verifierCommit -cne $ExpectedVerifierCommit -or
    $verifierTree -cne $ExpectedVerifierTree) {
    throw 'pinned external verifier Git identity differs'
}
$verifierStatus = Invoke-GitText -Root $VerifierRoot -Arguments @('status', '--porcelain=v1')
if (-not [string]::IsNullOrEmpty($verifierStatus)) {
    throw 'pinned external verifier checkout is not clean'
}
$verifierScript = Join-Path $VerifierRoot 'scripts\Test-ExternalValidationAuthority.ps1'
$verifierSelfTest = Join-Path $VerifierRoot 'scripts\Test-ExternalValidationAuthoritySelfTest.ps1'
Assert-PinnedVerifierObject -Root $VerifierRoot `
    -Path 'scripts/Test-ExternalValidationAuthority.ps1' `
    -ExpectedBlob '277a3bbbabfdedc66d50263a37e06bb094acac5f' `
    -ExpectedBytes 34411
Assert-PinnedVerifierObject -Root $VerifierRoot `
    -Path 'scripts/Test-ExternalValidationAuthoritySelfTest.ps1' `
    -ExpectedBlob 'cee0dfd6e1db989a6d4788a109c50ef01687e7f5' `
    -ExpectedBytes 21030

$headRef = "refs/codex-validation/pr-$PullRequestNumber-head"
$mergeRef = "refs/codex-validation/pr-$PullRequestNumber-merge"
& git -C $BaseRoot -c protocol.version=2 -c fetch.fsckObjects=true `
    fetch --no-tags --force --no-write-fetch-head origin `
    "+refs/pull/$PullRequestNumber/head:$headRef" `
    "+refs/pull/$PullRequestNumber/merge:$mergeRef"
if ($LASTEXITCODE -ne 0) {
    throw 'candidate pull-request Git objects could not be fetched'
}
$fetchedHead = Invoke-GitText -Root $BaseRoot -Arguments @('rev-parse', $headRef)
$fetchedMerge = Invoke-GitText -Root $BaseRoot -Arguments @('rev-parse', $mergeRef)
$mergeLine = Invoke-GitText -Root $BaseRoot -Arguments @(
    'rev-list', '--parents', '-n', '1', $fetchedMerge
)
[string[]]$mergeParents = @(
    $mergeLine.Split(' ', [StringSplitOptions]::RemoveEmptyEntries)
)
Assert-PullRequestObjectCoherence `
    -FetchedHead $fetchedHead `
    -FetchedMerge $fetchedMerge `
    -MergeParents $mergeParents `
    -BaseCommit $BaseCommit `
    -CandidateCommit $CandidateCommit

& $verifierScript `
    -RepositoryRoot $BaseRoot `
    -PolicyPath 'config/external-validation-authority.json' `
    -Repository $ExpectedRepository `
    -BaseCommit $BaseCommit `
    -CandidateCommit $CandidateCommit `
    -Json
if (-not $?) {
    throw 'pinned external validation authority rejected candidate'
}

$finalStatus = Invoke-GitText -Root $BaseRoot -Arguments @('status', '--porcelain=v1')
if (-not [string]::IsNullOrEmpty($finalStatus)) {
    throw 'trusted-base checkout changed during static admission'
}
