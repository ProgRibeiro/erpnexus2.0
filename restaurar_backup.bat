@echo off
setlocal
if "%~1"=="" (
  echo Uso:
  echo   restaurar_backup.bat "C:\ERP_BACKUPS\ERP_NEXUS\erp_db_YYYYMMDD_HHMMSS.dump"
  exit /b 1
)
cd /d "%~dp0erp_backend"
echo ATENCAO: isto pode sobrescrever dados atuais do banco.
echo Arquivo: %~1
set /p CONFIRMA="Digite RESTAURAR para continuar: "
if /I not "%CONFIRMA%"=="RESTAURAR" (
  echo Restauracao cancelada.
  exit /b 1
)
python manage.py restaurar_backup --arquivo "%~1" --confirmar
endlocal
