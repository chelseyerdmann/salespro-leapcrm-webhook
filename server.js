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

if (!process.env.WEBHOOK_SECRET) {
  console.error('Error: WEBHOOK_SECRET environment variable is not set');
  process.exit(1);
}

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
    return response.data.data[0];
  } catch (error) {
    console.error('Error finding customer:', error.message);
    return null;
  }
}

// Helper function to create customer
async function createCustomer(customerData) {
  try {
    const response = await axios.post('https://api.jobprogress.com/api/v1/customers', customerData, {
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

// Helper function to create estimate
async function createEstimate(estimateData) {
  try {
    const response = await axios
