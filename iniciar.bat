@echo off
echo Iniciando ERP...
start "Build Frontend" cmd /k "cd erp_frontend && npm run build"
timeout /t 5 >nul
start "ERP Django Unificado" cmd /k "cd erp_backend && python manage.py runserver"
echo.
echo Aguarde 5 segundos e acesse:
echo http://localhost:8000
pause
