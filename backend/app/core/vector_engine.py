import os
import chromadb
from chromadb.config import Settings
from app.core.config import settings

# Initialize the persistent local ChromaDB client
# This ensures vectors are saved to your local disk, not lost in volatile memory
chroma_client = chromadb.PersistentClient(
    path=settings.CHROMA_DB_DIR,
    settings=Settings(allow_reset=True)
)

def get_or_create_collection():
    """
    Fetches or instantiates the primary vector storage partition for VoidScout.
    Uses native cosine similarity math to handle concept mappings.
    """
    return chroma_client.get_or_create_collection(
        name="voidscout_codebase_chunks",
        metadata={"hnsw:space": "cosine"} # Optimizes search vector alignment
    )

def add_code_chunks(texts: list, metadatas: list, ids: list):
    """
    Pushes code slices directly into our local vector database storage layer.
    """
    collection = get_or_create_collection()
    
    # Note: In production runtime, ChromaDB automatically converts these raw texts 
    # into numerical array coordinates using standard internal text models, 
    # or balances them using your Gemini API integrations down the line.
    collection.add(
        documents=texts,
        metadatas=metadatas,
        ids=ids
    )

def search_semantic_context(query: str, repo_name: str, n_results: int = 4) -> dict:
    """
    Queries ChromaDB for the closest code blocks matching natural human language.
    Filters the lookup strictly by repo name to avoid cross-project contamination.
    """
    collection = get_or_create_collection()
    
    results = collection.query(
        query_texts=[query],
        n_results=n_results,
        where={"repo_name": repo_name} # Multi-tenant isolation filter
    )
    return results