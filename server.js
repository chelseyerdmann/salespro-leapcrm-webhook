const express = require('express');
const axios = require('axios');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const cors = require('cors');
const { body, validationResult } = require('express-validator');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 3000;

// Leap CRM API configuration
const LEAP_API_BASE_URL = 'https://api.jobprogress.com/api/v3';
const LEAP_API_KEY = process.env.LEAP_API_KEY;

// Security middleware
app.use(helmet());
app.use(express.json());
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || '*',
  methods: ['POST'],
  allowedHeaders: ['Content-Type', 'x-salespro-signature']
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});
app.use(limiter);

// Basic route for testing
app.get('/', (req, res) => {
  res.send('Webhook server is running!');
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString()
  });
});

// Helper function to extract appointment data
function extractAppointmentData(appointmentArray) {
  const data = {
    identifier: '',
    date: '',
    name: '',
    address: {
      street: '',
      city: '',
      state: '',
      zip: ''
    },
    notes: '',
    phones: [],
    email: '',
    apiSourceData: {}
  };

  appointmentArray.forEach(field => {
    switch(field.appKey) {
      case '
