@echo off
setlocal
cd /d "%~dp0erp_backend"

if not exist ".env" (
  echo ERRO: arquivo erp_backend\.env ausente.
  echo Execute preparar-producao-local.bat depois de configurar o ambiente.
  exit /b 1
)
if not exist ".venv\Scripts\waitress-serve.exe" (
  echo ERRO: ambiente de producao nao preparado.
  echo Execute preparar-producao-local.bat.
  exit /b 1
)

echo ERP Nexus em modo de producao local
echo Acesso: http://127.0.0.1:8000
echo Login: admin@admin.com / admin123
.venv\Scripts\waitress-serve.exe --host=127.0.0.1 --port=8000 config.wsgi:application
endlocal
