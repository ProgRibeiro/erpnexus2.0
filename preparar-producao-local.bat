@echo off
setlocal
cd /d "%~dp0"

if not exist "erp_backend\.env" (
  echo ERRO: crie erp_backend\.env a partir de .env.production.example antes de continuar.
  exit /b 1
)

for /f "tokens=2" %%V in ('python --version 2^>^&1') do set "PYTHON_VERSION=%%V"
echo %PYTHON_VERSION% | findstr /B "3.11." >nul
if errorlevel 1 (
  echo ERRO: Python 3.11 e obrigatorio. Versao encontrada: %PYTHON_VERSION%
  exit /b 1
)

if not exist "erp_backend\.venv\Scripts\python.exe" (
  echo Criando ambiente virtual Python...
  python -m venv erp_backend\.venv
  if errorlevel 1 exit /b 1
)
set "PYTHON=%~dp0erp_backend\.venv\Scripts\python.exe"

echo [1/8] Instalando dependencias do backend...
"%PYTHON%" -m pip install -r erp_backend\requirements.txt
if errorlevel 1 exit /b 1

echo [2/8] Instalando dependencias do frontend...
cd erp_frontend
call npm ci
if errorlevel 1 exit /b 1

echo [3/8] Compilando frontend...
call npm run build
if errorlevel 1 exit /b 1

cd ..\erp_backend
echo [4/8] Validando Django e migrations...
"%PYTHON%" manage.py check
if errorlevel 1 exit /b 1
"%PYTHON%" manage.py makemigrations --check --dry-run
if errorlevel 1 exit /b 1

echo [5/8] Aplicando migrations multi-tenant...
"%PYTHON%" manage.py migrate_schemas --shared --noinput
if errorlevel 1 exit /b 1
"%PYTHON%" manage.py migrate_schemas --tenant --noinput
if errorlevel 1 exit /b 1

echo [6/8] Restaurando ambiente local e admin oficial de teste...
"%PYTHON%" manage.py configurar_ambiente_local
if errorlevel 1 exit /b 1
"%PYTHON%" manage.py garantir_admin_teste
if errorlevel 1 exit /b 1

echo [7/8] Coletando arquivos estaticos...
"%PYTHON%" manage.py collectstatic --noinput
if errorlevel 1 exit /b 1

echo [8/8] Executando testes e auditoria...
"%PYTHON%" manage.py test apps.importacao apps.usuarios --settings=config.settings_test --noinput
if errorlevel 1 exit /b 1
"%PYTHON%" manage.py verificar_seguranca --strict
if errorlevel 1 exit /b 1

echo.
echo Preparacao concluida. Execute iniciar-producao-local.bat.
endlocal
