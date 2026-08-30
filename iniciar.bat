@echo off
title FinFlow - Controle Financeiro
cd /d "%~dp0"
echo Iniciando o FinFlow...
echo Abra o navegador em: http://localhost:3000
echo Para parar, feche esta janela.
echo.
call npm start
pause
