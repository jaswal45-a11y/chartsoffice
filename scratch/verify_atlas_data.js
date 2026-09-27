const dns = require('dns');
dns.setServers(['8.8.8.8', '1.1.1.1']);
const { MongoClient } = require('mongodb');

const uri = 'mongodb+srv://jaswal45_db_user:p2ThufrI7coK0vVD@cluster0.v9lxx1h.mongodb.net/?appName=Cluster0';

async function verify() {
  const client = new MongoClient(uri);
  try {
    await client.connect();
    const db = client.db('sangam_stocks');
    const col = db.collection('universe_stocks');
    const count = await col.countDocuments();
    console.log(`Total Universe Documents in Atlas: ${count}`);

    const targets = ['ZENTEC', 'SSWL', 'LKPSEC', 'HAL', 'BEL', 'COCHINSHIP', 'MAZDOCK', 'PARAS', 'SALSTEEL'];
    const docs = await col.find({ symbol: { $in: targets } }).toArray();
    console.log('Sample Stocks in MongoDB Atlas:');
    docs.forEach(d => {
      console.log(`- ${d.symbol.padEnd(12)} | Cap: ₹${d.marketCap} Cr (${d.capCategory}) | Sector: ${d.sector} | Industry: ${d.industry}`);
    });
  } finally {
    await client.close();
  }
}

verify().catch(console.error);
