# salespro-leapcrm-webhook
# SalesPro to Leap CRM Webhook Integration

A Node.js webhook server that automatically creates customers and jobs in Leap CRM when appointments are completed in SalesPro.

## Overview

This server acts as a bridge between SalesPro and Leap CRM, handling webhook requests from SalesPro and creating corresponding customers and jobs in Leap CRM. It includes features for:
- Customer creation/lookup
- Job creation
- Error handling
- Logging

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

## Acknowledgments

- SalesPro API Documentation
- Leap CRM API Documentation
- Node.js Community
