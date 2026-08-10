@echo off
chcp 65001 >nul
setlocal
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
  echo [ПОМИЛКА] Node.js 20 або новіший не знайдено.
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
echo [1/4] Перевірка графічних ресурсів...
call npm run validate:assets || goto :fail
echo [2/4] Перевірка синтаксису...
call npm run check || goto :fail
echo [3/4] Автоматичні тести...
call npm test || goto :fail
echo [4/4] Створення production-збірки...
call npm run build || goto :fail
echo.
echo ГОТОВО: %CD%\dist
pause
exit /b 0
:fail
echo.
echo [ПОМИЛКА] Збірку зупинено. Перегляньте повідомлення вище.
pause
exit /b 1
