@echo off
setlocal
set "TASK_NAME=ERP Nexus Backup Diario"
set "SCRIPT_PATH=%~dp0backup_banco.bat"

echo Criando/atualizando tarefa agendada: %TASK_NAME%
schtasks /Create /TN "%TASK_NAME%" /TR "\"%SCRIPT_PATH%\"" /SC DAILY /ST 02:00 /F
if errorlevel 1 (
  echo.
  echo ERRO: nao foi possivel criar a tarefa. Execute este arquivo como administrador.
  exit /b 1
)
echo.
echo Backup automatico agendado todos os dias as 02:00.
echo Pasta de destino: C:\ERP_BACKUPS\ERP_NEXUS
endlocal
