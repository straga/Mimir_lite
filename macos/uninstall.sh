#!/bin/bash
# Uninstall mimir-lite macOS service
# Usage: ./uninstall.sh

PLIST_NAME="com.mimir-lite.plist"
LAUNCH_AGENTS_DIR="$HOME/Library/LaunchAgents"
PLIST_PATH="$LAUNCH_AGENTS_DIR/$PLIST_NAME"

if [ -f "$PLIST_PATH" ]; then
    echo "Stopping service..."
    launchctl unload "$PLIST_PATH" 2>/dev/null || true

    echo "Removing plist..."
    rm "$PLIST_PATH"

    echo "Service uninstalled."
else
    echo "Service not installed (plist not found)"
fi
