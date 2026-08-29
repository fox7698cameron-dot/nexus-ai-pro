# Nexus AI Pro — Changelog

## [2.1.0] — 2026-08-29

### 🔒 Security Fixes
- **Fixed 4 npm vulnerabilities** (2 moderate, 1 high, 1 critical):
  - `esbuild ≤0.24.2`: upgraded override to `>=0.25.0`
  - `tar ≤7.5.20` (in `@capacitor/cli`): added override `>=7.5.21`
  - Applied `npm audit fix` — **0 vulnerabilities remain**
- Fixed corrupted `jexl@2.3.0` integrity hash in `package-lock.json`
- Fixed undefined `model` variable in `callGemini()` server method

### 🔐 Authentication & Authorization (`server/services/authService.js`, `server/routes/auth.js`)
- **Full auth system** with JWT access tokens (15-min TTL) and refresh tokens (7-day)
- **Password requirements**: 13+ characters, uppercase, lowercase, digit, special character
- **Username support**: Unicode/emoji allowed (2–64 chars, validated with `/\p{L}/u`)
- **bcrypt cost 12** password hashing
- **TOTP-based 2FA / MFA** (RFC-6238, 30-second window) with QR code URL generation
- **WebAuthn / passkey** biometric registration and assertion (Touch ID, Face ID, retinal — browser API)
  - Counter-based replay attack detection
- Role-based access: `user`, `moderator`, `developer`, `admin` (level 1–4)
- Separate admin role management endpoint `POST /api/auth/admin/set-role`
- Timing-safe credential validation (always runs bcrypt to prevent timing attacks)
- Token rotation on refresh; full session revocation on password change

### 📊 Analytics Dashboard (`src/analytics/AnalyticsDashboard.jsx`, `server/routes/analytics.js`)
- **8 social platforms**: TikTok, Instagram, Facebook, Twitch, Discord, Lemon8, Reddit, RedGIFs
- Metrics: views, likes, reach, retention, engagement rate, followers, follower growth
- Real-time polling mode (live toggle, 30s refresh)
- Period selector: 1d / 7d / 28d / 90d
- Per-platform overview cards with sparkline charts and daily bar charts
- Aggregate overview across all platforms
- Live platform connection status (reads from ENV tokens)
- Falls back to realistic simulated data when tokens not configured

### 🎮 Game Dashboard (`server/routes/gaming.js`)
- **Platform connectors**: Epic Games/Unreal, Sony (PSN), Microsoft (Xbox), Ubisoft Connect
- Achievement CRUD with unlock tracking and platform attribution
- Project CRUD for game projects (type: game, arvr, 3d, engine)
- Progress calculation from milestones + achievements
- All platform credentials read from `process.env` — never hardcoded

### 🗂 Project Tracking (`server/routes/projects.js`)
- Real-time project tracker for: `coding`, `game`, `arvr`, `3d`, `mobile`, `web`, `engine`
- Full task CRUD with statuses: todo, in_progress, review, done, blocked
- Priority system: low, medium, high, critical
- SCM connectors: GitHub, Bitbucket, Azure DevOps (live commit stats if token available)
- Milestone tracking with completion percentages
- Activity log on every update
- Pagination and filtering
- Admin stats overview endpoint

### 💳 Subscriptions (`server/routes/subscription.js`)
- **Stripe integration** (Checkout sessions, Customer Portal, Webhooks with signature verification)
- Card support via Stripe: Visa, Mastercard, Amex, Discover, Diners, UnionPay, JCB
- **Crypto payments** via Coinbase Commerce: BTC, ETH, USDC, SOL, LTC
- **Gift card redemption** system
- Tier plans: Free / Pro ($9.99/mo) / Enterprise ($14.99/mo)
- Reasoning levels: mini (free) / mid (pro) / max (enterprise)
- All Stripe & crypto keys read from `process.env` — never hardcoded

### 🌍 Multi-Language (`src/i18n/index.js`)
- **15 languages**: en, es, fr, de, ja, ko, zh, ar, pt, ru, hi, it, nl, sv, pl
- RTL support for Arabic (sets `dir="rtl"` on document)
- Auto-detect from `navigator.language` with localStorage persistence
- `t(key)` translation function with variable interpolation `{{var}}`
- `formatNumber()`, `formatDate()`, `formatCurrency()` using `Intl.*` per locale
- `autoTranslate(text, locale)` async function calls `/api/translate` (Azure Translator)
- Server-side `/api/translate` endpoint (Azure Cognitive Services, key from ENV)

### 🏠 Role Dashboards (`src/dashboards/RoleDashboards.jsx`)
- **Separate dashboard views** for: Admin, Developer, Moderator, User
- Each role sees only appropriate navigation tabs and controls
- Admin: all tabs + Users + System (connector status)
- Developer: overview, analytics, security, projects, gaming, billing
- Moderator: overview, analytics, users, billing
- User: my dashboard, analytics, my projects, my games, billing
- Billing panel shows plans, current subscription, payment method info

### 🔒 Enhanced Security Dashboard (`src/security/EnhancedSecurityDashboard.jsx`)
- Real-time security scanning with live mode (15s refresh)
- Security score ring visualization
- Threat detection feed with severity badges
- Vulnerability list with auto-fix buttons
- Network status panel: nodes, latency, TLS, HSTS
- On-device issues tab
- Cryptography status: AES-256-GCM, PBKDF2-SHA512, bcrypt, TOTP, HMAC

### 🔑 Cryptography & Data Security
- No secrets, API tokens, or bearer tokens hardcoded anywhere
- All keys read from `process.env` exclusively
- Proper enumeration: role levels, severity levels, platform IDs
- Audit logging: minimal, structured JSON with ISO timestamps
- Timing-safe comparisons for credential validation
- JWT signed with ENV secret, short TTL, refresh rotation

### 🏗 Architecture & Code Quality
- New directory structure: `server/routes/`, `server/services/`, `server/middleware/`
- All new files: ESM imports, JSDoc headers, Apache-2.0 copyright, date labels
- Zod validation on all API inputs
- No deeply nested callbacks — flat async/await throughout
- Proper error codes with HTTP status mapping
- `AuthProvider` / `useAuth()` React context for frontend auth state

### 🌐 Multi-Platform Support
- Existing: Linux, Windows, macOS, iOS (Capacitor), Android (Capacitor), Electron, PWA
- New UI components: responsive flexbox/grid, `max-width: 100%` images, no horizontal overflow
- `vite.config.js`: VITE_DASHBOARD_MODE env var to switch between chat UI and dashboard
- Desktop Electron: unchanged
- Mobile: unchanged Capacitor setup

### 📦 Dependencies
- **Added**: `stripe@^17.0.0`
- **Fixed overrides**: `esbuild >=0.25.0`, `tar >=7.5.21`
- **Fixed lock**: `jexl@2.3.0` integrity hash corrected
