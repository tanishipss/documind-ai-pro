# 📚 DocuMind AI

<div align="center">

![DocuMind AI Banner](https://img.shields.io/badge/DocuMind-AI%20Powered-ec4899?style=for-the-badge&logo=bookstack&logoColor=white)
![Python](https://img.shields.io/badge/Python-3.11-3776AB?style=for-the-badge&logo=python&logoColor=white)
![FastAPI](https://img.shields.io/badge/FastAPI-0.111-009688?style=for-the-badge&logo=fastapi&logoColor=white)
![React](https://img.shields.io/badge/React-18-61DAFB?style=for-the-badge&logo=react&logoColor=black)
![Ollama](https://img.shields.io/badge/Ollama-Local%20LLM-black?style=for-the-badge)
![ChromaDB](https://img.shields.io/badge/ChromaDB-Vector%20DB-orange?style=for-the-badge)

**Transform static documents into intelligent, adaptive learning experiences.**  
Powered by RAG architecture, local LLMs via Ollama, and semantic vector search.

[Features](#-features) • [Tech Stack](#-tech-stack) • [Installation](#-installation) • [Usage](#-usage) • [Architecture](#-architecture) • [Screenshots](#-screenshots)

</div>

---

## ✨ Features

### 📂 Document Processing
- Upload **PDF, DOCX, TXT, MD** files (up to 2 documents simultaneously)
- Rich text extraction with **table parsing** (pdfplumber) and **image extraction** (PyMuPDF)
- Automatic **semantic chunking** with sentence-boundary awareness and overlap
- Instant indexing into **ChromaDB vector database** via TF-IDF embeddings

### 🔍 Semantic Document Comparison
- Compare two document versions using **chunk-level cosine similarity**
- Detects **Added / Modified / Removed / Unchanged** sections
- Labels relationship as Identical / Partially Related / Different
- Shows previews of changed sections with shared topic extraction

### 🧠 AI Quiz Generation
- Generates **10–15 questions** per session grounded in RAG-retrieved chunks
- **3 difficulty levels** — Easy (recall), Medium (analysis), Hard (critical thinking)
- **Dual-document mode** — splits questions between matched sections AND updated sections
- Dot navigation, progress bar, per-question explanations
- **Version-aware regeneration** — generates questions only for changed sections

### 💬 Conversational Q&A
- Multi-turn chat with **persistent history** saved to SQLite
- Every answer RAG-grounded — only uses content from your document
- Streaming responses via Server-Sent Events
- Chat history survives page refreshes and server restarts

### ✨ AI Summary
- Streaming summary with live token display
- Structured output: Overview → Key Points → Important Details → Conclusions
- Includes table data from documents in summary context

### 🃏 Flashcards
- 10 AI-generated flashcards per session
- 3D flip animation (click to reveal answer)
- Grid navigation, category tags, progress tracking

### 🔍 Hybrid RAG Search
- **Vector similarity + keyword boost** re-ranking
- Returns relevance scores per chunk
- Shows source filename and chunk index

### 🎯 Weak Area Detection
- Analyzes wrong quiz answers to identify knowledge gaps
- Maps weak topics back to **source document passages** via RAG
- Saves personalized guidance to database for the Progress dashboard

### 📊 Progress Dashboard
- **5 tabs**: Overview · Accuracy Trend · Weak Areas · Guidance · History
- Accuracy line chart and weak topics bar chart (Recharts)
- Difficulty breakdown, best score, total questions answered
- Full quiz history table with timestamps

### 🔥 Engagement
- Daily **streak tracking** (localStorage)
- Personalized learning guidance passages

### 🔐 Authentication
- JWT-based signup/login (7-day tokens)
- **Email verification** with tokenized links (24-hour expiry)
- Dev mode: verification link printed to console when SMTP not configured
- bcrypt password hashing

---

## 🛠 Tech Stack

| Layer | Technology |
|---|---|
| **Backend** | Python 3.11, FastAPI, Uvicorn |
| **Frontend** | React 18, Vite, React Router |
| **LLM** | Ollama (llama3:8b, mistral, deepseek-r1 — local) |
| **Vector DB** | ChromaDB (persistent, per-user collections) |
| **Embeddings** | TF-IDF with bigrams + L2 normalization (no download required) |
| **Database** | SQLite (users, quiz history, weak areas, chat, guidance) |
| **PDF Extraction** | pdfplumber (text + tables), PyMuPDF (images), PyPDF2 (fallback) |
| **Auth** | python-jose (JWT), bcrypt |
| **Charts** | Recharts |
| **3D Landing** | Three.js (animated particles + wireframe shapes) |
| **HTTP Client** | httpx (async) |

---

## 📁 Project Structure

```
documind/
├── backend/
│   ├── main.py              # FastAPI app entry point
│   ├── auth.py              # JWT auth, email verification, user routes
│   ├── database.py          # SQLite — all tables and queries
│   ├── documents.py         # Upload, rich extraction, RAG indexing
│   ├── ai_features.py       # Quiz, flashcards, summary, chat, search
│   ├── rag_pipeline.py      # ChromaDB + TF-IDF embedder + comparison
│   ├── requirements.txt
│   └── uploads/             # Uploaded files (gitignored)
│
├── frontend/
│   ├── src/
│   │   ├── App.jsx              # Router + auth guards
│   │   ├── AuthContext.jsx      # Global auth state
│   │   ├── AuthPages.jsx        # Login, Signup, Email Verification
│   │   ├── Landing.jsx          # Three.js animated landing page
│   │   ├── AppMain.jsx          # Main app — sidebar + 7 tabs
│   │   ├── DocumentUpload.jsx   # Upload + comparison display
│   │   ├── Quiz.jsx             # Full quiz with section badges
│   │   ├── Summary.jsx          # Streaming summary
│   │   ├── Flashcards.jsx       # 3D flip flashcards
│   │   ├── Dashboard.jsx        # Progress dashboard (5 tabs)
│   │   ├── Chat.jsx             # Persistent conversational Q&A
│   │   ├── SemanticSearch.jsx   # Hybrid RAG search
│   │   ├── api.js               # Axios API helpers
│   │   └── index.css            # Design system (pastel pink + green)
│   ├── package.json
│   ├── vite.config.js
│   └── index.html
│
└── README.md
```

---

## ⚙️ Installation

### Prerequisites

| Tool | Version | Install |
|---|---|---|
| Python | 3.9+ | [python.org](https://python.org) |
| Node.js | 18+ | [nodejs.org](https://nodejs.org) |
| Ollama | Latest | [ollama.ai](https://ollama.ai) |

### 1. Clone the repository

```bash
git clone https://github.com/tanishipss/Documind-ai.git
cd Documind-ai
```

### 2. Set up the backend

```bash
cd documind/backend

# Create virtual environment
python -m venv .venv

# Activate — Windows
.venv\Scripts\activate

# Activate — Mac/Linux
source .venv/bin/activate

# Install dependencies
pip install -r requirements.txt
```

### 3. Set up the frontend

```bash
cd documind/frontend
npm install
```

### 4. Pull an Ollama model

```bash
# Recommended
ollama pull llama3:8b

# Alternatives
ollama pull mistral:7b
ollama pull deepseek-r1:7b
ollama pull llama3.2:3b   # lighter, faster
```

---

## 🚀 Running the Application

Open **3 terminals**:

**Terminal 1 — Ollama**
```bash
ollama serve
```

**Terminal 2 — Backend**
```bash
cd documind/backend
python main.py
# → http://localhost:8000
# → API docs: http://localhost:8000/docs
```

**Terminal 3 — Frontend**
```bash
cd documind/frontend
npm run dev
# → http://localhost:5173
```

Open **http://localhost:5173** in your browser.

---

## 🔧 Configuration

### Change the LLM model

Edit `backend/ai_features.py`:
```python
DEFAULT_MODEL = "llama3:8b"   # change to any model you have pulled
```

### Enable real email verification

Set environment variables before starting the backend:

```bash
# Windows
set SMTP_HOST=smtp.gmail.com
set SMTP_PORT=587
set SMTP_USER=your@gmail.com
set SMTP_PASSWORD=your-app-password
set APP_URL=http://localhost:5173

# Mac/Linux
export SMTP_HOST=smtp.gmail.com
export SMTP_PORT=587
export SMTP_USER=your@gmail.com
export SMTP_PASSWORD=your-app-password
export APP_URL=http://localhost:5173
```

> Without SMTP configured, a verification link is printed directly to the server console — perfect for development.

### Change ports

| Service | Default | Config location |
|---|---|---|
| Backend | 8000 | `backend/main.py` → `uvicorn.run(..., port=8000)` |
| Frontend | 5173 | `frontend/vite.config.js` |
| Ollama | 11434 | `backend/ai_features.py` → `OLLAMA_BASE` |

---

## 🗺 Architecture

```
User Browser
     │
     ▼
React Frontend (Vite)
     │  REST + SSE
     ▼
FastAPI Backend
     │
     ├── Document Upload
     │        │
     │        ▼
     │   Text + Table + Image Extraction
     │   (pdfplumber / PyMuPDF / python-docx)
     │        │
     │        ▼
     │   Semantic Chunking (600-word, overlapping)
     │        │
     │        ▼
     │   TF-IDF Embeddings (scikit-learn)
     │        │
     │        ▼
     │   ChromaDB Vector Store (per-user, persistent)
     │
     ├── Query Time (Quiz / Chat / Search / Flashcards / Summary)
     │        │
     │        ▼
     │   Semantic Retrieval (top-k chunks)
     │        │
     │        ▼
     │   Prompt Construction (RAG context injection)
     │        │
     │        ▼
     │   Ollama LLM (local, no API key)
     │        │
     │        ▼
     │   Structured Output / Streaming Response
     │
     └── SQLite
              ├── users (auth + verification)
              ├── quiz_history (scores, accuracy, mode)
              ├── weak_areas (miss counts per topic)
              ├── learning_guidance (RAG passages per topic)
              └── chat_history (persistent conversations)
```

---

## 📖 Usage Guide

### First time setup

1. Go to `http://localhost:5173`
2. Click **Get Started Free** → create an account
3. Check your server console for the email verification link (dev mode)
4. Click the link to verify → you're in

### Workflow

```
Upload Document
      ↓
Wait for "RAG Pipeline Ready · N chunks indexed"
      ↓
Choose a feature:
  Quiz       → Select difficulty + question count → Generate
  Chat       → Ask anything about your document
  Summary    → Get a structured AI summary (streaming)
  Flashcards → Study key concepts with flip cards
  Search     → Find specific passages with hybrid search
  Progress   → Track scores, streaks, weak areas
```

### Two-document mode

Upload **two versions** of a document to unlock:
- Side-by-side semantic comparison (added / modified / removed sections)
- **Dual-mode quiz** — questions from both matched AND updated sections
- **Version-aware regeneration** — quiz only the new content

---

## 📦 Requirements

```
fastapi
uvicorn
python-multipart
python-jose[cryptography]
bcrypt
pydantic
httpx
PyPDF2
python-docx
aiofiles
chromadb
scikit-learn
numpy
pdfplumber
pymupdf
```

---

## 🤝 Contributing

Pull requests are welcome!

```bash
# Fork the repo, then:
git checkout -b feature/your-feature
git commit -m "Add your feature"
git push origin feature/your-feature
# Open a Pull Request
```

---

## 📄 License

MIT License — free to use, modify, and distribute.

---

## 👩‍💻 Author

**Tanisha Yadav**  
B.Tech Computer Science | AI/ML  
Building intelligent systems for document understanding and AI-assisted learning.

[![GitHub](https://img.shields.io/badge/GitHub-tanishipss-black?style=flat-square&logo=github)](https://github.com/tanishipss)

---

<div align="center">

⭐ **Star this repo if you found it useful!**

*DocuMind AI — transforming static documents into intelligent learning companions.*

</div>