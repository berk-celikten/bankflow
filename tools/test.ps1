param(
    [string] $JavaHome = $env:JAVA_HOME,
    [switch] $Oracle
)
. (Join-Path $PSScriptRoot 'common.ps1')
$originalPath = $env:PATH
$originalJavaHome = $env:JAVA_HOME
$savedDb = @{}
foreach ($name in @('BANKFLOW_DB_URL', 'BANKFLOW_DB_USER', 'BANKFLOW_DB_PASSWORD')) {
    $savedDb[$name] = [Environment]::GetEnvironmentVariable($name, 'Process')
}
try {
    if ($JavaHome) {
        if (!(Test-Path -LiteralPath (Join-Path $JavaHome 'bin\java.exe'))) { throw 'JavaHome içinde Java bulunamadı.' }
        $env:JAVA_HOME = $JavaHome
        $env:PATH = (Join-Path $JavaHome 'bin') + [IO.Path]::PathSeparator + $env:PATH
    }
    if (!(Get-Command java -ErrorAction SilentlyContinue)) { throw 'Java 21 bulunamadı. -JavaHome ile JDK klasörünü belirt.' }
    $npm = Get-Command npm.cmd -ErrorAction Stop
    Push-Location (Join-Path $projectRoot 'frontend')
    try {
        & $npm.Source ci
        if ($LASTEXITCODE -ne 0) { throw 'Frontend bağımlılık kurulumu başarısız.' }
        & $npm.Source test
        if ($LASTEXITCODE -ne 0) { throw 'Frontend testleri başarısız.' }
        & $npm.Source run build
        if ($LASTEXITCODE -ne 0) { throw 'Frontend derlemesi başarısız.' }
    } finally { Pop-Location }
    Push-Location (Join-Path $projectRoot 'backend')
    try {
        # Run every local/security test; Oracle's environment condition skips its class.
        foreach ($name in $savedDb.Keys) { [Environment]::SetEnvironmentVariable($name, $null, 'Process') }
        Repair-BankFlowBuildOutput
        & .\mvnw.cmd -B -ntp clean verify
        if ($LASTEXITCODE -ne 0) { throw 'Backend H2 test/derleme başarısız.' }
        Write-Output 'PASS: frontend test/derleme ve backend H2 test/derleme.'
        if ($Oracle) {
            & (Join-Path $PSScriptRoot 'test-oracle.ps1')
            $values = Read-BankFlowTestEnvironment
            foreach ($name in $values.Keys) { [Environment]::SetEnvironmentVariable($name, $values[$name], 'Process') }
            & .\mvnw.cmd -B -ntp '-Dtest=OracleIntegrationTest' test
            if ($LASTEXITCODE -ne 0) { throw 'Oracle entegrasyon testleri başarısız.' }
            Write-Output 'PASS: gerçek Oracle entegrasyon testleri.'
        } else {
            Write-Output 'NOT_RUN: gerçek Oracle testleri. Hazır Oracle için -Oracle kullan; yalnız bankflow_test şeması kullanılır.'
        }
    } finally { Pop-Location }
} finally {
    $env:PATH = $originalPath
    $env:JAVA_HOME = $originalJavaHome
    foreach ($name in $savedDb.Keys) { [Environment]::SetEnvironmentVariable($name, $savedDb[$name], 'Process') }
}
