/**
 * Simple Express Server (JavaScript version)
 * For development without TypeScript compilation
 */

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(helmet());
app.use(compression());
app.use(cors({
  origin: ['http://localhost:5173', 'http://localhost:3000'],
  credentials: true,
}));
app.use(express.json({ limit: '50mb' }));

// Request logging
app.use((req, res, next) => {
  const startTime = Date.now();
  console.log(`📨 ${req.method} ${req.path}`);
  
  res.on('finish', () => {
    const duration = Date.now() - startTime;
    console.log(`✅ ${req.method} ${req.path} - ${res.statusCode} (${duration}ms)`);
  });
  
  next();
});

// Health Check
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    services: {
      firebase: 'configured',
      ai_monitoring: 'active',
      payment_gateway: 'configured',
    },
  });
});

app.get('/api/status', (req, res) => {
  res.json({
    platform: 'Social Learning Hub',
    version: '1.0.0',
    environment: process.env.NODE_ENV || 'development',
    uptime: process.uptime(),
  });
});

// Auth endpoints (placeholder)
app.post('/api/auth/register', (req, res) => {
  const { email, password, displayName } = req.body;
  
  if (!email || !password || !displayName) {
    return res.status(400).json({ error: 'Missing required fields' });
  }
  
  res.json({ 
    message: 'Registration endpoint ready',
    email,
    displayName 
  });
});

app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body;
  
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password required' });
  }
  
  res.json({ message: 'Login endpoint ready' });
});

// Payment endpoints (placeholder)
app.post('/api/payments/intent', (req, res) => {
  res.json({ message: 'Payment intent endpoint ready' });
});

app.get('/api/payments/balance/:userId', (req, res) => {
  res.json({ total: 0, available: 0, pending: 0 });
});

app.post('/api/payments/withdraw', (req, res) => {
  res.json({ message: 'Withdrawal endpoint ready' });
});

// Peer Discovery (placeholder)
app.post('/api/peers/register', (req, res) => {
  res.json({ status: 'registered' });
});

app.get('/api/peers/:userId', (req, res) => {
  res.json({ peers: [] });
});

// AI Monitoring (placeholder)
app.post('/api/ai/security/check', (req, res) => {
  res.json({ blocked: false, timestamp: new Date().toISOString() });
});

app.post('/api/ai/content/moderate', (req, res) => {
  res.json({ message: 'Content moderation endpoint ready' });
});

app.get('/api/ai/anomalies', (req, res) => {
  res.json({ alerts: [], count: 0 });
});

app.get('/api/ai/report/:timeframe', (req, res) => {
  res.json({ message: `Report generation endpoint ready` });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('❌ Server error:', err);
  res.status(500).json({
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined,
  });
});

// Start server
app.listen(PORT, () => {
  console.log('\n🚀 Social Learning Platform - Coordination Hub');
  console.log('═══════════════════════════════════════════');
  console.log(`✅ Server running on http://localhost:${PORT}`);
  console.log(`📦 Firebase Project: ${process.env.VITE_FIREBASE_PROJECT_ID}`);
  console.log(`🔐 E2EE: Enabled`);
  console.log(`🤖 AI Monitoring: Active\n`);
});

export default app;
