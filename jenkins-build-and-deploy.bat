@echo off
setlocal EnableExtensions EnableDelayedExpansion

set "SCRIPT_DIR=%~dp0"
if "%SCRIPT_DIR:~-1%"=="\" set "SCRIPT_DIR=%SCRIPT_DIR:~0,-1%"
set "REPO_DIR=%SCRIPT_DIR%"

set "DOCKER_CMD=docker.exe"
set "COMPOSE_FILE=%REPO_DIR%\docker\docker-compose.prod.yml"

if not "%~1"=="" set "COMPOSE_FILE=%~1"
for %%I in ("%COMPOSE_FILE%") do set "COMPOSE_FILE=%%~fI"

echo [INFO] Repo dir        : %REPO_DIR%
echo [INFO] Compose file    : %COMPOSE_FILE%
if defined PROD_RUNTIME_DIR (
  echo [INFO] Runtime dir    : %PROD_RUNTIME_DIR%
) else (
  echo [INFO] Runtime dir    : D:/super-pro_pro ^(docker compose default^)
)
echo.

call :resolve_command DOCKER_CMD "docker" "%ProgramFiles%\Docker\Docker\resources\bin\docker.exe" "%ProgramFiles%\Docker\docker\resources\bin\docker.exe" ""
if errorlevel 1 exit /b 1

if not exist "%COMPOSE_FILE%" (
  echo [ERROR] File not found: %COMPOSE_FILE%
  exit /b 1
)

pushd "%REPO_DIR%" >nul

echo [INFO] Validating docker compose file...
call "%DOCKER_CMD%" compose -f "%COMPOSE_FILE%" config >nul
if errorlevel 1 (
  popd >nul
  echo [ERROR] Docker compose config validation failed.
  exit /b 1
)

echo [INFO] Starting production deployment...
call "%DOCKER_CMD%" compose -f "%COMPOSE_FILE%" up -d --build
if errorlevel 1 (
  popd >nul
  echo [ERROR] Docker deployment failed.
  exit /b 1
)

echo [INFO] Current service status:
call "%DOCKER_CMD%" compose -f "%COMPOSE_FILE%" ps
set "EXIT_CODE=%ERRORLEVEL%"

popd >nul
exit /b %EXIT_CODE%

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
