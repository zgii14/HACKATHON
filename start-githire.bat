@echo off
title GitHire - Start All Servers
echo ========================================
echo   GitHire - Starting All Servers
echo ========================================
echo.

echo [1/2] Starting Backend (FastAPI port 8000)...
start "GitHire Backend" cmd /k "cd /d C:\Users\muham\Downloads\HACKATHON\backend && .venv\Scripts\python -m uvicorn app.main:app --reload --port 8000"

timeout /t 3 /nobreak > nul

echo [2/2] Starting Frontend (Next.js port 3000)...
start "GitHire Frontend" cmd /k "cd /d C:\Users\muham\Downloads\HACKATHON\linkify && npm run dev"

echo.
echo ========================================
echo   Servers starting in separate windows!
echo   Backend:  http://localhost:8000
echo   Frontend: http://localhost:3000
echo ========================================
echo.
echo Tunggu 5-10 detik lalu buka browser ke:
echo http://localhost:3000
echo.
pause
