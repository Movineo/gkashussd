# Integration Guide

This document explains how the USSD service integrates with GKash Backend API and TiaraConnect USSD Gateway.

## System Architecture

```
┌─────────────┐
│  User Phone │
└──────┬──────┘
       │ Dials *123#
       ↓
┌──────────────────┐
│  TiaraConnect    │
│  USSD Gateway    │
└──────┬───────────┘
       │ HTTP POST
       ↓
┌──────────────────┐         ┌──────────────────┐
│   USSD Service   │ ←──────→│  GKash Backend   │
│  (This App)      │  HTTPS  │      API         │
└──────┬───────────┘         └──────────────────┘
       │
       ↓ SMS Notifications
┌──────────────────┐
│  TiaraConnect    │
│  SMS Service     │
└──────────────────┘
```

## GKash Backend API Integration

### Configuration

The service connects to your GKash backend using these environment variables:

```properties
GKASH_API_URL=http://localhost:4000/api
GKASH_API_KEY=your-secret-api-key
```

### Service Implementation

See `src/services/gkashService.ts`:

```typescript
// All API calls use axios with base URL and authentication
const response = await axios.post(`${GKASH_API_URL}/users`, {
  name, phoneNumber, idNumber, pin
}, {
  headers: {
    'X-API-Key': GKASH_API_KEY,
    'Content-Type': 'application/json'
  }
});
```

### Required API Endpoints

Your GKash backend must implement these endpoints:

#### 1. Create User
```http
POST /api/users
Content-Type: application/json
X-API-Key: your-api-key

{
  "name": "John Doe",
  "phoneNumber": "+254712345678",
  "idNumber": "12345678",
  "pin": "1234"
}

Response 201:
{
  "id": "user-uuid",
  "name": "John Doe",
  "phoneNumber": "+254712345678",
  "idNumber": "12345678",
  "createdAt": "2024-01-15T10:30:00Z"
}
```

#### 2. Login User
```http
POST /api/auth/login
Content-Type: application/json
X-API-Key: your-api-key

{
  "phoneNumber": "+254712345678",
  "pin": "1234"
}

Response 200:
{
  "user": {
    "id": "user-uuid",
    "name": "John Doe",
    "phoneNumber": "+254712345678"
  },
  "token": "jwt-token-here"
}
```

#### 3. Get User by Phone
```http
GET /api/users/phone/+254712345678
X-API-Key: your-api-key

Response 200:
{
  "id": "user-uuid",
  "name": "John Doe",
  "phoneNumber": "+254712345678",
  "idNumber": "12345678"
}

Response 404:
{
  "message": "User not found"
}
```

#### 4. Create Account
```http
POST /api/accounts
Content-Type: application/json
X-API-Key: your-api-key

{
  "userId": "user-uuid",
  "accountType": "balanced_fund"
}

Response 201:
{
  "id": "account-uuid",
  "accountNumber": "ACC12345678",
  "userId": "user-uuid",
  "type": "balanced_fund",
  "balance": 0,
  "createdAt": "2024-01-15T10:30:00Z"
}
```

#### 5. Get User Accounts
```http
GET /api/users/{userId}/accounts
X-API-Key: your-api-key

Response 200:
[
  {
    "id": "account-uuid",
    "accountNumber": "ACC12345678",
    "type": "balanced_fund",
    "balance": 5000.00
  }
]
```

#### 6. Deposit Money
```http
POST /api/transactions/deposit
Content-Type: application/json
X-API-Key: your-api-key

{
  "accountId": "account-uuid",
  "amount": 1000.00,
  "pin": "1234"
}

Response 201:
{
  "id": "txn-uuid",
  "accountId": "account-uuid",
  "type": "deposit",
  "amount": 1000.00,
  "balance": 6000.00,
  "timestamp": "2024-01-15T10:30:00Z"
}
```

#### 7. Withdraw Money
```http
POST /api/transactions/withdraw
Content-Type: application/json
X-API-Key: your-api-key

{
  "accountId": "account-uuid",
  "amount": 500.00,
  "pin": "1234"
}

Response 201:
{
  "id": "txn-uuid",
  "accountId": "account-uuid",
  "type": "withdraw",
  "amount": 500.00,
  "balance": 5500.00,
  "timestamp": "2024-01-15T10:30:00Z"
}
```

#### 8. Get Transaction History
```http
GET /api/accounts/{accountId}/transactions?limit=10
X-API-Key: your-api-key

Response 200:
[
  {
    "id": "txn-uuid",
    "type": "deposit",
    "amount": 1000.00,
    "balance": 6000.00,
    "timestamp": "2024-01-15T10:30:00Z"
  }
]
```

#### 9. Get Account Balance
```http
GET /api/accounts/{accountId}/balance
X-API-Key: your-api-key

Response 200:
{
  "balance": 5500.00
}
```

## TiaraConnect Integration

### Configuration

```properties
TIARA_CONNECT_BASE_URL=https://api.tiaraconnect.io/v1
TIARA_CONNECT_API_KEY=your-tiara-api-key
TIARA_CONNECT_SHORTCODE=*123#
```

### Service Implementation

See `src/services/tiaraConnectService.ts`:

```typescript
// Send SMS notification
await tiaraService.sendSMS({
  phoneNumber: '+254712345678',
  message: 'GKash: Deposit of KES 1000.00 successful.'
});
```

### Webhook Configuration

1. **Login to TiaraConnect Dashboard**
   - Go to https://console.tiaraconnect.io
   - Navigate to USSD → Webhooks

2. **Configure Webhook URL**
   ```
   URL: https://your-domain.com/ussd
   Method: POST
   Content-Type: application/json
   ```

3. **Test Connection**
   - Use TiaraConnect's test tool
   - Or dial your USSD code from a test phone

### USSD Response Format

TiaraConnect expects responses in this format:

```
CON <message>  - Continue session (show menu)
END <message>  - End session (show final message)
```

Examples:
```
CON Welcome to GKash
1. Create Account
2. Main Menu

END Account created successfully!
Name: John Doe
Account: ACC12345678
```

### SMS Notifications

The service sends SMS notifications for:

1. **Account Creation**
   ```
   GKash: Your Balanced Fund account has been created successfully. 
   Dial *123# to access your account.
   ```

2. **Deposits**
   ```
   GKash: Deposit of KES 1000.00 successful. 
   New balance: KES 6000.00
   ```

3. **Withdrawals**
   ```
   GKash: Withdrawal of KES 500.00 successful. 
   New balance: KES 5500.00
   ```

## Testing the Integration

### 1. Test GKash API Connection

```bash
# From your USSD service
curl http://localhost:3000/health
```

Expected response:
```json
{
  "status": "OK",
  "timestamp": "2024-01-15T10:30:00Z",
  "gkashApi": "connected",
  "tiaraConnect": "connected"
}
```

### 2. Test USSD Flow

```bash
# Welcome screen
curl -X POST http://localhost:3000/ussd \
  -H "Content-Type: application/json" \
  -d '{
    "sessionId": "test-123",
    "phoneNumber": "+254712345678",
    "text": ""
  }'

# Create account (option 1)
curl -X POST http://localhost:3000/ussd \
  -H "Content-Type: application/json" \
  -d '{
    "sessionId": "test-123",
    "phoneNumber": "+254712345678",
    "text": "1"
  }'
```

### 3. Monitor Logs

```bash
# Start service with debug logging
NODE_ENV=development npm run dev

# Watch for API calls
tail -f logs/app.log | grep "GKash API"
tail -f logs/app.log | grep "TiaraConnect"
```

## Error Handling

### GKash API Errors

```typescript
try {
  await gkashService.createUser(userData);
} catch (error) {
  if (error.response?.status === 409) {
    return 'END User already exists. Dial *123# to login.';
  }
  return 'END Service temporarily unavailable. Please try again.';
}
```

### TiaraConnect Errors

```typescript
try {
  await tiaraService.sendSMS(smsData);
} catch (error) {
  // Log error but don't fail the transaction
  console.error('SMS failed:', error);
  // Transaction still succeeds
}
```

## Security Considerations

### API Key Management
- Store API keys in environment variables
- Never commit keys to version control
- Rotate keys regularly
- Use different keys for development and production

### HTTPS/TLS
- Always use HTTPS in production
- Validate SSL certificates
- Keep TLS libraries updated

### Input Validation
- Sanitize all user inputs
- Validate phone numbers and PINs
- Prevent SQL injection in backend
- Rate limit API requests

### Session Security
- Use secure session IDs
- Implement session timeout (5 minutes)
- Clear sensitive data from sessions
- Limit concurrent sessions per user

## Troubleshooting

### GKash API Not Responding
```bash
# Check API connectivity
curl -X GET http://localhost:4000/api/health \
  -H "X-API-Key: your-api-key"

# Check USSD service logs
grep "GKash API Error" logs/app.log
```

### TiaraConnect Webhook Not Receiving
- Verify webhook URL is publicly accessible
- Check firewall rules
- Ensure HTTPS certificate is valid
- Test with TiaraConnect's webhook tester

### SMS Not Sending
- Check TiaraConnect SMS balance
- Verify phone number format
- Check SMS service logs
- Ensure shortcode is activated

## Production Checklist

- [ ] Configure production GKash API URL
- [ ] Set production API keys
- [ ] Configure TiaraConnect webhook with HTTPS
- [ ] Enable error monitoring (Sentry, etc.)
- [ ] Set up logging aggregation
- [ ] Configure rate limiting
- [ ] Enable request timeout handling
- [ ] Set up API health monitoring
- [ ] Configure backup/fallback mechanisms
- [ ] Document incident response procedures

## Support

For integration support:
- GKash API: Review your backend API documentation
- TiaraConnect: https://docs.tiaraconnect.io
- USSD Service: Check logs in `logs/app.log`
