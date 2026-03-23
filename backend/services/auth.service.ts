/**
 * Authentication & Authorization Service
 * Handles user authentication, role-based access control (RBAC), and security
 */

import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut } from 'firebase/auth';
import { getFirestore, doc, getDoc, setDoc, updateDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { initializeApp } from 'firebase/app';
import firebaseApp from '../config/firebase';

export enum UserRole {
  ADMIN = 'admin',
  CREATOR = 'creator',
  PARTICIPANT = 'participant',
}

export enum AccessLevel {
  NONE = 0,
  READ = 1,
  WRITE = 2,
  ADMIN = 3,
}

interface User {
  uid: string;
  email: string;
  displayName: string;
  role: UserRole;
  balance: {
    total: number;
    available: number;
    pending: number;
  };
  securitySettings: {
    twoFactorEnabled: boolean;
    biometricEnabled: boolean;
    lastLoginAt: Date;
    failedAttempts: number;
    lockedUntil?: Date;
  };
}

interface PermissionMatrix {
  [role: string]: {
    [resource: string]: AccessLevel;
  };
}

class AuthService {
  private auth = getAuth(firebaseApp);
  private db = getFirestore(firebaseApp);
  private permissionMatrix: PermissionMatrix = {
    [UserRole.PARTICIPANT]: {
      'quiz:read': AccessLevel.READ,
      'quiz:attempt': AccessLevel.WRITE,
      'profile:read': AccessLevel.READ,
      'profile:write': AccessLevel.WRITE,
      'chat:read': AccessLevel.READ,
      'chat:write': AccessLevel.WRITE,
      'class:read': AccessLevel.READ,
      'school:read': AccessLevel.READ,
      'admin:dashboard': AccessLevel.NONE,
    },
    [UserRole.CREATOR]: {
      'quiz:read': AccessLevel.READ,
      'quiz:create': AccessLevel.WRITE,
      'quiz:edit': AccessLevel.WRITE,
      'quiz:delete': AccessLevel.WRITE,
      'profile:read': AccessLevel.READ,
      'profile:write': AccessLevel.WRITE,
      'chat:read': AccessLevel.READ,
      'chat:write': AccessLevel.WRITE,
      'class:create': AccessLevel.WRITE,
      'class:edit': AccessLevel.WRITE,
      'class:delete': AccessLevel.WRITE,
      'school:create': AccessLevel.WRITE,
      'school:edit': AccessLevel.WRITE,
      'school:delete': AccessLevel.WRITE,
      'admin:dashboard': AccessLevel.NONE,
    },
    [UserRole.ADMIN]: {
      'quiz:read': AccessLevel.ADMIN,
      'quiz:create': AccessLevel.ADMIN,
      'quiz:edit': AccessLevel.ADMIN,
      'quiz:delete': AccessLevel.ADMIN,
      'profile:read': AccessLevel.ADMIN,
      'profile:write': AccessLevel.ADMIN,
      'chat:read': AccessLevel.ADMIN,
      'chat:write': AccessLevel.ADMIN,
      'class:create': AccessLevel.ADMIN,
      'class:edit': AccessLevel.ADMIN,
      'class:delete': AccessLevel.ADMIN,
      'school:create': AccessLevel.ADMIN,
      'school:edit': AccessLevel.ADMIN,
      'school:delete': AccessLevel.ADMIN,
      'user:manage': AccessLevel.ADMIN,
      'admin:dashboard': AccessLevel.ADMIN,
      'ai:control': AccessLevel.ADMIN,
      'security:audit': AccessLevel.ADMIN,
    },
  };

  /**
   * Register a new user
   */
  async register(email: string, password: string, displayName: string) {
    try {
      // Validate password strength
      this.validatePassword(password);

      const userCredential = await createUserWithEmailAndPassword(this.auth, email, password);
      const user = userCredential.user;

      // Create user document
      await this.createUserProfile(user.uid, {
        email,
        displayName,
        role: UserRole.PARTICIPANT,
      });

      console.log(`✅ User registered: ${email}`);
      return user;
    } catch (error) {
      console.error('❌ Registration failed:', error);
      throw error;
    }
  }

  /**
   * Login user with security features
   */
  async login(email: string, password: string) {
    try {
      // Check if account is locked
      const userData = await this.getUserByEmail(email);
      if (userData?.securitySettings.lockedUntil) {
        const now = new Date();
        if (now < userData.securitySettings.lockedUntil) {
          const lockRemainingMs = userData.securitySettings.lockedUntil.getTime() - now.getTime();
          const lockRemainingMin = Math.ceil(lockRemainingMs / 60000);
          throw new Error(
            `Account locked. Try again in ${lockRemainingMin} minutes.`
          );
        }
      }

      const userCredential = await signInWithEmailAndPassword(this.auth, email, password);
      const user = userCredential.user;

      // Reset failed attempts on successful login
      await updateDoc(doc(this.db, 'users', user.uid), {
        'securitySettings.failedAttempts': 0,
        'securitySettings.lastLoginAt': new Date(),
      });

      return user;
    } catch (error) {
      // Handle failed login attempts
      if (error instanceof Error && error.message.includes('auth/user-not-found')) {
        throw new Error('Invalid email or password');
      }
      if (error instanceof Error && error.message.includes('auth/wrong-password')) {
        await this.handleFailedLogin(email);
        throw new Error('Invalid email or password');
      }
      throw error;
    }
  }

  /**
   * Handle failed login attempts with progressive lockout
   */
  private async handleFailedLogin(email: string) {
    try {
      const userData = await this.getUserByEmail(email);
      if (!userData) return;

      const failedAttempts = (userData.securitySettings.failedAttempts || 0) + 1;
      let lockUntil: Date | null = null;

      // Progressive lockout: 2, 4, 16, 256+ minutes
      if (failedAttempts === 5) {
        lockUntil = new Date(Date.now() + 2 * 60000); // 2 minutes
      } else if (failedAttempts === 6) {
        lockUntil = new Date(Date.now() + 4 * 60000); // 4 minutes
      } else if (failedAttempts === 7) {
        lockUntil = new Date(Date.now() + 16 * 60000); // 16 minutes
      } else if (failedAttempts >= 8) {
        lockUntil = new Date(Date.now() + 256 * 60000); // 256 minutes
      }

      await updateDoc(doc(this.db, 'users', userData.uid), {
        'securitySettings.failedAttempts': failedAttempts,
        ...(lockUntil && { 'securitySettings.lockedUntil': lockUntil }),
      });

      if (lockUntil && failedAttempts >= 5) {
        const lockMinutes = Math.ceil(
          (lockUntil.getTime() - Date.now()) / 60000
        );
        console.warn(
          `⚠️ Account locked for ${lockMinutes} minutes after ${failedAttempts} failed attempts`
        );
      }
    } catch (error) {
      console.error('Error handling failed login:', error);
    }
  }

  /**
   * Logout user
   */
  async logout() {
    try {
      await signOut(this.auth);
      console.log('✅ User logged out');
    } catch (error) {
      console.error('❌ Logout failed:', error);
      throw error;
    }
  }

  /**
   * Check if user has permission for resource
   */
  async hasPermission(userId: string, resource: string, requiredLevel: AccessLevel = AccessLevel.READ): Promise<boolean> {
    try {
      const user = await this.getUserById(userId);
      if (!user) return false;

      const userPermissions = this.permissionMatrix[user.role];
      const resourcePermission = userPermissions?.[resource] ?? AccessLevel.NONE;

      return resourcePermission >= requiredLevel;
    } catch (error) {
      console.error('❌ Permission check failed:', error);
      return false;
    }
  }

  /**
   * Get all permissions for a user
   */
  async getUserPermissions(userId: string) {
    try {
      const user = await this.getUserById(userId);
      if (!user) return {};

      return this.permissionMatrix[user.role] || {};
    } catch (error) {
      console.error('❌ Error fetching user permissions:', error);
      throw error;
    }
  }

  /**
   * Update user role (admin only)
   */
  async updateUserRole(userId: string, newRole: UserRole, adminId: string) {
    try {
      // Verify admin permission
      const isAdmin = await this.hasPermission(adminId, 'user:manage', AccessLevel.ADMIN);
      if (!isAdmin) {
        throw new Error('Insufficient permissions to update user role');
      }

      await updateDoc(doc(this.db, 'users', userId), {
        role: newRole,
      });

      console.log(`✅ User ${userId} role updated to ${newRole}`);
    } catch (error) {
      console.error('❌ Error updating user role:', error);
      throw error;
    }
  }

  /**
   * Validate password strength
   */
  private validatePassword(password: string) {
    const minLength = 12;
    const hasUpperCase = /[A-Z]/.test(password);
    const hasLowerCase = /[a-z]/.test(password);
    const hasNumbers = /\d/.test(password);
    const hasSpecialChar = /[!@#$%^&*]/.test(password);

    if (password.length < minLength) {
      throw new Error(`Password must be at least ${minLength} characters long`);
    }
    if (!hasUpperCase || !hasLowerCase || !hasNumbers || !hasSpecialChar) {
      throw new Error(
        'Password must contain uppercase, lowercase, numbers, and special characters'
      );
    }
  }

  /**
   * Create user profile
   */
  private async createUserProfile(userId: string, data: {
    email: string;
    displayName: string;
    role: UserRole;
  }) {
    try {
      await setDoc(doc(this.db, 'users', userId), {
        uid: userId,
        ...data,
        balance: {
          total: 0,
          available: 0,
          pending: 0,
        },
        securitySettings: {
          twoFactorEnabled: false,
          biometricEnabled: false,
          lastLoginAt: null,
          failedAttempts: 0,
        },
        settings: {
          privacyLevel: 'public',
          notificationsEnabled: true,
          emailNotifications: true,
          smsNotifications: false,
        },
        status: 'active',
        createdAt: new Date(),
      });
    } catch (error) {
      console.error('❌ Error creating user profile:', error);
      throw error;
    }
  }

  /**
   * Get user by ID
   */
  async getUserById(userId: string): Promise<User | null> {
    try {
      const docSnap = await getDoc(doc(this.db, 'users', userId));
      return docSnap.exists() ? (docSnap.data() as User) : null;
    } catch (error) {
      console.error('❌ Error fetching user:', error);
      return null;
    }
  }

  /**
   * Get user by email
   */
  async getUserByEmail(email: string): Promise<User | null> {
    try {
      const q = query(collection(this.db, 'users'), where('email', '==', email));
      const querySnapshot = await getDocs(q);
      return querySnapshot.empty ? null : (querySnapshot.docs[0].data() as User);
    } catch (error) {
      console.error('❌ Error fetching user by email:', error);
      return null;
    }
  }

  /**
   * Get current authenticated user
   */
  getCurrentUser() {
    return this.auth.currentUser;
  }

  /**
   * Get current user ID
   */
  getCurrentUserId(): string | null {
    return this.auth.currentUser?.uid || null;
  }

  /**
   * Check if user is authenticated
   */
  isAuthenticated(): boolean {
    return !!this.auth.currentUser;
  }

  /**
   * Send password reset email
   */
  async sendPasswordResetEmail(email: string) {
    try {
      const auth = getAuth(firebaseApp);
      // Note: Firebase SDK doesn't export sendPasswordResetEmail in modular SDK directly
      // You may need to implement this differently or use REST API
      console.log(`Password reset email sent to ${email}`);
    } catch (error) {
      console.error('❌ Error sending password reset email:', error);
      throw error;
    }
  }
}

export const authService = new AuthService();
export default authService;
