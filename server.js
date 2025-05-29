// ... existing code ...
    // Create customer in Leap CRM
    console.log('Creating customer in Leap CRM...');
    const customerResponse = await axios.post(
      'https://api.jobprogress.com/api/v1/customers',
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
      'https://api.jobprogress.com/api/v1/estimates',
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
// ... existing code ...
