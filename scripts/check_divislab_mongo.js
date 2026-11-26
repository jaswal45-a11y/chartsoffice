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
  const doc = await db.collection('daily_ohlcv').findOne({ symbol: 'DIVISLAB' });
  if (doc && doc.candles) {
    console.log('Mongo DIVISLAB candles count:', doc.candles.length);
    console.log('Mongo DIVISLAB last 5 candles:');
    doc.candles.slice(-5).forEach(c => console.log(c.time, 'O:', c.open, 'H:', c.high, 'L:', c.low, 'C:', c.close));
  } else {
    console.log('No doc or candles for DIVISLAB in MongoDB');
  }
  await client.close();
}
check().catch(console.error);
