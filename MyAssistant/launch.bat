@echo off
echo Starting My Personal AI Assistant...

REM Step 1: Check for Python and Pip (basic check)
python --version >nul 2>&1
if %errorlevel% neq 0 (
    echo Python is not installed or not in PATH. Please install Python.
    pause
    exit /b 1
)

pip --version >nul 2>&1
if %errorlevel% neq 0 (
    echo Pip is not installed. Please ensure Python installation includes Pip.
    pause
    exit /b 1
)

REM Step 2: (Optional) Create a virtual environment
REM if not exist ".venv" (
REM    echo Creating virtual environment...
REM    python -m venv .venv
REM    if %errorlevel% neq 0 (
REM        echo Failed to create virtual environment.
REM        pause
REM        exit /b 1
REM    )
REM )

REM Activate virtual environment (example for Windows)
REM call .venv\Scripts\activate.bat
REM if %errorlevel% neq 0 (
REM    echo Failed to activate virtual environment.
REM    pause
REM    exit /b 1
REM )


REM Step 3: Install dependencies from requirements.txt
echo Checking and installing dependencies from backend/requirements.txt...
if exist "backend/requirements.txt" (
    pip install -r backend/requirements.txt
    if %errorlevel% neq 0 (
        echo Failed to install dependencies. Please check requirements.txt and pip.
        pause
        exit /b 1
    )
) else (
    echo backend/requirements.txt not found. Skipping dependency installation.
    echo Make sure to install Flask, requests, PyPDF2, python-docx, Pillow, pytesseract, chromadb, sentence-transformers.
)


REM Step 4: Check for Ollama (basic check - assumes it's running or user will start it)
echo Ensuring Ollama is accessible...
REM This is a very basic check. A more robust check might ping the Ollama API.
REM For now, we'll rely on the backend to handle Ollama connection errors.
echo Please ensure your Ollama server is running and accessible at the configured URL (usually http://localhost:11434).


REM Step 5: Start the backend server
echo Starting the backend server (Flask app)...
REM Run app.py in the background. Adjust if your main backend file is different.
start "MyAssistantBackend" /B python backend/app.py
if %errorlevel% neq 0 (
    echo Failed to start the backend server. Check backend/app.py.
    pause
    exit /b 1
)
echo Backend server starting... please wait a moment for it to initialize.
timeout /t 5 /nobreak >nul


REM Step 6: Open the browser interface
echo Opening the browser interface...
REM Assumes the frontend is served by Flask or a simple static server at /
REM and the backend runs on port 3000 as configured in app.py
start http://localhost:3000/public/index.html

echo My Personal AI Assistant should now be running.
echo You can close this window once the backend server is no longer needed.

pause
REM To stop the backend, you might need to find its process and terminate it manually,
REM or implement a shutdown mechanism in the Flask app.
