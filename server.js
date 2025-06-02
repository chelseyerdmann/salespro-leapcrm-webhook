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
}

// Helper function to find existing customer
async function findCustomer(customerData) {
  try {
    console.log('Attempting to find customer with data:', customerData);
    console.log('Using API URL:', `${LEAP_API_BASE_URL}/customers`);
    console.log('Using API Key:', LEAP_API_KEY ? 'API Key is set' : 'API Key is missing');

    const response = await axios.get(`${LEAP_API_BASE_URL}/customers`, {
      params: {
        email: customerData.emails[0].email,
        phone: customerData.phoneNumbers[0].number
      },
      headers: {
        'Authorization': `Bearer ${LEAP_API_KEY}`,
        'Content-Type': 'application/json'
      }
    });

    console.log('API Response:', response.data);
    return response.data.customers[0] || null;
  } catch (error) {
    console.error('Error finding customer:', error.message);
    console.error('Error details:', error.response ? error.response.data : 'No response data');
    throw error;
  }
}

// Helper function to create new customer
async function createCustomer(customerData) {
  try {
    console.log('Attempting to create customer with data:', customerData);
    const customerPayload = {
      first_name: customerData.firstName,
      last_name: customerData.lastName,
      email: customerData.emails[0]?.email,
      phone: customerData.phoneNumbers[0]?.number,
      address: {
        street: customerData.street,
        city: customerData.city,
        state: customerData.state,
        zip: customerData.zipCode
      }
    };

    console.log('Customer payload:', customerPayload);
    const response = await axios.post(`${LEAP_API_BASE_URL}/customers`, customerPayload, {
      headers: {
        'Authorization': `Bearer ${LEAP_API_KEY}`,
        'Content-Type': 'application/json'
      }
    });

    console.log('Create customer response:', response.data);
    return response.data;
  } catch (error) {
    console.error('Error creating customer:', error.message);
    console.error('Error details:', error.response ? error.response.data : 'No response data');
    throw error;
  }
}

// Helper function to create job
async function createJob(customerId, estimateData) {
  try {
    console.log('Attempting to create job for customer:', customerId);
    console.log('Estimate data:', estimateData);
    
    const jobPayload = {
      customer_id: customerId,
      name: `SalesPro Estimate #${estimateData.id}`,
      description: estimateData.resultNote,
      status: estimateData.isSale ? 'sold' : 'no_sale',
      total_amount: estimateData.saleAmount,
      categories: estimateData.addedCategories
    };

    console.log('Job payload:', jobPayload);
    const response = await axios.post(`${LEAP_API_BASE_URL}/jobs`, jobPayload, {
      headers: {
        'Authorization': `Bearer ${LEAP_API_KEY}`,
        'Content-Type': 'application/json'
      }
    });

    console.log('Create job response:', response.data);
    return response.data;
  } catch (error) {
    console.error('Error creating job:', error.message);
    console.error('Error details:', error.response ? error.response.data : 'No response data');
    throw error;
  }
}

// Helper function to verify webhook signature
function verifySignature(payload, signature, secret) {
  // Implement your signature verification logic here
  // This is a placeholder - you should implement proper signature verification
  return true;
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

// Basic route for testing
app.get('/', (req, res) => {
  res.send('Webhook server is running!');
});

// SalesPro webhook endpoint
app.post('/webhook', async (req, res) => {
  try {
    console.log('Received webhook request:', JSON.stringify(req.body, null, 2));
    
    // Validate request body
    if (!req.body || !req.body.customer || !req.body.estimate) {
      console.error('Invalid request body:', req.body);
      return res.status(400).json({ error: 'Invalid request body' });
    }

    const { customer, estimate } = req.body;

    // Validate customer data
    if (!customer.firstName || !customer.lastName) {
      console.error('Missing required customer fields:', customer);
      return res.status(400).json({ error: 'Missing required customer fields' });
    }

    // Validate estimate data
    if (!estimate.id || estimate.saleAmount === undefined) {
      console.error('Missing required estimate fields:', estimate);
      return res.status(400).json({ error: 'Missing required estimate fields' });
    }

    // Validate office alignment
    if (!estimate.officeId || !customer.officeId || estimate.officeId !== customer.officeId) {
      console.error('Office validation failed:', {
        customerOfficeId: customer.officeId,
        estimateOfficeId: estimate.officeId
      });
      return res.status(400).json({ 
        error: 'Office validation failed',
        message: 'The office ID must match between customer and estimate'
      });
    }

    // Create customer in Leap CRM
    console.log('Creating customer in Leap CRM...');
    console.log('Using API Key:', LEAP_API_KEY ? 'API Key is set' : 'API Key is missing');
    console.log('API Key length:', LEAP_API_KEY ? LEAP_API_KEY.length : 0);
    
    const customerResponse = await axios.post(
      `${LEAP_API_BASE_URL}/customers`,
      {
        first_name: customer.firstName,
        last_name: customer.lastName,
        email: customer.emails?.[0]?.email,
        phone: customer.phoneNumbers?.[0]?.number,
        address: {
          street: customer.street,
          city: customer.city,
          state: customer.state,
          zip: customer.zipCode
        }
      },
      {
        headers: {
          'Authorization': `Bearer ${LEAP_API_KEY}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        }
      }
    );

    console.log('Customer created in Leap CRM:', customerResponse.data);

    // Create estimate in Leap CRM
    console.log('Creating estimate in Leap CRM...');
    const estimateResponse = await axios.post(
      `${LEAP_API_BASE_URL}/estimates`,
      {
        customer_id: customerResponse.data.id,
        estimate_number: estimate.id,
        notes: estimate.resultNote,
        status: estimate.isSale ? 'sold' : 'pending',
        total: estimate.saleAmount,
        categories: estimate.addedCategories
      },
      {
        headers: {
          'Authorization': `Bearer ${LEAP_API_KEY}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        }
      }
    );

    console.log('Estimate created in Leap CRM:', estimateResponse.data);

    res.status(200).json({
      message: 'Webhook processed successfully',
      customer: customerResponse.data,
      estimate: estimateResponse.data
    });
  } catch (error) {
    console.error('Error processing webhook:', {
      message: error.message,
      response: error.response?.data,
      status: error.response?.status,
      headers: error.response?.headers,
      stack: error.stack
    });
    res.status(500).json({
      error: 'Internal server error',
      details: error.message,
      response: error.response?.data
    });
  }
});

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
