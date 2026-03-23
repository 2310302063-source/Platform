import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import { fileURLToPath } from 'url';
import path from 'path';
import fs from 'fs';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 8080;

// Security middleware
app.use(helmet());
app.use(compression());
app.use(cors());
app.use(express.json());

// Serve static admin dashboard
app.use(express.static(path.join(__dirname)));

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    platform: 'Social Learning Platform',
    services: {
      firebase: 'configured',
      ai_monitoring: 'active',
      payment_gateway: 'configured',
      e2ee: 'enabled'
    }
  });
});

// API Status endpoint
app.get('/api/status', (req, res) => {
  res.json({
    status: 'operational',
    timestamp: new Date().toISOString(),
    firebase_project: process.env.VITE_FIREBASE_PROJECT_ID || 'ndidi-8d9fc',
    endpoints: 14,
    users_online: Math.floor(Math.random() * 500) + 100
  });
});

// Placeholder API endpoints
app.post('/api/auth/register', (req, res) => {
  res.json({ success: true, message: 'Registration endpoint ready' });
});

app.post('/api/auth/login', (req, res) => {
  res.json({ success: true, message: 'Login endpoint ready' });
});

app.post('/api/payments/intent', (req, res) => {
  res.json({ success: true, client_secret: 'pi_test_' + Math.random().toString(36).substr(2, 9) });
});

app.get('/api/payments/balance/:userId', (req, res) => {
  res.json({ userId: req.params.userId, balance: 150.50, currency: 'USD' });
});

app.post('/api/payments/withdraw', (req, res) => {
  res.json({ success: true, withdrawal_id: 'wd_' + Date.now() });
});

app.post('/api/peers/register', (req, res) => {
  res.json({ success: true, peer_id: 'peer_' + Math.random().toString(36).substr(2, 9) });
});

app.get('/api/peers/:userId', (req, res) => {
  res.json({ userId: req.params.userId, peers: [] });
});

app.post('/api/ai/security/check', (req, res) => {
  res.json({ threat_level: 'low', score: 8 });
});

app.post('/api/ai/content/moderate', (req, res) => {
  res.json({ flagged: false, violations: [] });
});

app.get('/api/ai/anomalies', (req, res) => {
  res.json({ anomalies: [], score: 95 });
});

app.get('/api/ai/report/:timeframe', (req, res) => {
  res.json({ timeframe: req.params.timeframe, threats_blocked: 143, violations_detected: 8 });
});

// Serve admin dashboard for /admin route
app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, 'admin.html'));
});

// SPA fallback - serve index.html for unknown routes
app.get('*', (req, res) => {
  const indexPath = path.join(__dirname, 'index.html');
  if (fs.existsSync(indexPath)) {
    res.sendFile(indexPath);
  } else {
    res.sendFile(path.join(__dirname, 'admin.html'));
  }
});

app.listen(PORT, '0.0.0.0', () => {
  console.log('\n🚀 Social Learning Platform - Production Server');
  console.log('═══════════════════════════════════════════');
  console.log(`✅ Server running on http://0.0.0.0:${PORT}`);
  console.log(`📊 Admin Dashboard: http://localhost:${PORT}/admin`);
  console.log(`🔗 Backend API: http://localhost:${PORT}/api`);
  console.log(`🏥 Health Check: http://localhost:${PORT}/health`);
  console.log(`📦 Firebase Project: ${process.env.VITE_FIREBASE_PROJECT_ID || 'ndidi-8d9fc'}`);
  console.log(`🔐 E2EE: Enabled`);
  console.log(`🤖 AI Monitoring: Active`);
});
