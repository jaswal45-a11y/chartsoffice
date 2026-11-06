require('node:dns').setServers(['8.8.8.8', '8.8.4.4', '1.1.1.1']);
const { MongoClient } = require('mongodb');
const http = require('http');
const fs = require('fs');
const path = require('path');

const envFile = path.join(__dirname, '.env');
let uri = '';
if (fs.existsSync(envFile)) {
  const lines = fs.readFileSync(envFile, 'utf8').split('\n');
  for (const l of lines) {
    if (l.trim().startsWith('MONGODB_URI=')) {
      uri = l.trim().slice('MONGODB_URI='.length).replace(/^["']|["']$/g, '');
    }
  }
}

async function run() {
  const client = new MongoClient(uri);
  await client.connect();
  const db = client.db('sangam_stocks');
  const docs = await db.collection('daily_ohlcv').find({ symbol: 'ASHOKLEY' }).sort({ date: -1 }).limit(5).toArray();
  console.log('MongoDB ASHOKLEY top 5:');
  docs.forEach(d => console.log(d.date, { open: d.open, high: d.high, low: d.low, close: d.close, volume: d.volume, isFinalized: d.isFinalized }));
  await client.close();

  // Also query API
  http.get('http://localhost:3000/api/stocks/ASHOKLEY/history?interval=1d&range=1y', res => {
    let d = '';
    res.on('data', c => d += c);
    res.on('end', () => {
      const json = JSON.parse(d);
      const c = json.candles || [];
      console.log('\nAPI Candles top 3:');
      c.slice(-3).forEach(x => console.log(x.time, { open: x.open, high: x.high, low: x.low, close: x.close, volume: x.volume }));
    });
  });
}

run().catch(console.error);
