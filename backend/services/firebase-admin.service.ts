/**
 * Firebase Admin Service
 * Handles all backend Firebase operations: Authentication, Database, Storage, etc.
 */

import * as admin from 'firebase-admin';
import * as fs from 'fs';
import * as path from 'path';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

interface ServiceAccountConfig {
  type: string;
  project_id: string;
  private_key_id: string;
  private_key: string;
  client_email: string;
  client_id: string;
  auth_uri: string;
  token_uri: string;
  auth_provider_x509_cert_url: string;
  client_x509_cert_url: string;
}

class FirebaseAdminService {
  private app: admin.app.App;
  private db: admin.firestore.Firestore;
  private rtdb: admin.database.Database;
  private auth: admin.auth.Auth;
  private storage: admin.storage.Storage;

  constructor() {
    this.initializeFirebase();
  }

  /**
   * Initialize Firebase Admin SDK
   */
  private initializeFirebase(): void {
    try {
      // Load service account from environment or file
      let serviceAccount: ServiceAccountConfig;

      const serviceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH;
      if (serviceAccountPath && fs.existsSync(serviceAccountPath)) {
        const serviceAccountJson = fs.readFileSync(serviceAccountPath, 'utf-8');
        serviceAccount = JSON.parse(serviceAccountJson);
      } else {
        // Build from environment variables
        serviceAccount = {
          type: 'service_account',
          project_id: process.env.FIREBASE_PROJECT_ID || '',
          private_key_id: process.env.FIREBASE_PRIVATE_KEY_ID || '',
          private_key: (process.env.FIREBASE_PRIVATE_KEY || '').replace(/\\n/g, '\n'),
          client_email: process.env.FIREBASE_CLIENT_EMAIL || '',
          client_id: process.env.FIREBASE_CLIENT_ID || '',
          auth_uri: 'https://accounts.google.com/o/oauth2/auth',
          token_uri: 'https://oauth2.googleapis.com/token',
          auth_provider_x509_cert_url: 'https://www.googleapis.com/oauth2/v1/certs',
          client_x509_cert_url: process.env.FIREBASE_CERT_URL || '',
        };
      }

      // Validate service account
      if (!serviceAccount.project_id || !serviceAccount.private_key) {
        throw new Error(
          'Missing Firebase credentials. Ensure FIREBASE_SERVICE_ACCOUNT_PATH or environment variables are set.'
        );
      }

      // Initialize Firebase Admin SDK
      this.app = admin.initializeApp({
        credential: admin.credential.cert(serviceAccount as admin.ServiceAccount),
        databaseURL: process.env.FIREBASE_DATABASE_URL,
        projectId: serviceAccount.project_id,
      });

      this.db = admin.firestore();
      this.rtdb = admin.database();
      this.auth = admin.auth();
      this.storage = admin.storage();

      console.log('✅ Firebase Admin initialized successfully');
      console.log(`   Project: ${serviceAccount.project_id}`);
    } catch (error) {
      console.error('❌ Firebase Admin initialization failed:', error);
      throw error;
    }
  }

  /**
   * User Management
   */

  async createUser(email: string, password: string, displayName: string) {
    try {
      const userRecord = await this.auth.createUser({
        email,
        password,
        displayName,
      });

      // Create user document in Firestore
      await this.db.collection('users').doc(userRecord.uid).set({
        uid: userRecord.uid,
        email,
        displayName,
        role: 'participant', // Default role
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        profile: {
          bio: '',
          location: '',
          avatar: '',
          banner: '',
          dateOfBirth: null,
          educationLevel: '',
          hobbies: [],
          skills: [],
        },
        balance: {
          total: 0,
          available: 0,
          pending: 0,
        },
        settings: {
          privacyLevel: 'public',
          notificationsEnabled: true,
          emailNotifications: true,
          smsNotifications: false,
        },
        status: 'active',
      });

      console.log(`✅ User created: ${email}`);
      return userRecord;
    } catch (error) {
      console.error(`❌ Error creating user ${email}:`, error);
      throw error;
    }
  }

  async getUserById(uid: string) {
    try {
      const userDoc = await this.db.collection('users').doc(uid).get();
      return userDoc.exists ? userDoc.data() : null;
    } catch (error) {
      console.error(`❌ Error fetching user ${uid}:`, error);
      throw error;
    }
  }

  async updateUserRole(uid: string, role: 'participant' | 'creator' | 'admin') {
    try {
      await this.db.collection('users').doc(uid).update({ role });
      console.log(`✅ User ${uid} role updated to ${role}`);
    } catch (error) {
      console.error(`❌ Error updating user role:`, error);
      throw error;
    }
  }

  /**
   * Financial Management
   */

  async recordTransaction(data: {
    userId: string;
    type: 'payment' | 'withdrawal' | 'refund';
    amount: number;
    currency: string;
    paymentMethod: string;
    description: string;
    quizId?: string;
    classId?: string;
  }) {
    try {
      const transactionRef = this.db.collection('transactions').doc();
      const transactionId = transactionRef.id;

      await transactionRef.set({
        transactionId,
        ...data,
        status: 'pending',
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      console.log(`✅ Transaction recorded: ${transactionId}`);
      return transactionId;
    } catch (error) {
      console.error('❌ Error recording transaction:', error);
      throw error;
    }
  }

  async updateBalance(userId: string, amount: number, type: 'credit' | 'debit') {
    try {
      const userRef = this.db.collection('users').doc(userId);

      if (type === 'credit') {
        // 80/20 split - creator gets 80%, platform gets 20%
        const creatorAmount = amount * 0.8;

        await userRef.update({
          'balance.total': admin.firestore.FieldValue.increment(creatorAmount),
          'balance.available': admin.firestore.FieldValue.increment(creatorAmount),
        });

        console.log(`✅ User ${userId} credited: ${creatorAmount} (${amount} total)`);
      } else {
        await userRef.update({
          'balance.available': admin.firestore.FieldValue.increment(-amount),
        });

        console.log(`✅ User ${userId} debited: ${amount}`);
      }
    } catch (error) {
      console.error('❌ Error updating balance:', error);
      throw error;
    }
  }

  /**
   * Content Management (Quizzes)
   */

  async createQuiz(data: {
    creatorId: string;
    title: string;
    description: string;
    questions: any[];
    categoryId?: string;
    paymentConfig?: {
      enabled: boolean;
      amount?: number;
      currency?: string;
      paymentType?: 'per-attempt' | 'fixed-duration';
      durationDays?: number;
    };
    seoConfig: {
      metaTitle: string;
      metaDescription: string;
      thumbnail: string;
    };
    settings: {
      shuffleQuestions: boolean;
      numberOfQuestions?: number;
      duration: number;
      scoringType: 'per-question' | 'general';
      scorePerQuestion?: number;
      generalScore?: number;
    };
    freeTrialQuestions?: string[];
  }) {
    try {
      const quizRef = this.db.collection('quizzes').doc();
      const quizId = quizRef.id;

      await quizRef.set({
        quizId,
        ...data,
        status: 'published',
        attempts: 0,
        earnings: 0,
        rating: 0,
        reviews: [],
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      console.log(`✅ Quiz created: ${quizId}`);
      return quizId;
    } catch (error) {
      console.error('❌ Error creating quiz:', error);
      throw error;
    }
  }

  /**
   * Community Management (Schools & Classes)
   */

  async createSchool(data: {
    creatorId: string;
    name: string;
    description: string;
    thumbnail: string;
  }) {
    try {
      const schoolRef = this.db.collection('schools').doc();
      const schoolId = schoolRef.id;

      await schoolRef.set({
        schoolId,
        ...data,
        members: [data.creatorId],
        classes: [],
        status: 'active',
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      console.log(`✅ School created: ${schoolId}`);
      return schoolId;
    } catch (error) {
      console.error('❌ Error creating school:', error);
      throw error;
    }
  }

  async createClass(data: {
    creatorId: string;
    schoolId: string;
    name: string;
    description: string;
    schedule: any;
  }) {
    try {
      const classRef = this.db.collection('classes').doc();
      const classId = classRef.id;

      await classRef.set({
        classId,
        ...data,
        members: [data.creatorId],
        messages: [],
        status: 'active',
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      console.log(`✅ Class created: ${classId}`);
      return classId;
    } catch (error) {
      console.error('❌ Error creating class:', error);
      throw error;
    }
  }

  /**
   * Chat & Messaging
   */

  async saveMessage(data: {
    chatId: string;
    senderId: string;
    recipients: string[];
    messageText?: string;
    mediaType?: 'voice' | 'video' | 'image' | 'file';
    mediaPath?: string;
    encrypted: boolean;
    encryptionKey?: string;
  }) {
    try {
      const messageRef = this.db
        .collection('chats')
        .doc(data.chatId)
        .collection('messages')
        .doc();

      await messageRef.set({
        ...data,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        status: 'sent',
      });

      console.log(`✅ Message saved in chat ${data.chatId}`);
      return messageRef.id;
    } catch (error) {
      console.error('❌ Error saving message:', error);
      throw error;
    }
  }

  /**
   * Security & Monitoring
   */

  async recordSecurityAlert(data: {
    severity: 'low' | 'medium' | 'high' | 'critical';
    type: string;
    description: string;
    userId?: string;
    affectedResources?: string[];
    actionTaken?: string;
  }) {
    try {
      const alertRef = this.db.collection('security_alerts').doc();

      await alertRef.set({
        ...data,
        status: 'open',
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      console.log(`⚠️ Security alert recorded: ${data.type}`);
      return alertRef.id;
    } catch (error) {
      console.error('❌ Error recording security alert:', error);
      throw error;
    }
  }

  async getSecurityAlerts(limit: number = 50) {
    try {
      const snapshot = await this.db
        .collection('security_alerts')
        .orderBy('createdAt', 'desc')
        .limit(limit)
        .get();

      return snapshot.docs.map((doc) => doc.data());
    } catch (error) {
      console.error('❌ Error fetching security alerts:', error);
      throw error;
    }
  }

  /**
   * Batch Operations
   */

  async batchUpdate(updates: Array<{ path: string; data: any }>) {
    try {
      const batch = this.db.batch();

      updates.forEach(({ path, data }) => {
        const ref = this.db.doc(path);
        batch.update(ref, data);
      });

      await batch.commit();
      console.log(`✅ Batch update completed: ${updates.length} documents`);
    } catch (error) {
      console.error('❌ Error in batch update:', error);
      throw error;
    }
  }

  /**
   * Cleanup & Utilities
   */

  async deleteOldData(collectionName: string, daysOld: number = 90) {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysOld);

      const snapshot = await this.db
        .collection(collectionName)
        .where('createdAt', '<', cutoffDate)
        .get();

      const batch = this.db.batch();
      snapshot.docs.forEach((doc) => batch.delete(doc.ref));
      await batch.commit();

      console.log(
        `✅ Deleted ${snapshot.size} documents older than ${daysOld} days from ${collectionName}`
      );
    } catch (error) {
      console.error('❌ Error deleting old data:', error);
      throw error;
    }
  }

  /**
   * Getters for Services
   */

  getAuth() {
    return this.auth;
  }

  getDb() {
    return this.db;
  }

  getRtdb() {
    return this.rtdb;
  }

  getStorage() {
    return this.storage;
  }

  getApp() {
    return this.app;
  }
}

// Export singleton instance
export const firebaseAdmin = new FirebaseAdminService();

export default firebaseAdmin;
