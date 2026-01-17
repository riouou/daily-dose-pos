
import http from 'http';

const testEndpoint = (path) => {
    return new Promise((resolve) => {
        http.get(`http://localhost:3000${path}`, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                if (res.statusCode >= 200 && res.statusCode < 300) {
                    console.log(`✅ ${path}: OK (${res.statusCode})`);
                    resolve(true);
                } else {
                    console.error(`❌ ${path}: FAILED (${res.statusCode})`);
                    console.error('Response:', data.substring(0, 100)); // Show preview
                    resolve(false);
                }
            });
        }).on('error', (err) => {
            console.error(`❌ ${path}: Network Error (${err.message})`);
            resolve(false);
        });
    });
};

const runVerify = async () => {
    console.log('Verifying System Routes...');
    const results = await Promise.all([
        testEndpoint('/api/menu'),
        testEndpoint('/api/orders'),
        testEndpoint('/api/admin/status')
    ]);

    if (results.every(r => r)) {
        console.log('\nAll systems operational! Refactor successful.');
        process.exit(0);
    } else {
        console.error('\nSome systems failed. Please check server logs.');
        process.exit(1);
    }
};

runVerify();
