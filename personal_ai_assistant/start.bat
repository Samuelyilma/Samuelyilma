@echo off
echo Starting Personal AI Assistant...

REM Check for Python
python --version >nul 2>&1
if %errorlevel% neq 0 (
    echo Python is not installed or not in PATH.
    echo Please install Python 3 and add it to your PATH.
    pause
    exit /b 1
)

REM Navigate to the script's directory
cd /D "%~dp0"

REM Create assets/libs directory if it doesn't exist
if not exist "assets\libs" (
    echo Creating assets\libs directory...
    mkdir "assets\libs"
)

REM Download marked.min.js if it doesn't exist
SET MARKED_JS_PATH="assets\libs\marked.min.js"
SET MARKED_JS_URL="https://cdn.jsdelivr.net/npm/marked/marked.min.js"
if not exist %MARKED_JS_PATH% (
    echo Downloading marked.min.js...
    REM Try PowerShell first (common on modern Windows)
    powershell -Command "(New-Object Net.WebClient).DownloadFile('%MARKED_JS_URL%', '%MARKED_JS_PATH%')"
    REM Fallback to curl if PowerShell fails or is not available (curl might not be installed by default)
    if errorlevel 1 (
        echo PowerShell download failed. Trying curl...
        curl -L %MARKED_JS_URL% -o %MARKED_JS_PATH% --fail
        if errorlevel 1 (
            echo curl download failed. Please manually download %MARKED_JS_URL% to %MARKED_JS_PATH%
            pause
        )
    )
)

REM Start a simple HTTP server
echo Launching server...
start "Personal AI Assistant Server" python -m http.server 8080

REM Wait a moment for the server to start
timeout /t 2 /nobreak >nul

REM Open the application in the default browser
echo Opening AI Assistant in browser...
start http://localhost:8080/index.html

echo Server is running. Close the server window (Personal AI Assistant Server) to stop.
echo.
echo To create a desktop shortcut for this assistant on Windows:
echo 1. Right-click on this start.bat file.
echo 2. Select "Send to" > "Desktop (create shortcut)".
echo You can then rename the shortcut on your desktop as desired.
echo.
exit /b 0
