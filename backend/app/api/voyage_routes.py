import os
import json
import math
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.db.models import RepositoryNode
from app.core.parser import scan_local_repository, extract_dependencies, chunk_code_file
from app.core.vector_engine import add_code_chunks

router = APIRouter(prefix="/api/voyage", tags=["Voyage Codebase Explorer"])

@router.post("/index")
async def index_repository(repo_path: str = Query(...), repo_name: str = Query(...), db: Session = Depends(get_db)):
    """
    Primary ingestion endpoint. Crawls a local codebase repository path, resolves internal 
    architectural framework dependencies, and stores semantic text slices inside ChromaDB.
    """
    if not os.path.exists(repo_path):
        raise HTTPException(status_code=404, detail="The specified absolute directory path does not exist.")

    # 1. Prevent overlapping duplicate history metrics by dropping past scans for this project
    db.query(RepositoryNode).filter(RepositoryNode.repo_name == repo_name).delete()
    db.commit()

    # 2. Extract code blocks via local file system scanner tool
    raw_files = scan_local_repository(repo_path)
    if not raw_files:
        raise HTTPException(status_code=400, detail="No supported source code files discovered in this workspace.")

    total_chunks = 0

    # 3. Process structural file elements and parse vectors
    for file_obj in raw_files:
        path = file_obj["file_path"]
        lang = file_obj["language"]
        content = file_obj["content"]

        imports = extract_dependencies(content, lang)
        chunks = chunk_code_file(content, chunk_size=1000, overlap=200)
        total_chunks += len(chunks)

        # Structure structural data parameters for sizing dashboard nodes
        meta = {
            "imports": imports,
            "impact_score": len(imports) * 2 or 1
        }

        # Save metadata structures inside our persistent SQLite database tables
        node = RepositoryNode(
            repo_name=repo_name,
            file_path=path,
            language=lang,
            imports_json=json.dumps(meta),
            is_mastered=False
        )
        db.add(node)

        # Package raw code snippets directly out to ChromaDB Vector storage collections
        texts, metadatas, ids = [], [], []
        for idx, chunk in enumerate(chunks):
            texts.append(chunk)
            metadatas.append({"repo_name": repo_name, "file_path": path})
            ids.append(f"{repo_name}_{path}_chunk_{idx}")

        add_code_chunks(texts, metadatas, ids)

    db.commit()

    return {
        "status": "success",
        "repository_indexed": repo_name,
        "total_files_mapped": len(raw_files),
        "total_vector_chunks_stored": total_chunks
    }


@router.get("/nodes")
async def get_repository_graph(repo_name: str = Query(...), db: Session = Depends(get_db)):
    """
    Fetches all indexed workspace files and maps out custom coordinate variables 
    along a uniform 3D sphere using a mathematical Golden Spiral projection.
    """
    nodes = db.query(RepositoryNode).filter(RepositoryNode.repo_name == repo_name).all()
    
    if not nodes:
        raise HTTPException(status_code=404, detail="No indexed repository data found for this identifier.")

    formatted_nodes = []
    num_nodes = len(nodes)
    phi = math.pi * (3.0 - math.sqrt(5.0))  # Golden ratio angular factor configuration

    for idx, node in enumerate(nodes):
        meta = json.loads(node.imports_json) if node.imports_json else {"imports": [], "impact_score": 1}
        
        # Space coordinates evenly along a 3D sphere to avoid cluttered overlaps
        y = 1.0 - (idx / float(num_nodes - 1)) * 2.0 if num_nodes > 1 else 0.0
        radius = math.sqrt(1.0 - y * y)
        theta = phi * idx
        
        x = math.cos(theta) * radius
        z = math.sin(theta) * radius
        scale = 8.0  # Controls diameter size bounds inside Three.js
        
        formatted_nodes.append({
            "id": str(node.id),
            "file_path": node.file_path,
            "language": node.language,
            "impact_score": meta.get("impact_score", 1),
            "is_mastered": node.is_mastered,
            "position": [x * scale, y * scale, z * scale]
        })

    return formatted_nodes


@router.patch("/mastery")
async def toggle_node_mastery(node_id: int = Query(...), db: Session = Depends(get_db)):
    """
    Updates the persistent exploration progress state of an entry inside SQLite.
    Flipping this alters the coordinate node coloration layout on the UI layer.
    """
    node = db.query(RepositoryNode).filter(RepositoryNode.id == node_id).first()
    
    if not node:
        raise HTTPException(status_code=404, detail="Target codebase node target not found.")
        
    # Invert the boolean state completely
    node.is_mastered = not node.is_mastered
    db.commit()
    db.refresh(node)
    
    return {
        "status": "success",
        "node_id": node.id,
        "is_mastered": node.is_mastered,
        "message": f"Module status updated to {'Mastered' if node.is_mastered else 'Exploring'}."
    }