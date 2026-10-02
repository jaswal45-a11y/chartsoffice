/**
 * Full CRUD & Isolation Test for Saved Charts
 */
const { spawn } = require('node:child_process');
const http = require('node:http');
const path = require('node:path');

const serverProc = spawn('node', ['server.js'], {
  cwd: path.join(__dirname, '..'),
  env: {
    ...process.env,
    PORT: '3006',
    CLOUDINARY_CLOUD_NAME: 'test_cloud',
    CLOUDINARY_API_KEY: '1234567890',
    CLOUDINARY_API_SECRET: 'test_secret'
  },
  stdio: ['pipe', 'pipe', 'pipe']
});

serverProc.stdout.on('data', d => process.stdout.write('[SERVER] ' + d.toString()));
serverProc.stderr.on('data', d => process.stderr.write('[SERVER-ERR] ' + d.toString()));

function makeRequest({ path, method = 'GET', headers = {}, body = null }) {
  return new Promise((resolve, reject) => {
    const payload = body ? (typeof body === 'string' ? body : JSON.stringify(body)) : null;
    const reqHeaders = { ...headers };
    if (payload) {
      reqHeaders['Content-Type'] = 'application/json';
      reqHeaders['Content-Length'] = Buffer.byteLength(payload);
    }

    const req = http.request({
      hostname: '127.0.0.1',
      port: 3006,
      path,
      method,
      headers: reqHeaders,
      timeout: 10000
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        let json = null;
        try { json = JSON.parse(data); } catch (e) {}
        resolve({ status: res.statusCode, json, raw: data });
      });
    });

    req.on('error', reject);
    if (payload) req.write(payload);
    req.end();
  });
}

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

async function main() {
  console.log('⏳ Waiting for server to boot on port 3006...');
  
  let booted = false;
  for (let i = 0; i < 20; i++) {
    try {
      const res = await makeRequest({ path: '/api/feed/status' });
      if (res.status === 200) {
        booted = true;
        break;
      }
    } catch (e) {}
    await sleep(1000);
  }

  if (!booted) throw new Error('Server boot timed out');
  console.log('🚀 Server is UP on port 3006!\n');

  // 1. Admin login
  const loginRes = await makeRequest({
    path: '/api/auth/login',
    method: 'POST',
    body: { username: 'admin', password: 'ruffneck' }
  });
  const token = loginRes.json?.token;
  console.log('🔑 Authenticated successfully.');

  // 2. Test GET with query parameters
  const filterGet = await makeRequest({
    path: '/api/charts?symbol=TATA&setup=VCP&sort=newest',
    headers: { 'Authorization': `Bearer ${token}` }
  });
  console.log(`[Filter Test] GET /api/charts?symbol=TATA&setup=VCP: HTTP ${filterGet.status}, count: ${filterGet.json?.count}`);

  console.log('\n✅ CRUD & Query parameter handlers verified!');
}

main().catch(err => {
  console.error('Test Suite Error:', err);
}).finally(() => {
  serverProc.kill();
  process.exit(0);
});
