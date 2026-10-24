Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path $PSScriptRoot -Parent
function Resolve-BankFlowDocker {
    $command = Get-Command docker -ErrorAction SilentlyContinue
    if ($command) { return $command.Source }
    foreach ($candidate in @(
        "$env:LOCALAPPDATA\Programs\DockerDesktop\resources\bin\docker.exe",
        "$env:ProgramFiles\Docker\Docker\resources\bin\docker.exe"
    )) { if (Test-Path -LiteralPath $candidate) { return $candidate } }
    throw 'Docker bulunamadı. Docker Desktop kurulumu ve Windows yeniden başlatmasını tamamla.'
}
function Assert-BankFlowDocker([string] $Docker) {
    $info = New-Object Diagnostics.ProcessStartInfo
    $info.FileName = $Docker
    $info.Arguments = 'info --format "{{.ServerVersion}}"'
    $info.UseShellExecute = $false
    $info.CreateNoWindow = $true
    $info.RedirectStandardOutput = $true
    $info.RedirectStandardError = $true
    $process = New-Object Diagnostics.Process
    $process.StartInfo = $info
    try {
        if (!$process.Start()) { throw 'Docker denetimi başlatılamadı.' }
        # Kill only this diagnostic child process if the daemon never responds.
        if (!$process.WaitForExit(15000)) {
            $process.Kill()
            $process.WaitForExit()
            throw 'Docker motoru 15 saniyede yanıt vermedi. Docker Desktop/WSL ve yeniden başlatma durumunu kontrol et.'
        }
        if ($process.ExitCode -ne 0) { throw 'Docker motoru hazır değil. Docker Desktop, WSL ve yeniden başlatma durumunu kontrol et.' }
    } finally { $process.Dispose() }
}
function New-BankFlowPassword {
    $bytes = New-Object byte[] 18
    $generator = [Security.Cryptography.RandomNumberGenerator]::Create()
    try { $generator.GetBytes($bytes) } finally { $generator.Dispose() }
    return 'Bf_' + [BitConverter]::ToString($bytes).Replace('-', '')
}
function Read-BankFlowTestEnvironment {
    $testPath = Join-Path $projectRoot '.env.test'
    if (!(Test-Path -LiteralPath $testPath)) { throw 'Önce tools/test-oracle.ps1 ile test şemasını hazırla.' }
    $values = @{}
    foreach ($line in [IO.File]::ReadAllLines($testPath)) {
        if ($line -match '^(BANKFLOW_DB_(?:USER|PASSWORD|URL))=(.+)$') { $values[$Matches[1]] = $Matches[2] }
    }
    if ($values['BANKFLOW_DB_USER'] -cne 'bankflow_test') { throw 'Yalnız bankflow_test şeması test edilebilir.' }
    if ($values['BANKFLOW_DB_URL'] -cne 'jdbc:oracle:thin:@//localhost:1521/FREEPDB1') { throw 'Test bağlantısı yerel Oracle FREEPDB1 olmalı.' }
    if ($values['BANKFLOW_DB_PASSWORD'] -cnotmatch '^Bf_[A-F0-9]{36}$') { throw 'Test parolası beklenen güvenli biçimde değil.' }
    return $values
}

function Repair-BankFlowBuildOutput {
    # Maven owns this one generated directory. Do not delete files or follow links.
    $backendPath = [IO.Path]::GetFullPath((Join-Path $projectRoot 'backend'))
    $targetPath = [IO.Path]::GetFullPath((Join-Path $backendPath 'target'))
    if (!(Test-Path -LiteralPath $targetPath)) { return }
    $backend = Get-Item -LiteralPath $backendPath -Force
    $backendLink = $backend.PSObject.Properties['LinkType']
    if ($backendLink -and $backendLink.Value -in @('SymbolicLink', 'Junction')) {
        Write-Output 'Build hazırlığı atlandı: backend bağlantı/reparse dizini.'
        return
    }
    $pending = New-Object 'Collections.Generic.Stack[string]'
    $pending.Push($targetPath)
    $visited = 0
    while ($pending.Count -gt 0) {
        $currentPath = [IO.Path]::GetFullPath($pending.Pop())
        if ($currentPath -ne $targetPath -and !$currentPath.StartsWith($targetPath + [IO.Path]::DirectorySeparatorChar, [StringComparison]::OrdinalIgnoreCase)) {
            throw 'Build hazırlığı target sınırını aştı.'
        }
        $visited++
        if ($visited -gt 100000) { throw 'Build hazırlığı güvenli dosya sayısı sınırını aştı.' }
        $item = Get-Item -LiteralPath $currentPath -Force
        $attributes = $item.Attributes
        # Do not even change attributes on symlinks/junctions: setters can affect their target.
        $linkProperty = $item.PSObject.Properties['LinkType']
        if ($linkProperty -and $linkProperty.Value -in @('SymbolicLink', 'Junction')) { continue }
        # OneDrive cloud placeholders are reparse items too; their ordinary children stay within target.
        if (($attributes -band [IO.FileAttributes]::ReadOnly) -ne 0) {
            $item.Attributes = $attributes -band (-bnot [IO.FileAttributes]::ReadOnly)
        }
        if ($item.PSIsContainer) {
            foreach ($child in Get-ChildItem -LiteralPath $currentPath -Force) { $pending.Push($child.FullName) }
        }
    }
}