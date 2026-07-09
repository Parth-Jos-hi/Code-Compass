from __future__ import annotations

import os
from pathlib import Path


def _normalized_path(value: str) -> str:
    return os.path.normpath(value).replace("\\", "/").rstrip("/")


def resolve_repository_file_path(relative_path: str) -> Path | None:
    """Resolve a repository-relative file path against known runtime roots."""
    if not relative_path:
        return None

    candidate_paths = []
    host_repo_base = os.getenv("HOST_REPO_BASE")
    container_repo_base = os.getenv("CONTAINER_REPO_BASE")
    normalized_input = _normalized_path(relative_path)

    if host_repo_base and container_repo_base:
        normalized_host = _normalized_path(host_repo_base)
        if normalized_input.lower().startswith(normalized_host.lower()):
            remainder = normalized_input[len(normalized_host):].lstrip("/")
            candidate_paths.append(Path(container_repo_base) / remainder)

    input_path = Path(relative_path)

    if input_path.is_absolute():
        candidate_paths.append(input_path)

    env_roots = [host_repo_base, container_repo_base]
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

    return None
