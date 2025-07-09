import json
import requests
import os

# Determine the correct path to config.json relative to this script
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
CONFIG_PATH = os.path.join(BASE_DIR, 'config.json')

def load_config():
    """Loads the configuration from config.json."""
    try:
        with open(CONFIG_PATH, 'r') as f:
            return json.load(f)
    except FileNotFoundError:
        print(f"Error: Configuration file not found at {CONFIG_PATH}")
        return None
    except json.JSONDecodeError:
        print(f"Error: Could not decode JSON from {CONFIG_PATH}")
        return None

def ping_url(url: str, service_name: str):
    """Pings a given URL and returns status."""
    try:
        # Ollama's base URL often just returns server info, not a specific /api/tags or similar for ping
        # LM Studio's /v1/chat/completions is a common endpoint, but a simple GET to base URL might also work or fail.
        # For a generic ping, we'll try a GET request to the base URL.
        # Ollama typically responds to GET /
        # LM Studio might need a specific endpoint, but let's try base first.
        response = requests.get(url, timeout=5) # 5 second timeout
        if response.status_code == 200:
            # For Ollama, a 200 OK with "Ollama is running" is a good sign.
            # For LM Studio, a 200 OK from the base URL might indicate the server is up.
            return {"status": "ok", "message": f"{service_name} is responsive at {url}"}
        else:
            return {"status": "error", "message": f"{service_name} at {url} returned status {response.status_code}"}
    except requests.exceptions.RequestException as e:
        return {"status": "error", "message": f"Could not connect to {service_name} at {url}. Error: {e}"}

def ping_ollama(url: str):
    """Pings the Ollama server."""
    return ping_url(url, "Ollama")

def ping_lm_studio(url: str):
    """Pings the LM Studio server."""
    # LM Studio might not have a simple base URL ping.
    # Often, you check a specific endpoint like /v1/models.
    # For now, using the generic ping_url.
    return ping_url(url, "LM Studio")

def get_active_model_status():
    """Checks the status of the currently configured active model backend."""
    config = load_config()
    if not config:
        return {"status": "error", "message": "Configuration could not be loaded."}

    backend_type = config.get("model_backend")
    active_url = config.get("active_model_url")

    if not active_url:
        return {"status": "error", "message": "Active model URL not configured."}

    if backend_type == "ollama":
        return ping_ollama(active_url)
    elif backend_type == "lm_studio":
        return ping_lm_studio(active_url)
    else:
        return {"status": "error", "message": f"Unsupported model backend type: {backend_type}"}

if __name__ == '__main__':
    print("Model handler initialized...")
    print("Attempting to get active model status:")
    status = get_active_model_status()
    print(json.dumps(status, indent=2))

    # Example direct pings (assuming servers are running on default ports)
    # config_data = load_config()
    # if config_data:
    #     print("\nPinging Ollama directly (if configured):")
    #     ollama_status = ping_ollama(config_data.get("ollama_url", "http://localhost:11434"))
    #     print(json.dumps(ollama_status, indent=2))

    #     print("\nPinging LM Studio directly (if configured):")
    #     lm_studio_status = ping_lm_studio(config_data.get("lm_studio_url", "http://localhost:1234"))
    #     print(json.dumps(lm_studio_status, indent=2))
