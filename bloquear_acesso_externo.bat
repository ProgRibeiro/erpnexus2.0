@echo off
setlocal
net session >nul 2>nul
if errorlevel 1 (
  echo Solicitando permissao de administrador para configurar o Firewall...
  powershell -NoProfile -ExecutionPolicy Bypass -Command "Start-Process -FilePath '%~f0' -Verb RunAs"
  exit /b 0
)
echo Bloqueando acesso externo ao ERP Nexus nas portas 8000 e 5173...
netsh advfirewall firewall delete rule name="ERP Nexus Bloquear Acesso Externo" >nul 2>nul
netsh advfirewall firewall add rule name="ERP Nexus Bloquear Acesso Externo" dir=in action=block protocol=TCP localport=8000,5173
if errorlevel 1 (
  echo.
  echo ERRO: nao foi possivel alterar o Firewall. Execute como administrador.
  exit /b 1
)
echo.
echo Regra criada. O ERP continua acessivel localmente, mas fica bloqueado para conexoes externas nessas portas.
endlocal
