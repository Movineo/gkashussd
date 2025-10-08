# GKash Fund Manager USSD Service

A simple, functional USSD service for managing different types of investment fund accounts. Built with Node.js and TypeScript, integrating GKash Backend API and TiaraConnect USSD Gateway.

## Features

### 🏦 Account Types
- **Balanced Fund**: Diversified investment portfolio
- **Fixed Income Fund**: Stable returns investment
- **Money Market Fund**: Short-term liquid investments
- **Stock Market Fund**: Equity market investments

### 📱 Core Functions
- **Create Account**: Name + Phone + ID + PIN + Account Type selection
- **Deposit Money**: Quick deposit with PIN confirmation
- **Withdraw Money**: Secure withdrawals with PIN verification
- **Check Balance**: View account balance
- **Track Accounts**: View all your accounts and transaction history

## Architecture

This service integrates with:
- **GKash Backend API** (`https://gkash.onrender.com/api`): User authentication, account management, and transactions
- **TiaraConnect USSD Gateway**: USSD menu delivery to mobile phones
- **Session Management**: In-memory session handling

```
User's Phone → TiaraConnect → USSD Service → GKash API
```

## Quick Start

### Prerequisites
- Node.js 16+
- npm or yarn
- GKash API credentials
- TiaraConnect account with USSD shortcode

### Installation

1. **Clone and install**
   ```bash
   git clone <your-repo-url>
   cd ussd-gkash
   npm install
   ```

2. **Configure environment**
   ```bash
   cp .env.example .env
   ```
   
   Edit `.env` with your credentials:
   ```env
   PORT=3000
   NODE_ENV=development
   
   # GKash Backend API
   GKASH_API_URL=https://gkash.onrender.com/api
   
   # TiaraConnect Configuration (optional)
   TIARA_CONNECT_WEBHOOK_SECRET=your_webhook_secret_here
   ```

3. **Start development server**
   ```bash
   npm run dev
   ```

4. **Build for production**
   ```bash
   npm run build
   npm start
   ```

### Quick Test
```bash
# Test the welcome menu
curl -X POST http://localhost:3000/ussd -H "Content-Type: application/json" -d "{\"sessionId\":\"test123\",\"phoneNumber\":\"+254712345678\",\"text\":\"\"}"
```

## API Documentation

### USSD Endpoint

**POST** `/ussd`

Handles USSD requests from TiaraConnect.

**Request Body:**
```json
{
  "sessionId": "string",
  "phoneNumber": "string",
  "text": "string"
}
```

**Response:**
```
CON Welcome to GKash Fund Manager
1. Create Account
2. Main Menu
```

### Health Check

**GET** `/health`

Check service status and GKash API connectivity.

**Response:**
```json
{
  "status": "healthy",
  "timestamp": "2025-10-08T10:30:00Z",
  "gkashApi": "connected"
}
```

## USSD Menu Flow

### Main Flow
```
*123# → Welcome Menu
├── 1. Create Account → Name → Phone → ID → PIN → Account Type → Created
├── 2. Main Menu → Deposit/Withdraw/Balance/Track Accounts
└── 3. Help → Service Information

Main Menu (existing users)
├── 1. Deposit Money → Amount → PIN → Success
├── 2. Withdraw Money → Amount → PIN → Success  
├── 3. Check Balance → PIN → Balance Display
├── 4. Track Accounts → PIN → Account List → Transaction History
└── 0. Exit
```

### Account Creation Flow
1. Enter full name
2. Enter phone number (auto-formatted)
3. Enter ID number (8 digits)
4. Create 4-digit PIN (validated for security)
5. Select fund type (Balanced/Fixed Income/Money Market/Stock Market)
6. Account created with unique account number

### Transaction Flow
1. Select Deposit or Withdraw
2. Enter amount (validates against minimums)
3. Enter PIN for confirmation
4. Transaction processed instantly
5. New balance displayed

## Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `PORT` | Server port | No (default: 3000) |
| `NODE_ENV` | Environment (development/production) | No |
| `GKASH_API_URL` | GKash Backend API URL | Yes |
| `TIARA_CONNECT_WEBHOOK_SECRET` | TiaraConnect webhook secret | No |

## Deployment Guide

### Deploy to Render (Recommended)

1. **Push code to GitHub** (see instructions below)

2. **Create Render Account**
   - Go to https://render.com
   - Sign up with GitHub

3. **Create New Web Service**
   - Click "New +" → "Web Service"
   - Connect your GitHub repository
   - Configure:
     - **Name**: `gkash-ussd`
     - **Environment**: `Node`
     - **Build Command**: `npm install && npm run build`
     - **Start Command**: `npm start`
     - **Instance Type**: Free

4. **Add Environment Variables**
   ```
   NODE_ENV=production
   GKASH_API_URL=https://gkash.onrender.com/api
   TIARA_CONNECT_WEBHOOK_SECRET=your_webhook_secret_here
   ```

5. **Deploy**
   - Click "Create Web Service"
   - Wait for deployment
   - Copy your URL: `https://gkash-ussd.onrender.com`

### TiaraConnect Configuration

After deploying, configure TiaraConnect:

1. **Login to TiaraConnect** at https://tiaraconnect.io
2. **Create USSD Application**:
   - **Application Name**: GCASH (or your preferred name)
   - **USSD Short Code**: Select from available codes
   - **Endpoint URL**: `https://your-app.onrender.com/ussd`
   - **Encryption**: MASK (optional)
   - **Authentication**: None
3. **Copy Webhook Secret** and add to your Render environment variables
4. **Redeploy** on Render to apply the new secret

### GKash API Integration

The service uses these GKash API endpoints:

- `POST /auth/signup` - Create new user account
- `POST /auth/login` - Authenticate user
- `POST /accounts` - Create new fund account
- `GET /accounts/user/:userId` - Get user's accounts
- `POST /transactions` - Create deposit/withdrawal
- `GET /transactions/account/:accountId` - Get transaction history

## Project Structure

```
ussd-gkash/
├── src/
│   ├── app.ts                    # Express server setup
│   ├── controllers/
│   │   └── ussdController.ts     # USSD request handler & state machine
│   ├── services/
│   │   ├── gkashService.ts       # GKash API integration
│   │   ├── sessionService.ts     # Session management
│   │   └── tiaraConnectService.ts # TiaraConnect webhook validation
│   └── types/
│       └── index.ts              # TypeScript type definitions
├── .env.example                   # Environment variables template
├── .gitignore                     # Git ignore rules
├── package.json                   # Dependencies and scripts
├── tsconfig.json                  # TypeScript configuration
└── README.md                      # This file
```

## Testing

### Local Testing
```bash
# Start the server
npm run dev

# Test welcome menu
curl -X POST http://localhost:3000/ussd -H "Content-Type: application/json" -d "{\"sessionId\":\"test123\",\"phoneNumber\":\"+254712345678\",\"text\":\"\"}"

# Test create account option
curl -X POST http://localhost:3000/ussd -H "Content-Type: application/json" -d "{\"sessionId\":\"test123\",\"phoneNumber\":\"+254712345678\",\"text\":\"1\"}"

# Check health
curl http://localhost:3000/health
```

## Troubleshooting

**USSD Not Responding**
- Verify TiaraConnect webhook URL is correct
- Check that your app is deployed and accessible
- Test the `/health` endpoint

**GKash API Errors**
- Verify `GKASH_API_URL` is correct
- Test GKash API directly: `https://gkash.onrender.com/api`

**Session Issues**
- Sessions are stored in memory (cleared on restart)
- Consider adding Redis for production

## Security

- Environment variables for sensitive data
- PIN validation on backend
- HTTPS required in production
- Session timeout after 5 minutes of inactivity

## Tech Stack

- **Runtime**: Node.js 16+
- **Language**: TypeScript 5.4+
- **Framework**: Express.js 4.19
- **HTTP Client**: Axios 1.12
- **Session Storage**: In-memory Map (consider Redis for production)

## License

MIT

## Support

For issues and questions, please open an issue on GitHub.