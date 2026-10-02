/**
 * Test script for Visual Trading Journal (Chart Screenshot / Journal) Endpoints
 */
const http = require('node:http');

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
      port: 3000,
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

async function runTests() {
  console.log('🧪 Starting Visual Trading Journal API Test Suite...\n');

  // Test 1: Unauthenticated GET /api/charts
  const unauthGet = await makeRequest({ path: '/api/charts' });
  console.log(`[Test 1] Unauthenticated GET /api/charts: HTTP ${unauthGet.status} (Expected 401)`);
  if (unauthGet.status !== 401) throw new Error('Failed: Expected 401 for unauthenticated GET');

  // Test 2: Unauthenticated POST /api/charts
  const unauthPost = await makeRequest({
    path: '/api/charts',
    method: 'POST',
    body: { symbol: 'TATAMOTORS' }
  });
  console.log(`[Test 2] Unauthenticated POST /api/charts: HTTP ${unauthPost.status} (Expected 401)`);
  if (unauthPost.status !== 401) throw new Error('Failed: Expected 401 for unauthenticated POST');

  // Test 3: Authenticate as admin
  const loginRes = await makeRequest({
    path: '/api/auth/login',
    method: 'POST',
    body: { username: 'admin', password: 'ruffneck' }
  });
  console.log(`[Test 3] Admin Login: HTTP ${loginRes.status}, Token: ${loginRes.json?.token ? 'OK' : 'MISSING'}`);
  if (!loginRes.json?.token) throw new Error('Login failed');
  const token = loginRes.json.token;

  // Test 4: Authenticated GET /api/charts
  const authGet = await makeRequest({
    path: '/api/charts',
    headers: { 'Authorization': `Bearer ${token}` }
  });
  console.log(`[Test 4] Authenticated GET /api/charts: HTTP ${authGet.status}, Charts count: ${authGet.json?.charts?.length ?? 0}`);
  if (authGet.status !== 200) throw new Error('Failed: Expected 200 for authenticated GET');

  // Test 5: Validation Check on POST /api/charts (Missing screenshot)
  const invalidPost = await makeRequest({
    path: '/api/charts',
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token}` },
    body: { symbol: 'TATAMOTORS' }
  });
  console.log(`[Test 5] POST /api/charts without screenshot: HTTP ${invalidPost.status}, Error: ${invalidPost.json?.error}`);
  if (invalidPost.status !== 400) throw new Error('Failed: Expected 400 for missing screenshot');

  console.log('\n✅ All core API authentication, route isolation & validation tests PASSED successfully!');
}

runTests().catch(err => {
  console.error('❌ Test failed:', err.message);
  process.exit(1);
});
