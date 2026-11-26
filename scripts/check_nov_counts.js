const fs = require('fs');
const path = require('path');
const dns = require('dns');
dns.setServers(['8.8.8.8', '8.8.4.4', '1.1.1.1']);
const { MongoClient } = require('mongodb');
let uri = '';
fs.readFileSync(path.join(__dirname, '..', '.env'), 'utf8').split('\n').forEach(l => {
  if (l.startsWith('MONGODB_URI=')) uri = l.slice(12).trim().replace(/^['"]|['"]$/g, '');
});
(async () => {
  const c = new MongoClient(uri, { tlsAllowInvalidCertificates: true });
  await c.connect();
  const col = c.db('sangam_stocks').collection('daily_ohlcv');
  const dates = ['2026-11-06', '2026-11-09', '2026-11-10', '2026-11-11', '2026-11-12', '2026-11-13', '2026-11-23', '2026-11-25', '2026-11-26'];
  for (const dt of dates) {
    const cnt = await col.countDocuments({ date: dt });
    console.log(dt, '->', cnt, 'docs');
  }
  await c.close();
})();
