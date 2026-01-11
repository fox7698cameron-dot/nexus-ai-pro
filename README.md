# Nexus AI Pro

> **All-in-One AI Platform with Multi-Model Support**

[![License](https://img.shields.io/badge/License-Apache_2.0-blue.svg)](https://opensource.org/licenses/Apache-2.0)
[![Platform](https://img.shields.io/badge/platform-iOS%20%7C%20macOS%20%7C%20Windows%20%7C%20Linux%20%7C%20Web-lightgrey)](https://nexusai.pro)
[![Version](https://img.shields.io/badge/version-2.0.0-green)](https://github.com/yourusername/nexus-ai-pro)

Copyright © 2025-2026 Cameron Fox. All rights reserved.

---

## 📖 About

Nexus AI Pro is a military-grade encrypted AI platform that brings together the world's best AI models in a single, beautifully designed interface. Access Claude, GPT-4, Gemini, and 10+ other models without switching apps.

### ✨ Key Features

- 🤖 **10+ AI Models** - Claude 4, GPT-4, Gemini 2.0, DeepSeek, Grok, and more
- 🔐 **Bank-Level Security** - AES-256-GCM encryption, biometric auth
- 🎨 **Beautiful UI** - Native apps for iOS, macOS, Windows, Linux, and Web
- ⚡ **Multi-Agent Orchestration** - Chain multiple AIs together for complex tasks
- 🔗 **Platform Connectors** - Deploy to Vercel, Railway, AWS, and 15+ platforms
- 🎭 **AI Companions** - Personal AI companions with unique personalities (18+)
- 🛠️ **Developer Tools** - Code generation, app building, automation
- 💾 **Persistent Memory** - AI remembers your preferences across sessions

---

## 🖥️ Platforms

| Platform | Technology | Status | Download |
|----------|-----------|--------|----------|
| **iOS** | Swift (Native) | ✅ Available | [App Store](https://apps.apple.com/app/nexus-ai-pro) |
| **macOS** | Swift (Native) | ✅ Available | [App Store](https://apps.apple.com/app/nexus-ai-pro) |
| **Windows** | Electron | ✅ Available | [Download](https://nexusai.pro/download/windows) |
| **Linux** | Electron | ✅ Available | [Download](https://nexusai.pro/download/linux) |
| **Web** | React/Vite | ✅ Available | [nexusai.pro](https://nexusai.pro) |

---

## 🚀 Quick Start

### Web Version

```bash
# Clone the repository
git clone https://github.com/yourusername/nexus-ai-pro.git
cd nexus-ai-pro

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
# Add your API keys to .env

# Start development server
npm run dev

# Build for production
npm run build
```

### Desktop Version (Windows/Linux/macOS)

```bash
# Navigate to desktop directory
cd desktop

# Install dependencies
npm install

# Start development
npm run dev

# Build for your platform
npm run build:win     # Windows
npm run build:mac     # macOS
npm run build:linux   # Linux
npm run build:all     # All platforms
```

### iOS/macOS Native App

1. Open `nexus ai pro/nexus ai pro.xcodeproj` in Xcode
2. Select your target device/simulator
3. Build and run (⌘R)

---

## 📦 Installation

### Windows

**Option 1: Installer (Recommended)**
```powershell
# Download and run the installer
nexus-ai-pro-setup-2.0.0.exe
```

**Option 2: Portable**
```powershell
# Download portable version
nexus-ai-pro-2.0.0-portable.exe
```

**Option 3: Package Managers**
```powershell
# Chocolatey
choco install nexus-ai-pro

# Winget
winget install CameronFox.NexusAIPro
```

### Linux

**Ubuntu/Debian:**
```bash
# Download .deb package
sudo dpkg -i nexus-ai-pro_2.0.0_amd64.deb

# Or use apt
sudo add-apt-repository ppa:cameronfox/nexus-ai-pro
sudo apt update
sudo apt install nexus-ai-pro
```

**Fedora/RHEL:**
```bash
# Download .rpm package
sudo rpm -i nexus-ai-pro-2.0.0.x86_64.rpm

# Or use dnf
sudo dnf install nexus-ai-pro
```

**Universal (AppImage):**
```bash
# Download AppImage
chmod +x nexus-ai-pro-2.0.0.AppImage
./nexus-ai-pro-2.0.0.AppImage
```

**Snap:**
```bash
sudo snap install nexus-ai-pro
```

**Flatpak:**
```bash
flatpak install flathub com.cameronfox.NexusAIPro
```

### macOS

**App Store:**
- Search for "Nexus AI Pro" in the Mac App Store

**Direct Download:**
```bash
# Download .dmg file
open nexus-ai-pro-2.0.0.dmg
# Drag to Applications folder
```

**Homebrew:**
```bash
brew install --cask nexus-ai-pro
```

---

## 🔧 Configuration

### Environment Variables

Create a `.env` file in the root directory:

```bash
# API Keys (get from respective providers)
ANTHROPIC_API_KEY=your_anthropic_key
OPENAI_API_KEY=your_openai_key
GOOGLE_API_KEY=your_google_key

# Encryption (auto-generated if not provided)
ENCRYPTION_SECRET=your_secret_key
ENCRYPTION_SALT=your_salt

# Server Configuration
PORT=3001
NODE_ENV=production

# Optional: Platform Connectors
GITHUB_TOKEN=your_github_token
VERCEL_TOKEN=your_vercel_token
RAILWAY_TOKEN=your_railway_token
```

### API Keys

Get your free API keys:

- **Anthropic (Claude)**: https://console.anthropic.com
- **OpenAI (GPT-4)**: https://platform.openai.com
- **Google (Gemini)**: https://makersuite.google.com
- **DeepSeek**: https://platform.deepseek.com
- **xAI (Grok)**: https://x.ai

---

## 🏗️ Building from Source

### Prerequisites

- Node.js 18+ and npm 9+
- For iOS/macOS: Xcode 15+ and macOS 14+
- For Windows: Visual Studio Build Tools
- For Linux: Build essentials, libsecret

### Build Commands

```bash
# Build everything
npm run scripts/build-all.sh

# Build web only
npm run build

# Build desktop apps
cd desktop
npm run build:win       # Windows
npm run build:mac       # macOS  
npm run build:linux     # Linux
npm run build:all       # All platforms

# Build iOS/macOS in Xcode
# Open nexus ai pro.xcodeproj
# Product > Archive
```

---

## 🔒 Security Features

- **AES-256-GCM Encryption** - Military-grade encryption for all data
- **Biometric Authentication** - Face ID, Touch ID, Windows Hello
- **Secure Storage** - Keychain (macOS/iOS), Credential Manager (Windows), libsecret (Linux)
- **No Telemetry** - Zero data collection, everything stays local
- **Auto-lock** - Configurable session timeout
- **End-to-end Encryption** - All API communications encrypted

---

## 📚 Documentation

- [User Guide](docs/USER_GUIDE.md)
- [API Documentation](docs/API.md)
- [Platform Connectors Guide](nexus%20ai%20pro/PLATFORM_CONNECTORS_GUIDE.md)
- [Security Best Practices](docs/SECURITY.md)
- [Contributing Guide](CONTRIBUTING.md)

---

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details.

### Development Setup

```bash
# Fork and clone the repo
git clone https://github.com/yourusername/nexus-ai-pro.git

# Install dependencies
npm install
cd desktop && npm install

# Create a branch
git checkout -b feature/your-feature

# Make changes and commit
git commit -m "Add your feature"

# Push and create PR
git push origin feature/your-feature
```

---

## 📄 License

This project is licensed under the **Apache License 2.0** - see the [LICENSE](LICENSE) file for details.

### What This Means:

- ✅ Commercial use allowed
- ✅ Modification allowed
- ✅ Distribution allowed
- ✅ Patent use allowed
- ⚠️ Trademark use not allowed
- ⚠️ Liability and warranty disclaimed
- 📋 License and copyright notice required
- 📋 State changes required

---

## 🙏 Acknowledgments

Built with:
- [React](https://react.dev) - UI framework
- [Electron](https://electronjs.org) - Desktop apps
- [Anthropic Claude](https://anthropic.com) - AI model
- [OpenAI GPT-4](https://openai.com) - AI model
- [Google Gemini](https://deepmind.google/technologies/gemini/) - AI model
- [Vite](https://vitejs.dev) - Build tool
- [Express](https://expressjs.com) - Backend framework

---

## 📧 Contact

- **Website**: [nexusai.pro](https://nexusai.pro)
- **Email**: contact@nexusai.pro
- **GitHub**: [@yourusername](https://github.com/yourusername)
- **Discord**: [discord.gg/nexusai](https://discord.gg/nexusai)

---

## ⭐ Support

If you find this project helpful, please consider:

- ⭐ Starring the repository
- 🐛 Reporting bugs
- 💡 Suggesting features
- 📝 Contributing code
- 💬 Spreading the word

---

**Made with ❤️ by Cameron Fox**

Copyright © 2025-2026 Cameron Fox. All rights reserved.
