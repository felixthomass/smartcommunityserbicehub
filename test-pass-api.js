const API_BASE = 'http://localhost:3002';

async function testPassApi() {
  console.log('🚀 Starting Pass API Test...');

  try {
    // 1. Create a pass
    console.log('\n1️⃣ Testing POST /api/passes...');
    const createRes = await fetch(`${API_BASE}/api/passes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        visitorName: 'Test Visitor',
        visitorEmail: 'test@example.com',
        visitorPhone: '1234567890',
        hostName: 'Test Host',
        building: 'A',
        flatNumber: '101',
        hostAuthUserId: 'user_123'
      })
    });

    const createData = await createRes.json();
    console.log('Response:', JSON.stringify(createData, null, 2));

    if (!createData.success) throw new Error('Create pass failed');
    const passCode = createData.pass.code;

    // 2. Get pass by code
    console.log(`\n2️⃣ Testing GET /api/passes/${passCode}...`);
    const getRes = await fetch(`${API_BASE}/api/passes/${passCode}`);
    const getData = await getRes.json();
    console.log('Response:', JSON.stringify(getData, null, 2));
    if (!getData.success) throw new Error('Get pass failed');

    // 3. Mark pass as used
    console.log(`\n3️⃣ Testing POST /api/passes/${passCode}/use...`);
    const useRes = await fetch(`${API_BASE}/api/passes/${passCode}/use`, { method: 'POST' });
    const useData = await useRes.json();
    console.log('Response:', JSON.stringify(useData, null, 2));
    if (!useData.success) throw new Error('Use pass failed');

    // 4. Update status
    console.log(`\n4️⃣ Testing POST /api/passes/${passCode}/status...`);
    const statusRes = await fetch(`${API_BASE}/api/passes/${passCode}/status`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'expired' })
    });
    const statusData = await statusRes.json();
    console.log('Response:', JSON.stringify(statusData, null, 2));
    if (!statusData.success) throw new Error('Update status failed');

    console.log('\n✅ All tests passed successfully!');
  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
  }
}

testPassApi();
