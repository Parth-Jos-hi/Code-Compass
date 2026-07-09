import os
import json
import math
import re
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.db.models import RepositoryNode
from app.core.path_utils import resolve_repository_file_path
from app.core.parser import scan_local_repository, extract_dependencies, chunk_code_file
from app.core.vector_engine import add_code_chunks, search_semantic_context
from app.core.llm_engine import get_llm_engine


class SocraticRequest(BaseModel):
    question: str
    repo_name: str
    node_id: int | None = None
    code_context: str | None = None
    repo_path: str | None = None

router = APIRouter(prefix="/api/voyage", tags=["Voyage Codebase Explorer"])


SUPPORTED_FILE_REF_EXTENSIONS = ("py", "tsx", "ts", "jsx", "js", "json", "css", "java", "cpp", "hpp", "h", "c")


def _wants_repo_overview(question: str) -> bool:
    lowered = question.lower()
    return any(phrase in lowered for phrase in [
        "all files",
        "all the files",
        "entire repo",
        "whole repo",
        "full repo",
        "this repo",
        "repository",
        "project structure",
        "folder structure",
        "all folders",
        "explain the project",
        "understand the project",
    ])


def _build_repo_overview_context(repo_name: str, db: Session) -> tuple[str, list[str]]:
    nodes = db.query(RepositoryNode).filter(RepositoryNode.repo_name == repo_name).order_by(RepositoryNode.file_path).all()
    if not nodes:
        return f"Repository: {repo_name}\nNo indexed files found.", [f"repository:{repo_name}"]

    folder_counts = {}
    lines = [f"Repository: {repo_name}", f"Total indexed files: {len(nodes)}", "", "Folders:"]
    for node in nodes:
        folder = os.path.dirname(node.file_path).replace("\\", "/") or "."
        folder_counts[folder] = folder_counts.get(folder, 0) + 1

    for folder, count in sorted(folder_counts.items()):
        lines.append(f"- {folder}: {count} file{'s' if count != 1 else ''}")

    lines.extend(["", "Files:"])
    for node in nodes:
        imports = ", ".join(sorted(_imports_for_node(node))) or "none"
        lines.append(f"- {node.file_path} | language={node.language} | imports={imports}")

    return "\n".join(lines), [f"repository:{repo_name}"]


def _read_node_content(node: RepositoryNode, repo_path: str | None) -> str | None:
    resolved_path = None
    if repo_path:
        resolved_path = resolve_repository_file_path(os.path.join(repo_path, node.file_path))
    if not resolved_path:
        resolved_path = resolve_repository_file_path(node.file_path)
    if not resolved_path:
        return None
    try:
        with open(resolved_path, "r", encoding="utf-8", errors="ignore") as f:
            return f.read()
    except Exception:
        return None


def _node_basename_tokens(node: RepositoryNode) -> set[str]:
    base = os.path.basename(node.file_path).lower()
    stem = os.path.splitext(base)[0]
    return {base, stem}


def _extract_file_references(question: str) -> set[str]:
    extensions = "|".join(SUPPORTED_FILE_REF_EXTENSIONS)
    references = set()
    for match in re.finditer(rf"[\w./\\-]+\.({extensions})\b", question, flags=re.IGNORECASE):
        references.add(match.group(0).replace("\\", "/").lower())
    return references


def _node_matches_reference(node: RepositoryNode, reference: str) -> bool:
    normalized_path = node.file_path.replace("\\", "/").lower()
    normalized_ref = reference.replace("\\", "/").lower()
    return normalized_path.endswith(normalized_ref) or os.path.basename(normalized_path) == os.path.basename(normalized_ref)


def _imports_for_node(node: RepositoryNode) -> set[str]:
    if not node.imports_json:
        return set()
    try:
        parsed = json.loads(node.imports_json)
    except Exception:
        return set()
    return {str(item).lower() for item in parsed.get("imports", [])}


def _find_related_nodes(question: str, repo_name: str, selected_node: RepositoryNode | None, db: Session, limit: int = 5) -> list[RepositoryNode]:
    all_nodes = db.query(RepositoryNode).filter(RepositoryNode.repo_name == repo_name).all()
    related = []
    seen_ids = {selected_node.id} if selected_node else set()
    file_refs = _extract_file_references(question)

    def add_node(candidate: RepositoryNode):
        if candidate.id in seen_ids:
            return
        related.append(candidate)
        seen_ids.add(candidate.id)

    for reference in file_refs:
        for candidate in all_nodes:
            if _node_matches_reference(candidate, reference):
                add_node(candidate)

    if selected_node:
        selected_imports = _imports_for_node(selected_node)
        selected_tokens = _node_basename_tokens(selected_node)
        for candidate in all_nodes:
            candidate_tokens = _node_basename_tokens(candidate)
            candidate_imports = _imports_for_node(candidate)
            if selected_imports.intersection(candidate_tokens):
                add_node(candidate)
            elif candidate_imports.intersection(selected_tokens):
                add_node(candidate)

    return related[:limit]

@router.post("/index")
async def index_repository(repo_path: str = Query(...), repo_name: str = Query(...), db: Session = Depends(get_db)):
    """
    Primary ingestion endpoint. Crawls a local codebase repository path, resolves internal 
    architectural framework dependencies, and stores semantic text slices inside ChromaDB.
    """
    if not os.path.exists(repo_path):
        host_repo_base = os.getenv("HOST_REPO_BASE")
        container_repo_base = os.getenv("CONTAINER_REPO_BASE")
        if host_repo_base and container_repo_base:
            # Normalize both paths to a common form and compare in a case-insensitive way
            try:
                # Use normpath to collapse redundant separators, then use forward slashes for comparison
                normalized_host = os.path.normpath(host_repo_base).replace('\\', '/').rstrip('/')
                normalized_path = os.path.normpath(repo_path).replace('\\', '/').rstrip('/')

                if normalized_path.lower().startswith(normalized_host.lower()):
                    # Compute the relative remainder and join with container base to form a valid container path
                    remainder = normalized_path[len(normalized_host):].lstrip('/')
                    repo_path = os.path.join(container_repo_base, remainder) if remainder else container_repo_base
                else:
                    # Additional handling: if repo_path was provided as a Windows drive-letter path
                    # e.g. "D:/path/to/repo" or "D:\\path\\to\\repo", map the drive root to container base
                    # Normalize to forward-slash form for pattern matching
                    import re
                    m = re.match(r"^([A-Za-z]):/(.*)$", normalized_path)
                    if m:
                        remainder = m.group(2).lstrip('/')
                        repo_path = os.path.join(container_repo_base, remainder) if remainder else container_repo_base
            except Exception:
                # Fallback to the original simple replacement if anything unexpected occurs
                normalized_host = host_repo_base.replace('\\', '/')
                normalized_path = repo_path.replace('\\', '/')
                if normalized_path.lower().startswith(normalized_host.lower()):
                    repo_path = normalized_path.replace(normalized_host, container_repo_base, 1)

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
        existing_node = db.query(RepositoryNode).filter(
            RepositoryNode.repo_name == repo_name,
            RepositoryNode.file_path == path
        ).first()
        if existing_node:
            continue

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


def _build_socratic_answer(
    question: str,
    repo_name: str,
    node_id: int | None,
    code_context: str | None,
    repo_path: str | None,
    db: Session
):
    if _wants_repo_overview(question):
        repo_context, repo_sources = _build_repo_overview_context(repo_name, db)
        rag_engine = get_llm_engine()
        answer_payload = rag_engine.generate_rag_answer(question, repo_name, [repo_context], repo_sources)
        return {
            "status": "success",
            "question": question,
            "answer": answer_payload["answer"],
            "source_context": answer_payload["source_context"]
        }

    node = None
    if node_id is not None:
        node = db.query(RepositoryNode).filter(
            RepositoryNode.repo_name == repo_name,
            RepositoryNode.id == node_id
        ).first()

    if code_context is None and node:
        code_context = _read_node_content(node, repo_path)

    if node is not None and not code_context:
        code_context = f"// File: {node.file_path}\n// Content could not be loaded from the provided repository path."

    if node is not None:
        results = {}
    else:
        try:
            results = search_semantic_context(
                question,
                repo_name,
                n_results=24 if node is not None else 4
            )
        except Exception:
            results = {}
    context_chunks = []
    source_paths = []

    documents = results.get("documents") or []
    metadatas = results.get("metadatas") or []
    if node is not None and isinstance(metadatas, list):
        # When a specific node is selected, keep only chunks from that file path.
        filtered_docs = []
        filtered_meta = []
        for doc_list, meta_list in zip(documents, metadatas):
            filtered_docs.append([])
            filtered_meta.append([])
            for doc, meta in zip(doc_list, meta_list):
                if meta.get("file_path") == node.file_path:
                    filtered_docs[-1].append(doc)
                    filtered_meta[-1].append(meta)
        documents = filtered_docs
        metadatas = filtered_meta
    if isinstance(documents, list) and len(documents) > 0:
        documents = documents[0]
    if isinstance(metadatas, list) and len(metadatas) > 0:
        metadatas = metadatas[0]

    for idx, doc in enumerate(documents):
        if not doc:
            continue
        context_chunks.append(str(doc))
        metadata = metadatas[idx] if idx < len(metadatas) else {}
        source_paths.append(metadata.get("file_path", "unknown"))

    if code_context:
        context_chunks = [code_context] + context_chunks
        if node:
            source_paths = [node.file_path] + source_paths
        else:
            source_paths = [repo_name] + source_paths

    for related_node in _find_related_nodes(question, repo_name, node, db):
        related_content = _read_node_content(related_node, repo_path)
        if not related_content:
            related_imports = ", ".join(sorted(_imports_for_node(related_node))) or "none recorded"
            related_content = f"// File: {related_node.file_path}\n// Content could not be loaded.\n// Indexed imports: {related_imports}"
        context_chunks.append(related_content)
        source_paths.append(related_node.file_path)

    if not context_chunks and node:
        # Fallback to the resolved file itself if semantic retrieval does not return a match.
        fallback_context = _read_node_content(node, repo_path)
        if fallback_context:
            context_chunks = [fallback_context]
            source_paths = [node.file_path]

    rag_engine = get_llm_engine()
    answer_payload = rag_engine.generate_rag_answer(question, repo_name, context_chunks, source_paths)

    return {
        "status": "success",
        "question": question,
        "answer": answer_payload["answer"],
        "source_context": answer_payload["source_context"]
    }


@router.post("/socratic")
async def socratic_query(payload: SocraticRequest, db: Session = Depends(get_db)):
    """Answer a Socratic question using retrieval-augmented generation."""
    return _build_socratic_answer(
        question=payload.question,
        repo_name=payload.repo_name,
        node_id=payload.node_id,
        code_context=payload.code_context,
        repo_path=payload.repo_path,
        db=db,
    )


@router.get("/socratic")
async def socratic_query_get(
    question: str = Query(...),
    repo_name: str = Query(...),
    node_id: int | None = Query(None),
    repo_path: str | None = Query(None),
    db: Session = Depends(get_db),
):
    """Answer a Socratic question via GET to avoid browser POST/preflight issues."""
    return _build_socratic_answer(
        question=question,
        repo_name=repo_name,
        node_id=node_id,
        code_context=None,
        repo_path=repo_path,
        db=db,
    )


@router.get("/file-content/{node_id}")
async def get_file_content(
    node_id: int,
    repo_name: str = Query(...),
    repo_path: str | None = Query(None),
    db: Session = Depends(get_db)
):
    """Return the selected file content so the frontend can ask arbitrary questions about it."""
    node = db.query(RepositoryNode).filter(
        RepositoryNode.repo_name == repo_name,
        RepositoryNode.id == node_id
    ).first()

    if not node:
        raise HTTPException(status_code=404, detail="Node not found")

    full_path = None
    if repo_path:
        full_path = resolve_repository_file_path(os.path.join(repo_path, node.file_path))
    if not full_path:
        full_path = resolve_repository_file_path(node.file_path)
    if not full_path:
        raise HTTPException(status_code=404, detail="File content could not be resolved")

    try:
        with open(full_path, "r", encoding="utf-8", errors="ignore") as f:
            content = f.read()
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Failed to read file content: {exc}")

    return {
        "status": "success",
        "node_id": node_id,
        "file_path": node.file_path,
        "language": node.language,
        "content": content,
    }


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
