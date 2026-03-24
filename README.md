# 🛡️ AuthX - Enterprise-Grade Authentication System

> A production-ready full-stack authentication system engineered with Node.js, Express, MongoDB, and React. Built to enterprise SaaS standards, focusing on high security, seamless UX, and modular scalability.

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

## 🛠️ Tech Stack

**Backend:**
- Node.js & Express.js
- MongoDB & Mongoose
- JSON Web Tokens (JWT) & bcryptjs
- Passport.js (Google OAuth20)
- Nodemailer (SMTP Email Services)
- Express-Rate-Limit

**Frontend:**
- React.js (Create React App)
- React Router DOM
- Axios (with Request/Response Interceptors)
- React Toastify
- Vanilla Modern CSS

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
Create a `.env` file in the root `authx` folder and populate it with the following:
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
**Start the Backend (Port 5000):**
```bash
cd authx
npm run dev
```

**Start the Frontend (Port 3000):**
Open a new terminal window:
```bash
cd authx/authx-frontend
npm start
```

---

## 📂 Project Structure

```text
📦 authx
 ┣ 📂 authx-frontend       # React Application
 ┃ ┣ 📂 src
 ┃ ┃ ┣ 📂 components       # Guard nodes (ProtectedRoute, AdminRoute)
 ┃ ┃ ┣ 📂 pages            # UI Views (Login, Signup, Dashboard, Admin)
 ┃ ┃ ┣ 📂 services         # Axios interceptors mapping (api.js)
 ┃ ┃ ┣ 📜 App.js           # Frontend Router Setup
 ┃ ┃ ┗ 📜 index.css        # Premium Global CSS System
 ┣ 📂 src                  # Express API Application
 ┃ ┣ 📂 config             # DB Connection & Passport Strategy
 ┃ ┣ 📂 controllers        # API Logic (Auth, User Actions)
 ┃ ┣ 📂 middleware         # JWT Validators, Role Gates
 ┃ ┣ 📂 models             # Mongoose Schemas (User)
 ┃ ┣ 📂 routes             # Express REST definitions
 ┃ ┣ 📂 services           # Nodemailer HTML dispatchers
 ┃ ┣ 📂 templates          # HTML Email definitions
 ┃ ┗ 📂 utils              # Scripting utilities (OTP Generation)
 ┣ 📜 .env                 # Environment Config
 ┣ 📜 server.js            # Node Launcher
 ┗ 📜 package.json         # Backend Dependencies
```

---

## 📝 API Endpoints Summary

| Method | Endpoint | Description | Access | 
|---|---|---|---|
| `POST` | `/api/auth/signup` | Register via Email | Public |
| `POST` | `/api/auth/verify-otp` | Submit 6-digit OTP | Public |
| `POST` | `/api/auth/login` | Authenticate & Retrieve dual tokens | Public |
| `POST` | `/api/auth/refresh` | Exchange Refresh Token for Access Token | Public |
| `POST` | `/api/auth/forgot-password` | Issue reset email template | Public |
| `POST` | `/api/auth/reset-password/:token`| Finalize new password generation | Public |
| `GET`  | `/api/auth/google` | Trigger Google SSO | Public |
| `GET`  | `/api/users` | Retrieve all registered users | **Admin** |
| `PUT`  | `/api/users/:id/role` | Modify User access level | **Admin** |
| `DELETE`| `/api/users/:id` | Drop User from database | **Admin** |

---
*Architected and Designed by a 3rd-Year CSE Student.*

error faced while testing 

Parallel DB Collisions: Jest tries to run everything at the exact same moment. auth.test.js was creating users while admin.test.js was simultaneously wiping the database (User.deleteMany), causing tests to randomly fail. I rewired your package.json with --runInBand so tests execute smoothly one after another.

SMTP Network Timeouts: Your admin.test was trying to fire off authentic nodemailer emails to Google's SMTP servers every time it created a mock user, causing Jest to timeout and crash. I injected strict jest.mock() blockers to intercept all email calls so tests run instantaneously without actually bombing anyone's inbox.

Environment Injection (dotenv): The backend OAuth configuration lacked visibility into your .env tokens exclusively during Jest runs. I updated jest.config.js to automatically parse and load your keys before running code, fixing the clientID crashes.

Rate Limit Throttling: The brute-force protector on /login started blocking your own test suites because Supertest fires requests so rapidly! I updated authRoutes.js using process.env.NODE_ENV === 'test' to expand the rate limit to 1000 dynamically only during testing.
