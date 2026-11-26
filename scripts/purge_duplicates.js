const fs = require('node:fs');
const path = require('node:path');
const dns = require('node:dns');

try {
  dns.setServers(['8.8.8.8', '8.8.4.4', '1.1.1.1']);
} catch (e) {}

const appDir = path.join(__dirname, '..');
const envPath = path.join(appDir, '.env');
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

// Duplicate to Canonical mapping
const DUP_MAP = {
  'RAMKRISHNA': 'RKFORGE',       // Ramkrishna Forgings Ltd
  'TIPSINDLTD': 'TIPSMUSIC',     // Tips Music Ltd
  'RESTAURANT': 'RBA',           // Restaurant Brands Asia Ltd
  'SAMVARDHANA': 'MOTHERSON',    // Samvardhana Motherson International Ltd
  'TMPV': 'TATAMOTORS',          // Tata Motors Ltd
  'LTM': 'LTIM',                 // LTIMindtree Ltd
  'MCDOWELL-N': 'UNITDSPR',      // United Spirits Ltd
  'AMARAJABAT': 'ARE&M',         // Amara Raja Energy & Mobility Ltd
  'BAJAJAUTO': 'BAJAJ-AUTO',     // Bajaj Auto Ltd
  'NESTLE': 'NESTLEIND',         // Nestle India Ltd
  'CITYUNIONB': 'CUB',           // City Union Bank
  'NARAYANA': 'NH',              // Narayana Hrudayalaya Ltd
  'TV18BRDCST': 'NETWORK18',     // Network18 Media & Investments Ltd
  'HPCL': 'HINDPETRO'            // Hindustan Petroleum Corporation Ltd
};

const dupSymbols = Object.keys(DUP_MAP);
const dupSet = new Set(dupSymbols);

async function cleanLocalFiles() {
  console.log('--- Cleaning Local Files ---');
  
  // 1. master_universe.json
  const masterPath = path.join(appDir, 'data', 'master_universe.json');
  if (fs.existsSync(masterPath)) {
    const univ = JSON.parse(fs.readFileSync(masterPath, 'utf8'));
    const beforeCount = univ.length;
    const filtered = univ.filter(s => !dupSet.has((s.symbol || '').toUpperCase()));
    // Also fix INDOCO name
    const indoco = filtered.find(s => (s.symbol || '').toUpperCase() === 'INDOCO');
    if (indoco) {
      indoco.name = 'Indoco Remedies Limited';
      console.log('Fixed INDOCO name in master_universe.json');
    }
    fs.writeFileSync(masterPath, JSON.stringify(filtered, null, 2), 'utf8');
    console.log(`master_universe.json: ${beforeCount} -> ${filtered.length} (removed ${beforeCount - filtered.length})`);
  }

  // 2. fno_stocks_universe.json
  const fnoPath = path.join(appDir, 'data', 'fno_stocks_universe.json');
  if (fs.existsSync(fnoPath)) {
    const fno = JSON.parse(fs.readFileSync(fnoPath, 'utf8'));
    const beforeCount = fno.length;
    const filtered = fno.filter(s => !dupSet.has((s.symbol || '').toUpperCase()));
    const indoco = filtered.find(s => (s.symbol || '').toUpperCase() === 'INDOCO');
    if (indoco) {
      indoco.name = 'Indoco Remedies Limited';
      console.log('Fixed INDOCO name in fno_stocks_universe.json');
    }
    fs.writeFileSync(fnoPath, JSON.stringify(filtered, null, 2), 'utf8');
    console.log(`fno_stocks_universe.json: ${beforeCount} -> ${filtered.length} (removed ${beforeCount - filtered.length})`);
  }

  // 3. users.json watchlists
  const usersPath = path.join(appDir, 'data', 'users.json');
  if (fs.existsSync(usersPath)) {
    const users = JSON.parse(fs.readFileSync(usersPath, 'utf8'));
    let changedUsers = 0;
    users.forEach(u => {
      if (!u.watchlists) return;
      u.watchlists.forEach(wl => {
        if (!Array.isArray(wl.stocks)) return;
        const newStocks = [];
        const seenSymbols = new Set();
        wl.stocks.forEach(stk => {
          const rawSym = (typeof stk === 'string' ? stk : stk.symbol || '').toUpperCase();
          const canonicalSym = DUP_MAP[rawSym] || rawSym;
          if (seenSymbols.has(canonicalSym)) {
            console.log(`User ${u.username} WL "${wl.name}": Dropped duplicate entry for ${rawSym} -> ${canonicalSym}`);
            return;
          }
          seenSymbols.add(canonicalSym);
          if (typeof stk === 'string') {
            newStocks.push(canonicalSym);
          } else {
            newStocks.push({
              ...stk,
              symbol: canonicalSym,
              name: stk.name ? (rawSym !== canonicalSym ? canonicalSym : stk.name) : canonicalSym
            });
          }
        });
        if (newStocks.length !== wl.stocks.length) {
          changedUsers++;
        }
        wl.stocks = newStocks;

        // Clean stockHistory if present
        if (wl.stockHistory && typeof wl.stockHistory === 'object') {
          for (const [k, v] of Object.entries(wl.stockHistory)) {
            const canonicalKey = DUP_MAP[k] || k;
            if (canonicalKey !== k) {
              if (!wl.stockHistory[canonicalKey]) {
                wl.stockHistory[canonicalKey] = v;
              }
              delete wl.stockHistory[k];
            }
          }
        }
      });
    });
    fs.writeFileSync(usersPath, JSON.stringify(users, null, 2), 'utf8');
    console.log(`users.json: watchlists sanitized, updated ${changedUsers} watchlists.`);
  }
}

async function cleanMongo() {
  console.log('--- Cleaning MongoDB Atlas ---');
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.log('No MONGODB_URI found. Skipping MongoDB cleanup.');
    return;
  }

  const client = new MongoClient(uri, { tlsAllowInvalidCertificates: true });
  await client.connect();
  console.log('Connected to MongoDB Atlas');
  const db = client.db('sangam_stocks');

  // 1. universe_stocks
  const colUniv = db.collection('universe_stocks');
  const delUniv = await colUniv.deleteMany({ symbol: { $in: dupSymbols } });
  console.log(`Deleted ${delUniv.deletedCount} duplicate docs from universe_stocks.`);
  
  // Fix INDOCO in universe_stocks
  const updIndoco = await colUniv.updateOne(
    { symbol: 'INDOCO' },
    { $set: { name: 'Indoco Remedies Limited' } }
  );
  if (updIndoco.matchedCount > 0) {
    console.log('Fixed INDOCO name in MongoDB universe_stocks');
  }

  // 2. users collection
  const colUsers = db.collection('users');
  const mongoUsers = await colUsers.find({}).toArray();
  for (const u of mongoUsers) {
    if (!u.watchlists) continue;
    let modified = false;
    u.watchlists.forEach(wl => {
      if (!Array.isArray(wl.stocks)) return;
      const newStocks = [];
      const seenSymbols = new Set();
      wl.stocks.forEach(stk => {
        const rawSym = (typeof stk === 'string' ? stk : stk.symbol || '').toUpperCase();
        const canonicalSym = DUP_MAP[rawSym] || rawSym;
        if (seenSymbols.has(canonicalSym)) {
          console.log(`Mongo User ${u.username} WL "${wl.name}": Dropped duplicate ${rawSym} -> ${canonicalSym}`);
          modified = true;
          return;
        }
        seenSymbols.add(canonicalSym);
        if (typeof stk === 'string') {
          newStocks.push(canonicalSym);
        } else {
          newStocks.push({
            ...stk,
            symbol: canonicalSym,
            name: stk.name ? (rawSym !== canonicalSym ? canonicalSym : stk.name) : canonicalSym
          });
        }
      });
      wl.stocks = newStocks;

      if (wl.stockHistory && typeof wl.stockHistory === 'object') {
        for (const [k, v] of Object.entries(wl.stockHistory)) {
          const canonicalKey = DUP_MAP[k] || k;
          if (canonicalKey !== k) {
            if (!wl.stockHistory[canonicalKey]) {
              wl.stockHistory[canonicalKey] = v;
            }
            delete wl.stockHistory[k];
            modified = true;
          }
        }
      }
    });

    if (modified) {
      await colUsers.updateOne(
        { _id: u._id },
        { $set: { watchlists: u.watchlists } }
      );
      console.log(`Updated Mongo user ${u.username} watchlists.`);
    }
  }

  // 3. daily_ohlcv
  const colOhlcv = db.collection('daily_ohlcv');
  const delOhlcv = await colOhlcv.deleteMany({ symbol: { $in: dupSymbols } });
  console.log(`Deleted ${delOhlcv.deletedCount} duplicate candle docs from daily_ohlcv.`);

  await client.close();
  console.log('MongoDB Atlas cleanup completed successfully.');
}

async function main() {
  await cleanLocalFiles();
  await cleanMongo();
  console.log('All duplicate cleanup completed!');
}

main().catch(err => {
  console.error('Purge error:', err);
  process.exit(1);
});
