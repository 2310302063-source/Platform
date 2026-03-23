// Core Firebase Configuration & Coordination Hub Integration
import { initializeApp } from "firebase/app";
import { getAuth, connectAuthEmulator } from "firebase/auth";
import { getFirestore, connectFirestoreEmulator } from "firebase/firestore";
import { getDatabase, connectDatabaseEmulator } from "firebase/database";
import { getStorage, connectStorageEmulator } from "firebase/storage";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  databaseURL: import.meta.env.VITE_FIREBASE_DATABASE_URL,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

// Initialize Firebase
export const app = initializeApp(firebaseConfig);

// Initialize Services
export const auth = getAuth(app);
export const db = getFirestore(app);
export const rtdb = getDatabase(app);
export const storage = getStorage(app);

// Development environment emulator setup
if (import.meta.env.DEV) {
  try {
    connectAuthEmulator(auth, "http://localhost:9099", { disableWarnings: true });
  } catch {
    // Ignore if emulator already connected/not running.
  }

  try {
    connectFirestoreEmulator(db, "localhost", 8080);
  } catch {
    // Ignore if emulator already connected/not running.
  }

  try {
    connectDatabaseEmulator(rtdb, "localhost", 9000);
  } catch {
    // Ignore if emulator already connected/not running.
  }

  try {
    connectStorageEmulator(storage, "localhost", 9199);
  } catch {
    // Ignore if emulator already connected/not running.
  }
}

// Coordination Hub Configuration
export const coordinationHubConfig = {
  authService: "firebase",
  peerDiscovery: "webrtc",
  encryptionProtocol: "tls_1_3_aes_256",
  offlineFallback: true,
  aiMonitoring: {
    enabled: import.meta.env.VITE_AI_ENABLED === "true",
    anomalyDetection: true,
    vulnerabilityScanning: true,
    cachingOptimization: true,
  },
};

export default app;
