import http from 'http';

const ports = [5173, 3002];

ports.forEach(port => {
    const req = http.get(`http://127.0.0.1:${port}`, (res) => {
        console.log(`Port ${port}: SUCCESS (Status: ${res.statusCode})`);
        res.resume();
    });

    req.on('error', (e) => {
        console.error(`Port ${port}: FAILED (${e.message})`);
    });
});
