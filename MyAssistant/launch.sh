#!/bin/bash
echo "Starting Cyberpunk Personal AI Assistant Backend..."

# Navigate to the backend directory relative to the script's location
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )"
BACKEND_DIR="$SCRIPT_DIR/backend"

cd "$BACKEND_DIR"

echo "Launching backend server in the background..."
# Start Python app in the background
python3 app.py &
APP_PID=$!

echo "Waiting for server to start (PID: $APP_PID)..."
# Wait a few seconds for the server to initialize
sleep 5

echo "Opening application in browser..."
# Try to open in browser - common commands
if command -v xdg-open &> /dev/null; then
  xdg-open http://127.0.0.1:5000
elif command -v open &> /dev/null; then
  open http://127.0.0.1:5000
else
  echo "Could not detect 'xdg-open' or 'open'. Please open http://127.0.0.1:5000 in your browser manually."
fi

echo "Backend server is running (PID: $APP_PID). To stop the server, use 'kill $APP_PID' or close this terminal."
# Keep the script running so the user can see the PID and messages, or use 'wait' if preferred.
# If you want the script to exit after launching, remove the wait or read command.
wait $APP_PID
# read -p "Press Enter to stop the server and close this terminal... "
# kill $APP_PID
# echo "Server stopped."
