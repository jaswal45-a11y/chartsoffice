require('node:dns').setServers(['8.8.8.8', '8.8.4.4', '1.1.1.1']);
const { MongoClient } = require('mongodb');
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

  const oldest = await db.collection('daily_ohlcv').find({}).sort({ date: 1 }).limit(1).toArray();
  const newest = await db.collection('daily_ohlcv').find({}).sort({ date: -1 }).limit(1).toArray();
  const totalCount = await db.collection('daily_ohlcv').countDocuments();
  
  // Cutoff date for 2 years:
  // Today is 2026-11-05. Exactly 2 years ago is 2024-11-05!
  const cutoffDate = '2024-11-05';
  const olderCount = await db.collection('daily_ohlcv').countDocuments({ date: { $lt: cutoffDate } });
  const newerCount = await db.collection('daily_ohlcv').countDocuments({ date: { $gte: cutoffDate } });

  console.log({
    totalCount,
    oldestDate: oldest[0]?.date,
    newestDate: newest[0]?.date,
    cutoffDate,
    olderThan2Years: olderCount,
    within2Years: newerCount
  });

  await client.close();
}

run().catch(console.error);
