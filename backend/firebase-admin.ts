// Firebase Backend Configuration (Node.js/Admin SDK)
import admin from "firebase-admin";
import * as fs from "fs";
import * as path from "path";
import dotenv from "dotenv";

// Ensure we load the same env file your frontend uses during local development.
const localEnvPath = path.join(process.cwd(), ".env.local");
const fallbackEnvPath = path.join(process.cwd(), ".env");
dotenv.config({
  path: fs.existsSync(localEnvPath) ? localEnvPath : fallbackEnvPath,
});

// Get service account from environment or file
const serviceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH || 
  path.join(process.cwd(), "firebase-service-account.json");

let serviceAccount: any;

try {
  if (process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
    // Parse from environment variable
    serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON);
  } else if (fs.existsSync(serviceAccountPath)) {
    // Read from file
    serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, "utf8"));
  } else {
    throw new Error(
      `Service account not found. Please set FIREBASE_SERVICE_ACCOUNT_PATH or FIREBASE_SERVICE_ACCOUNT_JSON`
    );
  }
} catch (error) {
  console.error("❌ Failed to load Firebase service account:", error);
  process.exit(1);
}

// Initialize Firebase Admin SDK
try {
  const projectId =
    process.env.FIREBASE_PROJECT_ID ||
    serviceAccount?.project_id ||
    process.env.VITE_FIREBASE_PROJECT_ID;

  const databaseURL =
    process.env.FIREBASE_DATABASE_URL ||
    process.env.VITE_FIREBASE_DATABASE_URL ||
    process.env.REACT_APP_FIREBASE_DATABASE_URL;

  if (!databaseURL) {
    throw new Error(
      "FIREBASE_DATABASE_URL is missing (set it in .env.local or environment variables)"
    );
  }

  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL,
    ...(projectId ? { projectId } : {}),
  });
  console.log("✅ Firebase Admin SDK initialized successfully");
} catch (error) {
  console.error("❌ Firebase initialization failed:", error);
  process.exit(1);
}

// Export services
export const auth = admin.auth();
export const db = admin.firestore();
export const rtdb = admin.database();
export const storage = admin.storage();
export const messaging = admin.messaging();

// Initialize Firestore settings
db.settings({
  ignoreUndefinedProperties: true,
  cacheSizeBytes: 40000000, // 40MB cache
});

// Create collection references for quick access
export const collections = {
  users: db.collection("users"),
  quizzes: db.collection("quizzes"),
  categories: db.collection("categories"),
  questions: db.collection("questions"),
  messages: db.collection("messages"),
  chatRooms: db.collection("chatRooms"),
  posts: db.collection("posts"),
  comments: db.collection("comments"),
  schools: db.collection("schools"),
  classes: db.collection("classes"),
  transactions: db.collection("transactions"),
  payouts: db.collection("payouts"),
  payments: db.collection("payments"),
  securityAlerts: db.collection("security_alerts"),
  auditLogs: db.collection("audit_logs"),
  userBehavior: db.collection("user_behavior"),
  peerRegistry: db.collection("peer_registry"),
  paymentTokens: db.collection("payment_tokens"),
};

export default admin;
