@echo off
setlocal
cd /d "%~dp0erp_backend"
echo Iniciando ERP Nexus apenas em 127.0.0.1:8000
echo Acesso local: http://127.0.0.1:8000
python manage.py runserver 127.0.0.1:8000
endlocal
