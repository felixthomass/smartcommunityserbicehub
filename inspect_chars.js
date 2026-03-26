import mongoose from 'mongoose';
const mongoURI = 'mongodb://127.0.0.1:27017/community-service';
async function run() {
  await mongoose.connect(mongoURI);
  const r = await mongoose.connection.db.collection('residententries').findOne({ email: 'abyjoy2@gmail.com' });
  console.log('Aadhar:', r.aadharNumber);
  console.log('Chars:', r.aadharNumber.split('').map(c => c.charCodeAt(0)));
  console.log('Name:', r.name);
  console.log('Name Chars:', r.name.split('').map(c => c.charCodeAt(0)));
  await mongoose.disconnect();
}
run();
