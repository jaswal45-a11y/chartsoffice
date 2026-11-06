const http = require('http');

function scan(scope, targetEma) {
  return new Promise((resolve) => {
    const body = JSON.stringify({ targetEma, scope, interval: '1d' });
    const req = http.request('http://127.0.0.1:3000/api/scan/darvas-ema', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body),
        'Authorization': 'Bearer token_superadmin_ruffneck_session_key'
      }
    }, (res) => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => {
        try {
          resolve(JSON.parse(d));
        } catch (e) {
          resolve({ error: e.message });
        }
      });
    });
    req.on('error', e => resolve({ error: e.message }));
    req.write(body);
    req.end();
  });
}

async function run() {
  const r = await scan('all', 'cross_5d');
  console.log('cross_5d results count:', r.results?.length);
  const found = r.results?.filter(x => x.symbol === 'PATANJALI' || x.symbol === 'MAHABANK');
  console.log('Found in cross_5d:', found?.map(x => ({ symbol: x.symbol, crossedDaysAgo: x.crossedDaysAgo, crossDate: x.crossDate })));
}

run();
