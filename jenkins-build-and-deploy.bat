@echo off
setlocal EnableExtensions EnableDelayedExpansion

set "SCRIPT_DIR=%~dp0"
if "%SCRIPT_DIR:~-1%"=="\" set "SCRIPT_DIR=%SCRIPT_DIR:~0,-1%"
set "REPO_DIR=%SCRIPT_DIR%"

set "NODE_CMD=node.exe"
set "PNPM_CMD=pnpm.cmd"
set "PM2_CMD=pm2.cmd"
set "BACKEND_PORTS="
set "PM2_APPS="
set "BACKEND_PORTS_OVERRIDE=%~3"
set "PM2_APPS_OVERRIDE=%~4"

set "NGINX_EXE=D:\Programs\nginx-1.26.3\nginx.exe"
set "NGINX_DIR=D:\Programs\nginx-1.26.3"
set "NGINX_CONF=%REPO_DIR%\nginx.production.conf"
set "NGINX_HTML_ROOT=%NGINX_DIR%\html"

if not "%~1"=="" set "NGINX_HTML_ROOT=%~1"
if not "%~2"=="" set "NGINX_CONF=%~2"

echo [INFO] Repo dir        : %REPO_DIR%
echo [INFO] Nginx html root : %NGINX_HTML_ROOT%
echo [INFO] Nginx config    : %NGINX_CONF%
echo.

call :resolve_command NODE_CMD "node" "%NVM_SYMLINK%\node.exe" "%ProgramFiles%\nodejs\node.exe" ""
if errorlevel 1 exit /b 1

call :resolve_command PNPM_CMD "pnpm" "%APPDATA%\npm\pnpm.cmd" "%NVM_SYMLINK%\pnpm.cmd" "%ProgramFiles%\nodejs\pnpm.cmd"
if errorlevel 1 exit /b 1

call :resolve_command PM2_CMD "pm2" "%APPDATA%\npm\pm2.cmd" "%NVM_SYMLINK%\pm2.cmd" "%ProgramFiles%\nodejs\pm2.cmd"
if errorlevel 1 exit /b 1

call :load_cleanup_metadata
if errorlevel 1 exit /b 1

echo [INFO] Backend ports   : %BACKEND_PORTS%
echo [INFO] PM2 apps        : %PM2_APPS%
echo.

if not exist "%NGINX_EXE%" (
  echo [ERROR] File not found: %NGINX_EXE%
  exit /b 1
)

if not exist "%NGINX_CONF%" (
  echo [ERROR] File not found: %NGINX_CONF%
  exit /b 1
)

call :pre_cleanup
if errorlevel 1 exit /b 1

call "%NODE_CMD%" "%REPO_DIR%\scripts\workspace-deploy.cjs" all --repo-dir "%REPO_DIR%" --deploy-root "%NGINX_HTML_ROOT%" --pnpm "%PNPM_CMD%" --pm2 "%PM2_CMD%" --nginx-exe "%NGINX_EXE%" --nginx-dir "%NGINX_DIR%" --nginx-conf "%NGINX_CONF%"
exit /b %ERRORLEVEL%

:load_cleanup_metadata
for /f "tokens=1,* delims==" %%A in ('"%NODE_CMD%" "%REPO_DIR%\scripts\workspace-deploy.cjs" cleanup-vars --repo-dir "%REPO_DIR%" --pnpm "%PNPM_CMD%"') do (
  if /I "%%~A"=="BACKEND_PORTS" set "BACKEND_PORTS=%%~B"
  if /I "%%~A"=="PM2_APPS" set "PM2_APPS=%%~B"
)

if not "%BACKEND_PORTS_OVERRIDE%"=="" set "BACKEND_PORTS=%BACKEND_PORTS_OVERRIDE%"
if not "%PM2_APPS_OVERRIDE%"=="" set "PM2_APPS=%PM2_APPS_OVERRIDE%"

if not defined BACKEND_PORTS (
  echo [ERROR] Failed to resolve backend ports from workspace.
  exit /b 1
)

if not defined PM2_APPS (
  echo [ERROR] Failed to resolve PM2 apps from workspace.
  exit /b 1
)

exit /b 0

:pre_cleanup
echo [STEP 0/7] Cleanup nginx, pm2 apps, and backend ports

call :stop_pm2_apps
if errorlevel 1 exit /b 1

call :stop_nginx
if errorlevel 1 exit /b 1

for %%P in (%BACKEND_PORTS%) do (
  call :kill_port %%P
  if errorlevel 1 exit /b 1
)

echo [OK] Cleanup completed.
echo.
exit /b 0

:stop_pm2_apps
echo [INFO] Stopping PM2 apps: %PM2_APPS%
call "%PM2_CMD%" delete %PM2_APPS% >nul 2>nul
if errorlevel 1 (
  echo [WARN] PM2 apps were not deleted cleanly, retrying with stop.
  call "%PM2_CMD%" stop %PM2_APPS% >nul 2>nul
)
exit /b 0

:stop_nginx
echo [INFO] Stopping nginx processes
taskkill /F /IM nginx.exe >nul 2>nul
exit /b 0

:kill_port
set "TARGET_PORT=%~1"
echo [INFO] Releasing port %TARGET_PORT%

for /f "usebackq delims=" %%I in (`powershell -NoProfile -ExecutionPolicy Bypass -Command "$connections = Get-NetTCPConnection -LocalPort %TARGET_PORT% -State Listen -ErrorAction SilentlyContinue; if ($connections) { $connections | Select-Object -ExpandProperty OwningProcess -Unique }"`) do (
  if not "%%~I"=="" (
    echo [INFO] Killing PID %%~I on port %TARGET_PORT%
    taskkill /F /PID %%~I >nul 2>nul
  )
)

exit /b 0

:resolve_command
set "TARGET_VAR=%~1"
set "DISPLAY_NAME=%~2"
set "FALLBACK_ONE=%~3"
set "FALLBACK_TWO=%~4"
set "FALLBACK_THREE=%~5"
set "RESOLVED_COMMAND="

for /f "delims=" %%I in ('where %TARGET_VAR% 2^>nul') do (
  set "RESOLVED_COMMAND=%%~fI"
  goto :resolve_command_found
)

if not defined RESOLVED_COMMAND if not "%FALLBACK_ONE%"=="" if exist "%FALLBACK_ONE%" set "RESOLVED_COMMAND=%FALLBACK_ONE%"
if not defined RESOLVED_COMMAND if not "%FALLBACK_TWO%"=="" if exist "%FALLBACK_TWO%" set "RESOLVED_COMMAND=%FALLBACK_TWO%"
if not defined RESOLVED_COMMAND if not "%FALLBACK_THREE%"=="" if exist "%FALLBACK_THREE%" set "RESOLVED_COMMAND=%FALLBACK_THREE%"

:resolve_command_found
if not defined RESOLVED_COMMAND (
  echo [ERROR] %DISPLAY_NAME% command not found.
  exit /b 1
)

set "%TARGET_VAR%=%RESOLVED_COMMAND%"
echo [INFO] %DISPLAY_NAME% command  : %RESOLVED_COMMAND%
exit /b 0
