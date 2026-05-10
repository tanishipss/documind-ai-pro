"""
AI Features — RAG-grounded quiz, flashcards, summary, chat, hybrid search.
Quiz generates from BOTH matched sections AND updated sections when 2 docs uploaded.
Supports 10–15 questions per quiz.
"""

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from typing import List, Optional
import httpx, json, re, math

from auth import get_current_user
from documents import get_session_docs
from rag_pipeline import get_store, semantic_compare_rag

router = APIRouter()

OLLAMA_BASE   = "http://localhost:11434"
DEFAULT_MODEL = "llama3:8b"

# ── Ollama helpers ────────────────────────────────────────────────────────────

async def ollama_generate(prompt: str, model: str = DEFAULT_MODEL, system: str = "") -> str:
    payload = {
        "model": model,
        "prompt": prompt,
        "stream": False,
        "options": {"temperature": 0.3, "num_predict": 2000},
    }
    if system:
        payload["system"] = system
    async with httpx.AsyncClient(timeout=600.0) as c:
        r = await c.post(f"{OLLAMA_BASE}/api/generate", json=payload)
        r.raise_for_status()
        return r.json().get("response", "")

async def ollama_stream(prompt: str, model: str = DEFAULT_MODEL, system: str = ""):
    payload = {
        "model": model,
        "prompt": prompt,
        "stream": True,
        "options": {"temperature": 0.7, "num_predict": 2000},
    }
    if system:
        payload["system"] = system
    async with httpx.AsyncClient(timeout=180.0) as c:
        async with c.stream("POST", f"{OLLAMA_BASE}/api/generate", json=payload) as resp:
            async for line in resp.aiter_lines():
                if line.strip():
                    try:
                        d = json.loads(line)
                        t = d.get("response", "")
                        if t:
                            yield t
                        if d.get("done"):
                            break
                    except Exception:
                        pass

# ── RAG helpers ───────────────────────────────────────────────────────────────

def _chunks_for(email: str, seeds: list, per_seed: int = 3, extra: int = 4) -> list:
    store = get_store(email)
    seen, out = set(), []
    for s in seeds:
        for c in store.retrieve(s, n_results=per_seed):
            if c["text"] not in seen:
                seen.add(c["text"])
                out.append(c)
    for c in store.retrieve("key concepts main ideas important topics", n_results=extra):
        if c["text"] not in seen:
            seen.add(c["text"])
            out.append(c)
    return out

def full_context(email: str, max_chars: int = 8000) -> str:
    docs = get_session_docs(email)
    if not docs:
        return ""
    return "\n\n".join(
        f"[Document: {d['filename']}]\n{d['text']}" for d in docs
    )[:max_chars]


def _extract_top_level_objects(text: str) -> list:
    """Walk the string and return every top-level {...} blob."""
    objects, depth, start = [], 0, None
    for i, ch in enumerate(text):
        if ch == "{":
            if depth == 0:
                start = i
            depth += 1
        elif ch == "}":
            depth -= 1
            if depth == 0 and start is not None:
                objects.append(text[start : i + 1])
                start = None
    return objects


def _clean_json(text: str) -> str:
    """Remove trailing commas that make json.loads fail."""
    return re.sub(r",\s*([}\]])", r"\1", text)


def _repair_questions(blobs: list) -> dict | None:
    """
    Handle the broken pattern llama3:8b emits:

        {"questions":[{...no-correct...}], "correct": "A) ..."},
        {"questions":[{...no-correct...}], "correct": "D) ..."},
        ...

    Each blob is a separate {"questions":[single_q], "correct":"..."} object.
    Merge them into one {"questions": [...]} dict with correct moved inside
    each question object.
    """
    merged = []
    for blob in blobs:
        try:
            obj = json.loads(_clean_json(blob))
        except (json.JSONDecodeError, ValueError):
            continue

        # Pattern A: {"questions":[...], "correct": "..."}  (correct outside)
        if "questions" in obj and "correct" in obj:
            for q in obj["questions"]:
                if "correct" not in q:
                    q["correct"] = obj["correct"]
                merged.append(q)

        # Pattern B: normal {"questions": [...]}
        elif "questions" in obj:
            merged.extend(obj["questions"])

        # Pattern C: bare question object (no wrapper)
        elif "question" in obj:
            merged.append(obj)

    if merged:
        # Re-index ids
        for i, q in enumerate(merged, 1):
            q["id"] = i
        return {"questions": merged}
    return None


def parse_quiz_json(raw: str) -> dict:
    """
    Robustly extract a valid quiz dict from LLM output.

    Handles:
    - Markdown fences
    - Preamble / postamble text
    - Trailing commas
    - llama3:8b broken pattern: one {"questions":[q], "correct":...} per question
    - Single well-formed {"questions":[...]} object
    """
    # 1. Strip markdown fences and surrounding whitespace
    raw = re.sub(r"```(?:json)?", "", raw).strip()

    # 2. Collect all top-level JSON objects
    blobs = _extract_top_level_objects(raw)
    if not blobs:
        raise ValueError(f"No JSON objects found in LLM output. Raw (first 400 chars): {raw[:400]}")

    # 3. If there's exactly one blob, try it directly first
    if len(blobs) == 1:
        try:
            parsed = json.loads(_clean_json(blobs[0]))
            if "questions" in parsed and isinstance(parsed["questions"], list):
                # Move "correct" inside each question if it leaked out
                if "correct" in parsed:
                    for q in parsed["questions"]:
                        if "correct" not in q:
                            q["correct"] = parsed["correct"]
                return parsed
        except (json.JSONDecodeError, ValueError):
            pass

    # 4. Multiple blobs — try repair path (handles per-question-object pattern)
    repaired = _repair_questions(blobs)
    if repaired:
        return repaired

    # 5. Maybe one of the blobs is the full well-formed object
    for blob in blobs:
        try:
            parsed = json.loads(_clean_json(blob))
            if "questions" in parsed:
                return parsed
        except (json.JSONDecodeError, ValueError):
            continue

    # 6. Last resort: clean the entire raw string and parse
    try:
        return json.loads(_clean_json(raw))
    except (json.JSONDecodeError, ValueError):
        pass

    raise ValueError(
        f"Could not parse quiz JSON. Raw (first 500 chars): {raw[:500]}"
    )


def _coerce_doc_index(val) -> int:
    """ChromaDB sometimes stores metadata values as strings; normalise to int."""
    try:
        return int(val)
    except (TypeError, ValueError):
        return -1

# ── Quiz ─────────────────────────────────────────────────────────────────────

class QuizRequest(BaseModel):
    difficulty:    str = "medium"
    num_questions: int = 10   # 10–15

DIFFICULTY_DESC = {
    "easy":   "straightforward recall and definition questions on basic facts.",
    "medium": "application and understanding questions requiring analysis.",
    "hard":   "complex synthesis, critical thinking, and evaluation questions.",
}
TOPIC_SEEDS = {
    "easy":   ["definition", "what is", "basic concept", "introduction", "overview"],
    "medium": ["how does", "explain", "compare", "why", "process", "mechanism"],
    "hard":   ["analyze", "evaluate", "implications", "limitations", "critique", "relationship"],
}

QUIZ_PROMPT_TEMPLATE = """You are an expert quiz generator. Using ONLY the document content provided, create exactly {n} multiple-choice questions.

Difficulty: {diff} — {desc}

{context_label}:
{context}

STRICT OUTPUT RULES — violations will break the application:
1. Output ONE single JSON object that starts with {{ and ends with }}
2. Do NOT output multiple JSON objects — all questions go inside the single "questions" array
3. "correct" MUST be INSIDE each question object, NOT outside it
4. No markdown fences (no ```json), no preamble text, no trailing text
5. Every field shown below is required for every question

Required JSON structure (output exactly this shape):
{{
  "questions": [
    {{
      "id": 1,
      "question": "Question text here?",
      "options": ["A) option one", "B) option two", "C) option three", "D) option four"],
      "correct": "A) option one",
      "explanation": "Explanation referencing the document content.",
      "topic": "Specific topic being tested",
      "source_hint": "Which section/part of the document this tests",
      "section_type": "standard"
    }},
    {{
      "id": 2,
      "question": "Second question here?",
      "options": ["A) ...", "B) ...", "C) ...", "D) ..."],
      "correct": "B) ...",
      "explanation": "...",
      "topic": "...",
      "source_hint": "...",
      "section_type": "standard"
    }}
  ]
}}"""


@router.post("/quiz/generate")
async def generate_quiz(req: QuizRequest, current_user: dict = Depends(get_current_user)):
    email = current_user["email"]
    docs  = get_session_docs(email)
    if not docs:
        raise HTTPException(400, "No documents uploaded. Please upload first.")

    n    = max(10, min(15, req.num_questions))
    diff = req.difficulty.lower()

    if len(docs) == 2:
        return await _generate_dual_doc_quiz(email, docs, diff, n)
    else:
        return await _generate_single_doc_quiz(email, diff, n)


async def _generate_single_doc_quiz(email: str, diff: str, n: int) -> dict:
    import traceback

    # Always use full document text — RAG chunks alone are often too sparse
    context = full_context(email, 3000)
    chunks  = _chunks_for(email, TOPIC_SEEDS.get(diff, TOPIC_SEEDS["medium"]))
    rag_ctx = "\n\n---\n\n".join(c["text"] for c in chunks[:12])
    # Prefer RAG context if it's substantial, else fall back to full text
    if len(rag_ctx.strip()) > len(context.strip()):
        context = rag_ctx

    if not context.strip():
        raise HTTPException(400, "Document has no extractable text. Please re-upload.")

    print(f"[quiz] context length: {len(context)} chars, chunks: {len(chunks)}")

    prompt = QUIZ_PROMPT_TEMPLATE.format(
        n=n, diff=diff.upper(), desc=DIFFICULTY_DESC.get(diff, ""),
        context_label="Document Content", context=context,
    )

    raw = ""
    try:
        raw = await ollama_generate(prompt)
        print(f"[quiz] raw response length: {len(raw)}, preview: {raw[:200]!r}")

        if not raw or not raw.strip():
            raise HTTPException(503,
                "Ollama returned an empty response. "
                "Ensure the model is loaded: ollama pull llama3:8b")

        data = parse_quiz_json(raw)

        if not data.get("questions"):
            raise HTTPException(500,
                f"AI returned JSON with no questions. Raw: {raw[:400]}")

        for q in data["questions"]:
            q["section_type"] = "standard"

        data["rag_info"] = {
            "chunks_used": len(chunks),
            "retrieval":   "ChromaDB + TF-IDF",
            "mode":        "single-doc",
        }
        return data

    except HTTPException:
        raise
    except (json.JSONDecodeError, ValueError) as e:
        raise HTTPException(500, f"AI returned malformed JSON: {e} | Raw: {raw[:300]!r}")
    except httpx.ConnectError:
        raise HTTPException(503, "Ollama is not running. Start with: ollama serve")
    except (httpx.ReadTimeout, httpx.TimeoutException):
        raise HTTPException(504, "Ollama timed out generating the quiz. Try a shorter document or run: ollama run llama3:8b to pre-load the model.")
    except Exception as e:
        tb = traceback.format_exc()
        print(f"[quiz] UNEXPECTED ERROR:\n{tb}")
        raise HTTPException(500, f"Quiz generation failed: {type(e).__name__}: {e}")


async def _generate_dual_doc_quiz(email: str, docs: list, diff: str, n: int) -> dict:
    """
    For 2 docs: generate questions from BOTH matched sections AND updated sections.
    Split n questions: ceil(n/2) from matched, floor(n/2) from updated/added.
    """
    n_matched = math.ceil(n / 2)
    n_updated = n - n_matched

    store = get_store(email)

    # ── Matched sections: retrieve chunks from both docs ──────────────────────
    matched_seeds = TOPIC_SEEDS.get(diff, TOPIC_SEEDS["medium"])
    all_chunks    = store.retrieve(
        " ".join(matched_seeds[:3]) + " shared concepts overview", n_results=20
    )

    # FIX: coerce doc_index to int before comparing (ChromaDB stores as string)
    doc0_chunks = [c for c in all_chunks if _coerce_doc_index(c["metadata"].get("doc_index")) == 0]
    doc1_chunks = [c for c in all_chunks if _coerce_doc_index(c["metadata"].get("doc_index")) == 1]

    matched_context_parts = []
    for i in range(max(len(doc0_chunks), len(doc1_chunks))):
        if i < len(doc0_chunks):
            matched_context_parts.append(doc0_chunks[i]["text"])
        if i < len(doc1_chunks):
            matched_context_parts.append(doc1_chunks[i]["text"])

    matched_context = "\n\n---\n\n".join(matched_context_parts[:10])

    # ── Updated/added sections: chunks unique to doc 2 ────────────────────────
    updated_chunks = store.retrieve(
        "new updated added changed revised section", n_results=14
    )
    doc2_only = [
        c for c in updated_chunks
        if _coerce_doc_index(c["metadata"].get("doc_index")) == 1
    ]
    if not doc2_only:
        doc2_only = updated_chunks  # fallback: use all

    updated_context = "\n\n---\n\n".join(c["text"] for c in doc2_only[:8])

    # Fallback to full context if retrieval produced nothing useful
    if not matched_context.strip():
        matched_context = full_context(email, 4000)
    if not updated_context.strip():
        updated_context = full_context(email, 4000)

    update_desc = {
        "easy":   "basic recall about the new or changed content.",
        "medium": "understanding of what changed and its significance.",
        "hard":   "critical analysis of the implications of the changes.",
    }

    matched_prompt = QUIZ_PROMPT_TEMPLATE.format(
        n=n_matched, diff=diff.upper(), desc=DIFFICULTY_DESC.get(diff, ""),
        context_label="Shared/Matched Content (present in both document versions)",
        context=matched_context,
    )
    updated_prompt = QUIZ_PROMPT_TEMPLATE.format(
        n=n_updated, diff=diff.upper(), desc=update_desc.get(diff, ""),
        context_label="Updated/Added Content (new or changed sections in the newer document)",
        context=updated_context,
    )

    try:
        raw_matched  = await ollama_generate(matched_prompt)
        raw_updated  = await ollama_generate(updated_prompt)

        matched_data = parse_quiz_json(raw_matched)
        updated_data = parse_quiz_json(raw_updated)

        matched_qs = matched_data.get("questions", [])
        updated_qs = updated_data.get("questions", [])

        for q in matched_qs:
            q["section_type"] = "matched"
        for q in updated_qs:
            q["section_type"] = "updated"

        all_questions = matched_qs + updated_qs
        for i, q in enumerate(all_questions, 1):
            q["id"] = i

        return {
            "questions": all_questions,
            "rag_info": {
                "mode":          "dual-doc (matched + updated)",
                "matched_count": len(matched_qs),
                "updated_count": len(updated_qs),
                "total":         len(all_questions),
                "retrieval":     "ChromaDB + TF-IDF",
            },
            "regeneration_note": (
                f"{len(matched_qs)} questions from matched sections, "
                f"{len(updated_qs)} from updated/added sections"
            ),
        }

    except (json.JSONDecodeError, ValueError) as e:
        raise HTTPException(500, f"AI returned malformed JSON: {e}")
    except httpx.ConnectError:
        raise HTTPException(503, "Ollama is not running. Start with: ollama serve")
    except Exception as e:
        raise HTTPException(500, f"Dual-doc quiz generation failed: {e}")


# ── Version-aware regeneration (only updated sections) ───────────────────────

class RegenRequest(BaseModel):
    difficulty:    str = "medium"
    num_questions: int = 10

@router.post("/quiz/regenerate-for-changes")
async def regenerate_for_changes(req: RegenRequest, current_user: dict = Depends(get_current_user)):
    """Generate questions ONLY from added/modified sections (doc 2 only)."""
    email = current_user["email"]
    docs  = get_session_docs(email)
    if not docs:
        raise HTTPException(400, "No documents uploaded")
    if len(docs) < 2:
        raise HTTPException(400, "Requires 2 documents (old + new version)")

    n     = max(10, min(15, req.num_questions))
    store = get_store(email)
    changed = store.retrieve(
        "new content added updated sections changes revised", n_results=14
    )
    doc2 = [
        c for c in changed
        if _coerce_doc_index(c["metadata"].get("doc_index")) == 1
    ] or changed
    context = "\n\n---\n\n".join(c["text"] for c in doc2[:10])

    update_desc = {
        "easy":   "basic recall about the new or changed content.",
        "medium": "understanding of what changed and its significance.",
        "hard":   "critical analysis of the implications of the changes.",
    }
    prompt = QUIZ_PROMPT_TEMPLATE.format(
        n=n, diff=req.difficulty.upper(), desc=update_desc.get(req.difficulty, ""),
        context_label="Updated/Added Content (new or changed sections only)",
        context=context,
    )
    try:
        raw  = await ollama_generate(prompt)
        data = parse_quiz_json(raw)
        for q in data.get("questions", []):
            q["section_type"] = "updated"
        data["rag_info"]           = {"chunks_used": len(doc2), "mode": "updated-sections-only"}
        data["regeneration_note"]  = "Questions generated for updated/added sections only"
        return data
    except (json.JSONDecodeError, ValueError) as e:
        raise HTTPException(500, f"Malformed JSON: {e}")
    except httpx.ConnectError:
        raise HTTPException(503, "Ollama is not running")
    except Exception as e:
        raise HTTPException(500, f"Regeneration failed: {e}")


# ── Weak Area Detection (LLM-powered) ────────────────────────────────────────

@router.post("/weak-areas")
async def detect_weak_areas(
    wrong_questions: List[dict],
    current_user: dict = Depends(get_current_user),
):
    if not wrong_questions:
        return {"weak_areas": [], "recommendations": [], "relevant_passages": {}, "guidance": [], "llm_analysis": []}

    email = current_user["email"]
    store = get_store(email)

    # ── Step 1: LLM identifies weak topic areas from wrong answers ──
    wrong_text = "\n".join([
        f"- Q: {w.get('question', w.get('topic', 'Unknown'))} | Your answer: {w.get('user_answer', 'N/A')}"
        for w in wrong_questions[:10]
    ])

    llm_analysis = []
    try:
        prompt = f"""A student got these quiz questions wrong:

{wrong_text}

Identify the 3 most important weak topic areas based on these wrong answers.
For each topic, give a specific study recommendation.

Return ONLY a JSON array, no extra text:
[
  {{
    "topic": "Topic name",
    "reason": "One sentence why this is a weak area",
    "review_hint": "Specific thing to study or review"
  }}
]"""
        raw = await ollama_generate(prompt)
        if raw:
            import re as _re
            clean = _re.sub(r"```(?:json)?|```", "", raw).strip()
            match = _re.search(r"\[.*\]", clean, _re.DOTALL)
            if match:
                llm_analysis = json.loads(match.group(0))[:3]
    except Exception as e:
        print(f"[weak-areas] LLM analysis failed: {e}")

    # Fallback: derive topics from question metadata if LLM fails
    if not llm_analysis:
        freq: dict = {}
        for w in wrong_questions:
            t = w.get("topic", "General")
            freq[t] = freq.get(t, 0) + 1
        for topic, _ in sorted(freq.items(), key=lambda x: x[1], reverse=True)[:3]:
            llm_analysis.append({
                "topic": topic,
                "reason": "You answered questions on this topic incorrectly.",
                "review_hint": f"Re-read sections related to: {topic}",
            })

    # ── Step 2: RAG — find relevant document passages + estimate page ──
    guidance = []
    relevant_passages = {}

    for area in llm_analysis:
        topic = area["topic"]
        query = f"{topic} {area.get('review_hint', '')}"
        chunks = store.retrieve(query, n_results=3)
        if not chunks:
            chunks = store.retrieve(topic, n_results=2)

        if chunks:
            best = chunks[0]
            passage = best["text"][:400] + ("..." if len(best["text"]) > 400 else "")
            relevant_passages[topic] = passage

            # Estimate page number from chunk_index (≈ 250 words/page)
            chunk_idx   = best["metadata"].get("chunk_index", 0)
            total_chunks= best["metadata"].get("total_chunks", 1)
            est_page    = max(1, int((chunk_idx / max(total_chunks, 1)) * 20) + 1)

            guidance.append({
                "topic":          topic,
                "reason":         area.get("reason", ""),
                "review_hint":    area.get("review_hint", ""),
                "passage":        passage,
                "filename":       best["metadata"].get("filename", ""),
                "estimated_page": est_page,
                "relevance_score":round(best["score"], 2),
                "action":         f"Review '{topic}' — see page ~{est_page} of your document.",
            })

    weak_area_names = [a["topic"] for a in llm_analysis]
    return {
        "weak_areas":        weak_area_names,
        "llm_analysis":      llm_analysis,
        "recommendations":   [f"Review: {a['review_hint']}" for a in llm_analysis],
        "relevant_passages": relevant_passages,
        "guidance":          guidance,
    }


# ── Document Version Comparison ───────────────────────────────────────────────

@router.post("/compare-docs")
async def compare_documents(current_user: dict = Depends(get_current_user)):
    """
    Compare two uploaded documents semantically.
    Returns chunk-level diff: added / modified / removed / unchanged sections.
    Requires exactly 2 documents in the session.
    """
    email = current_user["email"]
    docs  = get_session_docs(email)
    if not docs:
        raise HTTPException(400, "No documents uploaded.")
    if len(docs) < 2:
        raise HTTPException(400, "Please upload 2 documents to compare (old version + new version).")

    from rag_pipeline import semantic_compare_rag

    doc1, doc2 = docs[0], docs[1]
    try:
        result = semantic_compare_rag(
            text1=doc1["text"],
            text2=doc2["text"],
            filename1=doc1["filename"],
            filename2=doc2["filename"],
        )
        result["doc1_name"] = doc1["filename"]
        result["doc2_name"] = doc2["filename"]
        return result
    except Exception as e:
        raise HTTPException(500, f"Document comparison failed: {e}")


# ── Streaming Summary ─────────────────────────────────────────────────────────

@router.get("/summary")
async def generate_summary(current_user: dict = Depends(get_current_user)):
    email = current_user["email"]
    docs  = get_session_docs(email)
    if not docs:
        raise HTTPException(400, "No documents uploaded")

    store     = get_store(email)
    seen, parts = set(), []
    for q in [
        "overview introduction main topic",
        "key findings conclusions",
        "important details methods",
        "results discussion summary",
    ]:
        for c in store.retrieve(q, n_results=3):
            if c["text"] not in seen:
                seen.add(c["text"])
                parts.append(c["text"])

    for doc in docs:
        for tbl in doc.get("tables", [])[:3]:
            parts.append(f"[Table]\n{tbl['markdown']}")

    context   = "\n\n---\n\n".join(parts[:14]) if parts else full_context(email)
    doc_names = " and ".join(d["filename"] for d in docs)

    prompt = f"""Write a comprehensive, well-structured summary of: {doc_names}

Content:
{context}

Use these markdown sections:
## Overview
## Key Points
## Important Details
## Tables & Data (if any tables are present)
## Conclusions & Takeaways

Be thorough and specific. Use ONLY the provided content."""

    async def stream_response():
        try:
            async for token in ollama_stream(prompt):
                yield f"data: {json.dumps({'token': token})}\n\n"
            yield "data: [DONE]\n\n"
        except httpx.ConnectError:
            yield f"data: {json.dumps({'error': 'Ollama is not running'})}\n\n"
        except Exception as e:
            yield f"data: {json.dumps({'error': str(e)})}\n\n"

    return StreamingResponse(stream_response(), media_type="text/event-stream")


# ── Flashcards ────────────────────────────────────────────────────────────────

@router.post("/flashcards")   # changed from GET → POST (GET has no body; POST is correct)
async def generate_flashcards(current_user: dict = Depends(get_current_user)):
    email = current_user["email"]
    if not get_session_docs(email):
        raise HTTPException(400, "No documents uploaded")

    chunks  = _chunks_for(
        email,
        ["definition term concept", "process steps mechanism", "important fact detail", "example application"],
    )
    context = (
        "\n\n---\n\n".join(c["text"] for c in chunks[:12])
        if chunks
        else full_context(email, 5000)
    )

    prompt = f"""Create exactly 10 flashcards from this document content. Mix definitions, concepts, processes, and key facts.

Content:
{context}

STRICT RULES:
- Return ONLY raw JSON — no markdown fences, no preamble, no trailing text
- Nothing before {{ or after }}

Required JSON format:
{{
  "flashcards": [
    {{
      "id": 1,
      "front": "Term, question, or concept name",
      "back": "Definition, explanation, or answer — 1-3 sentences",
      "category": "Topic category"
    }}
  ]
}}"""

    try:
        raw  = await ollama_generate(prompt)
        data = parse_quiz_json(raw)
        return data
    except httpx.ConnectError:
        raise HTTPException(503, "Ollama is not running")
    except (json.JSONDecodeError, ValueError) as e:
        raise HTTPException(500, f"Malformed JSON from AI: {e}")
    except Exception as e:
        raise HTTPException(500, f"Flashcard generation failed: {e}")


# ── Conversational Chat (with persistent history) ─────────────────────────────

class ChatMessage(BaseModel):
    role:    str
    content: str

class ChatRequest(BaseModel):
    message: str
    history: List[ChatMessage] = []

@router.post("/chat")
async def chat_with_document(req: ChatRequest, current_user: dict = Depends(get_current_user)):
    email = current_user["email"]
    if not get_session_docs(email):
        raise HTTPException(400, "No documents uploaded")

    from database import save_chat_message, get_chat_history
    if not req.history:
        saved   = get_chat_history(email, limit=10)
        history = [ChatMessage(role=m["role"], content=m["content"]) for m in saved]
    else:
        history = req.history

    store   = get_store(email)
    chunks  = store.retrieve(req.message, n_results=5)
    context = "\n\n---\n\n".join(c["text"] for c in chunks) if chunks else full_context(email, 3000)

    history_str = ""
    for msg in history[-8:]:
        role_label = "User" if msg.role == "user" else "Assistant"
        history_str += f"{role_label}: {msg.content}\n"

    system = f"""You are DocuMind AI, an intelligent assistant that answers questions strictly based on the uploaded document.

Rules:
- ONLY use information from the Document Context below
- If the answer is not in the document, say "I couldn't find that in the document."
- Be concise, specific, and reference the document when possible
- For tables or structured data, present it clearly

Document Context:
{context}"""

    prompt = f"""{history_str}User: {req.message}
Assistant:"""

    save_chat_message(email, "user", req.message, doc_context=context[:200])

    full_response: List[str] = []

    async def stream_chat():
        try:
            async for token in ollama_stream(prompt, system=system):
                full_response.append(token)
                yield f"data: {json.dumps({'token': token})}\n\n"
            save_chat_message(email, "assistant", "".join(full_response))
            yield "data: [DONE]\n\n"
        except httpx.ConnectError:
            yield f"data: {json.dumps({'error': 'Ollama is not running'})}\n\n"
        except Exception as e:
            yield f"data: {json.dumps({'error': str(e)})}\n\n"

    return StreamingResponse(stream_chat(), media_type="text/event-stream")


@router.get("/chat/history")
async def get_chat_history_route(current_user: dict = Depends(get_current_user)):
    from database import get_chat_history
    messages = get_chat_history(current_user["email"], limit=60)
    return {"messages": messages}

@router.delete("/chat/history")
async def clear_chat_history_route(current_user: dict = Depends(get_current_user)):
    from database import clear_chat_history
    clear_chat_history(current_user["email"])
    return {"message": "Chat history cleared"}


# ── Hybrid Search ─────────────────────────────────────────────────────────────

class SearchRequest(BaseModel):
    query:     str
    n_results: int = 5

@router.post("/search")
async def semantic_search(req: SearchRequest, current_user: dict = Depends(get_current_user)):
    email  = current_user["email"]
    store  = get_store(email)
    vector = store.retrieve(req.query, n_results=req.n_results * 2)
    if not vector:
        return {"results": [], "message": "No documents indexed yet"}

    keywords = set(w.lower() for w in req.query.split() if len(w) > 3)

    def hybrid_score(c):
        kw_hits = sum(1 for k in keywords if k in c["text"].lower())
        return c["score"] + min(kw_hits * 0.05, 0.25)

    ranked = sorted(vector, key=hybrid_score, reverse=True)[: req.n_results]
    return {
        "results": [
            {
                "text":         c["text"],
                "score":        round(hybrid_score(c), 3),
                "vector_score": round(c["score"], 3),
                "filename":     c["metadata"].get("filename", "unknown"),
                "chunk_index":  c["metadata"].get("chunk_index", 0),
            }
            for c in ranked
        ],
        "retrieval": "hybrid (vector + keyword boost)",
    }


# ── Status ────────────────────────────────────────────────────────────────────

@router.get("/ollama-status")
async def check_ollama():
    try:
        async with httpx.AsyncClient(timeout=5.0) as c:
            r      = await c.get(f"{OLLAMA_BASE}/api/tags")
            models = r.json().get("models", [])
            return {"running": True, "models": [m["name"] for m in models]}
    except Exception:
        return {"running": False, "models": []}