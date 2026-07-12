"""
LLM integration for question answering and answer evaluation.
Supports both OpenAI and Groq APIs.
"""
import os
import json
import re
from typing import Optional, Dict
from openai import OpenAI
from app.core.config import settings
try:
    from groq import Groq
    HAS_GROQ = True
except ImportError:
    HAS_GROQ = False

class LLMEngine:
    """
    Handles LLM-based question generation, answer evaluation, and feedback.
    Supports OpenAI (via OPENAI_API_KEY) and Groq (via GROQ_API_KEY).
    """
    
    def __init__(self):
        """Initialize LLM client from environment variables."""
        self.client = None
        self.client_type = None
        self.groq_client = None
        self.openai_client = None
        self.groq_model = os.getenv("GROQ_MODEL", "llama-3.3-70b-versatile")
        self.openai_model = os.getenv("OPENAI_MODEL", "gpt-3.5-turbo")

        # Prefer Groq when available, since it is configured for this project.
        groq_key = (
            os.getenv("GROQ_API_KEY", "")
            or os.getenv("groq_api_key", "")
            or (settings.groq_api_key or "")
        )
        if groq_key and HAS_GROQ:
            try:
                self.groq_client = Groq(api_key=groq_key)
                self.client = self.groq_client
                self.client_type = "groq"
            except Exception as e:
                print(f"Warning: Failed to initialize Groq: {e}")

        # Fall back to OpenAI if Groq is unavailable.
        if not self.client:
            openai_key = (
                os.getenv("OPENAI_API_KEY", "")
                or os.getenv("openai_api_key", "")
                or (settings.openai_api_key or "")
            )
            if openai_key:
                try:
                    self.openai_client = OpenAI(api_key=openai_key)
                    self.client = self.openai_client
                    self.client_type = "openai"
                except Exception as e:
                    print(f"Warning: Failed to initialize OpenAI: {e}")

        if not self.client:
            print("Warning: No valid LLM API key found. LLM features will be disabled.")
    
    def evaluate_answer(
        self,
        question_text: str,
        user_response: str,
        question_type: str,
        correct_answer: Optional[str] = None,
        code_context: Optional[str] = None
    ) -> Dict[str, any]:
        """
        Evaluate a user's answer using LLM.
        
        Args:
            question_text: The question being asked
            user_response: User's answer (text or selected MCQ option)
            question_type: "mcq" or "free_text"
            correct_answer: Expected answer (for MCQ) or reference answer (for free_text)
            code_context: Optional code snippet for context
        
        Returns:
            Dict with keys:
                - score: Float 0.0-1.0 representing correctness
                - feedback: String explanation from LLM
                - is_correct: Boolean (True if score >= 0.75)
        """
        if not self.client:
            return {
                "score": 0.5,
                "feedback": "LLM service unavailable. Please configure GROQ_API_KEY or OPENAI_API_KEY.",
                "is_correct": False
            }
        
        try:
            # Build evaluation prompt
            prompt = self._build_evaluation_prompt(
                question_text, user_response, question_type, correct_answer, code_context
            )
            
            response = self._create_chat_completion(
                messages=[
                    {
                        "role": "system",
                        "content": "You are an expert code reviewer and educator. Evaluate student answers fairly but strictly. Return a JSON object with 'score' (0-1), 'feedback' (explanation), and 'is_correct' (boolean)."
                    },
                    {
                        "role": "user",
                        "content": prompt
                    }
                ],
                temperature=0.3,
                max_tokens=500
            )
            
            response_text = response.choices[0].message.content
            result = self._parse_llm_response(response_text)
            
            return result
        
        except Exception as e:
            return {
                "score": 0.0,
                "feedback": f"Error evaluating answer: {str(e)}",
                "is_correct": False
            }

    def generate_rag_answer(
        self,
        user_question: str,
        repo_name: str,
        context_chunks: list[str],
        source_paths: list[str]
    ) -> Dict[str, any]:
        # Use hosted LLM if explicitly enabled, or if not specified but we have a valid client.
        socratic_use_llm_env = os.getenv("SOCRATIC_USE_LLM", "").lower()
        if socratic_use_llm_env in {"1", "true", "yes"}:
            use_hosted_llm = True
        elif socratic_use_llm_env in {"0", "false", "no"}:
            use_hosted_llm = False
        else:
            use_hosted_llm = self.client is not None

        if context_chunks and not use_hosted_llm:
            return {
                "answer": self._generate_local_context_answer(user_question, context_chunks, source_paths),
                "source_context": source_paths[: len(context_chunks)]
            }

        if not self.client:
            if context_chunks:
                return {
                    "answer": self._generate_local_context_answer(user_question, context_chunks, source_paths),
                    "source_context": source_paths[: len(context_chunks)]
                }
            return {
                "answer": "LLM service unavailable. Please configure GROQ_API_KEY or OPENAI_API_KEY.",
                "source_context": []
            }

        context_text = "\n\n".join(
            [f"Source: {source}\n{chunk.strip()}" for source, chunk in zip(source_paths, context_chunks)]
        )

        prompt = f"""You are an expert programming tutor. Use the retrieved code snippets below to answer the user's question as accurately as possible.

Retrieved code context:
{context_text}

Question: {user_question}

Answer the question directly, citing the relevant code files when appropriate. If the answer cannot be derived from the provided code, explain that clearly and do not guess.

If the user selected a specific code file, make that the primary focus of your answer."""

        try:
            response = self._create_chat_completion(
                messages=[
                    {
                        "role": "system",
                        "content": "You are a helpful and precise programming tutor. Answer only using the provided context."
                    },
                    {
                        "role": "user",
                        "content": prompt
                    }
                ],
                temperature=0.3,
                max_tokens=500
            )
            answer = response.choices[0].message.content.strip()
            return {
                "answer": answer,
                "source_context": source_paths[: len(context_chunks)]
            }
        except Exception as e:
            if context_chunks:
                fallback = self._generate_local_context_answer(user_question, context_chunks, source_paths)
                return {
                    "answer": f"{fallback}\n\nLLM request failed: {str(e)}",
                    "source_context": source_paths[: len(context_chunks)]
                }
            return {
                "answer": f"Error generating RAG answer: {str(e)}",
                "source_context": source_paths[: len(context_chunks)]
            }

    def _summarize_context(self, source_path: str, context: str) -> dict:
        """Extract lightweight structural signals from one source file."""
        imports = []
        definitions = []
        calls = []

        for line in context.splitlines():
            stripped = line.strip()
            if re.match(r"^(import\b|from\b|require\(|const .*= require\()", stripped):
                imports.append(stripped)
            elif re.search(r"\bfrom\s+['\"][\w./\\-]+['\"]", stripped):
                imports.append(stripped)

            if re.match(r"^(export\s+)?(default\s+)?(async\s+)?function\s+\w+", stripped):
                definitions.append(stripped)
            elif re.match(r"^(export\s+)?(const|let|var)\s+\w+\s*=", stripped):
                definitions.append(stripped)
            elif re.match(r"^class\s+\w+", stripped):
                definitions.append(stripped)
            elif re.match(r"^def\s+\w+", stripped):
                definitions.append(stripped)

            for call in re.findall(r"\b([A-Za-z_][A-Za-z0-9_]*)\s*\(", stripped):
                if call not in {"if", "for", "while", "switch", "return"}:
                    calls.append(call)

        base = os.path.basename(source_path).lower()
        stem = os.path.splitext(base)[0]
        return {
            "source": source_path,
            "base": base,
            "stem": stem,
            "imports": imports[:12],
            "definitions": definitions[:12],
            "calls": sorted(set(calls))[:20],
            "line_count": len(context.splitlines()),
        }

    def _explain_line(self, line: str) -> str:
        stripped = line.strip()
        if not stripped:
            return "blank line used for spacing/readability."
        if stripped in {'"""', "'''"}:
            return "starts or ends a multi-line documentation string."
        if stripped.endswith(":") and stripped.lower() in {"args:", "returns:", "raises:", "examples:"}:
            return "documentation section label."
        if stripped.startswith(("#", "//")):
            return "comment/documentation for the reader."
        if re.match(r"^(import\b|from\b)", stripped):
            return "brings in an external module, package, or symbol used later."
        if re.match(r"^class\s+\w+", stripped):
            return "declares a class and starts grouping related behavior/state."
        if re.match(r"^def\s+\w+", stripped) or re.match(r"^(export\s+)?(default\s+)?(async\s+)?function\s+\w+", stripped):
            return "declares a function that can be called by this file or other files."
        if re.match(r"^(if|elif|else|for|while|try|except|finally)\b", stripped):
            return "controls execution flow: branching, looping, or error handling."
        if re.match(r"^return\b", stripped):
            return "returns the computed value/output from the current function."
        if "=" in stripped and "==" not in stripped:
            return "assigns or updates a value used by later code."
        if re.search(r"\w+\(", stripped):
            return "calls a function/helper, likely causing work or transforming data."
        if re.match(r"^[A-Za-z_][A-Za-z0-9_ ]+[:.]?$", stripped):
            return "plain documentation text explaining the nearby code."
        return "part of the file's implementation logic."

    def _extract_line_range(self, user_question: str, total_lines: int) -> tuple[int, int] | None:
        range_match = re.search(r"lines?\s+(\d+)\s*(?:-|to|through)\s*(\d+)", user_question, flags=re.IGNORECASE)
        if range_match:
            start = max(1, int(range_match.group(1)))
            end = min(total_lines, int(range_match.group(2)))
            if start <= end:
                return start, end

        single_match = re.search(r"line\s+(\d+)", user_question, flags=re.IGNORECASE)
        if single_match:
            line_number = max(1, min(total_lines, int(single_match.group(1))))
            return line_number, line_number

        return None

    def _generate_line_by_line_answer(self, source_path: str, context: str, user_question: str, max_lines: int = 80) -> str:
        lines = context.splitlines()
        requested_range = self._extract_line_range(user_question, len(lines))
        if requested_range:
            start, end = requested_range
            explainable_lines = [
                (index, line)
                for index, line in enumerate(lines, start=1)
                if start <= index <= end and line.strip()
            ]
            range_label = f"lines {start}-{end}"
        else:
            explainable_lines = [(index, line) for index, line in enumerate(lines, start=1) if line.strip()]
            range_label = "the first part of the file"

        shown_lines = explainable_lines[:max_lines]
        answer_lines = [
            f"Line-by-line explanation for `{source_path}` ({range_label}):",
        ]

        for line_number, line in shown_lines:
            stripped = line.strip()
            answer_lines.append(f"- Line {line_number}: `{stripped[:140]}` - {self._explain_line(stripped)}")

        if len(explainable_lines) > max_lines:
            answer_lines.append(
                f"\nI explained the first {max_lines} non-empty lines out of {len(explainable_lines)}. Ask for a smaller range, like `explain lines 80 to 140`, for a deeper pass."
            )

        return "\n".join(answer_lines)

    def _generate_repo_overview_answer(self, user_question: str, repo_context: str) -> str:
        lines = repo_context.splitlines()
        repo_name = "repository"
        total_files = "unknown"
        folders = []
        files = []
        current_section = None

        for line in lines:
            if line.startswith("Repository:"):
                repo_name = line.split(":", 1)[1].strip()
            elif line.startswith("Total indexed files:"):
                total_files = line.split(":", 1)[1].strip()
            elif line == "Folders:":
                current_section = "folders"
            elif line == "Files:":
                current_section = "files"
            elif line.startswith("- ") and current_section == "folders":
                folders.append(line[2:])
            elif line.startswith("- ") and current_section == "files":
                files.append(line[2:])

        answer_parts = [
            f"Repository overview for `{repo_name}`:",
            f"- Indexed files: {total_files}",
        ]

        if folders:
            answer_parts.append("Folders:\n" + "\n".join(f"- {folder}" for folder in folders[:12]))

        if files:
            file_lines = []
            for item in files[:30]:
                path_part, *rest = item.split(" | ")
                metadata = " | ".join(rest)
                file_lines.append(f"- `{path_part}`: {metadata}")
            answer_parts.append("Files and their indexed relationships:\n" + "\n".join(file_lines))

        if len(files) > 30:
            answer_parts.append(f"I showed 30 files out of {len(files)}. Ask about a folder or filename to zoom in.")

        answer_parts.append(
            "How to read this project: start with entry/config files, then follow imports to core modules, then inspect UI/API files that call those core modules."
        )
        return "\n\n".join(answer_parts)

    def _generate_local_context_answer(
        self,
        user_question: str,
        context_chunks: list[str],
        source_paths: list[str]
    ) -> str:
        """Create a useful local answer when hosted LLM access is unavailable."""
        primary_source = source_paths[0] if source_paths else "the selected file"
        primary_context = context_chunks[0] if context_chunks else ""
        lines = primary_context.splitlines()
        non_empty_lines = [line for line in lines if line.strip()]
        imports = []
        definitions = []
        risk_findings = []

        for line_number, line in enumerate(lines, start=1):
            stripped = line.strip()
            if re.match(r"^(import\b|from\b|require\(|const .*= require\()", stripped):
                imports.append(stripped)
            if re.match(r"^(export\s+)?(default\s+)?(async\s+)?function\s+\w+", stripped):
                definitions.append(stripped)
            elif re.match(r"^(export\s+)?(const|let|var)\s+\w+\s*=", stripped):
                definitions.append(stripped)
            elif re.match(r"^class\s+\w+", stripped):
                definitions.append(stripped)
            elif re.match(r"^def\s+\w+", stripped):
                definitions.append(stripped)

            risk_patterns = [
                ("bare exception handler", r"^except\s*:"),
                ("silent broad exception", r"except\s+Exception\s*:\s*$"),
                ("ignored exception", r"pass\s*(#.*)?$"),
                ("dynamic execution", r"\b(eval|exec)\s*\("),
                ("raw HTML injection", r"dangerouslySetInnerHTML|innerHTML\s*="),
                ("unchecked any type", r":\s*any\b|as\s+any\b"),
                ("debug logging", r"\bconsole\.log\s*\("),
                ("todo marker", r"\b(TODO|FIXME|HACK)\b"),
            ]
            for label, pattern in risk_patterns:
                if stripped.startswith(("(\"", "('")):
                    continue
                if re.search(pattern, stripped):
                    risk_findings.append((line_number, label, stripped))
                    break

        preview = "\n".join(non_empty_lines[:12])
        lower_question = user_question.lower()
        wants_line_by_line = any(term in lower_question for term in [
            "line by line", "line-by-line", "each line", "every line", "line wise", "linewise"
        ])
        wants_repo_overview = (
            primary_source.startswith("repository:")
            or any(term in lower_question for term in [
                "all files", "all the files", "entire repo", "whole repo", "full repo",
                "this repo", "repository", "project structure", "folder structure",
                "all folders", "explain the project", "understand the project"
            ])
        )
        wants_explain = any(term in lower_question for term in ["step", "explain", "walk", "overview"])
        wants_errors = any(term in lower_question for term in ["error", "bug", "issue", "wrong", "risk", "problem"])
        wants_purpose = any(term in lower_question for term in ["purpose", "what is this", "what does", "main use"])
        wants_function = any(term in lower_question for term in ["important function", "main function", "function"])
        wants_flow = any(term in lower_question for term in ["data flow", "flow", "input", "output"])
        wants_connections = any(term in lower_question for term in [
            "connect", "connected", "connection", "related", "relation", "depend",
            "dependency", "import", "interconnected", "interlinked", "architecture",
            "project structure", "folder", "folders", "how other files"
        ])

        answer_parts = []

        if wants_repo_overview:
            return self._generate_repo_overview_answer(user_question, primary_context)
        elif wants_line_by_line:
            return self._generate_line_by_line_answer(primary_source, primary_context, user_question)
        elif wants_connections:
            summaries = [
                self._summarize_context(path, chunk)
                for path, chunk in zip(source_paths, context_chunks)
            ]
            primary = summaries[0] if summaries else self._summarize_context(primary_source, primary_context)
            related = summaries[1:]
            relationship_lines = []

            for other in related:
                primary_mentions_other = any(
                    other["stem"] in item.lower() or other["base"] in item.lower()
                    for item in primary["imports"] + primary["calls"]
                )
                other_mentions_primary = any(
                    primary["stem"] in item.lower() or primary["base"] in item.lower()
                    for item in other["imports"] + other["calls"]
                )

                if primary_mentions_other and other_mentions_primary:
                    direction = "They appear to reference each other."
                elif primary_mentions_other:
                    direction = f"`{primary['source']}` appears to depend on `{other['source']}`."
                elif other_mentions_primary:
                    direction = f"`{other['source']}` appears to depend on `{primary['source']}`."
                else:
                    direction = "I did not find a direct import/call link in the local snippets, so the relationship may be indirect or architectural."

                relationship_lines.append(f"- `{primary['source']}` <-> `{other['source']}`: {direction}")

            if related:
                answer_parts.append(
                    "Connection map from the indexed files:\n" + "\n".join(relationship_lines)
                )
            else:
                answer_parts.append(
                    f"I only have `{primary['source']}` in context for this question. Ask with another filename, for example `how is llm_engine.py connected to vector_engine.py`, or re-index the repository so import metadata is available."
                )

            answer_parts.append(
                f"`{primary['source']}` defines:\n"
                + ("\n".join(f"- `{item}`" for item in primary["definitions"][:6]) or "- No obvious top-level declarations found.")
            )
            for other in related[:4]:
                answer_parts.append(
                    f"`{other['source']}` defines:\n"
                    + ("\n".join(f"- `{item}`" for item in other["definitions"][:6]) or "- No obvious top-level declarations found.")
                )
        elif wants_errors:
            if risk_findings:
                answer_parts.append(
                    "I do not see a guaranteed syntax error from the local scan, but I found these places worth checking:\n"
                    + "\n".join(
                        f"- Line {line_number}: {label}: `{snippet[:160]}`"
                        for line_number, label, snippet in risk_findings[:8]
                    )
                )
            else:
                answer_parts.append(
                    "I do not see an obvious syntax/runtime error pattern in the selected context. The next things to verify are imports, prop shapes, API response fields, and whether this file receives the data it expects."
                )
        elif wants_purpose:
            exported = definitions[0] if definitions else "the top-level code"
            answer_parts.append(
                f"The main purpose of `{primary_source}` appears to be centered around `{exported}`. "
                "It pulls in its dependencies, defines the primary module behavior, and exposes that behavior to the rest of the app."
            )
        elif wants_function:
            if definitions:
                answer_parts.append(
                    "The most important declarations I found are:\n"
                    + "\n".join(f"- `{item}`" for item in definitions[:8])
                )
            else:
                answer_parts.append("I did not find obvious function/class declarations in this context, so this file may be mostly configuration, data, or top-level script code.")
        elif wants_flow:
            answer_parts.append(
                "Data-flow reading guide:\n"
                "1. Start where values enter the file: props, request payloads, query params, imports, or state.\n"
                "2. Follow assignments and helper calls that transform those values.\n"
                "3. Watch for side effects such as API calls, database writes, file reads, DOM updates, or state setters.\n"
                "4. End at the return/render/response block to see what leaves the module."
            )
        elif wants_explain:
            answer_parts.append(
                "Step-by-step reading guide:\n"
                "1. Start with the imports to understand what outside APIs this file depends on.\n"
                "2. Read the main declarations to identify the exported component, class, route, or helper.\n"
                "3. Follow local state, parameters, or request values through the helper calls.\n"
                "4. Check side effects such as network calls, file reads, database access, or UI state updates.\n"
                "5. Finish at the return value, rendered output, or API response."
            )
        else:
            answer_parts.append(
                "I matched your question against the selected file and pulled the most relevant local context below."
            )

        if imports and not wants_connections:
            answer_parts.append("Dependencies/imports:\n" + "\n".join(f"- `{item}`" for item in imports[:8]))

        if definitions and not wants_connections:
            answer_parts.append("Main declarations:\n" + "\n".join(f"- `{item}`" for item in definitions[:10]))

        answer_parts.append(
            "Context used: "
            + ", ".join(f"`{path}`" for path in source_paths[: len(context_chunks)])
            + f" ({len(context_chunks)} file context{'s' if len(context_chunks) != 1 else ''})."
        )

        if not wants_explain and not wants_errors and not wants_purpose and not wants_function and not wants_flow and not wants_connections:
            answer_parts.append("Relevant opening context:\n```text\n" + preview[:1200] + "\n```")

        answer_parts.append("For deeper natural-language reasoning, set `GROQ_API_KEY` or `OPENAI_API_KEY` in `backend/.env` and restart the backend.")
        return "\n\n".join(answer_parts)

    def generate_questions(
        self,
        code_content: str,
        file_path: str,
        num_questions: int = 5,
        avoid_questions: list[str] = None
    ) -> Dict[str, any]:
        """
        Generate questions about given code using LLM.
        
        Args:
            code_content: The code to generate questions about
            file_path: File path for context
            num_questions: Number of questions to generate
            avoid_questions: Optional list of question texts to avoid generating again
        
        Returns:
            Dict with list of questions
        """
        if not self.client:
            return {"questions": []}
        
        try:
            avoid_clause = ""
            if avoid_questions:
                avoid_clause = f"\nDo NOT generate any questions that are similar to or duplicate the following existing questions:\n" + "\n".join(f"- {q}" for q in avoid_questions)

            prompt = f"""Analyze this code file ({file_path}) and generate exactly {num_questions} questions to test understanding.
You MUST generate them in the following exact sequence of difficulties:
1. Question 1: Easy difficulty
2. Question 2: Medium difficulty
3. Question 3: Medium difficulty
4. Question 4: Medium-Hard difficulty
5. Question 5: Hard difficulty

Generate a mix of question types: some MCQ (multiple choice) and some free-text. {avoid_clause}

For MCQ questions, include 4 options. For free-text questions, provide what a good answer should cover in correct_answer.

Return ONLY a JSON array of question objects with this structure:
[
    {{"question_text": "...", "question_type": "mcq", "options": ["A", "B", "C", "D"], "correct_answer": "A"}},
    {{"question_text": "...", "question_type": "free_text", "correct_answer": "Should explain..."}}
]

Code to analyze:
```
{code_content[:2000]}  # Limit to first 2000 chars
```"""

            # Select model based on client type
            model = "mixtral-8x7b-32768" if self.client_type == "groq" else "gpt-3.5-turbo"
            
            response = self._create_chat_completion(
                messages=[
                    {
                        "role": "system",
                        "content": "You are an expert programming educator. Generate clear, fair questions that test code understanding."
                    },
                    {
                        "role": "user",
                        "content": prompt
                    }
                ],
                temperature=0.7,
                max_tokens=1000
            )
            
            response_text = response.choices[0].message.content
            questions = self._parse_questions_response(response_text)
            
            return {"questions": questions}
        
        except Exception as e:
            return {"questions": [], "error": str(e)}
    
    def _build_evaluation_prompt(
        self,
        question_text: str,
        user_response: str,
        question_type: str,
        correct_answer: Optional[str],
        code_context: Optional[str]
    ) -> str:
        """Build the evaluation prompt for LLM."""
        context_str = f"\nCode context:\n```\n{code_context}\n```" if code_context else ""
        
        if question_type == "mcq":
            return f"""Evaluate this MCQ answer:

Question: {question_text}
Correct answer: {correct_answer}
User's answer: {user_response}{context_str}

Respond with JSON: {{"score": <0.0-1.0>, "feedback": "<explanation>", "is_correct": <boolean>}}"""
        else:
            return f"""Evaluate this free-text answer:

Question: {question_text}
Expected answer should cover: {correct_answer}
User's answer: {user_response}{context_str}

Assess accuracy and completeness. Respond with JSON: {{"score": <0.0-1.0>, "feedback": "<detailed explanation>", "is_correct": <boolean>}}"""
    
    def _parse_llm_response(self, response_text: str) -> Dict[str, any]:
        """Parse LLM JSON response."""
        try:
            # Try to extract JSON from response
            start_idx = response_text.find('{')
            end_idx = response_text.rfind('}') + 1
            if start_idx != -1 and end_idx > start_idx:
                json_str = response_text[start_idx:end_idx]
                parsed = json.loads(json_str)
                
                # Validate and normalize
                score = float(parsed.get("score", 0.5))
                score = max(0.0, min(1.0, score))  # Clamp to 0-1
                
                return {
                    "score": score,
                    "feedback": parsed.get("feedback", "No feedback provided"),
                    "is_correct": score >= 0.75
                }
        except Exception as e:
            pass
        
        # Fallback if parsing fails
        return {
            "score": 0.5,
            "feedback": f"Could not parse LLM response: {response_text[:100]}",
            "is_correct": False
        }
    
    def _select_model(self, model: str | None = None) -> str:
        """Choose the most appropriate model name based on client type and configuration."""
        if model:
            return model
        if self.client_type == "groq":
            return self.groq_model
        return self.openai_model

    def _create_chat_completion(
        self,
        messages: list[dict],
        temperature: float = 0.3,
        max_tokens: int = 500,
        model: str | None = None
    ):
        """Send a chat completion request to the configured LLM, with fallback support."""
        if not self.client:
            raise RuntimeError("LLM service unavailable. Please configure GROQ_API_KEY or OPENAI_API_KEY.")

        selected_model = self._select_model(model)
        try:
            return self.client.chat.completions.create(
                model=selected_model,
                messages=messages,
                temperature=temperature,
                max_tokens=max_tokens
            )
        except Exception as first_error:
            if self.client_type == "groq" and self.openai_client:
                try:
                    return self.openai_client.chat.completions.create(
                        model=self.openai_model,
                        messages=messages,
                        temperature=temperature,
                        max_tokens=max_tokens
                    )
                except Exception:
                    pass
            raise first_error

    def _parse_questions_response(self, response_text: str) -> list:
        """Parse LLM questions response."""
        try:
            start_idx = response_text.find('[')
            end_idx = response_text.rfind(']') + 1
            if start_idx != -1 and end_idx > start_idx:
                json_str = response_text[start_idx:end_idx]
                return json.loads(json_str)
        except Exception as e:
            pass
        
        return []


# Global instance
_llm_engine = None

def get_llm_engine() -> LLMEngine:
    """Get or create LLM engine singleton."""
    global _llm_engine
    if _llm_engine is None:
        _llm_engine = LLMEngine()
    return _llm_engine
