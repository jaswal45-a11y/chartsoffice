/**
 * High-Performance Universe 3-Year OHLCV Historical Synchronizer
 * Pre-populates MongoDB Atlas `daily_ohlcv` for instant sub-15ms chart rendering.
 */

const http = require('node:http');
const https = require('node:https');
const fs = require('node:fs');
const path = require('node:path');
const dns = require('node:dns');
const { MongoClient } = require('mongodb');

// Set reliable DNS for MongoDB SRV resolution
try {
  dns.setServers(['8.8.8.8', '8.8.4.4', '1.1.1.1']);
} catch (e) {}

// Parse .env
const envPath = path.join(__dirname, '..', '.env');
let mongoUri = process.env.MONGODB_URI || '';
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  envContent.split(/\r?\n/).forEach(line => {
    const trimmed = line.trim();
    if (trimmed.startsWith('MONGODB_URI=')) {
      mongoUri = trimmed.slice('MONGODB_URI='.length).trim().replace(/^['"]|['"]$/g, '');
    }
  });
}

if (!mongoUri) {
  console.error('[OHLCV-SYNC] ❌ Missing MONGODB_URI in environment or .env');
  process.exit(1);
}

const GLOBAL_INDEX_SYMBOL_MAP = {
  'NIFTY': '^NSEI', 'NIFTY 50': '^NSEI', 'NIFTY50': '^NSEI', '^NSEI': '^NSEI',
  'BANKNIFTY': '^NSEBANK', 'NIFTY BANK': '^NSEBANK', 'NIFTYBANK': '^NSEBANK', '^NSEBANK': '^NSEBANK',
  'FINNIFTY': 'NIFTY_FIN_SERVICE.NS', 'NIFTY FIN SERVICE': 'NIFTY_FIN_SERVICE.NS',
  'MIDCPNIFTY': '^NSEMDCP50', 'NIFTY MIDCAP 50': '^NSEMDCP50',
  'NIFTY_MIDCAP_150': 'NIFTYMIDCAP150.NS', 'NIFTYMIDCAP150': 'NIFTYMIDCAP150.NS', 'NIFTY MIDCAP 150': 'NIFTYMIDCAP150.NS',
  'NIFTY_SMALLCAP_250': 'NIFTYSMLCAP250.NS', 'NIFTY SMALLCAP 250': 'NIFTYSMLCAP250.NS',
  'NIFTY 500': '^CRSLDX', 'NIFTY500': '^CRSLDX', 'NIFTY_500': '^CRSLDX'
};

function getCandidateSymbols(sym) {
  let raw = String(sym || '').trim().toUpperCase();
  const candidates = [];

  if (GLOBAL_INDEX_SYMBOL_MAP[raw]) {
    candidates.push(GLOBAL_INDEX_SYMBOL_MAP[raw]);
  }

  const bareSym = raw.replace(/\.(NS|BO)$/, '');
  if (GLOBAL_INDEX_SYMBOL_MAP[bareSym] && !candidates.includes(GLOBAL_INDEX_SYMBOL_MAP[bareSym])) {
    candidates.push(GLOBAL_INDEX_SYMBOL_MAP[bareSym]);
  }

  const encodedBare = bareSym.replace(/&/g, '%26');

  if (raw.startsWith('^') || raw.includes('=')) {
    if (!candidates.includes(raw)) candidates.push(raw);
  } else if (/^\d+$/.test(raw)) {
    candidates.push(`${raw}.BO`);
  } else {
    candidates.push(`${encodedBare}.NS`);
    candidates.push(`${encodedBare}.BO`);
    candidates.push(encodedBare);
  }

  return candidates;
}

const KNOWN_ETF_SYMBOLS = new Set([
  'BHARAT22', 'CPSEETF', 'MAFANG', 'MON100', 'MOM100', 'MOM30', 'MOM50',
  'MASPTOP50', 'HDFCLIQUID', 'SETF10GILT', 'GSEC5IETF', 'GSEC10IETF',
  'LIQUIDBEES', 'LIQUIDETF', 'ABSLNN50ET', 'ICICIB22', 'ICICINV20', 'NV20',
  'ELIQUID', 'LIQUIDADD', 'LIQUIDPLUS', 'LIQUIDSBI', 'SBILIQETF', 'LIQUIDBETA',
  'LIQUID1', 'AONELIQUID', 'LIQGRWBEES', 'LIQUIDSHRI', 'SETFNIFBK', 'SETFNIF50',
  'QNIFTY', 'HDFCNIFTY', 'NIFTYBETA', 'SILVER001', 'MOMIDMTM', 'GOLDBEES',
  'SILVERBEES', 'NIFTYBEES', 'BANKBEES', 'ITBEES', 'PHARMABEES', 'AUTOBEES',
  'INFRABEES', 'CONSUMBEES', 'PSUBNKBEES', 'JUNIORBEES', 'SHARIABEES',
  'FARBEES', 'GILT5YBEES', 'LTGILTBEES', 'MID150BEES', 'MANUFGBEES', 'NV20BEES',
  'SNXT30BEES', 'NIF100BEES', 'GOLD1', 'SILVER1', 'SILVER', 'GOLDETF',
  'SILVERETF', 'GOLDIETF', 'SILVERIETF', 'TATAGOLD', 'TATSILV', 'UNIONGOLD',
  'TWCGOLDETF', 'QGOLDHALF', 'SBIGOLD', 'SBISILVER', 'MOGOLD', 'MOSILVER',
  'HDFCGOLD', 'HDFCSILVER', 'ICICIGOLD', 'ICICISILV', 'KOTAKGOLD', 'KOTAKSILV',
  'AXISGOLD', 'AXISSILVER', 'DSPGOLD', 'DSPSILVER', 'BSLGOLDETF'
]);

function isInstrumentETF(symbol, name = '') {
  if (!symbol) return false;
  const sym = String(symbol).toUpperCase().replace(/\.(NS|BO)$/, '').trim();
  if (KNOWN_ETF_SYMBOLS.has(sym)) return true;

  if (sym.endsWith('BEES') || sym.endsWith('ETF') || sym.endsWith('IETF') || sym.endsWith('BETF') || sym.endsWith('GETF') ||
      /_ETF\b/.test(sym) || /-ETF\b/.test(sym)) {
    return true;
  }

  if (name) {
    const n = String(name).toUpperCase();
    if (/\bEXCHANGE\s+TRADED\s+FUND\b/.test(n) || /\bETF\b/.test(n) || /-ETF\b/.test(n) ||
        /\(ETF\)/.test(n) || /\[ETF\]/.test(n) || /\bBEES\b/.test(n) || /\bBHARAT\s+BOND\b/.test(n)) {
      return true;
    }
  }
  return false;
}

const NSE_TRADING_HOLIDAYS = {
  '2023-01-26': 'Republic Day', '2023-03-07': 'Holi', '2023-03-30': 'Ram Navami',
  '2023-04-04': 'Mahavir Jayanti', '2023-04-07': 'Good Friday', '2023-04-14': 'Ambedkar Jayanti',
  '2023-04-21': 'Id-Ul-Fitr', '2023-05-01': 'Maharashtra Day', '2023-06-29': 'Bakri Id',
  '2023-08-15': 'Independence Day', '2023-09-19': 'Ganesh Chaturthi', '2023-10-02': 'Gandhi Jayanti',
  '2023-10-24': 'Dussehra', '2023-11-14': 'Diwali Balipratipada', '2023-11-27': 'Gurunanak Jayanti',
  '2023-12-25': 'Christmas',
  '2024-01-22': 'Special Holiday', '2024-01-26': 'Republic Day', '2024-03-08': 'Mahashivratri',
  '2024-03-25': 'Holi', '2024-03-29': 'Good Friday', '2024-04-11': 'Id-Ul-Fitr',
  '2024-04-17': 'Ram Navami', '2024-05-01': 'Maharashtra Day', '2024-05-20': 'General Elections',
  '2024-06-17': 'Bakri Id', '2024-07-17': 'Muharram', '2024-08-15': 'Independence Day',
  '2024-10-02': 'Gandhi Jayanti', '2024-11-01': 'Diwali Laxmi Pujan', '2024-11-15': 'Gurunanak Jayanti',
  '2024-11-20': 'Maharashtra Assembly Election', '2024-12-25': 'Christmas',
  '2025-02-26': 'Mahashivratri', '2025-03-14': 'Holi', '2025-03-31': 'Id-Ul-Fitr',
  '2025-04-10': 'Mahavir Jayanti', '2025-04-14': 'Dr. Ambedkar Jayanti', '2025-04-18': 'Good Friday',
  '2025-05-01': 'Maharashtra Day', '2025-06-07': 'Bakri Id', '2025-08-15': 'Independence Day',
  '2025-08-27': 'Ganesh Chaturthi', '2025-10-02': 'Gandhi Jayanti', '2025-10-21': 'Diwali Laxmi Pujan',
  '2025-10-22': 'Diwali Balipratipada', '2025-11-05': 'Gurunanak Jayanti', '2025-12-25': 'Christmas',
  '2026-01-15': 'Municipal Election', '2026-01-26': 'Republic Day', '2026-03-03': 'Holi',
  '2026-03-26': 'Ram Navami', '2026-03-31': 'Mahavir Jayanti', '2026-04-03': 'Good Friday',
  '2026-04-14': 'Ambedkar Jayanti', '2026-05-01': 'Maharashtra Day', '2026-05-28': 'Bakri Id',
  '2026-06-26': 'Muharram', '2026-09-14': 'Ganesh Chaturthi', '2026-10-02': 'Gandhi Jayanti',
  '2026-10-20': 'Dussehra', '2026-11-10': 'Diwali Balipratipada', '2026-11-24': 'Gurunanak Jayanti',
  '2026-12-25': 'Christmas'
};

function getISTDateString(timestamp) {
  const d = new Date(typeof timestamp === 'number' && timestamp < 1e11 ? timestamp * 1000 : timestamp);
  const istOffset = 5.5 * 60 * 60 * 1000;
  const istDate = new Date(d.getTime() + istOffset);
  return istDate.toISOString().slice(0, 10);
}

function isNSETradingHoliday(dateStr) {
  if (!dateStr) return false;
  return Boolean(NSE_TRADING_HOLIDAYS[dateStr.slice(0, 10)]);
}

// Yahoo Session Management
const YAHOO_SESSION = { crumb: '', cookies: '', lastUpdated: 0, TTL_MS: 30 * 60 * 1000 };

function httpsFetch(url, options = {}) {
  return new Promise((resolve) => {
    try {
      const parsed = new URL(url);
      const isHttps = parsed.protocol === 'https:';
      const client = isHttps ? https : http;
      const agent = isHttps ? new https.Agent({ rejectUnauthorized: false }) : undefined;
      const req = client.request({
        protocol: parsed.protocol,
        hostname: parsed.hostname,
        port: parsed.port || (isHttps ? 443 : 80),
        path: parsed.pathname + parsed.search,
        method: (options.method || 'GET').toUpperCase(),
        headers: options.headers || {},
        agent,
        timeout: options.timeout || 10000
      }, (res) => {
        let raw = '';
        res.on('data', chunk => raw += chunk);
        res.on('end', () => {
          resolve({
            ok: res.statusCode >= 200 && res.statusCode < 300,
            status: res.statusCode,
            headers: res.headers,
            text: async () => raw,
            json: async () => {
              try { return JSON.parse(raw); } catch (e) { return null; }
            }
          });
        });
      });
      req.on('error', (err) => resolve({ ok: false, status: 500, error: err.message }));
      req.on('timeout', () => {
        req.destroy();
        resolve({ ok: false, status: 504, error: 'Request timeout' });
      });
      if (options.body) req.write(options.body);
      req.end();
    } catch (e) {
      resolve({ ok: false, status: 500, error: e.message });
    }
  });
}

async function getYahooCrumbAndCookie() {
  const now = Date.now();
  if (YAHOO_SESSION.crumb && YAHOO_SESSION.cookies && (now - YAHOO_SESSION.lastUpdated < YAHOO_SESSION.TTL_MS)) {
    return YAHOO_SESSION;
  }

  try {
    const fetchHelper = (targetUrl, headers = {}) => {
      return new Promise((resolve) => {
        const agent = new https.Agent({ rejectUnauthorized: false });
        const req = https.get(targetUrl, {
          agent,
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
            'Accept': '*/*',
            ...headers
          },
          timeout: 6000
        }, res => {
          let d = '';
          const setCookies = res.headers['set-cookie'];
          res.on('data', c => d += c);
          res.on('end', () => resolve({ status: res.statusCode, setCookies, body: d }));
        });
        req.on('error', () => resolve({ status: 500, body: '' }));
        req.on('timeout', () => { req.destroy(); resolve({ status: 504, body: '' }); });
      });
    };

    const initRes = await fetchHelper('https://fc.yahoo.com');
    let cookies = [];
    if (initRes.setCookies) {
      cookies = initRes.setCookies.map(c => c.split(';')[0]);
    }
    const cookieHeader = Array.from(new Set(cookies)).join('; ');

    const crumbRes = await fetchHelper('https://query1.finance.yahoo.com/v1/test/getcrumb', {
      Cookie: cookieHeader
    });

    if (crumbRes.status === 200 && crumbRes.body && !crumbRes.body.includes('<')) {
      YAHOO_SESSION.cookies = cookieHeader;
      YAHOO_SESSION.crumb = crumbRes.body.trim();
      YAHOO_SESSION.lastUpdated = now;
      console.log(`[OHLCV-SYNC] Initialized Yahoo Crumb Session: "${YAHOO_SESSION.crumb}"`);
    } else {
      YAHOO_SESSION.cookies = cookieHeader;
      YAHOO_SESSION.crumb = '';
      YAHOO_SESSION.lastUpdated = now;
    }
  } catch (err) {
    console.warn('[OHLCV-SYNC] Yahoo Session notice:', err.message);
  }
  return YAHOO_SESSION;
}

async function fetchChartDataMultiSource(candidate, range = '5y', interval = '1d') {
  const session = await getYahooCrumbAndCookie();
  const crumbParam = session.crumb ? `&crumb=${encodeURIComponent(session.crumb)}` : '';

  // Tier 1: Query1
  const tier1Url = `https://query1.finance.yahoo.com/v8/finance/chart/${candidate}?range=${range}&interval=${interval}${crumbParam}`;
  try {
    const res = await httpsFetch(tier1Url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        'Accept': '*/*',
        ...(session.cookies ? { 'Cookie': session.cookies } : {})
      }
    });
    if (res.ok) {
      const data = await res.json();
      if (data && data.chart && data.chart.result && data.chart.result[0]) {
        return data.chart.result[0];
      }
    }
  } catch (e) {}

  // Tier 2: Query2 Mirror
  const tier2Url = `https://query2.finance.yahoo.com/v8/finance/chart/${candidate}?range=${range}&interval=${interval}`;
  try {
    const res = await httpsFetch(tier2Url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        'Accept': '*/*'
      }
    });
    if (res.ok) {
      const data = await res.json();
      if (data && data.chart && data.chart.result && data.chart.result[0]) {
        return data.chart.result[0];
      }
    }
  } catch (e) {}

  return null;
}

// Progress status state file for live monitoring
const STATUS_FILE = path.join(__dirname, '..', 'ohlcv_sync_status.json');

function updateStatusFile(statusObj) {
  try {
    fs.writeFileSync(STATUS_FILE, JSON.stringify(statusObj, null, 2));
  } catch (e) {}
}

// Main execution function
async function runUniverseSync(limitArg = null) {
  console.log('===============================================================');
  console.log('🚀 Starting Universe 3-Year OHLCV Historical Synchronizer');
  console.log('===============================================================');

  const client = new MongoClient(mongoUri);
  await client.connect();
  const db = client.db('sangam_stocks');
  const universeCol = db.collection('universe_stocks');
  const ohlcvCol = db.collection('daily_ohlcv');

  // Verify compound index
  await ohlcvCol.createIndex({ symbol: 1, date: 1 }, { unique: true });
  await ohlcvCol.createIndex({ date: -1 });

  // Get all universe stocks
  const universeDocs = await universeCol.find({}, { projection: { symbol: 1, name: 1, marketCap: 1, volume: 1 } }).toArray();
  console.log(`[OHLCV-SYNC] Total Universe Stocks in Database: ${universeDocs.length}`);

  // Calculate 3-year threshold date
  const threeYearsAgo = new Date();
  threeYearsAgo.setFullYear(threeYearsAgo.getFullYear() - 3);
  const minRetentionDate = threeYearsAgo.toISOString().slice(0, 10);
  console.log(`[OHLCV-SYNC] 3-Year Retention Window: >= ${minRetentionDate}`);

  // Find symbols that already have adequate candles (>= 650 trading days)
  console.log('[OHLCV-SYNC] Scanning existing coverage in daily_ohlcv...');
  const candleCounts = await ohlcvCol.aggregate([
    { $match: { date: { $gte: minRetentionDate } } },
    { $group: { _id: '$symbol', count: { $sum: 1 } } }
  ]).toArray();

  const countMap = new Map();
  candleCounts.forEach(c => countMap.set(c._id, c.count));

  // Filter stocks that need sync (strictly exclude any ETF)
  const pendingStocks = universeDocs.filter(s => {
    const sym = s.symbol.toUpperCase();
    if (isInstrumentETF(sym, s.name)) return false;
    const count = countMap.get(sym) || 0;
    return count < 650; // Needs data if fewer than ~2.6 years of candles
  });

  console.log(`[OHLCV-SYNC] Already Synced (>= 650 candles): ${universeDocs.length - pendingStocks.length} stocks`);
  console.log(`[OHLCV-SYNC] Pending Sync: ${pendingStocks.length} stocks`);

  if (pendingStocks.length === 0) {
    console.log('[OHLCV-SYNC] ✅ All universe stocks already have complete 3-year OHLCV data in MongoDB Atlas!');
    updateStatusFile({
      status: 'COMPLETED',
      totalUniverse: universeDocs.length,
      synced: universeDocs.length,
      pending: 0,
      updatedAt: new Date().toISOString()
    });
    await client.close();
    return;
  }

  // Sort pending stocks: highest market cap / volume first (most viewed stocks first)
  pendingStocks.sort((a, b) => (b.marketCap || b.volume || 0) - (a.marketCap || a.volume || 0));

  const stocksToProcess = limitArg ? pendingStocks.slice(0, limitArg) : pendingStocks;
  console.log(`[OHLCV-SYNC] Processing batch of ${stocksToProcess.length} stocks...`);

  const concurrency = 7;
  let processedCount = 0;
  let totalSavedCandles = 0;
  let failedCount = 0;
  const startTime = Date.now();

  for (let i = 0; i < stocksToProcess.length; i += concurrency) {
    const chunk = stocksToProcess.slice(i, i + concurrency);

    await Promise.allSettled(chunk.map(async (stock) => {
      const sym = stock.symbol.toUpperCase();
      const candidates = getCandidateSymbols(sym);
      let chartData = null;

      for (const cand of candidates) {
        chartData = await fetchChartDataMultiSource(cand, '5y', '1d');
        if (chartData && chartData.timestamp && chartData.timestamp.length > 0) break;
      }

      if (!chartData || !chartData.timestamp || chartData.timestamp.length === 0) {
        failedCount++;
        return;
      }

      const timestamps = chartData.timestamp;
      const quotes = chartData.indicators?.quote?.[0];
      if (!quotes || !quotes.close) {
        failedCount++;
        return;
      }

      const closes = quotes.close;
      const opens = quotes.open || [];
      const highs = quotes.high || [];
      const lows = quotes.low || [];
      const volumes = quotes.volume || [];

      const bulkOps = [];
      for (let t = 0; t < timestamps.length; t++) {
        const c = closes[t];
        if (c === null || c === undefined) continue;

        const dateStr = getISTDateString(timestamps[t]);
        if (dateStr < minRetentionDate) continue; // Skip anything older than 3 years
        if (isNSETradingHoliday(dateStr)) continue; // Skip holidays

        const o = opens[t] !== null && opens[t] !== undefined ? opens[t] : c;
        const h = highs[t] !== null && highs[t] !== undefined ? highs[t] : Math.max(o, c);
        const l = lows[t] !== null && lows[t] !== undefined ? lows[t] : Math.min(o, c);
        const v = volumes[t] || 0;

        // Skip flat zero volume bars
        if (v === 0 && Math.abs(h - l) < 0.001) continue;

        bulkOps.push({
          updateOne: {
            filter: { symbol: sym, date: dateStr },
            update: {
              $set: {
                symbol: sym,
                date: dateStr,
                open: Number(o.toFixed(2)),
                high: Number(h.toFixed(2)),
                low: Number(l.toFixed(2)),
                close: Number(c.toFixed(2)),
                volume: Math.round(v),
                isFinalized: true,
                updatedAt: new Date()
              }
            },
            upsert: true
          }
        });
      }

      if (bulkOps.length > 0) {
        await ohlcvCol.bulkWrite(bulkOps, { ordered: false });
        totalSavedCandles += bulkOps.length;
      }
    }));

    processedCount += chunk.length;

    // Progress update every 21 stocks or at the end
    if (processedCount % 21 === 0 || processedCount >= stocksToProcess.length) {
      const elapsedSec = ((Date.now() - startTime) / 1000).toFixed(1);
      const rate = (processedCount / (elapsedSec || 1)).toFixed(1);
      const remaining = stocksToProcess.length - processedCount;
      const etaSec = rate > 0 ? Math.round(remaining / rate) : 0;
      const etaMin = (etaSec / 60).toFixed(1);
      const pct = ((processedCount / stocksToProcess.length) * 100).toFixed(1);

      console.log(
        `[OHLCV-SYNC] 📊 ${processedCount}/${stocksToProcess.length} (${pct}%) | ` +
        `Saved Candles: ${totalSavedCandles.toLocaleString()} | Rate: ${rate} stocks/s | ETA: ${etaMin}m`
      );

      updateStatusFile({
        status: 'SYNCING',
        totalToProcess: stocksToProcess.length,
        processedCount,
        percent: parseFloat(pct),
        totalSavedCandles,
        rate: parseFloat(rate),
        etaMinutes: parseFloat(etaMin),
        failedCount,
        updatedAt: new Date().toISOString()
      });
    }

    // Small courteous jitter delay between batches (100ms)
    await new Promise(r => setTimeout(r, 100));
  }

  const totalTimeMin = (((Date.now() - startTime) / 1000) / 60).toFixed(2);
  console.log('===============================================================');
  console.log(`[OHLCV-SYNC] ✅ Completed OHLCV Batch Sync in ${totalTimeMin} minutes!`);
  console.log(`[OHLCV-SYNC] Total Processed: ${processedCount} | Saved Candles: ${totalSavedCandles.toLocaleString()} | Failed/No Data: ${failedCount}`);
  console.log('===============================================================');

  updateStatusFile({
    status: 'COMPLETED',
    totalProcessed: processedCount,
    totalSavedCandles,
    failedCount,
    completedAt: new Date().toISOString()
  });

  await client.close();
}

const arg = process.argv[2] ? parseInt(process.argv[2], 10) : null;
runUniverseSync(arg).catch(err => {
  console.error('[OHLCV-SYNC] Fatal error:', err);
  process.exit(1);
});
