#!/usr/bin/env bash
set -euo pipefail
if [ "$#" -ne 1 ]; then
  echo "Usage: ./scripts/checkpoint.sh M1"
  exit 1
fi
MILESTONE="$1"
git add .
git commit -m "Approve milestone ${MILESTONE}"
git tag -a "milestone/${MILESTONE}" -m "Approved milestone ${MILESTONE}"
echo "Created approved checkpoint: milestone/${MILESTONE}"
