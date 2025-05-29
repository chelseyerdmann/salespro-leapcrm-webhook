require('dotenv').config();
const express = require('express');
const axios = require('axios');
const helmet = require('helmet');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const { body, validationResult } = require('express-validator');

const app = express();
const port = process.env.PORT || 10000;

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

    // Create customer in Leap CRM
    console.log('Creating customer in Leap CRM...');
    const customerResponse = await axios.post(
      'https://api.leapcrm.io/v1/customers',
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
          'Authorization': `Bearer ${process.env.LEAP_API_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    );

    console.log('Customer created in Leap CRM:', customerResponse.data);

    // Create estimate in Leap CRM
    console.log('Creating estimate in Leap CRM...');
    const estimateResponse = await axios.post(
      'https://api.leapcrm.io/v1/estimates',
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
          'Authorization': `Bearer ${process.env.LEAP_API_KEY}`,
          'Content-Type': 'application/json'
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
