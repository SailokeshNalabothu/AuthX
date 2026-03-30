# AuthX Architecture

## Services

### 1. Frontend
- Tech: React
- Purpose: Login, signup, dashboard, protected pages
- Container name: authx-frontend
- Port: 3000
- Talks to: api (Backend)

### 2. Backend
- Tech: Node.js / Express
- Purpose: Authentication APIs, JWT handling, OTP, reset password, OAuth, RBAC
- Container name: authx-backend
- Port: 5000
- Talks to: MongoDB

### 3. Database
- Tech: MongoDB
- Purpose: Store users, tokens, auth data
- Container name: authx-mongo
- Port: 27017
- Volume: mongo-data

## Request Flow
Browser -> Frontend -> Backend API -> MongoDB

## Important Environment Variables
- PORT=5000
- MONGO_URI=mongodb://mongo:27017/authx
- JWT_SECRET=your_jwt_secret
- REFRESH_TOKEN_SECRET=your_refresh_secret
- GOOGLE_CLIENT_ID=your_google_client_id
- GOOGLE_CLIENT_SECRET=your_google_client_secret
- EMAIL_USER=your_email
- EMAIL_PASS=your_email_password

## Docker Networking
- Backend connects to Mongo using: mongodb://mongo:27017/authx
- Frontend connects to backend using: http://localhost:5000 (or `api:5000` internally)

## Startup Order
1. MongoDB (mongo)
2. Backend (api)
3. Frontend (frontend)
