[CmdletBinding()]
param()

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$root = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..'))
$pageRel = 'Rusty-Fleet/index.html'
$canonicalUrl = 'https://mesmerprism.com/Rusty-Fleet/'
$iconSha =
    '1dedfecaef954dda9bb6f4f133376535e4799908441e7832558a1f70f4ed6f79'

function Assert-True([bool]$Condition, [string]$Message) {
    if (-not $Condition) {
        throw $Message
    }
}

function Get-Sha([string]$Path) {
    return (Get-FileHash -LiteralPath $Path -Algorithm SHA256).
        Hash.ToLowerInvariant()
}

function Get-Refs([string]$Html) {
    return @(
        [regex]::Matches(
            $Html,
            '\b(?:href|src)\s*=\s*"(?<value>[^"]+)"',
            'IgnoreCase'
        ) | ForEach-Object { $_.Groups['value'].Value }
    )
}

function Get-Ids([string]$Html) {
    return @(
        [regex]::Matches(
            $Html,
            '\bid\s*=\s*"(?<value>[^"]+)"',
            'IgnoreCase'
        ) | ForEach-Object { $_.Groups['value'].Value }
    )
}

function Get-LinkFailures(
    [string]$Html,
    [string]$SiteRoot,
    [string]$PagePath
) {
    $failures = @()
    $siteRoot = [IO.Path]::GetFullPath($SiteRoot)
    $rootPrefix = $siteRoot.TrimEnd('\', '/') +
        [IO.Path]::DirectorySeparatorChar
    $page = [IO.Path]::GetFullPath((Join-Path $siteRoot $PagePath))
    $idCache = @{}

    foreach ($ref in Get-Refs $Html) {
        if (
            $ref.StartsWith('//') -or
            $ref -match '^[a-z][a-z0-9+.-]*:'
        ) {
            continue
        }

        $parts = $ref.Split('#', 2)
        $pathPart = $parts[0].Split('?', 2)[0]
        $fragment = if ($parts.Count -eq 2) {
            [Uri]::UnescapeDataString($parts[1])
        }
        else {
            ''
        }

        if ([string]::IsNullOrEmpty($pathPart)) {
            $target = $page
        }
        elseif ($pathPart.StartsWith('/')) {
            $relative = [Uri]::UnescapeDataString(
                $pathPart.TrimStart('/')).Replace(
                    '/',
                    [IO.Path]::DirectorySeparatorChar)
            $target = if ([string]::IsNullOrEmpty($relative)) {
                $siteRoot
            }
            else {
                [IO.Path]::GetFullPath((Join-Path $siteRoot $relative))
            }
            if ($pathPart.EndsWith('/')) {
                $target = Join-Path $target 'index.html'
            }
        }
        else {
            $failures += "Unsupported relative local reference: $ref"
            continue
        }

        if (
            $target -cne $siteRoot -and
            -not $target.StartsWith(
                $rootPrefix,
                [StringComparison]::OrdinalIgnoreCase)
        ) {
            $failures += "Reference escapes the site root: $ref"
            continue
        }
        if (-not (Test-Path -LiteralPath $target -PathType Leaf)) {
            $failures += "Missing local target: $ref"
            continue
        }
        if (-not [string]::IsNullOrEmpty($fragment)) {
            if (-not $idCache.ContainsKey($target)) {
                $idCache[$target] = @(Get-Ids (
                    Get-Content -LiteralPath $target -Raw))
            }
            if ($idCache[$target] -cnotcontains $fragment) {
                $failures += "Missing local fragment: $ref"
            }
        }
    }
    return @($failures)
}

function Get-BinaryLinks([string]$Html) {
    $extensions = @(
        '.exe', '.msi', '.msix', '.msixbundle', '.appx', '.appxbundle',
        '.apk', '.aab', '.zip', '.7z', '.tar.gz'
    )
    return @(
        Get-Refs $Html | Where-Object {
            $path = ($_ -split '[?#]', 2)[0]
            @($extensions | Where-Object {
                $path.EndsWith($_, [StringComparison]::OrdinalIgnoreCase)
            }).Count -gt 0
        }
    )
}

function Get-BoundaryFailures([string]$Text, [string]$Label) {
    $patterns = [ordered]@{
        drive_path = '(?<![A-Za-z])[A-Za-z]:[\\/]'
        unc_path = '\\\\[A-Za-z0-9._$-]'
        user_home = '/(?:Users|home)/[A-Za-z0-9._-]+'
        private_ipv4 = '\b(?:10\.(?:[0-9]{1,3}\.){2}[0-9]{1,3}|192\.168\.(?:[0-9]{1,3}\.)[0-9]{1,3}|172\.(?:1[6-9]|2[0-9]|3[01])\.(?:[0-9]{1,3}\.)[0-9]{1,3})\b'
        private_key = '-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----'
        github_token = '\bgh[pousr]_[A-Za-z0-9]{20,}\b'
        aws_access_key = '\bAKIA[A-Z0-9]{16}\b'
    }
    return @(
        $patterns.GetEnumerator() | Where-Object {
            [regex]::IsMatch($Text, $_.Value)
        } | ForEach-Object { "$Label contains $($_.Key)" }
    )
}

Assert-True ($null -ne (Get-Command git -ErrorAction SilentlyContinue)) `
    'git is required for the tracked-file parity check.'
Assert-True ($null -ne (Get-Command node -ErrorAction SilentlyContinue)) `
    'Node.js is required for deterministic artifact regeneration.'

$scratch = Join-Path ([IO.Path]::GetTempPath()) (
    'mesmer-fleet-onboarding-validation-' + [Guid]::NewGuid().ToString('N'))
[IO.Directory]::CreateDirectory($scratch) | Out-Null

try {
    $index = Get-Content -LiteralPath (
        Join-Path $root 'agent-index.json') -Raw |
        ConvertFrom-Json -Depth 100
    Assert-True ($index.generated -match '^\d{4}-\d{2}-\d{2}$') `
        'agent-index.json has no deterministic generated date.'

    $tracked = @(& git -C $root -c core.quotepath=false ls-files)
    Assert-True ($LASTEXITCODE -eq 0) `
        'git ls-files failed while preparing the parity check.'
    foreach ($rel in $tracked) {
        $destination = Join-Path $scratch $rel
        [IO.Directory]::CreateDirectory(
            (Split-Path -Parent $destination)) | Out-Null
        Copy-Item -LiteralPath (Join-Path $root $rel) $destination
    }

    $previousDate = $env:MESMER_AGENT_ARTIFACT_DATE
    try {
        $env:MESMER_AGENT_ARTIFACT_DATE = $index.generated
        $generatorOutput = @(
            & node (
                Join-Path $scratch 'scripts/generate-agent-artifacts.js'
            ) --page $pageRel --global
        )
        Assert-True ($LASTEXITCODE -eq 0) (
            'Artifact regeneration failed: ' +
            ($generatorOutput -join [Environment]::NewLine))
    }
    finally {
        if ($null -eq $previousDate) {
            Remove-Item Env:MESMER_AGENT_ARTIFACT_DATE `
                -ErrorAction SilentlyContinue
        }
        else {
            $env:MESMER_AGENT_ARTIFACT_DATE = $previousDate
        }
    }

    $generatedFiles = @(
        'Rusty-Fleet/index.html',
        'Rusty-Fleet/index.md',
        'Rusty-Fleet/index.txt',
        'Rusty-Fleet/index.bib',
        'Rusty-Fleet/index.references.csl.json',
        'agent-index.json',
        'llms.txt',
        'llms-full.txt',
        'references/all.bib',
        'references/all.csl.json',
        'references/page-map.json',
        'sitemap.xml'
    )
    foreach ($rel in $generatedFiles) {
        $actual = Join-Path $root $rel
        $regenerated = Join-Path $scratch $rel
        Assert-True (
            (Test-Path -LiteralPath $actual -PathType Leaf) -and
            (Test-Path -LiteralPath $regenerated -PathType Leaf)
        ) "Generated artifact is missing: $rel"
        Assert-True ((Get-Sha $actual) -ceq (Get-Sha $regenerated)) `
            "Generated artifact is stale: $rel"
    }

    $html = Get-Content -LiteralPath (Join-Path $root $pageRel) -Raw
    $refs = @(Get-Refs $html)
    $localRefs = @($refs | Where-Object {
        -not $_.StartsWith('//') -and
        $_ -notmatch '^[a-z][a-z0-9+.-]*:'
    })
    $linkFailures = @(Get-LinkFailures $html $root $pageRel)
    Assert-True ($linkFailures.Count -eq 0) (
        'Local link validation failed: ' + ($linkFailures -join '; '))

    $binaryLinks = @(Get-BinaryLinks $html)
    Assert-True ($binaryLinks.Count -eq 0) (
        'Binary download links found: ' + ($binaryLinks -join ', '))
    $downloadTargets = @(
        [regex]::Matches(
            $html,
            '<a\b(?=[^>]*\bdownload(?:\s|=|>))(?=[^>]*\bhref="(?<value>[^"]+)")[^>]*>',
            'IgnoreCase'
        ) | ForEach-Object { $_.Groups['value'].Value } | Sort-Object
    )
    $allowedDownloads = @(
        '/Rusty-Fleet/index.bib',
        '/Rusty-Fleet/index.md',
        '/Rusty-Fleet/index.references.csl.json',
        '/Rusty-Fleet/index.txt'
    ) | Sort-Object
    Assert-True (
        ($downloadTargets -join "`n") -ceq ($allowedDownloads -join "`n")
    ) 'Only the four text/reference sidecars may use download links.'

    $pageMap = Get-Content -LiteralPath (
        Join-Path $root 'references/page-map.json') -Raw |
        ConvertFrom-Json -Depth 100
    $pageCsl = @(
        Get-Content -LiteralPath (
            Join-Path $root 'Rusty-Fleet/index.references.csl.json') -Raw |
            ConvertFrom-Json -Depth 100
    )
    $globalCsl = @(
        Get-Content -LiteralPath (
            Join-Path $root 'references/all.csl.json') -Raw |
            ConvertFrom-Json -Depth 100
    )
    $indexEntry = @($index.pages | Where-Object path -CEQ $pageRel)
    $mapEntry = @($pageMap.pages | Where-Object path -CEQ $pageRel)
    Assert-True (
        $globalCsl.Count -gt 0 -and
        $indexEntry.Count -eq 1 -and
        $mapEntry.Count -eq 1 -and
        $indexEntry[0].url -ceq $canonicalUrl -and
        $mapEntry[0].url -ceq $canonicalUrl -and
        $indexEntry[0].references -eq $pageCsl.Count -and
        $mapEntry[0].references -eq $pageCsl.Count
    ) 'JSON, CSL, agent-index, or page-map validation failed.'

    [xml]$sitemap = Get-Content -LiteralPath (
        Join-Path $root 'sitemap.xml') -Raw
    $ns = [Xml.XmlNamespaceManager]::new($sitemap.NameTable)
    $ns.AddNamespace('s', 'http://www.sitemaps.org/schemas/sitemap/0.9')
    Assert-True (
        @($sitemap.SelectNodes('//s:url/s:loc', $ns) |
            Where-Object InnerText -CEQ $canonicalUrl).Count -eq 1
    ) 'The sitemap must contain the Fleet canonical URL exactly once.'

    $iconPath = Join-Path $root 'assets/rusty-fleet/fleet-icon.svg'
    $actualIconSha = Get-Sha $iconPath
    [xml]$icon = Get-Content -LiteralPath $iconPath -Raw
    $provenance = Get-Content -LiteralPath (
        Join-Path $root 'assets/rusty-fleet/ICON_PROVENANCE.md') -Raw
    Assert-True (
        $actualIconSha -ceq $iconSha -and
        $icon.svg.role -ceq 'img' -and
        $icon.svg.'aria-labelledby' -ceq 'title description' -and
        $provenance.Contains($iconSha, [StringComparison]::Ordinal) -and
        $provenance.Contains('byte-for-byte', [StringComparison]::Ordinal)
    ) 'The canonical icon byte, XML, accessibility, or provenance check failed.'

    $boundaryFiles = @(
        'Rusty-Fleet/index.html',
        'Rusty-Fleet/index.md',
        'Rusty-Fleet/index.txt',
        'Rusty-Fleet/index.bib',
        'Rusty-Fleet/index.references.csl.json',
        'assets/rusty-fleet/ICON_PROVENANCE.md',
        'assets/rusty-fleet/fleet-icon.svg'
    )
    $boundaryFailures = @(
        foreach ($rel in $boundaryFiles) {
            Get-BoundaryFailures (
                Get-Content -LiteralPath (Join-Path $root $rel) -Raw
            ) $rel
        }
    )
    Assert-True ($boundaryFailures.Count -eq 0) (
        'Public-boundary validation failed: ' +
        ($boundaryFailures -join '; '))

    # Construct negative values so no private-looking value is committed.
    $negativeRoot = Join-Path $scratch 'negative'
    [IO.Directory]::CreateDirectory($negativeRoot) | Out-Null
    $negativeHtml =
        '<main id="present"><a href="#missing">bad</a>' +
        '<img src="/missing.svg" alt=""></main>'
    [IO.File]::WriteAllText(
        (Join-Path $negativeRoot 'index.html'),
        $negativeHtml)
    Assert-True (
        @(Get-LinkFailures $negativeHtml $negativeRoot 'index.html').Count -eq 2
    ) 'Negative local-link coverage failed.'
    Assert-True (
        @(Get-BinaryLinks '<a href="/download/fleet.msi">binary</a>').Count -eq 1
    ) 'Negative binary-download coverage failed.'
    $privateLooking = [string]::Concat(
        'C', ':', [IO.Path]::DirectorySeparatorChar,
        'Users', [IO.Path]::DirectorySeparatorChar, 'example',
        [IO.Path]::DirectorySeparatorChar, 'private.json', ' ',
        '192', '.168', '.10', '.20', ' ',
        '-----BEGIN ', 'PRIVATE KEY-----')
    Assert-True (
        @(Get-BoundaryFailures $privateLooking 'synthetic').Count -eq 3
    ) 'Negative public-boundary coverage failed.'
    $wrongIcon = Join-Path $negativeRoot 'wrong.svg'
    [IO.File]::WriteAllText($wrongIcon, '<svg/>')
    Assert-True ((Get-Sha $wrongIcon) -cne $iconSha) `
        'Negative icon-hash coverage failed.'
    $badJson = Join-Path $negativeRoot 'bad.json'
    [IO.File]::WriteAllText($badJson, '{')
    $jsonRejected = $false
    try {
        $null = Get-Content -LiteralPath $badJson -Raw |
            ConvertFrom-Json -Depth 10
    }
    catch {
        $jsonRejected = $true
    }
    Assert-True $jsonRejected 'Negative JSON coverage failed.'

    [ordered]@{
        schema = 'mesmerprism.fleet_onboarding_validation.v1'
        result = 'pass'
        generated_date = $index.generated
        generated_parity_files = $generatedFiles.Count
        html_references = $refs.Count
        local_references = $localRefs.Count
        binary_download_links = $binaryLinks.Count
        sidecar_download_links = $downloadTargets.Count
        fleet_references = $pageCsl.Count
        boundary_files = $boundaryFiles.Count
        icon_sha256 = $actualIconSha
        negative_cases = 5
    } | ConvertTo-Json -Compress
}
finally {
    $resolved = [IO.Path]::GetFullPath($scratch)
    $temp = [IO.Path]::GetFullPath([IO.Path]::GetTempPath())
    if (
        $resolved.StartsWith(
            $temp,
            [StringComparison]::OrdinalIgnoreCase) -and
        (Split-Path -Leaf $resolved).StartsWith(
            'mesmer-fleet-onboarding-validation-')
    ) {
        Remove-Item -LiteralPath $resolved -Recurse -Force
    }
}
