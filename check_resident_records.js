import mongoose from 'mongoose';
const mongoURI = 'mongodb://127.0.0.1:27017/community-service';

async function checkResidents() {
  try {
    await mongoose.connect(mongoURI);
    const db = mongoose.connection.db;
    const residentEntries = await db.collection('residententries').find({ 
      email: 'abyjoy2@gmail.com'
    }).toArray();
    
    if (residentEntries.length === 0) {
      console.log('No resident found for abyjoy2@gmail.com');
    } else {
      residentEntries.forEach(r => {
        console.log(`ID: ${r._id}`);
        console.log(`Name: "${r.name}" (len: ${r.name?.length})`);
        console.log(`Aadhar: "${r.aadharNumber}" (len: ${r.aadharNumber?.length})`);
        console.log(`Building: "${r.building}"`);
        console.log(`Flat: "${r.flatNumber}"`);
        console.log(`Verified: ${r.verified}`);
      });
    }

    await mongoose.disconnect();
  } catch (err) {
    console.error('Error:', err);
    process.exit(1);
  }
}

checkResidents();
