@echo off
TITLE ELIMS Installer
CLS
ECHO =================================================================
ECHO        ELIMS LABORATORY SYSTEM - AUTOMATED INSTALLER
ECHO =================================================================
ECHO.
ECHO  [1/5] Checking System Requirements...

:: Check if Docker is installed and running
docker info >nul 2>&1
IF %ERRORLEVEL% NEQ 0 (
    ECHO.
    ECHO  [ERROR] Docker Desktop is NOT running!
    ECHO  Please start Docker Desktop and try again.
    ECHO.
    PAUSE
    EXIT
)
ECHO  [OK] Docker is running.

ECHO.
ECHO  [2/5] Configuring Environment...
IF NOT EXIST .env (
    COPY .env.example .env >nul
    ECHO  [OK] Created default configuration (.env).
) ELSE (
    ECHO  [OK] Configuration found.
)

ECHO.
ECHO  [3/5] Cleaning previous installations (if any)...
docker-compose down -v --remove-orphans >nul 2>&1

ECHO.
ECHO  [4/5] Installing System & Importing Database...
ECHO        (This may take a few minutes. Please wait...)
docker-compose up -d --build

ECHO.
ECHO  [5/5] Waiting for Database Initialization...
timeout /t 15 /nobreak >nul

CLS
ECHO =================================================================
ECHO        INSTALLATION SUCCESSFUL! 🚀
ECHO =================================================================
ECHO.
ECHO  The system is now running on your computer.
ECHO.
ECHO  💻 Access the App:    http://localhost:5173
ECHO  ⚙️  Backend API:      http://localhost:5000
ECHO.
ECHO  Login using the credentials from your backup.
ECHO.
PAUSE