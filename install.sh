#!/usr/bin/env bash
#
# Agdi installation script
#
set -e

echo "[1/3] Checking prerequisites..."
if ! command -v node >/dev/null 2>&1; then
  echo "Error: Node.js is required but not installed."
  echo "Please download Node.js (v22.14+) from https://nodejs.org/"
  exit 1
fi

if ! command -v npm >/dev/null 2>&1; then
  echo "Error: npm is required but not installed."
  exit 1
fi

echo "[2/3] Installing Agdi globally via npm..."
npm install -g agdi

echo "[3/3] Installation complete!"
echo "✨ You can now run 'agdi' in your terminal."
