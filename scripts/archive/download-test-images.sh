#!/bin/bash
# Bash script to download crop disease test images
# This is a wrapper for the Python script

set -e

echo "============================================================"
echo "  Crop Disease Test Image Downloader (Bash)"
echo "============================================================"
echo ""

# Check if Python is installed
if ! command -v python3 &> /dev/null; then
    echo "❌ Python 3 not found!"
    echo "   Please install Python 3.8+ from https://www.python.org/"
    exit 1
fi

PYTHON_VERSION=$(python3 --version)
echo "✓ Python found: $PYTHON_VERSION"

# Check if pip is available
if ! command -v pip3 &> /dev/null; then
    echo "❌ pip3 not found!"
    echo "   Please ensure pip is installed with Python"
    exit 1
fi

PIP_VERSION=$(pip3 --version)
echo "✓ pip found: $PIP_VERSION"

echo ""
echo "📦 Installing required packages..."

# Install requirements
pip3 install -q -r scripts/test-image-requirements.txt

if [ $? -ne 0 ]; then
    echo "❌ Failed to install required packages"
    exit 1
fi

echo "✓ Packages installed successfully"
echo ""

# Run the Python script
echo "🚀 Starting download..."
echo ""

python3 scripts/download-test-images.py

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ All done! Test images are ready in test-images/ directory"
else
    echo ""
    echo "❌ Download failed. Please check the error messages above."
    exit 1
fi
