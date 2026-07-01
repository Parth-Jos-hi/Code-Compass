import json
import os
import shutil
import sys
from pathlib import Path

from sqlalchemy.orm import Session


ROOT_DIR = Path(__file__).resolve().parent
BACKEND_DIR = ROOT_DIR / "backend"
sys.path.insert(0, str(BACKEND_DIR))
os.chdir(BACKEND_DIR)

from app.core.parser import chunk_code_file, extract_dependencies, scan_local_repository
from app.core.vector_engine import get_or_create_collection, search_semantic_context
from app.db.database import Base, SessionLocal, engine
from app.db.models import RepositoryNode
Base.metadata.create_all(bind=engine)

MOCK_REPO_PATH = ROOT_DIR / "mock_test_repo"
TEST_REPO_NAME = "VerificationTest"


def setup_mock_repository():
    """Create a temporary full-stack repository with mock dependencies."""
    if MOCK_REPO_PATH.exists():
        shutil.rmtree(MOCK_REPO_PATH)
    MOCK_REPO_PATH.mkdir()

    python_code = """
import os
from database import save_record

def start_processing_loop():
    print("Beginning local ingestion sequence...")
    items = [1, 2, 3, 4, 5]
    for item in items:
        save_record(f"Item_{item}")
    return True
"""
    (MOCK_REPO_PATH / "main.py").write_text(
        python_code.strip(), encoding="utf-8"
    )

    react_code = """
import React from 'react';
import { NetworkNode } from '../components/Node';

export default function GraphCanvas() {
    return <div className="dark-theme">Rendering 3D Universe Map</div>;
}
"""
    (MOCK_REPO_PATH / "GraphCanvas.tsx").write_text(
        react_code.strip(), encoding="utf-8"
    )


def clear_verification_data(db: Session, collection):
    """Remove rows and vectors created by this verification script."""
    db.query(RepositoryNode).filter(
        RepositoryNode.repo_name == TEST_REPO_NAME
    ).delete(synchronize_session=False)
    db.commit()
    collection.delete(where={"repo_name": TEST_REPO_NAME})


def test_pipeline():
    print("[TEST] Initializing VoidScout pipeline verification...\n")
    setup_mock_repository()
    db: Session = SessionLocal()
    collection = get_or_create_collection()

    try:
        clear_verification_data(db, collection)

        files = scan_local_repository(str(MOCK_REPO_PATH))
        print(f"[PASS] Scanner discovered {len(files)} mock files.")
        assert len(files) == 2, "Scanner failed to index both files."

        for file_data in files:
            path = file_data["file_path"]
            language = file_data["language"]
            content = file_data["content"]

            imports = extract_dependencies(content, language)
            chunks = chunk_code_file(content, chunk_size=150, overlap=30)
            metadata = {"imports": imports, "impact_score": len(imports) * 2}

            db.add(
                RepositoryNode(
                    repo_name=TEST_REPO_NAME,
                    file_path=path,
                    language=language,
                    imports_json=json.dumps(metadata),
                )
            )

            for index, chunk in enumerate(chunks):
                collection.add(
                    documents=[chunk],
                    metadatas=[
                        {"repo_name": TEST_REPO_NAME, "file_path": path}
                    ],
                    ids=[f"test_{path}_chunk_{index}"],
                )

        db.commit()
        stored_rows = db.query(RepositoryNode).filter(
            RepositoryNode.repo_name == TEST_REPO_NAME
        ).count()
        assert stored_rows == 2, "SQLite did not store both repository nodes."
        print("[PASS] SQLite stored and retrieved both repository nodes.")

        search_results = search_semantic_context(
            query="Where do we start the loop?",
            repo_name=TEST_REPO_NAME,
            n_results=1,
        )
        documents = search_results.get("documents") if search_results else None
        assert documents and documents[0], "ChromaDB returned no matching blocks."

        print("\n[RESULT] Best matching code block:")
        print("---")
        print(documents[0][0])
        print("---")
        print("✅ Vector Check: ChromaDB - Semantic search verified")
        print("\n[SUCCESS] Full pipeline verification passed.")
    finally:
        db.rollback()
        clear_verification_data(db, collection)
        db.close()
        if MOCK_REPO_PATH.exists():
            shutil.rmtree(MOCK_REPO_PATH)
        print("[CLEANUP] Verification data removed successfully.")


if __name__ == "__main__":
    test_pipeline()
