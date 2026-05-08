@echo off
setlocal
cd /d "%~dp0erp_backend"
echo Gerando backup do ERP Nexus...
python manage.py backup_sistema
if errorlevel 1 (
  echo.
  echo ERRO: backup nao foi concluido.
  exit /b 1
)
echo.
echo Backup concluido em C:\ERP_BACKUPS\ERP_NEXUS
endlocal
