// Firebase Initialization - Create collections and indexes
import admin from "firebase-admin";
import { collections } from "../backend/firebase-admin";

async function initializeFirestore() {
  console.log("🚀 Initializing Firestore...");

  try {
    // Create root admin user document structure
    console.log("📝 Creating Firestore collections...");

    // Initialize collections with sample data
    const collectionsToInit = [
      "users",
      "quizzes",
      "categories",
      "questions",
      "messages",
      "chatRooms",
      "posts",
      "comments",
      "schools",
      "classes",
      "transactions",
      "payouts",
      "payments",
      "security_alerts",
      "audit_logs",
      "user_behavior",
      "peer_registry",
      "payment_tokens",
    ];

    for (const collection of collectionsToInit) {
      // Create a sentinel document to initialize the collection
      await admin
        .firestore()
        .collection(collection)
        .doc("_init")
        .set(
          {
            initialized: true,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
          },
          { merge: true }
        );
      console.log(`✅ Collection initialized: ${collection}`);
    }

    // Create security rules index
    console.log("🔍 Creating composite indexes...");
    // Indexes are created automatically in Firebase Console for Firestore queries

    // Create default admin role document
    console.log("👨‍💼 Setting up admin role...");
    const adminRole = {
      name: "Admin",
      permissions: [
        "manage_users",
        "manage_content",
        "view_analytics",
        "manage_payments",
        "manage_ai",
        "view_audit_logs",
      ],
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    // Create creator role document
    const creatorRole = {
      name: "Creator",
      permissions: [
        "create_quizzes",
        "create_classes",
        "create_schools",
        "manage_own_content",
        "view_own_analytics",
        "withdraw_earnings",
      ],
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    // Create participant role document
    const participantRole = {
      name: "Participant",
      permissions: ["take_quizzes", "join_classes", "message", "create_posts"],
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    await admin.firestore().collection("roles").doc("admin").set(adminRole);
    await admin.firestore().collection("roles").doc("creator").set(creatorRole);
    await admin
      .firestore()
      .collection("roles")
      .doc("participant")
      .set(participantRole);

    console.log("✅ Roles created");

    // Initialize configuration
    console.log("⚙️  Setting up platform configuration...");
    const platformConfig = {
      name: "Social Learning Platform",
      version: "1.0.0",
      features: {
        e2eEncryption: true,
        offlineMode: true,
        aiMonitoring: true,
        payments: true,
        socialFeatures: true,
      },
      settings: {
        aiSensitivity: 5,
        contentModerationEnabled: true,
        automaticBanning: true,
        maxUploadSize: 5 * 1024 * 1024 * 1024, // 5GB
      },
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    await admin
      .firestore()
      .collection("_config")
      .doc("platform")
      .set(platformConfig);

    console.log("✅ Platform configuration created");

    console.log("");
    console.log("================================");
    console.log("✅ Firestore Initialized Successfully!");
    console.log("================================");
  } catch (error) {
    console.error("❌ Initialization error:", error);
    process.exit(1);
  }
}

// Run initialization
initializeFirestore();
