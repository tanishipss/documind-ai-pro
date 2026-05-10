"""
test_quiz.py — uploads a sample doc then generates a quiz in ONE session.
Run: python test_quiz.py
"""
import httpx, json, asyncio, os

BASE  = "http://localhost:8000/api"
EMAIL = "test@example.com"
PASS  = "testpassword"

SAMPLE_TEXT = """
Machine Learning Overview

Machine learning is a subset of artificial intelligence that enables systems
to learn and improve from experience without being explicitly programmed.

Types of Machine Learning:

1. Supervised Learning
Supervised learning uses labeled training data to learn a mapping between
inputs and outputs. The goal is to minimize prediction error on unseen data.
Common algorithms include linear regression, decision trees, and neural networks.

2. Unsupervised Learning
Unsupervised learning finds hidden patterns in data without labeled responses.
Clustering and dimensionality reduction are common unsupervised techniques.
K-means clustering groups similar data points together.

3. Reinforcement Learning
Reinforcement learning trains agents to make decisions by rewarding good actions.
The agent learns a policy that maximizes cumulative reward over time.

Key Concepts:

- Overfitting: When a model learns noise in training data and performs poorly on new data.
- Underfitting: When a model is too simple to capture underlying patterns.
- Cross-validation: A technique to evaluate model performance on unseen data.
- Gradient descent: An optimization algorithm that minimizes a loss function.
- Hyperparameters: Settings configured before training, like learning rate and depth.

Neural Networks:
Neural networks consist of layers of interconnected nodes called neurons.
Deep learning uses neural networks with many layers to learn complex representations.
Backpropagation is used to calculate gradients and update network weights.
"""

async def main():
    async with httpx.AsyncClient(timeout=300) as c:

        # ── 1. Ensure user exists (signup or login) ───────────────────────────
        r = await c.post(f"{BASE}/auth/signup",
                         json={"email": EMAIL, "password": PASS, "name": "Test User"})
        if r.status_code == 400 and "already registered" in r.text:
            r = await c.post(f"{BASE}/auth/login",
                             json={"email": EMAIL, "password": PASS})
        
        print("Auth status:", r.status_code)
        token = r.json().get("access_token")
        if not token:
            print("ERROR: No token —", r.json())
            return
        headers = {"Authorization": f"Bearer {token}"}
        print("Token OK")

        # ── 2. Write and upload sample.txt ────────────────────────────────────
        with open("sample.txt", "w") as f:
            f.write(SAMPLE_TEXT)

        with open("sample.txt", "rb") as f:
            r = await c.post(f"{BASE}/documents/upload",
                             headers=headers,
                             files={"files": ("sample.txt", f, "text/plain")})
        print("Upload status:", r.status_code)
        if r.status_code != 200:
            print("Upload ERROR:", r.text)
            return
        upload_data = r.json()
        print("Uploaded docs:", [d["filename"] for d in upload_data.get("documents", [])])
        chunks = upload_data.get("rag", {}).get("chunks_indexed", 0)
        print(f"RAG chunks indexed: {chunks}")

        # ── 3. Verify session has docs ────────────────────────────────────────
        r = await c.get(f"{BASE}/documents/session", headers=headers)
        print("Session:", r.status_code, r.json())
        if not r.json().get("has_docs"):
            print("ERROR: Session shows no docs after upload!")
            return

        # ── 4. Generate quiz ──────────────────────────────────────────────────
        print("\nGenerating quiz (this may take 30-90s with llama3:8b)...")
        r = await c.post(f"{BASE}/ai/quiz/generate",
                         headers=headers,
                         json={"difficulty": "medium", "num_questions": 10})
        print("Quiz status:", r.status_code)
        
        if r.status_code == 200:
            data = r.json()
            qs   = data.get("questions", [])
            print(f"\n✓ Got {len(qs)} questions")
            print(f"  RAG info: {data.get('rag_info', {})}")
            for q in qs[:3]:
                print(f"\n  Q{q['id']}: {q['question']}")
                print(f"  Options: {q.get('options', [])}")
                print(f"  Correct: {q.get('correct', 'MISSING!')}")
                print(f"  Type: {q.get('section_type', '?')}")
        else:
            print("Quiz ERROR:", r.status_code)
            try:
                print(r.json())
            except Exception:
                print(r.text)

asyncio.run(main())