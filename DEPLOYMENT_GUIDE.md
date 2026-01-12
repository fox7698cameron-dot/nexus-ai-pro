# Security Dashboard Deployment Guide

## Overview

The Security Dashboard is now fully implemented across all Nexus AI Pro platforms. This guide covers deployment for each platform.

## Prerequisites

- Node.js 16+
- npm 8+
- For iOS: Xcode 13+
- For Android: Flutter SDK
- For Desktop: Electron 20+
- Git

## 1. Backend Deployment

### Local Development
```bash
# Install dependencies
npm install --legacy-peer-deps

# Start backend server
node server.js
# Runs on http://localhost:3001
# Security API available at /api/security/*
```

### Production (Docker)
```bash
# Build Docker image
docker build -t nexus-ai-pro .

# Run container
docker run -p 3001:3001 -e NODE_ENV=production nexus-ai-pro

# Or use docker-compose
docker-compose up -d
```

### Production (Cloud)
```bash
# Use provided deployment script
./deploy.sh all

# For specific services:
./deploy.sh web    # Deploy web app
./deploy.sh backend # Deploy backend only
./deploy.sh docker  # Build Docker image
```

## 2. Web App Deployment

### Development
```bash
# Start dev server
npm run dev
# Frontend: http://localhost:5173
# Backend: http://localhost:3001
```

### Build for Production
```bash
# Build static files
npm run build
# Output in dist/ folder

# Preview production build
npm run preview
```

### Deploy to Cloud

#### Vercel
```bash
# Install Vercel CLI
npm install -g vercel

# Deploy
vercel
# Configure to proxy /api to http://localhost:3001
```

#### Netlify
```bash
# Install Netlify CLI
npm install -g netlify-cli

# Deploy
netlify deploy --prod --dir=dist
```

#### AWS S3 + CloudFront
```bash
# Build app
npm run build

# Upload to S3
aws s3 sync dist/ s3://your-bucket-name/

# Invalidate CloudFront (optional)
aws cloudfront create-invalidation --distribution-id YOUR_ID --paths "/*"
```

#### Railway/Heroku
```bash
# Using provided deploy script
./deploy.sh web
# Follows environment configuration
```

## 3. iOS Deployment

### Development
```bash
# Prepare Flutter/iOS
cd multiplatform/flutter
flutter pub get
flutter run -d ios

# Or build for simulator
flutter build ios --simulator
open build/ios/iphoneos/Runner.app
```

### Production

#### TestFlight
```bash
# Build iOS archive
cd multiplatform/flutter
flutter build ios --release

# Upload to TestFlight (requires Apple Developer account)
./deploy.sh ios
# Follow prompts to upload IPA

# Or manual upload:
xcodebuild -scheme Runner -workspace ios/Runner.xcworkspace \
  -configuration Release -derivedDataPath build -arch arm64 \
  -sdk iphoneos archive -archivePath build/Runner.xcarchive

# Export IPA
xcodebuild -exportArchive -archivePath build/Runner.xcarchive \
  -exportOptionsPlist ios/ExportOptions.plist -exportPath build/ipa
```

#### App Store
```bash
# Follow Apple App Store guidelines
# Use Xcode or transporter for submission
```

## 4. Android Deployment

### Development
```bash
# Build APK
cd multiplatform/flutter
flutter build apk --debug

# Run on emulator/device
flutter run
```

### Production

#### Google Play
```bash
# Build release APK
cd multiplatform/flutter
flutter build apk --release
# Output: build/app/outputs/flutter-apk/app-release.apk

# Build app bundle (recommended for Play Store)
flutter build appbundle --release
# Output: build/app/outputs/bundle/release/app-release.aab

# Upload to Google Play Console
# Requires signing configuration (see signing guide below)
```

#### Manual Testing
```bash
# Install APK on device
adb install build/app/outputs/flutter-apk/app-release.apk
```

#### Signing (Required for Production)
```bash
# Generate keystore
keytool -genkey -v -keystore ~/key.jks -keyalg RSA -keysize 2048 \
  -validity 10000 -alias nexus_key

# Sign APK
jarsigner -verbose -sigalg SHA1withRSA -digestalg SHA1 \
  -keystore ~/key.jks build/app/outputs/flutter-apk/app-release.apk nexus_key

# Align APK
zipalign -v 4 build/app/outputs/flutter-apk/app-release.apk app-release-aligned.apk
```

## 5. Windows Desktop Deployment

### Development
```bash
# Install Electron dependencies
cd multiplatform/electron
npm install

# Run in development
npm run dev
# Or through main repo: npm run electron
```

### Build for Distribution

#### NSIS Installer
```bash
# Build NSIS installer (Windows only)
npm run build:nsis
# Output: dist/Nexus AI Pro Setup.exe

# Or use electron-builder
electron-builder -w nsis
```

#### Portable EXE
```bash
# Build portable executable
electron-builder -w portable
# Output: dist/Nexus AI Pro.exe
```

#### MSI Installer
```bash
# Build MSI installer
electron-builder -w msi
```

## 6. macOS Desktop Deployment

### Development
```bash
# Run on macOS
npm run dev
# Or electron dev mode
```

### Build for Distribution

#### DMG Package
```bash
# Build DMG installer
electron-builder -m dmg
# Output: dist/Nexus AI Pro.dmg
```

#### App Store
```bash
# Build for Mac App Store
electron-builder -m mas
# Submit through Apple Developer Console
```

#### Code Signing
```bash
# Sign the app
codesign --deep --force --verify --verbose --sign "Developer ID Application" \
  dist/Nexus\ AI\ Pro.app

# Verify signature
codesign -dv dist/Nexus\ AI\ Pro.app
```

## 7. Linux Desktop Deployment

### Development
```bash
# Run on Linux
npm run dev
# Or electron dev mode
```

### Build for Distribution

#### AppImage
```bash
# Build AppImage
electron-builder -l AppImage
# Output: dist/Nexus\ AI\ Pro.AppImage
```

#### Snap
```bash
# Build Snap package
electron-builder -l snap
```

#### DEB Package
```bash
# Build DEB package
electron-builder -l deb
# Output: dist/*.deb
```

## Environment Configuration

### Backend Environment Variables
```bash
# .env
NODE_ENV=production
PORT=3001
API_KEY=your_key_here
ENCRYPTION_KEY=your_encryption_key
DATABASE_URL=your_database_url

# Add for each AI provider you use:
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...
GOOGLE_API_KEY=...
```

### Frontend Environment Variables
```bash
# .env (web app)
VITE_API_URL=https://api.yourdomain.com
VITE_ENVIRONMENT=production
```

### Mobile Environment Variables
```dart
// For Flutter: Set in build.gradle or in code
const String API_URL = 'https://api.yourdomain.com';
const String ENVIRONMENT = 'production';
```

## Security Checklist

Before deploying to production:

- [ ] Enable HTTPS/TLS for all API endpoints
- [ ] Set secure cookie flags (HttpOnly, Secure, SameSite)
- [ ] Configure CORS properly (restrict to your domain)
- [ ] Rotate all encryption keys
- [ ] Enable rate limiting on API endpoints
- [ ] Set up security headers (CSP, X-Frame-Options, etc.)
- [ ] Configure firewall rules
- [ ] Enable audit logging
- [ ] Set up monitoring and alerting
- [ ] Review sensitive data logging (disable in production)
- [ ] Update all dependencies to latest secure versions
- [ ] Run security scanning tools (npm audit, OWASP, etc.)
- [ ] Test error handling (no stack traces in production)
- [ ] Verify authentication/authorization
- [ ] Back up encryption keys securely

## Monitoring After Deployment

### Web App
```bash
# Monitor build size
npm run build
# Check dist/ folder size and bundle analysis

# Monitor performance
# Use server logs: tail -f logs/server.log
```

### Mobile Apps
- Monitor app store reviews
- Track crash reports (Firebase Crashlytics)
- Monitor battery usage
- Track user engagement (Firebase Analytics)

### Desktop Apps
- Monitor installer downloads
- Track crash reports (Sentry/Rollbar)
- Monitor disk usage
- Track feature usage

### Backend
```bash
# Monitor server logs
tail -f logs/server.log

# Check security scans
curl http://localhost:3001/api/security/dashboard

# Monitor API performance
curl http://localhost:3001/api/health
```

## Rollback Procedures

### Web App
```bash
# Rollback to previous version
git revert HEAD
npm run build
# Redeploy to cloud provider
```

### Mobile Apps
- Contact app store support for rollback
- Release hotfix update
- Communicate with users

### Desktop Apps
- Release new version with fixes
- Provide update notifications
- Support direct download of previous version

## Support

For deployment issues:
1. Check logs: `npm run dev` and monitor output
2. Verify environment variables are set correctly
3. Test API endpoints manually with curl
4. Review security configuration
5. Check platform-specific requirements

See `SECURITY_DASHBOARD.md` and `CROSS_PLATFORM_IMPLEMENTATION.md` for more details.
