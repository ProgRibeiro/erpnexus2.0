@echo off
setlocal
cd /d "%~dp0erp_backend"
python manage.py verificar_seguranca
endlocal
