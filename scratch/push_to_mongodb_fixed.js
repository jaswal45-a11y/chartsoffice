const dns = require('dns');
dns.setServers(['8.8.8.8', '8.8.4.4', '1.1.1.1']);
dns.setDefaultResultOrder('ipv4first');

const { MongoClient } = require('mongodb');
const fs = require('fs');
const path = require('path');

const UNIVERSE_FILE = path.join(__dirname, '..', 'data', 'fno_stocks_universe.json');
const COMPANY_META_FILE = path.join(__dirname, '..', 'data', 'company_metadata.json');

const uri = 'mongodb+srv://jaswal45_db_user:p2ThufrI7coK0vVD@cluster0.v9lxx1h.mongodb.net/?appName=Cluster0';

async function syncToAtlas() {
  console.log('🔌 Connecting to MongoDB Atlas (sangam_stocks)...');
  const client = new MongoClient(uri, {
    serverSelectionTimeoutMS: 20000,
    connectTimeoutMS: 20000
  });

  await client.connect();
  console.log('✅ Connected successfully to MongoDB Atlas!');

  const db = client.db('sangam_stocks');
  const universeCol = db.collection('universe_stocks');

  // 1. Load local verified universe
  const localUniverse = JSON.parse(fs.readFileSync(UNIVERSE_FILE, 'utf8'));
  console.log(`📂 Loaded ${localUniverse.length} local verified universe stocks.`);

  // Drop existing collection and insert fresh verified stocks to guarantee 100% clean sync
  console.log('🗑️ Dropping existing universe_stocks collection in MongoDB...');
  try {
    await universeCol.drop();
  } catch (e) {
    console.log('Drop notice:', e.message);
  }

  console.log(`💾 Inserting ${localUniverse.length} verified stocks into MongoDB Atlas...`);
  const cleanUniverse = localUniverse.map(s => {
    const { _id, ...clean } = s;
    return { ...clean };
  });

  for (let i = 0; i < cleanUniverse.length; i += 500) {
    const chunk = cleanUniverse.slice(i, i + 500);
    await universeCol.insertMany(chunk);
    console.log(`  • Inserted stocks ${i + 1} to ${Math.min(i + chunk.length, cleanUniverse.length)}`);
  }

  // Create index on symbol
  await universeCol.createIndex({ symbol: 1 }, { unique: true });
  console.log('✅ Created unique index on symbol in universe_stocks');

  // 2. Load and sync company metadata
  if (fs.existsSync(COMPANY_META_FILE)) {
    const localMeta = JSON.parse(fs.readFileSync(COMPANY_META_FILE, 'utf8'));
    console.log(`📂 Loaded ${localMeta.length} company metadata profiles.`);

    const metaCol = db.collection('company_metadata');
    try {
      await metaCol.drop();
    } catch (e) {}

    const cleanMeta = localMeta.map(m => {
      const { _id, ...clean } = m;
      return { ...clean };
    });

    for (let i = 0; i < cleanMeta.length; i += 500) {
      const chunk = cleanMeta.slice(i, i + 500);
      await metaCol.insertMany(chunk);
    }
    await metaCol.createIndex({ ticker: 1 }, { unique: true });
    console.log('✅ Synchronized company_metadata collection in MongoDB Atlas!');
  }

  // Verification queries
  const sswl = await universeCol.findOne({ symbol: 'SSWL' });
  console.log('\n--- Live Atlas Verification ---');
  console.log('SSWL in MongoDB Atlas:', {
    symbol: sswl?.symbol,
    name: sswl?.name,
    marketCap: sswl?.marketCap,
    capCategory: sswl?.capCategory,
    sector: sswl?.sector,
    industry: sswl?.industry
  });

  const zentec = await universeCol.findOne({ symbol: 'ZENTEC' });
  console.log('ZENTEC in MongoDB Atlas:', {
    symbol: zentec?.symbol,
    name: zentec?.name,
    marketCap: zentec?.marketCap,
    capCategory: zentec?.capCategory,
    sector: zentec?.sector,
    industry: zentec?.industry
  });

  const lkpsec = await universeCol.findOne({ symbol: 'LKPSEC' });
  console.log('LKPSEC in MongoDB Atlas:', {
    symbol: lkpsec?.symbol,
    name: lkpsec?.name,
    marketCap: lkpsec?.marketCap,
    capCategory: lkpsec?.capCategory,
    sector: lkpsec?.sector,
    industry: lkpsec?.industry
  });

  const count = await universeCol.countDocuments();
  console.log(`\n📊 Verified Total Documents in MongoDB Atlas: ${count}`);

  await client.close();
  console.log('🚀 Complete database sync to MongoDB Atlas finished!\n');
}

syncToAtlas().catch(console.error);
