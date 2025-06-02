require('dotenv').config();
const express = require('express');
const axios = require('axios');
const helmet = require('helmet');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const { body, validationResult } = require('express-validator');

const app = express();
// Let Render set the port, fallback to 10000 for local development
const port = process.env.PORT || 10000;

// Leap CRM API configuration
const LEAP_API_BASE_URL = 'https://api.jobprogress.com/api/v1';
const LEAP_API_KEY = process.env.LEAP_API_KEY;

// Validate required environment variables
if (!process.env.LEAP_API_KEY) {
  console.error('Error: LEAP_API_KEY environment variable is not set');
  process.exit(1);
} else {
  console.log('LEAP_API_KEY is set');
  console.log('LEAP_API_KEY length:', process.env.LEAP_API_KEY.length);
  console.log('LEAP_API_KEY first 4 chars:', process.env.LEAP_API_KEY.substring(0, 4));
  console.log('LEAP_API_KEY last 4 chars:', process.env.LEAP_API_KEY.substring(process.env.LEAP_API_KEY.length - 4));
}

// Security middleware
app.use(helmet());

// CORS configuration
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(',') : '*',
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.'
});
app.use(limiter);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Request logging middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  if (req.body && Object.keys(req.body).length > 0) {
    console.log('Request body:', JSON.stringify(req.body, null, 2));
  }
  next();
});

// Helper function to find existing customer
async function findExistingCustomer(email, phone) {
  try {
    const response = await axios.get('https://api.jobprogress.com/api/v1/customers', {
      headers: {
        'Authorization': `Bearer ${process.env.LEAP_API_KEY}`,
        'Content-Type': 'application/json'
      },
      params: {
        email: email,
        phone: phone
      }
    });
    return response.data.data && response.data.data.length > 0 ? response.data.data[0] : null;
  } catch (error) {
    console.error('Error finding customer:', error.message);
    return null;
  }
}

// Helper function to create customer
async function createCustomer(customerData) {
  try {
    const leapCustomer = {
      first_name: customerData.firstName,
      last_name: customerData.lastName,
      email: customerData.emails && customerData.emails[0] ? customerData.emails[0].email : '',
      phone: customerData.phoneNumbers && customerData.phoneNumbers[0] ? customerData.phoneNumbers[0].number : '',
      address: {
        street: customerData.street || '',
        city: customerData.city || '',
        state: customerData.state || '',
        zip: customerData.zipCode || ''
      }
    };

    const response = await axios.post('https://api.jobprogress.com/api/v1/customers', leapCustomer, {
      headers: {
        'Authorization': `Bearer ${process.env.LEAP_API_KEY}`,
        'Content-Type': 'application/json'
      }
    });
    return response.data;
  } catch (error) {
    console.error('Error creating customer:', error.message);
    throw error;
  }
}

// Helper function to create job/estimate
async function createJob(customerId, estimateData) {
  try {
    const leapJob = {
      customer_id: customerId,
      name: `Estimate ${estimateData.id}`,
      description: estimateData.resultNote || 'Estimate from SalesPro',
      status: estimateData.isSale ? 'sold' : 'estimate',
      estimated_amount: estimateData.saleAmount || 0,
      categories: estimateData.addedCategories || []
    };

    const response = await axios.post('https://api.jobprogress.com/api/v1/jobs', leapJob, {
      headers: {
        'Authorization': `Bearer ${process.env.LEAP_API_KEY}`,
        'Content-Type': 'application/json'
      }
    });
    return response.data;
  } catch (error) {
    console.error('Error creating job:', error.message);
    throw error;
  }
}

// Root endpoint
app.get('/', (req, res) => {
  res.send('Webhook server is running!');
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// Webhook endpoint - NO signature verification
app.post('/webhook', [
  // Input validation
  body('customer.firstName').notEmpty().withMessage('Customer firstName is required'),
  body('customer.lastName').notEmpty().withMessage('Customer lastName is required'),
  body('estimate.id').notEmpty().withMessage('Estimate id is required'),
  body('estimate.saleAmount').isNumeric().withMessage('Estimate saleAmount must be a number')
], async (req, res) => {
  try {
    // Check validation results
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation failed',
        details: errors.array()
      });
    }

    console.log('Processing webhook request...');
    const { customer, estimate } = req.body;

    // Validate office alignment if both have officeId
    if (customer.officeId && estimate.officeId && customer.officeId !== estimate.officeId) {
      return res.status(400).json({
        error: 'Office validation error',
        details: `Customer officeId (${customer.officeId}) does not match estimate officeId (${estimate.officeId})`
      });
    }

    const email = customer.emails && customer.emails[0] ? customer.emails[0].email : null;
    const phone = customer.phoneNumbers && customer.phoneNumbers[0] ? customer.phoneNumbers[0].number : null;

    // Check if customer already exists
    let existingCustomer = await findExistingCustomer(email, phone);
    let leapCustomer;

    if (existingCustomer) {
      console.log('Found existing customer:', existingCustomer.id);
      leapCustomer = existingCustomer;
    } else {
      console.log('Creating new customer...');
      leapCustomer = await createCustomer(customer);
      console.log('Created customer:', leapCustomer.data ? leapCustomer.data.id : leapCustomer.id);
    }

    // Create job/estimate in Leap CRM
    console.log('Creating job/estimate...');
    const customerId = leapCustomer.data ? leapCustomer.data.id : leapCustomer.id;
    const leapJob = await createJob(customerId, estimate);
    console.log('Created job:', leapJob.data ? leapJob.data.id : leapJob.id);

    res.json({
      message: 'Webhook processed successfully',
      customer: leapCustomer,
      job: leapJob
    });

  } catch (error) {
    console.error('Webhook processing error:', error.message);
    console.error('Error details:', error.response ? error.response.data : error);

    res.status(500).json({
      error: 'Internal server error',
      details: error.message,
      response: error.response ? error.response.data : null
    });
  }
});

// Error handling middleware
app.use((error, req, res, next) => {
  console.error('Unhandled error:', error);
  res.status(500).json({
    error: 'Internal server error',
    details: error.message
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: 'Not found',
    message: 'The requested endpoint does not exist'
  });
});

// Start server
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log('Webhook endpoint: /webhook');
});
