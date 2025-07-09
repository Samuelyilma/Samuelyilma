#!/bin/bash

echo "Starting My Personal AI Assistant..."

# Step 1: Check for Python and Pip (basic check)
if ! command -v python3 &> /dev/null
then
    echo "Python 3 is not installed or not in PATH. Please install Python 3."
    exit 1
fi

if ! command -v pip3 &> /dev/null
then
    echo "Pip3 is not installed. Please ensure Python 3 installation includes Pip."
    exit 1
fi

# Step 2: (Optional) Create a virtual environment
# if [ ! -d ".venv" ]; then
#    echo "Creating virtual environment..."
#    python3 -m venv .venv
#    if [ $? -ne 0 ]; then
#        echo "Failed to create virtual environment."
#        exit 1
#    fi
# fi

# Activate virtual environment
# source .venv/bin/activate
# if [ $? -ne 0 ]; then
#    echo "Failed to activate virtual environment."
#    exit 1
# fi


# Step 3: Install dependencies from requirements.txt
echo "Checking and installing dependencies from backend/requirements.txt..."
if [ -f "backend/requirements.txt" ]; then
    pip3 install -r backend/requirements.txt
    if [ $? -ne 0 ]; then
        echo "Failed to install dependencies. Please check requirements.txt and pip3."
        exit 1
    fi
else
    echo "backend/requirements.txt not found. Skipping dependency installation."
    echo "Make sure to install Flask, requests, PyPDF2, python-docx, Pillow, pytesseract, chromadb, sentence-transformers."
fi


# Step 4: Check for Ollama (basic check - assumes it's running or user will start it)
echo "Ensuring Ollama is accessible..."
# This is a very basic check. A more robust check might ping the Ollama API.
# For now, we'll rely on the backend to handle Ollama connection errors.
echo "Please ensure your Ollama server is running and accessible at the configured URL (usually http://localhost:11434)."


# Step 5: Start the backend server
echo "Starting the backend server (Flask app)..."
# Run app.py in the background. Adjust if your main backend file is different.
nohup python3 backend/app.py > backend_server.log 2>&1 &
BACKEND_PID=$!

if [ $? -ne 0 ]; then
    echo "Failed to start the backend server. Check backend/app.py."
    exit 1
fi
echo "Backend server starting with PID $BACKEND_PID... please wait a moment for it to initialize."
sleep 5 # Give the server a moment to start


# Step 6: Open the browser interface
echo "Opening the browser interface..."
# Assumes the frontend is served by Flask or a simple static server at /
# and the backend runs on port 3000 as configured in app.py
# Use xdg-open on Linux, open on macOS
if command -v xdg-open &> /dev/null; then
  xdg-open http://localhost:3000/public/index.html
elif command -v open &> /dev/null; then
  open http://localhost:3000/public/index.html
else
   echo "Could not detect 'xdg-open' or 'open'. Please open http://localhost:3000/public/index.html in your browser manually."
fi

echo "My Personal AI Assistant should now be running."
echo "The backend server is running in the background (PID: $BACKEND_PID)."
echo "To stop the backend server, run: kill $BACKEND_PID"

# Keep the script running if needed, or exit.
# For a simple launcher, exiting is fine as the server is backgrounded.
# read -p "Press [Enter] to close this terminal (backend will continue running)..."
