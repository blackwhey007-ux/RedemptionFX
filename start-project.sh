#!/bin/bash

echo ""
echo "========================================"
echo "   RedemptionFX Platform Startup"
echo "========================================"
echo ""

echo "Checking if Node.js is installed..."
if ! command -v node &> /dev/null; then
    echo "ERROR: Node.js is not installed!"
    echo "Please install Node.js from https://nodejs.org"
    exit 1
fi

echo "Node.js found! Checking project directory..."
if [ ! -f "package.json" ]; then
    echo "ERROR: Not in the correct project directory!"
    echo "Please navigate to the redemptionfx-platform folder"
    exit 1
fi

echo "Project directory found! Installing dependencies..."
npm install

echo ""
echo "Dependencies installed! Starting development server..."
echo ""
echo "========================================"
echo "   Server will start on http://localhost:3000"
echo "   Press Ctrl+C to stop the server"
echo "========================================"
echo ""

npm run dev

