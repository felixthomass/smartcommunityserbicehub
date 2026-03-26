import mongoose from 'mongoose';
import fs from 'fs';
const mongoURI = 'mongodb://127.0.0.1:27017/community-service';
async function run() {
  await mongoose.connect(mongoURI);
  const residents = await mongoose.connection.db.collection('residententries').find({}).toArray();
  fs.writeFileSync('residents_debug.json', JSON.stringify(residents, null, 2));
  console.log('Done');
  await mongoose.disconnect();
}
run();
