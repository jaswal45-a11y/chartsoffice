const dns = require('node:dns');
dns.setServers(['8.8.8.8', '1.1.1.1']);
const fs = require('node:fs');
const path = require('node:path');
const { MongoClient } = require('mongodb');

const envPath = path.join(__dirname, '..', '.env');
const envContent = fs.readFileSync(envPath, 'utf8');
let uri = '';
envContent.split(/\r?\n/).forEach(line => {
  if (line.startsWith('MONGODB_URI=')) {
    uri = line.slice('MONGODB_URI='.length).trim().replace(/^['"]|['"]$/g, '');
  }
});

const etfs = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'data', 'all_detected_etfs.json'), 'utf8'));
const etfSyms = etfs.map(e => e.symbol.toUpperCase());

(async () => {
  const client = new MongoClient(uri);
  await client.connect();
  const db = client.db('sangam_stocks');

  const universeCount = await db.collection('universe_stocks').countDocuments({ symbol: { $in: etfSyms } });
  const ohlcvCount = await db.collection('daily_ohlcv').countDocuments({ symbol: { $in: etfSyms } });
  const ohlcvDistinct = await db.collection('daily_ohlcv').distinct('symbol', { symbol: { $in: etfSyms } });
  const metaCount = await db.collection('company_metadata').countDocuments({ ticker: { $in: etfSyms } });

  console.log(JSON.stringify({
    totalDetectedEtfs: etfs.length,
    universeMatchesInMongo: universeCount,
    dailyOhlcvDocsInMongo: ohlcvCount,
    distinctEtfSymbolsInOhlcv: ohlcvDistinct.length,
    companyMetadataMatchesInMongo: metaCount
  }, null, 2));

  await client.close();
})();
