import mongoose from 'mongoose';
const mongoURI = 'mongodb://127.0.0.1:27017/community-service';
async function run() {
  await mongoose.connect(mongoURI);
  const residents = await mongoose.connection.db.collection('residententries').find({ email: 'abyjoy2@gmail.com' }).toArray();
  console.log(JSON.stringify(residents, null, 2));
  await mongoose.disconnect();
}
run();
