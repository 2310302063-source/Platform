@echo off
REM Social Learning Platform - Startup Script

echo.
echo ========================================
echo   Social Learning Platform
echo   Project: ndidi-8d9fc
echo ========================================
echo.

cd /d c:\Users\USER\platform

REM Check if node_modules exists
if not exist node_modules (
    echo [INFO] Waiting for npm install to complete...
    echo [INFO] This may take 10-20 minutes on first run.
    echo.
    
    for /l %%i in (1,1,120) do (
        if exist node_modules (
            echo [OK] npm install complete!
            goto :start_dev
        )
        timeout /t 5 /nobreak
    )
    
    echo [WARNING] npm install still running. Continuing anyway...
)

:start_dev
echo.
echo [INFO] Starting development server...
echo [INFO] Frontend will be available at: http://localhost:5173
echo [INFO] Backend will be available at: http://localhost:3001
echo.

set GOOGLE_APPLICATION_CREDENTIALS=c:\Users\USER\platform\firebase-service-account.json
"C:\Program Files\nodejs\npm.cmd" run dev

pause
