import mongoose from 'mongoose';

const MONGODB_URI = 'mongodb://localhost:27017/community-service'; 

// Housekeeping Staff Schema
const housekeepingStaffSchema = new mongoose.Schema({
  user_id: { type: String, required: true, index: true, unique: true },
  employee_id: { type: String, required: true },
  name: { type: String },
  email: { type: String },
  phone: { type: String },
  assigned_area: { type: String, required: true }, // e.g., 'A', 'B', 'Lobby'
  shift_timing: { type: String, required: true }, // Morning/Afternoon/Night
  active_tasks_count: { type: Number, default: 0 },
  employment_status: { type: String, default: 'Active' },
  created_at: { type: Date, default: Date.now },
  updated_at: { type: Date, default: Date.now }
})

const HousekeepingStaff = mongoose.model('HousekeepingStaff', housekeepingStaffSchema);

async function seed() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB');

    const staffData = [
      {
        user_id: 'HK001_USER_ID',
        employee_id: 'HK001',
        name: 'Joseph Sabu',
        email: 'joseph@example.com',
        phone: '9876543210',
        assigned_area: 'A',
        shift_timing: 'Morning',
        active_tasks_count: 0
      },
      {
        user_id: 'HK002_USER_ID',
        employee_id: 'HK002',
        name: 'Maria Garcia',
        email: 'maria@example.com',
        phone: '9876543211',
        assigned_area: 'B',
        shift_timing: 'Afternoon',
        active_tasks_count: 0
      }
    ];

    for (const staff of staffData) {
      await HousekeepingStaff.findOneAndUpdate(
        { user_id: staff.user_id },
        staff,
        { upsert: true, new: true }
      );
      console.log(`Seeded staff: ${staff.name}`);
    }

    console.log('Seed completed successfully');
    process.exit(0);
  } catch (error) {
    console.error('Seed failed:', error);
    process.exit(1);
  }
}

seed();
