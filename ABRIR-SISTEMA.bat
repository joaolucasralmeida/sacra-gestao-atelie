@echo off
title Sacra Studio
cd /d "%~dp0"

where npm >nul 2>&1
if errorlevel 1 (
  echo.
  echo   Nao encontrei o Node.js neste computador.
  echo.
  echo   Peca para o Claude instalar o Node de novo.
  echo.
  pause
  exit /b 1
)

if not exist ".env.local" (
  echo.
  echo   Falta o arquivo .env.local com o endereco do banco.
  echo   Copie o .env.local.example, renomeie para .env.local
  echo   e preencha, ou peca para o Claude fazer isso.
  echo.
  pause
  exit /b 1
)

if not exist "node_modules\" (
  echo.
  echo   Primeira vez nesta pasta: baixando as pecas do projeto.
  echo   Isso leva cerca de um minuto e so acontece uma vez.
  echo.
  call npm install --no-fund --no-audit
)

echo.
echo   Abrindo o Sacra Studio. O navegador abre sozinho em alguns segundos.
echo   Deixe esta janela aberta enquanto usa. Para desligar, feche-a.
echo.

rem O Next nao abre o navegador sozinho: abrimos aqui, depois que o
rem servidor ja teve tempo de subir.
start "" cmd /c "timeout /t 9 >nul & start "" http://localhost:3100"

call npm run dev
