$ErrorActionPreference = 'Stop'
. (Join-Path $PSScriptRoot 'common.ps1')
$envPath = Join-Path $projectRoot '.env'
if (Test-Path -LiteralPath $envPath) {
    Write-Output 'Mevcut .env korundu.'
    return
}
$lines = @(
    'BANKFLOW_ORACLE_PASSWORD=' + (New-BankFlowPassword)
    'BANKFLOW_DB_PASSWORD=' + (New-BankFlowPassword)
    'BANKFLOW_DB_USER=bankflow'
    'BANKFLOW_DB_URL=jdbc:oracle:thin:@//localhost:1521/FREEPDB1'
    'BANKFLOW_DEMO_PASSWORD=' + (New-BankFlowPassword)
)
[IO.File]::WriteAllLines($envPath, $lines, (New-Object Text.UTF8Encoding $false))
Write-Output 'Yerel .env oluşturuldu. Giriş parolası BANKFLOW_DEMO_PASSWORD satırındadır.'
Write-Output 'Demo kullanıcıları: ayse, mehmet, operator, supervisor.'
