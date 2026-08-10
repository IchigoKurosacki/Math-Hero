@echo off
chcp 65001 >nul
setlocal
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
  echo [ПОМИЛКА] Node.js 20 або новіший не знайдено.
  echo Встановіть актуальну LTS-версію Node.js і повторіть запуск.
  pause
  exit /b 1
)
node -e "process.exit(Number(process.versions.node.split('.')[0]) >= 20 ? 0 : 1)"
if errorlevel 1 (
  echo [ПОМИЛКА] Потрібен Node.js 20 або новіший.
  node --version
  pause
  exit /b 1
)
echo Запуск Math Hero...
node scripts\serve.mjs --open
if errorlevel 1 (
  echo [ПОМИЛКА] Не вдалося запустити локальний сервер.
  pause
  exit /b 1
)
endlocal
