#!/bin/bash
echo "Starting Personal AI Assistant..."

# Check for Python
if ! command -v python3 &> /dev/null && ! command -v python &> /dev/null; then
    echo "Python is not installed or not in PATH."
    echo "Please install Python 3."
    exit 1
fi

# Determine Python command
PYTHON_CMD=""
if command -v python3 &> /dev/null; then
    PYTHON_CMD="python3"
elif command -v python &> /dev/null; then
    PYTHON_CMD="python"
fi

# Navigate to the script's directory
cd "$(dirname "$0")"

# Create assets/libs directory if it doesn't exist
LIBS_DIR="assets/libs"
if [ ! -d "$LIBS_DIR" ]; then
    echo "Creating $LIBS_DIR directory..."
    mkdir -p "$LIBS_DIR"
fi

# Download marked.min.js if it doesn't exist
MARKED_JS_PATH="$LIBS_DIR/marked.min.js"
MARKED_JS_URL="https://cdn.jsdelivr.net/npm/marked/marked.min.js"
if [ ! -f "$MARKED_JS_PATH" ]; then
    echo "Downloading marked.min.js..."
    if command -v curl &> /dev/null; then
        curl -L "$MARKED_JS_URL" -o "$MARKED_JS_PATH" --fail
        if [ $? -ne 0 ]; then
            echo "curl download failed. Please manually download $MARKED_JS_URL to $MARKED_JS_PATH"
        fi
    elif command -v wget &> /dev/null; then
        wget "$MARKED_JS_URL" -O "$MARKED_JS_PATH"
        if [ $? -ne 0 ]; then
            echo "wget download failed. Please manually download $MARKED_JS_URL to $MARKED_JS_PATH"
        fi
    else
        echo "curl or wget not found. Please manually download $MARKED_JS_URL to $MARKED_JS_PATH"
    fi
fi

echo "Launching server..."
# Start a simple HTTP server in the background
$PYTHON_CMD -m http.server 8080 &
SERVER_PID=$!

# Function to clean up server on exit
cleanup() {
    echo "Stopping server..."
    kill $SERVER_PID
    exit
}
trap cleanup SIGINT SIGTERM

echo "Waiting for server to start..."
# Wait a moment for the server to start
sleep 2

# Open the application in the default browser
echo "Opening AI Assistant in browser..."
if command -v xdg-open &> /dev/null; then
    xdg-open http://localhost:8080/index.html
elif command -v open &> /dev/null; then # macOS
    open http://localhost:8080/index.html
elif command -v start &> /dev/null; then # Windows (Git Bash, etc.)
    start http://localhost:8080/index.html
else
    echo "Could not detect a command to open the browser."
    echo "Please manually open http://localhost:8080/index.html"
fi

echo "Server is running with PID $SERVER_PID. Press Ctrl+C to stop."
echo ""
echo "To create a desktop shortcut for this assistant:"
echo "- On macOS: Right-click this start.sh file in Finder, select 'Make Alias', then drag the alias to your Desktop or Dock."
echo "- On Linux (GNOME/KDE etc.): You may need to create a .desktop file. Example content:"
echo "    [Desktop Entry]"
echo "    Name=Personal AI Assistant"
echo "    Exec=$(realpath "$0")"
echo "    Icon=utilities-terminal"
echo "    Type=Application"
echo "    Path=$(pwd)"
echo "  Save this as 'PersonalAIAssistant.desktop' in ~/.local/share/applications/ or on your Desktop, then make it executable."
echo ""
# Wait indefinitely until Ctrl+C is pressed
wait $SERVER_PID
