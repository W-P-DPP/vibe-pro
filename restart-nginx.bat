@echo off
setlocal

set "NGINX_EXE=D:\Programs\nginx-1.26.3\nginx.exe"
set "NGINX_DIR=D:\Programs\nginx-1.26.3"
set "NGINX_CONF=C:\Users\admin\Desktop\my\super-pro\nginx.conf"

if not exist "%NGINX_EXE%" (
  echo [ERROR] nginx executable not found: %NGINX_EXE%
  exit /b 1
)

echo [1/4] Stop all nginx.exe processes...
taskkill /F /IM nginx.exe >nul 2>&1

echo [2/4] Wait for process cleanup...
timeout /t 2 /nobreak >nul

echo [3/4] Validate nginx config...
"%NGINX_EXE%" -t -p "%NGINX_DIR%" -c "%NGINX_CONF%"
if errorlevel 1 (
  echo [ERROR] nginx config validation failed, start aborted.
  exit /b 1
)

echo [4/4] Start nginx...
start "nginx" /D "%NGINX_DIR%" "%NGINX_EXE%" -p "%NGINX_DIR%" -c "%NGINX_CONF%"

if errorlevel 1 (
  echo [ERROR] nginx failed to start.
  exit /b 1
)

echo [OK] nginx restarted successfully.
exit /b 0
