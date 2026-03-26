import mongoose from 'mongoose';
const mongoURI = 'mongodb://127.0.0.1:27017/community-service';
async function run() {
  await mongoose.connect(mongoURI);
  const r = await mongoose.connection.db.collection('residententries').findOne({ email: 'abyjoy2@gmail.com' });
  console.log('FULL RECORD:', JSON.stringify(r, null, 2));
  if (r) {
    console.log('NAME:', r.name, 'LENGTH:', r.name.length);
    console.log('AADHAR:', r.aadharNumber, 'LENGTH:', r.aadharNumber ? r.aadharNumber.length : 0);
    console.log('NAME CODES:', r.name.split('').map(c => c.charCodeAt(0)));
    console.log('AADHAR CODES:', r.aadharNumber ? r.aadharNumber.split('').map(c => c.charCodeAt(0)) : []);
  }
  await mongoose.disconnect();
}
run();
