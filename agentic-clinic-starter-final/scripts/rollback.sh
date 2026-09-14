#!/usr/bin/env bash
set -euo pipefail
if [ "$#" -ne 1 ]; then
  echo "Usage: ./scripts/rollback.sh M1"
  exit 1
fi
MILESTONE="$1"
BRANCH="rejected-$(date +%Y%m%d-%H%M%S)"
git branch "$BRANCH"
git reset --hard "milestone/$MILESTONE"
echo "Rollback complete. Rejected work preserved on $BRANCH"
