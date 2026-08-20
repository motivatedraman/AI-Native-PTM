#!/usr/bin/env bash
pkill -f "uvicorn backend.app.main" 2>/dev/null
pkill -f "vite" 2>/dev/null
echo "Stopped."
