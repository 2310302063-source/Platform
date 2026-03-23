# Social Learning Platform - Enterprise Edition

A comprehensive, enterprise-grade social learning platform with End-to-End Encryption, AI Governance, and offline-first architecture.

## 🚀 Features

### Core Features
- ✅ End-to-End Encryption (E2EE) with TLS 1.3 + AES-256
- ✅ Tokenized Payment Processing (PCI DSS Compliant)
- ✅ Role-Based Access Control (RBAC)
- ✅ Input Validation & Sanitization (OWASP)
- ✅ AI Monitoring Agent with Anomaly Detection
- ✅ Advanced Quiz Engine with Rich Media
- ✅ Real-time Chat with Offline Support
- ✅ Social Features (Posts, Comments, Reactions)
- ✅ Monetization (80/20 Revenue Split)
- ✅ Admin Dashboard with God Mode Control

### Security
- **E2E Encryption**: All communications encrypted with Signal Protocol
- **Data at Rest**: AES-256-GCM encryption
- **Authentication**: Multi-factor, biometric support, progressive security locks
- **Monitoring**: AI agent monitors for anomalies, injection attacks, rate limiting
- **Compliance**: PCI DSS, GDPR/CCPA ready

### Architecture
- **Frontend**: React 18 + Vite + TypeScript
- **Backend**: Express.js coordination hub on Firebase
- **Database**: Firestore + Realtime Database
- **Offline**: IndexedDB + Dexie + Service Workers
- **P2P**: WebRTC + PeerJS for peer discovery
- **Storage**: Device-first + external cloud options

## 📋 Project Structure

```
platform/
├── backend/
│   ├── server.ts              # Coordination hub (Firebase compatible)
│   └── tsconfig.json
├── src/
│   ├── ai/
│   │   ├── learningAssistant.ts  # AI for quizzes & learning
│   │   └── monitoringAgent.ts    # Security monitoring AI
│   ├── config/
│   │   └── firebase.ts           # Firebase config
│   ├── security/
│   │   ├── e2ee.ts              # End-to-end encryption
│   │   └── validation.ts        # Input validation
│   ├── storage/
│   │   └── offlineDB.ts         # Offline database (IndexedDB)
│   ├── store/
│   │   └── index.ts             # Global state (Zustand)
│   ├── pages/
│   │   ├── AdminDashboard.tsx
│   │   ├── LoginPage.tsx
│   │   ├── CreateQuizPage.tsx
│   │   ├── ChatPage.tsx
│   │   └── ... (other pages)
│   ├── App.tsx
│   └── main.tsx
├── public/
│   └── sw.js                    # Service Worker
├── .env.local                   # Environment config
├── package.json
├── vite.config.ts
├── tailwind.config.js
└── README.md
```

## 🔧 Setup & Installation

### Prerequisites
- Node.js 18+
- npm or yarn
- Firebase project (Spark Plan Free)

### 1. Install Dependencies

```bash
cd platform
npm install
```

### 2. Configure Environment

The `.env.local` file already contains Firebase credentials. Update if needed:

```env
REACT_APP_FIREBASE_API_KEY=...
REACT_APP_FIREBASE_PROJECT_ID=...
# ... other configs
```

### 3. Start Development

```bash
# Start both frontend (port 3000) and backend (port 5000)
npm run dev

# Or start individually:
npm run dev:frontend  # Vite on port 3000
npm run dev:backend   # Express on port 5000
```

### 4. Build for Production

```bash
npm run build
npm start
```

## 🔐 Security Features

### End-to-End Encryption
- All chat messages encrypted with libsodium
- Asymmetric key exchange for peers
- Perfect forward secrecy

### Input Validation
- HTML/XSS sanitization
- SQL injection prevention
- Command injection prevention
- Rate limiting on all endpoints
- Password strength validation

### AI Monitoring Agent
```
Monitors for:
- Unusual login patterns
- Rapid multiple attempts
- Geographic anomalies
- Injection attacks
- Rate limit violations
- Suspicious payments
```

### Progressive Security Lock
```
Failed login attempts:
- 1-4 attempts: Normal
- 5 attempts: 2-minute lock
- 6 attempts: 4-minute lock (2×2)
- 7+ attempts: 16-minute+ locks (exponential)
```

## 💳 Payment Processing

- **Tokenization**: Never stores raw payment data
- **PCI DSS Compliant**: Uses trusted PSP (Stripe, PayPal, OPay, Crypto)
- **Revenue Split**: 80% to creator, 20% to platform
- **Aggregated Payments**: Multiple quizzes/classes in one transaction

## 🤖 AI Integration

### Monitoring Agent (Platform Level)
- Real-time anomaly detection
- Vulnerability scanning
- Caching optimization
- Threat reporting to admin

### Learning Assistant (User Level)
- Quiz hint generation
- Performance feedback
- Conversation summarization
- Content moderation
- Subject-specific Q&A

### Admin Control
- Adjust AI sensitivity (1-10 scale)
- Send custom instructions
- View audit logs
- Configure guardrails

## 📊 Admin Dashboard

The admin dashboard (`/admin`) provides:

- **Overview**: Active alerts, blocked attempts, monitored users, AI health
- **Alerts**: Real-time security alerts with severity levels
- **Governance**: Content filtering, prompt injection detection, sensitive data detection
- **AI Control**: Send instructions to AI, monitor capabilities
- **Analytics**: DAU/MAU, revenue trends, engagement metrics

## 🚀 Deployment

### Firebase Deployment
```bash
npm run build
firebase deploy
```

### Docker (Optional)
```bash
docker build -t social-learning-platform .
docker run -p 3000:3000 -p 5000:5000 social-learning-platform
```

## 📱 Features Roadmap

### Phase 1 (Current)
- ✅ Core authentication & E2E encryption
- ✅ Quiz engine
- ✅ Chat with offline support
- ✅ Admin dashboard

### Phase 2
- [ ] Advanced social features
- [ ] Gamification (leaderboards, badges)
- [ ] Live streaming
- [ ] Full LMS features

### Phase 3
- [ ] Metaverse integration
- [ ] Blockchain credentials
- [ ] Cross-platform interoperability

## 📚 API Documentation

### Authentication Endpoints
- `POST /api/auth/register` - Create account
- `POST /api/auth/login` - Login
- `POST /api/auth/token` - Get auth token
- `POST /api/auth/verify` - Verify token

### Payment Endpoints
- `POST /api/payments/tokenize` - Create payment token
- `POST /api/payments/process` - Process payment
- `POST /api/payouts/initiate` - Request payout

### Peer Discovery
- `POST /api/peers/register` - Register peer
- `POST /api/peers/discover` - Discover peers

## 🐛 Troubleshooting

### Firebase Connection Issues
```bash
# Check if emulator is running (dev only)
firebase emulators:start

# Or connect to production
firebase use --add
```

### Build Errors
```bash
# Clear cache and reinstall
rm -rf node_modules package-lock.json
npm install
npm run build
```

## 📄 License

Proprietary - All Rights Reserved

## 🤝 Contributing

Contact the admin for feature requests or bug reports.

## 📞 Support

- Email: support@learnhub.com
- Admin Dashboard: `/admin`
- Docs: GitHub Wiki
