. (Join-Path $PSScriptRoot 'common.ps1')
$docker = Resolve-BankFlowDocker
Assert-BankFlowDocker $docker
if (!(Test-Path -LiteralPath (Join-Path $projectRoot '.env'))) { throw 'Yerel .env yok; önce tools/configure.ps1 çalıştır.' }
Push-Location $projectRoot
try {
    & $docker compose --env-file .env -f infra/compose.yaml stop
    if ($LASTEXITCODE -ne 0) { throw 'Durdurma başarısız.' }
    Write-Output 'Servisler durduruldu; Oracle verisi korundu.'
} finally { Pop-Location }
