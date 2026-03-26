const mongoose = require('mongoose');
const mongoURI = 'mongodb://127.0.0.1:27017/smart-community'; // I should check what DB name server.js uses if this fails.

mongoose.connect(mongoURI)
  .then(async () => {
    console.log('Connected to MongoDB');
    const db = mongoose.connection.db;
    
    // list collections
    const cols = await db.listCollections().toArray();
    console.log("Collections:", cols.map(c => c.name));

    // try security_staff or securitystaffs
    let items = await db.collection('security_staff').find().toArray();
    if(items.length > 0) console.log("security_staff:", items);
    
    items = await db.collection('securitystaffs').find().toArray();
    if(items.length > 0) console.log("securitystaffs:", items);

    mongoose.disconnect();
  })
  .catch(err => console.error(err));
