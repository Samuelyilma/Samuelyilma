@echo off
echo Starting Cyberpunk Personal AI Assistant Backend...

REM Get the directory of the batch script
set SCRIPT_DIR=%~dp0
cd /D "%SCRIPT_DIR%backend"

echo Launching backend server...
REM Start Python app without waiting for it to finish, so we can open the browser
start "Python Backend" /B python app.py

echo Waiting for server to start...
REM Wait a few seconds for the server to initialize
timeout /t 5 /nobreak > nul

echo Opening application in browser...
start http://127.0.0.1:5000

echo Backend server is running. Close the Python window to stop the server.
pause
