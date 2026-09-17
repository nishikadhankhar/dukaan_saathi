#!/usr/bin/env bash
# Dukaan Saathi -- one command to run the whole demo.
set -e
cd "$(dirname "$0")"

echo "==> checking python packages"
python3 -c "import fastapi, uvicorn, pandas, numpy" 2>/dev/null || pip3 install -q -r backend/requirements.txt

if [ ! -d frontend/dist ]; then
  echo "==> building the interface (first run only)"
  (cd frontend && npm install --silent && npm run build)
fi

echo
echo "  Dukaan Saathi is starting on http://127.0.0.1:8000"
echo "  Use Chrome -- the Soundbox voice needs it."
echo
cd backend && exec python3 -m uvicorn app.main:app --host 127.0.0.1 --port 8000
