import mongoose from 'mongoose';

const MONGODB_URI = 'mongodb://localhost:27017/community-service';

// Service Request Schema
const serviceRequestSchema = new mongoose.Schema({
  category: { type: String, default: 'general' },
  priority: { type: String, default: 'medium', enum: ['low', 'medium', 'high', 'urgent'] },
  description: { type: String, default: '' },
  building: { type: String, default: '' },
  flatNumber: { type: String, default: '' },
  residentAuthUserId: { type: String, required: true },
  status: { type: String, default: 'created' },
  assigned_to: { type: String },
  createdAt: { type: Date, default: Date.now }
});

const ServiceRequest = mongoose.model('ServiceRequest', serviceRequestSchema);

// Housekeeping Staff Schema
const housekeepingStaffSchema = new mongoose.Schema({
  user_id: { type: String, required: true },
  assigned_area: { type: String, required: true },
  active_tasks_count: { type: Number, default: 0 },
  employment_status: { type: String, default: 'Active' }
});

const HousekeepingStaff = mongoose.model('HousekeepingStaff', housekeepingStaffSchema);

// Simplified Auto-assign function (matching server.js implementation)
async function autoAssignHousekeepingTask(requestId, category, location) {
  if (category !== 'housekeeping') return null;
  const area = location.split('-')[0].trim();
  let staff = await HousekeepingStaff.findOne({ assigned_area: area, employment_status: 'Active' }).sort({ active_tasks_count: 1 });
  if (!staff) staff = await HousekeepingStaff.findOne({ employment_status: 'Active' }).sort({ active_tasks_count: 1 });
  if (staff) {
    await ServiceRequest.findByIdAndUpdate(requestId, { status: 'assigned', assigned_to: staff.user_id });
    await HousekeepingStaff.findOneAndUpdate({ user_id: staff.user_id }, { $inc: { active_tasks_count: 1 } });
    return staff.user_id;
  }
  return null;
}

async function test() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB');

    // 1. Create a request for Area A
    console.log('--- Test 1: Area A match ---');
    const request1 = new ServiceRequest({
      category: 'housekeeping',
      building: 'A',
      flatNumber: '101',
      residentAuthUserId: 'TEST_RESIDENT'
    });
    const saved1 = await request1.save();
    const assignedTo1 = await autoAssignHousekeepingTask(saved1._id, saved1.category, 'A-101');
    const updated1 = await ServiceRequest.findById(saved1._id);
    console.log(`Request 1 (Area A) assigned to: ${assignedTo1}`);
    console.log(`Request 1 Status: ${updated1.status}`);

    // 2. Create another request for Area A (should still go to Joseph since he's the only one for A)
    console.log('--- Test 2: Area A least workload ---');
    const request2 = new ServiceRequest({
      category: 'housekeeping',
      building: 'A',
      flatNumber: '102',
      residentAuthUserId: 'TEST_RESIDENT'
    });
    const saved2 = await request2.save();
    const assignedTo2 = await autoAssignHousekeepingTask(saved2._id, saved2.category, 'A-102');
    console.log(`Request 2 (Area A) assigned to: ${assignedTo2}`);

    // 3. Create request for Area C (Fallback)
    console.log('--- Test 3: Fallback (Area C) ---');
    const request3 = new ServiceRequest({
      category: 'housekeeping',
      building: 'C',
      flatNumber: '101',
      residentAuthUserId: 'TEST_RESIDENT'
    });
    const saved3 = await request3.save();
    const assignedTo3 = await autoAssignHousekeepingTask(saved3._id, saved3.category, 'C-101');
    const updatedStaff = await HousekeepingStaff.find();
    
    console.log(`Request 3 (Area C) assigned to: ${assignedTo3}`);
    console.table(updatedStaff.map(s => ({ user_id: s.user_id, area: s.assigned_area, workload: s.active_tasks_count })));

    console.log('Tests completed successfully');
    process.exit(0);
  } catch (error) {
    console.error('Test failed:', error);
    process.exit(1);
  }
}

test();
