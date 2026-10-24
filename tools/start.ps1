param([ValidateRange(10, 900)][int] $ReadyTimeoutSeconds = 120)
. (Join-Path $PSScriptRoot 'common.ps1')
$docker = Resolve-BankFlowDocker
Assert-BankFlowDocker $docker
& (Join-Path $PSScriptRoot 'configure.ps1')
Push-Location $projectRoot
try {
    & $docker compose --env-file .env -f infra/compose.yaml up --build -d --wait --wait-timeout 600
    if ($LASTEXITCODE -ne 0) { throw 'Başlatma başarısız. Docker Desktop durumunu ve container loglarını kontrol et.' }
    $deadline = (Get-Date).AddSeconds($ReadyTimeoutSeconds)
    $ready = $false
    while ((Get-Date) -lt $deadline) {
        try {
            $page = Invoke-WebRequest 'http://localhost:8080/' -UseBasicParsing -TimeoutSec 5
            $csrf = Invoke-RestMethod 'http://localhost:8080/api/auth/csrf' -TimeoutSec 5
            if ($page.StatusCode -eq 200 -and $page.Content -match '<div\s+id="root"' -and $csrf.token) { $ready = $true; break }
        } catch { }
        Start-Sleep -Seconds 2
    }
    if (!$ready) { throw 'Servisler başladı ancak arayüz ve API aynı adreste hazır olmadı: http://localhost:8080' }
    Write-Output 'BankFlow hazır: http://localhost:8080'
} finally { Pop-Location }
