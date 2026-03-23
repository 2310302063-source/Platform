/**
 * API Client Service
 * Handles all HTTP communication with the coordination hub backend
 */

import axios, { AxiosInstance, AxiosError } from 'axios';

interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  timestamp: string;
}

class ApiClient {
  private client: AxiosInstance;
  private readonly baseURL: string;

  constructor() {
    this.baseURL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

    this.client = axios.create({
      baseURL: this.baseURL,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Add request interceptor for authentication
    this.client.interceptors.request.use((config) => {
      const token = localStorage.getItem('firebase_token');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    });

    // Add response interceptor for error handling
    this.client.interceptors.response.use(
      (response) => response,
      (error: AxiosError) => {
        if (error.response?.status === 401) {
          // Token expired, redirect to login
          localStorage.removeItem('firebase_token');
          window.location.href = '/login';
        }
        return Promise.reject(error);
      }
    );
  }

  /**
   * Health Check
   */
  async healthCheck(): Promise<ApiResponse> {
    try {
      const response = await this.client.get('/health');
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Authentication Endpoints
   */

  async registerUser(email: string, password: string, displayName: string): Promise<ApiResponse> {
    try {
      const response = await this.client.post('/api/auth/register', {
        email,
        password,
        displayName,
      });
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async loginUser(email: string, password: string): Promise<ApiResponse> {
    try {
      const response = await this.client.post('/api/auth/login', {
        email,
        password,
      });
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Payment Endpoints
   */

  async createPaymentIntent(data: {
    userId: string;
    amount: number;
    currency: string;
    paymentMethod: 'stripe' | 'paypal' | 'opay' | 'crypto';
    quizId?: string;
    classId?: string;
    description: string;
  }): Promise<ApiResponse> {
    try {
      const response = await this.client.post('/api/payments/intent', data);
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async confirmPayment(paymentId: string, tokenId: string): Promise<ApiResponse> {
    try {
      const response = await this.client.post('/api/payments/confirm', {
        paymentId,
        tokenId,
      });
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async getUserBalance(userId: string): Promise<ApiResponse> {
    try {
      const response = await this.client.get(`/api/payments/balance/${userId}`);
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async requestWithdrawal(data: {
    userId: string;
    amount: number;
    currency: string;
    method: 'bank' | 'crypto';
    bankDetails?: any;
    cryptoDetails?: any;
  }): Promise<ApiResponse> {
    try {
      const response = await this.client.post('/api/payments/withdraw', data);
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Peer Discovery Endpoints
   */

  async registerPeer(peerId: string, userId: string): Promise<ApiResponse> {
    try {
      const response = await this.client.post('/api/peers/register', {
        peerId,
        userId,
      });
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async getPeers(userId: string): Promise<ApiResponse> {
    try {
      const response = await this.client.get(`/api/peers/${userId}`);
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * AI Monitoring Endpoints
   */

  async checkSecurityThreat(data: {
    type: string;
    userId?: string;
    ipAddress?: string;
    userAgent?: string;
    description: string;
    payload?: any;
  }): Promise<ApiResponse> {
    try {
      const response = await this.client.post('/api/ai/security/check', data);
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async moderateContent(data: {
    contentId: string;
    contentType: 'post' | 'comment' | 'quiz' | 'message';
    userId: string;
    content: string;
  }): Promise<ApiResponse> {
    try {
      const response = await this.client.post('/api/ai/content/moderate', data);
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async detectAnomalies(): Promise<ApiResponse> {
    try {
      const response = await this.client.get('/api/ai/anomalies');
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async getSecurityReport(timeframe: 'daily' | 'weekly' | 'monthly'): Promise<ApiResponse> {
    try {
      const response = await this.client.get(`/api/ai/report/${timeframe}`);
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Error Handling
   */

  private handleError(error: any): Error {
    if (error.response?.data?.error) {
      return new Error(error.response.data.error);
    }
    if (error.message) {
      return new Error(error.message);
    }
    return new Error('An unexpected error occurred');
  }

  /**
   * Utility Methods
   */

  setAuthToken(token: string): void {
    localStorage.setItem('firebase_token', token);
    this.client.defaults.headers.common.Authorization = `Bearer ${token}`;
  }

  clearAuthToken(): void {
    localStorage.removeItem('firebase_token');
    delete this.client.defaults.headers.common.Authorization;
  }

  getBaseURL(): string {
    return this.baseURL;
  }
}

// Export singleton instance
export const apiClient = new ApiClient();
export default apiClient;
