// Input Validation & Sanitization Module (OWASP Compliant)
import DOMPurify from "dompurify";

export class InputValidator {
  /**
   * Validate email format
   */
  static validateEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email) && email.length <= 254;
  }

  /**
   * Validate password strength
   */
  static validatePassword(password: string): {
    isValid: boolean;
    strength: "weak" | "medium" | "strong";
    errors: string[];
  } {
    const errors: string[] = [];
    let strength: "weak" | "medium" | "strong" = "weak";

    if (password.length < 12) errors.push("Password must be at least 12 characters");
    if (!/[A-Z]/.test(password)) errors.push("Must contain uppercase letters");
    if (!/[a-z]/.test(password)) errors.push("Must contain lowercase letters");
    if (!/[0-9]/.test(password)) errors.push("Must contain numbers");
    if (!/[!@#$%^&*]/.test(password)) errors.push("Must contain special characters");

    if (errors.length === 0) strength = "strong";
    else if (errors.length <= 2) strength = "medium";

    return {
      isValid: errors.length === 0,
      strength,
      errors,
    };
  }

  /**
   * Sanitize HTML/XSS attacks
   */
  static sanitizeHTML(html: string): string {
    return DOMPurify.sanitize(html, {
      ALLOWED_TAGS: [
        "p",
        "br",
        "strong",
        "em",
        "u",
        "h1",
        "h2",
        "h3",
        "ul",
        "ol",
        "li",
        "a",
        "img",
        "code",
        "pre",
      ],
      ALLOWED_ATTR: ["href", "src", "alt", "title", "data-*"],
    });
  }

  /**
   * Prevent SQL Injection - escape special characters
   */
  static escapeSQLString(str: string): string {
    return str
      .replace(/\\/g, "\\\\")
      .replace(/'/g, "\\'")
      .replace(/"/g, '\\"')
      .replace(/\0/g, "\\0")
      .replace(/\n/g, "\\n")
      .replace(/\r/g, "\\r")
      .replace(/\x1a/g, "\\Z");
  }

  /**
   * Validate quiz question
   */
  static validateQuizQuestion(question: {
    text: string;
    type: string;
    options?: string[];
    correctAnswer?: string | string[];
  }): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!question.text || question.text.trim().length === 0) {
      errors.push("Question text is required");
    }

    if (question.text && question.text.length > 5000) {
      errors.push("Question text exceeds maximum length");
    }

    if (!["text", "radio", "checkbox"].includes(question.type)) {
      errors.push("Invalid question type");
    }

    if (
      question.type === "radio" ||
      question.type === "checkbox"
    ) {
      if (!question.options || question.options.length < 2) {
        errors.push("Multiple choice questions need at least 2 options");
      }
      if (question.options && question.options.length > 50) {
        errors.push("Maximum 50 options allowed");
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * Validate chat message
   */
  static validateChatMessage(message: string): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!message || message.trim().length === 0) {
      errors.push("Message cannot be empty");
    }

    if (message.length > 10000) {
      errors.push("Message exceeds maximum length (10,000 characters)");
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * Validate username
   */
  static validateUsername(username: string): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!username || username.length < 3) {
      errors.push("Username must be at least 3 characters");
    }

    if (username.length > 30) {
      errors.push("Username must not exceed 30 characters");
    }

    if (!/^[a-zA-Z0-9_-]+$/.test(username)) {
      errors.push("Username can only contain letters, numbers, hyphens, and underscores");
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * Validate URL (prevent malicious links)
   */
  static validateURL(url: string): boolean {
    try {
      const parsed = new URL(url);
      // Only allow http and https protocols
      if (!["http:", "https:"].includes(parsed.protocol)) {
        return false;
      }
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Rate limit check (in-memory, for client-side)
   */
  private static rateLimitStore: Map<string, number[]> = new Map();

  static checkRateLimit(
    key: string,
    maxAttempts: number = 5,
    windowMs: number = 60000
  ): { allowed: boolean; retryAfter: number } {
    const now = Date.now();
    const attempts = this.rateLimitStore.get(key) || [];

    // Remove old attempts outside the window
    const recentAttempts = attempts.filter((time) => now - time < windowMs);

    if (recentAttempts.length >= maxAttempts) {
      const oldestAttempt = Math.min(...recentAttempts);
      const retryAfter = Math.ceil((windowMs - (now - oldestAttempt)) / 1000);
      return { allowed: false, retryAfter };
    }

    recentAttempts.push(now);
    this.rateLimitStore.set(key, recentAttempts);

    return { allowed: true, retryAfter: 0 };
  }

  /**
   * Validate payment amount
   */
  static validatePaymentAmount(
    amount: number,
    minAmount: number = 0.5,
    maxAmount: number = 1000000
  ): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (amount < minAmount) {
      errors.push(`Amount must be at least ${minAmount}`);
    }

    if (amount > maxAmount) {
      errors.push(`Amount cannot exceed ${maxAmount}`);
    }

    if (!Number.isFinite(amount)) {
      errors.push("Invalid amount format");
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }
}

export default InputValidator;
