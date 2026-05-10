#!/bin/bash
# DocuMind AI - Frontend Startup Script

echo "🌿 Starting DocuMind Frontend..."
echo ""

cd "$(dirname "$0")"

if [ ! -d "node_modules" ]; then
    echo "📦 Installing Node dependencies..."
    npm install
fi

echo "🚀 Starting Vite dev server on http://localhost:5173"
echo ""

npm run dev
