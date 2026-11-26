const fs = require('fs');
const path = require('path');
const dns = require('dns');
dns.setServers(['8.8.8.8', '8.8.4.4', '1.1.1.1']);

const { MongoClient } = require('mongodb');
const env = fs.readFileSync(path.join(__dirname, '..', '.env'), 'utf8');
let uri = '';
env.split('\n').forEach(l => {
  if (l.startsWith('MONGODB_URI=')) uri = l.slice(12).trim().replace(/^['"]|['"]$/g, '');
});

async function check() {
  const client = new MongoClient(uri, { tlsAllowInvalidCertificates: true });
  await client.connect();
  const db = client.db('sangam_stocks');
  const col = db.collection('daily_ohlcv');

  const sample = await col.findOne({ symbol: 'DIVISLAB' });
  console.log('Sample DIVISLAB doc keys:', sample ? Object.keys(sample) : 'null');
  if (sample) {
    console.log('Sample:', sample);
  }
  const docs = await col.find({ symbol: 'DIVISLAB' }).sort({ date: -1, time: -1 }).limit(20).toArray();
  console.log('Recent 20 DIVISLAB docs in Mongo:');
  docs.reverse().forEach(d => console.log(d.date || d.time, 'O:', d.open, 'H:', d.high, 'L:', d.low, 'C:', d.close, 'V:', d.volume));

  await client.close();
}
check().catch(console.error);
