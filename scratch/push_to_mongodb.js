const dns = require('dns');
try { dns.setServers(['8.8.8.8', '1.1.1.1']); } catch(e) {}
const { MongoClient } = require('mongodb');
const fs = require('fs');
const path = require('path');

const UNIVERSE_FILE = path.join(__dirname, '..', 'data', 'fno_stocks_universe.json');
const COMPANY_META_FILE = path.join(__dirname, '..', 'data', 'company_metadata.json');

const uri = process.env.MONGODB_URI || 'mongodb+srv://jaswal45_db_user:p2ThufrI7coK0vVD@cluster0.v9lxx1h.mongodb.net/?appName=Cluster0';

async function syncToAtlas() {
  console.log('🔌 Connecting to MongoDB Atlas (sangam_stocks)...');
  const client = new MongoClient(uri, { serverSelectionTimeoutMS: 15000 });
  await client.connect();
  console.log('✅ Connected successfully to MongoDB Atlas!');

  const db = client.db('sangam_stocks');

  // 1. Load local verified universe
  const localUniverse = JSON.parse(fs.readFileSync(UNIVERSE_FILE, 'utf8'));
  console.log(`📂 Loaded ${localUniverse.length} local verified universe stocks.`);

  const universeCol = db.collection('universe_stocks');

  console.log('💾 Overwriting universe_stocks in MongoDB Atlas with verified live data...');
  const bulkOps = localUniverse.map(s => {
    const { _id, ...clean } = s;
    return {
      updateOne: {
        filter: { symbol: clean.symbol },
        update: { $set: clean },
        upsert: true
      }
    };
  });

  for (let i = 0; i < bulkOps.length; i += 500) {
    const chunk = bulkOps.slice(i, i + 500);
    await universeCol.bulkWrite(chunk, { ordered: false });
    console.log(`  • Synced stocks ${i + 1} to ${Math.min(i + chunk.length, bulkOps.length)}`);
  }

  // Remove stale / ghost stocks not in universe
  const validSymbols = localUniverse.map(s => s.symbol);
  const deleteRes = await universeCol.deleteMany({ symbol: { $nin: validSymbols } });
  console.log(`🗑️ Removed ${deleteRes.deletedCount} outdated/ghost records from MongoDB.`);

  // 2. Load and sync company metadata
  if (fs.existsSync(COMPANY_META_FILE)) {
    const localMeta = JSON.parse(fs.readFileSync(COMPANY_META_FILE, 'utf8'));
    console.log(`📂 Loaded ${localMeta.length} company metadata profiles.`);

    const metaCol = db.collection('company_metadata');
    const metaOps = localMeta.map(m => {
      const { _id, ...clean } = m;
      return {
        updateOne: {
          filter: { ticker: clean.ticker },
          update: { $set: clean },
          upsert: true
        }
      };
    });

    for (let i = 0; i < metaOps.length; i += 500) {
      const chunk = metaOps.slice(i, i + 500);
      await metaCol.bulkWrite(chunk, { ordered: false });
    }
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

  await client.close();
  console.log('🚀 Complete database sync to MongoDB Atlas finished!\n');
}

syncToAtlas().catch(console.error);
