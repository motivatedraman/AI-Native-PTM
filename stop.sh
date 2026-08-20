#!/usr/bin/env bash
pkill -f "uvicorn.*backend.app.main" 2>/dev/null || true
pkill -f "vite" 2>/dev/null || true
sleep 1
echo "Stopped."
