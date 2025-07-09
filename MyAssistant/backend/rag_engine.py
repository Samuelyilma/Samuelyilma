import chromadb
from chromadb.utils import embedding_functions
import uuid # For generating unique IDs for documents

# --- Configuration ---
# In a real app, CHROMA_DATA_PATH and COLLECTION_NAME would be configurable
CHROMA_DATA_PATH = "knowledge_base" # Directory to store ChromaDB data
COLLECTION_NAME = "local_assistant_knowledge"
# Using a sentence transformer model for embeddings.
# You can choose other models supported by chromadb.utils.embedding_functions
# or provide your own embedding function.
# Make sure the model is downloaded (first time use might take a while)
EMBEDDING_MODEL_NAME = "all-MiniLM-L6-v2"

# --- Initialize ChromaDB Client and Collection ---
# Using a persistent client to store data on disk
client = chromadb.PersistentClient(path=CHROMA_DATA_PATH)

# Using an embedding function from chromadb.utils
# This will download the model if not already present (requires internet for first time)
sentence_transformer_ef = embedding_functions.SentenceTransformerEmbeddingFunction(
    model_name=EMBEDDING_MODEL_NAME
)

# Get or create the collection with the specified embedding function
collection = client.get_or_create_collection(
    name=COLLECTION_NAME,
    embedding_function=sentence_transformer_ef,
    metadata={"hnsw:space": "cosine"} # Using cosine distance for similarity
)

def add_document(text_content, metadata=None, doc_id=None):
    """
    Adds a document (text content) to the ChromaDB collection.
    Each document is chunked for more effective retrieval. (Simplified chunking here)
    """
    if not text_content.strip():
        print("Skipping empty document.")
        return None

    # Simple chunking: split by paragraphs or fixed size chunks
    # For more advanced chunking, consider libraries like LangChain's text_splitter
    chunks = [chunk for chunk in text_content.split("\n\n") if chunk.strip()]
    if not chunks:
        chunks = [text_content] # Fallback if no double newline

    doc_ids = []
    metadatas = []

    # Generate a base ID for the document if not provided
    base_doc_id = doc_id if doc_id else str(uuid.uuid4())

    for i, chunk in enumerate(chunks):
        chunk_id = f"{base_doc_id}_chunk_{i}"
        doc_ids.append(chunk_id)

        # Each chunk can have its own metadata, or inherit from the document
        chunk_metadata = metadata.copy() if metadata else {}
        chunk_metadata["original_doc_id"] = base_doc_id
        chunk_metadata["chunk_index"] = i
        metadatas.append(chunk_metadata)

    if not chunks:
        print("No content to add to the knowledge base.")
        return []

    try:
        collection.add(
            documents=chunks,
            metadatas=metadatas,
            ids=doc_ids
        )
        print(f"Added {len(chunks)} chunk(s) from document ID '{base_doc_id}' to knowledge base.")
        return doc_ids
    except Exception as e:
        print(f"Error adding document to ChromaDB: {e}")
        return []


def query_knowledge_base(query_text, n_results=3):
    """
    Queries the ChromaDB collection for documents similar to the query_text.
    """
    if not query_text.strip():
        return []
    try:
        results = collection.query(
            query_texts=[query_text],
            n_results=n_results,
            # include=['documents', 'metadatas', 'distances'] # To get more info
            include=['documents', 'metadatas']
        )
        # `results` is a dict with 'ids', 'documents', 'metadatas', 'distances'
        # We are interested in the 'documents' and 'metadatas' for the first query_text

        retrieved_docs = []
        if results and results.get('documents') and results['documents'][0]:
            for i, doc_content in enumerate(results['documents'][0]):
                retrieved_docs.append({
                    "content": doc_content,
                    "metadata": results['metadatas'][0][i] if results.get('metadatas') else None,
                    # "distance": results['distances'][0][i] if results.get('distances') else None
                })
        return retrieved_docs
    except Exception as e:
        print(f"Error querying ChromaDB: {e}")
        return []

def list_all_documents_summary(limit=100):
    """
    Lists a summary of all documents (or their first chunks) in the collection.
    Note: `collection.get()` can be resource-intensive for very large collections.
    """
    try:
        # Peek at the first few entries to give an idea of what's in the DB
        results = collection.peek(limit=limit)
        if not results or not results.get('ids'):
            return []

        summaries = []
        for i in range(len(results['ids'])):
            summaries.append({
                "id": results['ids'][i],
                "document_preview": (results['documents'][i][:100] + "...") if results['documents'] and results['documents'][i] else "N/A",
                "metadata": results['metadatas'][i] if results['metadatas'] else {}
            })
        return summaries
    except Exception as e:
        print(f"Error listing documents from ChromaDB: {e}")
        return []

def delete_document_chunks(doc_id_prefix):
    """
    Deletes all chunks associated with a specific original document ID prefix.
    """
    try:
        # This is a simplified way to delete by a common prefix in IDs.
        # For more robust deletion, you might query by metadata if you stored a unique doc_id there.
        current_items = collection.get(include=['ids', 'metadatas'])
        ids_to_delete = []
        if current_items and current_items.get('ids'):
            for i, m_id in enumerate(current_items['ids']):
                # Check metadata for original_doc_id or if the id itself starts with the prefix
                metadata = current_items['metadatas'][i] if current_items['metadatas'] and len(current_items['metadatas']) > i else {}
                if m_id.startswith(doc_id_prefix) or (metadata and metadata.get("original_doc_id") == doc_id_prefix):
                    ids_to_delete.append(m_id)

        if ids_to_delete:
            collection.delete(ids=ids_to_delete)
            print(f"Deleted {len(ids_to_delete)} chunks related to document ID prefix '{doc_id_prefix}'.")
            return len(ids_to_delete)
        else:
            print(f"No chunks found with document ID prefix '{doc_id_prefix}' to delete.")
            return 0
    except Exception as e:
        print(f"Error deleting document chunks from ChromaDB: {e}")
        return 0


if __name__ == '__main__':
    print("RAG Engine Initialized with ChromaDB.")
    print(f"Using embedding model: {EMBEDDING_MODEL_NAME}")
    print(f"ChromaDB data path: ./{CHROMA_DATA_PATH}")
    print(f"Collection name: {COLLECTION_NAME}")
    print(f"Current collection count: {collection.count()}")

    # --- Example Usage ---

    # 1. Add documents
    doc1_id = "doc_sci_fi_rules"
    doc1_content = (
        "Rule 1: Always wear reflective chrome.\n\n"
        "Rule 2: Neon lights are mandatory for atmosphere.\n\n"
        "Rule 3: Enhance your human capabilities with cybernetics."
    )
    doc1_metadata = {"source": "CyberpunkHandbook.txt", "category": "style_guide"}

    # Clear previous instances of this doc for idempotency in testing
    delete_document_chunks(doc1_id)
    add_document(doc1_content, metadata=doc1_metadata, doc_id=doc1_id)

    doc2_id = "doc_ai_ethics"
    doc2_content = (
        "Ethical AI development requires transparency and fairness. "
        "Bias in training data can lead to skewed outcomes. "
        "Accountability for AI decisions is crucial."
    )
    doc2_metadata = {"source": "AIPrinciples.md", "category": "ethics"}
    delete_document_chunks(doc2_id)
    add_document(doc2_content, metadata=doc2_metadata, doc_id=doc2_id)

    print(f"\nCollection count after adding documents: {collection.count()}")

    # 2. Query the knowledge base
    print("\n--- Querying for 'cybernetic rules' ---")
    query_results = query_knowledge_base("What are the rules for cybernetics and style?", n_results=2)
    if query_results:
        for i, result in enumerate(query_results):
            print(f"Result {i+1}:")
            print(f"  Content: {result['content'][:100]}...") # Preview
            print(f"  Metadata: {result['metadata']}")
            # print(f"  Distance: {result['distance']}") # If included
    else:
        print("No relevant documents found.")

    print("\n--- Querying for 'AI ethics' ---")
    query_results_ethics = query_knowledge_base("Tell me about AI ethics and bias.", n_results=1)
    if query_results_ethics:
        for result in query_results_ethics:
            print(f"  Content: {result['content']}")
            print(f"  Metadata: {result['metadata']}")
    else:
        print("No relevant documents found for AI ethics.")

    # 3. List documents (summary)
    print("\n--- Listing all document summaries (first few) ---")
    summaries = list_all_documents_summary(limit=5)
    if summaries:
        for summary in summaries:
            print(f"ID: {summary['id']}, Preview: {summary['document_preview']}, Metadata: {summary['metadata']}")
    else:
        print("No documents in the knowledge base.")

    # 4. Deleting document chunks (example)
    # print("\n--- Deleting document 'doc_sci_fi_rules' ---")
    # deleted_count = delete_document_chunks(doc1_id) # Use the original doc_id used for adding
    # print(f"Number of chunks deleted: {deleted_count}")
    # print(f"Collection count after deletion: {collection.count()}")

    # To clean up the created ChromaDB store after testing (optional):
    # import shutil
    # try:
    #     # client.delete_collection(COLLECTION_NAME) # Deletes the collection
    #     # print(f"Collection '{COLLECTION_NAME}' deleted.")
    #     # If you want to remove the entire data directory:
    #     # shutil.rmtree(CHROMA_DATA_PATH)
    #     # print(f"ChromaDB data directory '{CHROMA_DATA_PATH}' removed.")
    # except Exception as e:
    #     print(f"Error during cleanup: {e}")
    pass
