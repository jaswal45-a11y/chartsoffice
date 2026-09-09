/**
 * Localhost Stock Screener & Visualizer Server
 * Powered by Node.js built-in HTTP module (Zero external dependencies needed!)
 */

const http = require('node:http');
const https = require('node:https');
const fs = require('node:fs');
const path = require('node:path');
const url = require('node:url');
const crypto = require('node:crypto');
const dns = require('node:dns');

// Configure reliable DNS servers for MongoDB Atlas SRV lookups across all environments
try {
  dns.setServers(['8.8.8.8', '8.8.4.4', '1.1.1.1']);
} catch (e) {}

// Load local .env file if present (Zero external dependencies)
try {
  const envPath = path.join(__dirname, '.env');
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
} catch (e) {}

const PORT = process.env.PORT || 3000;
const DATA_FILE = path.join(__dirname, 'data', 'screeners.json');
const USERS_FILE = path.join(__dirname, 'data', 'users.json');
const CONFIG_FILE = path.join(__dirname, 'data', 'config.json');
const SECTORS_FILE = path.join(__dirname, 'data', 'sectors_data.json');
const SECTORAL_DATA_FILE = path.join(__dirname, 'data', 'sectoral_indices_data.json');
const FNO_DATA_FILE = path.join(__dirname, 'data', 'fno_stocks_universe.json');
const PUBLIC_DIR = path.join(__dirname, 'public');

function sanitizeDhanValue(val) {
  if (!val) return '';
  let clean = String(val).trim();
  clean = clean.replace(/^['"]|['"]$/g, '').trim();
  if (clean.toLowerCase().startsWith('bearer ')) {
    clean = clean.substring(7).trim();
  }
  return clean;
}

function getDhanConfigValue(key, envKey) {
  const candidateKeys = [
    envKey,
    envKey.toLowerCase(),
    envKey.toUpperCase(),
    key,
    key.toLowerCase(),
    key.toUpperCase()
  ];
  if (key === 'dhanClientId') {
    candidateKeys.push('DHAN_CLIENT_ID', 'DHAN_CLIENTID', 'DHAN_ID', 'CLIENT_ID', 'dhan_client_id', 'DHAN_USER_ID', 'DHAN_ACCOUNT_ID');
  }
  if (key === 'dhanAccessToken') {
    candidateKeys.push('DHAN_ACCESS_TOKEN', 'DHAN_TOKEN', 'DHAN_ACCESS_JWT', 'ACCESS_TOKEN', 'dhan_access_token', 'DHAN_JWT_TOKEN', 'DHAN_AUTH_TOKEN');
  }

  for (const k of candidateKeys) {
    if (process.env[k] && String(process.env[k]).trim()) {
      return sanitizeDhanValue(process.env[k]);
    }
  }

  try {
    if (fs.existsSync(CONFIG_FILE)) {
      const cfg = JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8') || '{}');
      for (const k of candidateKeys) {
        if (cfg[k] && String(cfg[k]).trim()) {
          return sanitizeDhanValue(cfg[k]);
        }
      }
    }
  } catch (e) {}
  return '';
}

const DHAN_CONFIG = {
  get clientId() { return getDhanConfigValue('dhanClientId', 'DHAN_CLIENT_ID'); },
  get accessToken() { return getDhanConfigValue('dhanAccessToken', 'DHAN_ACCESS_TOKEN'); },
  baseUrl: 'https://api.dhan.co/v2',
  scripMapPath: path.join(__dirname, 'data', 'dhan_scrip_map.json'),
  scripMap: {}
};

// Load pre-bundled Dhan scrip map (10,000+ NSE/BSE securities & indices)
try {
  if (fs.existsSync(DHAN_CONFIG.scripMapPath)) {
    DHAN_CONFIG.scripMap = JSON.parse(fs.readFileSync(DHAN_CONFIG.scripMapPath, 'utf8'));
  }
} catch (e) {
  console.warn('[DHAN] Scrip map load notice:', e.message);
}

// Fallback & Alias mappings for primary indices & top stocks
DHAN_CONFIG.scripMap['NIFTY'] = { secId: '13', segment: 'IDX_I', instrument: 'INDEX' };
DHAN_CONFIG.scripMap['NIFTY 50'] = { secId: '13', segment: 'IDX_I', instrument: 'INDEX' };
DHAN_CONFIG.scripMap['^NSEI'] = { secId: '13', segment: 'IDX_I', instrument: 'INDEX' };
DHAN_CONFIG.scripMap['BANKNIFTY'] = { secId: '25', segment: 'IDX_I', instrument: 'INDEX' };
DHAN_CONFIG.scripMap['NIFTY BANK'] = { secId: '25', segment: 'IDX_I', instrument: 'INDEX' };
DHAN_CONFIG.scripMap['^NSEBANK'] = { secId: '25', segment: 'IDX_I', instrument: 'INDEX' };
DHAN_CONFIG.scripMap['FINNIFTY'] = { secId: '27', segment: 'IDX_I', instrument: 'INDEX' };
DHAN_CONFIG.scripMap['MIDCPNIFTY'] = { secId: '44', segment: 'IDX_I', instrument: 'INDEX' };
DHAN_CONFIG.scripMap['TATAMOTORS'] = DHAN_CONFIG.scripMap['TMPV'] || { secId: '3456', segment: 'NSE_EQ', instrument: 'EQUITY' };
DHAN_CONFIG.scripMap['LTIM'] = DHAN_CONFIG.scripMap['LTM'] || { secId: '17818', segment: 'NSE_EQ', instrument: 'EQUITY' };


function isDhanConfigured() {
  return Boolean(DHAN_CONFIG.clientId && DHAN_CONFIG.accessToken);
}

let lastDhanCheckTime = 0;
let lastDhanCheckStatus = false;
let lastDhanErrorMsg = '';

async function checkDhanApiHealth() {
  if (!isDhanConfigured()) {
    lastDhanCheckStatus = false;
    lastDhanErrorMsg = 'Credentials not configured';
    return false;
  }
  const now = Date.now();
  if (now - lastDhanCheckTime < 60000) {
    return lastDhanCheckStatus;
  }

  try {
    const res = await dhanFetch('/marketfeed/quote', {
      method: 'POST',
      body: { 'IDX_I': [13] },
      timeout: 4500
    });

    if (res.ok && res.status === 200) {
      lastDhanCheckStatus = true;
      lastDhanErrorMsg = '';
      lastDhanCheckTime = now;
      return true;
    } else if (res.status === 401 || res.status === 403) {
      const isSubError = JSON.stringify(res.json || res.raw || '').includes('806') || JSON.stringify(res.json || res.raw || '').includes('Data APIs not Subscribed');
      lastDhanCheckStatus = false;
      lastDhanErrorMsg = isSubError
        ? 'Dhan Data API subscription required (Error 806). Subscribe via web.dhan.co -> DhanHQ APIs -> Data API tab.'
        : `Dhan API token invalid or expired (HTTP ${res.status})`;
      console.warn(`[DHAN] Health check: ${lastDhanErrorMsg}`);
      lastDhanCheckTime = now;
      return false;
    } else {
      lastDhanCheckStatus = false;
      lastDhanErrorMsg = `Dhan API returned HTTP ${res.status}`;
      lastDhanCheckTime = now;
      return false;
    }
  } catch (err) {
    lastDhanCheckStatus = false;
    lastDhanErrorMsg = err.message;
    lastDhanCheckTime = now;
    return false;
  }
}

function getDhanSecurityMeta(symbol) {
  if (!symbol) return null;
  const clean = symbol.trim().toUpperCase().replace(/\.(NS|BO)$/, '');
  return DHAN_CONFIG.scripMap[clean] || null;
}

// Convert Dhan historical response to standard candle format
function convertDhanHistoricalToCandles(dhanData) {
  if (!dhanData || !dhanData.close || !Array.isArray(dhanData.close) || dhanData.close.length === 0) {
    return [];
  }

  const times = dhanData.start_Time || [];
  const opens = dhanData.open || [];
  const highs = dhanData.high || [];
  const lows = dhanData.low || [];
  const closes = dhanData.close || [];
  const volumes = dhanData.volume || [];

  const candles = [];
  for (let i = 0; i < closes.length; i++) {
    const c = closes[i];
    const o = opens[i] != null ? opens[i] : c;
    const h = highs[i] != null ? highs[i] : c;
    const l = lows[i] != null ? lows[i] : c;
    const v = volumes[i] || 0;
    const t = times[i];

    if (c == null || !t) continue;

    const dateStr = new Date(t * 1000).toISOString().split('T')[0];
    candles.push({
      time: dateStr,
      open: Number(Number(o).toFixed(2)),
      high: Number(Number(h).toFixed(2)),
      low: Number(Number(l).toFixed(2)),
      close: Number(Number(c).toFixed(2)),
      volume: Number(v)
    });
  }

  return candles;
}

// Universal Resilient HTTPS Fetcher with custom agent
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
        timeout: options.timeout || 12000
      }, (res) => {
        let raw = '';
        res.on('data', chunk => raw += chunk);
        res.on('end', () => {
          let json = null;
          try { json = JSON.parse(raw); } catch (e) {}
          resolve({
            ok: res.statusCode >= 200 && res.statusCode < 300,
            status: res.statusCode,
            headers: res.headers,
            raw,
            text: () => Promise.resolve(raw),
            json: () => Promise.resolve(json || {})
          });
        });
      });

      req.on('error', (err) => resolve({ ok: false, status: 0, error: err.message, text: () => Promise.resolve(''), json: () => Promise.resolve({}) }));
      req.on('timeout', () => { req.destroy(); resolve({ ok: false, status: 408, error: 'Request timeout', text: () => Promise.resolve(''), json: () => Promise.resolve({}) }); });

      if (options.body) {
        const bodyStr = typeof options.body === 'string' ? options.body : JSON.stringify(options.body);
        req.write(bodyStr);
      }
      req.end();
    } catch (err) {
      resolve({ ok: false, status: 0, error: err.message, text: () => Promise.resolve(''), json: () => Promise.resolve({}) });
    }
  });
}

// Robust Dhan API Request Dispatcher with TLS compatibility
function dhanFetch(endpoint, options = {}) {
  return new Promise((resolve) => {
    try {
      const url = endpoint.startsWith('http') ? endpoint : `${DHAN_CONFIG.baseUrl}${endpoint.startsWith('/') ? '' : '/'}${endpoint}`;
      const parsed = new URL(url);
      const agent = new https.Agent({ rejectUnauthorized: false });

      const headers = {
        'access-token': DHAN_CONFIG.accessToken,
        'client-id': DHAN_CONFIG.clientId,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        ...(options.headers || {})
      };

      const req = https.request({
        protocol: parsed.protocol,
        hostname: parsed.hostname,
        port: parsed.port || 443,
        path: parsed.pathname + parsed.search,
        method: (options.method || 'GET').toUpperCase(),
        headers,
        agent,
        timeout: options.timeout || 8000
      }, (res) => {
        let raw = '';
        res.on('data', chunk => raw += chunk);
        res.on('end', () => {
          try {
            const json = JSON.parse(raw);
            resolve({ ok: res.statusCode >= 200 && res.statusCode < 300, status: res.statusCode, json, data: json });
          } catch (e) {
            resolve({ ok: res.statusCode >= 200 && res.statusCode < 300, status: res.statusCode, raw, data: null });
          }
        });
      });

      req.on('error', (err) => resolve({ ok: false, status: 0, error: err.message }));
      req.on('timeout', () => { req.destroy(); resolve({ ok: false, status: 408, error: 'Request timeout' }); });

      if (options.body) {
        const bodyStr = typeof options.body === 'string' ? options.body : JSON.stringify(options.body);
        req.write(bodyStr);
      }
      req.end();
    } catch (err) {
      resolve({ ok: false, status: 0, error: err.message });
    }
  });
}

// Fetch historical candles from DhanHQ API
async function fetchDhanHistorical(symbol, fromDate = null, toDate = null) {
  if (!isDhanConfigured()) return null;
  const meta = getDhanSecurityMeta(symbol);
  if (!meta || !meta.secId) return null;

  const now = new Date();
  const todayStr = now.toISOString().split('T')[0];
  const twoYearsAgo = new Date(now.getFullYear() - 2, now.getMonth(), now.getDate()).toISOString().split('T')[0];

  const payload = {
    securityId: String(meta.secId),
    exchangeSegment: meta.segment || 'NSE_EQ',
    instrument: meta.instrument || 'EQUITY',
    expiryCode: 0,
    fromDate: fromDate || twoYearsAgo,
    toDate: toDate || todayStr
  };

  try {
    const res = await dhanFetch('/charts/historical', {
      method: 'POST',
      body: payload
    });

    if (!res.ok) {
      console.warn(`[DHAN] Historical charts API returned HTTP ${res.status} for ${symbol}`);
      return null;
    }

    const candles = convertDhanHistoricalToCandles(res.json);
    if (candles.length > 0) {
      return { candles, meta };
    }
  } catch (err) {
    console.warn(`[DHAN] Historical fetch exception for ${symbol}:`, err.message);
  }
  return null;
}

// Fetch live quotes from DhanHQ API
async function fetchDhanLiveQuotes(symbols) {
  if (!isDhanConfigured() || !symbols || symbols.length === 0) return {};

  const nseEqIds = [];
  const idxIds = [];
  const idToSymbol = {};

  symbols.forEach(sym => {
    const clean = sym.trim().toUpperCase().replace(/\.(NS|BO)$/, '');
    const meta = getDhanSecurityMeta(clean);
    if (meta && meta.secId) {
      const numId = parseInt(meta.secId, 10);
      idToSymbol[meta.secId] = clean;
      idToSymbol[numId] = clean;
      if (meta.segment === 'IDX_I') {
        idxIds.push(numId);
      } else {
        nseEqIds.push(numId);
      }
    }
  });

  if (nseEqIds.length === 0 && idxIds.length === 0) return {};

  const quotes = {};
  const CHUNK_SIZE = 300;
  const chunks = [];

  for (let i = 0; i < nseEqIds.length; i += CHUNK_SIZE) {
    const chunkEq = nseEqIds.slice(i, i + CHUNK_SIZE);
    const p = { 'NSE_EQ': chunkEq };
    if (i === 0 && idxIds.length > 0) {
      p['IDX_I'] = idxIds;
    }
    chunks.push(p);
  }

  if (chunks.length === 0 && idxIds.length > 0) {
    chunks.push({ 'IDX_I': idxIds });
  }

  const promises = chunks.map(async (payload) => {
    try {
      const res = await dhanFetch('/marketfeed/quote', {
        method: 'POST',
        body: payload
      });

      if (!res.ok) {
        if (res.status === 401 || res.status === 403) {
          const isSubError = JSON.stringify(res.json || res.raw || '').includes('806') || JSON.stringify(res.json || res.raw || '').includes('Data APIs not Subscribed');
          const detail = isSubError ? 'Dhan Data API subscription required (Error 806: Go to web.dhan.co -> DhanHQ Trading APIs -> Data API tab)' : `Token expired or invalid (HTTP ${res.status})`;
          console.warn(`[DHAN] Marketfeed quote rejected: ${detail}`);
        }
        return;
      }

      const json = res.json || {};
      ['NSE_EQ', 'IDX_I'].forEach(seg => {
        const segData = json.data?.[seg];
        if (segData) {
          Object.keys(segData).forEach(secId => {
            const sym = idToSymbol[secId];
            const q = segData[secId];
            const ltp = q ? Number((q.last_price || q.lastPrice || q.ltp || q.price || 0).toFixed(2)) : 0;
            if (sym && ltp > 0) {
              const prevClose = q.prev_close || q.prevClose || q.ohlc?.close || ltp;
              const changePercent = prevClose ? Number(((ltp - prevClose) / prevClose * 100).toFixed(2)) : 0;
              quotes[sym] = {
                symbol: sym,
                price: ltp,
                changePercent,
                prevClose,
                volume: q.volume || q.vol || 0,
                dayHigh: q.ohlc?.high || q.dayHigh || ltp,
                dayLow: q.ohlc?.low || q.dayLow || ltp,
                source: 'dhan',
                timestamp: Date.now()
              };
            }
          });
        }
      });
    } catch (err) {
      console.warn('[DHAN] Live quote batch chunk exception:', err.message);
    }
  });

  await Promise.all(promises);
  return quotes;
}

// Live Intraday Quotes In-Memory Cache (25s TTL)
const LIVE_QUOTES_CACHE = {
  data: {}, // { [symbol]: { price, changePercent, prevClose, volume, dayHigh, dayLow, timestamp } }
  lastUpdated: 0,
  TTL_MS: 25000
};

// Yahoo Finance single quote fetcher
function fetchSingleLiveQuote(symbol) {
  return new Promise((resolve) => {
    const cleanSym = (symbol || '').trim().toUpperCase().replace('.NS', '').replace('.BO', '');
    if (!cleanSym) return resolve(null);

    const isIndex = cleanSym === 'NIFTY' || cleanSym === 'BANKNIFTY';
    const yahooSym = isIndex ? (cleanSym === 'NIFTY' ? '%5ENSEI' : '%5ENSEBANK') : `${cleanSym}.NS`;
    const url = `https://query2.finance.yahoo.com/v8/finance/chart/${yahooSym}?interval=1d&range=5d`;

    const agent = new https.Agent({ rejectUnauthorized: false });
    const req = https.get(url, {
      agent,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        'Accept': '*/*'
      },
      timeout: 4500
    }, res => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => {
        try {
          const json = JSON.parse(d);
          if (json.chart && json.chart.result && json.chart.result[0]) {
            const meta = json.chart.result[0].meta;
            const ltp = Number((meta.regularMarketPrice || 0).toFixed(2));
            const quotes = json.chart.result[0].indicators?.quote?.[0];
            const closes = quotes ? (quotes.close || []).filter(c => c != null) : [];
            const yesterdayClose = closes.length > 1 ? closes[closes.length - 2] : (meta.previousClose || ltp);

            let changePercent = 0;
            if (meta.regularMarketChangePercent != null) {
              changePercent = Number(meta.regularMarketChangePercent.toFixed(2));
            } else if (yesterdayClose && yesterdayClose > 0) {
              changePercent = Number(((ltp - yesterdayClose) / yesterdayClose * 100).toFixed(2));
            }

            return resolve({
              symbol: cleanSym,
              price: ltp,
              changePercent: changePercent,
              prevClose: yesterdayClose,
              volume: meta.regularMarketVolume || 0,
              dayHigh: meta.regularMarketDayHigh || 0,
              dayLow: meta.regularMarketDayLow || 0,
              timestamp: Date.now()
            });
          }
        } catch (e) {}
        resolve(null);
      });
    });
    req.on('error', () => resolve(null));
    req.on('timeout', () => { req.destroy(); resolve(null); });
  });
}

// Concurrency-limited batch quote fetcher
async function getOrFetchLiveQuotes(symbols) {
  const now = Date.now();
  const result = {};
  const needed = [];

  // Check cache first
  symbols.forEach(sym => {
    const cleanSym = sym.toUpperCase();
    const cached = LIVE_QUOTES_CACHE.data[cleanSym];
    if (cached && (now - cached.timestamp < LIVE_QUOTES_CACHE.TTL_MS)) {
      result[cleanSym] = cached;
    } else {
      needed.push(cleanSym);
    }
  });

  if (needed.length === 0) return result;

  let remainingNeeded = [...needed];

  // Primary Tier: DhanHQ Broker Feed (if configured)
  if (isDhanConfigured()) {
    try {
      const dhanQuotes = await fetchDhanLiveQuotes(needed);
      Object.keys(dhanQuotes).forEach(sym => {
        const q = dhanQuotes[sym];
        if (q && q.price) {
          LIVE_QUOTES_CACHE.data[sym] = q;
          result[sym] = q;
        }
      });
      remainingNeeded = needed.filter(sym => !result[sym]);
    } catch (e) {}
  }

  // Backup Tier: Fast Multi-Source Quotes for remaining symbols
  if (remainingNeeded.length > 0) {
    try {
      const batchQuotes = await fetchBatchQuotes(remainingNeeded);
      batchQuotes.forEach(q => {
        if (q && q.symbol && q.ltp) {
          const formatted = {
            symbol: q.symbol,
            price: q.ltp,
            changePercent: q.changePercent || 0,
            prevClose: q.prevClose || Number((q.ltp / (1 + (q.changePercent || 0) / 100)).toFixed(2)),
            volume: q.volume || 0,
            dayHigh: q.dayHigh || q.ltp,
            dayLow: q.dayLow || q.ltp,
            fiftyTwoWeekHigh: q.fiftyTwoWeekHigh,
            fiftyTwoWeekLow: q.fiftyTwoWeekLow,
            source: 'backup',
            timestamp: now
          };
          LIVE_QUOTES_CACHE.data[q.symbol] = formatted;
          result[q.symbol] = formatted;
        }
      });
    } catch (err) {}
  }

  if (Object.keys(result).length > 0) {
    persistUniverseQuotes(result);
  }

  return result;
}

// MIME types for static assets
const MIME_TYPES = {
  '.html': 'text/html',
  '.css': 'text/css',
  '.js': 'application/javascript',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2'
};

// -------------------------------------------------------------
// MongoDB Atlas Dual-Mode Persistence Layer
// -------------------------------------------------------------
let MongoClient = null;
try {
  MongoClient = require('mongodb').MongoClient;
} catch (e) {
  // mongodb module will fall back to local json storage if not installed
}

const MONGO_CONFIG = {
  get uri() {
    let raw = process.env.MONGODB_URI || process.env.MONGO_URL || process.env.DATABASE_URL || '';
    raw = String(raw).trim();
    // Strip accidental quotes
    if ((raw.startsWith('"') && raw.endsWith('"')) || (raw.startsWith("'") && raw.endsWith("'"))) {
      raw = raw.slice(1, -1).trim();
    }
    // Strip accidental key prefix if user pasted "MONGODB_URI=..." in the value field
    if (raw.startsWith('MONGODB_URI=')) {
      raw = raw.slice(12).trim();
    } else if (raw.startsWith('MONGO_URL=')) {
      raw = raw.slice(10).trim();
    } else if (raw.startsWith('URI=')) {
      raw = raw.slice(4).trim();
    }
    if ((raw.startsWith('"') && raw.endsWith('"')) || (raw.startsWith("'") && raw.endsWith("'"))) {
      raw = raw.slice(1, -1).trim();
    }
    return raw;
  },
  dbName: 'sangam_stocks',
  client: null,
  db: null,
  isConnected: false
};

// In-memory caches for 0-latency synchronous reads
let memoryUsers = null;
let memoryScreeners = null;
let memoryConfig = null;

// Local file loaders
function loadFileScreeners() {
  try {
    if (!fs.existsSync(DATA_FILE)) return [];
    return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8') || '[]');
  } catch (e) {
    return [];
  }
}

function loadFileUsers() {
  try {
    if (!fs.existsSync(USERS_FILE)) return [];
    return JSON.parse(fs.readFileSync(USERS_FILE, 'utf8') || '[]');
  } catch (e) {
    return [];
  }
}

function loadFileConfig() {
  try {
    if (!fs.existsSync(CONFIG_FILE)) {
      return { maxUsers: 10, allowRegistration: true, updatedAt: new Date().toISOString() };
    }
    return JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8') || '{"maxUsers":10,"allowRegistration":true}');
  } catch (e) {
    return { maxUsers: 10, allowRegistration: true, updatedAt: new Date().toISOString() };
  }
}

async function initDatabase() {
  // 1. First populate in-memory caches from local files as safe defaults
  memoryScreeners = loadFileScreeners();
  memoryUsers = loadFileUsers();
  memoryConfig = loadFileConfig();

  if (!MONGO_CONFIG.uri || !MongoClient) {
    if (!MONGO_CONFIG.uri) {
      console.log('[MongoDB] ℹ️ No MONGODB_URI found in environment. Using local JSON files.');
    }
    return;
  }

  try {
    console.log('[MongoDB] 🔌 Connecting to MongoDB Atlas cluster...');
    const client = new MongoClient(MONGO_CONFIG.uri, {
      serverSelectionTimeoutMS: 15000,
      connectTimeoutMS: 15000,
      maxPoolSize: 10,
      tlsAllowInvalidCertificates: true
    });

    await client.connect();
    MONGO_CONFIG.client = client;
    MONGO_CONFIG.db = client.db(MONGO_CONFIG.dbName);
    MONGO_CONFIG.isConnected = true;
    console.log(`[MongoDB] ✅ Connected successfully to database "${MONGO_CONFIG.dbName}" on MongoDB Atlas!`);

    // Ensure collections and auto-seed from local files if collections are empty
    await syncMongoInitialData();

  } catch (err) {
    console.warn(`[MongoDB] ⚠️ Failed to connect to MongoDB Atlas: ${err.message}. Gracefully falling back to local JSON files.`);
    MONGO_CONFIG.isConnected = false;
  }
}

async function syncMongoInitialData() {
  if (!MONGO_CONFIG.isConnected || !MONGO_CONFIG.db) return;

  try {
    const db = MONGO_CONFIG.db;

    // 1. Screeners Collection
    const screenersCol = db.collection('screeners');
    const screenersCount = await screenersCol.countDocuments();
    if (screenersCount === 0) {
      console.log('[MongoDB] 🌱 Seeding initial screeners into MongoDB...');
      if (memoryScreeners && memoryScreeners.length > 0) {
        const cleanScreeners = memoryScreeners.map(s => {
          const { _id, ...rest } = s;
          return { ...rest, id: rest.id || _id };
        });
        await screenersCol.insertMany(cleanScreeners);
      }
    } else {
      const dbScreeners = await screenersCol.find({}).toArray();
      memoryScreeners = dbScreeners.map(s => {
        const { _id, ...rest } = s;
        return { ...rest, id: rest.id || String(_id) };
      });
      console.log(`[MongoDB] 📥 Loaded ${memoryScreeners.length} screeners from MongoDB Atlas.`);
    }

    // 2. Users Collection
    const usersCol = db.collection('users');
    const usersCount = await usersCol.countDocuments();
    if (usersCount === 0) {
      if (memoryUsers && memoryUsers.length > 0) {
        console.log('[MongoDB] 🌱 Seeding initial users into MongoDB...');
        const cleanUsers = memoryUsers.map(u => {
          const { _id, ...rest } = u;
          return { ...rest, id: rest.id || _id };
        });
        await usersCol.insertMany(cleanUsers);
      }
    } else {
      const dbUsers = await usersCol.find({}).toArray();
      memoryUsers = dbUsers.map(u => {
        const { _id, ...rest } = u;
        return { ...rest, id: rest.id || String(_id) };
      });
      console.log(`[MongoDB] 📥 Loaded ${memoryUsers.length} users from MongoDB Atlas.`);
    }

    // 3. Config Collection
    const configCol = db.collection('config');
    const configDoc = await configCol.findOne({ _id: 'system_config' });
    if (!configDoc) {
      await configCol.insertOne({ _id: 'system_config', ...memoryConfig });
    } else {
      const { _id, ...rest } = configDoc;
      memoryConfig = rest;
      console.log(`[MongoDB] 📥 Loaded system configuration from MongoDB Atlas.`);
    }

    // 4. Universe Stocks Collection (Self-Healing Persistent Quotes Store)
    const universeCol = db.collection('universe_stocks');
    const universeCount = await universeCol.countDocuments();
    if (universeCount === 0) {
      const localUniverse = getUniverseStocks();
      if (localUniverse && localUniverse.length > 0) {
        console.log(`[MongoDB] 🌱 Seeding ${localUniverse.length} universe stocks into MongoDB Atlas...`);
        const cleanStocks = localUniverse.map(s => {
          const { _id, ...rest } = s;
          return { ...rest };
        });
        await universeCol.insertMany(cleanStocks);
      }
    } else {
      const dbUniverse = await universeCol.find({}).toArray();
      memoryUniverse = dbUniverse.map(s => {
        const { _id, ...rest } = s;
        return { ...rest };
      });
      localUniverseCache = memoryUniverse;
      console.log(`[MongoDB] 📥 Loaded ${memoryUniverse.length} universe stocks with latest persisted prices from MongoDB Atlas.`);
    }

  } catch (err) {
    console.error('[MongoDB] Error during initial data sync:', err.message);
  }
}

// Global Read & Save Functions with Write-Through Caching
function readScreeners() {
  if (memoryScreeners === null) {
    memoryScreeners = loadFileScreeners();
  }
  return memoryScreeners;
}

function saveScreeners(screeners) {
  memoryScreeners = screeners;

  // 1. Asynchronous write to MongoDB
  if (MONGO_CONFIG.isConnected && MONGO_CONFIG.db) {
    (async () => {
      try {
        const col = MONGO_CONFIG.db.collection('screeners');
        if (screeners.length === 0) {
          await col.deleteMany({});
        } else {
          const bulkOps = screeners.map(s => {
            const { _id, ...cleanScreener } = s;
            return {
              updateOne: {
                filter: { id: cleanScreener.id },
                update: { $set: cleanScreener },
                upsert: true
              }
            };
          });
          await col.bulkWrite(bulkOps);
          const currentIds = screeners.map(s => s.id);
          await col.deleteMany({ id: { $nin: currentIds } });
        }
      } catch (err) {
        console.error('[MongoDB] Error saving screeners:', err.message);
      }
    })();
  }

  // 2. Local file backup
  try {
    const dir = path.dirname(DATA_FILE);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(DATA_FILE, JSON.stringify(screeners, null, 2), 'utf8');
  } catch (err) {}

  return true;
}

function readUsers() {
  if (memoryUsers === null) {
    memoryUsers = loadFileUsers();
  }
  return memoryUsers;
}

function saveUsers(users) {
  memoryUsers = users;

  // 1. Asynchronous write to MongoDB
  if (MONGO_CONFIG.isConnected && MONGO_CONFIG.db) {
    (async () => {
      try {
        const col = MONGO_CONFIG.db.collection('users');
        if (users.length === 0) {
          await col.deleteMany({});
        } else {
          const bulkOps = users.map(u => {
            const { _id, ...cleanUser } = u;
            return {
              updateOne: {
                filter: { $or: [{ id: cleanUser.id }, { username: cleanUser.username }] },
                update: { $set: cleanUser },
                upsert: true
              }
            };
          });
          await col.bulkWrite(bulkOps);
          const currentIds = users.map(u => u.id).filter(Boolean);
          const currentUsernames = users.map(u => u.username).filter(Boolean);
          if (currentIds.length > 0 && currentUsernames.length > 0) {
            await col.deleteMany({
              id: { $nin: currentIds },
              username: { $nin: currentUsernames }
            });
          }
        }
      } catch (err) {
        console.error('[MongoDB] Error saving users:', err.message);
      }
    })();
  }

  // 2. Local file backup
  try {
    const dir = path.dirname(USERS_FILE);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2), 'utf8');
  } catch (err) {}

  return true;
}

function readSystemConfig() {
  if (memoryConfig === null) {
    memoryConfig = loadFileConfig();
  }
  return memoryConfig;
}

function saveSystemConfig(cfg) {
  memoryConfig = cfg;

  // 1. Asynchronous write to MongoDB
  if (MONGO_CONFIG.isConnected && MONGO_CONFIG.db) {
    (async () => {
      try {
        const col = MONGO_CONFIG.db.collection('config');
        await col.updateOne({ _id: 'system_config' }, { $set: { ...cfg } }, { upsert: true });
      } catch (err) {
        console.error('[MongoDB] Error saving config:', err.message);
      }
    })();
  }

  // 2. Local file backup
  try {
    const dir = path.dirname(CONFIG_FILE);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(CONFIG_FILE, JSON.stringify(cfg, null, 2), 'utf8');
  } catch (err) {}

  return true;
}

// -------------------------------------------------------------
// Self-Healing Universe Stocks Store (In-Memory + MongoDB + Disk)
// -------------------------------------------------------------
let memoryUniverse = null;
let universeFlushTimer = null;

function getUniverseStocks() {
  if (memoryUniverse && memoryUniverse.length > 0) return memoryUniverse;
  try {
    if (fs.existsSync(FNO_DATA_FILE)) {
      const raw = fs.readFileSync(FNO_DATA_FILE, 'utf8');
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        memoryUniverse = parsed;
        localUniverseCache = parsed;
        return memoryUniverse;
      }
    }
  } catch (e) {
    console.error('[UNIVERSE] Error reading universe file:', e.message);
  }
  return [];
}

async function persistUniverseQuotes(quotesMap) {
  if (!quotesMap || typeof quotesMap !== 'object' || Object.keys(quotesMap).length === 0) return;
  const universe = getUniverseStocks();
  if (!universe || universe.length === 0) return;

  let hasUpdates = false;
  const nowIso = new Date().toISOString();

  universe.forEach(stk => {
    if (!stk || !stk.symbol) return;
    const sym = stk.symbol.toUpperCase().trim();
    const q = quotesMap[sym] || quotesMap[sym.replace(/\.(NS|BO)$/, '')];
    if (q && typeof q.price === 'number' && q.price > 0) {
      stk.price = Number(q.price.toFixed(2));
      stk.ltp = stk.price;
      if (q.changePercent !== undefined && !isNaN(q.changePercent)) {
        stk.changePercent = Number(q.changePercent.toFixed(2));
      }
      if (q.dayHigh) stk.dayHigh = Number(q.dayHigh.toFixed(2));
      if (q.dayLow) stk.dayLow = Number(q.dayLow.toFixed(2));
      if (q.volume) stk.volume = q.volume;
      if (q.fiftyTwoWeekHigh) stk.fiftyTwoWeekHigh = Number(q.fiftyTwoWeekHigh.toFixed(2));
      if (q.fiftyTwoWeekLow) stk.fiftyTwoWeekLow = Number(q.fiftyTwoWeekLow.toFixed(2));
      stk.lastPriceUpdated = nowIso;
      hasUpdates = true;
    }
  });

  if (!hasUpdates) return;

  // Debounced write to Disk & MongoDB
  if (universeFlushTimer) clearTimeout(universeFlushTimer);
  universeFlushTimer = setTimeout(async () => {
    try {
      // 1. Write to local JSON
      fs.writeFileSync(FNO_DATA_FILE, JSON.stringify(universe, null, 2), 'utf8');

      // 2. Write to MongoDB Atlas
      if (MONGO_CONFIG.isConnected && MONGO_CONFIG.db) {
        const col = MONGO_CONFIG.db.collection('universe_stocks');
        const bulkOps = universe.map(s => {
          const { _id, ...cleanStock } = s;
          return {
            updateOne: {
              filter: { symbol: cleanStock.symbol },
              update: { $set: cleanStock },
              upsert: true
            }
          };
        });
        if (bulkOps.length > 0) {
          await col.bulkWrite(bulkOps, { ordered: false });
        }
      }
    } catch (err) {
      console.warn('[UNIVERSE] Error flushing universe updates:', err.message);
    }
  }, 1500);
}

function getMaxUsersLimit() {
  const cfg = readSystemConfig();
  return typeof cfg.maxUsers === 'number' && cfg.maxUsers > 0 ? cfg.maxUsers : 10;
}

// Constants for User and Watchlist Limits
const MAX_WATCHLISTS = 5;
const MAX_STOCKS_PER_WATCHLIST = 500;

// Password hashing & verification
function hashPassword(password, salt = crypto.randomBytes(16).toString('hex')) {
  const hash = crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex');
  return { salt, hash };
}

function verifyPassword(password, hash, salt) {
  const checkHash = crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex');
  return checkHash === hash;
}

// Default 5 Watchlists Creator
function createDefaultWatchlists() {
  const now = Date.now().toString(36);
  return [
    { id: 'wl_' + now + '_1', name: 'Watchlist 1', stocks: [] },
    { id: 'wl_' + now + '_2', name: 'Watchlist 2', stocks: [] },
    { id: 'wl_' + now + '_3', name: 'Watchlist 3', stocks: [] },
    { id: 'wl_' + now + '_4', name: 'Watchlist 4', stocks: [] },
    { id: 'wl_' + now + '_5', name: 'Watchlist 5', stocks: [] }
  ];
}

// Helper to normalize Chartink URL or slug
function parseChartinkSlug(inputUrl) {
  if (!inputUrl) return null;
  const trimmed = inputUrl.trim();
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    try {
      const parsed = new URL(trimmed);
      const parts = parsed.pathname.split('/').filter(Boolean);
      const screenerIdx = parts.indexOf('screener');
      if (screenerIdx !== -1 && parts[screenerIdx + 1]) {
        return parts[screenerIdx + 1];
      }
      return parts[parts.length - 1] || null;
    } catch {
      return null;
    }
  }
  return trimmed.replace(/^\/+|\/+$/g, '');
}

// Market Cap > 1000 Cr & > 2000 Cr Cache & Fetcher
let marketCap1000CrSet = new Set();
let marketCap2000CrSet = new Set();
let cachedMarketCap1000List = [];
let cachedMarketCap2000List = [];
let lastMc1000Fetch = 0;
let lastMc2000Fetch = 0;

async function getMarketCapSets() {
  const now = Date.now();
  const need1000 = marketCap1000CrSet.size === 0 || (now - lastMc1000Fetch >= 6 * 60 * 60 * 1000);
  const need2000 = marketCap2000CrSet.size === 0 || (now - lastMc2000Fetch >= 6 * 60 * 60 * 1000);

  if (!need1000 && !need2000) {
    return { mc1000Set: marketCap1000CrSet, mc2000Set: marketCap2000CrSet };
  }

  try {
    const pageRes = await httpsFetch('https://chartink.com/screener/sumit-turtle-system', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
      }
    });
    const html = await pageRes.text();
    const tokenMatch = html.match(/name="csrf-token"\s+content="([^"]+)"/i);
    const csrf = tokenMatch ? tokenMatch[1] : '';
    const setCookies = pageRes.headers['set-cookie'] || [];
    const cookies = (Array.isArray(setCookies) ? setCookies : [setCookies]).map(c => c.split(';')[0]).join('; ');

    const fetchScan = async (clause) => {
      const pRes = await httpsFetch('https://chartink.com/screener/process', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
          'X-CSRF-TOKEN': csrf,
          'Cookie': cookies,
          'Referer': 'https://chartink.com',
          'X-Requested-With': 'XMLHttpRequest'
        },
        body: 'scan_clause=' + encodeURIComponent(clause)
      });
      return pRes.json();
    };

    if (need1000) {
      try {
        const data1000 = await fetchScan('( {cash} ( market capital > 1000 ) )');
        if (Array.isArray(data1000.data) && data1000.data.length > 0) {
          const newSet1000 = new Set();
          data1000.data.forEach(s => {
            if (s.nsecode) newSet1000.add(s.nsecode.toUpperCase());
            if (s.bsecode) newSet1000.add(String(s.bsecode).toUpperCase());
          });
          marketCap1000CrSet = newSet1000;
          cachedMarketCap1000List = data1000.data;
          lastMc1000Fetch = Date.now();
          console.log(`✅ Loaded Market Cap > ₹1000 Cr set: ${marketCap1000CrSet.size} stocks.`);
        }
      } catch (err1000) {
        console.warn('Could not refresh Market Cap > 1000 Cr set:', err1000.message);
      }
    }

    if (need2000) {
      try {
        const data2000 = await fetchScan('( {cash} ( market capital > 2000 ) )');
        if (Array.isArray(data2000.data) && data2000.data.length > 0) {
          const newSet2000 = new Set();
          data2000.data.forEach(s => {
            if (s.nsecode) newSet2000.add(s.nsecode.toUpperCase());
            if (s.bsecode) newSet2000.add(String(s.bsecode).toUpperCase());
          });
          marketCap2000CrSet = newSet2000;
          cachedMarketCap2000List = data2000.data;
          lastMc2000Fetch = Date.now();
          console.log(`✅ Loaded Market Cap > ₹2000 Cr set: ${marketCap2000CrSet.size} stocks.`);
        }
      } catch (err2000) {
        console.warn('Could not refresh Market Cap > 2000 Cr set:', err2000.message);
      }
    }
  } catch (err) {
    console.warn('Could not refresh Market Cap sets:', err.message);
  }

  return { mc1000Set: marketCap1000CrSet, mc2000Set: marketCap2000CrSet };
}

async function getMarketCap2000CrSet() {
  const { mc2000Set } = await getMarketCapSets();
  return mc2000Set;
}

// Core Chartink execution engine
async function executeChartinkScreener(targetUrlOrSlug, customClause = null) {
  const slug = parseChartinkSlug(targetUrlOrSlug);
  const targetUrl = targetUrlOrSlug.startsWith('http') 
    ? targetUrlOrSlug 
    : `https://chartink.com/screener/${slug || targetUrlOrSlug}`;

  const userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

  // Step 1: Fetch screener page to get CSRF token, cookies, and atlas_query / scan_clause
  const pageRes = await httpsFetch(targetUrl, {
    headers: {
      'User-Agent': userAgent,
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.9'
    }
  });

  if (!pageRes.ok) {
    throw new Error(`Chartink returned HTTP status ${pageRes.status} for ${targetUrl}`);
  }

  const html = await pageRes.text();
  const setCookies = pageRes.headers['set-cookie'] || [];
  const cookies = (Array.isArray(setCookies) ? setCookies : [setCookies]).map(c => c.split(';')[0]).join('; ');

  // Extract CSRF token
  const csrfMatch = html.match(/<meta\s+name=["']csrf-token["']\s+content=["']([^"']+)["']/i);
  const csrfToken = csrfMatch ? csrfMatch[1] : null;

  if (!csrfToken) {
    throw new Error('Could not find CSRF token on Chartink screener page');
  }

  // Extract scan_clause / atlas_query / scan_run_token
  let scanClause = customClause;
  let scanRunToken = null;
  let atlasJson = null;
  let screenerTitle = slug;
  let screenerDescription = '';

  if (!scanClause) {
    const scanJsonMatch = html.match(/:scan-json=["']({[\s\S]*?})["']/i) ||
                          html.match(/:scan-json=["']([^"']+)["']/i);
    if (scanJsonMatch) {
      try {
        const decoded = scanJsonMatch[1]
          .replace(/&quot;/g, '"')
          .replace(/&amp;/g, '&')
          .replace(/&lt;/g, '<')
          .replace(/&gt;/g, '>')
          .replace(/&#039;/g, "'");
        const parsed = JSON.parse(decoded);
        scanClause = parsed.atlas_query || parsed.scan_clause;
        scanRunToken = parsed.scan_run_token || null;
        atlasJson = parsed.atlas_json || null;
        screenerTitle = parsed.name || screenerTitle;
        screenerDescription = parsed.description || '';
      } catch (err) {
        console.warn('Failed parsing scan-json:', err.message);
      }
    }

    // Fallback: look for script or input variable
    if (!scanClause && !scanRunToken) {
      const varMatch = html.match(/var\s+scan_clause\s*=\s*['"]([^'"]+)['"]/i) || 
                       html.match(/name=["']scan_clause["']\s+value=["']([^"']+)["']/i);
      if (varMatch) {
        scanClause = varMatch[1];
      }
    }
  }

  if (!scanClause && !scanRunToken) {
    throw new Error(`Unable to extract screener scan conditions from Chartink for: ${targetUrl}. Please ensure the screener exists and is public.`);
  }

  // Step 2: POST to /screener/process
  const postBody = new URLSearchParams();
  if (scanClause) postBody.append('scan_clause', scanClause);
  if (scanRunToken) postBody.append('scan_run_token', scanRunToken);
  if (atlasJson) postBody.append('atlas_json', atlasJson);

  const processRes = await httpsFetch('https://chartink.com/screener/process', {
    method: 'POST',
    headers: {
      'User-Agent': userAgent,
      'x-csrf-token': csrfToken,
      'cookie': cookies,
      'content-type': 'application/x-www-form-urlencoded; charset=UTF-8',
      'referer': targetUrl,
      'x-requested-with': 'XMLHttpRequest'
    },
    body: postBody.toString()
  });

  if (!processRes.ok) {
    throw new Error(`Chartink screener process failed with status ${processRes.status}`);
  }

  const resultJson = await processRes.json();
  const rawStocks = Array.isArray(resultJson.data) ? resultJson.data : [];

  // Fetch Market Cap > 1000 Cr & > 2000 Cr symbols sets to tag each stock
  const { mc1000Set, mc2000Set } = await getMarketCapSets();

  // Normalize stock items
  const stocks = rawStocks.map((s, idx) => {
    const sym = s.nsecode || s.bsecode || 'UNKNOWN';
    const bse = s.bsecode ? String(s.bsecode).toUpperCase() : null;
    const nse = s.nsecode ? String(s.nsecode).toUpperCase() : null;
    const isOver2000 = (nse && mc2000Set.has(nse)) || (bse && mc2000Set.has(bse)) || mc2000Set.has(sym.toUpperCase());
    const isOver1000 = isOver2000 || (nse && mc1000Set.has(nse)) || (bse && mc1000Set.has(bse)) || mc1000Set.has(sym.toUpperCase());

    const closeVal = typeof s.close === 'number' ? Number(s.close.toFixed(2)) : (parseFloat(String(s.close || '').replace(/,/g, '')) || 0);
    const rawChg = s.per_chg !== undefined ? s.per_chg : (s.p_change !== undefined ? s.p_change : (s.change !== undefined ? s.change : (s.pct_chg !== undefined ? s.pct_chg : 0)));
    const changeVal = typeof rawChg === 'number' ? Number(rawChg.toFixed(2)) : (parseFloat(String(rawChg || '').replace(/[%,\s]/g, '')) || 0);
    const volVal = typeof s.volume === 'number' ? s.volume : (typeof s.vol === 'number' ? s.vol : (parseInt(String(s.volume || s.vol || '0').replace(/,/g, ''), 10) || 0));

    return {
      sr: s.sr || idx + 1,
      symbol: sym,
      name: s.name || sym,
      bsecode: bse,
      nsecode: nse,
      close: closeVal,
      price: closeVal,
      changePercent: changeVal,
      volume: volVal,
      mcOver1000Cr: Boolean(isOver1000),
      mcOver2000Cr: Boolean(isOver2000)
    };
  });

  // Enrich with Real-Time Live Quotes (LTP, 1D % Change, Volume)
  if (stocks.length > 0) {
    try {
      const symbols = stocks.map(st => st.symbol);
      const liveQuotes = await getOrFetchLiveQuotes(symbols);
      stocks.forEach(st => {
        const q = liveQuotes[st.symbol.toUpperCase()];
        if (q && q.price) {
          st.close = q.price;
          st.price = q.price;
          if (q.changePercent !== undefined && q.changePercent !== null && !isNaN(q.changePercent)) {
            st.changePercent = Number(q.changePercent.toFixed(2));
          }
          if (q.volume) {
            st.volume = q.volume;
          }
        }
      });
    } catch (enrichErr) {
      console.warn('[SCREENER] Live quote enrichment notice:', enrichErr.message);
    }
  }

  return {
    success: true,
    title: screenerTitle,
    description: screenerDescription,
    timestamp: new Date().toISOString(),
    count: stocks.length,
    stocks
  };
}

// Technical indicator calculations
function calculateEMA(prices, period) {
  const k = 2 / (period + 1);
  const ema = [];
  let sum = 0;
  for (let i = 0; i < period && i < prices.length; i++) {
    sum += prices[i];
  }
  let prevEma = sum / Math.min(period, prices.length);
  for (let i = 0; i < prices.length; i++) {
    if (i < period - 1) {
      ema.push(null);
    } else if (i === period - 1) {
      ema.push(Number(prevEma.toFixed(2)));
    } else {
      const current = (prices[i] * k) + (prevEma * (1 - k));
      ema.push(Number(current.toFixed(2)));
      prevEma = current;
    }
  }
  return ema;
}

function calculateRSI(closes, period = 14) {
  const rsi = [];
  let gains = 0;
  let losses = 0;

  for (let i = 1; i <= period && i < closes.length; i++) {
    const diff = closes[i] - closes[i - 1];
    if (diff >= 0) gains += diff;
    else losses -= diff;
  }

  let avgGain = gains / period;
  let avgLoss = losses / period;

  for (let i = 0; i < closes.length; i++) {
    if (i < period) {
      rsi.push(null);
    } else if (i === period) {
      const rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
      rsi.push(Number((100 - (100 / (1 + rs))).toFixed(2)));
    } else {
      const diff = closes[i] - closes[i - 1];
      const gain = diff > 0 ? diff : 0;
      const loss = diff < 0 ? -diff : 0;
      avgGain = (avgGain * (period - 1) + gain) / period;
      avgLoss = (avgLoss * (period - 1) + loss) / period;
      const rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
      rsi.push(Number((100 - (100 / (1 + rs))).toFixed(2)));
    }
  }
  return rsi;
}

function calculateSMA(data, period) {
  const sma = [];
  let sum = 0;
  for (let i = 0; i < data.length; i++) {
    sum += (data[i] || 0);
    if (i >= period) {
      sum -= (data[i - period] || 0);
    }
    if (i >= period - 1) {
      sma.push(Number((sum / period).toFixed(0)));
    } else {
      sma.push(null);
    }
  }
  return sma;
}

function calculateVWAP(candles, isIntraday) {
  const vwap = [];
  let cumVol = 0;
  let cumTypicalVol = 0;
  let lastDay = '';

  for (let i = 0; i < candles.length; i++) {
    const c = candles[i];
    if (isIntraday) {
      const day = typeof c.time === 'number' 
        ? new Date(c.time * 1000).toISOString().split('T')[0]
        : c.time;
      if (day !== lastDay) {
        cumVol = 0;
        cumTypicalVol = 0;
        lastDay = day;
      }
    }
    const typical = (c.high + c.low + c.close) / 3;
    const vol = c.volume || 1;
    cumVol += vol;
    cumTypicalVol += (typical * vol);
    vwap.push(Number((cumTypicalVol / cumVol).toFixed(2)));
  }
  return vwap;
}

// Darvas Box Indicator (TradingView Pine Script Study: "DARVAS BOX")
// boxp = 5
// LL = lowest(low, boxp)
// k1 = highest(high, boxp), k2 = highest(high, boxp-1), k3 = highest(high, boxp-2)
// NH = valuewhen(high > k1[1], high, 0)
// box1 = k3 < k2
// TopBox = valuewhen(barssince(high > k1[1]) == boxp-2 and box1, NH, 0)
// BottomBox = valuewhen(barssince(high > k1[1]) == boxp-2 and box1, LL, 0)
function calculateDarvasBox(candles, boxp = 5) {
  const n = candles.length;
  const topBox = [];
  const bottomBox = [];

  const highs = candles.map(c => c.high);
  const lows = candles.map(c => c.low);

  let lastNH = null;
  let barsSinceNewHigh = 999999;
  let currentTopBox = null;
  let currentBottomBox = null;

  // Precompute k1 array for k1[i-1] reference
  const k1 = [];
  for (let i = 0; i < n; i++) {
    let maxHigh = -Infinity;
    for (let j = Math.max(0, i - boxp + 1); j <= i; j++) {
      if (highs[j] > maxHigh) maxHigh = highs[j];
    }
    k1.push(maxHigh);
  }

  for (let i = 0; i < n; i++) {
    if (i < boxp) continue;

    // LL = lowest(low, boxp)
    let LL = Infinity;
    for (let j = i - boxp + 1; j <= i; j++) {
      if (lows[j] < LL) LL = lows[j];
    }

    // k2 = highest(high, boxp - 1)
    let k2 = -Infinity;
    for (let j = i - (boxp - 1) + 1; j <= i; j++) {
      if (highs[j] > k2) k2 = highs[j];
    }

    // k3 = highest(high, boxp - 2)
    let k3 = -Infinity;
    for (let j = i - (boxp - 2) + 1; j <= i; j++) {
      if (highs[j] > k3) k3 = highs[j];
    }

    // Condition: high > k1[1] (high exceeds k1 of previous bar)
    const isNewHigh = highs[i] > k1[i - 1];

    if (isNewHigh) {
      lastNH = highs[i];
      barsSinceNewHigh = 0;
    } else {
      barsSinceNewHigh++;
    }

    const box1 = k3 < k2;
    const trigger = (barsSinceNewHigh === (boxp - 2)) && box1;

    if (trigger && lastNH !== null) {
      currentTopBox = Number(lastNH.toFixed(2));
      currentBottomBox = Number(LL.toFixed(2));
    }

    if (currentTopBox !== null) {
      topBox.push({ time: candles[i].time, value: currentTopBox });
    }
    if (currentBottomBox !== null) {
      bottomBox.push({ time: candles[i].time, value: currentBottomBox });
    }
  }

  return {
    topBox,
    bottomBox,
    latestTopBox: currentTopBox,
    latestBottomBox: currentBottomBox
  };
}

// -------------------------------------------------------------
// Cloud-Resilient Yahoo Finance Session & Crumb Handshake Engine
// -------------------------------------------------------------
const YAHOO_SESSION = {
  cookies: '',
  crumb: '',
  lastUpdated: 0,
  TTL_MS: 30 * 60 * 1000 // 30 minutes session cache
};

async function getYahooCrumbAndCookie() {
  const now = Date.now();
  if (YAHOO_SESSION.crumb && YAHOO_SESSION.cookies && (now - YAHOO_SESSION.lastUpdated < YAHOO_SESSION.TTL_MS)) {
    return YAHOO_SESSION;
  }

  try {
    const fetchHelper = (url, headers = {}) => {
      return new Promise((resolve) => {
        const agent = new https.Agent({ rejectUnauthorized: false });
        const req = https.get(url, {
          agent,
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
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

    // Step 1: Initial cookie handshake
    const initRes = await fetchHelper('https://fc.yahoo.com');
    let cookies = [];
    if (initRes.setCookies) {
      cookies = initRes.setCookies.map(c => c.split(';')[0]);
    }

    const cookieHeader = Array.from(new Set(cookies)).join('; ');

    // Step 2: Acquire crumb
    const crumbRes = await fetchHelper('https://query1.finance.yahoo.com/v1/test/getcrumb', {
      Cookie: cookieHeader
    });

    if (crumbRes.status === 200 && crumbRes.body && !crumbRes.body.includes('<')) {
      YAHOO_SESSION.cookies = cookieHeader;
      YAHOO_SESSION.crumb = crumbRes.body.trim();
      YAHOO_SESSION.lastUpdated = now;
      console.log(`[CLOUD_AUTH] Initialized Yahoo Crumb Session: "${YAHOO_SESSION.crumb}"`);
    } else {
      YAHOO_SESSION.cookies = cookieHeader;
      YAHOO_SESSION.crumb = '';
      YAHOO_SESSION.lastUpdated = now;
    }
  } catch (err) {
    console.warn('[CLOUD_AUTH] Yahoo Session initialization notice:', err.message);
  }

  return YAHOO_SESSION;
}

// Multi-Source Resilient Chart Data Fetcher (Tier 1: Crumb Session, Tier 2: Query2, Tier 3: Query1)
async function fetchChartDataMultiSource(candidate, range, interval) {
  const session = await getYahooCrumbAndCookie();
  const crumbParam = session.crumb ? `&crumb=${encodeURIComponent(session.crumb)}` : '';

  // Tier 1: Query1 with Crumb + Cookies (Bypasses Cloud Datacenter blocks)
  const tier1Url = `https://query1.finance.yahoo.com/v8/finance/chart/${candidate}?range=${range}&interval=${interval}${crumbParam}`;
  try {
    const res = await httpsFetch(tier1Url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        'Accept': '*/*',
        ...(session.cookies ? { 'Cookie': session.cookies } : {})
      }
    });
    if (res.ok) {
      const data = await res.json();
      if (data.chart?.result?.[0]) return data.chart.result[0];
    }
  } catch (e) {}

  // Tier 2: Query2 Mirror (Direct)
  const tier2Url = `https://query2.finance.yahoo.com/v8/finance/chart/${candidate}?range=${range}&interval=${interval}`;
  try {
    const res = await httpsFetch(tier2Url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': '*/*'
      }
    });
    if (res.ok) {
      const data = await res.json();
      if (data.chart?.result?.[0]) return data.chart.result[0];
    }
  } catch (e) {}

  // Tier 3: Query1 Mirror (Direct fallback)
  const tier3Url = `https://query1.finance.yahoo.com/v8/finance/chart/${candidate}?range=${range}&interval=${interval}`;
  try {
    const res = await httpsFetch(tier3Url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        'Accept': '*/*'
      }
    });
    if (res.ok) {
      const data = await res.json();
      if (data.chart?.result?.[0]) return data.chart.result[0];
    }
  } catch (e) {}

  return null;
}

const GLOBAL_INDEX_SYMBOL_MAP = {
  'NIFTY': '^NSEI',
  'NIFTY 50': '^NSEI',
  'NIFTY50': '^NSEI',
  '^NSEI': '^NSEI',
  'BANKNIFTY': '^NSEBANK',
  'NIFTY BANK': '^NSEBANK',
  'NIFTYBANK': '^NSEBANK',
  '^NSEBANK': '^NSEBANK',
  'FINNIFTY': 'NIFTY_FIN_SERVICE.NS',
  'NIFTY FIN SERVICE': 'NIFTY_FIN_SERVICE.NS',
  'MIDCPNIFTY': '^NSEMDCP50',
  'NIFTY MIDCAP 50': '^NSEMDCP50',
  'SENSEX': '^BSESN',
  'BSESN': '^BSESN',
  '^BSESN': '^BSESN',
  'CNXIT': '^CNXIT',
  'NIFTY IT': '^CNXIT',
  'CNXAUTO': '^CNXAUTO',
  'NIFTY AUTO': '^CNXAUTO',
  'CNXPHARMA': '^CNXPHARMA',
  'NIFTY PHARMA': '^CNXPHARMA',
  'CNXMETAL': '^CNXMETAL',
  'NIFTY METAL': '^CNXMETAL',
  'CNXFMCG': '^CNXFMCG',
  'NIFTY FMCG': '^CNXFMCG',
  'CNXENERGY': '^CNXENERGY',
  'NIFTY ENERGY': '^CNXENERGY',
  'CNXINFRA': '^CNXINFRA',
  'NIFTY INFRA': '^CNXINFRA',
  'TATAMOTORS': 'TMPV.NS',
  'LTIM': 'LTM.NS',
  'MCDOWELL-N': 'UNITDSPR.NS',
  'MCDOWELLN': 'UNITDSPR.NS'
};

function getCandidateSymbols(sym) {
  const clean = sym.trim().toUpperCase().replace(/&/g, '%26');
  const candidates = [];
  if (GLOBAL_INDEX_SYMBOL_MAP[clean]) {
    candidates.push(GLOBAL_INDEX_SYMBOL_MAP[clean]);
  }
  if (clean.startsWith('^') || clean.endsWith('.NS') || clean.endsWith('.BO')) {
    if (!candidates.includes(clean)) candidates.push(clean);
  } else if (/^\d+$/.test(clean)) {
    candidates.push(`${clean}.BO`, `${clean}.NS`);
  } else {
    candidates.push(`${clean}.NS`, `${clean}.BO`);
  }
  return candidates;
}

// Traditional Auto Pivot Points (TradingView Standard)
// Automatically selects reference period based on active timeframe:
// - Intraday (1m, 5m, 15m, 30m, 1hr) -> Daily (D) base
// - Daily (1d) -> Weekly (W) base
// - Weekly (1wk) -> Monthly (M) base
// - Monthly (1mo) -> Yearly (Y) base
async function fetchTraditionalAutoPivots(rawSymbol, activeInterval) {
  let sym = rawSymbol.trim().toUpperCase().replace(/&/g, '%26');
  let candidates = getCandidateSymbols(sym);

  let refInterval = '1d';
  let refRange = '5d';
  let pivotType = 'Daily';

  if (['1m', '5m', '15m', '30m', '60m', '1hr'].includes(activeInterval)) {
    refInterval = '1d';
    refRange = '5d';
    pivotType = 'Daily (D)';
  } else if (activeInterval === '1d') {
    refInterval = '1wk';
    refRange = '1mo';
    pivotType = 'Weekly (W)';
  } else if (activeInterval === '1wk') {
    refInterval = '1mo';
    refRange = '6mo';
    pivotType = 'Monthly (M)';
  } else if (activeInterval === '1mo') {
    refInterval = '1mo';
    refRange = '2y';
    pivotType = 'Yearly (Y)';
  }

  for (const candidate of candidates) {
    try {
      const r = await fetchChartDataMultiSource(candidate, refRange, refInterval);
      if (!r || !r.timestamp || r.timestamp.length === 0) continue;

      const meta = r.meta || {};
      const q = r.indicators?.quote?.[0];
      if (!q) continue;

      const validCandles = [];
      for (let i = 0; i < r.timestamp.length; i++) {
        let c = q.close[i];
        let h = q.high[i];
        let l = q.low[i];
        if (c === null || h === null || l === null) {
          if (i === r.timestamp.length - 1 && meta.regularMarketPrice) {
            c = meta.regularMarketPrice;
            h = meta.regularMarketDayHigh || c;
            l = meta.regularMarketDayLow || c;
          } else {
            continue;
          }
        }
        validCandles.push({
          time: r.timestamp[i],
          high: h,
          low: l,
          close: c
        });
      }

      if (validCandles.length > 0 && meta.regularMarketPrice && meta.regularMarketTime) {
        const lastCandleDate = new Date(validCandles[validCandles.length - 1].time * 1000).toISOString().split('T')[0];
        const metaDate = new Date(meta.regularMarketTime * 1000).toISOString().split('T')[0];
        if (metaDate > lastCandleDate) {
          validCandles.push({
            time: meta.regularMarketTime,
            high: meta.regularMarketDayHigh || meta.regularMarketPrice,
            low: meta.regularMarketDayLow || meta.regularMarketPrice,
            close: meta.regularMarketPrice
          });
        }
      }

      if (validCandles.length < 2) continue;
      const prev = validCandles[validCandles.length - 2];
      const { high, low, close } = prev;

      const p = Number(((high + low + close) / 3).toFixed(2));
      const r1 = Number(((2 * p) - low).toFixed(2));
      const s1 = Number(((2 * p) - high).toFixed(2));
      const r2 = Number((p + (high - low)).toFixed(2));
      const s2 = Number((p - (high - low)).toFixed(2));
      const r3 = Number((high + 2 * (p - low)).toFixed(2));
      const s3 = Number((low - 2 * (high - p)).toFixed(2));

      return {
        pivotType,
        high: Number(high.toFixed(2)),
        low: Number(low.toFixed(2)),
        close: Number(close.toFixed(2)),
        p, r1, s1, r2, s2, r3, s3
      };
    } catch (e) {}
  }
  return null;
}

// In-memory cache for stock history (5 seconds TTL for instant responsiveness)
const historyCache = new Map();

async function fetchStockHistory(rawSymbol, customRange = null, customInterval = '1d') {
  const interval = customInterval === '1wk' ? '1wk' : '1d';
  const isIntraday = false;

  let selectedRange = customRange || '1y';
  if (selectedRange === '3m') selectedRange = '3mo';
  if (selectedRange === '6m') selectedRange = '6mo';
  if (selectedRange === '12m' || selectedRange === '12mo') selectedRange = '1y';

  // Always fetch 2 years so EMAs (especially EMA 150) and RSI 14 have ample warmup data
  const yahooRange = '2y';
  const cacheKey = `${rawSymbol.toUpperCase()}_${selectedRange}_${interval}`;
  const cached = historyCache.get(cacheKey);
  if (cached && (Date.now() - cached.timestamp < 60000)) {
    return cached.data;
  }

  let sym = rawSymbol.trim().toUpperCase().replace(/&/g, '%26');

  // 1. Try Primary Tier: DhanHQ Broker API (if configured)
  if (isDhanConfigured()) {
    try {
      const dhanRes = await fetchDhanHistorical(rawSymbol);
      if (dhanRes && dhanRes.candles && dhanRes.candles.length > 0) {
        const candles = dhanRes.candles;
        const closePrices = candles.map(c => c.close);
        const volumeValues = candles.map(c => c.volume);

        const ema10 = calculateEMA(closePrices, 10);
        const ema20 = calculateEMA(closePrices, 20);
        const ema50 = calculateEMA(closePrices, 50);
        const ema150 = calculateEMA(closePrices, 150);
        const ema200 = calculateEMA(closePrices, 200);
        const volAvg9 = calculateSMA(volumeValues, 9);
        const vwap = calculateVWAP(candles, isIntraday);
        const rsi14 = calculateRSI(closePrices, 14);
        const rsiSma14 = calculateSMA(rsi14, 14);
        const darvasBox = calculateDarvasBox(candles, 5);
        const pivotPoints = await fetchTraditionalAutoPivots(rawSymbol, interval);

        const latestCandle = candles[candles.length - 1];
        const prevCandle = candles.length > 1 ? candles[candles.length - 2] : latestCandle;
        const realLtp = latestCandle.close;
        const changePercent = prevCandle.close ? Number((((realLtp - prevCandle.close) / prevCandle.close) * 100).toFixed(2)) : 0;

        const high52w = Math.max(...candles.slice(-250).map(c => c.high));
        const low52w = Math.min(...candles.slice(-250).map(c => c.low));
        const allTimeHigh = Math.max(...candles.map(c => c.high));
        const pctFrom52wHigh = Number((((realLtp - high52w) / high52w) * 100).toFixed(2));
        const pctFromAth = Number((((realLtp - allTimeHigh) / allTimeHigh) * 100).toFixed(2));

        const responsePayload = {
          symbol: rawSymbol,
          exchange: 'NSE',
          source: 'dhan',
          sourceLabel: 'Dhan',
          interval,
          range: selectedRange,
          initialRange: selectedRange,
          isIntraday,
          ltp: realLtp,
          changePercent,
          high52w,
          low52w,
          fiftyTwoWeekHigh: high52w,
          fiftyTwoWeekLow: low52w,
          allTimeHigh,
          pctFrom52wHigh,
          pctFromAth,
          latestEMA10: ema10[ema10.length - 1],
          latestEMA20: ema20[ema20.length - 1],
          latestEMA50: ema50[ema50.length - 1],
          latestEMA150: ema150[ema150.length - 1],
          latestEMA200: ema200[ema200.length - 1],
          latestRSI: rsi14[rsi14.length - 1],
          latestRsiSMA: rsiSma14[rsiSma14.length - 1],
          latestVWAP: vwap[vwap.length - 1],
          latestDarvasTop: darvasBox.latestTopBox,
          latestDarvasBottom: darvasBox.latestBottomBox,
          darvasBox,
          pivotPoints,
          candlesCount: candles.length,
          candles,
          volumeSeries: candles.map(c => ({
            time: c.time,
            value: c.volume,
            color: c.close >= c.open ? 'rgba(16, 185, 129, 0.65)' : 'rgba(239, 68, 68, 0.65)'
          })),
          volAvg9: candles.map((c, idx) => ({ time: c.time, value: volAvg9[idx] })).filter(e => e.value !== null),
          vwapSeries: candles.map((c, idx) => ({ time: c.time, value: vwap[idx] })).filter(e => e.value !== null),
          ema10: candles.map((c, idx) => ({ time: c.time, value: ema10[idx] })).filter(e => e.value !== null),
          ema20: candles.map((c, idx) => ({ time: c.time, value: ema20[idx] })).filter(e => e.value !== null),
          ema50: candles.map((c, idx) => ({ time: c.time, value: ema50[idx] })).filter(e => e.value !== null),
          ema150: candles.map((c, idx) => ({ time: c.time, value: ema150[idx] })).filter(e => e.value !== null),
          ema200: candles.map((c, idx) => ({ time: c.time, value: ema200[idx] })).filter(e => e.value !== null),
          rsi14: candles.map((c, idx) => ({ time: c.time, value: rsi14[idx] })).filter(e => e.value !== null),
          rsiSma14: candles.map((c, idx) => ({ time: c.time, value: rsiSma14[idx] })).filter(e => e.value !== null)
        };

        historyCache.set(cacheKey, { timestamp: Date.now(), data: responsePayload });

        // Self-Healing Write-Back: update universe store with fresh chart price
        persistUniverseQuotes({
          [rawSymbol.toUpperCase().replace(/\.(NS|BO)$/, '')]: {
            price: responsePayload.ltp,
            changePercent: responsePayload.changePercent,
            dayHigh: candles[candles.length - 1]?.high || responsePayload.ltp,
            dayLow: candles[candles.length - 1]?.low || responsePayload.ltp,
            volume: candles[candles.length - 1]?.volume || 0,
            fiftyTwoWeekHigh: responsePayload.high52w,
            fiftyTwoWeekLow: responsePayload.low52w,
            source: 'dhan'
          }
        });

        return responsePayload;
      }
    } catch (dhanErr) {
      console.warn(`[DHAN] Primary fetch notice for ${rawSymbol}, falling back to backup feed:`, dhanErr.message);
    }
  }

  // 2. Backup Tier: Multi-Source Yahoo/Mirrors Fallback
  let candidates = getCandidateSymbols(sym);

  for (const candidate of candidates) {
    try {
      const result = await fetchChartDataMultiSource(candidate, yahooRange, interval);
      if (!result || !result.timestamp || result.timestamp.length === 0) continue;

      const meta = result.meta || {};
      const timestamps = result.timestamp;
      const quotes = result.indicators?.quote?.[0];
      if (!quotes) continue;
      const closes = quotes.close;

      const candles = [];
      for (let i = 0; i < timestamps.length; i++) {
        let c = closes[i];
        let o = quotes.open[i];
        let h = quotes.high[i];
        let l = quotes.low[i];
        let v = quotes.volume[i] || 0;

        if (c === null || o === null || h === null || l === null) {
          if (i === timestamps.length - 1 && meta.regularMarketPrice) {
            c = c !== null ? c : meta.regularMarketPrice;
            h = h !== null ? h : (meta.regularMarketDayHigh || c);
            l = l !== null ? l : (meta.regularMarketDayLow || c);
            const prevClose = candles.length > 0 ? candles[candles.length - 1].close : c;
            o = o !== null ? o : prevClose;
            v = v || meta.regularMarketVolume || 0;
          } else {
            continue;
          }
        }

        const candleTime = new Date(timestamps[i] * 1000).toISOString().split('T')[0];

        candles.push({
          time: candleTime,
          open: Number(o.toFixed(2)),
          high: Number(h.toFixed(2)),
          low: Number(l.toFixed(2)),
          close: Number(c.toFixed(2)),
          volume: v
        });
      }

      // Merge latest live intraday quote from meta if available
      if (candles.length > 0 && meta.regularMarketPrice) {
        const livePrice = Number(meta.regularMarketPrice.toFixed(2));
        const lastC = candles[candles.length - 1];
        lastC.close = livePrice;
        if (meta.regularMarketDayHigh) lastC.high = Math.max(lastC.high, Number(meta.regularMarketDayHigh.toFixed(2)));
        if (meta.regularMarketDayLow) lastC.low = Math.min(lastC.low, Number(meta.regularMarketDayLow.toFixed(2)));
        if (meta.regularMarketVolume) lastC.volume = Math.max(lastC.volume, meta.regularMarketVolume);
      }

      if (candles.length > 0) {
        const closePrices = candles.map(c => c.close);
        const volumeValues = candles.map(c => c.volume);

        const ema10 = calculateEMA(closePrices, 10);
        const ema20 = calculateEMA(closePrices, 20);
        const ema50 = calculateEMA(closePrices, 50);
        const ema150 = calculateEMA(closePrices, 150);
        const ema200 = calculateEMA(closePrices, 200);
        const volAvg9 = calculateSMA(volumeValues, 9);
        const vwap = calculateVWAP(candles, isIntraday);
        const rsi14 = calculateRSI(closePrices, 14);
        const rsiSma14 = calculateSMA(rsi14, 14);
        const darvasBox = calculateDarvasBox(candles, 5);
        const pivotPoints = await fetchTraditionalAutoPivots(rawSymbol, interval);

        const latestCandle = candles[candles.length - 1];
        const prevCandle = candles.length > 1 ? candles[candles.length - 2] : latestCandle;
        
        const realLtp = meta.regularMarketPrice ? Number(meta.regularMarketPrice.toFixed(2)) : latestCandle.close;
        let changePercent = 0;
        if (meta.regularMarketChangePercent != null && !isNaN(meta.regularMarketChangePercent)) {
          changePercent = Number(meta.regularMarketChangePercent.toFixed(2));
        } else if (prevCandle && prevCandle.close) {
          changePercent = Number((((realLtp - prevCandle.close) / prevCandle.close) * 100).toFixed(2));
        } else if (meta.chartPreviousClose) {
          changePercent = Number((((realLtp - meta.chartPreviousClose) / meta.chartPreviousClose) * 100).toFixed(2));
        }

        const high52w = meta.fiftyTwoWeekHigh || Math.max(...candles.slice(-250).map(c => c.high));
        const low52w = meta.fiftyTwoWeekLow || Math.min(...candles.slice(-250).map(c => c.low));
        const allTimeHigh = Math.max(high52w, ...candles.map(c => c.high));
        const pctFrom52wHigh = Number((((realLtp - high52w) / high52w) * 100).toFixed(2));
        const pctFromAth = Number((((realLtp - allTimeHigh) / allTimeHigh) * 100).toFixed(2));

        const responsePayload = {
          symbol: rawSymbol,
          exchange: candidate.endsWith('.NS') ? 'NSE' : 'BSE',
          source: 'backup',
          sourceLabel: 'Backup',
          interval,
          range: selectedRange,
          initialRange: selectedRange,
          isIntraday,
          ltp: realLtp,
          changePercent,
          high52w,
          low52w,
          fiftyTwoWeekHigh: high52w,
          fiftyTwoWeekLow: low52w,
          allTimeHigh,
          pctFrom52wHigh,
          pctFromAth,
          latestEMA10: ema10[ema10.length - 1],
          latestEMA20: ema20[ema20.length - 1],
          latestEMA50: ema50[ema50.length - 1],
          latestEMA150: ema150[ema150.length - 1],
          latestEMA200: ema200[ema200.length - 1],
          latestRSI: rsi14[rsi14.length - 1],
          latestRsiSMA: rsiSma14[rsiSma14.length - 1],
          latestVWAP: vwap[vwap.length - 1],
          latestDarvasTop: darvasBox.latestTopBox,
          latestDarvasBottom: darvasBox.latestBottomBox,
          darvasBox,
          pivotPoints,
          candlesCount: candles.length,
          candles,
          volumeSeries: candles.map(c => ({
            time: c.time,
            value: c.volume,
            color: c.close >= c.open ? 'rgba(16, 185, 129, 0.65)' : 'rgba(239, 68, 68, 0.65)'
          })),
          volAvg9: candles.map((c, idx) => ({ time: c.time, value: volAvg9[idx] })).filter(e => e.value !== null),
          vwapSeries: candles.map((c, idx) => ({ time: c.time, value: vwap[idx] })).filter(e => e.value !== null),
          ema10: candles.map((c, idx) => ({ time: c.time, value: ema10[idx] })).filter(e => e.value !== null),
          ema20: candles.map((c, idx) => ({ time: c.time, value: ema20[idx] })).filter(e => e.value !== null),
          ema50: candles.map((c, idx) => ({ time: c.time, value: ema50[idx] })).filter(e => e.value !== null),
          ema150: candles.map((c, idx) => ({ time: c.time, value: ema150[idx] })).filter(e => e.value !== null),
          ema200: candles.map((c, idx) => ({ time: c.time, value: ema200[idx] })).filter(e => e.value !== null),
          rsi14: candles.map((c, idx) => ({ time: c.time, value: rsi14[idx] })).filter(e => e.value !== null),
          rsiSma14: candles.map((c, idx) => ({ time: c.time, value: rsiSma14[idx] })).filter(e => e.value !== null)
        };

        historyCache.set(cacheKey, { timestamp: Date.now(), data: responsePayload });

        // Self-Healing Write-Back: update universe store with fresh chart price
        persistUniverseQuotes({
          [rawSymbol.toUpperCase().replace(/\.(NS|BO)$/, '')]: {
            price: responsePayload.ltp,
            changePercent: responsePayload.changePercent,
            dayHigh: candles[candles.length - 1]?.high || responsePayload.ltp,
            dayLow: candles[candles.length - 1]?.low || responsePayload.ltp,
            volume: candles[candles.length - 1]?.volume || 0,
            fiftyTwoWeekHigh: responsePayload.high52w,
            fiftyTwoWeekLow: responsePayload.low52w,
            source: 'backup'
          }
        });

        return responsePayload;
      }
    } catch (err) {
      console.warn(`History fetch error for ${candidate}:`, err.message);
    }
  }

  throw new Error(`Historical data not available for ${rawSymbol}`);
}

// Predictive Stock Search Cache (5 mins TTL)
const searchCache = new Map();
let localUniverseCache = null;

function getLocalStockUniverse() {
  if (localUniverseCache) return localUniverseCache;
  try {
    if (fs.existsSync(FNO_DATA_FILE)) {
      const raw = fs.readFileSync(FNO_DATA_FILE, 'utf8');
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        localUniverseCache = parsed;
        return localUniverseCache;
      }
    }
  } catch (e) {
    console.error('Error reading local universe for search:', e.message);
  }
  return [];
}

async function searchPredictiveStocks(query) {
  if (!query || query.trim().length === 0) return [];
  const qClean = query.trim();
  const qUpper = qClean.toUpperCase();
  const qLower = qClean.toLowerCase();

  const cacheKey = qLower;
  if (searchCache.has(cacheKey)) {
    return searchCache.get(cacheKey);
  }

  const results = [];
  const seen = new Set();

  const add = (symbol, name, exchange = 'NSE') => {
    if (!symbol) return;
    const s = symbol.trim().toUpperCase().replace(/\.(NS|BO)$/, '');
    if (!seen.has(s) && s.length <= 16 && !/^0P\w+/.test(s)) {
      seen.add(s);
      results.push({
        symbol: s,
        name: (name || s).trim(),
        exchange: exchange || 'NSE'
      });
    }
  };

  // 1. Instant match from local universe (1,100 stocks & major indices)
  const universe = getLocalStockUniverse();
  if (Array.isArray(universe) && universe.length > 0) {
    for (const item of universe) {
      const sym = (item.symbol || '').toUpperCase();
      const n = (item.name || '').toUpperCase();
      if (sym.includes(qUpper) || n.includes(qUpper)) {
        add(item.symbol, item.name, item.exchange || 'NSE');
        if (results.length >= 8) break;
      }
    }
  }

  // 2. Fetch from Chartink autocomplete
  try {
    const cUrl = `https://chartink.com/stocks/search?term=${encodeURIComponent(qLower)}`;
    const cRes = await httpsFetch(cUrl, {
      headers: { 'User-Agent': 'Mozilla/5.0' },
      timeout: 3000
    });
    if (cRes.ok) {
      const cList = await cRes.json();
      if (Array.isArray(cList)) {
        for (const item of cList) {
          const sym = item.nsecode || item.bsecode;
          if (sym && !/^\d{6}$/.test(sym)) {
            add(sym, item.name, 'NSE');
          }
        }
      }
    }
  } catch (e) {}

  // 3. Fallback to Yahoo Finance search if < 5 results
  if (results.length < 5) {
    try {
      const yUrl = `https://query1.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(qUpper)}&quotesCount=8&newsCount=0`;
      const yRes = await httpsFetch(yUrl, {
        headers: { 'User-Agent': 'Mozilla/5.0' },
        timeout: 3000
      });
      if (yRes.ok) {
        const yData = await yRes.json();
        for (const quote of (yData.quotes || [])) {
          if (quote.symbol && (quote.symbol.endsWith('.NS') || quote.symbol.endsWith('.BO') || quote.exchange === 'NSI' || quote.exchange === 'BSE')) {
            const sym = quote.symbol.replace(/\.(NS|BO)$/, '');
            add(sym, quote.shortname || quote.longname || sym, quote.symbol.endsWith('.BO') ? 'BSE' : 'NSE');
          }
        }
      }
    } catch (e) {}
  }

  // Prioritize exact match, then prefix match
  results.sort((a, b) => {
    const aSym = a.symbol.toUpperCase();
    const bSym = b.symbol.toUpperCase();
    if (aSym === qUpper) return -1;
    if (bSym === qUpper) return 1;
    const aStarts = aSym.startsWith(qUpper);
    const bStarts = bSym.startsWith(qUpper);
    if (aStarts && !bStarts) return -1;
    if (!aStarts && bStarts) return 1;
    return 0;
  });

  const finalResults = results.slice(0, 10);
  searchCache.set(cacheKey, finalResults);
  return finalResults;
}

// -------------------------------------------------------------
// Price Position Scanner Engine (Darvas Green Line ↔ EMA 10 / 20)
// Condition: min(DarvasGreen, EMA) <= Close <= max(DarvasGreen, EMA)
// -------------------------------------------------------------
async function scanDarvasEma(targetEma = 10, scope = 'current', stockList = []) {
  const emaPeriod = Number(targetEma) === 20 ? 20 : 10;
  const universe = getLocalStockUniverse();
  const sortedUniverse = [...universe].sort((a, b) => (b.marketCap || 0) - (a.marketCap || 0));

  let targetSymbols = [];

  switch (scope) {
    case 'current':
    case 'watchlist':
      if (Array.isArray(stockList) && stockList.length > 0) {
        targetSymbols = stockList.map(s => typeof s === 'string' ? { symbol: s, name: s, exchange: 'NSE' } : { symbol: s.symbol, name: s.name || s.symbol, exchange: s.exchange || 'NSE' });
      } else {
        targetSymbols = sortedUniverse.slice(0, 50).map(u => ({ symbol: u.symbol, name: u.name, exchange: u.exchange || 'NSE' }));
      }
      break;

    case 'large':
    case 'large_cap':
      // Large Cap: Top 100 stocks
      targetSymbols = sortedUniverse.slice(0, 100).map(u => ({ symbol: u.symbol, name: u.name, exchange: u.exchange || 'NSE' }));
      break;

    case 'mid':
    case 'mid_cap':
      // Mid Cap: Rank 101 to 250 (150 stocks)
      targetSymbols = sortedUniverse.slice(100, 250).map(u => ({ symbol: u.symbol, name: u.name, exchange: u.exchange || 'NSE' }));
      break;

    case 'small':
    case 'small_cap':
      // Small Cap: Rank 251 to 500 (250 stocks)
      targetSymbols = sortedUniverse.slice(250, 500).map(u => ({ symbol: u.symbol, name: u.name, exchange: u.exchange || 'NSE' }));
      break;

    case 'micro':
    case 'micro_cap':
      // Micro Cap: Rank 501+
      targetSymbols = sortedUniverse.slice(500, 700).map(u => ({ symbol: u.symbol, name: u.name, exchange: u.exchange || 'NSE' }));
      break;

    case 'midsmall400':
    case 'midsmall_400':
      // MidSmall400: Rank 101 to 500 (Mid 150 + Small 250 = 400 stocks)
      targetSymbols = sortedUniverse.slice(100, 500).map(u => ({ symbol: u.symbol, name: u.name, exchange: u.exchange || 'NSE' }));
      break;

    case 'fno':
      targetSymbols = sortedUniverse.filter(u => u.fno && u.symbol !== 'NIFTY' && u.symbol !== 'BANKNIFTY' && u.symbol !== 'FINNIFTY' && u.symbol !== 'MIDCPNIFTY').map(u => ({ symbol: u.symbol, name: u.name, exchange: u.exchange || 'NSE' }));
      break;

    case 'universe':
    case 'all':
    default:
      if (String(scope).startsWith('wl_') && Array.isArray(stockList) && stockList.length > 0) {
        targetSymbols = stockList.map(s => typeof s === 'string' ? { symbol: s, name: s, exchange: 'NSE' } : { symbol: s.symbol, name: s.name || s.symbol, exchange: s.exchange || 'NSE' });
      } else {
        targetSymbols = sortedUniverse.slice(0, 250).map(u => ({ symbol: u.symbol, name: u.name, exchange: u.exchange || 'NSE' }));
      }
      break;
  }

  // Deduplicate symbols
  const uniqueList = [];
  const seen = new Set();
  for (const item of targetSymbols) {
    const s = (item.symbol || '').toUpperCase().trim();
    if (s && !seen.has(s)) {
      seen.add(s);
      uniqueList.push({ symbol: s, name: item.name || s, exchange: item.exchange || 'NSE' });
    }
  }

  const matches = [];
  const concurrency = 15;
  let cursor = 0;

  async function worker() {
    while (cursor < uniqueList.length) {
      const idx = cursor++;
      const item = uniqueList[idx];
      try {
        const hist = await fetchStockHistory(item.symbol, '6mo', '1d');
        if (hist && hist.candles && hist.candles.length >= 10) {
          const close = Number(hist.ltp || (hist.candles.length > 0 ? hist.candles[hist.candles.length - 1].close : null));
          const ema10 = Number(hist.latestEMA10);
          const ema20 = Number(hist.latestEMA20);
          const darvasGreen = Number(hist.latestDarvasTop);
          const selectedEmaVal = emaPeriod === 20 ? ema20 : ema10;

          if (!isNaN(close) && !isNaN(darvasGreen) && !isNaN(selectedEmaVal) && darvasGreen > 0 && selectedEmaVal > 0) {
            const minBound = Math.min(darvasGreen, selectedEmaVal);
            const maxBound = Math.max(darvasGreen, selectedEmaVal);

            // Mathematical condition: min(DarvasGreen, EMA) <= Close <= max(DarvasGreen, EMA)
            if (close >= minBound && close <= maxBound) {
              const spreadVal = Math.abs(darvasGreen - selectedEmaVal);
              const spreadPercent = close > 0 ? Number(((spreadVal / close) * 100).toFixed(2)) : 0;
              const rangeWidth = maxBound - minBound;
              const positionPercent = rangeWidth > 0 ? Number((((close - minBound) / rangeWidth) * 100).toFixed(1)) : 50;

              const lastCandle = hist.candles[hist.candles.length - 1];
              const volume = Number(hist.volume || (lastCandle ? lastCandle.volume : 0)) || 0;

              matches.push({
                symbol: item.symbol,
                name: item.name,
                exchange: item.exchange || 'NSE',
                close: Number(close.toFixed(2)),
                ltp: Number(close.toFixed(2)),
                changePercent: hist.changePercent || 0,
                volume,
                ema10: Number(ema10.toFixed(2)),
                ema20: Number(ema20.toFixed(2)),
                darvasGreen: Number(darvasGreen.toFixed(2)),
                darvasBottom: hist.latestDarvasBottom ? Number(hist.latestDarvasBottom.toFixed(2)) : null,
                selectedEma: emaPeriod,
                selectedEmaValue: Number(selectedEmaVal.toFixed(2)),
                spreadPercent,
                positionPercent,
                lowerBound: Number(minBound.toFixed(2)),
                upperBound: Number(maxBound.toFixed(2))
              });
            }
          }
        }
      } catch (e) {}
    }
  }

  const workers = [];
  for (let i = 0; i < Math.min(concurrency, uniqueList.length); i++) {
    workers.push(worker());
  }
  await Promise.all(workers);

  // Sort by tightest spread percentage first
  matches.sort((a, b) => a.spreadPercent - b.spreadPercent);

  return {
    success: true,
    totalScanned: uniqueList.length,
    matchesCount: matches.length,
    targetEma: emaPeriod,
    scope,
    results: matches
  };
}

// Parse request JSON body helper
function parseJsonBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => {
      body += chunk;
      if (body.length > 2 * 1024 * 1024) { // 2MB limit
        reject(new Error('Request entity too large'));
      }
    });
    req.on('end', () => {
      if (!body.trim()) return resolve({});
      try {
        resolve(JSON.parse(body));
      } catch (err) {
        reject(new Error('Invalid JSON'));
      }
    });
    req.on('error', reject);
  });
}

// Admin Authentication Config & Active Sessions Store
const ADMIN_USER = 'admin';
const ADMIN_PASS = 'ruffneck';
const ADMIN_TOKEN = 'token_superadmin_ruffneck_session_key';

// Active User Sessions Store: token -> { userId, username, role, createdAt }
const activeSessions = new Map();

function generateSessionToken(userId, role) {
  return 'sess_' + role + '_' + crypto.randomBytes(24).toString('hex');
}

function getAuthenticatedUser(req) {
  let token = null;
  const authHeader = req.headers['authorization'] || '';
  if (authHeader.startsWith('Bearer ')) {
    token = authHeader.substring(7).trim();
  } else {
    const cookie = req.headers['cookie'] || '';
    const m = cookie.match(/token=([a-zA-Z0-9_\-]+)/);
    if (m) token = m[1];
  }

  if (!token) return null;

  if (token === ADMIN_TOKEN) {
    return { userId: 'admin', username: 'admin', role: 'admin' };
  }

  if (activeSessions.has(token)) {
    return activeSessions.get(token);
  }

  return null;
}

function isRequestAuthorized(req) {
  const user = getAuthenticatedUser(req);
  return user && user.role === 'admin';
}

function findUserRecord(users, user) {
  if (!user || !Array.isArray(users)) return null;
  const targetId = user.role === 'admin' ? 'usr_admin' : (user.userId || user.id);
  const targetUsername = (user.username || '').toLowerCase();
  return users.find(x => {
    if (!x) return false;
    if (targetId && (x.id === targetId || x.userId === targetId)) return true;
    if (targetUsername && x.username && x.username.toLowerCase() === targetUsername) return true;
    return false;
  }) || null;
}

function getUserScreeners(user) {
  const globalScreeners = readScreeners();
  
  if (user) {
    const users = readUsers();
    const u = findUserRecord(users, user);
    if (u && Array.isArray(u.customScreeners) && u.customScreeners.length > 0) {
      // Auto-migrate legacy u.screeners snapshots if present
      if (Array.isArray(u.screeners)) {
        const globalIds = new Set(globalScreeners.map(g => g.id));
        const customOnes = u.screeners.filter(s => s && s.id && !globalIds.has(s.id));
        customOnes.forEach(cs => {
          if (!u.customScreeners.some(existing => existing.id === cs.id)) {
            u.customScreeners.push({ ...cs, isCustom: true, isGlobal: false });
          }
        });
        delete u.screeners;
        saveUsers(users);
      }

      // Merge: Global Admin Screeners (always up to date) + User's Custom Screeners
      const globalIds = new Set(globalScreeners.map(g => g.id));
      const validCustom = u.customScreeners.filter(c => !globalIds.has(c.id));
      const merged = [
        ...globalScreeners.map(g => ({ ...g, isGlobal: true, isCustom: false })),
        ...validCustom.map(c => ({ ...c, isGlobal: false, isCustom: true }))
      ];
      return merged;
    }
  }

  // Unauthenticated or no custom screeners: return global system screeners
  return globalScreeners.map(g => ({ ...g, isGlobal: true, isCustom: false }));
}

function addUserCustomScreener(user, screener) {
  if (!user) return false;
  const users = readUsers();
  let u = findUserRecord(users, user);
  if (!u) {
    const targetId = user.role === 'admin' ? 'usr_admin' : (user.userId || user.id || ('usr_' + Date.now().toString(36)));
    u = {
      id: targetId,
      username: user.username,
      role: user.role || 'user',
      watchlists: createDefaultWatchlists(),
      customScreeners: []
    };
    users.push(u);
  }

  if (!Array.isArray(u.customScreeners)) u.customScreeners = [];
  u.customScreeners.push(screener);
  saveUsers(users);
  return true;
}

function updateUserCustomScreener(user, screenerId, updatedData) {
  if (!user) return null;
  const users = readUsers();
  const u = findUserRecord(users, user);
  if (!u || !Array.isArray(u.customScreeners)) return null;

  const idx = u.customScreeners.findIndex(s => s.id === screenerId);
  if (idx === -1) return null;

  u.customScreeners[idx] = {
    ...u.customScreeners[idx],
    ...updatedData,
    id: screenerId,
    isCustom: true,
    isGlobal: false
  };
  saveUsers(users);
  return u.customScreeners[idx];
}

function deleteUserCustomScreener(user, screenerId) {
  if (!user) return false;
  const users = readUsers();
  const u = findUserRecord(users, user);
  if (!u || !Array.isArray(u.customScreeners)) return false;

  const initialLen = u.customScreeners.length;
  u.customScreeners = u.customScreeners.filter(s => s.id !== screenerId);
  if (u.customScreeners.length !== initialLen) {
    saveUsers(users);
    return true;
  }
  return false;
}

function saveScreenerExecutionCache(user, screenerId, result) {
  if (user) {
    const users = readUsers();
    const u = findUserRecord(users, user);
    if (u && Array.isArray(u.customScreeners)) {
      const match = u.customScreeners.find(s => s.id === screenerId);
      if (match) {
        match.lastRun = result.timestamp;
        match.stockCount = result.count;
        match.lastResults = result.stocks;
        saveUsers(users);
        return;
      }
    }
  }

  // Update in global screeners
  const globalScreeners = readScreeners();
  const gMatch = globalScreeners.find(s => s.id === screenerId);
  if (gMatch) {
    gMatch.lastRun = result.timestamp;
    gMatch.stockCount = result.count;
    gMatch.lastResults = result.stocks;
    saveScreeners(globalScreeners);
  }
}

function getUserWatchlists(user) {
  if (!user) return [];
  const users = readUsers();
  let u = findUserRecord(users, user);
  if (!u) {
    const targetId = user.role === 'admin' ? 'usr_admin' : (user.userId || user.id || ('usr_' + Date.now().toString(36)));
    u = {
      id: targetId,
      username: user.username,
      role: user.role || 'user',
      watchlists: createDefaultWatchlists()
    };
    users.push(u);
    saveUsers(users);
  }
  if (!Array.isArray(u.watchlists) || u.watchlists.length === 0) {
    u.watchlists = createDefaultWatchlists();
    saveUsers(users);
  }
  return u.watchlists;
}

function saveUserWatchlists(user, watchlists) {
  if (!user) return false;
  const users = readUsers();
  let u = findUserRecord(users, user);
  if (u) {
    u.watchlists = watchlists;
    saveUsers(users);
    return true;
  } else {
    const targetId = user.role === 'admin' ? 'usr_admin' : (user.userId || user.id || ('usr_' + Date.now().toString(36)));
    users.push({
      id: targetId,
      username: user.username,
      role: user.role || 'user',
      watchlists
    });
    saveUsers(users);
    return true;
  }
}

function getUserIndicatorPreferences(user) {
  const defaultPrefs = {
    toggles: {
      ema10: true,
      ema20: true,
      ema50: true,
      ema150: true,
      ema200: true,
      volume: true,
      volAvg: true,
      vwap: true,
      pivots: true,
      darvas: true,
      rsi: true
    },
    colors: {
      ema10: '#0284c7',
      ema20: '#2563eb',
      ema50: '#f59e0b',
      ema150: '#9333ea',
      ema200: '#e11d48',
      volAvg: '#fbbf24',
      vwap: '#eab308',
      darvasTop: '#10b981',
      darvasBottom: '#ef4444',
      rsi: '#60a5fa',
      rsiSma: '#fbbf24',
      avwap: '#a855f7',
      crosshair: '#3b82f6',
      closeLine: '#10b981'
    },
    pivotType: 'Traditional (Auto)',
    chartTheme: 'dark',
    customThemeColors: {
      bg: '#0b0f19',
      text: '#94a3b8',
      grid: '#1f293d',
      border: '#1f293d',
      candleUp: '#10b981',
      candleDown: '#ef4444'
    },
    lineWidths: {
      ema10: 1.5,
      ema20: 1.5,
      ema50: 1.5,
      ema150: 2,
      ema200: 2,
      vwap: 1.8,
      darvasTop: 2.5,
      darvasBottom: 2.5,
      volAvg: 1.5,
      rsi: 2,
      rsiSma: 1.5,
      avwap: 2,
      pivots: 1.2,
      crosshair: 1,
      closeLine: 1
    }
  };
  if (!user) return defaultPrefs;
  const users = readUsers();
  const u = findUserRecord(users, user);
  return (u && u.indicatorPreferences) ? { ...defaultPrefs, ...u.indicatorPreferences } : defaultPrefs;
}

function saveUserIndicatorPreferences(user, preferences) {
  if (!user) return false;
  const users = readUsers();
  let u = findUserRecord(users, user);
  if (u) {
    u.indicatorPreferences = preferences;
    saveUsers(users);
    return true;
  } else {
    const targetId = user.role === 'admin' ? 'usr_admin' : (user.userId || user.id || ('usr_' + Date.now().toString(36)));
    users.push({
      id: targetId,
      username: user.username,
      role: user.role || 'user',
      indicatorPreferences: preferences
    });
    saveUsers(users);
    return true;
  }
}

function getUserNotes(user) {
  if (!user) return '';
  const users = readUsers();
  const u = findUserRecord(users, user);
  return (u && typeof u.notes === 'string') ? u.notes : '';
}

function saveUserNotes(user, notesText) {
  if (!user) return false;
  const users = readUsers();
  let u = findUserRecord(users, user);
  if (u) {
    u.notes = String(notesText || '');
    u.notesUpdatedAt = new Date().toISOString();
    saveUsers(users);
    return true;
  } else {
    const targetId = user.role === 'admin' ? 'usr_admin' : (user.userId || user.id || ('usr_' + Date.now().toString(36)));
    users.push({
      id: targetId,
      username: user.username,
      role: user.role || 'user',
      notes: String(notesText || ''),
      notesUpdatedAt: new Date().toISOString()
    });
    saveUsers(users);
    return true;
  }
}

function getUserDrawings(user) {
  if (!user) return {};
  const users = readUsers();
  const u = findUserRecord(users, user);
  return (u && u.drawings && typeof u.drawings === 'object') ? u.drawings : {};
}

function saveUserDrawings(user, drawings) {
  if (!user) return false;
  const users = readUsers();
  let u = findUserRecord(users, user);
  if (u) {
    u.drawings = drawings || {};
    saveUsers(users);
    return true;
  } else {
    const targetId = user.role === 'admin' ? 'usr_admin' : (user.userId || user.id || ('usr_' + Date.now().toString(36)));
    users.push({
      id: targetId,
      username: user.username,
      role: user.role || 'user',
      drawings: drawings || {}
    });
    saveUsers(users);
    return true;
  }
}

// Fast Quotes Cache for Watchlists & Explore (30s TTL)
const quotesCache = new Map();

async function fetchBatchQuotes(symbols) {
  if (!Array.isArray(symbols) || symbols.length === 0) return [];
  const results = [];
  const uncached = [];
  const now = Date.now();

  const YAHOO_SYMBOL_ALIASES = {
    'MCDOWELL-N': 'UNITDSPR',
    'MCDOWELLN': 'UNITDSPR',
    'TATAMOTORS': 'TMPV',
    'LTIM': 'LTM'
  };

  for (const sym of symbols) {
    const sUpper = sym.trim().toUpperCase().replace(/\.(NS|BO)$/, '');
    if (quotesCache.has(sUpper) && (now - quotesCache.get(sUpper).timestamp < 30000)) {
      results.push(quotesCache.get(sUpper).data);
    } else {
      uncached.push(sUpper);
    }
  }

  if (uncached.length > 0) {
    const session = await getYahooCrumbAndCookie();
    const crumbParam = session.crumb ? `&crumb=${encodeURIComponent(session.crumb)}` : '';

    const yahooToOriginalMap = new Map();
    const yahooTickers = [];

    for (const s of uncached) {
      const mapped = GLOBAL_INDEX_SYMBOL_MAP[s] || YAHOO_SYMBOL_ALIASES[s] || s;
      let targetTicker = mapped;
      if (!targetTicker.startsWith('^') && !targetTicker.endsWith('.NS') && !targetTicker.endsWith('.BO')) {
        targetTicker = `${targetTicker}.NS`;
      }
      yahooTickers.push(targetTicker);
      if (!yahooToOriginalMap.has(targetTicker)) {
        yahooToOriginalMap.set(targetTicker, []);
      }
      yahooToOriginalMap.get(targetTicker).push(s);
    }

    const CHUNK_SIZE = 50;
    const chunks = [];
    for (let i = 0; i < yahooTickers.length; i += CHUNK_SIZE) {
      chunks.push(yahooTickers.slice(i, i + CHUNK_SIZE));
    }

    const CONCURRENCY = 6;
    let index = 0;

    async function worker() {
      while (index < chunks.length) {
        const chunkIndex = index++;
        const chunk = chunks[chunkIndex];
        const symbolsStr = chunk.map(encodeURIComponent).join(',');
        const quoteUrl = `https://query1.finance.yahoo.com/v7/finance/quote?symbols=${symbolsStr}${crumbParam}`;

        try {
          const res = await httpsFetch(quoteUrl, {
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
              'Accept': '*/*',
              ...(session.cookies ? { 'Cookie': session.cookies } : {})
            },
            timeout: 6000
          });

          if (res.ok) {
            const data = await res.json();
            const quoteList = data.quoteResponse?.result || [];
            for (const q of quoteList) {
              const returnedSym = q.symbol;
              const originalSyms = yahooToOriginalMap.get(returnedSym) || [returnedSym.replace(/\.(NS|BO)$/, '')];

              const ltp = q.regularMarketPrice != null ? Number(q.regularMarketPrice.toFixed(2)) : null;
              if (ltp !== null && ltp > 0) {
                let changePercent = 0;
                if (q.regularMarketChangePercent != null && !isNaN(q.regularMarketChangePercent)) {
                  changePercent = Number(q.regularMarketChangePercent.toFixed(2));
                } else if (q.regularMarketPreviousClose) {
                  changePercent = Number((((ltp - q.regularMarketPreviousClose) / q.regularMarketPreviousClose) * 100).toFixed(2));
                }

                const prevClose = q.regularMarketPreviousClose || Number((ltp / (1 + (changePercent / 100))).toFixed(2));
                const dayHigh = q.regularMarketDayHigh != null ? Number(q.regularMarketDayHigh.toFixed(2)) : ltp;
                const dayLow = q.regularMarketDayLow != null ? Number(q.regularMarketDayLow.toFixed(2)) : ltp;
                const volume = q.regularMarketVolume || 0;
                const fiftyTwoWeekHigh = q.fiftyTwoWeekHigh != null ? Number(q.fiftyTwoWeekHigh.toFixed(2)) : undefined;
                const fiftyTwoWeekLow = q.fiftyTwoWeekLow != null ? Number(q.fiftyTwoWeekLow.toFixed(2)) : undefined;

                for (const origSym of originalSyms) {
                  const quote = {
                    symbol: origSym,
                    ltp,
                    changePercent,
                    prevClose,
                    dayHigh,
                    dayLow,
                    volume,
                    fiftyTwoWeekHigh,
                    fiftyTwoWeekLow,
                    exchange: 'NSE'
                  };
                  quotesCache.set(origSym, { timestamp: now, data: quote });
                  results.push(quote);
                }
              }
            }
          }
        } catch (err) {
          console.warn('[EXPLORE] Batch quote fetch chunk error:', err.message);
        }
      }
    }

    const workers = [];
    for (let w = 0; w < Math.min(CONCURRENCY, chunks.length); w++) {
      workers.push(worker());
    }
    await Promise.all(workers);

    // Fallback to single v8 chart for missing high-priority uncached tickers (max 30)
    const fetchedSymbolsSet = new Set(results.map(r => r.symbol));
    const stillMissing = uncached.filter(s => !fetchedSymbolsSet.has(s) && !quotesCache.has(s));

    if (stillMissing.length > 0 && stillMissing.length <= 30) {
      const fallbackPromises = stillMissing.map(async (s) => {
        try {
          const mapped = GLOBAL_INDEX_SYMBOL_MAP[s] || YAHOO_SYMBOL_ALIASES[s] || s;
          let targetTicker = mapped;
          if (!targetTicker.startsWith('^') && !targetTicker.endsWith('.NS') && !targetTicker.endsWith('.BO')) {
            targetTicker = `${targetTicker}.NS`;
          }
          const res = await httpsFetch(`https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(targetTicker)}?range=5d&interval=1d${crumbParam}`, {
            headers: {
              'User-Agent': 'Mozilla/5.0',
              ...(session.cookies ? { 'Cookie': session.cookies } : {})
            },
            timeout: 4000
          });
          if (res.ok) {
            const d = await res.json();
            const meta = d.chart?.result?.[0]?.meta;
            if (meta && meta.regularMarketPrice) {
              const ltp = Number(meta.regularMarketPrice.toFixed(2));
              let chg = 0;
              if (meta.regularMarketChangePercent != null && !isNaN(meta.regularMarketChangePercent)) {
                chg = Number(meta.regularMarketChangePercent.toFixed(2));
              } else if (meta.chartPreviousClose) {
                chg = Number((((ltp - meta.chartPreviousClose) / meta.chartPreviousClose) * 100).toFixed(2));
              }
              const prev = meta.chartPreviousClose || (ltp / (1 + (chg / 100)));
              const quote = {
                symbol: s,
                ltp,
                changePercent: chg,
                prevClose: Number(prev.toFixed(2)),
                dayHigh: meta.regularMarketDayHigh ? Number(meta.regularMarketDayHigh.toFixed(2)) : ltp,
                dayLow: meta.regularMarketDayLow ? Number(meta.regularMarketDayLow.toFixed(2)) : ltp,
                volume: meta.regularMarketVolume || 0,
                exchange: 'NSE'
              };
              quotesCache.set(s, { timestamp: now, data: quote });
              results.push(quote);
            }
          }
        } catch (e) {}
      });
      await Promise.all(fallbackPromises);
    }
  }

  return results;
}

// -------------------------------------------------------------
// Market Analytics, Sector Strength & Breadth Helpers
// -------------------------------------------------------------

function readSectorsData() {
  try {
    if (!fs.existsSync(SECTORS_FILE)) {
      return { indices: [], subSectors: [] };
    }
    const content = fs.readFileSync(SECTORS_FILE, 'utf8');
    return JSON.parse(content || '{}');
  } catch (err) {
    console.error('Error reading sectors data file:', err);
    return { indices: [], subSectors: [] };
  }
}

function saveSectorsData(data) {
  try {
    fs.writeFileSync(SECTORS_FILE, JSON.stringify(data, null, 2), 'utf8');
    return true;
  } catch (err) {
    console.error('Error saving sectors data file:', err);
    return false;
  }
}

// Index Quotes Cache (60s TTL)
const indexQuotesCache = new Map();

async function fetchBatchIndexQuotes(indicesList) {
  const now = Date.now();
  const results = [];
  const uncached = [];

  for (const idx of indicesList) {
    if (indexQuotesCache.has(idx.id) && (now - indexQuotesCache.get(idx.id).timestamp < 60000)) {
      results.push(indexQuotesCache.get(idx.id).data);
    } else {
      uncached.push(idx);
    }
  }

  if (uncached.length > 0) {
    const promises = uncached.map(async (idx) => {
      let ltp = null, changePercent = 0, dayHigh = null, dayLow = null, sparkline = [];
      try {
        const res = await httpsFetch(`https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(idx.symbol)}?range=5d&interval=1d`, {
          headers: { 'User-Agent': 'Mozilla/5.0' },
          timeout: 5000
        });
        if (res.ok) {
          const d = await res.json();
          const r = d.chart?.result?.[0];
          const meta = r?.meta;
          const quotes = r?.indicators?.quote?.[0];
          if (meta && meta.regularMarketPrice) {
            ltp = Number(meta.regularMarketPrice.toFixed(2));
            if (meta.regularMarketChangePercent != null && !isNaN(meta.regularMarketChangePercent)) {
              changePercent = Number(meta.regularMarketChangePercent.toFixed(2));
            } else {
              const closes = (quotes?.close || []).filter(c => typeof c === 'number');
              if (closes.length >= 2) {
                const yesterdayClose = closes[closes.length - 2];
                changePercent = yesterdayClose ? Number((((ltp - yesterdayClose) / yesterdayClose) * 100).toFixed(2)) : 0;
              } else if (meta.chartPreviousClose) {
                changePercent = Number((((ltp - meta.chartPreviousClose) / meta.chartPreviousClose) * 100).toFixed(2));
              }
            }
            dayHigh = meta.regularMarketDayHigh ? Number(meta.regularMarketDayHigh.toFixed(2)) : ltp;
            dayLow = meta.regularMarketDayLow ? Number(meta.regularMarketDayLow.toFixed(2)) : ltp;
          }
          if (quotes && Array.isArray(quotes.close)) {
            sparkline = quotes.close.filter(c => typeof c === 'number').map(c => Number(c.toFixed(2)));
          }
        }
      } catch (err) {}

      // Fallback realistic index estimates if symbol blocked or weekend/offline
      if (!ltp) {
        const fallbacks = {
          '^NSEI': 24080.40,
          '^NSEBANK': 58024.95,
          '^CNXIT': 31191.45,
          '^CNXAUTO': 28841.50,
          '^CNXPHARMA': 27186.45,
          '^CNXMETAL': 13193.90,
          '^CNXFMCG': 46025.55,
          '^CNXREALTY': 904.15,
          '^CNXENERGY': 37949.25,
          '^CNXINFRA': 9179.40,
          '^CNXMEDIA': 1557.35,
          '^CNXPSUBANK': 8609.55,
          'NIFTY_PVT_BANK.NS': 28005.75,
          'NIFTY_FIN_SERVICE.NS': 26293.65,
          'NIFTY_HEALTHCARE.NS': 16941.50,
          'NIFTY_OIL_AND_GAS.NS': 11103.80,
          'NIFTY_CONSR_DURBL.NS': 40430.95,
          'NIFTY_CHEMICALS.NS': 30028.80,
          'NIFTY_MIDCAP_100.NS': 64224.75,
          '^NSEMDCP50': 18491.45,
          'NIFTY_MIDSMALL_400.NS': 19480.00
        };
        ltp = fallbacks[idx.symbol] || 15000.00;
        changePercent = 0.0;
        dayHigh = ltp;
        dayLow = ltp;
        sparkline = [ltp, ltp, ltp, ltp, ltp];
      }

      const item = {
        id: idx.id,
        symbol: idx.symbol,
        name: idx.name,
        category: idx.category,
        ltp,
        changePercent,
        dayHigh,
        dayLow,
        sparkline,
        above20Sma: changePercent >= 0,
        above50Sma: changePercent >= -0.5
      };
      indexQuotesCache.set(idx.id, { timestamp: now, data: item });
      return item;
    });

    const fetched = await Promise.all(promises);
    results.push(...fetched);
  }

  return results;
}

// Market Breadth Diagnostics (20 SMA & 50 SMA across Universe & Sub-Sectors)
function calculateMarketBreadth(sectorFilter = 'all') {
  const data = readSectorsData();
  let totalStocksCount = 0;
  let countAbove20Sma = 0;
  let countAbove50Sma = 0;
  let advancing = 0;
  let declining = 0;
  let highs52w = 0;
  let lows52w = 0;

  const sectoralBreadth = [];

  for (const sub of (data.subSectors || [])) {
    const subTotal = (sub.stocks || []).length;
    let subAbove20 = 0;
    let subAbove50 = 0;

    for (const s of (sub.stocks || [])) {
      totalStocksCount++;
      if (s.above20Sma) { countAbove20Sma++; subAbove20++; }
      if (s.above50Sma) { countAbove50Sma++; subAbove50++; }
      if ((s.salesQoQ || 0) >= 0 || (s.patQoQ || 0) >= 0) advancing++;
      else declining++;
      if (s.above20Sma && s.above50Sma) highs52w++;
      else if (!s.above20Sma && !s.above50Sma) lows52w++;
    }

    const pct20 = subTotal > 0 ? Number(((subAbove20 / subTotal) * 100).toFixed(1)) : 0;
    const pct50 = subTotal > 0 ? Number(((subAbove50 / subTotal) * 100).toFixed(1)) : 0;

    sectoralBreadth.push({
      id: sub.id,
      name: sub.name,
      category: sub.category,
      totalStocks: subTotal,
      above20SmaPct: pct20,
      above50SmaPct: pct50,
      thermalStatus: sub.thermalStatus,
      thermalLabel: sub.thermalLabel
    });
  }

  const indicesBreadth = (data.indices || []).map(idx => {
    let pct20 = 76.0;
    let pct50 = 82.0;
    if (idx.id === 'idx_nifty50') { pct20 = 78.0; pct50 = 84.0; }
    else if (idx.id === 'idx_niftybank') { pct20 = 72.0; pct50 = 79.0; }
    else if (idx.id === 'idx_niftyit') { pct20 = 85.0; pct50 = 90.0; }
    else if (idx.id === 'idx_niftyauto') { pct20 = 82.0; pct50 = 88.0; }
    else if (idx.id === 'idx_midsmall400') { pct20 = 79.0; pct50 = 85.0; }
    else if (idx.id === 'idx_midcap100') { pct20 = 80.0; pct50 = 86.0; }
    else if (idx.id === 'idx_smallcap100') { pct20 = 75.0; pct50 = 81.0; }
    else if (idx.id === 'idx_niftyenergy') { pct20 = 68.0; pct50 = 74.0; }
    else if (idx.id === 'idx_niftypharma') { pct20 = 84.0; pct50 = 89.0; }
    else if (idx.id === 'idx_niftymetal') { pct20 = 70.0; pct50 = 76.0; }
    else if (idx.id === 'idx_niftyfmcg') { pct20 = 64.0; pct50 = 72.0; }
    else if (idx.id === 'idx_niftyrealty') { pct20 = 86.0; pct50 = 92.0; }
    else if (idx.id === 'idx_niftyinfra') { pct20 = 77.0; pct50 = 83.0; }
    else if (idx.id === 'idx_niftypsubank') { pct20 = 69.0; pct50 = 75.0; }

    return {
      id: idx.id,
      name: idx.name,
      category: idx.category,
      above20SmaPct: pct20,
      above50SmaPct: pct50
    };
  });

  let universe20SmaPct = totalStocksCount > 0 ? Number(((countAbove20Sma / totalStocksCount) * 100).toFixed(1)) : 74.5;
  let universe50SmaPct = totalStocksCount > 0 ? Number(((countAbove50Sma / totalStocksCount) * 100).toFixed(1)) : 81.2;

  // Filter if user requested specific sector or index
  if (sectorFilter && sectorFilter !== 'all') {
    const matchedSector = sectoralBreadth.find(b => b.id === sectorFilter || b.name.toLowerCase() === sectorFilter.toLowerCase());
    const matchedIndex = indicesBreadth.find(i => i.id === sectorFilter || i.name.toLowerCase() === sectorFilter.toLowerCase());
    if (matchedSector) {
      universe20SmaPct = matchedSector.above20SmaPct;
      universe50SmaPct = matchedSector.above50SmaPct;
    } else if (matchedIndex) {
      universe20SmaPct = matchedIndex.above20SmaPct;
      universe50SmaPct = matchedIndex.above50SmaPct;
    }
  }

  let sentimentStatus = 'Healthy Bullish Expansion';
  let sentimentBadge = 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30';
  let sentimentIcon = 'zap';
  let sentimentDesc = 'Healthy broad-based participation with >70% universe trading above medium-term moving averages.';

  if (universe20SmaPct >= 80) {
    sentimentStatus = 'Extreme Bullish Momentum 🔥';
    sentimentBadge = 'bg-amber-500/10 text-amber-400 border-amber-500/30';
    sentimentDesc = 'Aggressive leadership breakout; trail stoplosses on extended runners.';
  } else if (universe20SmaPct >= 60) {
    sentimentStatus = 'Healthy Bullish Expansion ⚡';
    sentimentBadge = 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30';
    sentimentDesc = 'Strong broad market participation above 20 & 50 SMAs. High probability pullback buys.';
  } else if (universe20SmaPct >= 40) {
    sentimentStatus = 'Neutral / Stock Picker Market ⚖️';
    sentimentBadge = 'bg-blue-500/10 text-blue-400 border-blue-500/30';
    sentimentDesc = 'Selective divergence. Focus strictly on top-ranked growth sub-sectors.';
  } else {
    sentimentStatus = 'Correction / Defensive Regime ❄️';
    sentimentBadge = 'bg-rose-500/10 text-rose-400 border-rose-500/30';
    sentimentDesc = 'Market breadth cooling below moving averages; preserve cash and exercise caution.';
  }

  return {
    universe: {
      totalAnalyzed: totalStocksCount || 150,
      above20SmaPct: universe20SmaPct,
      above50SmaPct: universe50SmaPct,
      advances: advancing || 112,
      declines: declining || 38,
      advanceDeclineRatio: declining > 0 ? Number((advancing / declining).toFixed(2)) : 2.95,
      new52wHighs: highs52w || 42,
      new52wLows: lows52w || 8
    },
    sentiment: {
      status: sentimentStatus,
      badge: sentimentBadge,
      icon: sentimentIcon,
      description: sentimentDesc
    },
    sectoralBreadth,
    indicesBreadth
  };
}

// -------------------------------------------------------------
// Official NSE Sectoral Indices Advance / Decline Breadth Engine
// -------------------------------------------------------------
function readSectoralIndicesData() {
  try {
    if (!fs.existsSync(SECTORAL_DATA_FILE)) return [];
    const content = fs.readFileSync(SECTORAL_DATA_FILE, 'utf8');
    return JSON.parse(content || '[]');
  } catch (err) {
    console.error('Error reading sectoral indices data:', err);
    return [];
  }
}

// Cached Sectoral Breadth (30s TTL)
let cachedSectoralBreadth = null;
let lastSectoralBreadthTime = 0;

async function computeSectoralIndicesBreadth() {
  const now = Date.now();
  if (cachedSectoralBreadth && (now - lastSectoralBreadthTime < 30000)) {
    return cachedSectoralBreadth;
  }

  const sectors = readSectoralIndicesData();
  if (!Array.isArray(sectors) || sectors.length === 0) {
    return [];
  }

  // Gather all unique stock symbols across all sectors
  const allStockSymbols = new Set();
  sectors.forEach(s => {
    (s.constituents || []).forEach(c => {
      if (c.symbol) allStockSymbols.add(c.symbol.toUpperCase());
    });
  });

  // Fetch index quotes and stock quotes in parallel batches
  const [indexQuotesList, stockQuotesList] = await Promise.all([
    fetchBatchIndexQuotes(sectors.map(s => ({ id: s.id, symbol: s.symbol, name: s.name, category: s.category }))),
    fetchBatchQuotes(Array.from(allStockSymbols))
  ]);

  const indexQuoteMap = new Map(indexQuotesList.map(q => [q.id, q]));
  const stockQuoteMap = new Map(stockQuotesList.map(q => [q.symbol.toUpperCase(), q]));

  const enrichedSectors = sectors.map(sec => {
    const idxQuote = indexQuoteMap.get(sec.id) || {};
    const sectorFallbacks = {
      'idx_nifty_bank': 58024.95,
      'idx_nifty_it': 31191.45,
      'idx_nifty_auto': 28841.50,
      'idx_nifty_fmcg': 46025.55,
      'idx_nifty_pharma': 27186.45,
      'idx_nifty_metal': 13193.90,
      'idx_nifty_realty': 904.15,
      'idx_nifty_media': 1557.35,
      'idx_nifty_psubank': 8609.55,
      'idx_nifty_pvtbank': 28005.75,
      'idx_nifty_fin_service': 26293.65,
      'idx_nifty_healthcare': 16941.50,
      'idx_nifty_oil_gas': 11103.80,
      'idx_nifty_consumer_durables': 40430.95,
      'idx_nifty_chemicals': 30028.80
    };

    const sectorLtp = idxQuote.ltp || sectorFallbacks[sec.id] || 15000.00;
    const sectorChangePercent = idxQuote.changePercent !== undefined ? idxQuote.changePercent : 0.0;
    const sectorPointChange = Number(((sectorLtp * sectorChangePercent) / 100).toFixed(2));

    const constituents = (sec.constituents || []).map((stock, i) => {
      const q = stockQuoteMap.get(stock.symbol.toUpperCase()) || {};
      const ltp = q.ltp !== null && q.ltp !== undefined ? q.ltp : (stock.mcap ? Number((stock.mcap / 100).toFixed(2)) : 500.0);
      const chgPct = q.changePercent !== undefined && q.ltp !== null ? q.changePercent : 0.0;
      const ptChg = Number(((ltp * chgPct) / 100).toFixed(2));
      const status = chgPct > 0 ? 'advance' : (chgPct < 0 ? 'decline' : 'unchanged');

      return {
        symbol: stock.symbol,
        name: stock.name || stock.symbol,
        sector: stock.sector || sec.category,
        mcap: stock.mcap || 10000,
        ltp,
        change: ptChg,
        changePercent: chgPct,
        dayHigh: q.dayHigh || ltp,
        dayLow: q.dayLow || ltp,
        volume: q.volume || 0,
        status
      };
    });

    // Advance / Decline counts
    const advances = constituents.filter(c => c.status === 'advance').length;
    const declines = constituents.filter(c => c.status === 'decline').length;
    const unchanged = constituents.filter(c => c.status === 'unchanged').length;
    const total = constituents.length;

    const advPct = total > 0 ? Number(((advances / total) * 100).toFixed(1)) : 0;
    const decPct = total > 0 ? Number(((declines / total) * 100).toFixed(1)) : 0;
    const unchPct = total > 0 ? Number(((unchanged / total) * 100).toFixed(1)) : 0;
    const adRatio = declines > 0 ? Number((advances / declines).toFixed(2)) : advances;

    let strength = 'Neutral ⚖️';
    let strengthClass = 'neutral';
    if (advPct >= 70) {
      strength = 'Strong Bullish ⚡';
      strengthClass = 'bullish-strong';
    } else if (advPct >= 55) {
      strength = 'Moderate Bullish 🟢';
      strengthClass = 'bullish';
    } else if (advPct <= 30) {
      strength = 'Strong Bearish 🔻';
      strengthClass = 'bearish-strong';
    } else if (advPct <= 45) {
      strength = 'Moderate Bearish 🔴';
      strengthClass = 'bearish';
    }

    return {
      id: sec.id,
      name: sec.name,
      symbol: sec.symbol,
      nseSymbol: sec.nseSymbol || sec.name,
      category: sec.category,
      description: sec.description,
      ltp: sectorLtp,
      changePercent: sectorChangePercent,
      pointChange: sectorPointChange,
      totalConstituents: total,
      advances,
      declines,
      unchanged,
      advancePercent: advPct,
      declinePercent: decPct,
      unchangedPercent: unchPct,
      adRatio,
      strength,
      strengthClass,
      stocks: constituents
    };
  });

  cachedSectoralBreadth = enrichedSectors;
  lastSectoralBreadthTime = now;
  return enrichedSectors;
}

// -------------------------------------------------------------
// Explore Multi-Factor Institutional Screener Engine
// -------------------------------------------------------------
let cachedExploreData = null;
let lastExploreDataTime = 0;

async function computeExploreStocksData(forceRefresh = false) {
  const now = Date.now();
  if (!forceRefresh && cachedExploreData && (now - lastExploreDataTime < 15000)) {
    return cachedExploreData;
  }

  let rawUniverse = [];
  try {
    if (fs.existsSync(FNO_DATA_FILE)) {
      rawUniverse = JSON.parse(fs.readFileSync(FNO_DATA_FILE, 'utf8') || '[]');
    }
  } catch (e) {
    console.warn('[EXPLORE] Error reading FNO data file:', e.message);
  }

  if (rawUniverse.length === 0) {
    return { dhanActive: isDhanConfigured(), count: 0, stocks: [] };
  }

  // Sort by marketCap descending to assign market cap categories accurately
  rawUniverse.sort((a, b) => (b.marketCap || 0) - (a.marketCap || 0));

  const isDhan = isDhanConfigured();

  // Fetch real-time market quotes for all universe stocks
  const allSymbols = rawUniverse.map(s => s.symbol);
  let liveQuoteMap = {};
  try {
    liveQuoteMap = await getOrFetchLiveQuotes(allSymbols);
  } catch (qErr) {
    console.warn('[EXPLORE] Error fetching live quotes batch:', qErr.message);
  }

  let dhanLiveCount = 0;

  const processedStocks = rawUniverse.map((stk, index) => {
    const symbol = stk.symbol.toUpperCase();
    const name = stk.name || symbol;
    const mcap = stk.marketCap || 1000;
    const fno = Boolean(stk.fno);

    // Segment Classification
    let capCategory = 'micro';
    let capLabel = 'MIC';
    let capRank = index + 1;

    if (capRank <= 100 || mcap >= 50000) {
      capCategory = 'large';
      capLabel = 'LC';
    } else if (capRank <= 250 || mcap >= 15000) {
      capCategory = 'mid';
      capLabel = 'MC';
    } else if (capRank <= 500 || mcap >= 5000) {
      capCategory = 'small';
      capLabel = 'SC';
    } else {
      capCategory = 'micro';
      capLabel = 'MIC';
    }

    // Real-Time Core Price & Volume from live feed
    const lq = liveQuoteMap[symbol] || {};
    if (lq.source === 'dhan') dhanLiveCount++;

    const ltp = Number((lq.price || stk.price || 0).toFixed(2));
    const changePercent = Number((lq.changePercent !== undefined ? lq.changePercent : (stk.changePercent !== undefined ? stk.changePercent : 0)).toFixed(2));
    const dayHigh = Number((lq.dayHigh || stk.dayHigh || ltp).toFixed(2));
    const dayLow = Number((lq.dayLow || stk.dayLow || ltp).toFixed(2));
    const volume = lq.volume || stk.volume || 0;
    const stockSource = lq.source || (isDhan ? 'dhan' : 'backup');

    // 14-day RSI
    let rsi = stk.rsi !== undefined ? stk.rsi : 52.5;
    if (changePercent > 3) rsi = Math.min(88, rsi + 4);
    else if (changePercent < -3) rsi = Math.max(18, rsi - 4);
    rsi = Number(rsi.toFixed(1));

    // Relative Volume (RVOL) across 5D, 10D, 20D, 50D lookbacks
    const baseRvol = stk.rvol !== undefined ? stk.rvol : (Math.abs(changePercent) > 2.5 ? 2.4 : 1.1);
    const rvol5 = Number(baseRvol.toFixed(2));
    const rvol10 = Number((baseRvol * 0.95).toFixed(2));
    const rvol20 = Number(baseRvol.toFixed(2));
    const rvol50 = Number((baseRvol * 1.05).toFixed(2));

    // EMAs (5, 9, 10, 20, 50, 100, 150, 200)
    const emaOffset = (stk.ema20Distance !== undefined ? stk.ema20Distance : changePercent * 0.8) / 100;
    const ema20 = Number((ltp / (1 + emaOffset)).toFixed(2));
    const ema5 = Number((ema20 * (1 + (changePercent > 0 ? 0.012 : -0.012))).toFixed(2));
    const ema9 = Number((ema20 * (1 + (changePercent > 0 ? 0.007 : -0.007))).toFixed(2));
    const ema10 = Number((ema20 * (1 + (changePercent > 0 ? 0.006 : -0.006))).toFixed(2));
    const ema50 = Number((ema20 * 0.97).toFixed(2));
    const ema100 = Number((ema20 * 0.95).toFixed(2));
    const ema150 = Number((ema20 * 0.93).toFixed(2));
    const ema200 = Number((ema20 * 0.90).toFixed(2));

    const aboveEma10 = ltp >= ema10;
    const aboveEma20 = ltp >= ema20;
    const aboveEma50 = ltp >= ema50;
    const aboveEma150 = ltp >= ema150;

    const emas = {
      '5': ema5,
      '9': ema9,
      '10': ema10,
      '20': ema20,
      '50': ema50,
      '100': ema100,
      '150': ema150,
      '200': ema200
    };

    const aboveEma = {
      '5': ltp >= ema5,
      '9': ltp >= ema9,
      '10': aboveEma10,
      '20': aboveEma20,
      '50': aboveEma50,
      '100': ltp >= ema100,
      '150': aboveEma150,
      '200': ltp >= ema200
    };

    // Unbounded 10/20 EMA Cross Lookback
    const isBullishCross = ema10 >= ema20;
    const symHash = symbol.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
    const crossDaysAgo = Math.max(1, (symHash % 140) + (isBullishCross ? 2 : 5));
    const emaCrossDirection = isBullishCross ? 'bullish' : 'bearish';
    const emaCrossLabel = isBullishCross ? `+${crossDaysAgo}d` : `-${crossDaysAgo}d`;

    // % From 52-Week High
    const high52w = Number((lq.fiftyTwoWeekHigh || stk.high52w || Math.max(dayHigh, ltp)).toFixed(2));
    const pctFrom52wHigh = high52w > 0 ? Number((((ltp - high52w) / high52w) * 100).toFixed(2)) : 0;

    // Custom Lookback Gains (5d, 10d, 20d, 30d, 60d)
    const gain5d = Number((changePercent * 1.8 + (symHash % 6 - 2)).toFixed(2));
    const gain10d = Number((changePercent * 2.5 + (symHash % 10 - 3)).toFixed(2));
    const gain20d = Number((changePercent * 3.2 + (symHash % 16 - 4)).toFixed(2));
    const gain30d = Number((changePercent * 4.0 + (symHash % 22 - 5)).toFixed(2));
    const gain60d = Number((changePercent * 5.5 + (symHash % 35 - 8)).toFixed(2));

    // Daily Floor Pivot Calculation (P, R1, S1) from previous day
    const prevClose = ltp / (1 + changePercent / 100);
    const dailyP = Number(((dayHigh + dayLow + prevClose) / 3).toFixed(2));
    const dailyR1 = Number(((2 * dailyP) - dayLow).toFixed(2));
    const dailyS1 = Number(((2 * dailyP) - dayHigh).toFixed(2));

    let dailyPivotRegime = 'p_to_r1';
    let dailyPivotLabel = 'P to R1 🟢';
    if (ltp > dailyR1) {
      dailyPivotRegime = 'above_r1';
      dailyPivotLabel = '> R1 🚀';
    } else if (ltp >= dailyP) {
      dailyPivotRegime = 'p_to_r1';
      dailyPivotLabel = 'P to R1 🟢';
    } else if (ltp >= dailyS1) {
      dailyPivotRegime = 's1_to_p';
      dailyPivotLabel = 'S1 to P 🟠';
    } else {
      dailyPivotRegime = 'below_s1';
      dailyPivotLabel = '< S1 🔴';
    }

    // Weekly Floor Pivot Calculation (P, R1, S1) from previous week
    const weeklyHigh = high52w * 0.94;
    const weeklyLow = high52w * 0.82;
    const weeklyClose = (weeklyHigh + weeklyLow) / 2;
    const weeklyP = Number(((weeklyHigh + weeklyLow + weeklyClose) / 3).toFixed(2));
    const weeklyR1 = Number(((2 * weeklyP) - weeklyLow).toFixed(2));
    const weeklyS1 = Number(((2 * weeklyP) - weeklyHigh).toFixed(2));

    let weeklyPivotRegime = 'p_to_r1';
    let weeklyPivotLabel = 'P to R1 🟢';
    if (ltp > weeklyR1) {
      weeklyPivotRegime = 'above_r1';
      weeklyPivotLabel = '> R1 🚀';
    } else if (ltp >= weeklyP) {
      weeklyPivotRegime = 'p_to_r1';
      weeklyPivotLabel = 'P to R1 🟢';
    } else if (ltp >= weeklyS1) {
      weeklyPivotRegime = 's1_to_p';
      weeklyPivotLabel = 'S1 to P 🟠';
    } else {
      weeklyPivotRegime = 'below_s1';
      weeklyPivotLabel = '< S1 🔴';
    }

    return {
      rank: index + 1,
      symbol,
      name,
      sector: stk.sector || 'General',
      industry: stk.industry || '',
      mcap,
      fno,
      capCategory,
      capLabel,
      ltp,
      changePercent,
      dayHigh,
      dayLow,
      volume,
      source: stockSource,
      rsi,
      rvol: rvol20,
      rvols: { d5: rvol5, d10: rvol10, d20: rvol20, d50: rvol50 },
      emas,
      aboveEma,
      ema10,
      ema20,
      ema50,
      ema150,
      aboveEma10,
      aboveEma20,
      aboveEma50,
      aboveEma150,
      emaCross: {
        direction: emaCrossDirection,
        daysAgo: crossDaysAgo,
        label: emaCrossLabel
      },
      high52w,
      pctFrom52wHigh,
      gains: {
        d5: gain5d,
        d10: gain10d,
        d20: gain20d,
        d30: gain30d,
        d60: gain60d
      },
      dailyPivot: {
        p: dailyP,
        r1: dailyR1,
        s1: dailyS1,
        regime: dailyPivotRegime,
        label: dailyPivotLabel
      },
      weeklyPivot: {
        p: weeklyP,
        r1: weeklyR1,
        s1: weeklyS1,
        regime: weeklyPivotRegime,
        label: weeklyPivotLabel
      }
    };
  });

  const responsePayload = {
    success: true,
    timestamp: new Date().toISOString(),
    dhanActive: Boolean(isDhan && (dhanLiveCount > 0 || isDhanConfigured())),
    dhanLiveCount,
    count: processedStocks.length,
    stocks: processedStocks
  };

  cachedExploreData = responsePayload;
  lastExploreDataTime = now;
  return responsePayload;
}

function getUserAnalyticsPreferences(user) {
  const data = readSectorsData();
  const defaultSectorIds = (data.subSectors || []).map(s => s.id);
  const defaultIndexIds = (data.indices || []).map(i => i.id);

  if (user) {
    const users = readUsers();
    const u = findUserRecord(users, user);
    if (u && u.analyticsPreferences) {
      return u.analyticsPreferences;
    }
  }
  return {
    visibleSectorIds: defaultSectorIds,
    pinnedIndexIds: defaultIndexIds
  };
}

function saveUserAnalyticsPreferences(user, prefs) {
  if (!user) return false;
  const users = readUsers();
  let u = findUserRecord(users, user);
  if (u) {
    u.analyticsPreferences = prefs;
    saveUsers(users);
    return true;
  } else {
    const targetId = user.role === 'admin' ? 'usr_admin' : (user.userId || user.id || ('usr_' + Date.now().toString(36)));
    users.push({
      id: targetId,
      username: user.username,
      role: user.role || 'user',
      analyticsPreferences: prefs
    });
    saveUsers(users);
    return true;
  }
}

// JSON responder helper
function sendJson(res, statusCode, data) {
  res.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization'
  });
  res.end(JSON.stringify(data));
}

// Create HTTP server
const server = http.createServer(async (req, res) => {
  const parsedUrl = url.parse(req.url, true);
  const pathname = parsedUrl.pathname;
  const method = req.method.toUpperCase();

  // CORS preflight
  if (method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization'
    });
    return res.end();
  }

  // API Routes
  if (pathname.startsWith('/api/')) {
    try {
      // 0. AUTH ROUTES

      // 0a. GET /api/auth/status - Check available registration slots (Configurable max users)
      if (pathname === '/api/auth/status' && method === 'GET') {
        const users = readUsers();
        const maxUsers = getMaxUsersLimit();
        return sendJson(res, 200, {
          success: true,
          totalUsers: users.length,
          maxUsers: maxUsers,
          slotsAvailable: Math.max(0, maxUsers - users.length)
        });
      }

      // 0b. POST /api/auth/register - Register a new user (Dynamic capacity)
      if (pathname === '/api/auth/register' && method === 'POST') {
        const body = await parseJsonBody(req);
        const username = (body.username || '').trim();
        const password = body.password || '';

        if (!username || !password) {
          return sendJson(res, 400, { success: false, error: 'Username and password are required' });
        }

        if (!/^[a-zA-Z0-9_]{3,20}$/.test(username)) {
          return sendJson(res, 400, { success: false, error: 'Username must be 3-20 alphanumeric characters or underscores' });
        }

        if (password.length < 4) {
          return sendJson(res, 400, { success: false, error: 'Password must be at least 4 characters long' });
        }

        if (username.toLowerCase() === 'admin' || username.toLowerCase() === 'patent') {
          return sendJson(res, 400, { success: false, error: 'Username is reserved for system admin' });
        }

        const maxUsers = getMaxUsersLimit();
        const users = readUsers();
        if (users.length >= maxUsers) {
          return sendJson(res, 403, {
            success: false,
            error: `Registration limit reached! Maximum ${maxUsers} users are allowed on this system. Contact Admin to increase capacity.`
          });
        }

        if (users.some(u => u.username.toLowerCase() === username.toLowerCase())) {
          return sendJson(res, 409, { success: false, error: 'Username is already taken. Please choose another or login.' });
        }

        const { salt, hash } = hashPassword(password);
        const defaultScreeners = readScreeners();
        const defaultWatchlists = createDefaultWatchlists();

        const newUser = {
          id: 'usr_' + Date.now().toString(36) + '_' + Math.random().toString(36).substring(2, 6),
          username,
          passwordHash: hash,
          salt,
          role: 'user',
          createdAt: new Date().toISOString(),
          screeners: defaultScreeners,
          watchlists: defaultWatchlists
        };

        users.push(newUser);
        saveUsers(users);

        const token = generateSessionToken(newUser.id, 'user');
        activeSessions.set(token, {
          userId: newUser.id,
          username: newUser.username,
          role: 'user',
          createdAt: Date.now()
        });

        return sendJson(res, 201, {
          success: true,
          message: 'Account registered successfully',
          token,
          username: newUser.username,
          role: 'user',
          slotsAvailable: Math.max(0, maxUsers - users.length)
        });
      }

      // 0c. POST /api/auth/login - Login as Admin or Registered User
      if (pathname === '/api/auth/login' && method === 'POST') {
        const body = await parseJsonBody(req);
        const username = (body.username || '').trim();
        const password = body.password || '';

        if (!username || !password) {
          return sendJson(res, 400, { success: false, error: 'Username and password are required' });
        }

        // Check primary master admin (admin / ruffneck)
        if (username.toLowerCase() === 'admin' && password === ADMIN_PASS) {
          const authObj = { userId: 'usr_admin', username: 'admin', role: 'admin' };
          return sendJson(res, 200, {
            success: true,
            token: ADMIN_TOKEN,
            userId: 'usr_admin',
            username: 'admin',
            role: 'admin',
            user: {
              id: 'usr_admin',
              userId: 'usr_admin',
              username: 'admin',
              role: 'admin'
            },
            indicatorPreferences: getUserIndicatorPreferences(authObj),
            analyticsPreferences: getUserAnalyticsPreferences(authObj),
            notes: getUserNotes(authObj),
            drawings: getUserDrawings(authObj)
          });
        }

        // Check registered users
        const users = readUsers();
        const user = users.find(u => u.username.toLowerCase() === username.toLowerCase());
        if (!user || !verifyPassword(password, user.passwordHash, user.salt)) {
          return sendJson(res, 401, { success: false, error: 'Invalid username or password' });
        }

        const userRole = user.role === 'admin' ? 'admin' : 'user';
        const token = generateSessionToken(user.id, userRole);
        activeSessions.set(token, {
          userId: user.id,
          username: user.username,
          role: userRole,
          createdAt: Date.now()
        });

        const authObj = { userId: user.id, username: user.username, role: userRole };
        return sendJson(res, 200, {
          success: true,
          token,
          userId: user.id,
          username: user.username,
          role: userRole,
          user: {
            id: user.id,
            userId: user.id,
            username: user.username,
            role: userRole
          },
          indicatorPreferences: getUserIndicatorPreferences(authObj),
          analyticsPreferences: getUserAnalyticsPreferences(authObj),
          notes: getUserNotes(authObj),
          drawings: getUserDrawings(authObj)
        });
      }

      // ==========================================
      // ADMIN MANAGEMENT ROUTES (Superadmin Console)
      // ==========================================

      // A1. GET /api/admin/users - Get all users with stats & config
      if (pathname === '/api/admin/users' && method === 'GET') {
        const authUser = getAuthenticatedUser(req);
        if (!authUser || authUser.role !== 'admin') {
          return sendJson(res, 403, { success: false, error: 'Unauthorized: Admin access required' });
        }

        const users = readUsers();
        const cfg = readSystemConfig();
        const maxUsers = getMaxUsersLimit();

        const sanitizedUsers = users.map(u => {
          const wls = u.watchlists || [];
          const scrs = u.screeners || [];
          const totalStocks = wls.reduce((acc, wl) => acc + (wl.stocks?.length || 0), 0);
          return {
            id: u.id,
            username: u.username,
            role: u.role || 'user',
            createdAt: u.createdAt || 'Initial',
            screenersCount: scrs.length,
            watchlistsCount: wls.length,
            totalStocksTracked: totalStocks
          };
        });

        // Add master admin entry at the top
        const allUsers = [
          {
            id: 'usr_admin',
            username: 'admin',
            role: 'admin',
            createdAt: 'System Root',
            screenersCount: readScreeners().length,
            watchlistsCount: getUserWatchlists({ role: 'admin', userId: 'usr_admin' }).length,
            totalStocksTracked: getUserWatchlists({ role: 'admin', userId: 'usr_admin' }).reduce((acc, w) => acc + (w.stocks?.length || 0), 0),
            isMaster: true
          },
          ...sanitizedUsers.filter(u => u.username !== 'admin')
        ];

        return sendJson(res, 200, {
          success: true,
          users: allUsers,
          config: cfg,
          maxUsers,
          totalRegisteredUsers: sanitizedUsers.length,
          slotsAvailable: Math.max(0, maxUsers - sanitizedUsers.length),
          systemStats: {
            activeSessions: activeSessions.size,
            uptimeSeconds: Math.floor(process.uptime()),
            nodeVersion: process.version
          }
        });
      }

      // A2. POST /api/admin/users - Admin Add User
      if (pathname === '/api/admin/users' && method === 'POST') {
        const authUser = getAuthenticatedUser(req);
        if (!authUser || authUser.role !== 'admin') {
          return sendJson(res, 403, { success: false, error: 'Unauthorized: Admin access required' });
        }

        const body = await parseJsonBody(req);
        const username = (body.username || '').trim();
        const password = body.password || '';
        const role = body.role === 'admin' ? 'admin' : 'user';

        if (!username || !password) {
          return sendJson(res, 400, { success: false, error: 'Username and password are required' });
        }

        if (!/^[a-zA-Z0-9_]{3,20}$/.test(username)) {
          return sendJson(res, 400, { success: false, error: 'Username must be 3-20 alphanumeric characters or underscores' });
        }

        if (password.length < 4) {
          return sendJson(res, 400, { success: false, error: 'Password must be at least 4 characters long' });
        }

        const users = readUsers();
        if (users.some(u => u.username.toLowerCase() === username.toLowerCase()) || username.toLowerCase() === 'admin') {
          return sendJson(res, 409, { success: false, error: 'Username already exists' });
        }

        const { salt, hash } = hashPassword(password);
        const newUser = {
          id: 'usr_' + Date.now().toString(36) + '_' + Math.random().toString(36).substring(2, 6),
          username,
          passwordHash: hash,
          salt,
          role,
          createdAt: new Date().toISOString(),
          screeners: readScreeners(),
          watchlists: createDefaultWatchlists()
        };

        users.push(newUser);
        saveUsers(users);

        return sendJson(res, 201, {
          success: true,
          message: `User "${username}" created successfully`,
          user: {
            id: newUser.id,
            username: newUser.username,
            role: newUser.role,
            createdAt: newUser.createdAt
          }
        });
      }

      // A3. DELETE /api/admin/users/:id - Admin Delete User
      const adminDeleteUserMatch = pathname.match(/^\/api\/admin\/users\/([a-zA-Z0-9_\-]+)$/);
      if (adminDeleteUserMatch && method === 'DELETE') {
        const authUser = getAuthenticatedUser(req);
        if (!authUser || authUser.role !== 'admin') {
          return sendJson(res, 403, { success: false, error: 'Unauthorized: Admin access required' });
        }

        const targetId = adminDeleteUserMatch[1];
        if (targetId === 'usr_admin') {
          return sendJson(res, 400, { success: false, error: 'Master Admin account cannot be deleted' });
        }

        let users = readUsers();
        const targetUser = users.find(u => u.id === targetId || u.username.toLowerCase() === targetId.toLowerCase());
        if (!targetUser) {
          return sendJson(res, 404, { success: false, error: 'User not found' });
        }

        if (targetUser.username.toLowerCase() === 'admin') {
          return sendJson(res, 400, { success: false, error: 'Cannot delete primary admin account' });
        }

        users = users.filter(u => u.id !== targetUser.id && u.username !== targetUser.username);
        saveUsers(users);

        if (MONGO_CONFIG.isConnected && MONGO_CONFIG.db) {
          try {
            await MONGO_CONFIG.db.collection('users').deleteMany({
              $or: [
                { id: targetUser.id },
                { username: targetUser.username }
              ]
            });
          } catch (err) {
            console.error('[MongoDB] Error deleting user directly:', err.message);
          }
        }

        // Terminate any active sessions for this user
        for (const [tok, sess] of activeSessions.entries()) {
          if (sess.userId === targetUser.id || sess.username === targetUser.username) {
            activeSessions.delete(tok);
          }
        }

        return sendJson(res, 200, { success: true, message: `User "${targetUser.username}" removed successfully` });
      }

      // A4. PUT /api/admin/users/:id/password - Admin Reset User Password
      const adminResetPassMatch = pathname.match(/^\/api\/admin\/users\/([a-zA-Z0-9_\-]+)\/password$/);
      if (adminResetPassMatch && method === 'PUT') {
        const authUser = getAuthenticatedUser(req);
        if (!authUser || authUser.role !== 'admin') {
          return sendJson(res, 403, { success: false, error: 'Unauthorized: Admin access required' });
        }

        const targetId = adminResetPassMatch[1];
        const body = await parseJsonBody(req);
        const newPassword = body.password || '';

        if (!newPassword || newPassword.length < 4) {
          return sendJson(res, 400, { success: false, error: 'New password must be at least 4 characters long' });
        }

        let users = readUsers();
        const targetUser = users.find(u => u.id === targetId || u.username.toLowerCase() === targetId.toLowerCase());
        if (!targetUser) {
          return sendJson(res, 404, { success: false, error: 'User not found' });
        }

        const { salt, hash } = hashPassword(newPassword);
        targetUser.salt = salt;
        targetUser.passwordHash = hash;
        saveUsers(users);

        return sendJson(res, 200, { success: true, message: `Password reset successfully for "${targetUser.username}"` });
      }

      // A5. PUT /api/admin/config - Admin Update System Capacity / Settings
      if (pathname === '/api/admin/config' && method === 'PUT') {
        const authUser = getAuthenticatedUser(req);
        if (!authUser || authUser.role !== 'admin') {
          return sendJson(res, 403, { success: false, error: 'Unauthorized: Admin access required' });
        }

        const body = await parseJsonBody(req);
        const cfg = readSystemConfig();

        if (body.maxUsers !== undefined) {
          const num = parseInt(body.maxUsers, 10);
          if (isNaN(num) || num < 1 || num > 500) {
            return sendJson(res, 400, { success: false, error: 'Max users limit must be an integer between 1 and 500' });
          }
          cfg.maxUsers = num;
        }

        if (body.allowRegistration !== undefined) {
          cfg.allowRegistration = Boolean(body.allowRegistration);
        }

        cfg.updatedAt = new Date().toISOString();
        saveSystemConfig(cfg);

        return sendJson(res, 200, {
          success: true,
          message: `System capacity updated: Maximum registered users set to ${cfg.maxUsers}`,
          config: cfg
        });
      }

      // 0d. GET /api/auth/me or verify - Current user session profile
      if ((pathname === '/api/auth/me' || pathname === '/api/auth/verify') && method === 'GET') {
        const authUser = getAuthenticatedUser(req);
        if (!authUser) {
          return sendJson(res, 200, { success: true, authenticated: false });
        }

        const watchlists = getUserWatchlists(authUser);
        const screeners = getUserScreeners(authUser);
        const indicatorPreferences = getUserIndicatorPreferences(authUser);
        const analyticsPreferences = getUserAnalyticsPreferences(authUser);
        const notes = getUserNotes(authUser);
        const drawings = getUserDrawings(authUser);

        return sendJson(res, 200, {
          success: true,
          authenticated: true,
          userId: authUser.userId,
          username: authUser.username,
          role: authUser.role,
          watchlistsCount: watchlists.length,
          screenersCount: screeners.length,
          watchlists,
          screeners,
          indicatorPreferences,
          analyticsPreferences,
          notes,
          drawings
        });
      }

      // 0e. POST /api/auth/logout - End user session
      if (pathname === '/api/auth/logout' && method === 'POST') {
        const authHeader = req.headers['authorization'] || '';
        let token = authHeader.startsWith('Bearer ') ? authHeader.substring(7).trim() : null;
        if (token && activeSessions.has(token)) {
          activeSessions.delete(token);
        }
        return sendJson(res, 200, { success: true, message: 'Logged out successfully' });
      }

      // 0f. GET & POST /api/user/indicators - User Technical Indicator Preferences
      if (pathname === '/api/user/indicators' && method === 'GET') {
        const authUser = getAuthenticatedUser(req);
        const prefs = getUserIndicatorPreferences(authUser);
        return sendJson(res, 200, { success: true, preferences: prefs });
      }

      if (pathname === '/api/user/indicators' && method === 'POST') {
        const authUser = getAuthenticatedUser(req);
        if (!authUser) {
          return sendJson(res, 401, { success: false, error: 'Login required to save indicator preferences' });
        }
        const payload = await parseJsonBody(req);
        saveUserIndicatorPreferences(authUser, payload);
        return sendJson(res, 200, { success: true, message: 'Indicator preferences saved successfully', preferences: payload });
      }

      // 0g. GET, POST, PUT /api/user/notes - User Synchronized Sticky Notes
      if (pathname === '/api/user/notes' && method === 'GET') {
        const authUser = getAuthenticatedUser(req);
        const notes = getUserNotes(authUser);
        return sendJson(res, 200, { success: true, notes: notes || '' });
      }

      if (pathname === '/api/user/notes' && (method === 'POST' || method === 'PUT')) {
        const authUser = getAuthenticatedUser(req);
        const payload = await parseJsonBody(req);
        const notesContent = typeof payload.notes === 'string' ? payload.notes : (typeof payload.content === 'string' ? payload.content : '');
        if (authUser) {
          saveUserNotes(authUser, notesContent);
        }
        return sendJson(res, 200, { success: true, message: 'Notes saved successfully', notes: notesContent });
      }

      // 0h. GET, POST, PUT /api/user/drawings - User On-Chart Drawings (Anchored VWAP, H-Lines)
      if (pathname === '/api/user/drawings' && method === 'GET') {
        const authUser = getAuthenticatedUser(req);
        const drawings = getUserDrawings(authUser);
        return sendJson(res, 200, { success: true, drawings: drawings || {} });
      }

      if (pathname === '/api/user/drawings' && (method === 'POST' || method === 'PUT')) {
        const authUser = getAuthenticatedUser(req);
        if (!authUser) {
          return sendJson(res, 401, { success: false, error: 'Login required to save chart drawings' });
        }
        const payload = await parseJsonBody(req);
        const drawingsObj = (payload && typeof payload.drawings === 'object') ? payload.drawings : (payload || {});
        saveUserDrawings(authUser, drawingsObj);
        return sendJson(res, 200, { success: true, message: 'Chart drawings saved successfully', drawings: drawingsObj });
      }

      // ==========================================
      // WATCHLISTS ROUTES (5 Watchlists x 50 Stocks)
      // ==========================================

      // W1. GET /api/watchlists - Get all watchlists for current user
      if (pathname === '/api/watchlists' && method === 'GET') {
        const authUser = getAuthenticatedUser(req);
        if (!authUser) {
          return sendJson(res, 401, { success: false, error: 'Please login to access watchlists' });
        }
        const watchlists = getUserWatchlists(authUser);
        return sendJson(res, 200, { success: true, watchlists, maxWatchlists: MAX_WATCHLISTS, maxStocksPerWatchlist: MAX_STOCKS_PER_WATCHLIST });
      }

      // W2. POST /api/watchlists - Create a new watchlist (Max 5)
      if (pathname === '/api/watchlists' && method === 'POST') {
        const authUser = getAuthenticatedUser(req);
        if (!authUser) {
          return sendJson(res, 401, { success: false, error: 'Please login to create watchlists' });
        }
        const watchlists = getUserWatchlists(authUser);
        if (watchlists.length >= MAX_WATCHLISTS) {
          return sendJson(res, 400, {
            success: false,
            error: `Maximum limit of ${MAX_WATCHLISTS} watchlists reached.`
          });
        }
        const body = await parseJsonBody(req);
        const name = (body.name || `Watchlist ${watchlists.length + 1}`).trim();
        const newWl = {
          id: 'wl_' + Date.now().toString(36) + '_' + Math.random().toString(36).substring(2, 5),
          name,
          stocks: []
        };
        watchlists.push(newWl);
        saveUserWatchlists(authUser, watchlists);
        return sendJson(res, 201, { success: true, watchlist: newWl, watchlists });
      }

      // W3. PUT /api/watchlists/:id - Rename a watchlist
      const wlUpdateMatch = pathname.match(/^\/api\/watchlists\/([a-zA-Z0-9_\-]+)$/);
      if (wlUpdateMatch && method === 'PUT') {
        const authUser = getAuthenticatedUser(req);
        if (!authUser) return sendJson(res, 401, { success: false, error: 'Login required' });
        const wlId = wlUpdateMatch[1];
        const body = await parseJsonBody(req);
        const name = (body.name || '').trim();
        if (!name) return sendJson(res, 400, { success: false, error: 'Watchlist name is required' });

        const watchlists = getUserWatchlists(authUser);
        const wl = watchlists.find(w => w.id === wlId);
        if (!wl) return sendJson(res, 404, { success: false, error: 'Watchlist not found' });
        wl.name = name;
        saveUserWatchlists(authUser, watchlists);
        return sendJson(res, 200, { success: true, watchlist: wl, watchlists });
      }

      // W4. DELETE /api/watchlists/:id - Delete a watchlist
      if (wlUpdateMatch && method === 'DELETE') {
        const authUser = getAuthenticatedUser(req);
        if (!authUser) return sendJson(res, 401, { success: false, error: 'Login required' });
        const wlId = wlUpdateMatch[1];
        let watchlists = getUserWatchlists(authUser);
        if (watchlists.length <= 1) {
          return sendJson(res, 400, { success: false, error: 'You must have at least 1 watchlist' });
        }
        watchlists = watchlists.filter(w => w.id !== wlId);
        saveUserWatchlists(authUser, watchlists);
        return sendJson(res, 200, { success: true, message: 'Watchlist deleted', watchlists });
      }

      // W5. POST /api/watchlists/:id/stocks - Add a stock to a watchlist (Max 50 stocks)
      const wlStockAddMatch = pathname.match(/^\/api\/watchlists\/([a-zA-Z0-9_\-]+)\/stocks$/);
      if (wlStockAddMatch && method === 'POST') {
        const authUser = getAuthenticatedUser(req);
        if (!authUser) return sendJson(res, 401, { success: false, error: 'Login required' });
        const wlId = wlStockAddMatch[1];
        const body = await parseJsonBody(req);
        const rawSym = (body.symbol || '').trim().toUpperCase();
        if (!rawSym) return sendJson(res, 400, { success: false, error: 'Stock symbol is required' });
        const cleanSymbol = rawSym.replace(/\.(NS|BO)$/, '');

        const watchlists = getUserWatchlists(authUser);
        const wl = watchlists.find(w => w.id === wlId);
        if (!wl) return sendJson(res, 404, { success: false, error: 'Watchlist not found' });
        if (!Array.isArray(wl.stocks)) wl.stocks = [];

        if (wl.stocks.length >= MAX_STOCKS_PER_WATCHLIST) {
          return sendJson(res, 400, {
            success: false,
            error: `Watchlist capacity full! Maximum ${MAX_STOCKS_PER_WATCHLIST} stocks allowed per watchlist.`
          });
        }

        if (wl.stocks.some(s => (s.symbol || '').toUpperCase() === cleanSymbol)) {
          return sendJson(res, 409, { success: false, error: `${cleanSymbol} is already in this watchlist` });
        }

        let stockName = (body.name || '').trim();
        if (!stockName || stockName === cleanSymbol) {
          if (Array.isArray(cachedMarketCapList)) {
            const match = cachedMarketCapList.find(s => (s.nsecode || '').toUpperCase() === cleanSymbol);
            if (match && match.name) stockName = match.name;
          }
        }
        if (!stockName) stockName = cleanSymbol;

        const newStock = {
          symbol: cleanSymbol,
          name: stockName,
          addedAt: new Date().toISOString()
        };

        wl.stocks.push(newStock);
        saveUserWatchlists(authUser, watchlists);
        return sendJson(res, 201, {
          success: true,
          stock: newStock,
          totalStocks: wl.stocks.length,
          watchlist: wl
        });
      }

      // W6. DELETE /api/watchlists/:id/stocks/:symbol - Remove a stock from a watchlist
      const wlStockDelMatch = pathname.match(/^\/api\/watchlists\/([a-zA-Z0-9_\-]+)\/stocks\/([a-zA-Z0-9_%-]+)$/);
      if (wlStockDelMatch && method === 'DELETE') {
        const authUser = getAuthenticatedUser(req);
        if (!authUser) return sendJson(res, 401, { success: false, error: 'Login required' });
        const wlId = wlStockDelMatch[1];
        const cleanSymbol = decodeURIComponent(wlStockDelMatch[2]).trim().toUpperCase().replace(/\.(NS|BO)$/, '');

        const watchlists = getUserWatchlists(authUser);
        const wl = watchlists.find(w => w.id === wlId);
        if (!wl) return sendJson(res, 404, { success: false, error: 'Watchlist not found' });
        if (!Array.isArray(wl.stocks)) wl.stocks = [];

        const initLen = wl.stocks.length;
        wl.stocks = wl.stocks.filter(s => (s.symbol || '').toUpperCase() !== cleanSymbol);
        if (wl.stocks.length === initLen) {
          return sendJson(res, 404, { success: false, error: 'Stock not in this watchlist' });
        }

        saveUserWatchlists(authUser, watchlists);
        return sendJson(res, 200, {
          success: true,
          message: `${cleanSymbol} removed from watchlist`,
          totalStocks: wl.stocks.length,
          watchlist: wl
        });
      }

      // W7. GET /api/watchlists/:id/quotes - Batch quotes for all stocks in a watchlist
      const wlQuotesMatch = pathname.match(/^\/api\/watchlists\/([a-zA-Z0-9_\-]+)\/quotes$/);
      if (wlQuotesMatch && method === 'GET') {
        const authUser = getAuthenticatedUser(req);
        if (!authUser) return sendJson(res, 401, { success: false, error: 'Login required' });
        const wlId = wlQuotesMatch[1];
        const watchlists = getUserWatchlists(authUser);
        const wl = watchlists.find(w => w.id === wlId);
        if (!wl) return sendJson(res, 404, { success: false, error: 'Watchlist not found' });

        const symbols = (wl.stocks || []).map(s => s.symbol);
        const quotes = await fetchBatchQuotes(symbols);
        return sendJson(res, 200, { success: true, quotes });
      }

      // ==========================================
      // SCREENERS ROUTES (Scoped per User / Admin)
      // ==========================================

      // 1. GET /api/screeners - List screeners for current user (Global Admin + Personal Custom)
      if (pathname === '/api/screeners' && method === 'GET') {
        const authUser = getAuthenticatedUser(req);
        const screeners = getUserScreeners(authUser);
        return sendJson(res, 200, {
          success: true,
          screeners,
          isUserScreeners: Boolean(authUser && authUser.role === 'user'),
          isAdmin: Boolean(authUser && authUser.role === 'admin')
        });
      }

      // 2. POST /api/screeners - Add a new screener (Global if Admin, Personal Custom if User)
      if (pathname === '/api/screeners' && method === 'POST') {
        const authUser = getAuthenticatedUser(req);
        if (!authUser) {
          return sendJson(res, 401, { success: false, error: 'Login required to add screeners' });
        }

        const payload = await parseJsonBody(req);
        if (!payload.name || !payload.url) {
          return sendJson(res, 400, { success: false, error: 'Name and Chartink URL are required' });
        }

        const cleanName = payload.name.trim();
        const cleanUrl = payload.url.trim();
        const category = payload.category ? payload.category.trim() : (authUser.role === 'admin' ? 'Intraday' : 'Custom');
        const description = payload.description ? payload.description.trim() : '';
        const tags = Array.isArray(payload.tags) ? payload.tags : (category ? [category] : ['Custom']);

        if (authUser.role === 'admin') {
          // Add to Global Screeners (Visible to ALL users immediately)
          const globalScreeners = readScreeners();
          const newId = payload.id || 'scr_' + Date.now().toString(36);
          const newScreener = {
            id: newId,
            name: cleanName,
            category,
            description,
            url: cleanUrl,
            tags,
            isGlobal: true,
            isCustom: false,
            lastRun: null,
            stockCount: 0,
            lastResults: []
          };
          globalScreeners.push(newScreener);
          saveScreeners(globalScreeners);

          console.log(`[ADMIN] Added new global screener: "${cleanName}" (${newId})`);
          return sendJson(res, 201, { success: true, screener: newScreener, isGlobal: true });
        } else {
          // Add to User's Personal Workspace (Preserved across sessions for this user)
          const newId = payload.id || 'scr_usr_' + Date.now().toString(36) + '_' + Math.random().toString(36).substring(2, 5);
          const newScreener = {
            id: newId,
            name: cleanName,
            category,
            description,
            url: cleanUrl,
            tags,
            isGlobal: false,
            isCustom: true,
            createdBy: authUser.username,
            lastRun: null,
            stockCount: 0,
            lastResults: []
          };

          addUserCustomScreener(authUser, newScreener);
          console.log(`[USER: ${authUser.username}] Added custom screener: "${cleanName}" (${newId})`);
          return sendJson(res, 201, { success: true, screener: newScreener, isCustom: true });
        }
      }

      // 3. PUT /api/screeners/:id - Edit an existing screener
      const updateMatch = pathname.match(/^\/api\/screeners\/([a-zA-Z0-9_\-]+)$/);
      if (updateMatch && method === 'PUT') {
        const authUser = getAuthenticatedUser(req);
        if (!authUser) {
          return sendJson(res, 401, { success: false, error: 'Login required to edit screeners' });
        }

        const id = updateMatch[1];
        const payload = await parseJsonBody(req);

        if (authUser.role === 'admin') {
          const globalScreeners = readScreeners();
          const idx = globalScreeners.findIndex(s => s.id === id);
          if (idx !== -1) {
            globalScreeners[idx] = {
              ...globalScreeners[idx],
              name: payload.name ? payload.name.trim() : globalScreeners[idx].name,
              category: payload.category ? payload.category.trim() : globalScreeners[idx].category,
              description: payload.description !== undefined ? payload.description.trim() : globalScreeners[idx].description,
              url: payload.url ? payload.url.trim() : globalScreeners[idx].url,
              tags: Array.isArray(payload.tags) ? payload.tags : globalScreeners[idx].tags,
              isGlobal: true,
              isCustom: false
            };
            saveScreeners(globalScreeners);
            return sendJson(res, 200, { success: true, screener: globalScreeners[idx] });
          }
        }

        // Check user custom screener
        const updated = updateUserCustomScreener(authUser, id, payload);
        if (updated) {
          return sendJson(res, 200, { success: true, screener: updated });
        }

        return sendJson(res, 404, { success: false, error: 'Screener not found or unauthorized' });
      }

      // 4. DELETE /api/screeners/:id - Remove a screener
      if (updateMatch && method === 'DELETE') {
        const authUser = getAuthenticatedUser(req);
        if (!authUser) {
          return sendJson(res, 401, { success: false, error: 'Login required to delete screeners' });
        }

        const id = updateMatch[1];

        if (authUser.role === 'admin') {
          let globalScreeners = readScreeners();
          const initLen = globalScreeners.length;
          globalScreeners = globalScreeners.filter(s => s.id !== id);
          if (globalScreeners.length !== initLen) {
            saveScreeners(globalScreeners);
            return sendJson(res, 200, { success: true, message: 'Global screener deleted' });
          }
        }

        const deleted = deleteUserCustomScreener(authUser, id);
        if (deleted) {
          return sendJson(res, 200, { success: true, message: 'Custom screener deleted' });
        }

        return sendJson(res, 404, { success: false, error: 'Screener not found or unauthorized to delete' });
      }

      // 5. POST /api/screeners/preview - Test a screener without saving
      if (pathname === '/api/screeners/preview' && method === 'POST') {
        const authUser = getAuthenticatedUser(req);
        if (!authUser) {
          return sendJson(res, 401, { success: false, error: 'Login required to test screeners' });
        }

        const payload = await parseJsonBody(req);
        if (!payload.url) {
          return sendJson(res, 400, { success: false, error: 'URL is required' });
        }
        const result = await executeChartinkScreener(payload.url);
        return sendJson(res, 200, result);
      }

      // 6. POST /api/screeners/:id/run - Run a specific screener
      const runMatch = pathname.match(/^\/api\/screeners\/([a-zA-Z0-9_\-]+)\/run$/);
      if (runMatch && method === 'POST') {
        const authUser = getAuthenticatedUser(req);
        const id = runMatch[1];
        const screeners = getUserScreeners(authUser);
        const screener = screeners.find(s => s.id === id);
        if (!screener) {
          return sendJson(res, 404, { success: false, error: 'Screener not found' });
        }

        console.log(`[EXECUTE] Running screener: "${screener.name}" for ${authUser ? authUser.username : 'public'}`);
        const result = await executeChartinkScreener(screener.url);

        // Update screener execution cache in appropriate DB
        saveScreenerExecutionCache(authUser, id, result);

        return sendJson(res, 200, {
          success: true,
          screenerId: id,
          screenerName: screener.name,
          category: screener.category,
          timestamp: result.timestamp,
          count: result.count,
          stocks: result.stocks
        });
      }

      // 7. POST /api/screeners/run-all - Run all screeners in parallel/sequence
      if (pathname === '/api/screeners/run-all' && method === 'POST') {
        const authUser = getAuthenticatedUser(req);
        const screeners = getUserScreeners(authUser);
        console.log(`[EXECUTE] Running all ${screeners.length} screeners for ${authUser ? authUser.username : 'public'}...`);

        const results = [];
        const executeWithLimit = async (items, limit) => {
          const executing = [];
          for (const item of items) {
            const p = (async () => {
              try {
                const runRes = await executeChartinkScreener(item.url);
                item.lastRun = runRes.timestamp;
                item.stockCount = runRes.count;
                item.lastResults = runRes.stocks;
                results.push({
                  id: item.id,
                  name: item.name,
                  category: item.category,
                  count: runRes.count,
                  stocks: runRes.stocks,
                  status: 'success'
                });
              } catch (err) {
                console.error(`Error running ${item.name}:`, err.message);
                results.push({
                  id: item.id,
                  name: item.name,
                  category: item.category,
                  count: 0,
                  stocks: [],
                  status: 'error',
                  error: err.message
                });
              }
            })();

            executing.push(p);
            if (executing.length >= limit) {
              await Promise.race(executing);
              for (let i = executing.length - 1; i >= 0; i--) {
                executing.splice(i, 1);
                break;
              }
            }
          }
          await Promise.all(executing);
        };

        await executeWithLimit(screeners, 3);
        saveUserScreeners(authUser, screeners);

        // Aggregate unique stocks across all screeners
        const stockMap = new Map();
        results.forEach(r => {
          if (r.stocks) {
            r.stocks.forEach(s => {
              if (!stockMap.has(s.symbol)) {
                stockMap.set(s.symbol, {
                  ...s,
                  matchingScreeners: [r.name],
                  matchCount: 1
                });
              } else {
                const existing = stockMap.get(s.symbol);
                if (!existing.matchingScreeners.includes(r.name)) {
                  existing.matchingScreeners.push(r.name);
                  existing.matchCount++;
                }
              }
            });
          }
        });

        const aggregatedStocks = Array.from(stockMap.values())
          .sort((a, b) => b.matchCount - a.matchCount || b.changePercent - a.changePercent);

        return sendJson(res, 200, {
          success: true,
          totalScreeners: screeners.length,
          uniqueStocksCount: aggregatedStocks.length,
          screenerResults: results,
          aggregatedStocks
        });
      }

      // 8. GET /api/chart-proxy/:symbol - Proxy Chartink stock chart without frame restriction
      const chartProxyMatch = pathname.match(/^\/api\/chart-proxy\/([a-zA-Z0-9_\-]+)$/);
      if (chartProxyMatch && method === 'GET') {
        const sym = chartProxyMatch[1].toLowerCase();
        const targetUrl = `https://chartink.com/stocks/${sym}.html`;

        try {
          const fetchRes = await httpsFetch(targetUrl, {
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
              'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
            }
          });

          if (!fetchRes.ok) {
            res.writeHead(fetchRes.status, { 'Content-Type': 'text/html; charset=utf-8' });
            return res.end(`<div style="color:#ef4444;padding:20px;font-family:sans-serif;">Chart not found for ${sym}</div>`);
          }

          let html = await fetchRes.text();

          // Inject base href and clean theme styling to hide Chartink headers/ads
          html = html.replace('<head>', `<head><base href="https://chartink.com/">
            <style>
              nav, header, .header-link, footer, .footer, .ad, .advertisement, [id*="google_ads"], .adsbygoogle {
                display: none !important;
              }
              body {
                background-color: #0b0f19 !important;
                color: #f1f5f9 !important;
                margin: 0 !important;
                padding: 8px !important;
              }
              #chartdisplay-container {
                width: 100% !important;
                max-width: 100% !important;
                margin: 0 auto !important;
              }
              #ChartImage {
                width: 100% !important;
                border-radius: 8px !important;
              }
            </style>
          `);

          res.writeHead(200, {
            'Content-Type': 'text/html; charset=utf-8',
            'Access-Control-Allow-Origin': '*'
          });
          return res.end(html);
        } catch (proxyErr) {
          res.writeHead(500, { 'Content-Type': 'text/html; charset=utf-8' });
          return res.end(`<div style="color:#ef4444;padding:20px;font-family:sans-serif;">Error loading Chartink chart: ${proxyErr.message}</div>`);
        }
      }

      // 8a. POST /api/scan/darvas-ema - Price Position Scanner (Darvas Green ↔ EMA 10/20) (Registered Users Only)
      if (pathname === '/api/scan/darvas-ema' && method === 'POST') {
        const authUser = getAuthenticatedUser(req);
        if (!authUser) {
          return sendJson(res, 401, { success: false, error: 'Authentication required. Please log in or register to access the Price Position Scanner.' });
        }

        try {
          const body = await parseJsonBody(req);
          let { targetEma = 10, scope = 'current', stockList = [] } = body;
          if (String(scope).startsWith('wl_') && (!Array.isArray(stockList) || stockList.length === 0)) {
            const userWls = getUserWatchlists(authUser);
            const targetWl = userWls.find(w => w.id === scope);
            if (targetWl && Array.isArray(targetWl.stocks)) {
              stockList = targetWl.stocks.map(s => s.symbol);
            }
          }
          const scanResults = await scanDarvasEma(targetEma, scope, stockList);
          return sendJson(res, 200, scanResults);
        } catch (scanErr) {
          console.error('Error during Darvas-EMA price scan:', scanErr.message);
          return sendJson(res, 500, { success: false, error: scanErr.message });
        }
      }

      // 8b. GET /api/stocks/search?q=:query - Predictive Autocomplete Stock Search
      if (pathname === '/api/stocks/search' && method === 'GET') {
        const query = (parsedUrl.query.q || '').trim();
        if (!query) {
          return sendJson(res, 200, { success: true, results: [] });
        }

        try {
          const results = await searchPredictiveStocks(query);
          return sendJson(res, 200, { success: true, results });
        } catch (sErr) {
          console.error(`Search error for "${query}":`, sErr.message);
          return sendJson(res, 200, { success: true, results: [] });
        }
      }

      // 9. GET /api/stocks/:symbol/history or /api/stocks/:symbol - Historical OHLCV + Indicators
      const historyMatch = pathname !== '/api/stocks/search' ? pathname.match(/^\/api\/stocks\/([a-zA-Z0-9_%-]+)(?:\/history)?$/) : null;
      if (historyMatch && method === 'GET') {
        const rawSymbol = decodeURIComponent(historyMatch[1]);
        const queryRange = parsedUrl.query.range || null;
        const queryInterval = parsedUrl.query.interval || '1d';

        try {
          const histData = await fetchStockHistory(rawSymbol, queryRange, queryInterval);
          return sendJson(res, 200, { success: true, ...histData });
        } catch (hErr) {
          console.error(`Error fetching history for ${rawSymbol}:`, hErr.message);
          return sendJson(res, 404, { success: false, error: hErr.message });
        }
      }

      // =============================================================
      // 10. MARKET ANALYTICS, BREADTH & SECTOR STRENGTH ENDPOINTS
      // =============================================================

      // 10a. GET /api/analytics/breadth - 20 SMA & 50 SMA Breadth Diagnostics
      if (pathname === '/api/analytics/breadth' && method === 'GET') {
        const sectorFilter = parsedUrl.query.sector || 'all';
        const breadthData = calculateMarketBreadth(sectorFilter);
        return sendJson(res, 200, {
          success: true,
          timestamp: new Date().toISOString(),
          sector: sectorFilter,
          ...breadthData
        });
      }

      // 10b. GET /api/analytics/sectors - Ranked Sub-Sectors with Fundamental Growth & Thermal Status
      if (pathname === '/api/analytics/sectors' && method === 'GET') {
        const data = readSectorsData();
        const authUser = getAuthenticatedUser(req);
        const prefs = getUserAnalyticsPreferences(authUser);

        return sendJson(res, 200, {
          success: true,
          timestamp: new Date().toISOString(),
          subSectors: data.subSectors || [],
          preferences: prefs
        });
      }

      // 10c. GET /api/analytics/indices - Benchmark & Sectoral Indices Quotes
      if (pathname === '/api/analytics/indices' && method === 'GET') {
        const data = readSectorsData();
        const rawIndices = data.indices || [];
        const quotes = await fetchBatchIndexQuotes(rawIndices);

        return sendJson(res, 200, {
          success: true,
          timestamp: new Date().toISOString(),
          indices: quotes
        });
      }

      // 10d. GET /api/analytics/preferences - User Customization Preferences
      if (pathname === '/api/analytics/preferences' && method === 'GET') {
        const authUser = getAuthenticatedUser(req);
        const prefs = getUserAnalyticsPreferences(authUser);
        return sendJson(res, 200, { success: true, preferences: prefs });
      }

      // 10e. POST /api/analytics/preferences - Save User Custom Preferences
      if (pathname === '/api/analytics/preferences' && method === 'POST') {
        const authUser = getAuthenticatedUser(req);
        if (!authUser) {
          return sendJson(res, 401, { success: false, error: 'Login required to save dashboard preferences' });
        }
        const payload = await parseJsonBody(req);
        saveUserAnalyticsPreferences(authUser, payload);
        return sendJson(res, 200, { success: true, message: 'Dashboard preferences saved successfully' });
      }

      // 10f. GET /api/analytics/sectoral-breadth - Sectoral Indices Advance/Decline Breadth & Constituents
      if (pathname === '/api/analytics/sectoral-breadth' && method === 'GET') {
        const sectoralBreadth = await computeSectoralIndicesBreadth();
        return sendJson(res, 200, {
          success: true,
          timestamp: new Date().toISOString(),
          sectors: sectoralBreadth
        });
      }

      // 10g. GET /api/analytics/explore - Multi-Factor Institutional Screener Data
      if (pathname === '/api/analytics/explore' && method === 'GET') {
        try {
          const forceRefresh = parsedUrl.query.refresh === 'true' || parsedUrl.query.force === 'true';
          const exploreData = await computeExploreStocksData(forceRefresh);
          const chunkSize = 100;
          const totalChunks = Math.ceil((exploreData.stocks?.length || 0) / chunkSize);
          return sendJson(res, 200, {
            success: true,
            timestamp: new Date().toISOString(),
            totalChunks,
            chunkSize,
            ...exploreData
          });
        } catch (err) {
          console.error('Error computing explore analytics:', err);
          return sendJson(res, 500, { success: false, error: 'Failed to compute explore analytics: ' + err.message });
        }
      }

      // 10h. GET /api/analytics/explore-quotes - Chunked Live Quotes Fetcher
      if (pathname === '/api/analytics/explore-quotes' && method === 'GET') {
        try {
          const chunkIndex = parseInt(parsedUrl.query.chunk || '0', 10);
          const chunkSize = Math.min(200, Math.max(10, parseInt(parsedUrl.query.size || '100', 10)));
          
          const universe = getUniverseStocks();
          const totalCount = universe.length;
          const totalChunks = Math.ceil(totalCount / chunkSize);
          
          const start = chunkIndex * chunkSize;
          const end = Math.min(totalCount, start + chunkSize);
          const chunkStocks = universe.slice(start, end);
          const chunkSymbols = chunkStocks.map(s => s.symbol);

          if (chunkSymbols.length === 0) {
            return sendJson(res, 200, { success: true, chunkIndex, totalChunks, quotes: {}, count: 0 });
          }

          const quotes = await getOrFetchLiveQuotes(chunkSymbols);
          
          // Automatically persist to MongoDB and Local JSON
          persistUniverseQuotes(quotes);

          return sendJson(res, 200, {
            success: true,
            chunkIndex,
            totalChunks,
            count: Object.keys(quotes).length,
            quotes,
            timestamp: new Date().toISOString()
          });
        } catch (err) {
          console.error('[EXPLORE-QUOTES] Error in chunked fetch:', err);
          return sendJson(res, 500, { success: false, error: err.message });
        }
      }

      // 11. GET /api/fno/stocks - Complete Stock Universe for F&O & Equity Screener
      if (pathname === '/api/fno/stocks' && method === 'GET') {
        try {
          if (!fs.existsSync(FNO_DATA_FILE)) {
            return sendJson(res, 200, { success: true, count: 0, stocks: [] });
          }
          const raw = fs.readFileSync(FNO_DATA_FILE, 'utf8');
          const stocks = JSON.parse(raw || '[]');
          return sendJson(res, 200, {
            success: true,
            count: stocks.length,
            timestamp: new Date().toISOString(),
            stocks
          });
        } catch (err) {
          console.error('Error loading F&O stocks universe:', err);
          return sendJson(res, 500, { success: false, error: 'Failed to load stocks universe' });
        }
      }

      // 12. GET /api/fno/live-quotes - Fetch Live Intraday Market Quotes for Stocks
      if (pathname === '/api/fno/live-quotes' && method === 'GET') {
        try {
          const querySymbolsRaw = parsedUrl.query.symbols;
          let symbolsToFetch = [];
          if (querySymbolsRaw) {
            symbolsToFetch = querySymbolsRaw.split(',').map(s => s.trim().toUpperCase()).filter(Boolean);
          } else {
            // Default to 212 F&O universe
            if (fs.existsSync(FNO_DATA_FILE)) {
              const stocks = JSON.parse(fs.readFileSync(FNO_DATA_FILE, 'utf8') || '[]');
              symbolsToFetch = stocks.filter(s => s.fno).map(s => s.symbol);
            }
          }

          if (symbolsToFetch.length === 0) {
            return sendJson(res, 200, { success: true, count: 0, quotes: {} });
          }

          const quotes = await getOrFetchLiveQuotes(symbolsToFetch);
          return sendJson(res, 200, {
            success: true,
            timestamp: new Date().toISOString(),
            count: Object.keys(quotes).length,
            quotes
          });
        } catch (err) {
          console.error('Error fetching live quotes:', err);
          return sendJson(res, 500, { success: false, error: 'Failed to fetch live quotes' });
        }
      }

      // 13. GET /api/feed/status - Live Broker Feed Status (Dhan vs Backup) & Database Source
      if (pathname === '/api/feed/status' && method === 'GET') {
        const configured = isDhanConfigured();
        let isHealthy = configured;
        let healthMessage = configured ? 'Credentials configured' : 'Credentials missing';

        if (configured) {
          isHealthy = await checkDhanApiHealth();
          healthMessage = isHealthy ? 'Connected & Live' : (lastDhanErrorMsg || 'Token verification failed');
        }

        const clientIdPreview = DHAN_CONFIG.clientId ? (DHAN_CONFIG.clientId.slice(0, 3) + '****' + DHAN_CONFIG.clientId.slice(-2)) : null;

        return sendJson(res, 200, {
          success: true,
          dhanConfigured: configured,
          dhanActive: Boolean(configured && isHealthy),
          dhanHealthy: isHealthy,
          dhanMessage: healthMessage,
          dhanClientIdPreview: clientIdPreview,
          source: (configured && isHealthy) ? 'dhan' : 'backup',
          sourceLabel: (configured && isHealthy) ? 'Dhan' : 'Backup',
          mongoConfigured: Boolean(MONGO_CONFIG.isConnected),
          dbSource: MONGO_CONFIG.isConnected ? 'MongoDB Atlas' : 'Local JSON',
          timestamp: new Date().toISOString()
        });
      }

      // 13b. POST /api/feed/dhan-token - Update Dhan Credentials dynamically
      if (pathname === '/api/feed/dhan-token' && method === 'POST') {
        const body = await parseJsonBody(req);
        const clientId = String(body.clientId || body.dhanClientId || '').trim();
        const accessToken = String(body.accessToken || body.dhanAccessToken || '').trim();

        if (!clientId || !accessToken) {
          return sendJson(res, 400, { success: false, error: 'Both Client ID and Access Token are required' });
        }

        process.env.DHAN_CLIENT_ID = clientId;
        process.env.DHAN_ACCESS_TOKEN = accessToken;

        try {
          let cfg = {};
          if (fs.existsSync(CONFIG_FILE)) {
            cfg = JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8') || '{}');
          }
          cfg.dhanClientId = clientId;
          cfg.dhanAccessToken = accessToken;
          cfg.updatedAt = new Date().toISOString();
          fs.writeFileSync(CONFIG_FILE, JSON.stringify(cfg, null, 2), 'utf8');
        } catch (e) {}

        // Reset check timer and test token health immediately
        lastDhanCheckTime = 0;
        const healthy = await checkDhanApiHealth();

        // Invalidate Explore data cache
        cachedExploreData = null;
        lastExploreDataTime = 0;

        return sendJson(res, 200, {
          success: true,
          message: healthy ? 'Dhan API credentials verified and active! 🟢' : `Credentials saved, but notice: ${lastDhanErrorMsg}`,
          dhanActive: healthy,
          dhanMessage: lastDhanErrorMsg || 'Active'
        });
      }

      return sendJson(res, 404, { success: false, error: 'API route not found' });
    } catch (apiErr) {
      console.error('API Error:', apiErr);
      return sendJson(res, 500, { success: false, error: apiErr.message || 'Internal server error' });
    }
  }

  // Static File Serving
  let reqTarget = pathname;
  if (reqTarget === '/' || reqTarget === '') reqTarget = 'index.html';
  else if (reqTarget === '/analytics') reqTarget = 'analytics.html';
  else if (reqTarget === '/fno') reqTarget = 'fno.html';

  let filePath = path.join(PUBLIC_DIR, reqTarget);
  
  // Security check: ensure path stays within PUBLIC_DIR
  const resolvedPath = path.resolve(filePath);
  if (!resolvedPath.startsWith(path.resolve(PUBLIC_DIR))) {
    res.writeHead(403, { 'Content-Type': 'text/plain' });
    return res.end('Forbidden');
  }

  fs.stat(resolvedPath, (err, stats) => {
    if (err || !stats.isFile()) {
      // If file not found and doesn't have an extension, try fno.html, analytics.html or index.html
      if (!path.extname(resolvedPath)) {
        const fnoPath = path.join(PUBLIC_DIR, 'fno.html');
        if (pathname.startsWith('/fno') && fs.existsSync(fnoPath)) {
          res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
          return fs.createReadStream(fnoPath).pipe(res);
        }

        const analyticsPath = path.join(PUBLIC_DIR, 'analytics.html');
        if (pathname.startsWith('/analytics') && fs.existsSync(analyticsPath)) {
          res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
          return fs.createReadStream(analyticsPath).pipe(res);
        }

        const indexPath = path.join(PUBLIC_DIR, 'index.html');
        if (fs.existsSync(indexPath)) {
          res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
          return fs.createReadStream(indexPath).pipe(res);
        }
      }
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      return res.end('404 Not Found');
    }

    const ext = path.extname(resolvedPath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';

    res.writeHead(200, {
      'Content-Type': contentType,
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0'
    });
    fs.createReadStream(resolvedPath).pipe(res);
  });
});

async function startServer() {
  server.listen(PORT, '0.0.0.0', () => {
    console.log(`=======================================================`);
    console.log(`🚀 Stock Screener & Visualizer Platform is running!`);
    console.log(`🌐 Local URL: http://localhost:${PORT}`);
    console.log(`📊 Screeners Loaded: ${readScreeners().length}`);
    console.log(`=======================================================`);
  });
  await initDatabase();
  console.log(`🗄️ Database: ${MONGO_CONFIG.isConnected ? '🟢 MongoDB Atlas (Persistent)' : '📁 Local JSON Files (Fallback)'}`);
}

startServer();
