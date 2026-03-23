/**
 * Payment & Revenue Management Service
 * Handles all payment processing, tokenization, 80/20 split, and withdrawals
 */

import { getFirestore, doc, updateDoc, collection, addDoc, query, where, getDocs, writeBatch } from 'firebase/firestore';
import firebaseApp from '../config/firebase';
import Stripe from 'stripe';

interface PaymentConfig {
  amount: number;
  currency: string;
  paymentType: 'per-attempt' | 'fixed-duration';
  durationDays?: number;
  description?: string;
}

interface PaymentIntent {
  id: string;
  amount: number;
  currency: string;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'refunded';
  method: 'stripe' | 'paypal' | 'opay' | 'crypto' | 'bank';
  userId: string;
  quizId?: string;
  classId?: string;
  schoolId?: string;
  createdAt: Date;
  completedAt?: Date;
}

interface WithdrawalRequest {
  id: string;
  userId: string;
  amount: number;
  currency: string;
  bankDetails?: {
    accountName: string;
    accountNumber: string;
    bankCode: string;
  };
  cryptoDetails?: {
    walletAddress: string;
    network: string;
  };
  status: 'pending' | 'processing' | 'completed' | 'failed';
  createdAt: Date;
  processedAt?: Date;
  notes?: string;
}

class PaymentService {
  private db = getFirestore(firebaseApp);
  private stripe: Stripe;
  private readonly CREATOR_PERCENTAGE = 0.8; // 80% to creator
  private readonly PLATFORM_PERCENTAGE = 0.2; // 20% to platform

  constructor() {
    const stripeKey = process.env.STRIPE_SECRET_KEY;
    if (!stripeKey) {
      throw new Error('STRIPE_SECRET_KEY is not set');
    }
    this.stripe = new Stripe(stripeKey, {
      apiVersion: '2023-10-16',
    });
  }

  /**
   * Create payment intent (token-based, never stores raw card data)
   */
  async createPaymentIntent(data: {
    userId: string;
    amount: number;
    currency: string;
    paymentMethod: 'stripe' | 'paypal' | 'opay' | 'crypto';
    quizId?: string;
    classId?: string;
    schoolId?: string;
    description: string;
  }): Promise<PaymentIntent> {
    try {
      // Validate amount (must be positive)
      if (data.amount <= 0) {
        throw new Error('Amount must be greater than 0');
      }

      // Create Stripe payment intent (tokenization)
      let stripePaymentIntent;
      if (data.paymentMethod === 'stripe') {
        stripePaymentIntent = await this.stripe.paymentIntents.create({
          amount: Math.round(data.amount * 100), // Convert to cents
          currency: data.currency.toLowerCase(),
          description: data.description,
          metadata: {
            userId: data.userId,
            quizId: data.quizId || 'N/A',
            classId: data.classId || 'N/A',
          },
        });
      }

      // Record in Firestore
      const paymentRef = await addDoc(collection(this.db, 'payments'), {
        ...data,
        stripePaymentIntentId: stripePaymentIntent?.id || null,
        status: 'pending',
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      console.log(`✅ Payment intent created: ${paymentRef.id}`);

      return {
        id: paymentRef.id,
        amount: data.amount,
        currency: data.currency,
        status: 'pending',
        method: data.paymentMethod,
        userId: data.userId,
        quizId: data.quizId,
        classId: data.classId,
        schoolId: data.schoolId,
        createdAt: new Date(),
      };
    } catch (error) {
      console.error('❌ Error creating payment intent:', error);
      throw error;
    }
  }

  /**
   * Confirm payment (after user authorizes)
   */
  async confirmPayment(paymentId: string, tokenId: string) {
    try {
      const paymentRef = doc(this.db, 'payments', paymentId);
      const paymentSnap = await getDocs(query(collection(this.db, 'payments'), where('__name__', '==', paymentId)));

      if (paymentSnap.empty) {
        throw new Error('Payment not found');
      }

      const payment = paymentSnap.docs[0].data() as PaymentIntent;

      if (payment.status !== 'pending') {
        throw new Error(`Payment already ${payment.status}`);
      }

      // Confirm with Stripe using token
      const confirmedIntent = await this.stripe.paymentIntents.confirm(
        payment.stripePaymentIntentId,
        {
          payment_method: tokenId,
        }
      );

      if (confirmedIntent.status === 'succeeded') {
        // Update payment status
        await updateDoc(paymentRef, {
          status: 'completed',
          completedAt: new Date(),
          updatedAt: new Date(),
        });

        // Apply 80/20 split
        await this.applyRevenueShare(payment);

        console.log(`✅ Payment confirmed: ${paymentId}`);
        return true;
      } else if (confirmedIntent.status === 'requires_action') {
        throw new Error('Payment requires additional authentication');
      } else {
        throw new Error('Payment failed');
      }
    } catch (error) {
      console.error('❌ Error confirming payment:', error);
      throw error;
    }
  }

  /**
   * Apply 80/20 revenue split
   */
  private async applyRevenueShare(payment: PaymentIntent) {
    try {
      let creatorId: string | null = null;

      // Determine creator based on quiz, class, or school
      if (payment.quizId) {
        const quizSnap = await getDocs(query(collection(this.db, 'quizzes'), where('quizId', '==', payment.quizId)));
        if (!quizSnap.empty) {
          creatorId = quizSnap.docs[0].data().creatorId;
        }
      } else if (payment.classId) {
        const classSnap = await getDocs(query(collection(this.db, 'classes'), where('classId', '==', payment.classId)));
        if (!classSnap.empty) {
          creatorId = classSnap.docs[0].data().creatorId;
        }
      }

      if (!creatorId) {
        throw new Error('Could not determine creator for revenue split');
      }

      const creatorAmount = payment.amount * this.CREATOR_PERCENTAGE;
      const platformAmount = payment.amount * this.PLATFORM_PERCENTAGE;

      const batch = writeBatch(this.db);

      // Credit creator
      batch.update(doc(this.db, 'users', creatorId), {
        'balance.available': updateDoc(doc(this.db, 'users', creatorId), {
          'balance.available': creatorAmount,
        }),
        'balance.total': creatorAmount,
      });

      // Record transaction for creator
      batch.set(doc(collection(this.db, 'transactions')), {
        userId: creatorId,
        type: 'payment',
        amount: creatorAmount,
        platformFee: platformAmount,
        status: 'completed',
        createdAt: new Date(),
      });

      // Record platform revenue
      batch.set(doc(collection(this.db, 'platform_revenue')), {
        amount: platformAmount,
        source: 'payment',
        createdAt: new Date(),
      });

      await batch.commit();

      console.log(`✅ Revenue split applied: Creator $${creatorAmount}, Platform $${platformAmount}`);
    } catch (error) {
      console.error('❌ Error applying revenue share:', error);
      throw error;
    }
  }

  /**
   * Process withdrawal request
   */
  async requestWithdrawal(data: {
    userId: string;
    amount: number;
    currency: string;
    method: 'bank' | 'crypto';
    bankDetails?: {
      accountName: string;
      accountNumber: string;
      bankCode: string;
    };
    cryptoDetails?: {
      walletAddress: string;
      network: string;
    };
  }): Promise<WithdrawalRequest> {
    try {
      // Validate amount
      if (data.amount <= 0) {
        throw new Error('Withdrawal amount must be greater than 0');
      }

      // Check user has sufficient balance
      const userSnap = await getDocs(query(collection(this.db, 'users'), where('uid', '==', data.userId)));
      if (userSnap.empty) {
        throw new Error('User not found');
      }

      const user = userSnap.docs[0].data();
      if ((user.balance?.available || 0) < data.amount) {
        throw new Error('Insufficient balance');
      }

      // Platform gets 20% of withdrawal
      const creatorAmount = data.amount * this.CREATOR_PERCENTAGE;
      const platformAmount = data.amount * this.PLATFORM_PERCENTAGE;

      // Create withdrawal request
      const withdrawalRef = await addDoc(collection(this.db, 'withdrawals'), {
        userId: data.userId,
        amount: creatorAmount, // Creator only gets 80%
        currency: data.currency,
        method: data.method,
        bankDetails: data.method === 'bank' ? data.bankDetails : null,
        cryptoDetails: data.method === 'crypto' ? data.cryptoDetails : null,
        platformFee: platformAmount,
        status: 'pending',
        createdAt: new Date(),
      });

      // Deduct from available balance
      await updateDoc(doc(this.db, 'users', data.userId), {
        'balance.available': -data.amount,
        'balance.pending': data.amount,
      });

      console.log(`✅ Withdrawal request created: ${withdrawalRef.id}`);

      return {
        id: withdrawalRef.id,
        userId: data.userId,
        amount: creatorAmount,
        currency: data.currency,
        bankDetails: data.bankDetails,
        cryptoDetails: data.cryptoDetails,
        status: 'pending',
        createdAt: new Date(),
      };
    } catch (error) {
      console.error('❌ Error requesting withdrawal:', error);
      throw error;
    }
  }

  /**
   * Process cryptocurrency withdrawal
   */
  async processCryptoWithdrawal(withdrawalId: string) {
    try {
      const withdrawalSnap = await getDocs(query(collection(this.db, 'withdrawals'), where('withdrawalId', '==', withdrawalId)));
      if (withdrawalSnap.empty) {
        throw new Error('Withdrawal not found');
      }

      const withdrawal = withdrawalSnap.docs[0].data() as WithdrawalRequest;

      if (withdrawal.status !== 'pending') {
        throw new Error(`Withdrawal already ${withdrawal.status}`);
      }

      // In production, integrate with crypto payment processor
      // For now, mark as processing
      await updateDoc(doc(this.db, 'withdrawals', withdrawalId), {
        status: 'processing',
      });

      // TODO: Call crypto API (e.g., Wise, Stripe Connect, custom integration)

      console.log(`✅ Crypto withdrawal processing: ${withdrawalId}`);
    } catch (error) {
      console.error('❌ Error processing crypto withdrawal:', error);
      throw error;
    }
  }

  /**
   * Get user balance
   */
  async getUserBalance(userId: string) {
    try {
      const userSnap = await getDocs(query(collection(this.db, 'users'), where('uid', '==', userId)));
      if (userSnap.empty) {
        return { total: 0, available: 0, pending: 0 };
      }

      return userSnap.docs[0].data().balance || { total: 0, available: 0, pending: 0 };
    } catch (error) {
      console.error('❌ Error fetching balance:', error);
      throw error;
    }
  }

  /**
   * Get payment history
   */
  async getPaymentHistory(userId: string, limit: number = 50) {
    try {
      const q = query(
        collection(this.db, 'payments'),
        where('userId', '==', userId)
      );
      const snapshot = await getDocs(q);
      return snapshot.docs.slice(0, limit).map(doc => doc.data());
    } catch (error) {
      console.error('❌ Error fetching payment history:', error);
      throw error;
    }
  }

  /**
   * Get withdrawal history
   */
  async getWithdrawalHistory(userId: string, limit: number = 50) {
    try {
      const q = query(
        collection(this.db, 'withdrawals'),
        where('userId', '==', userId)
      );
      const snapshot = await getDocs(q);
      return snapshot.docs.slice(0, limit).map(doc => doc.data());
    } catch (error) {
      console.error('❌ Error fetching withdrawal history:', error);
      throw error;
    }
  }

  /**
   * Refund payment
   */
  async refundPayment(paymentId: string, reason: string) {
    try {
      const paymentSnap = await getDocs(query(collection(this.db, 'payments'), where('paymentId', '==', paymentId)));
      if (paymentSnap.empty) {
        throw new Error('Payment not found');
      }

      const payment = paymentSnap.docs[0].data() as PaymentIntent;

      if (payment.status !== 'completed') {
        throw new Error('Only completed payments can be refunded');
      }

      // Refund via Stripe
      await this.stripe.refunds.create({
        payment_intent: payment.stripePaymentIntentId,
        reason: reason as any,
      });

      // Update payment status
      await updateDoc(doc(this.db, 'payments', paymentId), {
        status: 'refunded',
        refundReason: reason,
        refundedAt: new Date(),
      });

      // Reverse revenue split
      const userSnap = await getDocs(query(collection(this.db, 'users'), where('uid', '==', payment.userId)));
      if (!userSnap.empty) {
        await updateDoc(doc(this.db, 'users', payment.userId), {
          'balance.available': -payment.amount * this.CREATOR_PERCENTAGE,
        });
      }

      console.log(`✅ Payment refunded: ${paymentId}`);
    } catch (error) {
      console.error('❌ Error refunding payment:', error);
      throw error;
    }
  }
}

export const paymentService = new PaymentService();
export default paymentService;
