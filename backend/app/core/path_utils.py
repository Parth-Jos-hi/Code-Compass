from __future__ import annotations

import os
from pathlib import Path
import glob


def resolve_repository_file_path(relative_path: str) -> Path | None:
    """Resolve a repository-relative file path against known runtime roots."""
    if not relative_path:
        return None

    candidate_paths = []
    input_path = Path(relative_path)

    if input_path.is_absolute():
        candidate_paths.append(input_path)

    env_roots = [os.getenv("HOST_REPO_BASE"), os.getenv("CONTAINER_REPO_BASE")]
    for root in env_roots:
        if root:
            candidate_paths.append(Path(root) / relative_path)

    project_root = Path(__file__).resolve().parents[3]
    candidate_paths.append(project_root / relative_path)
    candidate_paths.append(project_root / "frontend" / relative_path)
    candidate_paths.append(project_root / "backend" / relative_path)
    candidate_paths.append(Path.cwd() / relative_path)
    candidate_paths.append(Path.cwd() / "frontend" / relative_path)
    candidate_paths.append(Path.cwd() / "backend" / relative_path)

    seen_candidates = set()
    for candidate in candidate_paths:
        candidate_key = str(candidate)
        if candidate_key in seen_candidates:
            continue
        seen_candidates.add(candidate_key)
        if candidate.exists():
            return candidate

    # Final fallback: search under common workspace roots for a path that ends with the same suffix.
    suffix = relative_path.replace("\\", "/").lstrip("/")
    search_roots = [project_root, project_root / "frontend", project_root / "backend", Path.cwd(), Path.cwd() / "frontend", Path.cwd() / "backend"]
    for root in search_roots:
        pattern = str(root / "**" / Path(suffix))
        matches = [Path(match) for match in glob.glob(pattern, recursive=True) if Path(match).is_file()]
        if matches:
            return matches[0]

    return None