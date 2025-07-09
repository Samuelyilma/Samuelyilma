from flask import Flask, request, jsonify, send_from_directory
import os
import json
import logging
from werkzeug.utils import secure_filename

# Import project modules
import ollama_handler
import file_parser
import rag_engine

# --- App Initialization ---
app = Flask(__name__, static_folder='../public', static_url_path='/public')
logging.basicConfig(level=logging.INFO)

# --- Configuration ---
# Load config from JSON file or use defaults
CONFIG_FILE = "config.json"
APP_CONFIG = {
    "ollama_base_url": "http://localhost:11434",
    "default_model": "gemma:4b",
    "rag_enabled": True,
    "workspace_path": os.path.join(os.path.dirname(__file__), "..", "workspace"), # ../workspace
    "knowledge_upload_path": os.path.join(os.path.dirname(__file__), "..", "knowledge_uploads"), # ../knowledge_uploads for temp before RAG
    "max_upload_size": 16 * 1024 * 1024  # 16 MB
}

def load_app_config():
    global APP_CONFIG
    try:
        if os.path.exists(CONFIG_FILE):
            with open(CONFIG_FILE, 'r') as f:
                APP_CONFIG.update(json.load(f))
                logging.info(f"Loaded configuration from {CONFIG_FILE}")
        else:
            logging.info(f"{CONFIG_FILE} not found, using default configuration.")
            # Save default config if it doesn't exist
            with open(CONFIG_FILE, 'w') as f:
                json.dump(APP_CONFIG, f, indent=4)
                logging.info(f"Saved default configuration to {CONFIG_FILE}")

    except Exception as e:
        logging.error(f"Error loading or saving config: {e}")

load_app_config()

# Ensure workspace and knowledge upload directories exist
os.makedirs(APP_CONFIG["workspace_path"], exist_ok=True)
os.makedirs(APP_CONFIG["knowledge_upload_path"], exist_ok=True)

app.config['UPLOAD_FOLDER'] = APP_CONFIG["workspace_path"]
app.config['KNOWLEDGE_UPLOAD_FOLDER'] = APP_CONFIG["knowledge_upload_path"]
app.config['MAX_CONTENT_LENGTH'] = APP_CONFIG["max_upload_size"]


# --- Helper Functions ---
def get_config_value(key, default=None):
    return APP_CONFIG.get(key, default)

# --- Static File Serving for Frontend ---
@app.route('/')
def serve_index():
    return send_from_directory(app.static_folder, 'index.html')

@app.route('/<path:path>')
def serve_static_files(path):
    # Serves other files like CSS, JS from the public directory
    # For security, ensure this only serves expected file types or from specific subdirs
    if ".." in path or path.startswith("/"): # Basic security check
        return jsonify({"error": "Invalid path"}), 400
    return send_from_directory(app.static_folder, path)


# --- API Endpoints ---

@app.route('/api/chat', methods=['POST'])
def chat():
    # Expect FormData; text message and config from form fields, image from files
    user_message = request.form.get('message', '')

    # Config from form fields (prefixed to avoid clashes if any)
    config_ollama_url = request.form.get('config_ollama_url', get_config_value('ollama_base_url'))
    config_model = request.form.get('config_model', get_config_value('default_model'))
    config_rag_enabled_str = request.form.get('config_rag_enabled', str(get_config_value('rag_enabled')))
    use_rag = config_rag_enabled_str.lower() == 'true'

    uploaded_image_file = request.files.get('image')
    user_image_url = None # URL to be sent back to frontend for display

    if not user_message and not uploaded_image_file:
        return jsonify({'error': 'No message or image provided'}), 400

    if uploaded_image_file:
        if not os.path.exists(os.path.join(app.config['UPLOAD_FOLDER'], 'chat_images')):
            os.makedirs(os.path.join(app.config['UPLOAD_FOLDER'], 'chat_images'), exist_ok=True)

        filename = secure_filename(uploaded_image_file.filename)
        image_save_path = os.path.join(app.config['UPLOAD_FOLDER'], 'chat_images', filename)
        try:
            uploaded_image_file.save(image_save_path)
            # Create a URL path the frontend can use.
            # Assuming UPLOAD_FOLDER is 'workspace', served via /api/workspace/chat_images/...
            user_image_url = f"/api/workspace/chat_images/{filename}"
            logging.info(f"Image '{filename}' saved to '{image_save_path}', accessible via '{user_image_url}'")
            # For now, the text prompt to Ollama won't explicitly include image content analysis
            # This will be handled by a multimodal model or specific image processing step in future
        except Exception as e:
            logging.error(f"Error saving chat image '{filename}': {e}")
            return jsonify({'error': f'Could not save chat image: {str(e)}'}), 500

    ollama_url = config_ollama_url
    model = config_model

    # Prepare the prompt for the AI
    # If an image was uploaded, the user's text might refer to it.
    # For true multimodal, ollama_handler and model choice would be critical.
    # For now, AI gets the text; frontend displays image + text.
    final_prompt_for_ai = user_message

    context_docs = []
    response_type = "assistant" # Default type

    if use_rag:
        try:
            retrieved_docs = rag_engine.query_knowledge_base(user_message, n_results=2)
            if retrieved_docs:
                context_docs = [doc['content'] for doc in retrieved_docs]
                # You could also pass metadata or source info to the prompt if desired
                logging.info(f"RAG: Retrieved {len(context_docs)} documents for query.")
        except Exception as e:
            logging.error(f"RAG query failed: {e}")
            # Optionally inform user RAG failed but proceed without it

    if context_docs: # RAG context
        context_str = "\n\n--- Relevant Information from Knowledge Base ---\n"
        for i, doc_content in enumerate(context_docs):
            context_str += f"Document {i+1}:\n{doc_content}\n\n"
        # Prepend RAG context to the (potentially image-contextualized) prompt
        final_prompt_for_ai = f"Based on the following information if relevant:\n{context_str}\n\nQuestion: {final_prompt_for_ai}"
        response_type = "rag"

    try:
        # Future: if ollama_handler supports image_paths for multimodal models:
        # local_image_path_for_ollama = image_save_path if uploaded_image_file else None
        # ai_response = ollama_handler.generate_response(final_prompt_for_ai, ollama_url, model, image_paths=[local_image_path_for_ollama] if local_image_path_for_ollama else None)
        ai_response = ollama_handler.generate_response(final_prompt_for_ai, ollama_url, model)

        response_data = {'response': ai_response, 'type': response_type}
        # If user sent an image, include its web-accessible URL in the response
        # This allows frontend to have a persistent URL for the user's image in the chat log
        if user_image_url:
            response_data['user_image_sent_url'] = user_image_url

        return jsonify(response_data)
    except Exception as e:
        logging.error(f"Ollama API error: {e}")
        return jsonify({'error': str(e), 'type': 'error'}), 500


@app.route('/api/upload', methods=['POST'])
def upload_file():
    if 'file' not in request.files:
        return jsonify({'error': 'No file part in the request'}), 400

    file = request.files['file']
    if file.filename == '':
        return jsonify({'error': 'No selected file'}), 400

    if file:
        filename = secure_filename(file.filename)
        # Save to a general workspace or a temporary processing location
        save_path = os.path.join(app.config['UPLOAD_FOLDER'], filename)
        try:
            file.save(save_path)
            logging.info(f"File '{filename}' uploaded to workspace: {save_path}")

            # Optional: Perform initial analysis or simple parsing here if needed immediately
            # For RAG, the file is usually processed separately when added to knowledge base.
            # file_content_preview = ""
            # if filename.endswith(".txt"):
            #     with open(save_path, 'r') as f:
            #         file_content_preview = f.read(200) + "..." # Preview

            # If this upload is also meant for RAG, the frontend should call /api/knowledge/upload
            return jsonify({
                'message': f'File "{filename}" uploaded successfully to workspace.',
                'filename': filename,
                # 'analysis': f"Preview: {file_content_preview}" if file_content_preview else "File ready for use."
            })
        except Exception as e:
            logging.error(f"Error saving uploaded file '{filename}': {e}")
            return jsonify({'error': f'Could not save file: {str(e)}'}), 500

    return jsonify({'error': 'File upload failed for unknown reasons'}), 500


@app.route('/api/settings', methods=['GET', 'POST'])
def handle_settings():
    global APP_CONFIG
    if request.method == 'GET':
        # Return current relevant settings (be careful not to expose sensitive info)
        # For now, frontend manages its own settings via localStorage, this could sync if needed.
        return jsonify({
            "ollama_base_url": get_config_value('ollama_base_url'),
            "default_model": get_config_value('default_model'),
            "rag_enabled": get_config_value('rag_enabled'),
            # Add other relevant, non-sensitive settings
        })
    elif request.method == 'POST':
        data = request.json
        # Update APP_CONFIG carefully - only allow specific keys to be changed
        allowed_keys = ["ollama_base_url", "default_model", "rag_enabled"]
        updated = False
        for key in allowed_keys:
            if key in data:
                APP_CONFIG[key] = data[key]
                updated = True

        if updated:
            try:
                with open(CONFIG_FILE, 'w') as f:
                    json.dump(APP_CONFIG, f, indent=4)
                logging.info(f"Application settings updated and saved to {CONFIG_FILE}.")
                return jsonify({'message': 'Settings updated successfully.'})
            except Exception as e:
                logging.error(f"Error saving updated settings: {e}")
                return jsonify({'error': f'Could not save settings: {str(e)}'}), 500
        else:
            return jsonify({'message': 'No recognized settings provided to update.'}), 400


@app.route('/api/ollama/models', methods=['GET'])
def get_ollama_models():
    ollama_url = request.args.get('url', get_config_value('ollama_base_url'))
    try:
        models = ollama_handler.list_models(ollama_url)
        return jsonify({'models': models})
    except Exception as e:
        logging.error(f"Error fetching models from Ollama URL '{ollama_url}': {e}")
        return jsonify({'error': str(e), 'models': []}), 500

@app.route('/api/ollama/status', methods=['POST'])
def check_ollama_status():
    data = request.json
    ollama_url = data.get('ollama_url', get_config_value('ollama_base_url'))
    model_name = data.get('model', get_config_value('default_model'))

    try:
        # Directly use the tuple returned by the handler
        is_available, message = ollama_handler.check_model_availability(ollama_url, model_name)
        return jsonify({'available': is_available, 'message': message})
    except Exception as e: # Should be rare if handler catches well
        logging.error(f"Error checking Ollama model status: {e}")
        return jsonify({'available': False, 'message': str(e)}), 500

@app.route('/api/workspace/<path:filepath>')
def serve_workspace_file(filepath):
    # This will serve files from the 'workspace' directory, including 'workspace/chat_images'.
    # e.g. /api/workspace/chat_images/my_image.png
    # Ensure this is secure and doesn't allow arbitrary path traversal.
    # secure_filename on upload and direct construction here is relatively safe.
    logging.info(f"Serving workspace file: {filepath} from {app.config['UPLOAD_FOLDER']}")
    return send_from_directory(app.config['UPLOAD_FOLDER'], filepath)

# --- RAG - Knowledge Base Endpoints ---
@app.route('/api/knowledge/upload', methods=['POST'])
def upload_to_knowledge_base():
    if not get_config_value('rag_enabled'):
        return jsonify({'error': 'RAG system is currently disabled in server config.'}), 403

    if 'file' not in request.files:
        return jsonify({'error': 'No file part in the request'}), 400

    file = request.files['file']
    if file.filename == '':
        return jsonify({'error': 'No selected file'}), 400

    if file:
        filename = secure_filename(file.filename)
        # Save to a temporary location for processing by RAG engine
        temp_save_path = os.path.join(app.config['KNOWLEDGE_UPLOAD_FOLDER'], filename)

        try:
            file.save(temp_save_path)
            logging.info(f"File '{filename}' uploaded for RAG processing: {temp_save_path}")

            # Parse the file content
            parsed_content = file_parser.parse(temp_save_path)
            if parsed_content is None or not parsed_content.strip():
                os.remove(temp_save_path) # Clean up temp file
                return jsonify({'error': f'Could not parse content from "{filename}" or content is empty.'}), 400

            # Add to RAG engine (ChromaDB)
            # Metadata can be enriched here, e.g., original filename
            doc_ids = rag_engine.add_document(
                parsed_content,
                metadata={"source_filename": filename, "upload_path": temp_save_path},
                doc_id=f"file_{filename}" # Using filename as part of ID for easier reference
            )

            if doc_ids:
                # Optionally, remove the temp file after successful ingestion if not needed elsewhere
                # For now, keep it for potential reference or if RAG needs path.
                # os.remove(temp_save_path)
                logging.info(f"Content from '{filename}' added to RAG knowledge base with IDs: {doc_ids}")
                return jsonify({
                    'message': f'File "{filename}" processed and added to knowledge base.',
                    'filename': filename,
                    'doc_ids': doc_ids
                })
            else:
                # os.remove(temp_save_path) # Clean up if add_document failed
                return jsonify({'error': f'Failed to add content from "{filename}" to RAG engine.'}), 500

        except Exception as e:
            logging.error(f"Error processing file '{filename}' for RAG: {e}")
            if os.path.exists(temp_save_path): # Attempt cleanup on error
                 try: os.remove(temp_save_path)
                 except Exception as cleanup_err: logging.error(f"Failed to cleanup temp file {temp_save_path}: {cleanup_err}")
            return jsonify({'error': f'Could not process file for RAG: {str(e)}'}), 500

    return jsonify({'error': 'Knowledge file upload failed for unknown reasons'}), 500


@app.route('/api/knowledge/list', methods=['GET'])
def list_knowledge_documents():
    if not get_config_value('rag_enabled'):
        return jsonify({'knowledge_files': [], 'message': 'RAG system is disabled.'})
    try:
        # Summaries might include document ID, a preview, and metadata
        summaries = rag_engine.list_all_documents_summary(limit=200)
        # Transform summaries for frontend if needed, e.g., group by original file
        # For now, directly return what RAG engine provides
        return jsonify({'knowledge_files': summaries})
    except Exception as e:
        logging.error(f"Error listing knowledge documents: {e}")
        return jsonify({'error': str(e), 'knowledge_files': []}), 500

@app.route('/api/knowledge/delete/<path:doc_id_prefix>', methods=['DELETE'])
def delete_from_knowledge_base(doc_id_prefix):
    if not get_config_value('rag_enabled'):
        return jsonify({'error': 'RAG system is currently disabled.'}), 403

    if not doc_id_prefix:
        return jsonify({'error': 'No document ID prefix provided for deletion.'}), 400

    try:
        # The doc_id_prefix should correspond to the `doc_id` used when adding (e.g., "file_filename.pdf")
        # or a more specific chunk ID if frontend manages that.
        # rag_engine.delete_document_chunks expects the original base doc_id.
        deleted_count = rag_engine.delete_document_chunks(doc_id_prefix)
        if deleted_count > 0:
            logging.info(f"Deleted {deleted_count} chunks for document prefix '{doc_id_prefix}' from RAG.")
            return jsonify({'message': f'Document chunks related to "{doc_id_prefix}" deleted successfully.', 'deleted_count': deleted_count})
        else:
            logging.info(f"No document chunks found or deleted for prefix '{doc_id_prefix}'.")
            return jsonify({'message': f'No document chunks found for "{doc_id_prefix}".', 'deleted_count': 0}), 404
    except Exception as e:
        logging.error(f"Error deleting document chunks for '{doc_id_prefix}' from RAG: {e}")
        return jsonify({'error': f'Could not delete document: {str(e)}'}), 500


# --- Main Execution ---
if __name__ == '__main__':
    logging.info("Starting My Personal AI Assistant backend server...")
    # Host 0.0.0.0 to make it accessible on the local network if needed
    # Debug should be False in a "production" local environment, but useful for dev
    app.run(host="0.0.0.0", port=3000, debug=True)
