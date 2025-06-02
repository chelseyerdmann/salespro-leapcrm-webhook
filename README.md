# SalesPro to Leap CRM Webhook Integration

This server acts as a webhook endpoint to receive data from SalesPro and create corresponding records in Leap CRM.

## Features

- Receives webhook data from SalesPro
- Validates office alignment between customer and estimate
- Creates customers in Leap CRM
- Creates estimates in Leap CRM
- Includes security features (helmet, rate limiting)
- Detailed error logging and validation

## Prerequisites

- Node.js (v14 or higher)
- npm or yarn
- Leap CRM API key
- Render account (for deployment)

## Environment Variables

Create a `.env` file in the root directory with the following variables:

```env
LEAP_API_KEY=your_leap_crm_api_key
PORT=10000  # Optional, defaults to 10000
NODE_ENV=development  # Optional, defaults to development
```

## Installation

1. Clone the repository
2. Install dependencies:
```bash
npm install
```

## Running the Server

### Local Development
```bash
npm start
```

### Production (Render)
The server is configured to run on Render. Make sure to:
1. Set the environment variables in Render's dashboard
2. Deploy from the main branch

## API Endpoints

### Webhook Endpoint
```
POST /webhook
```

#### Request Body Format
```json
{
  "customer": {
    "firstName": "John",
    "lastName": "Doe",
    "officeId": "123",  // Must match estimate's officeId
    "emails": [
      {
        "email": "john@example.com"
      }
    ],
    "phoneNumbers": [
      {
        "number": "1234567890"
      }
    ],
    "street": "123 Main St",
    "city": "Anytown",
    "state": "CA",
    "zipCode": "12345"
  },
  "estimate": {
    "id": "123",
    "officeId": "123",  // Must match customer's officeId
    "resultNote": "Test estimate",
    "isSale": true,
    "saleAmount": 1000,
    "addedCategories": ["category1"]
  }
}
```

#### Response Format
```json
{
  "message": "Webhook processed successfully",
  "customer": {
    // Leap CRM customer data
  },
  "estimate": {
    // Leap CRM estimate data
  }
}
```

## Validation Rules

1. **Office Alignment**: The `officeId` must match between customer and estimate
2. **Required Customer Fields**: firstName, lastName
3. **Required Estimate Fields**: id, saleAmount

## Error Handling

The server provides detailed error responses:

```json
{
  "error": "Error type",
  "details": "Detailed error message",
  "response": {
    // Additional error details from Leap CRM
  }
}
```

## Security Features

- Helmet for security headers
- Rate limiting (100 requests per 15 minutes)
- JSON body parsing
- Request logging

## Troubleshooting

### Common Issues

1. **403 Forbidden Error**
   - Check if your Leap CRM API key is valid
   - Verify the API key has correct permissions
   - Ensure the API key is properly set in environment variables

2. **Office Validation Error**
   - Verify that both customer and estimate have matching officeId values
   - Check that the officeId exists in your system

3. **500 Internal Server Error**
   - Check server logs for detailed error messages
   - Verify all required fields are present in the request
   - Ensure the Leap CRM API is accessible

## Support

For issues or questions, please contact your system administrator or refer to the Leap CRM API documentation.
