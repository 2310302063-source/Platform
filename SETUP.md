# 🚀 Complete Platform Setup Guide

## Quick Start - Do This First

### Step 1: Firebase Project Setup (5 minutes)

Go to [Firebase Console](https://console.firebase.google.com) and:

1. **Create Project**
   - Project Name: `ndidi-8d9fc`
   - Analytics: Enable (optional)
   - Select your region

2. **Enable Authentication**
   - Go to Authentication → Sign-in method
   - Enable:
     - Email/Password
     - Google
     - Facebook (optional)
     - LinkedIn (custom provider, optional)
     - Microsoft (optional)

3. **Create Firestore Database**
   - Go to Firestore Database
   - Create database in production mode
   - Select region (us-central1 recommended)

4. **Create Realtime Database**
   - Go to Realtime Database
   - Create in same region as Firestore
   - Start in locked mode initially

5. **Create Storage Bucket**
   - Go to Storage
   - Create bucket (for optional cloud storage)

6. **Get Service Account**
   - Go to Project Settings → Service Accounts
   - Click "Generate new private key"
   - Download JSON file
   - Save as `firebase-service-account.json` in project root

### Step 2: Environment Variables (2 minutes)

Your `.env.local` already has the correct values:

```env
VITE_FIREBASE_API_KEY=AIzaSyCNJgWNz6LZBujDfWuQI3uH4ratzZWMPEo
VITE_FIREBASE_PROJECT_ID=ndidi-8d9fc
# ... (rest are pre-configured)
```

### Step 3: Place Service Account (1 minute)

```bash
# Copy the downloaded JSON file to project root
cp ~/Downloads/firebase-service-account.json ./
```

### Step 4: Install Dependencies (5 minutes)

```bash
npm install
```

### Step 5: Deploy Firebase Rules (2 minutes)

```bash
npm run firebase:deploy:rules
```

### Step 6: Start Development (1 minute)

```bash
# Terminal 1: Start backend
npm run dev:backend

# Terminal 2 (in new window): Start frontend
npm run dev:frontend
```

---

## ✅ Verification Checklist

After setup, verify everything works:

### Frontend (http://localhost:5173)
- [ ] Page loads without errors
- [ ] Dark mode toggle works
- [ ] Can navigate between pages

### Backend (http://localhost:5000)
- [ ] Health check: `curl http://localhost:5000/health`
- [ ] Returns JSON with status: `ok`
- [ ] Shows connected services

### Firebase
- [ ] Can see data in Firestore Console
- [ ] Can see Realtime Database is connected
- [ ] No security rule errors in logs

---

## 📦 Services Status

### ✅ Completed

1. **Firebase Admin Service** (`backend/services/firebase-admin.service.ts`)
   - User management
   - Financial tracking
   - Content storage
   - Security alerts

2. **Authentication Service** (`backend/services/auth.service.ts`)
   - Email/password registration
   - Progressive login lockout
   - Role-Based Access Control (RBAC)
   - Permission checking

3. **Payment Service** (`backend/services/payment.service.ts`)
   - Tokenized payments (Stripe)
   - 80/20 revenue split
   - Withdrawal processing
   - Multiple payment methods

4. **AI Monitoring Agent** (`backend/services/ai-monitoring.service.ts`)
   - Security threat detection
   - Content moderation
   - Behavioral anomaly detection
   - Automated response system

5. **API Client** (`src/services/api-client.ts`)
   - HTTP communication
   - Authentication token management
   - Error handling

6. **Security Utilities** (`src/security/utils.ts`)
   - Input validation
   - HTML sanitization
   - Rate limiting
   - CSRF protection
   - Biometric auth helpers

7. **Offline Database** (`src/storage/offlineDB.ts`)
   - IndexedDB integration (Dexie)
   - Local quiz storage
   - Message caching
   - Media file management
   - Sync queue

8. **Global State Management** (`src/store/index.ts`)
   - Zustand stores
   - Auth state
   - Profile management
   - Payment tracking
   - UI state
   - Quiz drafts
   - Offline data

---

## 🔧 Running Different Parts

### Development Mode (All services)
```bash
npm run dev
```

### Frontend Only
```bash
npm run dev:frontend
```

### Backend Only
```bash
npm run dev:backend
```

### Production Build
```bash
npm run build
```

### Type Check
```bash
npm run type-check
```

### Linting
```bash
npm run lint
```

---

## 🔐 Security Setup

### Firestore Security Rules (Already deployed)

```
- Users: Can only read/write own data
- Quizzes: Public read, creator write
- Chat messages: Participants only
- Transactions: User/admin only
- Security alerts: Admin only
```

### Realtime Database Rules (Already deployed)

```
- Peer registry: Authenticated read/write
- Payment tokens: Authenticated read/write
- User sessions: User/admin only
```

---

## 💾 Database Collections

### Users
- uid, email, displayName, role
- profile: bio, location, avatar, etc.
- balance: total, available, pending
- securitySettings: 2FA, biometric, attempts
- settings: privacy, notifications

### Quizzes
- Title, description, questions
- Payment configuration
- SEO metadata
- Settings: shuffle, timing, scoring
- Status, attempts, earnings

### Schools
- Name, description, thumbnail
- Members, classes
- Verified status
- Creation date

### Classes
- Name, description, schedule
- Members, payment config
- Status, creation date

### Payments
- Amount, currency, method
- Stripe/PayPal/OPay/Crypto
- Status (pending/completed/failed)

### Transactions
- Type: payment/withdrawal/refund
- Amount, platform fee
- Status, dates

### Security Alerts
- Type: brute_force/sql_injection/xss/etc.
- Severity: low/medium/high/critical
- Description, action taken
- Status: open/resolved

---

## 📊 API Endpoints

### Health
```
GET /health
GET /api/status
```

### Authentication
```
POST /api/auth/register
POST /api/auth/login
```

### Payments
```
POST /api/payments/intent
POST /api/payments/confirm
GET /api/payments/balance/:userId
POST /api/payments/withdraw
```

### Peer Discovery
```
POST /api/peers/register
GET /api/peers/:userId
```

### AI Monitoring
```
POST /api/ai/security/check
POST /api/ai/content/moderate
GET /api/ai/anomalies
GET /api/ai/report/:timeframe
```

---

## 🐛 Troubleshooting

### Firebase Connection Issues

**Error**: "Firebase credentials not found"
```bash
# Solution: Place firebase-service-account.json in root
ls firebase-service-account.json

# If not there, download from Firebase Console
# Project Settings → Service Accounts → Generate new private key
```

**Error**: "Cannot connect to Firebase"
```bash
# Solution: Check environment variables
cat .env.local | grep FIREBASE

# Verify values match Firebase Console
```

### Port Already in Use

**Error**: "Port 5000 already in use"
```bash
# Solution: Kill process on port 5000
# macOS/Linux:
lsof -ti:5000 | xargs kill -9

# Windows:
netstat -ano | findstr :5000
taskkill /PID <PID> /F
```

### Module Not Found

**Error**: "Cannot find module 'firebase'"
```bash
# Solution: Reinstall dependencies
rm -rf node_modules package-lock.json
npm install
```

---

## 📈 Next Steps

1. **Build Quiz Creation Page**
   - Rich text editors for questions
   - Media upload
   - Payment configuration
   - SEO metadata

2. **Implement Chat System**
   - WebRTC for voice/video
   - E2EE for messages
   - Offline messaging (Wi-Fi Direct)

3. **Create Admin Dashboard**
   - User management
   - Content moderation
   - AI control panel
   - Analytics

4. **Build School/Class System**
   - School creation and management
   - Class enrollment
   - Recurring lessons
   - Assignments

5. **Deploy to Production**
   - Firebase Hosting
   - Vercel for backend
   - Custom domain
   - SSL certificates

---

## 📞 Support

If you encounter issues:

1. Check this guide first
2. Review error messages in console
3. Check Firebase Console for issues
4. Review documentation links below

---

## 🔗 Documentation

- [Firebase Documentation](https://firebase.google.com/docs)
- [Vite Documentation](https://vitejs.dev)
- [Express.js Documentation](https://expressjs.com)
- [React Documentation](https://react.dev)
- [Zustand Documentation](https://github.com/pmndrs/zustand)

---

**Setup Date**: March 21, 2026  
**Status**: ✅ Ready for Development  
**Next Phase**: Quiz Engine Implementation
