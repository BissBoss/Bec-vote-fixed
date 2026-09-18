@echo off
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
  echo Can Node.js 24 tro len. Cai Node.js, sau do mo lai file nay.
  pause
  exit /b 1
)
echo Mo trinh duyet tai http://127.0.0.1:3000
node server.mjs
pause
