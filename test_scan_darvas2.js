const http = require('http');

const body = JSON.stringify({
  targetEma: 'cross_today',
  interval: '1d',
  scope: 'watchlist',
  stockList: ['PATANJALI', 'MAHABANK']
});

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
    console.log('Status:', res.statusCode);
    const j = JSON.parse(d);
    console.log('Results count:', j.results?.length);
    console.log('Results:', j.results);
  });
});

req.on('error', e => console.error(e));
req.write(body);
req.end();
