"""
RAG Pipeline for DocuMind AI
- Text chunking with overlap
- TF-IDF embeddings (no download needed, works offline)
- ChromaDB vector store (persistent per user)
- Semantic retrieval for quiz, summary, flashcards
- Document version comparison via cosine similarity
"""

import os
import re
import json
import hashlib
import numpy as np
import chromadb
from chromadb.config import Settings
from typing import List, Dict, Optional, Tuple
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity
import pickle

CHROMA_DIR = "chroma_db"
os.makedirs(CHROMA_DIR, exist_ok=True)

# ─────────────────────────────────────────────
# Chunking
# ─────────────────────────────────────────────

def chunk_text(
    text: str,
    chunk_size: int = 600,
    overlap: int = 100,
    min_chunk: int = 80
) -> List[str]:
    """Split text into overlapping chunks, respecting sentence boundaries."""
    # Normalize whitespace
    text = re.sub(r'\n{3,}', '\n\n', text.strip())
    
    # Split into sentences (naive but good enough)
    sentences = re.split(r'(?<=[.!?])\s+', text)
    
    chunks = []
    current = []
    current_len = 0

    for sentence in sentences:
        s_len = len(sentence.split())
        if current_len + s_len > chunk_size and current:
            chunk_text_str = " ".join(current)
            if len(chunk_text_str.split()) >= min_chunk:
                chunks.append(chunk_text_str)
            # Overlap: keep last N words
            overlap_words = " ".join(current).split()[-overlap:]
            current = overlap_words
            current_len = len(overlap_words)
        current.append(sentence)
        current_len += s_len

    if current:
        final = " ".join(current)
        if len(final.split()) >= min_chunk:
            chunks.append(final)

    # Fallback: if very short doc, return whole text as one chunk
    if not chunks and text.strip():
        chunks = [text[:4000]]

    return chunks


# ─────────────────────────────────────────────
# Embedder (TF-IDF, no downloads required)
# ─────────────────────────────────────────────

class TFIDFEmbedder:
    """
    Stateful TF-IDF embedder. Fits on all chunks of a user's documents
    then encodes queries at retrieval time.
    Persisted to disk alongside chroma so it survives restarts.
    """

    def __init__(self, n_features: int = 512):
        self.n_features = n_features
        self.vectorizer: Optional[TfidfVectorizer] = None
        self._fitted = False

    def fit(self, texts: List[str]):
        self.vectorizer = TfidfVectorizer(
            max_features=self.n_features,
            ngram_range=(1, 2),
            sublinear_tf=True,
            strip_accents="unicode",
            min_df=1,
        )
        self.vectorizer.fit(texts)
        self._fitted = True

    def encode(self, texts: List[str]) -> List[List[float]]:
        if not self._fitted:
            raise RuntimeError("Embedder not fitted yet")
        mat = self.vectorizer.transform(texts).toarray()
        # L2 normalize for cosine similarity
        norms = np.linalg.norm(mat, axis=1, keepdims=True)
        norms[norms == 0] = 1
        mat = mat / norms
        return mat.tolist()

    def save(self, path: str):
        with open(path, "wb") as f:
            pickle.dump(self.vectorizer, f)

    def load(self, path: str):
        with open(path, "rb") as f:
            self.vectorizer = pickle.load(f)
        self._fitted = True


# ─────────────────────────────────────────────
# Vector Store (per user, persistent ChromaDB)
# ─────────────────────────────────────────────

class UserVectorStore:
    """One ChromaDB collection per user, with a paired TF-IDF embedder."""

    def __init__(self, user_id: str):
        safe_id = re.sub(r'[^a-zA-Z0-9_-]', '_', user_id)
        self.safe_id = safe_id
        self.embedder_path = os.path.join(CHROMA_DIR, f"{safe_id}_embedder.pkl")
        self.meta_path = os.path.join(CHROMA_DIR, f"{safe_id}_meta.json")

        self.client = chromadb.PersistentClient(
            path=os.path.join(CHROMA_DIR, safe_id),
            settings=Settings(anonymized_telemetry=False)
        )
        self.embedder = TFIDFEmbedder()
        if os.path.exists(self.embedder_path):
            self.embedder.load(self.embedder_path)

    def _collection(self, name: str = "docs"):
        return self.client.get_or_create_collection(
            name=name,
            metadata={"hnsw:space": "cosine"}
        )

    def index_documents(self, docs: List[Dict]):
        """
        docs: list of {filename, text, doc_index}
        Chunks, fits embedder, upserts into ChromaDB.
        """
        all_chunks = []
        all_metas = []
        all_ids = []

        for doc in docs:
            chunks = chunk_text(doc["text"])
            for i, chunk in enumerate(chunks):
                chunk_id = hashlib.md5(f"{doc['filename']}_{i}_{chunk[:50]}".encode()).hexdigest()
                all_chunks.append(chunk)
                all_metas.append({
                    "filename": doc["filename"],
                    "doc_index": doc.get("doc_index", 0),
                    "chunk_index": i,
                    "total_chunks": len(chunks),
                })
                all_ids.append(chunk_id)

        if not all_chunks:
            return {"chunks": 0}

        # Fit embedder on all chunks
        self.embedder.fit(all_chunks)
        self.embedder.save(self.embedder_path)

        embeddings = self.embedder.encode(all_chunks)

        # Clear existing and re-add
        col = self._collection()
        try:
            self.client.delete_collection("docs")
        except Exception:
            pass
        col = self._collection()

        # Batch upsert (ChromaDB has limits per batch)
        batch_size = 100
        for start in range(0, len(all_chunks), batch_size):
            end = start + batch_size
            col.add(
                documents=all_chunks[start:end],
                embeddings=embeddings[start:end],
                metadatas=all_metas[start:end],
                ids=all_ids[start:end],
            )

        # Save metadata
        meta = {
            "doc_names": [d["filename"] for d in docs],
            "total_chunks": len(all_chunks),
            "chunk_sizes": {d["filename"]: len(chunk_text(d["text"])) for d in docs}
        }
        with open(self.meta_path, "w") as f:
            json.dump(meta, f)

        return {"chunks": len(all_chunks), "meta": meta}

    def retrieve(
        self,
        query: str,
        n_results: int = 6,
        doc_filter: Optional[str] = None
    ) -> List[Dict]:
        """Retrieve top-k chunks relevant to query."""
        if not self.embedder._fitted:
            return []

        col = self._collection()
        count = col.count()
        if count == 0:
            return []

        n_results = min(n_results, count)
        query_emb = self.embedder.encode([query])

        where = {"doc_index": doc_filter} if doc_filter else None

        try:
            results = col.query(
                query_embeddings=query_emb,
                n_results=n_results,
                where=where,
                include=["documents", "metadatas", "distances"]
            )
        except Exception:
            results = col.query(
                query_embeddings=query_emb,
                n_results=n_results,
                include=["documents", "metadatas", "distances"]
            )

        chunks = []
        for i, doc in enumerate(results["documents"][0]):
            chunks.append({
                "text": doc,
                "metadata": results["metadatas"][0][i],
                "score": 1 - results["distances"][0][i],  # cosine distance → similarity
            })
        return chunks

    def retrieve_for_topic(self, topic: str, n_results: int = 4) -> str:
        """Retrieve chunks and return as combined context string."""
        chunks = self.retrieve(topic, n_results=n_results)
        if not chunks:
            return ""
        return "\n\n---\n\n".join([c["text"] for c in chunks])

    def get_metadata(self) -> dict:
        if os.path.exists(self.meta_path):
            with open(self.meta_path) as f:
                return json.load(f)
        return {}

    def clear(self):
        try:
            self.client.delete_collection("docs")
        except Exception:
            pass
        for p in [self.embedder_path, self.meta_path]:
            if os.path.exists(p):
                os.remove(p)


# ─────────────────────────────────────────────
# Semantic Document Comparison (RAG-based)
# ─────────────────────────────────────────────

def semantic_compare_rag(text1: str, text2: str, filename1: str = "Doc 1", filename2: str = "Doc 2") -> dict:
    """
    Full RAG-based semantic comparison:
    - Chunks both docs
    - Embeds all chunks together
    - Computes cross-doc cosine similarities
    - Detects added / modified / removed sections
    """
    chunks1 = chunk_text(text1)
    chunks2 = chunk_text(text2)

    all_chunks = chunks1 + chunks2
    if not all_chunks:
        return {"strategy": "different", "similarity": 0}

    # Fit a shared vectorizer
    vec = TfidfVectorizer(max_features=512, ngram_range=(1, 2), sublinear_tf=True, min_df=1)
    mat = vec.fit_transform(all_chunks).toarray()
    norms = np.linalg.norm(mat, axis=1, keepdims=True)
    norms[norms == 0] = 1
    mat = mat / norms

    mat1 = mat[:len(chunks1)]
    mat2 = mat[len(chunks1):]

    # Chunk-level cross similarities
    sim_matrix = cosine_similarity(mat1, mat2)

    # Overall similarity = mean of best-match similarities
    if sim_matrix.size == 0:
        overall_sim = 0.0
    else:
        best_matches_1 = sim_matrix.max(axis=1)
        best_matches_2 = sim_matrix.max(axis=0)
        overall_sim = float((best_matches_1.mean() + best_matches_2.mean()) / 2)

    # Identify section changes
    added = []      # chunks in doc2 with no close match in doc1
    modified = []   # chunks that match but differ
    removed = []    # chunks in doc1 with no close match in doc2
    unchanged = 0

    THRESHOLD_SAME = 0.85
    THRESHOLD_MODIFIED = 0.35

    for i, c1 in enumerate(chunks1):
        best_score = sim_matrix[i].max() if sim_matrix.shape[1] > 0 else 0
        if best_score >= THRESHOLD_SAME:
            unchanged += 1
        elif best_score >= THRESHOLD_MODIFIED:
            modified.append(c1[:120] + "...")
        else:
            removed.append(c1[:120] + "...")

    for j, c2 in enumerate(chunks2):
        best_score = sim_matrix[:, j].max() if sim_matrix.shape[0] > 0 else 0
        if best_score < THRESHOLD_MODIFIED:
            added.append(c2[:120] + "...")

    if overall_sim >= 0.70:
        strategy = "identical"
    elif overall_sim >= 0.30:
        strategy = "partial"
    else:
        strategy = "different"

    # Extract shared topics (top TF-IDF terms that appear in both)
    words1 = set(re.findall(r'\b[a-zA-Z]{5,}\b', text1.lower()))
    words2 = set(re.findall(r'\b[a-zA-Z]{5,}\b', text2.lower()))
    stopwords = {"which", "their", "there", "these", "those", "about", "after", "before",
                 "where", "while", "would", "could", "should", "other", "every", "through"}
    common = sorted((words1 & words2) - stopwords)[:12]

    return {
        "strategy": strategy,
        "similarity": round(overall_sim * 100, 1),
        "common_topics": common,
        "added_sections": len(added),
        "modified_sections": len(modified),
        "removed_sections": len(removed),
        "unchanged_sections": unchanged,
        "added_previews": added[:3],
        "modified_previews": modified[:3],
        "removed_previews": removed[:3],
        "doc1_chunks": len(chunks1),
        "doc2_chunks": len(chunks2),
    }


# ─────────────────────────────────────────────
# Global store registry (user_email -> UserVectorStore)
# ─────────────────────────────────────────────

_stores: Dict[str, UserVectorStore] = {}

def get_store(user_email: str) -> UserVectorStore:
    if user_email not in _stores:
        _stores[user_email] = UserVectorStore(user_email)
    return _stores[user_email]
