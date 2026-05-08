@echo off
setlocal
net session >nul 2>nul
if errorlevel 1 (
  echo Solicitando permissao de administrador para configurar o Firewall...
  powershell -NoProfile -ExecutionPolicy Bypass -Command "Start-Process -FilePath '%~f0' -Verb RunAs"
  exit /b 0
)
echo Removendo bloqueio externo do ERP Nexus...
netsh advfirewall firewall delete rule name="ERP Nexus Bloquear Acesso Externo"
if errorlevel 1 (
  echo.
  echo AVISO: regra nao encontrada ou sem permissao para remover.
  exit /b 1
)
echo.
echo Bloqueio removido.
endlocal
