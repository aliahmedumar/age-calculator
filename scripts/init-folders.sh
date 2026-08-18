#!/usr/bin/env bash
set -euo pipefail

ROOT_MEDIA_PATH="${ROOT_MEDIA_PATH:-/srv/media}"
PUID="${PUID:-1000}"
PGID="${PGID:-1000}"

mkdir -p \
  "$ROOT_MEDIA_PATH/movies" \
  "$ROOT_MEDIA_PATH/tv" \
  "$ROOT_MEDIA_PATH/torrents/incomplete" \
  "$ROOT_MEDIA_PATH/torrents/complete" \
  "$ROOT_MEDIA_PATH/torrents/watch"

if command -v chown >/dev/null 2>&1; then
  chown -R "$PUID:$PGID" "$ROOT_MEDIA_PATH"
fi

chmod -R 775 "$ROOT_MEDIA_PATH"

echo "Media folders initialized at $ROOT_MEDIA_PATH"
