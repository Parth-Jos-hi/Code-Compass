import os
import hashlib
import math

import chromadb
from chromadb.config import Settings

from app.core.config import settings

os.makedirs(settings.CHROMA_DB_DIR, exist_ok=True)

# Initialize the persistent local ChromaDB client
# This ensures vectors are saved to your local disk, not lost in volatile memory
chroma_client = chromadb.PersistentClient(
    path=settings.CHROMA_DB_DIR,
    settings=Settings(allow_reset=True)
)


def _embed_text(text: str, dimensions: int = 384) -> list[float]:
    """Create a fast deterministic embedding without downloading a model."""
    vector = [0.0] * dimensions
    if not text:
        return vector

    tokens = text.lower().split()
    if not tokens:
        tokens = [text.lower()]

    for token in tokens:
        digest = hashlib.sha256(token.encode("utf-8", errors="ignore")).digest()
        for index in range(0, 32, 4):
            bucket = int.from_bytes(digest[index:index + 4], "big") % dimensions
            vector[bucket] += 1.0

    norm = math.sqrt(sum(value * value for value in vector))
    if norm > 0:
        vector = [value / norm for value in vector]
    return vector

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
    embeddings = [_embed_text(text) for text in texts]
    
    # Note: In production runtime, ChromaDB automatically converts these raw texts 
    # into numerical array coordinates using standard internal text models, 
    # or balances them using your Gemini API integrations down the line.
    collection.add(
        documents=texts,
        embeddings=embeddings,
        metadatas=metadatas,
        ids=ids
    )

def search_semantic_context(query: str, repo_name: str, n_results: int = 4, file_path: str | None = None) -> dict:
    """
    Queries ChromaDB for the closest code blocks matching natural human language.
    Filters the lookup strictly by repo name.
    If a file path is provided, the caller should filter results afterward because
    the current ChromaDB filter format does not accept combined root-level fields.
    """
    collection = get_or_create_collection()
    
    results = collection.query(
        query_embeddings=[_embed_text(query)],
        n_results=n_results,
        where={"repo_name": repo_name} # Multi-tenant isolation filter
    )
    return results