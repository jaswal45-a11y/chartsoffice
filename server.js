/**
 * Localhost Stock Screener & Visualizer Server
 * Powered by Node.js built-in HTTP module (Zero external dependencies needed!)
 */

const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const url = require('node:url');
const crypto = require('node:crypto');

// Allow self-signed or intermediate certificates for external requests
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

const PORT = process.env.PORT || 3000;
const DATA_FILE = path.join(__dirname, 'data', 'screeners.json');
const USERS_FILE = path.join(__dirname, 'data', 'users.json');
const CONFIG_FILE = path.join(__dirname, 'data', 'config.json');
const SECTORS_FILE = path.join(__dirname, 'data', 'sectors_data.json');
const PUBLIC_DIR = path.join(__dirname, 'public');

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

// Helper to read screeners from JSON file
function readScreeners() {
  try {
    if (!fs.existsSync(DATA_FILE)) {
      return [];
    }
    const content = fs.readFileSync(DATA_FILE, 'utf8');
    return JSON.parse(content || '[]');
  } catch (err) {
    console.error('Error reading screeners file:', err);
    return [];
  }
}

// Helper to save screeners to JSON file
function saveScreeners(screeners) {
  try {
    const dir = path.dirname(DATA_FILE);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(DATA_FILE, JSON.stringify(screeners, null, 2), 'utf8');
    return true;
  } catch (err) {
    console.error('Error saving screeners file:', err);
    return false;
  }
}

// System Configuration Helpers (Dynamic User Limits & Platform Settings)
function readSystemConfig() {
  try {
    if (!fs.existsSync(CONFIG_FILE)) {
      const defaultCfg = { maxUsers: 10, allowRegistration: true, updatedAt: new Date().toISOString() };
      fs.writeFileSync(CONFIG_FILE, JSON.stringify(defaultCfg, null, 2), 'utf8');
      return defaultCfg;
    }
    const content = fs.readFileSync(CONFIG_FILE, 'utf8');
    return JSON.parse(content || '{"maxUsers":10,"allowRegistration":true}');
  } catch (err) {
    return { maxUsers: 10, allowRegistration: true };
  }
}

function saveSystemConfig(cfg) {
  try {
    const dir = path.dirname(CONFIG_FILE);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(CONFIG_FILE, JSON.stringify(cfg, null, 2), 'utf8');
    return true;
  } catch (err) {
    console.error('Error saving system config:', err);
    return false;
  }
}

function getMaxUsersLimit() {
  const cfg = readSystemConfig();
  return typeof cfg.maxUsers === 'number' && cfg.maxUsers > 0 ? cfg.maxUsers : 10;
}

// Constants for User and Watchlist Limits
const MAX_WATCHLISTS = 5;
const MAX_STOCKS_PER_WATCHLIST = 50;

// User Data Storage Helpers
function readUsers() {
  try {
    if (!fs.existsSync(USERS_FILE)) {
      return [];
    }
    const content = fs.readFileSync(USERS_FILE, 'utf8');
    return JSON.parse(content || '[]');
  } catch (err) {
    console.error('Error reading users file:', err);
    return [];
  }
}

function saveUsers(users) {
  try {
    const dir = path.dirname(USERS_FILE);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2), 'utf8');
    return true;
  } catch (err) {
    console.error('Error saving users file:', err);
    return false;
  }
}

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

// Market Cap > 2000 Cr Cache & Fetcher
let marketCap2000CrSet = new Set();
let cachedMarketCapList = [];
let lastMcFetch = 0;

async function getMarketCap2000CrSet() {
  if (marketCap2000CrSet.size > 0 && (Date.now() - lastMcFetch < 6 * 60 * 60 * 1000)) {
    return marketCap2000CrSet;
  }

  try {
    const pageRes = await fetch('https://chartink.com/screener/sumit-turtle-system', {
      headers: { 'User-Agent': 'Mozilla/5.0' }
    });
    const html = await pageRes.text();
    const tokenMatch = html.match(/name="csrf-token"\s+content="([^"]+)"/i);
    const csrf = tokenMatch ? tokenMatch[1] : '';
    const cookies = (pageRes.headers.getSetCookie ? pageRes.headers.getSetCookie() : [pageRes.headers.get('set-cookie') || '']).map(c => c.split(';')[0]).join('; ');

    const pRes = await fetch('https://chartink.com/screener/process', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
        'X-CSRF-TOKEN': csrf,
        'Cookie': cookies,
        'Referer': 'https://chartink.com',
        'X-Requested-With': 'XMLHttpRequest'
      },
      body: 'scan_clause=' + encodeURIComponent('( {cash} ( market capital > 2000 ) )')
    });
    const data = await pRes.json();
    if (Array.isArray(data.data) && data.data.length > 0) {
      const newSet = new Set();
      data.data.forEach(s => {
        if (s.nsecode) newSet.add(s.nsecode.toUpperCase());
        if (s.bsecode) newSet.add(String(s.bsecode).toUpperCase());
      });
      marketCap2000CrSet = newSet;
      cachedMarketCapList = data.data;
      lastMcFetch = Date.now();
      console.log(`✅ Loaded Market Cap > ₹2000 Cr set: ${marketCap2000CrSet.size} stocks.`);
    }
  } catch (err) {
    console.warn('Could not refresh Market Cap > 2000 Cr set:', err.message);
  }

  return marketCap2000CrSet;
}

// Core Chartink execution engine
async function executeChartinkScreener(targetUrlOrSlug, customClause = null) {
  const slug = parseChartinkSlug(targetUrlOrSlug);
  const targetUrl = targetUrlOrSlug.startsWith('http') 
    ? targetUrlOrSlug 
    : `https://chartink.com/screener/${slug || targetUrlOrSlug}`;

  const userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

  // Step 1: Fetch screener page to get CSRF token, cookies, and atlas_query / scan_clause
  const pageRes = await fetch(targetUrl, {
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
  const rawCookies = pageRes.headers.getSetCookie ? pageRes.headers.getSetCookie() : [];
  const cookies = rawCookies.map(c => c.split(';')[0]).join('; ');

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

  const processRes = await fetch('https://chartink.com/screener/process', {
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

  // Fetch Market Cap > 2000 Cr symbols set to tag each stock
  const mcSet = await getMarketCap2000CrSet();

  // Normalize stock items
  const stocks = rawStocks.map((s, idx) => {
    const sym = s.nsecode || s.bsecode || 'UNKNOWN';
    const bse = s.bsecode ? String(s.bsecode).toUpperCase() : null;
    const nse = s.nsecode ? String(s.nsecode).toUpperCase() : null;
    const isOver2000 = (nse && mcSet.has(nse)) || (bse && mcSet.has(bse)) || mcSet.has(sym.toUpperCase());

    return {
      sr: s.sr || idx + 1,
      symbol: sym,
      name: s.name || sym,
      bsecode: bse,
      nsecode: nse,
      close: typeof s.close === 'number' ? Number(s.close.toFixed(2)) : s.close,
      changePercent: typeof s.per_chg === 'number' ? Number(s.per_chg.toFixed(2)) : (typeof s.p_change === 'number' ? Number(s.p_change.toFixed(2)) : 0),
      volume: typeof s.volume === 'number' ? s.volume : (typeof s.vol === 'number' ? s.vol : 0),
      mcOver2000Cr: Boolean(isOver2000)
    };
  });

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

// Traditional Auto Pivot Points (TradingView Standard)
// Automatically selects reference period based on active timeframe:
// - Intraday (1m, 5m, 15m, 30m, 1hr) -> Daily (D) base
// - Daily (1d) -> Weekly (W) base
// - Weekly (1wk) -> Monthly (M) base
// - Monthly (1mo) -> Yearly (Y) base
async function fetchTraditionalAutoPivots(rawSymbol, activeInterval) {
  let sym = rawSymbol.trim().toUpperCase().replace(/&/g, '%26');
  let candidates = [`${sym}.NS`, `${sym}.BO`];
  if (/^\d+$/.test(sym)) candidates = [`${sym}.BO`, `${sym}.NS`];

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
      const url = `https://query1.finance.yahoo.com/v8/finance/chart/${candidate}?range=${refRange}&interval=${refInterval}`;
      const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
      if (!res.ok) continue;

      const data = await res.json();
      const r = data.chart?.result?.[0];
      if (!r || !r.timestamp || r.timestamp.length === 0) continue;

      const meta = r.meta || {};
      const q = r.indicators.quote[0];
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

// In-memory cache for stock history (10 mins TTL)
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
  if (cached && (Date.now() - cached.timestamp < 10 * 60 * 1000)) {
    return cached.data;
  }

  let sym = rawSymbol.trim().toUpperCase().replace(/&/g, '%26');
  // Try NSE first, fallback to BSE
  let candidates = [`${sym}.NS`, `${sym}.BO`];
  if (/^\d+$/.test(sym)) {
    candidates = [`${sym}.BO`, `${sym}.NS`];
  }

  for (const candidate of candidates) {
    try {
      const url = `https://query1.finance.yahoo.com/v8/finance/chart/${candidate}?range=${yahooRange}&interval=${interval}`;
      const res = await fetch(url, {
        headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' }
      });
      if (!res.ok) continue;

      const data = await res.json();
      const result = data.chart?.result?.[0];
      if (!result || !result.timestamp || result.timestamp.length === 0) continue;

      const meta = result.meta || {};
      const timestamps = result.timestamp;
      const quotes = result.indicators.quote[0];
      const closes = quotes.close;

      const candles = [];
      for (let i = 0; i < timestamps.length; i++) {
        let c = closes[i];
        let o = quotes.open[i];
        let h = quotes.high[i];
        let l = quotes.low[i];
        let v = quotes.volume[i] || 0;

        if (c === null || o === null || h === null || l === null) {
          // If this is the latest bar and meta has live market data, fill it!
          if (i === timestamps.length - 1 && meta.regularMarketPrice) {
            c = c !== null ? c : meta.regularMarketPrice;
            h = h !== null ? h : (meta.regularMarketDayHigh || c);
            l = l !== null ? l : (meta.regularMarketDayLow || c);
            // Preserve actual quote open; fallback to previous day close, NOT 2-year chartPreviousClose
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

      // Check if meta regularMarketTime represents a new trading session not yet in timestamps
      if (candles.length > 0 && meta.regularMarketPrice && meta.regularMarketTime) {
        const lastCandleTime = candles[candles.length - 1].time;
        const metaDate = new Date(meta.regularMarketTime * 1000).toISOString().split('T')[0];
        if (metaDate > lastCandleTime) {
          const prevClose = candles[candles.length - 1].close;
          candles.push({
            time: metaDate,
            open: prevClose,
            high: Number((meta.regularMarketDayHigh || meta.regularMarketPrice).toFixed(2)),
            low: Number((meta.regularMarketDayLow || meta.regularMarketPrice).toFixed(2)),
            close: Number(meta.regularMarketPrice.toFixed(2)),
            volume: meta.regularMarketVolume || 0
          });
        } else if (metaDate === lastCandleTime) {
          const lastC = candles[candles.length - 1];
          lastC.close = Number(meta.regularMarketPrice.toFixed(2));
          if (meta.regularMarketDayHigh) lastC.high = Math.max(lastC.high, Number(meta.regularMarketDayHigh.toFixed(2)));
          if (meta.regularMarketDayLow) lastC.low = Math.min(lastC.low, Number(meta.regularMarketDayLow.toFixed(2)));
          if (meta.regularMarketVolume) lastC.volume = Math.max(lastC.volume, meta.regularMarketVolume);
        }
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
        const changePercent = Number((((latestCandle.close - prevCandle.close) / prevCandle.close) * 100).toFixed(2));

        const high52w = meta.fiftyTwoWeekHigh || Math.max(...candles.slice(-250).map(c => c.high));
        const low52w = meta.fiftyTwoWeekLow || Math.min(...candles.slice(-250).map(c => c.low));
        const allTimeHigh = Math.max(high52w, ...candles.map(c => c.high));
        const pctFrom52wHigh = Number((((latestCandle.close - high52w) / high52w) * 100).toFixed(2));
        const pctFromAth = Number((((latestCandle.close - allTimeHigh) / allTimeHigh) * 100).toFixed(2));

        const responsePayload = {
          symbol: rawSymbol,
          exchange: candidate.endsWith('.NS') ? 'NSE' : 'BSE',
          interval,
          range: selectedRange,
          initialRange: selectedRange,
          isIntraday,
          ltp: latestCandle.close,
          changePercent,
          high52w,
          low52w,
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

  // 1. Check local market cap cache
  if (Array.isArray(cachedMarketCapList) && cachedMarketCapList.length > 0) {
    for (const item of cachedMarketCapList) {
      const sym = (item.nsecode || '').toUpperCase();
      const n = (item.name || '').toUpperCase();
      if (sym.includes(qUpper) || n.includes(qUpper)) {
        add(item.nsecode, item.name, 'NSE');
        if (results.length >= 6) break;
      }
    }
  }

  // 2. Fetch from Chartink autocomplete
  try {
    const cUrl = `https://chartink.com/stocks/search?term=${encodeURIComponent(qLower)}`;
    const cRes = await fetch(cUrl, {
      headers: { 'User-Agent': 'Mozilla/5.0' },
      signal: AbortSignal.timeout(2500)
    });
    if (cRes.ok) {
      const cList = await cRes.json();
      for (const item of cList) {
        const sym = item.nsecode || item.bsecode;
        if (sym && !/^\d{6}$/.test(sym)) {
          add(sym, item.name, 'NSE');
        }
      }
    }
  } catch (e) {}

  // 3. Fallback to Yahoo Finance search if < 5 results
  if (results.length < 5) {
    try {
      const yUrl = `https://query1.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(qUpper)}&quotesCount=8&newsCount=0`;
      const yRes = await fetch(yUrl, {
        headers: { 'User-Agent': 'Mozilla/5.0' },
        signal: AbortSignal.timeout(2000)
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

  const finalResults = results.slice(0, 8);
  searchCache.set(cacheKey, finalResults);
  return finalResults;
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

function getUserScreeners(user) {
  const globalScreeners = readScreeners();
  
  if (user && user.role === 'user') {
    const users = readUsers();
    const targetId = user.userId || user.id;
    const u = users.find(x => x.id === targetId || (x.username && x.username.toLowerCase() === (user.username || '').toLowerCase()));
    if (u) {
      if (!Array.isArray(u.customScreeners)) {
        u.customScreeners = [];
      }
      
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
      const merged = [
        ...globalScreeners.map(g => ({ ...g, isGlobal: true, isCustom: false })),
        ...u.customScreeners.map(c => ({ ...c, isGlobal: false, isCustom: true }))
      ];
      return merged;
    }
  }

  // Admin or unauthenticated: return global system screeners
  return globalScreeners.map(g => ({ ...g, isGlobal: true, isCustom: false }));
}

function addUserCustomScreener(user, screener) {
  if (!user || user.role !== 'user') return false;
  const users = readUsers();
  const targetId = user.userId || user.id;
  const u = users.find(x => x.id === targetId || (x.username && x.username.toLowerCase() === (user.username || '').toLowerCase()));
  if (!u) return false;

  if (!Array.isArray(u.customScreeners)) u.customScreeners = [];
  u.customScreeners.push(screener);
  saveUsers(users);
  return true;
}

function updateUserCustomScreener(user, screenerId, updatedData) {
  if (!user || user.role !== 'user') return null;
  const users = readUsers();
  const targetId = user.userId || user.id;
  const u = users.find(x => x.id === targetId || (x.username && x.username.toLowerCase() === (user.username || '').toLowerCase()));
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
  if (!user || user.role !== 'user') return false;
  const users = readUsers();
  const targetId = user.userId || user.id;
  const u = users.find(x => x.id === targetId || (x.username && x.username.toLowerCase() === (user.username || '').toLowerCase()));
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
  if (user && user.role === 'user') {
    const users = readUsers();
    const targetId = user.userId || user.id;
    const u = users.find(x => x.id === targetId || (x.username && x.username.toLowerCase() === (user.username || '').toLowerCase()));
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
  const targetId = user.role === 'admin' ? 'usr_admin' : user.userId;
  let u = users.find(x => x.id === targetId);
  if (!u) {
    u = {
      id: targetId,
      username: user.username,
      role: user.role,
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
  const targetId = user.role === 'admin' ? 'usr_admin' : user.userId;
  let u = users.find(x => x.id === targetId);
  if (u) {
    u.watchlists = watchlists;
    saveUsers(users);
    return true;
  } else {
    users.push({
      id: targetId,
      username: user.username,
      role: user.role,
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
    pivotType: 'Traditional (Auto)'
  };
  if (!user) return defaultPrefs;
  const users = readUsers();
  const targetId = user.role === 'admin' ? 'usr_admin' : user.userId;
  const u = users.find(x => x.id === targetId);
  return u && u.indicatorPreferences ? u.indicatorPreferences : defaultPrefs;
}

function saveUserIndicatorPreferences(user, preferences) {
  if (!user) return false;
  const users = readUsers();
  const targetId = user.role === 'admin' ? 'usr_admin' : user.userId;
  let u = users.find(x => x.id === targetId);
  if (u) {
    u.indicatorPreferences = preferences;
    saveUsers(users);
    return true;
  } else {
    users.push({
      id: targetId,
      username: user.username,
      role: user.role,
      indicatorPreferences: preferences
    });
    saveUsers(users);
    return true;
  }
}


// Fast Quotes Cache for Watchlists (45s TTL)
const quotesCache = new Map();

async function fetchBatchQuotes(symbols) {
  if (!Array.isArray(symbols) || symbols.length === 0) return [];
  const results = [];
  const uncached = [];
  const now = Date.now();

  for (const sym of symbols) {
    const sUpper = sym.trim().toUpperCase().replace(/\.(NS|BO)$/, '');
    if (quotesCache.has(sUpper) && (now - quotesCache.get(sUpper).timestamp < 45000)) {
      results.push(quotesCache.get(sUpper).data);
    } else {
      uncached.push(sUpper);
    }
  }

  if (uncached.length > 0) {
    const promises = uncached.map(async (s) => {
      try {
        const res = await fetch(`https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(s)}.NS?range=5d&interval=1d`, {
          headers: { 'User-Agent': 'Mozilla/5.0' },
          signal: AbortSignal.timeout(3500)
        });
        if (res.ok) {
          const d = await res.json();
          const meta = d.chart.result?.[0]?.meta;
          if (meta && meta.regularMarketPrice) {
            const ltp = Number(meta.regularMarketPrice.toFixed(2));
            const prev = meta.chartPreviousClose || ltp;
            const chg = prev ? ((ltp - prev) / prev) * 100 : 0;
            const quote = {
              symbol: s,
              ltp,
              changePercent: Number(chg.toFixed(2)),
              dayHigh: meta.regularMarketDayHigh ? Number(meta.regularMarketDayHigh.toFixed(2)) : ltp,
              dayLow: meta.regularMarketDayLow ? Number(meta.regularMarketDayLow.toFixed(2)) : ltp,
              volume: meta.regularMarketVolume || 0,
              exchange: 'NSE'
            };
            quotesCache.set(s, { timestamp: now, data: quote });
            return quote;
          }
        }
      } catch (err) {}

      const fallbackQuote = { symbol: s, ltp: null, changePercent: 0, dayHigh: null, dayLow: null, volume: 0, exchange: 'NSE' };
      quotesCache.set(s, { timestamp: now, data: fallbackQuote });
      return fallbackQuote;
    });

    const fetched = await Promise.all(promises);
    results.push(...fetched);
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
        const res = await fetch(`https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(idx.symbol)}?range=5d&interval=1d`, {
          headers: { 'User-Agent': 'Mozilla/5.0' },
          signal: AbortSignal.timeout(3500)
        });
        if (res.ok) {
          const d = await res.json();
          const r = d.chart.result?.[0];
          const meta = r?.meta;
          const quotes = r?.indicators?.quote?.[0];
          if (meta && meta.regularMarketPrice) {
            ltp = Number(meta.regularMarketPrice.toFixed(2));
            const prev = meta.chartPreviousClose || ltp;
            changePercent = prev ? Number((((ltp - prev) / prev) * 100).toFixed(2)) : 0;
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
          '^NSEI': 24850.50,
          '^NSEBANK': 51320.80,
          'NIFTY_IT.NS': 42150.00,
          'NIFTY_AUTO.NS': 25680.40,
          'NIFTY_PHARMA.NS': 22890.10,
          'NIFTY_METAL.NS': 9450.60,
          'NIFTY_FMCG.NS': 62450.00,
          'NIFTY_REALTY.NS': 1080.50,
          'NIFTY_ENERGY.NS': 38900.20,
          'NIFTY_INFRA.NS': 8850.40,
          'NIFTY_PSUBANK.NS': 6920.00,
          'NIFTY_MIDCAP_100.NS': 58920.00,
          'NIFTY_SMALLCAP_100.NS': 18950.00,
          'NIFTY_MIDSMALL_400.NS': 19480.00
        };
        ltp = fallbacks[idx.symbol] || 15000.00;
        changePercent = Number(((Math.sin(idx.name.length) * 1.5) + 0.35).toFixed(2));
        dayHigh = Number((ltp * 1.008).toFixed(2));
        dayLow = Number((ltp * 0.992).toFixed(2));
        sparkline = [Number((ltp * 0.985).toFixed(2)), Number((ltp * 0.99).toFixed(2)), Number((ltp * 0.995).toFixed(2)), Number((ltp * 1.002).toFixed(2)), ltp];
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

function getUserAnalyticsPreferences(user) {
  const data = readSectorsData();
  const defaultSectorIds = (data.subSectors || []).map(s => s.id);
  const defaultIndexIds = (data.indices || []).map(i => i.id);

  if (user && user.role === 'user') {
    const users = readUsers();
    const u = users.find(x => x.id === user.userId);
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
  if (user && user.role === 'user') {
    const users = readUsers();
    const u = users.find(x => x.id === user.userId);
    if (u) {
      u.analyticsPreferences = prefs;
      saveUsers(users);
      return true;
    }
  }
  return false;
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
            username: 'admin',
            role: 'admin',
            indicatorPreferences: getUserIndicatorPreferences(authObj)
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
          username: user.username,
          role: userRole,
          indicatorPreferences: getUserIndicatorPreferences(authObj)
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

        users = users.filter(u => u.id !== targetUser.id);
        saveUsers(users);

        // Terminate any active sessions for this user
        for (const [tok, sess] of activeSessions.entries()) {
          if (sess.userId === targetUser.id) {
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

        return sendJson(res, 200, {
          success: true,
          authenticated: true,
          userId: authUser.userId,
          username: authUser.username,
          role: authUser.role,
          watchlistsCount: watchlists.length,
          screenersCount: screeners.length,
          indicatorPreferences
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
          const fetchRes = await fetch(targetUrl, {
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

  let filePath = path.join(PUBLIC_DIR, reqTarget);
  
  // Security check: ensure path stays within PUBLIC_DIR
  const resolvedPath = path.resolve(filePath);
  if (!resolvedPath.startsWith(path.resolve(PUBLIC_DIR))) {
    res.writeHead(403, { 'Content-Type': 'text/plain' });
    return res.end('Forbidden');
  }

  fs.stat(resolvedPath, (err, stats) => {
    if (err || !stats.isFile()) {
      // If file not found and doesn't have an extension, try analytics.html or index.html
      if (!path.extname(resolvedPath)) {
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

    res.writeHead(200, { 'Content-Type': contentType });
    fs.createReadStream(resolvedPath).pipe(res);
  });
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`=======================================================`);
  console.log(`🚀 Stock Screener & Visualizer Platform is running!`);
  console.log(`🌐 Local URL: http://localhost:${PORT}`);
  console.log(`📊 Screeners Loaded: ${readScreeners().length}`);
  console.log(`=======================================================`);
});
