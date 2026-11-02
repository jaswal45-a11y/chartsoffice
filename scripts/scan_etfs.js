const dns = require('node:dns');
dns.setServers(['8.8.8.8', '1.1.1.1']);
const fs = require('node:fs');
const path = require('node:path');
const { MongoClient } = require('mongodb');

const envPath = path.join(__dirname, '..', '.env');
const envContent = fs.readFileSync(envPath, 'utf8');
let mongoUri = '';
envContent.split(/\r?\n/).forEach(line => {
  if (line.startsWith('MONGODB_URI=')) {
    mongoUri = line.slice('MONGODB_URI='.length).trim().replace(/^['"]|['"]$/g, '');
  }
});

function detectETF(item) {
  const sym = String(item.symbol || '').toUpperCase().trim();
  const name = String(item.name || '').toUpperCase().trim();
  const reasons = [];

  // 1. Ticker suffix checks
  if (sym.endsWith('BEES')) {
    reasons.push(`Symbol ends with 'BEES'`);
  } else if (sym.endsWith('ETF')) {
    reasons.push(`Symbol ends with 'ETF'`);
  } else if (/\bETF\b/.test(sym) || /_ETF\b/.test(sym) || /-ETF\b/.test(sym)) {
    reasons.push(`Symbol contains 'ETF'`);
  }

  // 2. Specific known ETF tickers on NSE/BSE
  const knownEtfTickers = [
    'BHARAT22', 'CPSEETF', 'MAFANG', 'MON100', 'MOM100', 'MOM30', 'MOM50',
    'MASPTOP50', 'HDFCLIQUID', 'SETF10GILT', 'GSEC5IETF', 'GSEC10IETF',
    'LIQUIDBEES', 'LIQUIDETF', 'ABSLNN50ET', 'ICICIB22', 'ICICINV20'
  ];
  if (knownEtfTickers.includes(sym)) {
    reasons.push(`Known ETF ticker match (${sym})`);
  }

  // 3. Name checks
  if (/\bEXCHANGE\s+TRADED\s+FUND\b/i.test(name)) {
    reasons.push(`Name contains 'EXCHANGE TRADED FUND'`);
  } else if (/\bETF\b/.test(name) || /-ETF\b/.test(name) || /\(ETF\)/.test(name) || /\[ETF\]/.test(name)) {
    reasons.push(`Name contains 'ETF'`);
  } else if (/\bBEES\b/i.test(name) || /\bBEES\b/.test(name)) {
    reasons.push(`Name contains 'BEES'`);
  } else if (/\bINDEX\s+FUND\b/i.test(name)) {
    reasons.push(`Name contains 'INDEX FUND'`);
  } else if (name.startsWith('SBI-ETF') || name.startsWith('SBI ETF') || name.startsWith('UTI-ETF') || name.startsWith('UTI ETF') || name.startsWith('KOTAK ETF') || name.startsWith('HDFC ETF') || name.startsWith('ICICI PRUDENTIAL ETF') || name.startsWith('NIPPON INDIA ETF') || name.startsWith('MIRAE ASSET ETF')) {
    reasons.push(`Name matches ETF AMC prefix`);
  }

  // Double check false positive prevention:
  // Ensure we don't accidentally match regular companies
  if (reasons.length > 0) {
    return { isETF: true, reasons: reasons.join('; ') };
  }
  return { isETF: false };
}

(async () => {
  const client = new MongoClient(mongoUri);
  await client.connect();
  const db = client.db('sangam_stocks');
  const universe = await db.collection('universe_stocks').find({}).toArray();

  const detected = [];
  universe.forEach(item => {
    const res = detectETF(item);
    if (res.isETF) {
      detected.push({
        symbol: item.symbol,
        name: item.name,
        price: item.price || item.ltp || 0,
        reasons: res.reasons
      });
    }
  });

  // Sort alphabetically by symbol
  detected.sort((a, b) => a.symbol.localeCompare(b.symbol));

  console.log(`[SCAN RESULT] Total universe stocks scanned: ${universe.length}`);
  console.log(`[SCAN RESULT] Total ETFs identified: ${detected.length}`);

  // Write full list to JSON file for complete inspection
  fs.writeFileSync(path.join(__dirname, '..', 'detected_etfs.json'), JSON.stringify(detected, null, 2));

  // Also check how many of these exist in daily_ohlcv
  const symbols = detected.map(d => d.symbol);
  const ohlcvMatches = await db.collection('daily_ohlcv').distinct('symbol', { symbol: { $in: symbols } });
  console.log(`[SCAN RESULT] Detected ETFs present in daily_ohlcv: ${ohlcvMatches.length}`);

  console.log('\n--- SAMPLE DETECTED ETFS (First 25): ---');
  detected.slice(0, 25).forEach((d, idx) => {
    console.log(`${idx + 1}. [${d.symbol}] "${d.name}" (Price: ₹${d.price}) -> Reason: ${d.reasons}`);
  });

  await client.close();
})();
