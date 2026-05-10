"""
SQLite — users, quiz_history, weak_areas, learning_guidance,
         chat_history, email_verification
"""
import sqlite3, os, secrets
from datetime import datetime, timedelta
from typing import Optional

DB_PATH = "documind.db"

def get_conn():
    conn = sqlite3.connect(DB_PATH, check_same_thread=False)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode=WAL")
    return conn

def init_db():
    conn = get_conn(); c = conn.cursor()
    c.executescript("""
        CREATE TABLE IF NOT EXISTS users (
            email           TEXT PRIMARY KEY,
            name            TEXT NOT NULL,
            password        TEXT NOT NULL,
            created_at      TEXT NOT NULL,
            is_verified     INTEGER DEFAULT 0,
            verification_token TEXT DEFAULT NULL,
            token_expires   TEXT DEFAULT NULL
        );
        CREATE TABLE IF NOT EXISTS quiz_history (
            id         INTEGER PRIMARY KEY AUTOINCREMENT,
            email      TEXT NOT NULL,
            score      INTEGER NOT NULL,
            total      INTEGER NOT NULL,
            difficulty TEXT NOT NULL,
            topic      TEXT NOT NULL,
            accuracy   REAL NOT NULL,
            doc_names  TEXT DEFAULT '',
            mode       TEXT DEFAULT 'standard',
            timestamp  TEXT NOT NULL,
            FOREIGN KEY(email) REFERENCES users(email)
        );
        CREATE TABLE IF NOT EXISTS weak_areas (
            id         INTEGER PRIMARY KEY AUTOINCREMENT,
            email      TEXT NOT NULL,
            topic      TEXT NOT NULL,
            miss_count INTEGER DEFAULT 1,
            last_seen  TEXT NOT NULL,
            UNIQUE(email, topic)
        );
        CREATE TABLE IF NOT EXISTS learning_guidance (
            id         INTEGER PRIMARY KEY AUTOINCREMENT,
            email      TEXT NOT NULL,
            topic      TEXT NOT NULL,
            passage    TEXT NOT NULL,
            doc_name   TEXT DEFAULT '',
            created_at TEXT NOT NULL,
            UNIQUE(email, topic)
        );
        CREATE TABLE IF NOT EXISTS chat_history (
            id         INTEGER PRIMARY KEY AUTOINCREMENT,
            email      TEXT NOT NULL,
            role       TEXT NOT NULL,
            content    TEXT NOT NULL,
            doc_context TEXT DEFAULT '',
            timestamp  TEXT NOT NULL
        );
    """)
    # Migrate existing tables — add new columns if missing
    for col, definition in [
        ("is_verified",         "INTEGER DEFAULT 0"),
        ("verification_token",  "TEXT DEFAULT NULL"),
        ("token_expires",       "TEXT DEFAULT NULL"),
    ]:
        try:
            c.execute(f"ALTER TABLE users ADD COLUMN {col} {definition}")
        except Exception:
            pass
    for col, definition in [("mode", "TEXT DEFAULT 'standard'")]:
        try:
            c.execute(f"ALTER TABLE quiz_history ADD COLUMN {col} {definition}")
        except Exception:
            pass
    conn.commit(); conn.close()

# ── Users ─────────────────────────────────────────────────────────────────────

def create_user(email: str, name: str, hashed_pw: str) -> str:
    """Creates user and returns verification token."""
    token   = secrets.token_urlsafe(32)
    expires = (datetime.utcnow() + timedelta(hours=24)).isoformat()
    conn = get_conn()
    conn.execute(
        "INSERT INTO users (email,name,password,created_at,is_verified,verification_token,token_expires) VALUES (?,?,?,?,0,?,?)",
        (email, name, hashed_pw, datetime.utcnow().isoformat(), token, expires)
    )
    conn.commit(); conn.close()
    return token

def get_user(email: str) -> Optional[dict]:
    conn = get_conn()
    row  = conn.execute("SELECT * FROM users WHERE email=?", (email,)).fetchone()
    conn.close()
    return dict(row) if row else None

def user_exists(email: str) -> bool:
    return get_user(email) is not None

def verify_email_token(token: str) -> Optional[str]:
    """Returns email if token valid and not expired, else None."""
    conn = get_conn()
    row  = conn.execute(
        "SELECT email, token_expires FROM users WHERE verification_token=?", (token,)
    ).fetchone()
    conn.close()
    if not row: return None
    if datetime.utcnow() > datetime.fromisoformat(row["token_expires"]): return None
    return row["email"]

def mark_verified(email: str):
    conn = get_conn()
    conn.execute(
        "UPDATE users SET is_verified=1, verification_token=NULL, token_expires=NULL WHERE email=?",
        (email,)
    )
    conn.commit(); conn.close()

def is_verified(email: str) -> bool:
    user = get_user(email)
    return bool(user and user.get("is_verified", 0))

def refresh_verification_token(email: str) -> str:
    token   = secrets.token_urlsafe(32)
    expires = (datetime.utcnow() + timedelta(hours=24)).isoformat()
    conn = get_conn()
    conn.execute(
        "UPDATE users SET verification_token=?, token_expires=? WHERE email=?",
        (token, expires, email)
    )
    conn.commit(); conn.close()
    return token

# ── Quiz History ──────────────────────────────────────────────────────────────

def save_quiz(email: str, score: int, total: int, difficulty: str,
              topic: str, doc_names: str = "", mode: str = "standard"):
    accuracy = round((score / total) * 100, 1) if total else 0
    conn = get_conn()
    conn.execute(
        "INSERT INTO quiz_history (email,score,total,difficulty,topic,accuracy,doc_names,mode,timestamp) VALUES (?,?,?,?,?,?,?,?,?)",
        (email, score, total, difficulty, topic, accuracy, doc_names, mode, datetime.utcnow().isoformat())
    )
    conn.commit(); conn.close()

def get_quiz_history(email: str, limit: int = 100) -> list:
    conn = get_conn()
    rows = conn.execute(
        "SELECT * FROM quiz_history WHERE email=? ORDER BY timestamp DESC LIMIT ?",
        (email, limit)
    ).fetchall()
    conn.close()
    return [dict(r) for r in rows]

def get_accuracy_trend(email: str, limit: int = 20) -> list:
    conn = get_conn()
    rows = conn.execute(
        "SELECT accuracy,difficulty,topic,timestamp,score,total,mode FROM quiz_history WHERE email=? ORDER BY timestamp ASC LIMIT ?",
        (email, limit)
    ).fetchall()
    conn.close()
    return [dict(r) for r in rows]

# ── Weak Areas ────────────────────────────────────────────────────────────────

def upsert_weak_area(email: str, topic: str):
    conn = get_conn(); now = datetime.utcnow().isoformat()
    conn.execute(
        "INSERT INTO weak_areas (email,topic,miss_count,last_seen) VALUES (?,?,1,?) ON CONFLICT(email,topic) DO UPDATE SET miss_count=miss_count+1, last_seen=excluded.last_seen",
        (email, topic, now)
    )
    conn.commit(); conn.close()

def get_weak_areas(email: str) -> list:
    conn = get_conn()
    rows = conn.execute(
        "SELECT topic,miss_count,last_seen FROM weak_areas WHERE email=? ORDER BY miss_count DESC",
        (email,)
    ).fetchall()
    conn.close()
    return [dict(r) for r in rows]

# ── Learning Guidance ─────────────────────────────────────────────────────────

def save_guidance(email: str, topic: str, passage: str, doc_name: str = ""):
    conn = get_conn(); now = datetime.utcnow().isoformat()
    conn.execute(
        "INSERT INTO learning_guidance (email,topic,passage,doc_name,created_at) VALUES (?,?,?,?,?) ON CONFLICT(email,topic) DO UPDATE SET passage=excluded.passage, doc_name=excluded.doc_name, created_at=excluded.created_at",
        (email, topic, passage, doc_name, now)
    )
    conn.commit(); conn.close()

def get_guidance(email: str) -> list:
    conn = get_conn()
    rows = conn.execute(
        "SELECT topic,passage,doc_name,created_at FROM learning_guidance WHERE email=? ORDER BY created_at DESC",
        (email,)
    ).fetchall()
    conn.close()
    return [dict(r) for r in rows]

# ── Chat History ──────────────────────────────────────────────────────────────

def save_chat_message(email: str, role: str, content: str, doc_context: str = ""):
    conn = get_conn()
    conn.execute(
        "INSERT INTO chat_history (email,role,content,doc_context,timestamp) VALUES (?,?,?,?,?)",
        (email, role, content, doc_context, datetime.utcnow().isoformat())
    )
    conn.commit(); conn.close()

def get_chat_history(email: str, limit: int = 50) -> list:
    conn = get_conn()
    rows = conn.execute(
        "SELECT role,content,timestamp FROM chat_history WHERE email=? ORDER BY timestamp DESC LIMIT ?",
        (email, limit)
    ).fetchall()
    conn.close()
    return list(reversed([dict(r) for r in rows]))

def clear_chat_history(email: str):
    conn = get_conn()
    conn.execute("DELETE FROM chat_history WHERE email=?", (email,))
    conn.commit(); conn.close()

init_db()
