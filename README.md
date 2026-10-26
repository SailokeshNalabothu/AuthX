# 🛡️ AuthX - Enterprise-Grade Authentication & Session Intelligence Platform

[![CI Pipeline](https://github.com/SailokeshNalabothu/AuthX/actions/workflows/ci.yml/badge.svg)](https://github.com/SailokeshNalabothu/AuthX/actions/workflows/ci.yml)
[![Node.js Version](https://img.shields.io/badge/node-%3E%3D20.x-brightgreen.svg)](https://nodejs.org/)
[![React Version](https://img.shields.io/badge/react-18.x-61dafb.svg)](https://react.dev/)
[![MongoDB](https://img.shields.io/badge/database-MongoDB-47A248.svg)](https://www.mongodb.com/)
[![Docker Ready](https://img.shields.io/badge/docker-orchestrated-2496ED.svg)](https://www.docker.com/)
[![Test Suite](https://img.shields.io/badge/tests-71%2F71%20passing-success.svg)](https://jestjs.io/)
[![License: ISC](https://img.shields.io/badge/License-ISC-blue.svg)](https://opensource.org/licenses/ISC)

> **AuthX** is a production-hardened, full-stack identity, session intelligence, and access management developer platform engineered with **Node.js**, **Express**, **MongoDB**, and **React**. Designed to meet modern enterprise SaaS standards (Stripe, Clerk & Supabase style), AuthX delivers a developer-first platform with scoped API keys (PATs), signed outbound webhooks with HMAC SHA-256 signatures, gamified real-time Security Health Score meter, live password strength and Shannon entropy analyzer, Light/Dark/Cyber glassmorphism themes, hardened httpOnly secure cookie storage, 1-click cryptographic email verification, proactive anomaly detection, instant account lockdown alerts, immutable security audit logs with CSV export, interactive personal security timelines, active multi-session tracking, RFC 6238 TOTP two-factor authentication, cryptographic backup recovery codes, dual-token JWT architecture with silent refresh interceptors, rate-limiting brute-force defenses, Google OAuth 2.0 SSO, and role-based access control.

---

## 📑 Table of Contents

- [🛡️ AuthX - Enterprise-Grade Authentication \& Session Intelligence Platform](#️-authx---enterprise-grade-authentication--session-intelligence-platform)
  - [📑 Table of Contents](#-table-of-contents)
  - [🏛 System Architecture](#-system-architecture)
    - [Microservice Containers](#microservice-containers)
  - [🚀 Enterprise Features](#-enterprise-features)
    - [1. 1-Click Cryptographic Email Verification (Frictionless Onboarding)](#1-1-click-cryptographic-email-verification-frictionless-onboarding)
    - [2. 🚨 Proactive Anomaly Detection \& Instant Lockdown](#2--proactive-anomaly-detection--instant-lockdown)
    - [3. 🔓 Multi-Channel Account Unlock \& Recovery Engine](#3--multi-channel-account-unlock--recovery-engine)
    - [4. 🛡️ Immutable Security Audit Trail \& Forensics Engine](#4-️-immutable-security-audit-trail--forensics-engine)
    - [5. Active Device \& Session Intelligence (Clerk \& Google Style)](#5-active-device--session-intelligence-clerk--google-style)
    - [6. Two-Factor Authentication (TOTP 2FA)](#6-two-factor-authentication-totp-2fa)
    - [7. Cryptographic Backup Recovery Codes](#7-cryptographic-backup-recovery-codes)
    - [8. Dual-Token JWT Architecture \& Silent Refresh](#8-dual-token-jwt-architecture--silent-refresh)
    - [9. Brute-Force Protection \& Account Lockout](#9-brute-force-protection--account-lockout)
    - [10. Federated Single Sign-On (Google OAuth 2.0)](#10-federated-single-sign-on-google-oauth-20)
    - [11. Role-Based Access Control (RBAC)](#11-role-based-access-control-rbac)
    - [12. ⚡ Developer Platform: Scoped API Keys (PATs) \& Signed Outbound Webhooks](#12--developer-platform-scoped-api-keys-pats--signed-outbound-webhooks)
    - [13. 👑 Enterprise Admin Suite: Analytics, User Impersonation \& Bulk Operations](#13--enterprise-admin-suite-analytics-user-impersonation--bulk-operations)
    - [14. 🎨 Premium UX Polish \& Security Center](#14--premium-ux-polish--security-center)
  - [🛠 Tech Stack](#-tech-stack)
  - [📡 REST API Reference](#-rest-api-reference)
    - [Authentication Endpoints (`/api/auth`)](#authentication-endpoints-apiauth)
    - [Session Management Endpoints (`/api/sessions`)](#session-management-endpoints-apisessions)
    - [Two-Factor Authentication Endpoints (`/api/2fa`)](#two-factor-authentication-endpoints-api2fa)
    - [Security Audit Trail Endpoints (`/api/audit`)](#security-audit-trail-endpoints-apiaudit)
    - [User \& Administration Endpoints (`/api/users`)](#user--administration-endpoints-apiusers)
    - [Developer Platform: API Keys (`/api/api-keys`)](#developer-platform-api-keys-apiapi-keys)
    - [Developer Platform: Outbound Webhooks (`/api/webhooks`)](#developer-platform-outbound-webhooks-apiwebhooks)
    - [Developer Scoped Data Endpoints (`/api/developer/v1`)](#developer-scoped-data-endpoints-apideveloperv1)
  - [🧪 Testing \& Quality Assurance](#-testing--quality-assurance)
    - [Test Suite Execution Status](#test-suite-execution-status)
    - [Enterprise Pipeline Safeguards](#enterprise-pipeline-safeguards)
  - [⚡ Quick Start Guide](#-quick-start-guide)
    - [Method 1: Docker Container Orchestration (Recommended)](#method-1-docker-container-orchestration-recommended)
    - [Method 2: Native Manual Installation](#method-2-native-manual-installation)
      - [Prerequisites](#prerequisites)
      - [1. Backend Setup](#1-backend-setup)
      - [2. Frontend Setup](#2-frontend-setup)
  - [⚙️ Environment Configuration](#️-environment-configuration)
    - [Backend Environment (`.env`)](#backend-environment-env)
    - [Frontend Environment (`authx-frontend/.env`)](#frontend-environment-authx-frontendenv)
  - [📂 Project Directory Structure](#-project-directory-structure)
  - [🔒 Security Hardening](#-security-hardening)
  - [📄 License](#-license)

---

## 🏛 System Architecture

The AuthX infrastructure is built as a modular 3-tier microservice architecture orchestrated via Docker Compose:

```mermaid
graph TD
    User([Client / Web Browser]) -->|HTTP / React UI :3000| Frontend[authx-frontend Container<br/>React 18 + Nginx]
    Frontend -->|Axios REST / JSON :5000| Backend[authx-backend Container<br/>Node.js + Express API]
    Backend -->|Internal DNS :27017| Database[(authx-mongo Container<br/>MongoDB Database)]
    Backend -.->|OAuth 2.0 Flow| GoogleAuth[Google Cloud SSO]
    Backend -.->|SMTP Stream| EmailService[Nodemailer / SMTP]
```

### Microservice Containers

| Container Name | Technology | Internal Port | Host Port | Purpose |
| :--- | :--- | :--- | :--- | :--- |
| `authx-frontend` | React 18, Axios, React Router v6 | `80` (Nginx) | `3000` | SaaS client UI, session dashboard, route guards |
| `authx-backend` | Node.js, Express.js, Passport.js | `5000` | `5000` | REST API, token issuance, session and 2FA controller |
| `authx-mongo` | MongoDB Engine | `27017` | `27017` | Persistent identity storage, session store, indexes |

---

## 🚀 Enterprise Features

### 1. 1-Click Cryptographic Email Verification (Frictionless Onboarding)

- **Zero-Friction Activation:** Replaces manual 6-digit OTP verification with secure signed 1-click email verification links.
- **Auto-Login on Verification:** Clicking the link in the responsive email verifies the account, issues access and refresh tokens, creates the initial device session, and redirects straight to the user dashboard.
- **OWASP Log Hygiene:** Complete removal of dev OTP console printing and API payload leakage for clean production security.

### 2. 🚨 Proactive Anomaly Detection & Instant Lockdown

- **Multi-Signal Anomaly Engine:** Automatically compares incoming login characteristics (`browser`, `os`, `deviceType`, `ipAddress`, `location`) against the user's historical footprints.
- **Instant Security Alert Email:** If a login occurs from an unfamiliar device, IP, or location, AuthX instantly dispatches an urgent security alert email:
  > *"New login detected from Chrome on Linux (IP: 198.51.100.23). If this was not you, click here to lock your account instantly."*
- **True 1-Click Lockdown:** Clicking the secure email link instantly:
  - Terminates all active sessions across all devices immediately.
  - Revokes all access and refresh tokens.
  - Sets `isLocked: true` to prevent unauthorized logins.
  - Logs `ACCOUNT_LOCKED` to the immutable audit trail.
  - Displays an immediate self-service recovery key on screen.

### 3. 🔓 Multi-Channel Account Unlock & Recovery Engine

- **Self-Service Email Unlock:** Locked users can click **"Send Unlock Link to Email"** from the login page or lockdown screen to receive a secure 15-minute tokenized unlock link.
- **Password Reset Identity Verification:** Completing a password reset automatically clears lock status (proving ownership of email restores credentials).
- **Admin SOC Console:** Administrators can unlock any user directly from the `/admin` Security Operations Center.
- **Developer CLI Shortcut:** Run `npm run unlock <email>` to instantly unlock accounts during local testing.

### 4. 🛡️ Immutable Security Audit Trail & Forensics Engine

- **Strict Tamper-Proof Immutability:** Enforced via Mongoose lifecycle pre-hooks (`updateOne`, `deleteMany`, `save` on existing docs) preventing any mutation or deletion of audit logs.
- **Complete Lifecycle Event Tracking:**
  - `LOGIN_SUCCESS` (tracks device, IP, location, and anomaly detection signal)
  - `LOGIN_FAILED` (records invalid credentials and brute-force attempts)
  - `PASSWORD_RESET_REQUEST` & `PASSWORD_RESET_SUCCESS`
  - `2FA_ENABLED` & `2FA_DISABLED`
  - `FAILED_ATTEMPT_LOCKED` (triggered after 5 consecutive failed attempts)
  - `ACCOUNT_LOCKED` & `ACCOUNT_UNLOCKED`
  - `EMAIL_VERIFIED` (tracks 1-click verification method)
  - `ROLE_CHANGED` (tracks target user, previous role, new role, and admin actor)
  - `SESSION_REVOKED` (records single-device or bulk session termination)
- **Interactive Security Timeline:** Users can review their complete personal security history in a chronological glowing timeline with category filters (`All`, `Logins`, `2FA`, `Security Alerts`).
- **Organization-Wide SOC Feed with CSV Export:** Admins have complete visibility across organizational security events with real-time search, category filtering, anomaly indicators, and **one-click CSV export**.

### 5. Active Device & Session Intelligence (Clerk & Google Style)

- **Comprehensive Fingerprinting:** User-Agent and IP address parsing extracting device category (Desktop/Mobile/Tablet), Operating System, browser vendor, and client IP.
- **Concurrent Session Tracking:** Each active login allocates an isolated session document mapped with a unique session ID.
- **Granular Control & Revocation:** Users can inspect all connected devices, identify the current device via active markers, selectively terminate individual sessions, or execute **"Sign Out All Other Devices"** in a single click.

### 6. Two-Factor Authentication (TOTP 2FA)

- **Standard RFC 6238 Compliance:** Interoperable with Google Authenticator, Authy, Microsoft Authenticator, and 1Password.
- **Provisioning Workflow:** Generates cryptographically secure base32 secrets alongside high-resolution dynamic QR codes (`qrcode`).
- **Challenge Interception:** When 2FA is active, initial password verification issues a temporary 2FA ticket requiring rolling 6-digit TOTP verification before issuing access tokens.

### 7. Cryptographic Backup Recovery Codes

- **Emergency Access:** Generates 8 cryptographically random single-use recovery codes formatted as `XXXX-XXXX`.
- **Hashed Storage:** Backup codes are irreversibly hashed using `bcrypt` before database persistence to prevent leakages.
- **Authenticated Regeneration:** Users can invalidate existing codes and generate fresh sets at any time by confirming their current password.

### 8. Dual-Token JWT Architecture & Silent Refresh

- **Access Token:** Short-lived (15 minutes) bearer token for validating authorized API requests.
- **Refresh Token:** Long-lived (7 days) credential stored securely to negotiate token renewals.
- **Transparent Refresh Interceptors:** The React frontend integrates Axios response interceptors that trap `401 Unauthorized` responses and silently request new access tokens in the background without UI interruption.

### 9. Brute-Force Protection & Account Lockout

- **Progressive Account Freezing:** Automatically locks accounts for 15 minutes after 5 consecutive failed login attempts.
- **Sliding Window Rate Limiting:** Backed by `express-rate-limit` to restrict high-frequency authentication attempts per IP address.

### 10. Federated Single Sign-On (Google OAuth 2.0)

- **Passport.js Strategy:** Clean OAuth 2.0 handshakes managing profile discovery and email verification.
- **Automated User Synchronization:** Links existing user profiles or creates verified accounts seamlessly.
- **Secure Token Redirection:** Redirects to the frontend callback route (`/google-success`) with short-lived query credentials.

### 11. Role-Based Access Control (RBAC)

- **Hierarchical Authorization:** Clean separation of privileges between `user` and `admin` roles.
- **Declarative Middleware Guards:** `roleMiddleware('admin')` protects administrative routes, user deletion, and role elevation.
- **Client Route Guards:** Custom `<ProtectedRoute>` and `<AdminRoute>` components decode JWT payloads client-side for immediate UI restriction.

### 12. ⚡ Developer Platform: Scoped API Keys (PATs) & Signed Outbound Webhooks

- **Personal Access Tokens (PATs) / Scoped API Keys:**
  - Standard format: `authx_live_sk_<48-hex-chars>`.
  - Secure SHA-256 one-way cryptographic hashing: The raw secret key is only displayed **once** upon creation and never stored in plaintext in the database.
  - Granular RBAC Scopes: `read:profile`, `read:users`, `write:users`, `read:sessions`, `write:sessions`, `read:audit`.
  - Flexible Authentication: Middleware accepts keys via both `Authorization: Bearer authx_live_sk_...` and `x-api-key: ...` headers.
  - Expiration & Revocation: Built-in expiry policies (7d, 30d, 90d, 1y, Never) and instant one-click revocation.
- **Outbound Webhooks (Stripe / Svix Standard):**
  - External applications receive signed HTTP POST event notifications whenever key identity events occur.
  - Subscribable Events: `user.signup`, `user.verified`, `user.locked`, `user.unlocked`, `user.deleted`, `session.revoked`.
  - HMAC SHA-256 Signatures: Every webhook payload is signed with the endpoint's unique secret (`whsec_...`) and transmitted in the header `X-AuthX-Signature: t=<timestamp>,v1=<hmac>`.
  - Replay Attack Mitigation & Timing-Safe Verification: Receivers can verify authenticity and timestamp freshness via constant-time comparison (`crypto.timingSafeEqual`).
  - Comprehensive Delivery Observability: Full audit trail recording HTTP status codes, roundtrip latency, request bodies, and signature headers for every dispatch, with a built-in "Send Test Ping" console.

### 13. 👑 Enterprise Admin Suite: Analytics, User Impersonation & Bulk Operations

- **Security & Auth Analytics Intelligence:**
  - **Registration Velocity:** Real-time 24h counters and 7-day daily onboarding velocity visual charts.
  - **Account Health Breakdown:** Active vs. locked account ratio gauge with automatic brute-force alert signals.
  - **Failed Login Attempts Trend:** 24h & 7d forensics tracking credential-stuffing and unauthorized access spikes.
  - **Auth Provider Distribution:** Federated Google OAuth 2.0 SSO vs. Native Email/Password comparative analytics.
  - **Platform Health KPIs:** Real-time 2FA adoption rate, active device sessions, registered API keys, and active webhooks.
- **User Impersonation ("Login as User"):**
  - Enables administrators to safely impersonate any user account for live customer support and troubleshooting.
  - Issues temporary scoped impersonation JWTs while preserving the admin's original credentials in secure client storage.
  - Persistent, high-visibility amber floating banner: `"⚠️ Viewing as user@example.com (Exit Impersonation)"`.
  - One-click instant session termination: Restores administrator privileges and routes directly back to `/admin`.
  - Immutable audit logging: Tracks `USER_IMPERSONATION_STARTED` and `USER_IMPERSONATION_ENDED` with forensic actor metadata.
- **Enterprise Bulk Operations:**
  - Multi-select checkbox inventory for high-velocity user management.
  - Sticky action bar supporting **Bulk Lock**, **Bulk Unlock**, **Bulk Role Elevation** (`user` <-> `admin`), and **Bulk Deletion**.
  - One-click **CSV Directory Export** streaming complete identity metadata for audits and compliance.

---

## 🛠 Tech Stack

```
Core Frameworks      : Node.js (v20+), Express.js (v5), React.js (v18)
Database & ODM       : MongoDB, Mongoose (v9)
Security & Auth      : JSON Web Tokens (JWT), bcryptjs, Speakeasy, Passport.js, Express-Rate-Limit
Email Engine         : Nodemailer (Responsive HTML dark-mode templates)
Testing Framework    : Jest (v30), Supertest (v7), Cross-Env
DevOps & Containers  : Docker, Docker Compose, Nginx, GitHub Actions CI
Frontend Routing & UI: React Router v6, Axios, React Toastify, Custom Modern CSS
```

---

## 📡 REST API Reference

### Authentication Endpoints (`/api/auth`)

| Method | Endpoint | Access | Description |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/auth/signup` | Public | Register new account and dispatch 1-click verification email |
| `POST` | `/api/auth/verify-email` | Public | Verify email via 1-click cryptographic token and auto-login |
| `POST` | `/api/auth/verify-otp` | Public | Verify registration OTP (backwards-compatible fallback) |
| `POST` | `/api/auth/login` | Public (Rate-limited) | Authenticate user; returns tokens or 2FA challenge |
| `POST` | `/api/auth/login-2fa` | Public (Rate-limited) | Complete 2FA login via TOTP code or backup code |
| `POST` | `/api/auth/forgot-password` | Public | Request password reset token via email |
| `POST` | `/api/auth/reset-password/:token` | Public | Reset password using verified reset token (clears lock) |
| `POST` | `/api/auth/refresh` | Public | Exchange valid Refresh Token for fresh Access Token |
| `POST` | `/api/auth/logout` | Public / Session | Clear httpOnly secure cookies and revoke active device session |
| `POST` | `/api/auth/lock-account` | Public / Token | True 1-click instant account lockdown from email alert |
| `GET` | `/api/auth/lock-account-direct`| Public / Token | Direct GET lockdown endpoint with automated redirect |
| `POST` | `/api/auth/request-unlock` | Public | Dispatch self-service 15-minute unlock link to email |
| `POST` | `/api/auth/unlock-account` | Public | Verify unlock token and restore account access |
| `GET` | `/api/auth/google` | Public | Initiate Google OAuth 2.0 authentication flow |
| `GET` | `/api/auth/google/callback` | Public | Google OAuth redirect handler and token emitter |

### Session Management Endpoints (`/api/sessions`)

| Method | Endpoint | Access | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/sessions` | Bearer Token | Retrieve all active sessions for the current user |
| `DELETE` | `/api/sessions/:id` | Bearer Token | Terminate a specific session by ID |
| `POST` | `/api/sessions/revoke-others` | Bearer Token | Terminate all active sessions except the current one |

### Two-Factor Authentication Endpoints (`/api/2fa`)

| Method | Endpoint | Access | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/2fa/status` | Bearer Token | Get current 2FA status and remaining backup codes count |
| `POST` | `/api/2fa/setup` | Bearer Token | Generate TOTP secret, backup codes, and QR code URI |
| `POST` | `/api/2fa/verify` | Bearer Token | Verify TOTP code and enable 2FA on the account |
| `POST` | `/api/2fa/disable` | Bearer Token | Disable 2FA by providing password and TOTP code |
| `POST` | `/api/2fa/regenerate-backup-codes` | Bearer Token | Invalidate old and generate 8 new backup recovery codes |

### Security Audit Trail Endpoints (`/api/audit`)

| Method | Endpoint | Access | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/audit/my-logs` | Bearer Token | Retrieve personal security history timeline |
| `GET` | `/api/audit/admin-feed` | Admin Role | Organization-wide live security audit feed with search & filters |
| `GET` | `/api/audit/export-csv` | Admin Role | Stream and download organization audit trail as CSV |

### User & Administration Endpoints (`/api/users`)

| Method | Endpoint | Access | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/users` | Admin Role | List all registered users with metadata and lock states |
| `GET` | `/api/users/analytics` | Admin Role | Real-time auth & security intelligence: 24h/7d registration velocity, active vs. locked, failed logins trend, OAuth ratio |
| `POST` | `/api/users/:id/impersonate`| Admin Role | Generate scoped impersonation JWT session to troubleshoot as that target user |
| `POST` | `/api/users/exit-impersonation` | Bearer Token | Cleanly terminate active impersonation session and restore administrator context |
| `POST` | `/api/users/bulk-action` | Admin Role | Batch operations: `lock`, `unlock`, `changeRole`, `delete` across selected user IDs |
| `GET` | `/api/users/export-users-csv` | Admin Role | Stream complete organizational user directory with identity metadata as CSV |
| `DELETE` | `/api/users/:id` | Admin Role | Delete a user account by ID |
| `PUT` | `/api/users/:id/role` | Admin Role | Update user role (`user` / `admin`) |
| `PUT` | `/api/users/:id/unlock` | Admin Role | Unlock a locked user account immediately |

### Developer Platform: API Keys (`/api/api-keys`)

| Method | Endpoint | Access | Description |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/api-keys` | Bearer Token | Generate new scoped API key (`authx_live_sk_...`) with selectable permissions and expiry |
| `GET` | `/api/api-keys` | Bearer Token | List all active and revoked API keys for the current account |
| `PUT` | `/api/api-keys/:id/revoke` | Bearer Token | Immediately revoke an API key |
| `DELETE` | `/api/api-keys/:id` | Bearer Token | Delete an API key record permanently |

### Developer Platform: Outbound Webhooks (`/api/webhooks`)

| Method | Endpoint | Access | Description |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/webhooks` | Bearer Token | Register a new webhook endpoint with subscribed event filters |
| `GET` | `/api/webhooks` | Bearer Token | List all configured webhook endpoints |
| `GET` | `/api/webhooks/:id` | Bearer Token | Get detailed webhook configuration including signing secret |
| `DELETE` | `/api/webhooks/:id` | Bearer Token | Delete a webhook subscription |
| `POST` | `/api/webhooks/:id/test` | Bearer Token | Dispatch an immediate signed test ping event (`webhook.test`) |
| `GET` | `/api/webhooks/:id/deliveries` | Bearer Token | Retrieve delivery history, response codes, latencies, and signature headers |

### Developer Scoped Data Endpoints (`/api/developer/v1`)

| Method | Endpoint | Required Scope | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/developer/v1/profile` | `read:profile` | Query authenticated user identity and profile metadata |
| `GET` | `/api/developer/v1/users` | `read:users` | Query user directory via API key |
| `GET` | `/api/developer/v1/sessions` | `read:sessions` | Query active session inventory via API key |
| `GET` | `/api/developer/v1/audit-events` | `read:audit` | Query immutable audit log history via API key |

---

### 🔐 Webhook Signature Verification Guide (Node.js / Express)

Every outbound webhook sent by AuthX includes an `X-AuthX-Signature` header formatted as:
```http
X-AuthX-Signature: t=1730000000000,v1=9f83...612c
```

To verify the signature in your application and prevent replay attacks:

```javascript
const crypto = require('crypto');

function verifyAuthXWebhook(rawBody, signatureHeader, secret, toleranceSeconds = 300) {
  const parts = signatureHeader.split(',');
  const timestampStr = parts.find(p => p.startsWith('t='))?.split('=')[1];
  const signature = parts.find(p => p.startsWith('v1='))?.split('=')[1];

  if (!timestampStr || !signature) return false;

  // Protect against replay attacks (5-minute tolerance)
  const timestamp = parseInt(timestampStr, 10);
  if (Math.abs(Date.now() - timestamp) > toleranceSeconds * 1000) {
    return false;
  }

  // Compute expected HMAC SHA-256
  const payloadToSign = `${timestamp}.${rawBody}`;
  const expectedHmac = crypto.createHmac('sha256', secret).update(payloadToSign).digest('hex');

  // Constant-time comparison to prevent timing attacks
  const sigBuffer = Buffer.from(signature, 'hex');
  const expectedBuffer = Buffer.from(expectedHmac, 'hex');
  if (sigBuffer.length !== expectedBuffer.length) return false;

  return crypto.timingSafeEqual(sigBuffer, expectedBuffer);
}
```

### 14. 🎨 Premium UX Polish & Security Center

AuthX delivers a state-of-the-art security intelligence experience inspired by modern cyber-defense tools:

- **🛡️ Gamified Security Health Score:** An interactive radial gauge on the dashboard computing real-time account defense posture (0–100%). Evaluates email verification, RFC 6238 TOTP 2FA activation, emergency backup code availability, active multi-device hygiene, and storage hardening, accompanied by one-click remediation action cards.
- **⚡ Live Password Strength Analyzer:** Integrated directly into signup and password reset forms. Evaluates Shannon information entropy ($E = L \times \log_2(R)$), estimates GPU cluster brute-force crack time (from seconds to centuries), performs real-time dictionary blacklist lookups against top common breached passwords, and renders a 5-segment glowing visual strength meter.
- **🌙 Sleek Dark / ⚡ Cyber Mode Engine:** Glassmorphic theme switcher mounted across all navigation headers and auth cards. Supports `Light`, `Dark` (`#0b0f19` midnight slate), and `Cyber` (`#030712` with neon cyan `#00f0ff` glow, electric pink accents, subtle scanlines, and fluid CSS transitions).
- **🛡️ httpOnly Secure Cookie Hardening:** Access and refresh tokens are stored in `httpOnly`, `Secure`, `SameSite: Lax` cookies to eliminate XSS token theft vectors, with automatic Axios credential exchange and backwards-compatible authorization header fallback.

---

## 🧪 Testing & Quality Assurance

AuthX features an automated test pipeline built with **Jest** and **Supertest**, delivering comprehensive test coverage across authentication, sessions, security, and authorization.

```bash
# Execute complete test suite locally
npm test
```

### Test Suite Execution Status

```
PASS tests/enterpriseAdminSuite.test.js
PASS tests/developerPlatform.test.js
PASS tests/securityHealthAndCookies.test.js
PASS tests/anomalyAndAudit.test.js
PASS tests/admin.test.js
PASS tests/auth.test.js
PASS tests/password.test.js
PASS tests/session.test.js
PASS tests/protected.test.js
PASS tests/oauth.test.js

Test Suites: 10 passed, 10 total
Tests:       71 passed, 71 total
Snapshots:   0 total
Status:      100% Passing (All Suites Green)
```

### Enterprise Pipeline Safeguards

- **Isolated Test Database (`authx_test`):** Jest initializes a dedicated test database cluster, preventing destructive collisions with development data.
- **Deterministic Sequential Execution (`--runInBand`):** Eliminates asynchronous race conditions during database read/write cycles.
- **Stateless Environment Encapsulation (`tests/envMock.js`):** Tests run on reproducible mock configuration, allowing tests to pass instantly on any freshly cloned machine.
- **SMTP Stream Interception (`jest.mock`):** Nodemailer network connections are mocked during test runs, preventing network latency and socket timeouts in CI environments.
- **GitHub Actions CI:** Automated pipeline running on Ubuntu with containerized MongoDB services across every pull request and push to `main`.

---

## ⚡ Quick Start Guide

### Method 1: Docker Container Orchestration (Recommended)

Ensure [Docker Desktop](https://www.docker.com/) is installed and running, then execute:

```bash
# Clone the repository
git clone https://github.com/SailokeshNalabothu/AuthX.git
cd AuthX

# Launch all 3 services (Frontend, Backend, MongoDB)
docker-compose up --build
```

- **Frontend Application:** [http://localhost:3000](http://localhost:3000)
- **Backend API Server:** [http://localhost:5000](http://localhost:5000)
- **MongoDB Database:** `localhost:27017`

---

### Method 2: Native Manual Installation

#### Prerequisites

- **Node.js:** v20.x or higher
- **MongoDB:** Running locally on `mongodb://127.0.0.1:27017`
- **npm:** v9.x or higher

#### 1. Backend Setup

```bash
# Install backend dependencies
npm install

# Create environment configuration
cp .env.example .env

# Start development server
npm run dev
```

The backend API will initialize on `http://localhost:5000`.

#### 2. Frontend Setup

```bash
# Navigate to frontend directory
cd authx-frontend

# Install frontend dependencies
npm install

# Start React development server
npm start
```

The frontend client will open on `http://localhost:3000`.

---

### Helpful Maintenance Scripts

```bash
# Instantly unlock an account from the terminal (Developer utility)
npm run unlock sailokeshnalabothu@gmail.com

# Clean the database to retain only the primary administrator
npm run clean-users

# Run complete test suite
npm test
```

---

## ⚙️ Environment Configuration

### Backend Environment (`.env`)

| Variable | Description | Default / Example |
| :--- | :--- | :--- |
| `PORT` | HTTP server port | `5000` |
| `NODE_ENV` | Runtime environment (`development` / `production` / `test`) | `development` |
| `MONGO_URI` | MongoDB connection string | `mongodb://127.0.0.1:27017/authx` |
| `ACCESS_TOKEN_SECRET` | Cryptographic secret for signing Access Tokens | `your_access_token_secret` |
| `REFRESH_TOKEN_SECRET` | Cryptographic secret for signing Refresh Tokens | `your_refresh_token_secret` |
| `JWT_SECRET` | Fallback signing secret | `your_fallback_secret` |
| `EMAIL_USER` | SMTP email address for transactional notifications | `your_email@gmail.com` |
| `EMAIL_PASS` | SMTP app password or credentials | `your_app_password` |
| `GOOGLE_CLIENT_ID` | Google Cloud OAuth Client ID | `your_client_id.apps.googleusercontent.com` |
| `GOOGLE_CLIENT_SECRET` | Google Cloud OAuth Client Secret | `your_client_secret` |
| `CLIENT_URL` | Frontend origin for CORS and OAuth redirection | `http://localhost:3000` |

### Frontend Environment (`authx-frontend/.env`)

| Variable | Description | Default / Example |
| :--- | :--- | :--- |
| `REACT_APP_API_URL` | Base endpoint for the backend REST API | `http://localhost:5000/api` |

---

## 📂 Project Directory Structure

```
AuthX/
├── .github/
│   └── workflows/
│       └── ci.yml                     # GitHub Actions CI workflow
├── authx-frontend/                    # React 18 SPA Client
│   ├── public/                        # Static assets & index.html
│   ├── src/
│   │   ├── components/                # Reusable UI cards, modal guards, navbars
│   │   ├── pages/
│   │   │   ├── Admin.js               # SOC Dashboard & audit feed
│   │   │   ├── Dashboard.js           # Interactive timeline & 2FA controls
│   │   │   ├── GoogleSuccess.js       # OAuth token landing handler
│   │   │   ├── LockAccount.js         # True 1-click lockdown screen
│   │   │   ├── Login.js               # Sign in & unlock prompt
│   │   │   ├── Signup.js              # Onboarding & check-email screen
│   │   │   ├── UnlockAccount.js       # Self-service email unlock verification
│   │   │   ├── VerifyEmail.js         # 1-click email activation handler
│   │   │   └── VerifyOTP.js           # Backwards-compatible OTP fallback
│   │   ├── services/                  # Axios instance & token refresh interceptors
│   │   ├── App.js                     # Route declarations & route guards
│   │   └── index.css                  # Modern SaaS design system & theme
│   ├── Dockerfile                     # Multi-stage production Nginx container
│   ├── nginx.conf                     # Frontend reverse proxy configuration
│   └── package.json
├── scripts/
│   ├── cleanUsers.js                  # Database cleanup utility
│   └── unlock.js                      # Instant terminal unlock tool
├── src/                               # Express Backend API
│   ├── config/                        # Database, Passport.js, & OAuth configurations
│   ├── controllers/                   # Business logic (Auth, Audit, Session, User, 2FA)
│   ├── middleware/                    # JWT verification, RBAC, & rate limiters
│   ├── models/                        # Mongoose schemas (User, Session, AuditLog)
│   ├── routes/                        # Modular route definitions
│   ├── services/                      # Anomaly detection, audit, & email services
│   ├── templates/                     # Dark-mode responsive HTML email templates
│   ├── utils/                         # Device fingerprinting & token helpers
│   └── app.js                         # Express application setup
├── tests/                             # Automated Jest test suites
│   ├── admin.test.js                  # RBAC & administrative operation tests
│   ├── anomalyAndAudit.test.js        # Anomaly detection, lockdown & audit trail tests
│   ├── auth.test.js                   # 1-click verification, login & signup tests
│   ├── envMock.js                     # Mock environment variables for testing
│   ├── oauth.test.js                  # Google OAuth strategy tests
│   ├── password.test.js               # Reset password & recovery token tests
│   ├── protected.test.js              # Route guard verification tests
│   ├── session.test.js                # Multi-device session & revocation tests
│   └── setup.js                       # Global Jest configuration hooks
├── Dockerfile                         # Backend Docker container definition
├── docker-compose.yml                 # Multi-container orchestration (Dev/Local)
├── docker-compose.prod.yml            # Production container orchestration
├── package.json                       # Backend dependencies & test scripts
├── server.js                          # Server entry point & DB connection
└── README.md                          # Project documentation
```

---

## 🔒 Security Hardening

- **Cryptographic Immutability:** Audit trail records cannot be updated or purged via MongoDB API.
- **Salted Hashing:** User passwords and recovery codes are hashed using `bcryptjs` with high salt rounds.
- **Ephemeral Token Lifetimes:** Access tokens expire in 15 minutes to reduce exposure windows.
- **Strict Scope Authorization:** Granular RBAC middleware verifies user role on every protected query.
- **CORS Protection:** Cross-Origin Resource Sharing is strictly constrained to authorized client origins.
- **Stateless Revocation:** Sessions and refresh tokens are verified against persistent database records, allowing instant revocation across all devices.

---

## 📄 License

This project is licensed under the [ISC License](https://opensource.org/licenses/ISC).
