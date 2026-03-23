// Firebase Admin Configuration (Backend)
// Set these environment variables on your hosting (Vercel, Firebase Functions, etc.)

export const firebaseAdminConfig = {
  // Get these from Firebase Console > Project Settings > Service Accounts
  type: "service_account",
  project_id: process.env.FIREBASE_PROJECT_ID,
  private_key_id: process.env.FIREBASE_PRIVATE_KEY_ID,
  private_key: process.env.FIREBASE_PRIVATE_KEY,
  client_email: process.env.FIREBASE_CLIENT_EMAIL,
  client_id: process.env.FIREBASE_CLIENT_ID,
  auth_uri: "https://accounts.google.com/o/oauth2/auth",
  token_uri: "https://oauth2.googleapis.com/token",
  auth_provider_x509_cert_url: "https://www.googleapis.com/oauth2/v1/certs",
  client_x509_cert_url: process.env.FIREBASE_CERT_URL,
};

/**
 * SETUP INSTRUCTIONS FOR FIREBASE SPARK PLAN
 * 
 * 1. Go to Firebase Console: https://console.firebase.google.com
 * 2. Create a new project or use existing "ndidi-8d9fc"
 * 3. Enable these services:
 *    - Authentication (Email/Password, Google, LinkedIn, Facebook, Microsoft)
 *    - Realtime Database
 *    - Firestore Database
 *    - Storage
 *    - Functions (optional, for scheduled tasks)
 * 
 * 4. Get credentials:
 *    - Go to Project Settings > Service Accounts
 *    - Click "Generate new private key"
 *    - This JSON file contains all credentials needed
 * 
 * 5. Set environment variables on your server:
 *    - FIREBASE_PROJECT_ID
 *    - FIREBASE_PRIVATE_KEY
 *    - FIREBASE_CLIENT_EMAIL
 *    - FIREBASE_DATABASE_URL
 * 
 * 6. Firestore Security Rules (copy to Firebase Console):
 */

export const firestoreSecurityRules = `
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    
    // Users collection - only own data
    match /users/{userId} {
      allow read: if request.auth.uid == userId;
      allow write: if request.auth.uid == userId && validateUser(resource.data);
    }
    
    // Quizzes - public read, creator write
    match /quizzes/{quizId} {
      allow read: if true;
      allow create: if request.auth != null && validateQuiz(request.resource.data);
      allow update, delete: if request.auth.uid == resource.data.creatorId;
    }
    
    // Chat messages - E2E encrypted
    match /chats/{chatId}/messages/{messageId} {
      allow read: if request.auth.uid in resource.data.participants;
      allow create: if request.auth != null && request.resource.data.senderId == request.auth.uid;
      allow update, delete: if request.auth.uid == resource.data.senderId;
    }
    
    // Transactions - secure payment processing
    match /transactions/{transactionId} {
      allow read: if request.auth.uid == resource.data.userId;
      allow create: if request.auth != null && request.resource.data.userId == request.auth.uid;
    }
    
    // Security alerts - admin only
    match /security_alerts/{alertId} {
      allow read: if getUserRole(request.auth.uid) == 'admin';
      allow write: if getUserRole(request.auth.uid) == 'admin';
    }
  }
  
  // Helper functions
  function validateUser(data) {
    return data.email is string && data.email.size() > 0 &&
           data.displayName is string &&
           data.role in ['participant', 'creator', 'admin'];
  }
  
  function validateQuiz(data) {
    return data.title is string && data.title.size() > 0 &&
           data.creatorId is string &&
           data.questions is list &&
           data.questions.size() > 0;
  }
  
  function getUserRole(uid) {
    return get(/databases/$(database)/documents/users/$(uid)).data.role;
  }
}
`;

/**
 * Realtime Database Rules
 */
export const rtdbSecurityRules = `
{
  "rules": {
    "peer_registry": {
      ".read": true,
      ".write": "auth != null",
      "$peerId": {
        ".validate": "newData.hasChildren(['peerId', 'userId', 'registeredAt'])"
      }
    },
    "payment_tokens": {
      ".read": false,
      ".write": "auth != null",
      "$tokenId": {
        ".validate": "newData.hasChildren(['tokenId', 'amount', 'currency'])"
      }
    },
    "user_sessions": {
      "$userId": {
        ".read": "$userId === auth.uid || root.child('users').child(auth.uid).child('role').val() === 'admin'",
        ".write": "$userId === auth.uid"
      }
    }
  }
}
`;

/**
 * Environment Setup Checklist
 */
export const setupChecklist = `
✅ FIREBASE SPARK PLAN SETUP CHECKLIST

Frontend Environment Variables (.env.local):
☐ VITE_FIREBASE_API_KEY
☐ VITE_FIREBASE_AUTH_DOMAIN
☐ VITE_FIREBASE_DATABASE_URL
☐ VITE_FIREBASE_PROJECT_ID
☐ VITE_FIREBASE_STORAGE_BUCKET
☐ VITE_FIREBASE_MESSAGING_SENDER_ID
☐ VITE_FIREBASE_APP_ID

Backend Environment Variables:
☐ FIREBASE_PROJECT_ID
☐ FIREBASE_PRIVATE_KEY
☐ FIREBASE_CLIENT_EMAIL
☐ FIREBASE_DATABASE_URL

Firebase Console Setup:
☐ Create project: ndidi-8d9fc
☐ Enable Authentication (Email, Google, OAuth)
☐ Enable Firestore Database
☐ Enable Realtime Database
☐ Enable Storage
☐ Create Service Account & download JSON
☐ Add Firestore Security Rules
☐ Add Realtime Database Rules
☐ Configure CORS for API endpoints

Payment Gateway Setup:
☐ Stripe: Get API keys from dashboard.stripe.com
☐ PayPal: Get sandbox credentials
☐ OPay: Contact support for integration
☐ Add webhook endpoints for payment confirmations

Deployment:
☐ Deploy backend to Vercel, Railway, or Firebase Functions
☐ Deploy frontend to Vercel, Netlify, or Firebase Hosting
☐ Set production environment variables
☐ Enable HTTPS/SSL
☐ Configure custom domain

Security:
☐ Enable 2FA on all accounts
☐ Rotate API keys monthly
☐ Enable Firebase ML for content moderation
☐ Set up error logging (Sentry)
☐ Enable rate limiting
☐ Configure DDoS protection

Monitoring:
☐ Set up Firebase Performance Monitoring
☐ Configure Cloud Logging
☐ Set up alerts for anomalies
☐ Monitor quota usage (Firebase Spark has limits)
`;
