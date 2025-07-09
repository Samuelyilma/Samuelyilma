from flask import Flask, jsonify
from model_handler import get_active_model_status # Import the function

app = Flask(__name__)

@app.route('/ping', methods=['GET'])
def ping():
    """Simple endpoint to check if the backend is running."""
    return jsonify({"message": "pong"}), 200

@app.route('/api/model/status', methods=['GET'])
def model_status():
    """Endpoint to get the status of the active model backend."""
    status = get_active_model_status()
    return jsonify(status), 200 if status.get("status") == "ok" else 503

if __name__ == '__main__':
    print("Backend starting on http://127.0.0.1:5000")
    app.run(host='0.0.0.0', port=5000, debug=True)
