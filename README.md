# salespro-leapcrm-webhook
# SalesPro to Leap CRM Webhook Integration

A Node.js webhook server that automatically creates customers and jobs in Leap CRM when appointments are completed in SalesPro.

## Overview

This server acts as a bridge between SalesPro and Leap CRM, handling webhook requests from SalesPro and creating corresponding customers and jobs in Leap CRM. It includes features for:
- Customer creation/lookup
- Job creation
- Error handling
- Logging
- Security Best Practices

## Prerequisites

- Node.js (v14 or higher)
- npm (v6 or higher)
- SalesPro account with webhook access
- Leap CRM account with API access

## Installation

1. Clone the repository:
```bash
git clone https://github.com/yourusername/salespro-leap-webhook.git
cd salespro-leap-webhook
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
cp .env.example .env
```
Edit `.env` and add your Leap CRM API key:

LEAP_API_KEY=your_api_key_here


## Usage

### Local Development
```bash
npm run dev
```

### Production
```bash
npm start
```

## API Endpoints

### Webhook Endpoint
- **URL**: `/webhook`
- **Method**: `POST`
- **Description**: Receives webhook data from SalesPro
- **Request Body**: SalesPro appointment data
- **Response**: 
  ```json
  {
    "message": "Successfully processed webhook",
    "customerId": "123",
    "jobId": "456"
  }
  ```

### Health Check
- **URL**: `/`
- **Method**: `GET`
- **Description**: Verifies server is running
- **Response**: "Webhook server is running!"

## Configuration

### Environment Variables
| Variable | Description | Required |
|----------|-------------|----------|
| LEAP_API_KEY | Your Leap CRM API key | Yes |
| PORT | Server port (default: 3000) | No |

### SalesPro Configuration
1. Go to SalesPro Settings > Appointments
2. Select "Webhook" from API dropdown
3. Enter your webhook URL: `https://your-server.com/webhook`

## Error Handling

The server includes error handling for:
- Missing webhook data
- API connection issues
- Invalid customer data
- Job creation failures

## Logging

Logs are output to the console and include:
- Webhook receipt
- Customer creation/lookup
- Job creation
- Error messages

```javascript
// Add to server.js for detailed logging
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
  console.log('Request Body:', req.body);
  next();
});
```

## Development

### Project Structure

salespro-leap-webhook/
├── server.js # Main server file
├── package.json # Project dependencies
├── .env.example # Example environment variables
├── .gitignore # Git ignore file
└── README.md # This file

### Adding New Features
1. Create a new branch
2. Make your changes
3. Test locally
4. Submit a pull request

## Deployment

### Render
1. Create a new Web Service
2. Connect your GitHub repository
3. Set environment variables
4. Deploy

### Postman Collection
A Postman collection is included for testing:
- Import `Leap API.postman_collection.json`
- Set up environment variables
- Run tests

## Contributing

1. Fork the repository
2. Create your feature branch
3. Commit your changes
4. Push to the branch
5. Create a pull request

### Testing

1. **Local Testing**
```bash
# Start server
npm run dev

# In another terminal
ngrok http 3000

# Test with Postman
POST http://localhost:3000/webhook
```

## Support

- Open an issue on GitHub
- Check API documentation:
  - [SalesPro API](https://help.leaptodigital.com/documentation/api-documentation/)
  - [Leap CRM API](https://docs.api.jobprogress.com/)


## Security Best Practices

### 1. API Key Protection
```javascript
// .env file
LEAP_API_KEY=your_api_key_here
```
- Never commit `.env` to Git
- Rotate API keys regularly
- Use different keys for development/production

### 2. Webhook Security
```javascript
// server.js
const webhookSecret = process.env.WEBHOOK_SECRET;

app.post('/webhook', (req, res) => {
  // Verify webhook signature
  const signature = req.headers['x-salespro-signature'];
  if (!verifySignature(req.body, signature, webhookSecret)) {
    return res.status(401).json({ error: 'Invalid signature' });
  }
  // Process webhook...
});
```

### 3. Rate Limiting
```javascript
// server.js
const rateLimit = require('express-rate-limit');

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});

app.use(limiter);
```

### 4. Input Validation
```javascript
// server.js
const { body, validationResult } = require('express-validator');

app.post('/webhook', [
  body('customer.firstName').notEmpty(),
  body('customer.lastName').notEmpty(),
  body('customer.emails').isArray(),
  body('estimate.id').notEmpty()
], (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  // Process webhook...
});
```

### 5. HTTPS Only
```javascript
// server.js
if (process.env.NODE_ENV === 'production') {
  app.use((req, res, next) => {
    if (!req.secure) {
      return res.redirect(`https://${req.headers.host}${req.url}`);
    }
    next();
  });
}
```

### 6. Security Headers
```javascript
// server.js
const helmet = require('helmet');
app.use(helmet());
```

### Required Dependencies
```json
{
  "dependencies": {
    "express-rate-limit": "^6.7.0",
    "express-validator": "^7.0.1",
    "helmet": "^7.0.0"
  }
}
```

### Security Checklist
- [ ] API keys stored in environment variables
- [ ] Webhook signature verification enabled
- [ ] Rate limiting implemented
- [ ] Input validation in place
- [ ] HTTPS enforced in production
- [ ] Security headers configured
- [ ] Regular dependency updates
- [ ] Error messages don't leak sensitive data
- [ ] Logging configured securely
- [ ] CORS properly configured

### Regular Maintenance
1. Update dependencies:
```bash
npm audit
npm update
```

2. Check for vulnerabilities:
```bash
npm audit fix
```

3. Review access logs regularly
4. Monitor failed webhook attempts
5. Rotate API keys quarterly

### Error Handling
```javascript
// server.js
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    error: 'Internal Server Error',
    // Don't expose internal errors to clients
    message: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});
```

### CORS Configuration
```javascript
// server.js
const cors = require('cors');

app.use(cors({
  origin: process.env.ALLOWED_ORIGINS.split(','),
  methods: ['POST'],
  allowedHeaders: ['Content-Type', 'x-salespro-signature']
}));
```


