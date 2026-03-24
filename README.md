# 🛡️ AuthX - Enterprise-Grade Authentication System

> A production-ready full-stack authentication system engineered with Node.js, Express, MongoDB, and React. Built to enterprise SaaS standards, focusing on high security, seamless UX, comprehensive automated testing, and modular scalability.

---

## 🚀 Features

### 🔐 Advanced Security & Authentication
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

**Current Status:** `100% Passing (18/18 assertions complete)`

To guarantee flawless pipeline stability regardless of where the repository is cloned, several advanced testing integrations were configured:
1. **Isolated Testing Databases (`authx_test`)**: A fully separate MongoDB cluster is dynamically initialized when triggering Jest, completely shielding production/development data from test mutations.
2. **Synchronous Execution (`--runInBand`)**: Jest handles test-groupings purely sequentially. This bypasses structural parallel Database write-collisions that heavily trigger destructive race conditions between mutually exclusive test suites.
3. **Mocking SMTP Services (`jest.mock`)**: External Nodemailer SMTP network streams run through explicit mock interceptions. This massively accelerates sequence durations on CI/CD servers and entirely prevents `5000ms Hook Timeout` exceptions dropping APIs due to heavy email dispatching overheads.
4. **Environment Encapsulation (`tests/envMock.js`)**: Authentic `.env` files are fully excluded from the pipeline. Tests leverage explicitly stateless mocked environmental keys, allowing bulletproof testing functionality (`npm test`) to fire perfectly straight out-of-the-box upon `git clone`.

---

## 🛠️ Tech Stack

**Backend:** Node.js, Express.js, MongoDB (Mongoose), JSON Web Tokens (JWT), bcryptjs, Passport.js, Nodemailer, Express-Rate-Limit  
**Frontend:** React.js (CRA), React Router DOM, Axios, React Toastify, Custom Modern CSS  
**Testing:** Jest, Supertest, cross-env  

---

## ⚙️ Installation & Setup

### 1. Clone & Install Dependencies
First, clone the repository and install the backend modules:
```bash
git clone <repository_url>
cd authx
npm install
```

Then, install the React frontend dependencies:
```bash
cd authx-frontend
npm install
```

### 2. Environment Variables (.env)
Create a `.env` file in the root `authx` folder and populate it:
```env
PORT=5000
MONGO_URI=mongodb://127.0.0.1:27017/authx

# JWT Secrets (Use strong random strings in production)
JWT_SECRET=supersecretkey
ACCESS_TOKEN_SECRET=accesssecret
REFRESH_TOKEN_SECRET=refreshsecret

# Nodemailer Credentials
EMAIL_USER=your_email@gmail.com
EMAIL_PASS=your_app_password

# Google OAuth Credentials
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
```

### 3. Run the Application
Start both applications on separate terminal instances:

**Run the Backend (Port 5000):**
```bash
cd authx
npm run dev
```

**Run the Frontend (Port 3000):**
```bash
cd authx/authx-frontend
npm start
```

**Run the Internal Enterprise Test Suite:**
```bash
cd authx
npm test
```

---
*Architected and Designed by a 3rd-Year CSE Student.*
