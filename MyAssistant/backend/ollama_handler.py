import requests
import json

def generate_response(prompt, base_url="http://localhost:11434", model="gemma:4b"):
    """
    Sends a prompt to the Ollama API and gets a response.
    """
    try:
        response = requests.post(
            f"{base_url}/api/generate",
            json={
                "model": model,
                "prompt": prompt,
                "stream": False  # Get the full response at once
            },
            timeout=60  # Set a timeout for the request
        )
        response.raise_for_status()  # Raise an exception for bad status codes

        # Assuming the response is JSON and contains a "response" field
        return response.json().get("response", "No response from model.")

    except requests.exceptions.Timeout:
        return "Error: Model timed out. It might still be loading."
    except requests.exceptions.RequestException as e:
        return f"Error: Could not connect to Ollama. {e}"
    except json.JSONDecodeError:
        return "Error: Invalid JSON response from model."

def list_models(base_url="http://localhost:11434"):
    """
    Fetches the list of available models from Ollama.
    """
    try:
        response = requests.get(f"{base_url}/api/tags")
        response.raise_for_status()
        models = response.json().get("models", [])
        return [model["name"] for model in models]
    except requests.exceptions.RequestException:
        return [] # Return empty list if connection fails

def check_model_availability(base_url="http://localhost:11434", model="gemma:4b"):
    """
    Checks if a specific model is available by sending a test prompt.
    Returns a tuple: (bool: available, str: message)
    """
    try:
        test_prompt = "Hello"
        response = requests.post(
            f"{base_url}/api/generate",
            json={
                "model": model,
                "prompt": test_prompt,
                "stream": False
            },
            timeout=20 # Increased timeout slightly for model loading
        )
        if response.status_code == 200:
            return True, "Model is responsive."
        else:
            try:
                error_detail = response.json().get("error", response.text)
                if "pull model" in error_detail.lower() or "not found" in error_detail.lower():
                    return False, f"Model '{model}' not found. Try: ollama pull {model}"
                return False, f"Model responded with status {response.status_code}: {error_detail}"
            except json.JSONDecodeError:
                return False, f"Model responded with status {response.status_code} and non-JSON error."
    except requests.exceptions.Timeout:
        return False, f"Model '{model}' timed out. It might still be loading or Ollama is under heavy load."
    except requests.exceptions.RequestException as e:
        return False, f"Could not connect to Ollama or model '{model}': {e}"

if __name__ == '__main__':
    # Example usage (for testing)
    print("Available models:", list_models())

    test_model = "gemma:4b" # Replace with a model you have
    if check_model_availability(model=test_model):
        print(f"\nModel '{test_model}' is available.")
        print("\nTesting generation:")
        print(generate_response(f"Why is the sky blue?", model=test_model))
    else:
        print(f"Model '{test_model}' not available or Ollama not running.")
