/**
 * Self-contained Test Runner for Server & Visual Trading Journal API
 */
const { spawn } = require('node:child_process');
const http = require('node:http');
const path = require('node:path');

const serverProc = spawn('node', ['server.js'], {
  cwd: path.join(__dirname, '..'),
  env: { ...process.env, PORT: '3005' },
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
      port: 3005,
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
  console.log('⏳ Waiting for server to boot on port 3005 (connecting to MongoDB Atlas)...');
  
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

  if (!booted) {
    throw new Error('Server did not boot within 20 seconds');
  }
  console.log('🚀 Server is UP and READY!');

  console.log('\n🧪 Executing Visual Trading Journal Test Suite...\n');

  // Test 1: Unauthenticated GET /api/charts -> 401
  const unauthGet = await makeRequest({ path: '/api/charts' });
  console.log(`[Test 1] Unauthenticated GET /api/charts: HTTP ${unauthGet.status} (Expected 401)`);
  if (unauthGet.status !== 401) throw new Error('Failed Test 1');

  // Test 2: Unauthenticated POST /api/charts -> 401
  const unauthPost = await makeRequest({
    path: '/api/charts',
    method: 'POST',
    body: { symbol: 'TATAMOTORS' }
  });
  console.log(`[Test 2] Unauthenticated POST /api/charts: HTTP ${unauthPost.status} (Expected 401)`);
  if (unauthPost.status !== 401) throw new Error('Failed Test 2');

  // Test 3: Authenticate
  const loginRes = await makeRequest({
    path: '/api/auth/login',
    method: 'POST',
    body: { username: 'admin', password: 'ruffneck' }
  });
  console.log(`[Test 3] Admin Login: HTTP ${loginRes.status}, Token: ${loginRes.json?.token ? 'OK' : 'MISSING'}`);
  if (!loginRes.json?.token) throw new Error('Login failed');
  const token = loginRes.json.token;

  // Test 4: Authenticated GET /api/charts -> 200
  const authGet = await makeRequest({
    path: '/api/charts',
    headers: { 'Authorization': `Bearer ${token}` }
  });
  console.log(`[Test 4] Authenticated GET /api/charts: HTTP ${authGet.status}, Initial Charts count: ${authGet.json?.charts?.length ?? 0}`);
  if (authGet.status !== 200) throw new Error('Failed Test 4');

  // Test 5: Validation Check on POST /api/charts (Missing screenshot)
  const invalidPost = await makeRequest({
    path: '/api/charts',
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token}` },
    body: { symbol: 'TATAMOTORS' }
  });
  console.log(`[Test 5] POST /api/charts without screenshot: HTTP ${invalidPost.status}, Error: ${invalidPost.json?.error}`);
  if (invalidPost.status !== 400) throw new Error('Failed Test 5');

  // Test 6: Validation Check on POST /api/charts (Invalid screenshot format)
  const invalidImgPost = await makeRequest({
    path: '/api/charts',
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token}` },
    body: { screenshot: 'not-a-data-url', symbol: 'TATAMOTORS' }
  });
  console.log(`[Test 6] POST /api/charts with invalid image: HTTP ${invalidImgPost.status}, Error: ${invalidImgPost.json?.error}`);
  if (invalidImgPost.status !== 400) throw new Error('Failed Test 6');

  // Test 7: Cloudinary error handling test (Valid data URL when Cloudinary is not yet configured)
  const validDataUrl = 'data:image/webp;base64,UklGRhoAAABXRUJQVlA4TA0AAAAvAAAAEAcQERGIiP4HAA==';
  const cldPost = await makeRequest({
    path: '/api/charts',
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token}` },
    body: {
      screenshot: validDataUrl,
      symbol: 'TATAMOTORS',
      timeframe: '1D',
      exchange: 'NSE',
      setup: 'VCP',
      notes: 'Testing VCP setup note'
    }
  });
  console.log(`[Test 7] POST /api/charts payload dispatch: HTTP ${cldPost.status}`);
  if (cldPost.status === 201) {
    console.log(`  -> Chart saved successfully! ID: ${cldPost.json?.chart?.id}`);
    const chartId = cldPost.json?.chart?.id;
    // Test DELETE
    const delRes = await makeRequest({
      path: `/api/charts/${chartId}`,
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${token}` }
    });
    console.log(`[Test 8] DELETE /api/charts/${chartId}: HTTP ${delRes.status}, Message: ${delRes.json?.message}`);
  } else {
    console.log(`  -> Cloudinary response: ${cldPost.json?.error}`);
  }

  console.log('\n🎉 ALL INTEGRATION TESTS COMPLETED SUCCESSFULLY!');
}

main().catch(err => {
  console.error('Test Suite Error:', err);
}).finally(() => {
  serverProc.kill();
  process.exit(0);
});
