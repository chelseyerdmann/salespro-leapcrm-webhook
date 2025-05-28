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
      case 'identifier':
        data.identifier = field.value;
        break;
      case 'name':
        data.name = field.value;
        break;
      case 'addressStreet':
        data.address.street = field.value;
        break;
      case 'addressCity':
        data.address.city = field.value;
        break;
      case 'addressState':
        data.address.state = field.value;
        break;
      case 'addressZip':
        data.address.zip = field.value;
        break;
      case 'phone':
        data.phones.push(field.value);
        break;
      case 'email':
        data.email = field.value;
        break;
      case 'apiSourceData':
        data.apiSourceData = field.value;
        break;
    }
  });

  return data;
}

// Update the webhook endpoint
app.post('/webhook', async (req, res) => {
  try {
    console.log('Received webhook from SalesPro:', req.body);
    
    const appointments = req.body;
    
    if (!Array.isArray(appointments)) {
      return res.status(400).json({ error: 'Invalid data format' });
    }

    const results = [];

    for (const appointmentArray of appointments) {
      const appointmentData = extractAppointmentData(appointmentArray);
      
      // First, try to find existing customer
      const existingCustomer = await findCustomer(appointmentData);
      
      let customerId;
      if (existingCustomer) {
        customerId = existingCustomer.id;
        console.log('Found existing customer:', customerId);
      } else {
        // Create new customer
        const newCustomer = await createCustomer(appointmentData);
        customerId = newCustomer.id;
        console.log('Created new customer:', customerId);
      }

      // Create job for the customer
      const job = await createJob(customerId, appointmentData);
      console.log('Created new job:', job.id);

      results.push({
        appointmentId: appointmentData.identifier,
        customerId,
        jobId: job.id
      });
    }

    res.status(200).json({ 
      message: 'Successfully processed webhook',
      results
    });

  } catch (error) {
    console.error('Error processing webhook:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update customer creation
async function createCustomer(appointmentData) {
  try {
    const [firstName, ...lastNameParts] = appointmentData.name.split(' ');
    const lastName = lastNameParts.join(' ');

    const customerPayload = {
      first_name: firstName,
      last_name: lastName,
      email: appointmentData.email,
      phone: appointmentData.phones[0] || '',
      address: appointmentData.address,
      source: 'SalesPro',
      source_id: appointmentData.identifier,
      api_source_data: appointmentData.apiSourceData
    };

    const response = await axios.post(`${LEAP_API_BASE_URL}/customers`, customerPayload, {
      headers: {
        'Authorization': `Bearer ${LEAP_API_KEY}`,
        'Content-Type': 'application/json'
      }
    });

    return response.data;
  } catch (error) {
    console.error('Error creating customer:', error);
    throw error;
  }
}

// Update job creation
async function createJob(customerId, appointmentData) {
  try {
    const jobPayload = {
      customer_id: customerId,
      name: `SalesPro Appointment #${appointmentData.identifier}`,
      description: appointmentData.notes,
      status: 'scheduled',
      source: 'SalesPro',
      source_id: appointmentData.identifier,
      api_source_data: appointmentData.apiSourceData,
      scheduled_date: appointmentData.date
    };

    const response = await axios.post(`${LEAP_API_BASE_URL}/jobs`, jobPayload, {
      headers: {
        'Authorization': `Bearer ${LEAP_API_KEY}`,
        'Content-Type': 'application/json'
      }
    });

    return response.data;
  } catch (error) {
    console.error('Error creating job:', error);
    throw error;
  }
}
