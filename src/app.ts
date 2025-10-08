import express, { Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { USSDController } from './controllers/ussdController';
import { GKashService } from './services/gkashService';
import { TiaraConnectService } from './services/tiaraConnectService';

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors());

// Logging middleware
app.use((req: Request, res: Response, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
  next();
});

// Initialize services
const ussdController = new USSDController();
const gkashService = new GKashService();
const tiaraService = new TiaraConnectService();

// Routes
app.post('/ussd', (req: Request, res: Response) => {
  ussdController.handleUSSDRequest(req, res);
});

app.get('/health', async (req: Request, res: Response) => {
  const health = {
    status: 'OK',
    timestamp: new Date().toISOString(),
    service: 'GKash Fund Manager USSD',
    version: '1.0.0',
    integrations: {
      gkashApi: {
        configured: !!process.env.GKASH_API_URL,
        url: process.env.GKASH_API_URL || 'Not configured'
      },
      tiaraConnect: {
        configured: !!process.env.TIARA_CONNECT_API_KEY,
        shortcode: process.env.TIARA_CONNECT_SHORTCODE || 'Not configured'
      }
    },
    environment: process.env.NODE_ENV || 'development'
  };

  res.json(health);
});

app.get('/', (req: Request, res: Response) => {
  res.json({
    message: 'GKash Fund Manager USSD Service',
    description: 'USSD service integrating GKash Backend API and TiaraConnect',
    version: '1.0.0',
    endpoints: {
      ussd: 'POST /ussd - Handle USSD requests',
      health: 'GET /health - Service health check'
    },
    documentation: {
      readme: 'https://github.com/your-repo/README.md',
      integration: 'https://github.com/your-repo/INTEGRATION.md'
    },
    ussdCode: process.env.TIARA_CONNECT_SHORTCODE || '*123#'
  });
});

// Start server
app.listen(port, () => {
  console.log('='.repeat(60));
  console.log(`🚀 GKash Fund Manager USSD Server`);
  console.log('='.repeat(60));
  console.log(`📡 Port: ${port}`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`⏰ Started: ${new Date().toISOString()}`);
  console.log('');
  console.log('🔌 Integrations:');
  console.log(`   • GKash API: ${process.env.GKASH_API_URL || '❌ Not configured'}`);
  console.log(`   • TiaraConnect: ${process.env.TIARA_CONNECT_SHORTCODE || '❌ Not configured'}`);
  console.log('');
  console.log('📍 Endpoints:');
  console.log(`   • POST http://localhost:${port}/ussd`);
  console.log(`   • GET  http://localhost:${port}/health`);
  console.log(`   • GET  http://localhost:${port}/`);
  console.log('='.repeat(60));
});

export default app;