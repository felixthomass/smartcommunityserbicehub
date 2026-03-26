const fs = require('fs');
fetch('http://localhost:3002/api/attendance')
  .then(r => r.json())
  .then(data => {
    fs.writeFileSync('./attendance_output.json', JSON.stringify(data, null, 2));
    console.log('Saved to attendance_output.json');
  });
