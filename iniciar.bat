@echo off
echo Iniciando ERP...
start "Backend Django" cmd /k "cd erp_backend && python manage.py runserver"
start "Frontend React" cmd /k "cd erp_frontend && npm run dev"
echo.
echo Aguarde 5 segundos e acesse:
echo http://localhost:5173
pause
