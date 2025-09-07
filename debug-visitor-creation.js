// Debug script to test visitor creation and see the exact response
const testVisitorCreation = async () => {
  const testVisitor = {
    visitorName: 'Debug Test Visitor',
    visitorPhone: '9999999999',
    visitorEmail: 'debug@test.com',
    idType: 'aadhar',
    idNumber: 'DEBUG-1234-5678',
    purpose: 'Debug Testing',
    hostName: 'Debug Host',
    hostFlat: 'DEBUG-101',
    hostPhone: '8888888888',
    vehicleNumber: 'DEBUG123',
    notes: 'Debug test visitor',
    securityOfficer: 'Debug Officer'
  }

  try {
    console.log('🧪 Testing visitor creation...')
    
    const response = await fetch('http://localhost:3002/api/visitors', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(testVisitor)
    })

    console.log('📥 Response status:', response.status)
    const result = await response.json()
    
    console.log('📥 Full response:')
    console.log(JSON.stringify(result, null, 2))
    
    console.log('\n🔍 Analysis:')
    console.log('- result.success:', result.success)
    console.log('- result.data:', result.data ? 'exists' : 'missing')
    console.log('- result.data._id:', result.data?._id)
    console.log('- typeof result.data._id:', typeof result.data?._id)
    
    // Simulate what the frontend mongoService does
    console.log('\n🔄 Simulating mongoService.createVisitorLog:')
    const mongoServiceResult = { success: true, data: result.data }
    console.log('- mongoService result:', JSON.stringify(mongoServiceResult, null, 2))
    console.log('- mongoServiceResult.data._id:', mongoServiceResult.data?._id)
    
    // Simulate what the frontend SecurityDashboard does
    console.log('\n🔄 Simulating SecurityDashboard extraction:')
    const visitorId = mongoServiceResult.data?._id
    console.log('- extracted visitorId:', visitorId)
    console.log('- visitorId is valid:', !!visitorId)

  } catch (error) {
    console.error('❌ Test failed:', error)
  }
}

// Run the test
testVisitorCreation()
