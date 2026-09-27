const fs = require('fs');
const path = require('path');
const { MongoClient } = require('mongodb');

const UNIVERSE_FILE = path.join(__dirname, '..', 'data', 'fno_stocks_universe.json');
const COMPANY_META_FILE = path.join(__dirname, '..', 'data', 'company_metadata.json');

const MONGO_URI = process.env.MONGODB_URI || "mongodb+srv://koolparita_db_user:Kool1981@cluster0.pafqkvg.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0";
const MONGO_DB = "sangam_screener";

async function getYahooSession() {
  try {
    const cookieRes = await fetch('https://fc.yahoo.com', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36'
      }
    });
    const setCookie = cookieRes.headers.get('set-cookie');
    const crumbRes = await fetch('https://query1.finance.yahoo.com/v1/test/getcrumb', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        'Cookie': setCookie || ''
      }
    });
    const crumb = await crumbRes.text();
    return { crumb, cookie: setCookie };
  } catch (err) {
    console.error('Failed to get Yahoo session:', err.message);
    return null;
  }
}

function getCapCategory(mcapCr) {
  if (typeof mcapCr !== 'number' || isNaN(mcapCr) || mcapCr <= 0) return 'Micro Cap';
  if (mcapCr >= 50000) return 'Mega Cap';
  if (mcapCr >= 20000) return 'Large Cap';
  if (mcapCr >= 5000) return 'Mid Cap';
  if (mcapCr >= 1000) return 'Small Cap';
  return 'Micro Cap';
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function fetchBatchQuotes(symbols, session) {
  if (!symbols || symbols.length === 0) return [];
  const url = `https://query1.finance.yahoo.com/v7/finance/quote?symbols=${symbols.join(',')}&crumb=${encodeURIComponent(session.crumb)}`;
  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        'Cookie': session.cookie || ''
      }
    });
    if (!res.ok) {
      console.warn(`Batch fetch failed with status: ${res.status}`);
      return [];
    }
    const data = await res.json();
    return data?.quoteResponse?.result || [];
  } catch (err) {
    console.warn(`Error fetching batch: ${err.message}`);
    return [];
  }
}

async function run() {
  console.log('====================================================');
  console.log('🚀 SANGAM MARKET CAP & SECTOR ENRICHMENT BATCH SYNC');
  console.log('====================================================');

  if (!fs.existsSync(UNIVERSE_FILE)) {
    console.error(`File not found: ${UNIVERSE_FILE}`);
    return;
  }

  const rawUniverse = JSON.parse(fs.readFileSync(UNIVERSE_FILE, 'utf8'));
  console.log(`📂 Loaded ${rawUniverse.length} universe stocks from disk.`);

  let session = await getYahooSession();
  if (!session || !session.crumb) {
    console.error('❌ Could not establish authenticated session with Yahoo Finance API.');
    return;
  }
  console.log(`🔑 Acquired Yahoo Finance session crumb: ${session.crumb}`);

  // Create lookup maps
  const stockMap = new Map();
  rawUniverse.forEach(s => {
    if (s && s.symbol) {
      stockMap.set(s.symbol.toUpperCase().trim(), s);
    }
  });

  const INDICES = new Set(['NIFTY', 'BANKNIFTY', 'FINNIFTY', 'MIDCPNIFTY', 'SENSEX', 'NIFTYNXT50', 'BANKEX']);
  const symbolsToEnrich = Array.from(stockMap.keys()).filter(sym => !INDICES.has(sym));
  console.log(`📊 Processing ${symbolsToEnrich.length} equity symbols...`);

  const results = new Map(); // symbol -> { marketCapCr, sector, industry, longName, sharesOutstanding }

  // Phase 1: Query NSE (.NS)
  const BATCH_SIZE = 60;
  console.log(`\n--- Phase 1: Querying NSE (.NS) in batches of ${BATCH_SIZE} ---`);
  
  for (let i = 0; i < symbolsToEnrich.length; i += BATCH_SIZE) {
    const chunk = symbolsToEnrich.slice(i, i + BATCH_SIZE);
    const nseTickers = chunk.map(s => `${s}.NS`);
    
    const quotes = await fetchBatchQuotes(nseTickers, session);
    quotes.forEach(q => {
      const cleanSym = (q.symbol || '').replace(/\.NS$/, '').toUpperCase().trim();
      let mcapCr = null;

      if (typeof q.marketCap === 'number' && q.marketCap > 0) {
        mcapCr = Number((q.marketCap / 10000000).toFixed(2));
      } else if (typeof q.sharesOutstanding === 'number' && q.sharesOutstanding > 0 && typeof q.regularMarketPrice === 'number' && q.regularMarketPrice > 0) {
        mcapCr = Number(((q.sharesOutstanding * q.regularMarketPrice) / 10000000).toFixed(2));
      }

      if (mcapCr !== null && mcapCr > 0) {
        results.set(cleanSym, {
          marketCap: mcapCr,
          exchange: 'NSE',
          name: q.longName || q.shortName || undefined,
          fiftyTwoWeekHigh: q.fiftyTwoWeekHigh || undefined,
          fiftyTwoWeekLow: q.fiftyTwoWeekLow || undefined
        });
      }
    });

    process.stdout.write(`\r[Phase 1] Processed ${Math.min(i + BATCH_SIZE, symbolsToEnrich.length)}/${symbolsToEnrich.length} stocks | Matched: ${results.size}`);
    await sleep(180); // Rate-limiting delay
  }

  console.log(`\n✅ Phase 1 complete. Matched ${results.size} stocks on NSE.`);

  // Phase 2: Query BSE (.BO) for remaining unmatched symbols
  const missingFromNse = symbolsToEnrich.filter(s => !results.has(s));
  console.log(`\n--- Phase 2: Querying BSE (.BO) for ${missingFromNse.length} remaining symbols ---`);

  for (let i = 0; i < missingFromNse.length; i += BATCH_SIZE) {
    const chunk = missingFromNse.slice(i, i + BATCH_SIZE);
    const bseTickers = chunk.map(s => `${s}.BO`);

    const quotes = await fetchBatchQuotes(bseTickers, session);
    quotes.forEach(q => {
      const cleanSym = (q.symbol || '').replace(/\.BO$/, '').toUpperCase().trim();
      let mcapCr = null;

      if (typeof q.marketCap === 'number' && q.marketCap > 0) {
        mcapCr = Number((q.marketCap / 10000000).toFixed(2));
      } else if (typeof q.sharesOutstanding === 'number' && q.sharesOutstanding > 0 && typeof q.regularMarketPrice === 'number' && q.regularMarketPrice > 0) {
        mcapCr = Number(((q.sharesOutstanding * q.regularMarketPrice) / 10000000).toFixed(2));
      }

      if (mcapCr !== null && mcapCr > 0) {
        results.set(cleanSym, {
          marketCap: mcapCr,
          exchange: 'BSE',
          name: q.longName || q.shortName || undefined,
          fiftyTwoWeekHigh: q.fiftyTwoWeekHigh || undefined,
          fiftyTwoWeekLow: q.fiftyTwoWeekLow || undefined
        });
      }
    });

    process.stdout.write(`\r[Phase 2] Processed ${Math.min(i + BATCH_SIZE, missingFromNse.length)}/${missingFromNse.length} stocks | Total Matched: ${results.size}`);
    await sleep(180);
  }

  console.log(`\n✅ Phase 2 complete. Total matched across NSE & BSE: ${results.size}/${symbolsToEnrich.length}`);

  // Phase 3: Apply verified updates to Universe
  let updatedCount = 0;
  const categoryStats = { 'Mega Cap': 0, 'Large Cap': 0, 'Mid Cap': 0, 'Small Cap': 0, 'Micro Cap': 0 };

  const updatedUniverse = rawUniverse.map(s => {
    const sym = (s.symbol || '').toUpperCase().trim();
    if (INDICES.has(sym)) {
      categoryStats['Mega Cap']++;
      return { ...s, capCategory: 'Mega Cap' };
    }

    const liveData = results.get(sym);
    let mcap = s.marketCap;

    if (liveData && typeof liveData.marketCap === 'number' && liveData.marketCap > 0) {
      mcap = liveData.marketCap;
      updatedCount++;
    } else if (mcap === 5000 && s.autoAdded) {
      // If stock had artificial 5000 placeholder and wasn't found on major index, adjust to realistic Micro Cap
      const estimatedPrice = s.price || s.ltp || 20;
      mcap = Number((estimatedPrice * 5).toFixed(2)); // Realistic micro-cap estimate
    }

    const cat = getCapCategory(mcap);
    categoryStats[cat] = (categoryStats[cat] || 0) + 1;

    return {
      ...s,
      marketCap: mcap,
      capCategory: cat,
      name: (liveData && liveData.name && (!s.name || s.name === sym)) ? liveData.name : s.name
    };
  });

  // Sort updated universe by market cap descending
  updatedUniverse.sort((a, b) => (b.marketCap || 0) - (a.marketCap || 0));

  // Write to local disk
  fs.writeFileSync(UNIVERSE_FILE, JSON.stringify(updatedUniverse, null, 2), 'utf8');
  console.log(`\n💾 Saved updated universe (${updatedUniverse.length} stocks) to ${UNIVERSE_FILE}`);

  // Phase 4: Sync to MongoDB Atlas
  try {
    const client = new MongoClient(MONGO_URI);
    await client.connect();
    const db = client.db(MONGO_DB);
    const col = db.collection('universe_stocks');

    console.log(`📡 Connected to MongoDB Atlas. Syncing ${updatedUniverse.length} stocks...`);
    const bulkOps = updatedUniverse.map(s => {
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
      await col.bulkWrite(chunk, { ordered: false });
    }
    console.log(`✅ MongoDB Atlas 'universe_stocks' collection synchronized!`);
    await client.close();
  } catch (mongoErr) {
    console.warn(`[MongoDB] Notice syncing to MongoDB: ${mongoErr.message}`);
  }

  // Summary Report
  console.log('\n====================================================');
  console.log('📊 MARKET CAP ENRICHMENT SUMMARY REPORT');
  console.log('====================================================');
  console.log(`Total Universe Securities : ${updatedUniverse.length}`);
  console.log(`Directly Verified Market Caps: ${updatedCount} stocks`);
  console.log('\nCap Category Distribution:');
  console.log(`  🌟 Mega Cap (>= ₹50,000 Cr)  : ${categoryStats['Mega Cap']}`);
  console.log(`  🔷 Large Cap (₹20k - ₹50k Cr): ${categoryStats['Large Cap']}`);
  console.log(`  🟢 Mid Cap (₹5k - ₹20k Cr)   : ${categoryStats['Mid Cap']}`);
  console.log(`  🟡 Small Cap (₹1k - ₹5k Cr)  : ${categoryStats['Small Cap']}`);
  console.log(`  ⚪ Micro Cap (< ₹1,000 Cr)   : ${categoryStats['Micro Cap']}`);

  console.log('\n--- Spotlight Verification ---');
  const spotlight = ['RELIANCE', 'TCS', 'HDFCBANK', 'LKPSEC', 'SALSTEEL', 'SUZLON', 'ZOMATO', 'IDEA'];
  spotlight.forEach(sym => {
    const stk = updatedUniverse.find(s => s.symbol === sym);
    if (stk) {
      console.log(`  • ${stk.symbol.padEnd(10)} | Market Cap: ₹${Number(stk.marketCap).toLocaleString('en-IN')} Cr | Tier: ${stk.capCategory} | Name: ${stk.name}`);
    }
  });
  console.log('====================================================\n');
}

run().catch(console.error);
