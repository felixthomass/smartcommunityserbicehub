// Test script to verify visitor creation
const testVisitorCreation = async () => {
  const testVisitor = {
    visitorName: 'Test Visitor',
    visitorPhone: '1234567890',
    visitorEmail: 'test@example.com',
    idType: 'aadhar',
    idNumber: '1234-5678-9012',
    purpose: 'Testing',
    hostName: 'Test Host',
    hostFlat: 'A-101',
    hostPhone: '0987654321',
    vehicleNumber: 'TN01AB1234',
    notes: 'Test visitor for debugging',
    securityOfficer: 'Test Officer'
  }

  try {
    console.log('🧪 Testing visitor creation...')
    console.log('📤 Sending data:', JSON.stringify(testVisitor, null, 2))

    const response = await fetch('http://localhost:3002/api/visitors', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(testVisitor)
    })

    console.log('📥 Response status:', response.status)
    console.log('📥 Response headers:', Object.fromEntries(response.headers.entries()))

    const result = await response.json()
    console.log('📥 Response data:', JSON.stringify(result, null, 2))

    if (result.success) {
      console.log('✅ Visitor created successfully!')
      console.log('🆔 Visitor ID:', result.data._id)
      console.log('🆔 ID Type:', typeof result.data._id)
      
      // Test getting the visitor back
      const getResponse = await fetch(`http://localhost:3002/api/visitors/${result.data._id}`)
      const getResult = await getResponse.json()
      console.log('📥 Retrieved visitor:', JSON.stringify(getResult, null, 2))
    } else {
      console.error('❌ Visitor creation failed:', result.error)
    }

  } catch (error) {
    console.error('❌ Test failed:', error)
  }
}

// Run the test
testVisitorCreation()
