const fs = require('fs');
const path = require('path');

const serverFile = path.join(__dirname, '..', 'server.js');
let content = fs.readFileSync(serverFile, 'utf8');
const isCrlf = content.includes('\r\n');
const nl = isCrlf ? '\r\n' : '\n';

// Normalize for matching
let s = content.replace(/\r\n/g, '\n');

// 1. Add CANONICAL_SYMBOL_MAP and resolveCanonicalSymbol after isInstrumentETF
if (!s.includes('const CANONICAL_SYMBOL_MAP =')) {
  const marker = 'function isInstrumentETF(symbol, name = \'\') {';
  const endMarker = 'return false;\n}\n';
  const idx = s.indexOf(marker);
  if (idx !== -1) {
    const endIdx = s.indexOf(endMarker, idx);
    if (endIdx !== -1) {
      const insertPos = endIdx + endMarker.length;
      const canonicalCode = `
// -------------------------------------------------------------
// Canonical Symbol Mapping & Anti-Duplication Safeguard
// Resolves legacy, misspelled, or Yahoo/Chartink alias tickers to their official NSE canonical symbol.
// -------------------------------------------------------------
const CANONICAL_SYMBOL_MAP = {
  'RAMKRISHNA': 'RKFORGE',       // Ramkrishna Forgings Limited (Official NSE: RKFORGE)
  'TIPSINDLTD': 'TIPSMUSIC',     // Tips Music Limited (Renamed on NSE from TIPSINDLTD to TIPSMUSIC)
  'RESTAURANT': 'RBA',           // Restaurant Brands Asia Limited (Official NSE: RBA)
  'SAMVARDHANA': 'MOTHERSON',    // Samvardhana Motherson International Ltd (Official NSE: MOTHERSON)
  'TMPV': 'TATAMOTORS',          // Tata Motors Ltd (TMPV was internal/Yahoo symbol for passenger vehicles)
  'LTM': 'LTIM',                 // LTIMindtree Limited (LTM was old L&T Infotech ticker before Mindtree merger)
  'MCDOWELL-N': 'UNITDSPR',      // United Spirits Limited (Old ticker McDowell-N)
  'AMARAJABAT': 'ARE&M',         // Amara Raja Energy & Mobility Ltd (Renamed on NSE from AMARAJABAT to ARE&M)
  'BAJAJAUTO': 'BAJAJ-AUTO',     // Bajaj Auto Limited (Official NSE ticker has hyphen: BAJAJ-AUTO)
  'NESTLE': 'NESTLEIND',         // Nestle India Limited (Official NSE ticker: NESTLEIND)
  'CITYUNIONB': 'CUB',           // City Union Bank Limited (Official NSE ticker: CUB)
  'NARAYANA': 'NH',              // Narayana Hrudayalaya Limited (Official NSE ticker: NH)
  'TV18BRDCST': 'NETWORK18',     // TV18 Broadcast Limited (Merged into Network18 Media & Investments Ltd)
  'HPCL': 'HINDPETRO'            // Hindustan Petroleum Corporation Ltd (Official NSE ticker: HINDPETRO)
};

function resolveCanonicalSymbol(symbol) {
  if (!symbol) return '';
  const clean = String(symbol).toUpperCase().replace(/\\.(NS|BO)$/, '').trim();
  return CANONICAL_SYMBOL_MAP[clean] || clean;
}
`;
      s = s.slice(0, insertPos) + canonicalCode + s.slice(insertPos);
      console.log('1. Added CANONICAL_SYMBOL_MAP and resolveCanonicalSymbol');
    }
  }
}

// 2. In autoIngestStocksToUniverse:
const target2 = `  for (const s of list) {
    if (!s || !s.symbol) continue;
    const cleanSym = String(s.symbol).toUpperCase().replace(/\\.(NS|BO)$/, '').trim();
    if (!cleanSym || symSet.has(cleanSym) || cleanSym.startsWith('^') || /^\\d{5,}$/.test(cleanSym) || cleanSym.startsWith('0P') || isInstrumentETF(cleanSym, s.name || '')) {
      continue; // Duplicate or invalid symbol -> skip in ~15 nanoseconds
    }`;

const replacement2 = `  for (const s of list) {
    if (!s || !s.symbol) continue;
    let cleanSym = String(s.symbol).toUpperCase().replace(/\\.(NS|BO)$/, '').trim();
    cleanSym = resolveCanonicalSymbol(cleanSym);
    if (!cleanSym || symSet.has(cleanSym) || cleanSym.startsWith('^') || /^\\d{5,}$/.test(cleanSym) || cleanSym.startsWith('0P') || isInstrumentETF(cleanSym, s.name || '')) {
      continue; // Duplicate or invalid symbol -> skip in ~15 nanoseconds
    }`;

if (s.includes(target2)) {
  s = s.replace(target2, replacement2);
  console.log('2. Updated autoIngestStocksToUniverse with resolveCanonicalSymbol');
}

// 3. In addStockToUniverse:
const target3 = `function addStockToUniverse(stockData) {
  if (!stockData || !stockData.symbol) return { success: false, error: 'Symbol is required' };
  const cleanSym = String(stockData.symbol).toUpperCase().replace(/\\.(NS|BO)$/, '').trim();
  if (!cleanSym || !/^[A-Z0-9_\\-\\^]+$/.test(cleanSym)) {
    return { success: false, error: 'Invalid stock symbol format' };
  }`;

const replacement3 = `function addStockToUniverse(stockData) {
  if (!stockData || !stockData.symbol) return { success: false, error: 'Symbol is required' };
  let cleanSym = String(stockData.symbol).toUpperCase().replace(/\\.(NS|BO)$/, '').trim();
  cleanSym = resolveCanonicalSymbol(cleanSym);
  if (!cleanSym || !/^[A-Z0-9_\\-\\^]+$/.test(cleanSym)) {
    return { success: false, error: 'Invalid stock symbol format' };
  }`;

if (s.includes(target3)) {
  s = s.replace(target3, replacement3);
  console.log('3. Updated addStockToUniverse with resolveCanonicalSymbol');
}

// 4. In searchPredictiveStocks:
const target4 = `  const add = (symbol, name, exchange = 'NSE') => {
    if (!symbol) return;
    const s = symbol.trim().toUpperCase().replace(/\\.(NS|BO)$/, '');
    if (isInstrumentETF(s, name)) return;
    if (!seen.has(s) && s.length <= 16 && !/^0P\\w+/.test(s)) {
      seen.add(s);
      results.push({
        symbol: s,
        name: (name || s).trim(),
        exchange: exchange || 'NSE'
      });
    }
  };`;

const replacement4 = `  const add = (symbol, name, exchange = 'NSE') => {
    if (!symbol) return;
    const raw = symbol.trim().toUpperCase().replace(/\\.(NS|BO)$/, '');
    const s = resolveCanonicalSymbol(raw);
    if (isInstrumentETF(s, name)) return;
    if (!seen.has(s) && s.length <= 16 && !/^0P\\w+/.test(s)) {
      seen.add(s);
      results.push({
        symbol: s,
        name: (name && name !== raw ? name : s).trim(),
        exchange: exchange || 'NSE'
      });
    }
  };`;

if (s.includes(target4)) {
  s = s.replace(target4, replacement4);
  console.log('4. Updated searchPredictiveStocks with resolveCanonicalSymbol');
}

// 5. In POST /api/watchlists/:id/stocks:
const target5 = `        const cleanSymbols = [...new Set(
          rawSymbols
            .map(s => String(s || '').trim().toUpperCase().replace(/\\.(NS|BO)$/, ''))
            .filter(Boolean)
        )];`;

const replacement5 = `        const cleanSymbols = [...new Set(
          rawSymbols
            .map(s => resolveCanonicalSymbol(s))
            .filter(Boolean)
        )];`;

if (s.includes(target5)) {
  s = s.replace(target5, replacement5);
  console.log('5. Updated POST /api/watchlists/:id/stocks with resolveCanonicalSymbol');
}

// 6. In live-candle:
const target6 = `      // 9a2. GET /api/stocks/:symbol/live-candle - Today's Live Real-Time Aggregated Daily Candle
      const liveCandleMatch = pathname.match(/^\\/api\\/stocks\\/([a-zA-Z0-9_%-]+)\\/live-candle$/);
      if (liveCandleMatch && method === 'GET') {
        const rawSymbol = decodeURIComponent(liveCandleMatch[1]);
        if (isInstrumentETF(rawSymbol)) {
          return sendJson(res, 400, { success: false, isETF: true, error: 'ETFs are excluded from the platform.' });
        }
        const cleanSym = rawSymbol.trim().toUpperCase().replace(/\\.(NS|BO)$/, '');`;

const replacement6 = `      // 9a2. GET /api/stocks/:symbol/live-candle - Today's Live Real-Time Aggregated Daily Candle
      const liveCandleMatch = pathname.match(/^\\/api\\/stocks\\/([a-zA-Z0-9_%-]+)\\/live-candle$/);
      if (liveCandleMatch && method === 'GET') {
        const rawSymbol = decodeURIComponent(liveCandleMatch[1]);
        const cleanSym = resolveCanonicalSymbol(rawSymbol);
        if (isInstrumentETF(cleanSym)) {
          return sendJson(res, 400, { success: false, isETF: true, error: 'ETFs are excluded from the platform.' });
        }`;

if (s.includes(target6)) {
  s = s.replace(target6, replacement6);
  console.log('6. Updated liveCandleMatch with resolveCanonicalSymbol');
}

// 7. In history:
const target7 = `        try {
          const histData = await fetchStockHistory(rawSymbol, queryRange, queryInterval, queryBefore);`;

const replacement7 = `        try {
          const targetSym = resolveCanonicalSymbol(rawSymbol);
          const histData = await fetchStockHistory(targetSym, queryRange, queryInterval, queryBefore);`;

if (s.includes(target7)) {
  s = s.replace(target7, replacement7);
  console.log('7. Updated fetchStockHistory with resolveCanonicalSymbol');
}

// Convert back to original CRLF
if (isCrlf) {
  s = s.replace(/\n/g, '\r\n');
}

fs.writeFileSync(serverFile, s, 'utf8');
console.log('Finished updating server.js!');
