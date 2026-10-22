#!/usr/bin/env bash
# Install a macOS LaunchAgent that runs scripts/sync-to-github.sh daily.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SYNC="${ROOT}/scripts/sync-to-github.sh"
LABEL="com.ferdinandsorg.road-to-athen.github-sync"
PLIST="${HOME}/Library/LaunchAgents/${LABEL}.plist"
LOG_DIR="${ROOT}/.cursor/logs"
mkdir -p "$LOG_DIR" "${HOME}/Library/LaunchAgents"

chmod +x "$SYNC"

# Default: every day at 20:00 local time. Override with SYNC_HOUR / SYNC_MINUTE.
HOUR="${SYNC_HOUR:-20}"
MINUTE="${SYNC_MINUTE:-0}"

cat >"$PLIST" <<EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key>
  <string>${LABEL}</string>
  <key>WorkingDirectory</key>
  <string>${ROOT}</string>
  <key>ProgramArguments</key>
  <array>
    <string>/bin/bash</string>
    <string>${SYNC}</string>
  </array>
  <key>StartCalendarInterval</key>
  <dict>
    <key>Hour</key>
    <integer>${HOUR}</integer>
    <key>Minute</key>
    <integer>${MINUTE}</integer>
  </dict>
  <key>StandardOutPath</key>
  <string>${LOG_DIR}/github-sync.launchd.out.log</string>
  <key>StandardErrorPath</key>
  <string>${LOG_DIR}/github-sync.launchd.err.log</string>
  <key>RunAtLoad</key>
  <false/>
</dict>
</plist>
EOF

launchctl bootout "gui/$(id -u)/${LABEL}" 2>/dev/null || true
launchctl bootstrap "gui/$(id -u)" "$PLIST"
launchctl enable "gui/$(id -u)/${LABEL}" 2>/dev/null || true

echo "Installed LaunchAgent: ${LABEL}"
echo "Schedule: every day at ${HOUR}:$(printf '%02d' "$MINUTE") (local time)"
echo "Manual run:  ${SYNC}"
echo "Logs:        ${LOG_DIR}/github-sync.log"
echo "Unload:      launchctl bootout gui/\$(id -u)/${LABEL}"
