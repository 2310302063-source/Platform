// AI Monitoring & Security Agent - Platform Runtime Inspection Layer
import { getFirestore, collection, addDoc, query, where, getDocs, updateDoc, doc } from "firebase/firestore";

export enum AnomalyType {
  UNUSUAL_LOGIN_PATTERN = "unusual_login_pattern",
  RAPID_MULTIPLE_LOGINS = "rapid_multiple_logins",
  GEOGRAPHIC_ANOMALY = "geographic_anomaly",
  BEHAVIORAL_DEVIATION = "behavioral_deviation",
  SUSPICIOUS_PAYMENT = "suspicious_payment",
  CONTENT_INJECTION_ATTEMPT = "content_injection_attempt",
  RATE_LIMIT_EXCEEDED = "rate_limit_exceeded",
  UNAUTHORIZED_ACCESS = "unauthorized_access",
}

export interface SecurityAlert {
  id?: string;
  type: AnomalyType;
  severity: "low" | "medium" | "high" | "critical";
  userId: string;
  description: string;
  details: Record<string, any>;
  timestamp: Date;
  resolved: boolean;
  action: "monitor" | "warn" | "block" | "escalate";
}

export class AIMonitoringAgent {
  private db = getFirestore();
  private alertsCollection = "security_alerts";
  private auditLogCollection = "audit_logs";
  private userBehaviorCollection = "user_behavior";
  private anomalyThresholds = {
    loginAttemptsPerMinute: 5,
    messagesPerMinute: 30,
    quizAttemptsPerHour: 50,
    paymentAttemptsPerHour: 10,
    contentUploadSizePerDay: 5 * 1024 * 1024 * 1024, // 5GB
  };

  /**
   * Initialize the monitoring agent
   */
  async initialize(): Promise<void> {
    console.log("[AI Agent] Monitoring agent initialized");
    this.startContinuousMonitoring();
  }

  /**
   * Monitor login attempts and detect suspicious patterns
   */
  async monitorLoginAttempt(userId: string, metadata: {
    ipAddress: string;
    userAgent: string;
    timestamp: Date;
    success: boolean;
  }): Promise<void> {
    try {
      // Check for rapid login attempts
      const recentAttempts = await this.getUserRecentAttempts(userId, "login", 60000); // Last minute
      if (recentAttempts.length > this.anomalyThresholds.loginAttemptsPerMinute) {
        await this.createAlert({
          type: AnomalyType.RAPID_MULTIPLE_LOGINS,
          severity: "high",
          userId,
          description: `Rapid login attempts detected: ${recentAttempts.length} attempts in 1 minute`,
          details: { attempts: recentAttempts.length, metadata },
          timestamp: new Date(),
          resolved: false,
          action: "block",
        });

        // Trigger progressive security lock
        await this.triggerSecurityLock(userId, recentAttempts.length);
      }

      // Check for geographic anomaly
      const userProfile = await this.getUserLastLoginLocation(userId);
      if (userProfile && this.isGeographicAnomaly(userProfile.lastLocation, metadata.ipAddress)) {
        await this.createAlert({
          type: AnomalyType.GEOGRAPHIC_ANOMALY,
          severity: "medium",
          userId,
          description: "Login from unexpected geographic location",
          details: { previousLocation: userProfile.lastLocation, currentLocation: metadata.ipAddress },
          timestamp: new Date(),
          resolved: false,
          action: "warn",
        });
      }

      // Log successful behavior
      await this.logBehavior(userId, "login", metadata);
    } catch (error) {
      console.error("[AI Agent] Error monitoring login:", error);
    }
  }

  /**
   * Monitor chat and message patterns
   */
  async monitorMessage(userId: string, message: {
    content: string;
    recipientId: string;
    timestamp: Date;
    encrypted: boolean;
  }): Promise<{ allowed: boolean; reason?: string }> {
    try {
      // Rate limiting
      const recentMessages = await this.getUserRecentAttempts(userId, "message", 60000);
      if (recentMessages.length > this.anomalyThresholds.messagesPerMinute) {
        await this.createAlert({
          type: AnomalyType.RATE_LIMIT_EXCEEDED,
          severity: "medium",
          userId,
          description: `Message rate limit exceeded: ${recentMessages.length}/min`,
          details: { messagesPerMinute: recentMessages.length },
          timestamp: new Date(),
          resolved: false,
          action: "block",
        });
        return { allowed: false, reason: "Rate limit exceeded" };
      }

      // Check for injection attempts in message content
      if (this.detectInjectionPattern(message.content)) {
        await this.createAlert({
          type: AnomalyType.CONTENT_INJECTION_ATTEMPT,
          severity: "critical",
          userId,
          description: "Potential injection attack detected in message",
          details: { content: message.content.substring(0, 100) },
          timestamp: new Date(),
          resolved: false,
          action: "block",
        });
        return { allowed: false, reason: "Suspicious content detected" };
      }

      // Message is safe
      await this.logBehavior(userId, "message", message);
      return { allowed: true };
    } catch (error) {
      console.error("[AI Agent] Error monitoring message:", error);
      return { allowed: true }; // Allow on error to prevent lockdown
    }
  }

  /**
   * Monitor quiz participation patterns
   */
  async monitorQuizParticipation(userId: string, data: {
    quizId: string;
    timestamp: Date;
    completionTime: number;
  }): Promise<void> {
    try {
      const recentAttempts = await this.getUserRecentAttempts(userId, "quiz", 3600000); // Last hour
      if (recentAttempts.length > this.anomalyThresholds.quizAttemptsPerHour) {
        await this.createAlert({
          type: AnomalyType.BEHAVIORAL_DEVIATION,
          severity: "low",
          userId,
          description: `Unusual quiz attempt frequency: ${recentAttempts.length}/hour`,
          details: { attemptsPerHour: recentAttempts.length },
          timestamp: new Date(),
          resolved: false,
          action: "monitor",
        });
      }

      await this.logBehavior(userId, "quiz", data);
    } catch (error) {
      console.error("[AI Agent] Error monitoring quiz:", error);
    }
  }

  /**
   * Monitor payment transactions
   */
  async monitorPaymentTransaction(userId: string, transaction: {
    amount: number;
    currency: string;
    type: string; // "quiz" | "class" | "school"
    timestamp: Date;
  }): Promise<{ allowed: boolean; reason?: string }> {
    try {
      // Check for suspicious amount
      if (transaction.amount > 100000) {
        await this.createAlert({
          type: AnomalyType.SUSPICIOUS_PAYMENT,
          severity: "high",
          userId,
          description: `Large payment amount: ${transaction.amount} ${transaction.currency}`,
          details: transaction,
          timestamp: new Date(),
          resolved: false,
          action: "warn",
        });
      }

      // Check payment frequency
      const recentPayments = await this.getUserRecentAttempts(userId, "payment", 3600000);
      if (recentPayments.length > this.anomalyThresholds.paymentAttemptsPerHour) {
        await this.createAlert({
          type: AnomalyType.RATE_LIMIT_EXCEEDED,
          severity: "medium",
          userId,
          description: `Excessive payment attempts: ${recentPayments.length}/hour`,
          details: { paymentsPerHour: recentPayments.length },
          timestamp: new Date(),
          resolved: false,
          action: "warn",
        });
      }

      await this.logBehavior(userId, "payment", transaction);
      return { allowed: true };
    } catch (error) {
      console.error("[AI Agent] Error monitoring payment:", error);
      return { allowed: true };
    }
  }

  /**
   * Detect injection patterns (SQLi, XSS, Command injection)
   */
  private detectInjectionPattern(content: string): boolean {
    const injectionPatterns = [
      /(\b(UNION|SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|EXECUTE|SCRIPT)\b)/i, // SQL
      /(<script|javascript:|onerror=|onclick=)/i, // XSS
      /(cmd|bash|sh|powershell|terminal)[\s]*(\/[a-z]|\\\\|&|;|\|)/i, // Command injection
      /(\$\{.*\}|`.*`)/g, // Template injection
    ];

    return injectionPatterns.some((pattern) => pattern.test(content));
  }

  /**
   * Detect geographic anomaly
   */
  private isGeographicAnomaly(previousLocation: string, currentLocation: string): boolean {
    // Simple check: if locations are completely different, flag it
    // In production, use GeoIP database for more accuracy
    const distance = this.calculateLocationDistance(previousLocation, currentLocation);
    const timeElapsed = 60 * 60; // seconds (assume instant login would be impossible over distance)
    const requiredSpeed = distance / timeElapsed;

    return requiredSpeed > 900; // More than 900 km/h is suspicious
  }

  /**
   * Calculate distance between locations (simplified)
   */
  private calculateLocationDistance(loc1: string, loc2: string): number {
    // In production, use proper GeoIP API
    // This is a placeholder
    return loc1 === loc2 ? 0 : Math.random() * 10000;
  }

  /**
   * Trigger progressive security lock
   */
  private async triggerSecurityLock(userId: string, attemptCount: number): Promise<void> {
    // Progressive exponential backoff
    let lockDuration = 2; // minutes
    if (attemptCount > 5) lockDuration = 4;
    if (attemptCount > 10) lockDuration = 16;
    if (attemptCount > 20) lockDuration = 256;

    // Update user lock status in Firebase
    const userRef = doc(this.db, "users", userId);
    await updateDoc(userRef, {
      lockUntil: new Date(Date.now() + lockDuration * 60000),
      lockReason: "suspicious_activity",
    }).catch((error) => console.error("[AI Agent] Error updating user lock:", error));
  }

  /**
   * Get user recent attempts
   */
  private async getUserRecentAttempts(
    userId: string,
    action: string,
    timeWindowMs: number
  ): Promise<any[]> {
    try {
      const q = query(
        collection(this.db, this.auditLogCollection),
        where("userId", "==", userId),
        where("action", "==", action),
        where("timestamp", ">=", new Date(Date.now() - timeWindowMs))
      );

      const snapshot = await getDocs(q);
      return snapshot.docs.map((doc) => doc.data());
    } catch (error) {
      console.error("[AI Agent] Error fetching user attempts:", error);
      return [];
    }
  }

  /**
   * Get user's last login location
   */
  private async getUserLastLoginLocation(userId: string): Promise<any> {
    try {
      const q = query(
        collection(this.db, this.auditLogCollection),
        where("userId", "==", userId),
        where("action", "==", "login")
      );

      const snapshot = await getDocs(q);
      if (snapshot.docs.length === 0) return null;

      const docs = snapshot.docs.map((doc) => doc.data());
      return docs.sort((a, b) => b.timestamp - a.timestamp)[0];
    } catch (error) {
      console.error("[AI Agent] Error fetching last location:", error);
      return null;
    }
  }

  /**
   * Create security alert
   */
  private async createAlert(alert: SecurityAlert): Promise<void> {
    try {
      await addDoc(collection(this.db, this.alertsCollection), {
        ...alert,
        timestamp: alert.timestamp.toISOString(),
        createdAt: new Date().toISOString(),
      });

      console.log(`[AI Agent] Alert created: ${alert.type} for user ${alert.userId}`);
    } catch (error) {
      console.error("[AI Agent] Error creating alert:", error);
    }
  }

  /**
   * Log user behavior for pattern analysis
   */
  private async logBehavior(userId: string, action: string, data: Record<string, any>): Promise<void> {
    try {
      await addDoc(collection(this.db, this.auditLogCollection), {
        userId,
        action,
        data,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error("[AI Agent] Error logging behavior:", error);
    }
  }

  /**
   * Start continuous monitoring (runs periodically)
   */
  private startContinuousMonitoring(): void {
    setInterval(() => {
      this.performVulnerabilityScanning();
      this.optimizeCaching();
    }, 5 * 60 * 1000); // Every 5 minutes
  }

  /**
   * Perform vulnerability scanning
   */
  private async performVulnerabilityScanning(): Promise<void> {
    console.log("[AI Agent] Running vulnerability scan...");
    // Check for common vulnerabilities
    // This would include checking for outdated dependencies, security misconfigurations, etc.
  }

  /**
   * Optimize caching
   */
  private async optimizeCaching(): Promise<void> {
    console.log("[AI Agent] Optimizing caching...");
    // Analyze cache hit rates and adjust caching strategy
  }

  /**
   * Get all active alerts for admin dashboard
   */
  async getActiveAlerts(limit: number = 100): Promise<SecurityAlert[]> {
    try {
      const q = query(
        collection(this.db, this.alertsCollection),
        where("resolved", "==", false)
      );

      const snapshot = await getDocs(q);
      return snapshot.docs
        .map((doc) => ({ id: doc.id, ...doc.data() } as SecurityAlert))
        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
        .slice(0, limit);
    } catch (error) {
      console.error("[AI Agent] Error fetching alerts:", error);
      return [];
    }
  }

  /**
   * Resolve alert
   */
  async resolveAlert(alertId: string, action: string): Promise<void> {
    try {
      const alertRef = doc(this.db, this.alertsCollection, alertId);
      await updateDoc(alertRef, {
        resolved: true,
        resolvedAt: new Date().toISOString(),
        adminAction: action,
      });

      console.log(`[AI Agent] Alert ${alertId} resolved`);
    } catch (error) {
      console.error("[AI Agent] Error resolving alert:", error);
    }
  }
}

export default new AIMonitoringAgent();
