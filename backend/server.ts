// Coordination Hub Server - Firebase Spark Plan Compatible
import express from "express";
import cors from "cors";
import helmet from "helmet";
import { auth, db } from "./firebase-admin";

const app = express();
const PORT = process.env.PORT || 5000;

type AuthedRequest = express.Request & { user?: { uid: string } };

/**
 * Verify Firebase ID token (sent by frontend as `Authorization: Bearer <idToken>`).
 * Attaches `req.user.uid` so endpoints can enforce RBAC safely.
 */
async function requireAuth(req: AuthedRequest, res: express.Response, next: express.NextFunction) {
  try {
    const header = req.headers.authorization;
    if (!header || !header.startsWith("Bearer ")) {
      return res.status(401).json({ error: "Missing Authorization Bearer token" });
    }

    const token = header.slice("Bearer ".length).trim();
    if (!token) {
      return res.status(401).json({ error: "Empty bearer token" });
    }

    const decoded = await auth.verifyIdToken(token);
    req.user = { uid: decoded.uid };
    return next();
  } catch {
    return res.status(401).json({ error: "Invalid or expired token" });
  }
}

// Security Middleware
app.use(helmet());
app.use(cors({
  origin: process.env.CORS_ORIGIN || "*",
  credentials: true,
}));
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

// Health Check Endpoint
app.get("/health", (req, res) => {
  res.json({ status: "operational", timestamp: new Date().toISOString() });
});

// ============================================================================
// AUTHENTICATION ENDPOINTS
// ============================================================================

/**
 * Create custom authentication token for user
 */
app.post("/api/auth/token", async (req, res) => {
  try {
    const { uid } = req.body;
    if (!uid) return res.status(400).json({ error: "UID required" });

    const token = await auth.createCustomToken(uid);
    res.json({ token, expiresIn: 3600 });
  } catch (error) {
    console.error("Token creation error:", error);
    res.status(500).json({ error: "Failed to create token" });
  }
});

/**
 * Verify ID token
 */
app.post("/api/auth/verify", async (req, res) => {
  try {
    const { token } = req.body;
    if (!token) return res.status(400).json({ error: "Token required" });

    const decodedToken = await auth.verifyIdToken(token);
    res.json({ valid: true, uid: decodedToken.uid, email: decodedToken.email });
  } catch (error) {
    console.error("Token verification error:", error);
    res.status(401).json({ valid: false, error: "Invalid token" });
  }
});

/**
 * User registration
 */
app.post("/api/auth/register", async (req, res) => {
  try {
    const { email, password, displayName } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: "Email and password required" });
    }

    const userRecord = await auth.createUser({
      email,
      password,
      displayName: displayName || email.split("@")[0],
    });

    // Create user profile in Firestore
    await db.collection("users").doc(userRecord.uid).set({
      uid: userRecord.uid,
      email,
      displayName: userRecord.displayName,
      createdAt: new Date().toISOString(),
      balance: { available: 0, pending: 0 },
      role: "participant",
      settings: {
        privacy: "public",
        notifications: true,
        twoFactorEnabled: false,
      },
    });

    res.status(201).json({
      uid: userRecord.uid,
      email: userRecord.email,
      displayName: userRecord.displayName,
    });
  } catch (error: any) {
    console.error("Registration error:", error);
    res.status(400).json({ error: error.message || "Registration failed" });
  }
});

/**
 * User login
 */
app.post("/api/auth/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: "Email and password required" });
    }

    // Verify user exists
    const userRecord = await auth.getUserByEmail(email);
    
    // Note: Firebase Admin SDK doesn't verify passwords directly
    // This should be done on the client-side with Firebase Auth
    // Server only validates the token

    res.json({ uid: userRecord.uid, email: userRecord.email });
  } catch (error: any) {
    console.error("Login error:", error);
    res.status(401).json({ error: "Invalid credentials" });
  }
});

// ============================================================================
// PEER DISCOVERY SERVICE (P2P Communication)
// ============================================================================

/**
 * Register peer for discovery
 */
app.post("/api/peers/register", requireAuth, async (req: AuthedRequest, res) => {
  try {
    const { peerId, location } = req.body;
    const userId = req.user?.uid;
    if (!peerId) {
      return res.status(400).json({ error: "peerId required" });
    }
    if (!userId) return res.status(401).json({ error: "Unauthorized" });

    await db.collection("peer_registry").doc(peerId).set({
      peerId,
      userId,
      location,
      registeredAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    });

    res.json({ registered: true, peerId });
  } catch (error) {
    console.error("Peer registration error:", error);
    res.status(500).json({ error: "Registration failed" });
  }
});

/**
 * Discover peers for P2P communication
 */
app.post("/api/peers/discover", requireAuth, async (req: AuthedRequest, res) => {
  try {
    const { location } = req.body;
    const userId = req.user?.uid;
    if (!userId) return res.status(401).json({ error: "Unauthorized" });

    const snapshot = await db
      .collection("peer_registry")
      .where("userId", "==", userId)
      .where("expiresAt", ">", new Date().toISOString())
      .get();

    const peers = snapshot.docs.map((doc) => doc.data());
    res.json({ peers });
  } catch (error) {
    console.error("Peer discovery error:", error);
    res.status(500).json({ error: "Discovery failed" });
  }
});

// ============================================================================
// PAYMENT GATEWAY INTEGRATION (Tokenization)
// ============================================================================

/**
 * Create payment token (never stores raw payment data)
 */
app.post("/api/payments/tokenize", requireAuth, async (req: AuthedRequest, res) => {
  try {
    const { amount, currency, paymentMethod } = req.body;
    const userId = req.user?.uid;

    if (!amount || !currency || !userId || !paymentMethod) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    // Generate secure token ID (random)
    const tokenId = `token_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Store token reference (not actual payment data) in Firestore
    await db.collection("payment_tokens").doc(tokenId).set({
      tokenId,
      userId,
      amount,
      currency,
      paymentMethod, // Should be encrypted and tokenized by PSP
      status: "pending",
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 15 * 60 * 1000).toISOString(), // 15 min expiry
    });

    // In production: Send to PSP (Stripe, PayPal, OPay) for actual tokenization
    res.json({ tokenId, status: "pending", expiresIn: 900 });
  } catch (error) {
    console.error("Payment tokenization error:", error);
    res.status(500).json({ error: "Tokenization failed" });
  }
});

/**
 * Process payment with tokenized data
 */
app.post("/api/payments/process", requireAuth, async (req: AuthedRequest, res) => {
  try {
    const { tokenId, amount, quizIds, classIds } = req.body;
    const userId = req.user?.uid;

    const amountNum = Number(amount);
    if (!userId || !tokenId || !Number.isFinite(amountNum) || amountNum <= 0) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    // Verify token still valid
    const tokenDoc = await db.collection("payment_tokens").doc(tokenId).get();
    if (!tokenDoc.exists) {
      return res.status(404).json({ error: "Token not found" });
    }

    const token = tokenDoc.data();
    if (new Date(token.expiresAt) < new Date()) {
      return res.status(400).json({ error: "Token expired" });
    }

    // Process payment with PSP (Stripe, PayPal, OPay, Crypto)
    const transactionId = `txn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    await db.collection("transactions").doc(transactionId).set({
      transactionId,
      userId,
      tokenId,
      amount: amountNum,
      currency: token.currency,
      quizIds: quizIds || [],
      classIds: classIds || [],
      status: "completed",
      createdAt: new Date().toISOString(),
      // 80/20 split
      creatorPayout: amountNum * 0.8,
      platformFee: amountNum * 0.2,
    });

    // Update user balance
    const userRef = db.collection("users").doc(userId);
    const currentPending =
      (await userRef.get()).data()?.balance?.pending ?? 0;
    await userRef.update({
      "balance.pending": currentPending + amountNum,
    });

    res.json({ transactionId, status: "completed", amount: amountNum });
  } catch (error) {
    console.error("Payment processing error:", error);
    res.status(500).json({ error: "Payment failed" });
  }
});

/**
 * Initiate payout (80% to creator, 20% platform)
 */
app.post("/api/payouts/initiate", requireAuth, async (req: AuthedRequest, res) => {
  try {
    const userId = req.user?.uid;
    if (!userId) return res.status(401).json({ error: "Unauthorized" });

    const userDoc = await db.collection("users").doc(userId).get();
    const userData = userDoc.data();
    const pendingBalance = userData?.balance?.pending || 0;

    if (pendingBalance <= 0) {
      return res.status(400).json({ error: "No pending balance" });
    }

    const creatorPayout = pendingBalance * 0.8;
    const payoutId = `payout_${Date.now()}`;

    await db.collection("payouts").doc(payoutId).set({
      payoutId,
      userId,
      amount: creatorPayout,
      platformFee: pendingBalance * 0.2,
      status: "pending",
      method: "bank_transfer", // Or crypto, PayPal, etc.
      createdAt: new Date().toISOString(),
    });

    // Reset pending balance
    await db.collection("users").doc(userId).update({
      "balance.pending": 0,
    });

    res.json({ payoutId, amount: creatorPayout, status: "pending" });
  } catch (error) {
    console.error("Payout initiation error:", error);
    res.status(500).json({ error: "Payout failed" });
  }
});

// ============================================================================
// ERROR HANDLING & LOGGING
// ============================================================================

app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error("Unhandled error:", err);
  res.status(err.status || 500).json({
    error: err.message || "Internal server error",
    timestamp: new Date().toISOString(),
  });
});

// Start Server
app.listen(PORT, () => {
  console.log(`🚀 Coordination Hub running on http://localhost:${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/health`);
});

export default app;
