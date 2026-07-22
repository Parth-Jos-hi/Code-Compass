const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "/api";
const REQUEST_TIMEOUT_MS = 60000;

async function fetchWithTimeout(url: string, init: RequestInit, timeoutMs = REQUEST_TIMEOUT_MS) {
  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(url, {
      ...init,
      signal: controller.signal,
    });
  } finally {
    window.clearTimeout(timeoutId);
  }
}

async function getErrorMessage(response: Response, fallback: string) {
  try {
    const errorData = await response.json();
    return errorData.detail || errorData.message || fallback;
  } catch {
    return fallback;
  }
}

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
  // Optional compatibility alias used by some UI components
  impact_scale?: number;
  is_mastered: boolean;
  position: [number, number, number];
  avg_score?: number;
}

export interface Question {
  id: number;
  question_text: string;
  question_type: "mcq" | "free_text";
  options_json?: string;
  repo_name: string;
  node_id: number;
}

export interface AnswerEvaluation {
  score: number;
  feedback: string;
  is_correct: boolean;
  average_score: number;
  mastery_eligible: boolean;
}

export interface MasteryStatus {
  node_id: number;
  file_path: string;
  is_mastered: boolean;
  average_score: number;
  total_questions_answered: number;
  correct_answers: number;
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
 * @deprecated Use auto-mastery instead via 75% threshold on question answers
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

/**
 * Get questions for a specific repository node.
 */
export async function getQuestionsForNode(nodeId: number, repoName: string): Promise<Question[]> {
  const response = await fetch(
    `${API_BASE_URL}/voyage/questions/${nodeId}?repo_name=${encodeURIComponent(repoName)}`,
    { method: "GET" }
  );
  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.detail || "Failed to fetch questions.");
  }
  return await response.json();
}

/**
 * Submit an answer for LLM evaluation.
 */
export async function evaluateAnswer(
  questionId: number,
  userResponse: string
): Promise<AnswerEvaluation> {
  const response = await fetch(`${API_BASE_URL}/voyage/evaluate-answer`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      question_id: questionId,
      user_response: userResponse,
    }),
  });
  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.detail || "Failed to evaluate answer.");
  }
  return await response.json();
}

/**
 * Get mastery status for a node.
 */
export async function getMasteryStatus(nodeId: number, repoName: string): Promise<MasteryStatus> {
  const response = await fetch(
    `${API_BASE_URL}/voyage/mastery-status/${nodeId}?repo_name=${encodeURIComponent(repoName)}`,
    { method: "GET" }
  );
  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.detail || "Failed to fetch mastery status.");
  }
  return await response.json();
}

export interface SocraticAnswer {
  status: string;
  question: string;
  answer: string;
  source_context: string[];
}

export interface FileContextResponse {
  status: string;
  node_id: number;
  file_path: string;
  language: string;
  content: string;
}

export async function getFileContext(nodeId: number, repoName: string, repoPath?: string): Promise<FileContextResponse> {
  const query = new URLSearchParams({ repo_name: repoName });
  if (repoPath) {
    query.set('repo_path', repoPath);
  }
  const response = await fetch(
    `${API_BASE_URL}/voyage/file-content/${nodeId}?${query.toString()}`,
    { method: "GET" }
  );
  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.detail || "Failed to fetch file context.");
  }
  return await response.json();
}

export async function socraticQuery(
  question: string,
  repoName: string,
  nodeId?: string,
  codeContext?: string,
  repoPath?: string
): Promise<SocraticAnswer> {
  const payload = {
    question,
    repo_name: repoName,
    node_id: nodeId ? Number(nodeId) : undefined,
    code_context: codeContext,
    repo_path: repoPath,
  };

  const query = new URLSearchParams({
    question: payload.question,
    repo_name: payload.repo_name,
  });
  if (payload.node_id !== undefined) {
    query.set("node_id", String(payload.node_id));
  }
  if (payload.repo_path) {
    query.set("repo_path", payload.repo_path);
  }

  const init: RequestInit = { method: "GET" };

  let response: Response;
  try {
    response = await fetchWithTimeout(`${API_BASE_URL}/voyage/socratic?${query.toString()}`, init);
  } catch (error) {
    if (API_BASE_URL === "/api") {
      throw new Error("Timed out waiting for the Socratic answer. Check that the backend is running on port 8000.");
    }
    response = await fetchWithTimeout(`/api/voyage/socratic?${query.toString()}`, init);
  }

  if (!response.ok) {
    throw new Error(await getErrorMessage(response, "Failed to fetch Socratic answer."));
  }
  const data = await response.json();
  if (!data?.answer) {
    throw new Error("Socratic answer response was empty.");
  }
  return data;
}

/**
 * Generate questions for a node using LLM.
 */
export async function generateQuestionsForNode(nodeId: number, repoName: string): Promise<{ status: string; questions_generated: number }> {
  const response = await fetch(`${API_BASE_URL}/voyage/generate-questions/${nodeId}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ repo_name: repoName }),
  });
  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.detail || "Failed to generate questions.");
  }
  return await response.json();
}

export interface BrowseResponse {
  current_path: string;
  parent_path: string | null;
  drives: string[];
  directories: Array<{
    name: string;
    path: string;
    is_git: boolean;
  }>;
}

/**
 * Retrieve subdirectories and drives from the backend for selection.
 */
export async function browseDirectory(path?: string): Promise<BrowseResponse> {
  const query = path ? `?path=${encodeURIComponent(path)}` : "";
  const response = await fetch(`${API_BASE_URL}/voyage/browse${query}`, {
    method: "GET",
  });
  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.detail || "Failed to browse directory.");
  }
  return await response.json();
}
