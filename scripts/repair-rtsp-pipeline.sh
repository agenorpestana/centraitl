#!/usr/bin/env bash
set -euo pipefail

# Central ITL - RTSP live/recording repair helper
# Applies non-destructive runtime cleanup so RTSP cameras regenerate HLS playlists
# with the current server fixes. RTMP sources are not touched.

HLS_DIR="${HLS_DIR:-/tmp/hls}"
APP_NAME="${APP_NAME:-centraitl}"

echo "[ITL] Verificando dependências..."
command -v ffmpeg >/dev/null || { echo "ffmpeg não encontrado" >&2; exit 1; }
command -v ffprobe >/dev/null || { echo "ffprobe não encontrado" >&2; exit 1; }

mkdir -p "$HLS_DIR"

echo "[ITL] Removendo somente playlists/segmentos HLS RTSP antigos/órfãos (sem apagar gravações MP4)..."
find "$HLS_DIR" -maxdepth 1 -type f \( -name 'cam_*.m3u8' -o -name 'cam_*.ts' -o -name 'cam-*.m3u8' -o -name 'cam-*.ts' \) -mmin +5 -print -delete || true

echo "[ITL] Reiniciando processo Node/PM2, se existir, para carregar as correções..."
if command -v pm2 >/dev/null && pm2 describe "$APP_NAME" >/dev/null 2>&1; then
  pm2 restart "$APP_NAME" --update-env
else
  echo "[ITL] PM2 app '$APP_NAME' não encontrado; reinicie o servidor manualmente (npm run build && npm start ou npm run dev)."
fi

echo "[ITL] Concluído. RTMP não foi alterado; RTSP será regenerado sob demanda ao abrir /live/cam_<id>_sub.m3u8."
