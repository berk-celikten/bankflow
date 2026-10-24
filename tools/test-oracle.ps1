# Creates/updates only the isolated local bankflow_test user. Never drops a schema.
. (Join-Path $PSScriptRoot 'common.ps1')
$docker = Resolve-BankFlowDocker
Assert-BankFlowDocker $docker
$testPath = Join-Path $projectRoot '.env.test'
if (!(Test-Path -LiteralPath $testPath)) {
    $lines = @(
        'BANKFLOW_DB_USER=bankflow_test'
        'BANKFLOW_DB_PASSWORD=' + (New-BankFlowPassword)
        'BANKFLOW_DB_URL=jdbc:oracle:thin:@//localhost:1521/FREEPDB1'
    )
    [IO.File]::WriteAllLines($testPath, $lines, (New-Object Text.UTF8Encoding $false))
}
$values = Read-BankFlowTestEnvironment
$password = $values['BANKFLOW_DB_PASSWORD']
# Password reaches SQL*Plus via stdin, never a process argument or a printed command.
$sql = @"
set echo off verify off feedback off heading off
whenever oserror exit failure
whenever sqlerror exit failure
alter session set container = FREEPDB1;
declare
  n number;
begin
  select count(*) into n from dba_users where username = 'BANKFLOW_TEST';
  if n = 0 then
    execute immediate 'create user bankflow_test identified by "$password" default tablespace users quota unlimited on users';
  else
    execute immediate 'alter user bankflow_test identified by "$password" account unlock';
  end if;
end;
/
alter user bankflow_test quota unlimited on users;
grant create session, create table, create sequence, create trigger, create view to bankflow_test;
exit success
"@
Push-Location $projectRoot
try {
    $sqlOutput = $sql | & $docker compose --env-file .env -f infra/compose.yaml exec -T oracle sqlplus -s / as sysdba 2>&1
    if ($LASTEXITCODE -ne 0) { throw 'NOT_RUN: Oracle test şeması hazırlanamadı. Oracle servisi sağlıklı olmalı; kimlik bilgileri loglanmadı.' }
    Write-Output 'PASS: bankflow_test hazır; .env.test korundu. Uygulama şemasına dokunulmadı.'
} finally { $sql = $null; $sqlOutput = $null; $password = $null; Pop-Location }
