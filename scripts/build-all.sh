#!/bin/bash

# Copyright © 2025-2026 Cameron Fox. All rights reserved.
# Licensed under the Apache License, Version 2.0

set -e

echo "🚀 Building Nexus AI Pro for all platforms..."
echo ""

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Build web app first
echo -e "${BLUE}📦 Building web application...${NC}"
cd "$(dirname "$0")/.."
npm run build
echo -e "${GREEN}✓ Web build complete${NC}"
echo ""

# Build desktop applications
echo -e "${BLUE}🖥️  Building desktop applications...${NC}"
cd desktop

# Windows
echo -e "${BLUE}Building for Windows...${NC}"
npm run build:win
echo -e "${GREEN}✓ Windows build complete${NC}"
echo ""

# macOS
echo -e "${BLUE}Building for macOS...${NC}"
npm run build:mac
echo -e "${GREEN}✓ macOS build complete${NC}"
echo ""

# Linux
echo -e "${BLUE}Building for Linux...${NC}"
npm run build:linux
echo -e "${GREEN}✓ Linux build complete${NC}"
echo ""

echo -e "${GREEN}✨ All builds complete!${NC}"
echo ""
echo "📂 Build artifacts:"
echo "   Windows: desktop/dist-electron/Nexus AI Pro Setup *.exe"
echo "   macOS:   desktop/dist-electron/Nexus AI Pro-*.dmg"
echo "   Linux:   desktop/dist-electron/nexus-ai-pro-*.AppImage"
echo "            desktop/dist-electron/nexus-ai-pro_*.deb"
echo "            desktop/dist-electron/nexus-ai-pro-*.rpm"
echo ""
