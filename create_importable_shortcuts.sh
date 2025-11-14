#!/bin/bash
# This script generates actual .shortcut files you can import to iOS
# Requires: Node.js and shortcuts-js

echo "🔧 Creating importable iOS Shortcut files"
echo ""

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed"
    echo "📦 Install from: https://nodejs.org"
    echo ""
    echo "After installing Node.js, run:"
    echo "  npm install -g shortcuts-js"
    echo "  bash create_importable_shortcuts.sh"
    exit 1
fi

# Check if shortcuts-js is installed
if ! command -v shortcuts &> /dev/null; then
    echo "📦 Installing shortcuts-js..."
    npm install -g shortcuts-js
fi

echo "⚠️  Note: shortcuts-js may not support all action types"
echo "    The manual method (using .md files) is more reliable"
echo ""
echo "For now, use the generated .md instruction files to"
echo "manually create the shortcuts in the iOS Shortcuts app."
echo ""
echo "Files available:"
echo "  - SHORTCUT_1_UPDATE.md (follow these steps)"
echo "  - SHORTCUT_2_DISPLAY.md (follow these steps)"
echo ""
echo "💡 Alternative: Search RoutineHub.co for similar shortcuts"
echo "   that you can modify with your NWS URL"
