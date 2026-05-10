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
Zero API keys. Fully offline. Completely free.

[Features](#-features) • [Screenshots](#-screenshots) • [Tech Stack](#-tech-stack) • [Installation](#-installation) • [Usage](#-usage) • [Architecture](#-architecture)

</div>

---

## 📸 Screenshots

> 📌 **To add screenshots:** create a `screenshots/` folder in the project root, take screenshots of each feature, and save them with the filenames shown below. GitHub will render them automatically.

---

### Landing Page
*Three.js animated landing with particle effects and wireframe shapes*

<!-- Take screenshot of: http://localhost:5173 — the animated dark background with "DocuMind AI" heading, tagline, and "Get Started Free" button -->
![Landing Page](screenshots/landing.png)

---

### Sign Up & Login
*JWT-based auth with email verification*

<!-- Take screenshot of: the signup form OR login form — pink gradient card with email/password fields -->
![Auth](screenshots/auth.png)

---

### Document Upload
*Drag-and-drop upload with real-time extraction metadata*

<!-- Take screenshot of: Documents tab AFTER uploading a PDF — showing the doc card (word count, page count, table count), RAG Pipeline Ready green badge, and chunks count -->
![Document Upload](screenshots/upload.png)

---

### Vision AI Active
*llava describes images, diagrams, and tables-as-images*

<!-- Take screenshot of: the blue "👁️ Vision AI active — N images described by AI" banner that appears after uploading a PDF with images when llava is running -->
![Vision AI](screenshots/upload_vision.png)

---

### Two-Document Comparison
*Semantic diff shown immediately on upload*

<!-- Take screenshot of: the comparison card after uploading two PDFs — similarity %, unchanged/modified/added/removed stat grid, common topic chips, added/removed section previews -->
![Document Comparison](screenshots/doc_comparison.png)

---

### Quiz — Generation Screen
*RAG-grounded MCQ with difficulty levels*

<!-- Take screenshot of: the Quiz tab before generating — difficulty picker (Easy / Medium / Hard buttons), question count selector (10 / 12 / 15), Generate Quiz button -->
![Quiz Generation](screenshots/quiz_generate.png)

---

### Quiz — Active Question
*Dot navigation, 4 answer options, progress bar*

<!-- Take screenshot of: a quiz question mid-session — the question text, four answer option buttons (one selected/highlighted), dot navigation row at the top, Submit button -->
![Active Quiz](screenshots/quiz_active.png)

---

### Quiz — Results
*Score breakdown with per-question correct/wrong indicators*

<!-- Take screenshot of: the results screen after finishing a quiz — score card (X/10), per-question list showing ✅ correct and ❌ wrong with explanations, section badges (matched/updated/standard) -->
![Quiz Results](screenshots/quiz_results.png)

---

### Weak Area Analysis
*LLM-powered topic detection with page estimates and document passages*

<!-- Take screenshot of: the weak area report cards below quiz results — topic name card with estimated page badge (pink), reason text (italic), document passage in purple box with filename, review hint in green box -->
![Weak Areas](screenshots/weak_areas.png)

---

### Conversational Chat
*Multi-turn RAG-grounded chat with streaming responses*

<!-- Take screenshot of: the Chat tab with at least one exchange — user message bubble on the right, AI streaming answer on the left, showing that the answer references the document -->
![Chat](screenshots/chat.png)

---

### AI Summary
*Streaming structured summary with live token display*

<!-- Take screenshot of: the Summary tab mid-stream OR after completion — showing the structured output with Overview, Key Points, Important Details sections -->
![Summary](screenshots/summary.png)

---

### Flashcards
*3D flip cards generated from key concepts*

<!-- Take screenshot of: the Flashcards tab showing the card grid — ideally with one card flipped to show the back (answer/definition side) -->
![Flashcards](screenshots/flashcards.png)

---

### Hybrid RAG Search
*Vector similarity + keyword boost re-ranking*

<!-- Take screenshot of: the Search tab with a query entered and results shown — each result card showing relevance score, filename, chunk index, and the passage text preview -->
![Search](screenshots/search.png)

---

### Doc Compare Tab — Full Report
*Full semantic version comparison with visual diff bar*

<!-- Take screenshot of: the Doc Compare tab after running a comparison — similarity score circle, 4-stat grid, coloured distribution bar (green/yellow/blue/red), shared topic chips -->
![Doc Compare](screenshots/doc_compare.png)

---

### Doc Compare — Section Previews
*Added, modified, and removed section content*

<!-- Take screenshot of: the section preview cards below the stats — the blue "Added Sections" cards and/or red "Removed Sections" cards showing actual text snippets -->
![Doc Compare Previews](screenshots/doc_compare_previews.png)

---

### Progress Dashboard — Overview
*Stat cards, accuracy trend chart, difficulty breakdown*

<!-- Take screenshot of: the Progress tab → Overview sub-tab — showing the stat cards (Best Score, Total Quizzes, Avg Accuracy, Streak) and the accuracy line chart -->
![Dashboard Overview](screenshots/dashboard_overview.png)

---

### Progress Dashboard — Weak Areas
*Bar chart of topics by miss count*

<!-- Take screenshot of: the Progress tab → Weak Areas sub-tab — showing the horizontal bar chart of topics ordered by how many times you got them wrong -->
![Dashboard Weak Areas](screenshots/dashboard_weak_areas.png)

---

### Progress Dashboard — Guidance
*RAG passages mapped to your weakest topics*

<!-- Take screenshot of: the Progress tab → Guidance sub-tab — showing the topic guidance cards with document passage excerpts and source filenames -->
![Dashboard Guidance](screenshots/dashboard_guidance.png)

---

### Progress Dashboard — History
*Full quiz history table*

<!-- Take screenshot of: the Progress tab → History sub-tab — the full table of past quizzes with timestamp, score, accuracy %, difficulty, topic, and mode columns -->
![Dashboard History](screenshots/dashboard_history.png)

---

## ✨ Features

### 📂 Document Processing
- Upload **PDF, DOCX, TXT, MD** files (up to 2 documents simultaneously)
- Rich extraction — **text + tables** (pdfplumber) + **images** (PyMuPDF)
- **Vision AI** — llava describes images, diagrams, charts, and image-based tables so they enter the RAG pipeline
- Automatic **semantic chunking** (~600 words, sentence-boundary aware, overlapping)
- Instant indexing into **ChromaDB vector database** via TF-IDF embeddings

### 🔬 Semantic Document Comparison
- Compare two document versions using a **chunk-level cosine similarity matrix**
- Detects **Added / Modified / Removed / Unchanged** sections with configurable thresholds
- Shows overall similarity %, visual distribution bar, section previews, and shared topics
- Available on upload (quick view) and in the dedicated **Doc Compare tab** (full report)

### 🧠 AI Quiz Generation
- Generates **10–15 RAG-grounded MCQ questions** per session
- **3 difficulty levels** — Easy (recall), Medium (analysis), Hard (critical thinking)
- **Dual-document mode** — questions split between matched and updated sections, labelled per question
- **Version-aware regeneration** — regenerate questions only from changed sections
- Dot navigation, progress bar, per-question explanations

### 🎯 LLM-Powered Weak Area Analysis
- Ollama identifies **top 3 weak topic areas** from wrong answers with reasons and review hints
- RAG retrieves the most relevant document passage per topic with estimated page numbers
- Weak areas saved persistently and tracked in the progress dashboard

### 💬 Conversational Q&A
- Multi-turn chat **grounded exclusively in your document** via RAG context injection
- Streaming responses via Server-Sent Events
- Persistent chat history saved to SQLite — survives refresh and restart

### ✨ AI Summary
- Streaming summary with live token display
- Structured output: Overview → Key Points → Important Details → Conclusions

### 🃏 Flashcards
- 10 AI-generated flashcards focused on key concepts and definitions
- 3D flip animation, grid navigation, category tags

### 🔍 Hybrid RAG Search
- **Vector similarity + keyword boost** re-ranking
- Returns relevance scores, source filename, and chunk index per result

### 📊 Progress Dashboard — 5 tabs
- **Overview** — stat cards, accuracy trend chart, difficulty split
- **Accuracy Trend** — line chart + full scores table
- **Weak Areas** — bar chart ordered by miss count
- **Guidance** — RAG passages mapped to your weakest topics
- **History** — full quiz history table with timestamps and modes
- Daily **streak tracking** (localStorage)

### 🔐 Authentication
- JWT-based signup/login (7-day tokens), bcrypt password hashing
- Email verification with tokenized links (24-hour expiry)
- Dev mode: verification link printed to console when SMTP not configured

---

## 🛠 Tech Stack

| Layer | Technology |
|---|---|
| **Backend** | Python 3.11, FastAPI, Uvicorn |
| **Frontend** | React 18, Vite, React Router |
| **LLM (text)** | Ollama — llama3:8b (local, no API key) |
| **LLM (vision)** | Ollama — llava (describes images and diagrams) |
| **Vector DB** | ChromaDB (persistent, per-user collections) |
| **Embeddings** | TF-IDF with bigrams + L2 normalization (no model download needed) |
| **Database** | SQLite — 5 tables (users, quiz history, weak areas, guidance, chat) |
| **PDF Extraction** | pdfplumber (text + tables), PyMuPDF (images) |
| **Auth** | python-jose (JWT), bcrypt |
| **Charts** | Recharts |
| **3D Landing** | Three.js (animated particles + wireframe shapes) |
| **HTTP Client** | httpx (async) |

---

## 📁 Project Structure

```
documind_merged/
├── backend/
│   ├── main.py              # FastAPI entry point — mounts all 3 routers
│   ├── auth.py              # JWT auth, email verification, progress endpoints
│   ├── database.py          # SQLite — 5 tables, migrations, all queries
│   ├── documents.py         # Upload, extraction, llava vision, RAG indexing
│   ├── ai_features.py       # Quiz, flashcards, summary, chat, search, weak areas, doc compare
│   ├── rag_pipeline.py      # ChromaDB + TF-IDF embedder + semantic_compare_rag
│   ├── requirements.txt
│   └── uploads/             # Per-user uploaded files (gitignored)
│
├── frontend/
│   ├── src/
│   │   ├── App.jsx              # Router + auth guards
│   │   ├── AuthContext.jsx      # Global auth state (React context)
│   │   ├── AuthPages.jsx        # Login, Signup, Email Verification pages
│   │   ├── Landing.jsx          # Three.js animated landing page
│   │   ├── AppMain.jsx          # Shell — sidebar + 8 tabs
│   │   ├── DocumentUpload.jsx   # Upload, vision status, comparison display
│   │   ├── Quiz.jsx             # Full quiz with weak area report
│   │   ├── Summary.jsx          # Streaming summary
│   │   ├── Flashcards.jsx       # 3D flip flashcards
│   │   ├── Dashboard.jsx        # 5-tab progress dashboard
│   │   ├── Chat.jsx             # Persistent conversational Q&A
│   │   ├── SemanticSearch.jsx   # Hybrid RAG search
│   │   ├── DocCompare.jsx       # Full document version comparison
│   │   ├── api.js               # Axios client — authAPI, docsAPI, aiAPI
│   │   └── index.css            # Design system (pastel pink + green theme)
│   ├── package.json
│   ├── vite.config.js
│   └── index.html
│
├── screenshots/             # ← add your screenshots here
└── README.md
```

---

## ⚙️ Installation

### Prerequisites

| Tool | Version | Install |
|---|---|---|
| Python | 3.10+ | [python.org](https://python.org) |
| Node.js | 18+ | [nodejs.org](https://nodejs.org) |
| Ollama | Latest | [ollama.com](https://ollama.com) |

### 1. Get the project

```bash
# Clone from GitHub:
git clone https://github.com/tanishipss/Documind-ai.git
cd documind_merged

# Or extract the zip and cd into documind_merged/
```

### 2. Backend setup

```bash
cd backend

# Create virtual environment
python -m venv venv

# Activate — Windows
venv\Scripts\activate

# Activate — Mac/Linux
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt
```

### 3. Frontend setup

```bash
cd frontend
npm install
```

> Vite is already in `package.json` — `npm install` handles everything, no separate Vite install needed.

### 4. Pull Ollama models

```bash
# Required — text LLM for quiz, chat, summary, flashcards
ollama pull llama3:8b

# Optional but recommended — vision LLM for images, diagrams, tables-as-images
ollama pull llava
```

---

## 🚀 Running the App

Open **3 terminals**:

**Terminal 1 — Ollama**
```bash
ollama serve
```

**Terminal 2 — Backend** (venv activated)
```bash
cd backend
uvicorn main:app --reload --port 8000
```

**Terminal 3 — Frontend**
```bash
cd frontend
npm run dev
```

Open **[http://localhost:5173](http://localhost:5173)** in your browser.

| Service | URL |
|---|---|
| App | http://localhost:5173 |
| Backend API | http://localhost:8000 |
| Swagger Docs | http://localhost:8000/docs |

---

## 🔧 Configuration

### Change the LLM model

Edit `backend/ai_features.py`:
```python
DEFAULT_MODEL = "llama3:8b"   # swap with any model you have pulled
```

### Enable real email verification

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

> Without SMTP configured, the verification link is printed to the server console — perfect for development.

---

## 📖 Usage Guide

### Standard workflow

```
1. Upload Document  →  Documents tab
        ↓
   Wait for "RAG Pipeline Ready · N chunks indexed"
        ↓
2. Pick a feature:

   🧠 Quiz        →  difficulty + question count → Generate Quiz
   💬 Chat        →  ask anything about your document (streaming)
   ✨ Summary     →  structured AI summary (streaming)
   🃏 Flashcards  →  study key concepts with 3D flip cards
   🔍 Search      →  find passages with relevance scores
   🔬 Doc Compare →  run full version diff between 2 docs
   📊 Progress    →  track scores, streaks, and weak areas
```

### Two-document version comparison

Upload **two versions** of the same document to unlock:
- Instant semantic diff on upload (similarity %, added/modified/removed sections)
- **Doc Compare tab** — full report with visual distribution bar and section previews
- **Dual-mode quiz** — questions from both matched AND updated sections, each labelled
- **Version-aware regeneration** — quiz only the new/changed content

### Vision AI (diagrams + image tables)

After `ollama pull llava`, re-upload any document containing images. The Upload tab shows a blue **👁️ Vision AI active** banner. Image descriptions are indexed into ChromaDB and become searchable and quizzable like normal text.

---

## 🗺 Architecture

```
User Browser
     │
     ▼
React + Vite  (port 5173)
     │  REST + SSE (streaming)
     ▼
FastAPI  (port 8000)
     │
     ├── /api/auth/*        JWT · bcrypt · email verification · progress
     ├── /api/documents/*   upload → extract → llava vision → chunk → embed → index
     └── /api/ai/*          quiz · chat · summary · flashcards · search · weak areas · compare
                                 │
                    ┌────────────┴──────────────┐
                    ▼                           ▼
              ChromaDB                      Ollama
         (vector retrieval)          llama3:8b + llava
         ./chroma_db/                 localhost:11434
                    │
                    ▼
                 SQLite  (documind.db)
         ┌──────────────────────┐
         │ users                │
         │ quiz_history         │
         │ weak_areas           │
         │ learning_guidance    │
         │ chat_history         │
         └──────────────────────┘
```

---

## 🐛 Troubleshooting

**404 error on quiz generate**
```
httpx.HTTPStatusError: 404 Not Found for url '.../api/generate'
```
Run `ollama pull llama3:8b` — the model isn't downloaded yet.

**bcrypt version error**
```bash
pip install bcrypt==4.0.1
```

**pdfplumber or fitz not found**
```bash
pip install pdfplumber pymupdf
```

**Port 8000 already in use**
```bash
uvicorn main:app --reload --port 8001
# Update frontend/src/api.js → change baseURL port to 8001
```

**ChromaDB error on first run**
Delete `backend/chroma_db/` folder and restart backend — it recreates automatically.

**Quiz says "no context" after upload**
Click **Clear** in the Documents tab → re-upload → wait for "RAG Pipeline Ready" → generate quiz.

---

## 📦 Requirements

```
fastapi
uvicorn
python-multipart
python-jose[cryptography]
bcrypt==4.0.1
pydantic
httpx
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

```bash
git checkout -b feature/your-feature
git commit -m "Add: your feature description"
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
Building intelligent full-stack AI systems for document understanding and adaptive learning.

[![GitHub](https://img.shields.io/badge/GitHub-tanishipss-black?style=flat-square&logo=github)](https://github.com/tanishipss)

---

<div align="center">

⭐ **Star this repo if you found it useful!**

*DocuMind AI — transforming static documents into intelligent learning companions.*

</div>
