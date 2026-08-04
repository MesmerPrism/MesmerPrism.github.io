[CmdletBinding()]
param(
    [string]$RepositoryRoot = '',
    [Parameter(Mandatory = $true)][string]$VerifierRoot
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
if ([string]::IsNullOrWhiteSpace($RepositoryRoot)) {
    $RepositoryRoot = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
} else {
    $RepositoryRoot = (Resolve-Path -LiteralPath $RepositoryRoot).Path
}
$VerifierRoot = (Resolve-Path -LiteralPath $VerifierRoot).Path

$policyPath = Join-Path $RepositoryRoot 'config\external-validation-authority.json'
$policySchemaPath = Join-Path $RepositoryRoot `
    'schemas\external-validation-authority-policy-v1.schema.json'
$assessmentSchemaPath = Join-Path $RepositoryRoot `
    'schemas\external-validation-authority-assessment-v1.schema.json'
$workflowPath = Join-Path $RepositoryRoot `
    '.github\workflows\external-validation-authority.yml'
$adapterPath = Join-Path $RepositoryRoot `
    '.github\scripts\Invoke-CatalogExternalValidationAuthority.ps1'
$verifierScript = Join-Path $VerifierRoot `
    'scripts\Test-ExternalValidationAuthority.ps1'
$verifierSelfTest = Join-Path $VerifierRoot `
    'scripts\Test-ExternalValidationAuthoritySelfTest.ps1'

foreach ($path in @(
    $policyPath,
    $policySchemaPath,
    $assessmentSchemaPath,
    $workflowPath,
    $adapterPath,
    $verifierScript,
    $verifierSelfTest
)) {
    if (-not (Test-Path -LiteralPath $path -PathType Leaf)) {
        throw "external validation authority surface is missing: $path"
    }
}

function Test-OrdinalEqual {
    param([string[]]$Left, [string[]]$Right)
    if ($Left.Count -ne $Right.Count) { return $false }
    for ($index = 0; $index -lt $Left.Count; $index++) {
        if (-not [string]::Equals(
            $Left[$index], $Right[$index], [StringComparison]::Ordinal
        )) {
            return $false
        }
    }
    return $true
}

function Assert-SortedUnique {
    param([string[]]$Values, [string]$Label)
    [string[]]$sorted = @($Values)
    [Array]::Sort($sorted, [StringComparer]::Ordinal)
    if (-not (Test-OrdinalEqual $Values $sorted)) {
        throw "$Label must be ordinally sorted"
    }
    for ($index = 1; $index -lt $Values.Count; $index++) {
        if ($Values[$index - 1] -ceq $Values[$index]) {
            throw "$Label contains a duplicate"
        }
    }
}

function Assert-PortablePath {
    param([string]$Path, [string]$Label, [switch]$Prefix)
    $candidate = $Path
    if ($Prefix) {
        if (-not $candidate.EndsWith('/', [StringComparison]::Ordinal)) {
            throw "$Label prefix must end with '/'"
        }
        $candidate = $candidate.Substring(0, $candidate.Length - 1)
    }
    if ([string]::IsNullOrWhiteSpace($candidate) -or
        [IO.Path]::IsPathRooted($candidate) -or
        $candidate.Contains('\') -or
        $candidate.Contains(':') -or
        $candidate -match '[\x00-\x1f\x7f]' -or
        @($candidate.Split('/') | Where-Object {
            [string]::IsNullOrEmpty($_) -or $_ -in @('.', '..')
        }).Count -ne 0) {
        throw "$Label is not a portable repository-relative path"
    }
}

function Test-ProtectedPath {
    param([object]$Policy, [string]$Path)
    if (@($Policy.mandatory_protected_paths) -ccontains $Path) {
        return $true
    }
    foreach ($rule in @($Policy.protected_rules)) {
        if (($rule.match -ceq 'exact' -and $rule.path -ceq $Path) -or
            ($rule.match -ceq 'prefix' -and
             $Path.StartsWith([string]$rule.path, [StringComparison]::Ordinal))) {
            return $true
        }
    }
    return $false
}

function Invoke-GitText {
    param([string]$Root, [string[]]$Arguments)
    $output = @(& git -C $Root @Arguments 2>&1)
    if ($LASTEXITCODE -ne 0) {
        throw "synthetic Git command failed: git $($Arguments -join ' ')"
    }
    return (($output | ForEach-Object { [string]$_ }) -join "`n").Trim()
}

function Write-Utf8Lf {
    param([string]$Path, [string]$Value)
    $normalized = $Value.Replace("`r`n", "`n").Replace("`r", "`n")
    [IO.File]::WriteAllText(
        $Path,
        $normalized,
        [Text.UTF8Encoding]::new($false)
    )
}

function Assert-AssessmentBoundary {
    param([object]$Assessment, [string]$ExpectedDecision, [object]$ExpectedApproval)
    if ($Assessment.decision -cne $ExpectedDecision -or
        $Assessment.approval_id -cne $ExpectedApproval -or
        $Assessment.candidate_code_executed -ne $false -or
        $Assessment.execution_attested -ne $false -or
        $Assessment.publication_authority -ne $false) {
        throw (
            'static assessment crossed its non-execution or authority boundary: ' +
            ($Assessment | ConvertTo-Json -Compress -Depth 30)
        )
    }
    $json = $Assessment | ConvertTo-Json -Depth 30
    if (-not (Test-Json -Json $json -SchemaFile $assessmentSchemaPath -ErrorAction Stop)) {
        throw 'static assessment rejected its repository-owned schema'
    }
}

$policyJson = Get-Content -Raw -LiteralPath $policyPath
if (-not (Test-Json -Json $policyJson -SchemaFile $policySchemaPath -ErrorAction Stop)) {
    throw 'policy rejected its repository-owned schema'
}
$policy = $policyJson | ConvertFrom-Json -Depth 40
if ($policy.schema -cne `
        'rusty.morphospace.workflow.external_validation_authority_policy.v1' -or
    $policy.policy_id -cne 'mesmerprism-catalog-external-validation-authority-v1' -or
    $policy.repository -cne 'MesmerPrism/MesmerPrism.github.io' -or
    $policy.status -cne 'active') {
    throw 'catalog authority policy identity differs'
}

$zeroApprovalPolicy = $policyJson | ConvertFrom-Json -Depth 40
$zeroApprovalPolicy.approved_change_sets = @()
$zeroApprovalJson = $zeroApprovalPolicy | ConvertTo-Json -Depth 40
if (-not (Test-Json -Json $zeroApprovalJson -SchemaFile $policySchemaPath `
        -ErrorAction Stop)) {
    throw 'zero-approval policy rejected its repository-owned schema'
}

$nonzeroApprovalPolicy = $zeroApprovalJson | ConvertFrom-Json -Depth 40
$nonzeroApprovalPolicy.approved_change_sets = @(
    [pscustomobject][ordered]@{
        approval_id = 'schema-regression-approval'
        required_ancestor = ('1' * 40)
        changed_paths = @('AGENTS.md')
        artifacts = @(
            [pscustomobject][ordered]@{
                path = 'AGENTS.md'
                state = 'present'
                mode = '100644'
                size_bytes = 0
                sha256 = ('2' * 64)
            }
        )
        status = 'approved'
    }
)
$nonzeroApprovalJson = $nonzeroApprovalPolicy | ConvertTo-Json -Depth 40
if (-not (Test-Json -Json $nonzeroApprovalJson -SchemaFile $policySchemaPath `
        -ErrorAction Stop)) {
    throw 'schema-valid nonzero approval policy was rejected'
}
$malformedApprovalPolicy = $nonzeroApprovalJson | ConvertFrom-Json -Depth 40
$malformedApprovalPolicy.approved_change_sets[0].artifacts[0].sha256 = 'bad'
$malformedAccepted = Test-Json `
    -Json ($malformedApprovalPolicy | ConvertTo-Json -Depth 40) `
    -SchemaFile $policySchemaPath `
    -ErrorAction SilentlyContinue
if ($malformedAccepted) {
    throw 'malformed nonzero approval policy was accepted'
}

$expectedMandatory = @(
    '.github/scripts/Invoke-CatalogExternalValidationAuthority.ps1',
    '.github/workflows/external-validation-authority.yml',
    'config/external-validation-authority.json',
    'schemas/external-validation-authority-assessment-v1.schema.json',
    'schemas/external-validation-authority-policy-v1.schema.json',
    'tools/Test-CatalogExternalValidationAuthority.ps1'
)
[string[]]$mandatory = @(
    $policy.mandatory_protected_paths | ForEach-Object { [string]$_ }
)
Assert-SortedUnique $mandatory 'mandatory protected paths'
if (-not (Test-OrdinalEqual $mandatory $expectedMandatory)) {
    throw 'mandatory protected-path registry differs from the closed bootstrap set'
}

$expectedRules = @(
    'catalog-authority|prefix|Rusty-Morphospace/catalog/',
    'catalog-doc|exact|docs/DISTRIBUTION_CATALOG.md',
    'catalog-instructions|exact|AGENTS.md',
    'catalog-readme|exact|README.md',
    'catalog-tools|prefix|tools/',
    'fleet-pages-projection|prefix|Rusty-Fleet/',
    'github-authority|prefix|.github/',
    'schema-contracts|prefix|schemas/',
    'validation-authority-policy|exact|config/external-validation-authority.json'
)
[string[]]$rules = @(
    $policy.protected_rules | ForEach-Object {
        "$($_.rule_id)|$($_.match)|$($_.path)"
    }
)
[string[]]$ruleIds = @(
    $policy.protected_rules | ForEach-Object { [string]$_.rule_id }
)
Assert-SortedUnique $ruleIds 'protected rule IDs'
if (-not (Test-OrdinalEqual $rules $expectedRules)) {
    throw 'protected rules differ from the closed catalog authority set'
}
foreach ($rule in @($policy.protected_rules)) {
    Assert-PortablePath ([string]$rule.path) 'protected rule path' `
        -Prefix:($rule.match -ceq 'prefix')
}

$sensitivePaths = @(
    '.github/scripts/Invoke-CatalogExternalValidationAuthority.ps1',
    '.github/workflows/distribution-catalog-preflight.yml',
    '.github/workflows/distribution-catalog-publish.yml',
    '.github/workflows/external-validation-authority.yml',
    '.github/workflows/fleet-pages-projection.yml',
    'AGENTS.md',
    'README.md',
    'Rusty-Fleet/metadata/labs/release.json',
    'Rusty-Morphospace/catalog/catalog.js',
    'Rusty-Morphospace/catalog/catalog.json',
    'Rusty-Morphospace/catalog/catalog.schema.json',
    'Rusty-Morphospace/catalog/connection-hub-owner-release-admission.schema.json',
    'config/external-validation-authority.json',
    'docs/DISTRIBUTION_CATALOG.md',
    'schemas/external-validation-authority-assessment-v1.schema.json',
    'schemas/external-validation-authority-policy-v1.schema.json',
    'tools/Test-CatalogExternalValidationAuthority.ps1',
    'tools/connection_hub_catalog_contract.py',
    'tools/fixtures/distribution-catalog/connection-hub-six-owner-activation-request.json',
    'tools/preflight_distribution_catalog.py',
    'tools/publish_distribution_catalog_projection.py',
    'tools/publish_fleet_pages_projection.py',
    'tools/requirements-distribution-catalog.txt',
    'tools/test_connection_hub_catalog_contract.py',
    'tools/test_distribution_catalog.py',
    'tools/test_distribution_catalog_preflight.py',
    'tools/test_distribution_catalog_projection.py',
    'tools/test_fleet_pages_projection.py'
)
foreach ($path in $sensitivePaths) {
    if (-not (Test-ProtectedPath $policy $path)) {
        throw "catalog or validation authority path is unprotected: $path"
    }
}
foreach ($path in @('index.html', 'docs/WRITING_PROJECT_PAGES.md', 'scripts/pretext-hero.js')) {
    if (Test-ProtectedPath $policy $path) {
        throw "ordinary site path is unexpectedly protected: $path"
    }
}

$policySchemaHash = (Get-FileHash -Algorithm SHA256 -LiteralPath $policySchemaPath).Hash.ToLowerInvariant()
$assessmentSchemaHash = (Get-FileHash -Algorithm SHA256 -LiteralPath $assessmentSchemaPath).Hash.ToLowerInvariant()
if ($policySchemaHash -cne 'a89050065ea95d4f2d6edbf85c1d4e05802cef8c92c71684fb0d84e7cc616826' -or
    $assessmentSchemaHash -cne '88b8b8a8d70cc5af50c9e43428017f971d04476b9235ebc545b634175e011426') {
    throw 'repository-owned schemas differ from the pinned shared contracts'
}

$workflow = Get-Content -Raw -LiteralPath $workflowPath
foreach ($token in @(
    '(?m)^name: External validation authority\s*$',
    '(?m)^\s*pull_request_target:\s*$',
    '(?m)^\s+branches:\s*\r?\n\s+- main\s*$',
    '(?m)^permissions:\s*\r?\n\s+contents: read\s*$',
    'runs-on: windows-2025',
    '(?m)^\s{4}name: Static admission\s*$',
    'timeout-minutes: 10',
    'actions/checkout@3d3c42e5aac5ba805825da76410c181273ba90b1 # v7\.0\.1',
    'persist-credentials: false',
    'ref: \$\{\{ github\.event\.pull_request\.base\.sha \}\}',
    'repository: MesmerPrism/rusty-morphospace-work-environment',
    'ref: 50a4c5222c9d6c4567bac09405e43049c61b126f',
    'ead3855a2ecc5e1240e271d81a938985457f10e8',
    '277a3bbbabfdedc66d50263a37e06bb094acac5f',
    'cee0dfd6e1db989a6d4788a109c50ef01687e7f5',
    'Test-ExternalValidationAuthoritySelfTest\.ps1',
    'Test-CatalogExternalValidationAuthority\.ps1',
    'Invoke-CatalogExternalValidationAuthority\.ps1',
    'EVENT_MERGE_SHA: \$\{\{ github\.event\.pull_request\.merge_commit_sha \}\}'
)) {
    if ($workflow -notmatch $token) {
        throw "external validation workflow is missing contract token: $token"
    }
}
$checkoutUses = @([regex]::Matches(
    $workflow,
    'actions/checkout@3d3c42e5aac5ba805825da76410c181273ba90b1'
))
if ($checkoutUses.Count -ne 2) {
    throw 'external validation workflow must use exactly two pinned checkouts'
}
foreach ($forbidden in @(
    '(?m)^\s*pull_request:\s*$',
    '(?m)^\s+contents:\s*write\s*$',
    '(?m)^\s+environment:\s*',
    'id-token:',
    'secrets\.',
    'actions/upload-artifact',
    'actions/cache',
    'submodules:\s*true',
    'lfs:\s*true',
    'persist-credentials:\s*true',
    'ref:\s*\$\{\{\s*github\.event\.pull_request\.head\.sha'
)) {
    if ($workflow -match $forbidden) {
        throw "external validation workflow contains forbidden authority: $forbidden"
    }
}

$adapter = Get-Content -Raw -LiteralPath $adapterPath
foreach ($token in @(
    "ExpectedRepository = 'MesmerPrism/MesmerPrism.github.io'",
    "ExpectedVerifierCommit = '50a4c5222c9d6c4567bac09405e43049c61b126f'",
    "ExpectedVerifierTree = 'ead3855a2ecc5e1240e271d81a938985457f10e8'",
    "EventName -cne 'pull_request_target'",
    "BaseRef -cne 'main'",
    'refs/codex-validation/pr-',
    '+refs/pull/',
    "'rev-list', '--parents', '-n', '1'",
    "-PolicyPath 'config/external-validation-authority.json'",
    '-CandidateCommit $CandidateCommit',
    '-Json'
)) {
    if (-not $adapter.Contains($token, [StringComparison]::Ordinal)) {
        throw "base-owned adapter is missing contract token: $token"
    }
}
foreach ($forbidden in @(
    '(?i)\bgit\s+(checkout|switch)',
    '(?i)\bworktree\s+add\b',
    '(?i)Invoke-Expression',
    '(?i)Start-Process',
    '(?i)Invoke-WebRequest',
    '(?i)Invoke-RestMethod'
)) {
    if ($adapter -match $forbidden) {
        throw "base-owned adapter contains forbidden execution route: $forbidden"
    }
}

$adapterTokens = $null
$adapterParseErrors = $null
$adapterAst = [Management.Automation.Language.Parser]::ParseInput(
    $adapter,
    [ref]$adapterTokens,
    [ref]$adapterParseErrors
)
if (@($adapterParseErrors).Count -ne 0) {
    throw 'base-owned adapter does not parse cleanly'
}
$coherenceDefinitions = @($adapterAst.FindAll({
    param($node)
    return (
        $node -is [Management.Automation.Language.FunctionDefinitionAst] -and
        $node.Name -ceq 'Assert-PullRequestObjectCoherence'
    )
}, $true))
if ($coherenceDefinitions.Count -ne 1) {
    throw 'base-owned adapter must define exactly one merge-coherence function'
}
. ([scriptblock]::Create($coherenceDefinitions[0].Extent.Text))

$coherenceBase = '1' * 40
$coherenceHead = '2' * 40
$eventMerge = '3' * 40
$currentMerge = '4' * 40
if ($eventMerge -ceq $currentMerge) {
    throw 'merge-object churn regression is not distinct'
}
Assert-PullRequestObjectCoherence `
    -FetchedHead $coherenceHead `
    -FetchedMerge $currentMerge `
    -MergeParents @($currentMerge, $coherenceBase, $coherenceHead) `
    -BaseCommit $coherenceBase `
    -CandidateCommit $coherenceHead

$coherenceDamages = @(
    @{
        Label = 'wrong fetched head'
        FetchedHead = '5' * 40
        Parents = @($currentMerge, $coherenceBase, $coherenceHead)
    },
    @{
        Label = 'wrong merge base parent'
        FetchedHead = $coherenceHead
        Parents = @($currentMerge, ('6' * 40), $coherenceHead)
    },
    @{
        Label = 'wrong merge head parent'
        FetchedHead = $coherenceHead
        Parents = @($currentMerge, $coherenceBase, ('7' * 40))
    },
    @{
        Label = 'missing merge parent'
        FetchedHead = $coherenceHead
        Parents = @($currentMerge, $coherenceBase)
    },
    @{
        Label = 'extra merge parent'
        FetchedHead = $coherenceHead
        Parents = @($currentMerge, $coherenceBase, $coherenceHead, ('8' * 40))
    }
)
foreach ($damage in $coherenceDamages) {
    $rejected = $false
    try {
        Assert-PullRequestObjectCoherence `
            -FetchedHead ([string]$damage.FetchedHead) `
            -FetchedMerge $currentMerge `
            -MergeParents ([string[]]$damage.Parents) `
            -BaseCommit $coherenceBase `
            -CandidateCommit $coherenceHead
    } catch {
        $rejected = $true
    }
    if (-not $rejected) {
        throw "merge-coherence damage was accepted: $($damage.Label)"
    }
}

& $verifierSelfTest
if (-not $?) {
    throw 'pinned shared verifier adversarial self-test failed'
}

$tempParent = [IO.Path]::GetFullPath([IO.Path]::GetTempPath())
$tempRoot = Join-Path $tempParent (
    'catalog-external-validation-' + [guid]::NewGuid().ToString('N')
)
New-Item -ItemType Directory -Path $tempRoot | Out-Null
try {
    Invoke-GitText $tempRoot @('init', '--initial-branch=main') | Out-Null
    Invoke-GitText $tempRoot @('config', 'user.name', 'Catalog Authority Test') | Out-Null
    Invoke-GitText $tempRoot @('config', 'user.email', 'catalog-authority@example.invalid') | Out-Null
    New-Item -ItemType Directory -Path (Join-Path $tempRoot 'config') | Out-Null
    $syntheticPolicy = $policyJson | ConvertFrom-Json -Depth 40
    $syntheticPolicy.approved_change_sets = @()
    $syntheticPolicy.protected_rules = @(
        @($syntheticPolicy.protected_rules) +
        [pscustomobject][ordered]@{
            rule_id = 'zz-synthetic-protected'
            match = 'exact'
            path = 'protected.txt'
        }
    )
    Write-Utf8Lf (Join-Path $tempRoot 'config\external-validation-authority.json') `
        (($syntheticPolicy | ConvertTo-Json -Depth 40) + "`n")
    Write-Utf8Lf (Join-Path $tempRoot 'protected.txt') "baseline`n"
    Write-Utf8Lf (Join-Path $tempRoot 'ordinary.txt') "baseline`n"
    Invoke-GitText $tempRoot @('add', '--', '.') | Out-Null
    Invoke-GitText $tempRoot @('commit', '-m', 'synthetic root') | Out-Null
    $rootCommit = Invoke-GitText $tempRoot @('rev-parse', 'HEAD')

    Invoke-GitText $tempRoot @('switch', '-c', 'sealed-candidate') | Out-Null
    Write-Utf8Lf (Join-Path $tempRoot 'protected.txt') `
        "candidate bytes; this text is never executed`n"
    Invoke-GitText $tempRoot @('add', '--', 'protected.txt') | Out-Null
    Invoke-GitText $tempRoot @('commit', '-m', 'sealed protected candidate') | Out-Null
    $sealedCandidate = Invoke-GitText $tempRoot @('rev-parse', 'HEAD')
    $artifact = Get-Item -LiteralPath (Join-Path $tempRoot 'protected.txt')
    $artifactHash = (Get-FileHash -Algorithm SHA256 -LiteralPath $artifact.FullName).Hash.ToLowerInvariant()

    Invoke-GitText $tempRoot @('switch', 'main') | Out-Null
    $syntheticPolicy.approved_change_sets = @(
        [ordered]@{
            approval_id = 'synthetic-protected-change'
            required_ancestor = $sealedCandidate
            changed_paths = @('protected.txt')
            artifacts = @(
                [ordered]@{
                    path = 'protected.txt'
                    state = 'present'
                    mode = '100644'
                    size_bytes = [int64]$artifact.Length
                    sha256 = $artifactHash
                }
            )
            status = 'approved'
        }
    )
    Write-Utf8Lf (Join-Path $tempRoot 'config\external-validation-authority.json') `
        (($syntheticPolicy | ConvertTo-Json -Depth 40) + "`n")
    Invoke-GitText $tempRoot @('add', '--', 'config/external-validation-authority.json') | Out-Null
    Invoke-GitText $tempRoot @('commit', '-m', 'approve synthetic candidate') | Out-Null
    $approvedBase = Invoke-GitText $tempRoot @('rev-parse', 'HEAD')

    Invoke-GitText $tempRoot @('switch', 'sealed-candidate') | Out-Null
    Invoke-GitText $tempRoot @('merge', '--no-ff', 'main', '-m', 'merge approved base') | Out-Null
    $authorizedHead = Invoke-GitText $tempRoot @('rev-parse', 'HEAD')

    Invoke-GitText $tempRoot @('switch', '-c', 'widened-candidate', $authorizedHead) | Out-Null
    Write-Utf8Lf (Join-Path $tempRoot 'ordinary.txt') "widened candidate bytes`n"
    Invoke-GitText $tempRoot @('add', '--', 'ordinary.txt') | Out-Null
    Invoke-GitText $tempRoot @('commit', '-m', 'widen sealed candidate') | Out-Null
    $widenedHead = Invoke-GitText $tempRoot @('rev-parse', 'HEAD')

    Invoke-GitText $tempRoot @('switch', '-c', 'unauthorized-protected', $approvedBase) | Out-Null
    Write-Utf8Lf (Join-Path $tempRoot 'protected.txt') "unapproved protected bytes`n"
    Invoke-GitText $tempRoot @('add', '--', 'protected.txt') | Out-Null
    Invoke-GitText $tempRoot @('commit', '-m', 'unapproved protected change') | Out-Null
    $unauthorizedHead = Invoke-GitText $tempRoot @('rev-parse', 'HEAD')

    Invoke-GitText $tempRoot @('switch', '-c', 'ordinary-change', $approvedBase) | Out-Null
    Write-Utf8Lf (Join-Path $tempRoot 'ordinary.txt') "ordinary unprotected bytes`n"
    Invoke-GitText $tempRoot @('add', '--', 'ordinary.txt') | Out-Null
    Invoke-GitText $tempRoot @('commit', '-m', 'ordinary unprotected change') | Out-Null
    $ordinaryHead = Invoke-GitText $tempRoot @('rev-parse', 'HEAD')
    Invoke-GitText $tempRoot @('checkout', '--detach', $approvedBase) | Out-Null

    $authorizedJson = & $verifierScript `
        -RepositoryRoot $tempRoot `
        -PolicyPath 'config/external-validation-authority.json' `
        -Repository 'MesmerPrism/MesmerPrism.github.io' `
        -BaseCommit $approvedBase `
        -CandidateCommit $authorizedHead `
        -Json
    if (-not $?) { throw 'exact approved synthetic candidate was rejected' }
    $authorized = ($authorizedJson -join "`n") | ConvertFrom-Json -Depth 30
    Assert-AssessmentBoundary $authorized 'approved-change-set' `
        'synthetic-protected-change'

    $rejected = $false
    try {
        & $verifierScript `
            -RepositoryRoot $tempRoot `
            -PolicyPath 'config/external-validation-authority.json' `
            -Repository 'MesmerPrism/MesmerPrism.github.io' `
            -BaseCommit $approvedBase `
            -CandidateCommit $unauthorizedHead `
            -Json | Out-Null
    } catch {
        $rejected = $true
    }
    if (-not $rejected) {
        throw 'unauthorized protected synthetic candidate was admitted'
    }

    $widenedRejected = $false
    try {
        & $verifierScript `
            -RepositoryRoot $tempRoot `
            -PolicyPath 'config/external-validation-authority.json' `
            -Repository 'MesmerPrism/MesmerPrism.github.io' `
            -BaseCommit $approvedBase `
            -CandidateCommit $widenedHead `
            -Json | Out-Null
    } catch {
        $widenedRejected = $true
    }
    if (-not $widenedRejected) {
        throw 'approved synthetic candidate was admitted after path widening'
    }

    $ordinaryJson = & $verifierScript `
        -RepositoryRoot $tempRoot `
        -PolicyPath 'config/external-validation-authority.json' `
        -Repository 'MesmerPrism/MesmerPrism.github.io' `
        -BaseCommit $approvedBase `
        -CandidateCommit $ordinaryHead `
        -Json
    if (-not $?) { throw 'ordinary unprotected synthetic candidate was rejected' }
    $ordinary = ($ordinaryJson -join "`n") | ConvertFrom-Json -Depth 30
    Assert-AssessmentBoundary $ordinary 'unprotected' $null
    if ($rootCommit -ceq $approvedBase) {
        throw 'synthetic approval base did not advance from its root'
    }
} finally {
    $resolvedTemp = [IO.Path]::GetFullPath($tempRoot)
    if (-not $resolvedTemp.StartsWith($tempParent, [StringComparison]::OrdinalIgnoreCase) -or
        [IO.Path]::GetFileName($resolvedTemp) -cnotmatch `
            '^catalog-external-validation-[0-9a-f]{32}$') {
        throw 'refusing to remove an unexpected synthetic test path'
    }
    Remove-Item -LiteralPath $resolvedTemp -Recurse -Force
}

Write-Output 'Catalog external validation authority contract passed.'
