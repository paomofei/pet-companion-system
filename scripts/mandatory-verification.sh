#!/usr/bin/env bash

set -euo pipefail

MODE="${1:-fast}"

echo "[verify] mode: ${MODE}"

echo "[verify] lint"
npm run lint

echo "[verify] typecheck"
npm run typecheck

if [[ "${MODE}" == "full" ]]; then
  echo "[verify] test"
  npm run test

  echo "[verify] build"
  npm run build
elif [[ "${MODE}" != "fast" ]]; then
  echo "[verify] unknown mode: ${MODE}"
  echo "[verify] use: fast | full"
  exit 2
fi

echo "[verify] done"
