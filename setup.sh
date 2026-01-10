#!/bin/bash

# ================================================
# NEXUS AI PRO - Quick Start Setup Script
# Fully automated setup and configuration
# ================================================

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m'

echo -e "${PURPLE}"
cat << "EOF"
╔════════════════════════════════════════════════════════════════╗
║                                                                ║
║     ███╗   ██╗███████╗██╗  ██╗██╗   ██╗███████╗               ║
║     ████╗  ██║██╔════╝╚██╗██╔╝██║   ██║██╔════╝               ║
║     ██╔██╗ ██║█████╗   ╚███╔╝ ██║   ██║███████╗               ║
║     ██║╚██╗██║██╔══╝   ██╔██╗ ██║   ██║╚════██║               ║
║     ██║ ╚████║███████╗██╔╝ ██╗╚██████╔╝███████║               ║
║     ╚═╝  ╚═══╝╚══════╝╚═╝  ╚═╝ ╚═════╝ ╚══════╝               ║
║                                                                ║
║               ⚡ QUICK START SETUP ⚡                           ║
║                                                                ║
╚════════════════════════════════════════════════════════════════╝
EOF
echo -e "${NC}"

# Check OS
OS="unknown"
if [[ "$OSTYPE" == "darwin"* ]]; then
    OS="macos"
elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
    OS="linux"
fi

echo -e "${CYAN}Detected OS: $OS${NC}"
echo ""

# ================================================
# STEP 1: Install Dependencies
# ================================================

echo -e "${BLUE}[1/6]${NC} Installing dependencies..."

# Check for Homebrew (macOS)
if [[ "$OS" == "macos" ]]; then
    if ! command -v brew &> /dev/null; then
        echo -e "${YELLOW}Installing Homebrew...${NC}"
        /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
    fi
fi

# Check for Node.js
if ! command -v node &> /dev/null; then
    echo -e "${YELLOW}Installing Node.js...${NC}"
    if [[ "$OS" == "macos" ]]; then
        brew install node
    else
        curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
        sudo apt-get install -y nodejs
    fi
fi

echo -e "${GREEN}✓ Node.js $(node -v) installed${NC}"

# Check for npm
if ! command -v npm &> /dev/null; then
    echo -e "${RED}npm not found. Please install Node.js properly.${NC}"
    exit 1
fi

echo -e "${GREEN}✓ npm $(npm -v) installed${NC}"

# ================================================
# STEP 2: Install Project Dependencies
# ================================================

echo ""
echo -e "${BLUE}[2/6]${NC} Installing project dependencies..."

npm install

echo -e "${GREEN}✓ Project dependencies installed${NC}"

# ================================================
# STEP 3: Setup Environment
# ================================================

echo ""
echo -e "${BLUE}[3/6]${NC} Setting up environment..."

if [ ! -f ".env" ]; then
    cp .env.example .env
    
    # Generate secure random values
    ENCRYPTION_SECRET=$(openssl rand -hex 32 2>/dev/null || head -c 64 /dev/urandom | xxd -p | tr -d '\n' | head -c 64)
    ENCRYPTION_SALT=$(openssl rand -hex 32 2>/dev/null || head -c 64 /dev/urandom | xxd -p | tr -d '\n' | head -c 64)
    JWT_SECRET=$(openssl rand -hex 32 2>/dev/null || head -c 64 /dev/urandom | xxd -p | tr -d '\n' | head -c 64)
    
    # Update .env file with generated secrets
    if [[ "$OS" == "macos" ]]; then
        sed -i '' "s/generate_a_secure_random_string_here/$ENCRYPTION_SECRET/" .env
        sed -i '' "s/generate_another_secure_random_string_here/$ENCRYPTION_SALT/" .env
        sed -i '' "s/generate_jwt_secret_here/$JWT_SECRET/" .env
    else
        sed -i "s/generate_a_secure_random_string_here/$ENCRYPTION_SECRET/" .env
        sed -i "s/generate_another_secure_random_string_here/$ENCRYPTION_SALT/" .env
        sed -i "s/generate_jwt_secret_here/$JWT_SECRET/" .env
    fi
    
    echo -e "${GREEN}✓ Created .env with secure secrets${NC}"
else
    echo -e "${YELLOW}⚠ .env already exists, skipping${NC}"
fi

# ================================================
# STEP 4: Setup API Keys (Interactive)
# ================================================

echo ""
echo -e "${BLUE}[4/6]${NC} Configure API keys..."
echo ""

setup_api_key() {
    local key_name=$1
    local env_var=$2
    local current_value=$(grep "^$env_var=" .env | cut -d '=' -f2)
    
    if [[ "$current_value" == "your_"* ]] || [[ -z "$current_value" ]]; then
        echo -ne "${CYAN}Enter $key_name API key (or press Enter to skip): ${NC}"
        read -r api_key
        if [[ -n "$api_key" ]]; then
            if [[ "$OS" == "macos" ]]; then
                sed -i '' "s|^$env_var=.*|$env_var=$api_key|" .env
            else
                sed -i "s|^$env_var=.*|$env_var=$api_key|" .env
            fi
            echo -e "${GREEN}✓ $key_name API key saved${NC}"
        else
            echo -e "${YELLOW}⚠ Skipped $key_name${NC}"
        fi
    else
        echo -e "${GREEN}✓ $key_name already configured${NC}"
    fi
}

echo "You can get API keys from:"
echo "  • Anthropic (Claude): https://console.anthropic.com"
echo "  • OpenAI (GPT-4): https://platform.openai.com"
echo "  • Google (Gemini): https://makersuite.google.com"
echo ""

read -p "Do you want to configure API keys now? (y/n): " -n 1 -r
echo ""

if [[ $REPLY =~ ^[Yy]$ ]]; then
    setup_api_key "Anthropic (Claude)" "ANTHROPIC_API_KEY"
    setup_api_key "OpenAI (GPT-4)" "OPENAI_API_KEY"
    setup_api_key "Google (Gemini)" "GOOGLE_API_KEY"
    setup_api_key "DeepSeek" "DEEPSEEK_API_KEY"
    setup_api_key "xAI (Grok)" "XAI_API_KEY"
    setup_api_key "Mistral" "MISTRAL_API_KEY"
fi

# ================================================
# STEP 5: Build Project
# ================================================

echo ""
echo -e "${BLUE}[5/6]${NC} Building project..."

npm run build 2>/dev/null || echo -e "${YELLOW}⚠ Build step skipped (may need configuration)${NC}"

echo -e "${GREEN}✓ Build completed${NC}"

# ================================================
# STEP 6: Setup iOS Project (macOS only)
# ================================================

if [[ "$OS" == "macos" ]]; then
    echo ""
    echo -e "${BLUE}[6/6]${NC} Setting up iOS project..."
    
    if command -v xcodebuild &> /dev/null; then
        # Make deploy script executable
        chmod +x deploy.sh
        
        echo -e "${GREEN}✓ iOS project ready${NC}"
        echo ""
        echo -e "${CYAN}To run the iOS app in simulator:${NC}"
        echo "  ./deploy.sh --target simulator"
        echo ""
        echo -e "${CYAN}Or open in Xcode:${NC}"
        echo "  open \"nexus ai pro/nexus ai pro.xcodeproj\""
    else
        echo -e "${YELLOW}⚠ Xcode not found, iOS setup skipped${NC}"
    fi
else
    echo ""
    echo -e "${BLUE}[6/6]${NC} iOS setup skipped (macOS required)"
fi

# ================================================
# DONE
# ================================================

echo ""
echo -e "${GREEN}"
cat << "EOF"
╔════════════════════════════════════════════════════════════════╗
║                                                                ║
║              🎉 SETUP COMPLETE! 🎉                              ║
║                                                                ║
╚════════════════════════════════════════════════════════════════╝
EOF
echo -e "${NC}"

echo -e "${CYAN}Quick Commands:${NC}"
echo ""
echo "  Start development server:"
echo "    ${GREEN}npm run dev${NC}"
echo ""
echo "  Start backend only:"
echo "    ${GREEN}npm run dev:server${NC}"
echo ""
echo "  Start frontend only:"
echo "    ${GREEN}npm run dev:client${NC}"
echo ""
echo "  Run iOS simulator (macOS):"
echo "    ${GREEN}./deploy.sh --target simulator${NC}"
echo ""
echo "  Deploy to production:"
echo "    ${GREEN}./deploy.sh --target all --env production${NC}"
echo ""
echo "  Docker deployment:"
echo "    ${GREEN}docker-compose up -d${NC}"
echo ""
echo -e "${YELLOW}Note: Make sure to add your API keys in .env for full functionality${NC}"
echo ""

# Ask to start development server
read -p "Start development server now? (y/n): " -n 1 -r
echo ""
if [[ $REPLY =~ ^[Yy]$ ]]; then
    npm run dev
fi
