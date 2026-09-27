const { MongoClient } = require('mongodb');
const uri = process.env.MONGODB_URI || 'mongodb+srv://jaswal45_db_user:p2ThufrI7coK0vVD@cluster0.v9lxx1h.mongodb.net/?appName=Cluster0';

async function test() {
  const client = new MongoClient(uri);
  await client.connect();
  const db = client.db('sangam_stocks');
  const docs = await db.collection('universe_stocks').find({ symbol: /SSWL/i }).toArray();
  console.log('All SSWL docs in MongoDB:', docs);

  const zentecDocs = await db.collection('universe_stocks').find({ symbol: /ZENTEC/i }).toArray();
  console.log('All ZENTEC docs in MongoDB:', zentecDocs);

  await client.close();
}
test().catch(console.error);
