require('dotenv').config();
const express = require('express');
const axios = require('axios');
const helmet = require('helmet');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const { body, validationResult } = require('express-validator');

const app = express();
const port = process.env.PORT || 3000;

// Validate required environment variables
if (!process.env.LEAP_API_KEY) {
  console.error('Error: LEAP_API_KEY environment variable is not set');
  process.exit(1);
}

// Security middleware
app.use(helmet());
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(',') : '*',
  methods: ['POST'],
  allowedHeaders: ['Content-Type', 'x-salespro-signature']
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});
app.use(limiter);

// Middleware to parse JSON bodies
app.use(express.json());

// Request logging middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
  console.log('Request Body:', req.body);
  next();
});

// Leap CRM API configuration
const LEAP_API_BASE_URL = 'https://api.jobprogress.com/api/v1';
const LEAP_API_KEY = process.env.LEAP_API_KEY;

// Basic route for testing
app.get('/', (req, res) => {
  res.send('Webhook server is running!');
});

// SalesPro webhook endpoint with validation
app.post('/webhook', [
  body('customer.firstName').notEmpty(),
  body('customer.lastName').notEmpty(),
  body('customer.emails').isArray(),
  body('estimate.id').notEmpty()
], async (req, res) => {
  try {
    // Validate request
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    // Verify webhook signature if WEBHOOK_SECRET is set
    if (process.env.WEBHOOK_SECRET) {
      const signature = req.headers['x-salespro-signature'];
      if (!signature || !verifySignature(req.body, signature, process.env.WEBHOOK_SECRET)) {
        return res.status(401).json({ error: 'Invalid signature' });
      }
    }

    console.log('Received webhook from SalesPro:', req.body);
    
    const { customer, estimate } = req.body;
    
    if (!customer || !estimate) {
      return res.status(400).json({ error: 'Missing required data' });
    }

    // First, try to find existing customer
    const existingCustomer = await findCustomer(customer);
    
    let customerId;
    if (existingCustomer) {
      customerId = existingCustomer.id;
      console.log('Found existing customer:', customerId);
    } else {
      // Create new customer
      const newCustomer = await createCustomer(customer);
      customerId = newCustomer.id;
      console.log('Created new customer:', customerId);
    }

    // Create job for the customer
    const job = await createJob(customerId, estimate);
    console.log('Created new job:', job.id);

    res.status(200).json({ 
      message: 'Successfully processed webhook',
      customerId,
      jobId: job.id
    });

  } catch (error) {
    console.error('Error processing webhook:', error);
    res.status(500).json({ 
      error: 'Internal Server Error',
      message: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Helper function to verify webhook signature
function verifySignature(payload, signature, secret) {
  // Implement your signature verification logic here
  // This is a placeholder - you should implement proper signature verification
  return true;
}

// ... existing helper functions (findCustomer, createCustomer, createJob) ...

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    error: 'Internal Server Error',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// Start the server
app.listen(port, () => {
  console.log(`Server is running at http://localhost:${port}`);
});
