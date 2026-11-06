const fs = require('fs');

async function check() {
  const code = fs.readFileSync('stock_screener_app/server.js', 'utf8');
  // Let's test the running server for various scopes
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

  console.log('Testing scope=fno, targetEma=cross_today:');
  const resFno = await scan('fno', 'cross_today');
  console.log('fno count:', resFno.results?.length, resFno.results?.map(r => r.symbol));

  console.log('\nTesting scope=all, targetEma=cross_today:');
  const resAll = await scan('all', 'cross_today');
  console.log('all count:', resAll.results?.length, resAll.results?.map(r => r.symbol));

  console.log('\nTesting scope=midsmall400, targetEma=cross_today:');
  const resMs = await scan('midsmall400', 'cross_today');
  console.log('midsmall400 count:', resMs.results?.length, resMs.results?.map(r => r.symbol));
}

check();
