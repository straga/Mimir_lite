#!/bin/bash
# Install mimir-lite as macOS launchd service
# Usage: ./install.sh

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
MIMIR_LITE_PATH="$(dirname "$SCRIPT_DIR")"
PLIST_NAME="com.mimir-lite.plist"
LAUNCH_AGENTS_DIR="$HOME/Library/LaunchAgents"

echo "Installing mimir-lite service..."
echo "Mimir-lite path: $MIMIR_LITE_PATH"

# Create logs directory
mkdir -p "$MIMIR_LITE_PATH/logs"

# Find bun path
BUN_PATH=$(which bun)
if [ -z "$BUN_PATH" ]; then
    echo "Error: bun not found in PATH"
    exit 1
fi
echo "Bun path: $BUN_PATH"

# Check if build exists
if [ ! -f "$MIMIR_LITE_PATH/build/http-server.js" ]; then
    echo "Error: build/http-server.js not found. Run 'npm run build' first."
    exit 1
fi

# Create LaunchAgents directory if needed
mkdir -p "$LAUNCH_AGENTS_DIR"

# Generate plist with actual paths
sed -e "s|MIMIR_LITE_PATH|$MIMIR_LITE_PATH|g" \
    -e "s|BUN_PATH|$BUN_PATH|g" \
    "$SCRIPT_DIR/$PLIST_NAME" > "$LAUNCH_AGENTS_DIR/$PLIST_NAME"

echo "Installed plist to: $LAUNCH_AGENTS_DIR/$PLIST_NAME"

# Unload if already loaded
launchctl unload "$LAUNCH_AGENTS_DIR/$PLIST_NAME" 2>/dev/null || true

# Load the service
launchctl load "$LAUNCH_AGENTS_DIR/$PLIST_NAME"

echo ""
echo "Service installed and started!"
echo ""
echo "Commands:"
echo "  Status:  launchctl list | grep mimir"
echo "  Stop:    launchctl unload ~/Library/LaunchAgents/$PLIST_NAME"
echo "  Start:   launchctl load ~/Library/LaunchAgents/$PLIST_NAME"
echo "  Logs:    tail -f $MIMIR_LITE_PATH/logs/mimir.log"
echo "  Errors:  tail -f $MIMIR_LITE_PATH/logs/mimir-error.log"
echo ""
echo "Test: curl http://localhost:3000/health"
