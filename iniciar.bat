@echo off
echo ============================================
echo   ERP Nexus + Facilities - Iniciando...
echo ============================================
echo.
echo [1/2] Compilando frontend (aguarde ~15s)...
cd /d "%~dp0erp_frontend"
call npm run build
if %errorlevel% neq 0 (
    echo ERRO: Build do frontend falhou!
    pause
    exit /b 1
)
echo [2/2] Iniciando servidor Django...
cd /d "%~dp0erp_backend"
start "ERP Nexus - Backend" cmd /k "python manage.py runserver"
echo.
echo ============================================
echo  Sistema iniciado! Acesse:
echo  http://localhost:8000
echo  Login: admin@admin.com / admin123
echo ============================================
pause
