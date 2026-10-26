# 🛡️ AuthX - Enterprise-Grade Authentication System

[![CI Pipeline](https://github.com/SailokeshNalabothu/AuthX/actions/workflows/ci.yml/badge.svg)](https://github.com/SailokeshNalabothu/AuthX/actions/workflows/ci.yml)

> A production-ready full-stack authentication system engineered with Node.js, Express, MongoDB, and React. Built to enterprise SaaS standards, focusing on high security, seamless UX, comprehensive automated testing, and modular scalability.

---

## 🚀 Features

### 🔐 Advanced Security & Authentication
- **🛡️ Active Device & Session Intelligence (Google / Clerk style)**: Multi-session tracking with zero-dependency User-Agent & IP parsing (device type, OS, browser, geolocation). Instant single-device revocation and bulk "Sign Out All Other Devices" with real-time tab-focus verification and heartbeat checks.
- **🔐 Two-Factor Authentication (TOTP 2FA)**: Full RFC 6238 TOTP implementation compatible with Google Authenticator, Authy, and 1Password. Scans QR code or manual secret, validates rolling 6-digit codes, and intercepts logins with 2FA challenges.
- **🔄 Emergency Backup Recovery Codes**: Issues 8 single-use cryptographically random backup codes (`XXXX-XXXX`) securely hashed with `bcrypt`. Includes on-demand password-verified code regeneration to prevent account lockouts.
- **Dual JWT Architecture**: Short-lived Access Tokens (15m) paired with long-lived Refresh Tokens (7d) stored securely.
- **Axios Interceptors**: Silent background token refreshing in React to maintain session continuity without UX interruption.
- **Account Lockout & Brute Force Protection**: Tracks failed login attempts and temporarily limits accounts (e.g., 15-minute freeze after 5 failures) paired with API rate limiting (`express-rate-limit`).
- **Google OAuth 2.0**: Frictionless Single Sign-On (SSO) integration seamlessly bridging backend Passport.js logic with the React frontend.
- **Role-Based Access Control (RBAC)**: Centralized authorization logic separating general Users from Admins, securing strict API routes and UI components.

### ✉️ Email Workflows & HTML Templating
- **OTP Registration**: Custom 6-digit One-Time-Password sent upon signup to verify email ownership before granting database access.
- **Password Recovery**: Secure password reset pipelines utilizing randomly generated hex tokens with strict 10-minute expiry windows.
- **HTML Templates**: Professional, inline-CSS email templates rendered natively for Verification, Password Reset, and Welcome emails.

### 💻 Premium Frontend (React)
- Layout crafted natively with modern SaaS design language (Inter font, sleek shadows, responsive forms).
- **React Router v6**: Explicit route guards (`<ProtectedRoute>`, `<AdminRoute>`) executing client-side JWT decoding for instant UI protection.
- **UX Polish**: Dynamic button loading spinners and fully animated `react-toastify` popups replacing native browser alerts.

---

## 🧪 Enterprise Testing Architecture

The backend is strictly verified by an extensive automated CI/CD testing pipeline using **Jest** and **Supertest**, mapping across APIs, Middlewares, and Databases.

**Current Status:** `100% Passing (20/20 assertions complete across 6 test suites)`

To guarantee flawless pipeline stability regardless of where the repository is cloned, several advanced testing integrations were configured:
1. **Isolated Testing Databases (`authx_test`)**: A fully separate MongoDB cluster is dynamically initialized when triggering Jest, completely shielding production/development data from test mutations.
2. **Synchronous Execution (`--runInBand`)**: Jest handles test-groupings purely sequentially. This bypasses structural parallel Database write-collisions that heavily trigger destructive race conditions between mutually exclusive test suites.
3. **Mocking SMTP Services (`jest.mock`)**: External Nodemailer SMTP network streams run through explicit mock interceptions. This massively accelerates sequence durations on CI/CD servers and entirely prevents `5000ms Hook Timeout` exceptions dropping APIs due to heavy email dispatching overheads.
4. **Environment Encapsulation (`tests/envMock.js`)**: Authentic `.env` files are fully excluded from the pipeline. Tests leverage explicitly stateless mocked environmental keys, allowing bulletproof testing functionality (`npm test`) to fire perfectly straight out-of-the-box upon `git clone`.

---

## 🐳 Docker & Container Orchestration

This entire repository (React Frontend, Node Backend, and MongoDB Database) is securely wrapped inside an enterprise CI/CD pipeline using **Docker**. This completely eliminates the "It works on my machine" problem, guaranteeing standard behavior across laptops, teammates, and AWS Cloud Servers.

- **Infrastructure as Code (`docker-compose.yml`)**: Controls the exact boot sequence of the 3 isolated microservice environments. Your MongoDB Database initializes natively, triggering the Node API, which subsequently boots the React environment.
- **Isolated Internal Networking**: The backend bypasses native localhost routing and talks to MongoDB completely wirelessly over a secure Docker internal DNS (`mongodb://mongo:27017/authx`), seamlessly overriding the raw `.env` mapping statically. 
- **Developer Acceleration**: A new engineer can type one single command (`docker-compose up`) to instantly construct and launch the complete 3-tier microservice architecture natively, without ever having to install MongoDB or Node.js versions on their native machine.

---

## 🛠️ Tech Stack

**Backend:** Node.js, Express.js, MongoDB, JWT, bcryptjs, Passport.js, Nodemailer, Express-Rate-Limit  
**Frontend:** React.js, React Router DOM, Axios, React Toastify, Custom Modern CSS  
**Testing & DevOps:** Jest, Supertest, Docker, Docker Compose  

---

## ⚙️ Installation & Usage

You can deploy the entire production stack instantly utilizing Docker Desktop:

### Method 1: Instant Orchestration (Docker)
Ensure Docker is installed on your computer. Inside the root `authx` folder, run a single command in your terminal:
```bash
docker-compose up --build
```
*(This command automatically downloads MongoDB, maps the React Frontend bindings, processes the secure internal environment arrays statically, and launches securely exposing port `3000`)*

### Method 2: Manual Native Execution
If you prefer running manual Node processes on older systems:

1. Connect a native instance of MongoDB on `127.0.0.1:27017`.
2. Create your `.env` locally mirroring standard secrets format.
3. Run `npm install` and `npm run dev` in the root folder (Starts Backend).
4. Run `cd authx-frontend`, `npm install`, and `npm start` (Starts Frontend).

---

