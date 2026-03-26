import mongoose from 'mongoose';
const mongoURI = 'mongodb://127.0.0.1:27017/community-service';
async function run() {
  await mongoose.connect(mongoURI);
  const r = await mongoose.connection.db.collection('residententries').findOne({ email: 'abyjoy2@gmail.com' });
  if (r) {
    console.log('AADHAR_START');
    console.log(r.aadharNumber);
    console.log(r.aadharNumber.length);
    console.log('AADHAR_END');
    console.log('NAME_START');
    console.log(r.name);
    console.log('NAME_END');
  } else {
    console.log('NOT_FOUND');
  }
  await mongoose.disconnect();
}
run();
