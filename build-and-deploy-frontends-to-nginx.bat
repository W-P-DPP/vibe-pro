@echo off
setlocal EnableExtensions EnableDelayedExpansion

set "SCRIPT_DIR=%~dp0"
if "%SCRIPT_DIR:~-1%"=="\" set "SCRIPT_DIR=%SCRIPT_DIR:~0,-1%"
set "REPO_DIR=%SCRIPT_DIR%"

set "NODE_CMD=node.exe"
set "PNPM_CMD=pnpm.cmd"

set "NGINX_DIR=D:\Programs\nginx-1.26.3"
set "DEPLOY_ROOT=%NGINX_DIR%\html"

if not "%~1"=="" (
  set "DEPLOY_ROOT=%~1"
)

echo [INFO] Repo dir   : %REPO_DIR%
echo [INFO] Deploy root: %DEPLOY_ROOT%
echo.

call :resolve_command NODE_CMD "node" "%NVM_SYMLINK%\node.exe" "%ProgramFiles%\nodejs\node.exe" ""
if errorlevel 1 exit /b 1

call :resolve_command PNPM_CMD "pnpm" "%APPDATA%\npm\pnpm.cmd" "%NVM_SYMLINK%\pnpm.cmd" "%ProgramFiles%\nodejs\pnpm.cmd"
if errorlevel 1 exit /b 1

call "%NODE_CMD%" "%REPO_DIR%\scripts\workspace-deploy.cjs" frontends --repo-dir "%REPO_DIR%" --deploy-root "%DEPLOY_ROOT%" --pnpm "%PNPM_CMD%"
exit /b %ERRORLEVEL%

:resolve_command
set "TARGET_VAR=%~1"
set "DISPLAY_NAME=%~2"
set "FALLBACK_ONE=%~3"
set "FALLBACK_TWO=%~4"
set "FALLBACK_THREE=%~5"
set "RESOLVED_COMMAND="

for /f "delims=" %%I in ('where %DISPLAY_NAME% 2^>nul') do (
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
