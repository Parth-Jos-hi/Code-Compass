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
        """Generate an answer using retrieval-augmented generation."""
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

        for line in lines:
            stripped = line.strip()
            if re.match(r"^(import|from|require\(|const .*= require\()", stripped):
                imports.append(stripped)
            if re.match(r"^(export\s+)?(default\s+)?(async\s+)?function\s+\w+", stripped):
                definitions.append(stripped)
            elif re.match(r"^(export\s+)?(const|let|var)\s+\w+\s*=", stripped):
                definitions.append(stripped)
            elif re.match(r"^class\s+\w+", stripped):
                definitions.append(stripped)
            elif re.match(r"^def\s+\w+", stripped):
                definitions.append(stripped)

        preview = "\n".join(non_empty_lines[:12])
        answer_parts = [
            f"I found local context for `{primary_source}` and can give a grounded walkthrough without an external LLM key.",
            f"The file has about {len(lines)} lines, with {len(non_empty_lines)} non-empty lines.",
        ]

        if imports:
            answer_parts.append("Key dependencies/imports I can see:\n" + "\n".join(f"- `{item}`" for item in imports[:8]))

        if definitions:
            answer_parts.append("Main declarations I can see:\n" + "\n".join(f"- `{item}`" for item in definitions[:10]))

        lower_question = user_question.lower()
        if "step" in lower_question or "explain" in lower_question or "walk" in lower_question:
            answer_parts.append(
                "Step-by-step reading guide:\n"
                "1. Start with the imports/dependencies to understand what external APIs or components this file uses.\n"
                "2. Read the top-level declarations to identify the main exported function, component, class, or route handler.\n"
                "3. Follow state, parameters, or request payload values from where they enter the file to where they are transformed.\n"
                "4. Check side effects such as database calls, network calls, file reads, or UI state updates.\n"
                "5. Finish at the return value or rendered output to see what the module exposes to the rest of the app."
            )
        elif "bug" in lower_question or "risk" in lower_question:
            answer_parts.append(
                "Risk review guide: inspect error handling, empty-state handling, unchecked assumptions, external calls, and places where user input reaches files, databases, or network requests."
            )
        else:
            answer_parts.append("Relevant opening context:\n```text\n" + preview[:1200] + "\n```")

        answer_parts.append("For deeper natural-language reasoning, set `GROQ_API_KEY` or `OPENAI_API_KEY` in `backend/.env` and restart the backend.")
        return "\n\n".join(answer_parts)

    def generate_questions(
        self,
        code_content: str,
        file_path: str,
        num_questions: int = 3
    ) -> Dict[str, any]:
        """
        Generate questions about given code using LLM.
        
        Args:
            code_content: The code to generate questions about
            file_path: File path for context
            num_questions: Number of questions to generate
        
        Returns:
            Dict with list of questions
        """
        if not self.client:
            return {"questions": []}
        
        try:
            prompt = f"""Analyze this code file ({file_path}) and generate {num_questions} questions to test understanding.
Generate a mix of question types: some MCQ (multiple choice) and some free-text.

For MCQ questions, include 4 options. For free-text questions, provide what a good answer should cover.

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
                    "is_correct": parsed.get("is_correct", score >= 0.75)
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
