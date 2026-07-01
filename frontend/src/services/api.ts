const API_BASE_URL = "http://127.0.0.1:8000/api";

export interface IndexResponse {
  status: string;
  repository_indexed: string;
  total_files_mapped: number;
  total_vector_chunks_stored: number;
  message?: string;
}

export interface CodeNode {
  id: string;
  file_path: string;
  language: string;
  impact_score: number;
  is_mastered: boolean;
  position: [number, number, number];
}

/**
 * Triggers the local background file extraction and vector slice engine.
 */
export async function indexLocalRepository(repoPath: string, repoName: string): Promise<IndexResponse> {
  const response = await fetch(`${API_BASE_URL}/voyage/index?repo_path=${encodeURIComponent(repoPath)}&repo_name=${encodeURIComponent(repoName)}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
  });
  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.detail || "Failed to index codebase.");
  }
  return await response.json();
}

/**
 * Retrieves coordinate arrays configured along the Golden Spiral matrix.
 */
export async function getRepositoryNodes(repoName: string): Promise<CodeNode[]> {
  const response = await fetch(`${API_BASE_URL}/voyage/nodes?repo_name=${encodeURIComponent(repoName)}`, {
    method: "GET",
  });
  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.detail || "Failed to fetch node vectors.");
  }
  return await response.json();
}

/**
 * Commits structural progress state updates straight to SQLite.
 */
export async function toggleNodeMastery(nodeId: string): Promise<{ is_mastered: boolean }> {
  const response = await fetch(`${API_BASE_URL}/voyage/mastery?node_id=${nodeId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
  });
  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.detail || "Failed to patch progress state.");
  }
  return await response.json();
}