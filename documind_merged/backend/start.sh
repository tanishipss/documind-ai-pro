#!/bin/bash
# DocuMind AI - Backend Startup Script

echo "🌸 Starting DocuMind Backend..."
echo ""

# Check Python
if ! command -v python3 &> /dev/null; then
    echo "❌ Python3 not found. Please install Python 3.9+"
    exit 1
fi

# Check pip packages
echo "📦 Installing Python dependencies..."
pip install fastapi uvicorn python-multipart "python-jose[cryptography]" "passlib[bcrypt]" pydantic pydantic-settings httpx PyPDF2 python-docx aiofiles -q

echo ""
echo "✅ Dependencies installed"
echo ""
echo "🚀 Starting FastAPI server on http://localhost:8000"
echo "   📖 API docs: http://localhost:8000/docs"
echo ""

cd "$(dirname "$0")"
python3 main.py
