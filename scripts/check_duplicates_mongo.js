const fs = require('node:fs');
const path = require('node:path');
const dns = require('node:dns');

try {
  dns.setServers(['8.8.8.8', '8.8.4.4', '1.1.1.1']);
} catch (e) {}

const envPath = path.join(__dirname, '..', '.env');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  envContent.split(/\r?\n/).forEach(line => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) return;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx !== -1) {
      const key = trimmed.slice(0, eqIdx).trim();
      let val = trimmed.slice(eqIdx + 1).trim();
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1);
      }
      if (!process.env[key]) {
        process.env[key] = val;
      }
    }
  });
}

const { MongoClient } = require('mongodb');

const DUP_MAP = {
  'RAMKRISHNA': 'RKFORGE',
  'TIPSINDLTD': 'TIPSMUSIC',
  'RESTAURANT': 'RBA',
  'SAMVARDHANA': 'MOTHERSON',
  'TMPV': 'TATAMOTORS',
  'LTM': 'LTIM',
  'MCDOWELL-N': 'UNITDSPR',
  'AMARAJABAT': 'ARE&M',
  'BAJAJAUTO': 'BAJAJ-AUTO',
  'NESTLE': 'NESTLEIND',
  'CITYUNIONB': 'CUB',
  'NARAYANA': 'NH',
  'TV18BRDCST': 'NETWORK18',
  'HPCL': 'HINDPETRO'
};

const dupList = Object.keys(DUP_MAP);

async function run() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.log('No MONGODB_URI in environment');
    return;
  }
  const client = new MongoClient(uri, {
    tlsAllowInvalidCertificates: true
  });
  await client.connect();
  console.log('Connected to MongoDB');
  const db = client.db('sangam_stocks');

  const cols = (await db.listCollections().toArray()).map(c => c.name);
  console.log('Collections:', cols);

  if (cols.includes('universe_stocks')) {
    const univDups = await db.collection('universe_stocks').find({ symbol: { $in: dupList } }).toArray();
    console.log(`universe_stocks collection duplicates count: ${univDups.length}`);
    univDups.forEach(d => console.log('  -', d.symbol, ':', d.name));
  }

  if (cols.includes('users')) {
    const users = await db.collection('users').find({}).toArray();
    users.forEach(u => {
      (u.watchlists || []).forEach(wl => {
        const found = (wl.stocks || []).filter(s => {
          const sym = typeof s === 'string' ? s : s.symbol;
          return dupList.includes(sym);
        });
        if (found.length) {
          console.log(`User ${u.username} WL "${wl.name}" has dups:`, JSON.stringify(found));
        }
      });
    });
  }

  if (cols.includes('daily_ohlcv')) {
    const count = await db.collection('daily_ohlcv').countDocuments({ symbol: { $in: dupList } });
    console.log(`daily_ohlcv docs with duplicate symbols: ${count}`);
  }

  await client.close();
}

run().catch(console.error);
