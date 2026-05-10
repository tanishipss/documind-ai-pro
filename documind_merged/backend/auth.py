from fastapi import APIRouter, HTTPException, Depends, BackgroundTasks
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel
from jose import JWTError, jwt
from datetime import datetime, timedelta
from typing import Optional
import bcrypt, smtplib, os
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

from database import (
    create_user, get_user, user_exists, init_db,
    verify_email_token, mark_verified, is_verified,
    refresh_verification_token,
    save_quiz, upsert_weak_area, save_guidance,
    get_quiz_history, get_weak_areas, get_guidance, get_accuracy_trend,
)

init_db()

router   = APIRouter()
security = HTTPBearer()

SECRET_KEY  = "documind-rag-secret-2024"
ALGORITHM   = "HS256"
EXPIRE_DAYS = 7

# ── Email config (set these env vars or edit directly) ────────────────────────
SMTP_HOST     = os.environ.get("SMTP_HOST",     "smtp.gmail.com")
SMTP_PORT     = int(os.environ.get("SMTP_PORT", "587"))
SMTP_USER     = os.environ.get("SMTP_USER",     "")   # your Gmail
SMTP_PASSWORD = os.environ.get("SMTP_PASSWORD", "")   # app password
APP_URL       = os.environ.get("APP_URL",       "http://localhost:5173")
EMAIL_ENABLED = bool(SMTP_USER and SMTP_PASSWORD)

# ── JWT ───────────────────────────────────────────────────────────────────────

def create_token(email: str) -> str:
    exp = datetime.utcnow() + timedelta(days=EXPIRE_DAYS)
    return jwt.encode({"sub": email, "exp": exp}, SECRET_KEY, algorithm=ALGORITHM)

async def get_current_user(creds: HTTPAuthorizationCredentials = Depends(security)):
    try:
        payload = jwt.decode(creds.credentials, SECRET_KEY, algorithms=[ALGORITHM])
        email   = payload.get("sub")
        if not email: raise HTTPException(401, "Invalid token")
        user = get_user(email)
        if not user:  raise HTTPException(401, "User not found")
        return {"email": user["email"], "name": user["name"], "is_verified": bool(user.get("is_verified", 0))}
    except JWTError:
        raise HTTPException(401, "Invalid token")

# ── Password ──────────────────────────────────────────────────────────────────

def hash_password(p: str) -> str:
    return bcrypt.hashpw(p.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")

def verify_password(plain: str, hashed: str) -> bool:
    return bcrypt.checkpw(plain.encode("utf-8"), hashed.encode("utf-8"))

# ── Email sending ─────────────────────────────────────────────────────────────

def send_verification_email(to_email: str, name: str, token: str):
    if not EMAIL_ENABLED:
        print(f"[EMAIL DISABLED] Verification token for {to_email}: {token}")
        print(f"[EMAIL DISABLED] Verify URL: {APP_URL}/verify-email?token={token}")
        return
    try:
        link = f"{APP_URL}/verify-email?token={token}"
        msg  = MIMEMultipart("alternative")
        msg["Subject"] = "Verify your DocuMind AI account"
        msg["From"]    = SMTP_USER
        msg["To"]      = to_email
        html = f"""
        <div style="font-family:sans-serif;max-width:480px;margin:auto;padding:32px;background:#fdf2f8;border-radius:16px">
          <h2 style="color:#ec4899;font-family:Georgia,serif">Welcome to DocuMind AI 📚</h2>
          <p>Hi {name},</p>
          <p>Click the button below to verify your email address.</p>
          <a href="{link}" style="display:inline-block;background:linear-gradient(135deg,#f472b6,#ec4899);color:white;padding:12px 28px;border-radius:8px;text-decoration:none;font-weight:700;margin:16px 0">
            Verify Email →
          </a>
          <p style="color:#9c7fb5;font-size:13px">Link expires in 24 hours. If you didn't sign up, ignore this email.</p>
        </div>"""
        msg.attach(MIMEText(html, "html"))
        with smtplib.SMTP(SMTP_HOST, SMTP_PORT) as server:
            server.starttls()
            server.login(SMTP_USER, SMTP_PASSWORD)
            server.sendmail(SMTP_USER, to_email, msg.as_string())
    except Exception as e:
        print(f"[EMAIL ERROR] {e}")

# ── Models ────────────────────────────────────────────────────────────────────

class SignupRequest(BaseModel):
    email:    str
    password: str
    name:     str

class LoginRequest(BaseModel):
    email:    str
    password: str

# ── Routes ────────────────────────────────────────────────────────────────────

@router.post("/signup")
async def signup(req: SignupRequest, bg: BackgroundTasks):
    if user_exists(req.email):
        raise HTTPException(400, "Email already registered")
    if len(req.password) < 6:
        raise HTTPException(400, "Password must be at least 6 characters")
    token = create_user(req.email, req.name, hash_password(req.password))
    bg.add_task(send_verification_email, req.email, req.name, token)
    jwt_token = create_token(req.email)
    return {
        "access_token": jwt_token, "token_type": "bearer",
        "user": {"email": req.email, "name": req.name, "is_verified": False},
        "message": "Account created! Check your email to verify." if EMAIL_ENABLED
                   else f"Account created! (Email disabled — dev token in server console)",
        "email_enabled": EMAIL_ENABLED,
        "dev_token": token if not EMAIL_ENABLED else None,
    }

@router.post("/login")
async def login(req: LoginRequest):
    user = get_user(req.email)
    if not user or not verify_password(req.password, user["password"]):
        raise HTTPException(401, "Invalid credentials")
    jwt_token = create_token(req.email)
    return {
        "access_token": jwt_token, "token_type": "bearer",
        "user": {"email": user["email"], "name": user["name"],
                 "is_verified": bool(user.get("is_verified", 0))},
    }

@router.get("/verify-email")
async def verify_email(token: str):
    email = verify_email_token(token)
    if not email:
        raise HTTPException(400, "Invalid or expired verification token")
    mark_verified(email)
    return {"message": "Email verified! You can now use all features.", "email": email}

@router.post("/resend-verification")
async def resend_verification(bg: BackgroundTasks, current_user: dict = Depends(get_current_user)):
    if is_verified(current_user["email"]):
        return {"message": "Already verified"}
    user  = get_user(current_user["email"])
    token = refresh_verification_token(current_user["email"])
    bg.add_task(send_verification_email, current_user["email"], user["name"], token)
    return {"message": "Verification email resent", "dev_token": token if not EMAIL_ENABLED else None}

@router.get("/me")
async def me(current_user: dict = Depends(get_current_user)):
    return current_user

@router.post("/save-score")
async def save_score(data: dict, current_user: dict = Depends(get_current_user)):
    email = current_user["email"]
    save_quiz(
        email=email, score=data.get("score", 0), total=data.get("total", 10),
        difficulty=data.get("difficulty", "medium"), topic=data.get("topic", "Document Quiz"),
        doc_names=data.get("doc_names", ""), mode=data.get("mode", "standard"),
    )
    for area in data.get("weak_areas", []):
        upsert_weak_area(email, area)
    for topic, passage in data.get("guidance_passages", {}).items():
        save_guidance(email, topic, passage, data.get("doc_names", ""))
    return {"message": "Score saved"}

@router.get("/progress")
async def get_progress(current_user: dict = Depends(get_current_user)):
    email = current_user["email"]
    return {
        "scores":         get_quiz_history(email, limit=100),
        "weak_areas":     get_weak_areas(email),
        "guidance":       get_guidance(email),
        "accuracy_trend": get_accuracy_trend(email, limit=20),
    }

@router.get("/quiz-history")
async def quiz_history(current_user: dict = Depends(get_current_user)):
    return {"history": get_quiz_history(current_user["email"], limit=100)}
