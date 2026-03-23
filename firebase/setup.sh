#!/bin/bash
# Firebase Setup & Deployment Script

echo "================================"
echo "🔥 Firebase Platform Setup"
echo "================================"
echo ""

# Check if Firebase CLI is installed
if ! command -v firebase &> /dev/null; then
    echo "❌ Firebase CLI not found. Installing..."
    npm install -g firebase-tools
fi

# Check environment variables
echo "📋 Checking environment setup..."
if [ -z "$FIREBASE_PROJECT_ID" ]; then
    echo "⚠️  FIREBASE_PROJECT_ID not set"
    echo "   Setting to: ndidi-8d9fc"
    export FIREBASE_PROJECT_ID="ndidi-8d9fc"
fi

if [ -z "$FIREBASE_SERVICE_ACCOUNT_PATH" ]; then
    echo "⚠️  FIREBASE_SERVICE_ACCOUNT_PATH not set"
    echo "   Please download your service account key from Firebase Console"
    echo "   URL: https://console.firebase.google.com/project/ndidi-8d9fc/settings/serviceaccounts"
    echo ""
    read -p "Enter path to service account JSON file: " FIREBASE_SERVICE_ACCOUNT_PATH
    export FIREBASE_SERVICE_ACCOUNT_PATH
fi

# Verify service account file exists
if [ ! -f "$FIREBASE_SERVICE_ACCOUNT_PATH" ]; then
    echo "❌ Service account file not found at: $FIREBASE_SERVICE_ACCOUNT_PATH"
    exit 1
fi

echo "✅ Service account verified"
echo ""

# Login to Firebase
echo "🔐 Logging into Firebase..."
firebase login --no-localhost || {
    echo "❌ Firebase login failed"
    exit 1
}

# Set project
echo "📂 Setting Firebase project..."
firebase use $FIREBASE_PROJECT_ID

# Deploy Firestore rules
echo "🛡️  Deploying Firestore security rules..."
firebase deploy --only firestore:rules || {
    echo "⚠️  Firestore rules deployment had issues"
}

# Deploy Realtime Database rules
echo "🛡️  Deploying Realtime Database rules..."
firebase deploy --only database || {
    echo "⚠️  Database rules deployment had issues"
}

# Initialize Firestore
echo "🗄️  Initializing Firestore collections..."
npm run init:firestore

# Create admin user
echo "👨‍💼 Creating admin user..."
read -p "Enter admin email: " ADMIN_EMAIL
read -sp "Enter admin password: " ADMIN_PASSWORD
echo ""

firebase auth:create $ADMIN_EMAIL --password "$ADMIN_PASSWORD" || {
    echo "⚠️  Admin user creation had issues"
}

echo ""
echo "================================"
echo "✅ Firebase Setup Complete!"
echo "================================"
echo ""
echo "📊 Your Firebase Project:"
echo "   Project ID: ndidi-8d9fc"
echo "   Console: https://console.firebase.google.com/project/ndidi-8d9fc"
echo ""
echo "🚀 Next steps:"
echo "   1. Install dependencies: npm install"
echo "   2. Start backend: npm run dev:backend"
echo "   3. Start frontend: npm run dev:frontend"
echo ""
