from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import uvicorn
from datetime import datetime

from auth import router as auth_router
from documents import router as docs_router
from ai_features import router as ai_router

app = FastAPI(title="DocuMind AI — RAG Edition", version="2.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router,  prefix="/api/auth",      tags=["auth"])
app.include_router(docs_router,  prefix="/api/documents", tags=["documents"])
app.include_router(ai_router,    prefix="/api/ai",        tags=["ai"])

@app.get("/api/health")
async def health():
    return {"status": "ok", "version": "2.0.0-rag", "timestamp": datetime.utcnow().isoformat()}

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
