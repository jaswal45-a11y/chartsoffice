/**
 * Chartsoffice IndexedDB Candle Cache & Technical Indicator Engine
 * Provides high-speed client-side caching for complete historical OHLCV datasets.
 * Allows instant (<50ms) chart rendering when switching or revisiting stocks.
 * Includes incremental indicator updates and background 2y history merging.
 */
(function() {
  const DB_NAME = 'Chartsoffice_CandleCache';
  const DB_VERSION = 1;
  const STORE_NAME = 'stock_history';
  const CACHE_TTL_MS = 12 * 60 * 60 * 1000; // 12 hours TTL for historical daily bars

  let dbPromise = null;

  function isIndexedDBSupported() {
    return typeof window !== 'undefined' && 'indexedDB' in window;
  }

  function getDB() {
    if (!isIndexedDBSupported()) return Promise.resolve(null);
    if (dbPromise) return dbPromise;

    dbPromise = new Promise((resolve) => {
      try {
        const req = window.indexedDB.open(DB_NAME, DB_VERSION);
        req.onupgradeneeded = (e) => {
          const db = e.target.result;
          if (!db.objectStoreNames.contains(STORE_NAME)) {
            const store = db.createObjectStore(STORE_NAME, { keyPath: 'key' });
            store.createIndex('symbol', 'symbol', { unique: false });
            store.createIndex('updatedAt', 'updatedAt', { unique: false });
          }
        };
        req.onsuccess = (e) => resolve(e.target.result);
        req.onerror = () => {
          console.warn('[CandleCache] IndexedDB open failed, falling back to memory.');
          resolve(null);
        };
      } catch (err) {
        console.warn('[CandleCache] IndexedDB error:', err.message);
        resolve(null);
      }
    });

    return dbPromise;
  }

  const memoryFallback = new Map();

  // -------------------------------------------------------------
  // Pure Indicator Calculations for Merged Datasets
  // -------------------------------------------------------------
  function calcEMA(prices, period) {
    const k = 2 / (period + 1);
    const ema = [];
    let sum = 0;
    for (let i = 0; i < period && i < prices.length; i++) {
      sum += prices[i];
    }
    let prevEma = sum / Math.min(period, prices.length || 1);
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

  function calcSMA(data, period, decimals = 0) {
    const sma = [];
    for (let i = 0; i < data.length; i++) {
      if (i < period - 1) {
        sma.push(null);
        continue;
      }
      let sum = 0;
      let validCount = 0;
      for (let j = i - period + 1; j <= i; j++) {
        const v = data[j];
        if (v !== null && v !== undefined && !isNaN(v)) {
          sum += v;
          validCount++;
        }
      }
      if (validCount === period) {
        sma.push(decimals > 0 ? Number((sum / period).toFixed(decimals)) : Number((sum / period).toFixed(0)));
      } else {
        sma.push(null);
      }
    }
    return sma;
  }

  function calcRSI(closes, period = 14) {
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

  function calcDarvasBox(candles, boxp = 5) {
    const n = candles.length;
    const topBox = [];
    const bottomBox = [];
    const highs = candles.map(c => c.high);
    const lows = candles.map(c => c.low);

    let lastNH = null;
    let barsSinceNewHigh = 999999;
    let currentTopBox = null;
    let currentBottomBox = null;

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
      const prevK1 = k1[i - 1];
      const isNewHigh = highs[i] > prevK1;
      if (isNewHigh) {
        lastNH = highs[i];
        barsSinceNewHigh = 0;
      } else {
        barsSinceNewHigh++;
      }

      let maxK2 = -Infinity;
      for (let j = Math.max(0, i - (boxp - 1) + 1); j <= i; j++) {
        if (highs[j] > maxK2) maxK2 = highs[j];
      }
      let maxK3 = -Infinity;
      for (let j = Math.max(0, i - (boxp - 2) + 1); j <= i; j++) {
        if (highs[j] > maxK3) maxK3 = highs[j];
      }
      const box1 = maxK3 < maxK2;

      let minLow = Infinity;
      for (let j = Math.max(0, i - boxp + 1); j <= i; j++) {
        if (lows[j] < minLow) minLow = lows[j];
      }

      if (barsSinceNewHigh === (boxp - 2) && box1) {
        currentTopBox = lastNH;
        currentBottomBox = minLow;
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

  function mapSeries(candles, values) {
    if (!candles || !values) return [];
    return candles.map((c, idx) => {
      const val = values[idx];
      return (val !== null && val !== undefined && !isNaN(val))
        ? { time: c.time, value: val }
        : { time: c.time };
    });
  }

  const CandleCache = {
    /**
     * Retrieve cached stock data payload
     * @param {string} symbol
     * @param {string} interval
     * @returns {Promise<object|null>}
     */
    async get(symbol, interval = '1d') {
      const cleanSym = String(symbol || '').toUpperCase().trim();
      const key = `${cleanSym}_${interval}`;

      const mem = memoryFallback.get(key);
      if (mem && (Date.now() - mem.updatedAt < CACHE_TTL_MS)) {
        return mem.payload;
      }

      const db = await getDB();
      if (!db) return mem ? mem.payload : null;

      return new Promise((resolve) => {
        try {
          const tx = db.transaction(STORE_NAME, 'readonly');
          const store = tx.objectStore(STORE_NAME);
          const req = store.get(key);
          req.onsuccess = () => {
            const result = req.result;
            if (result && result.payload) {
              memoryFallback.set(key, { payload: result.payload, updatedAt: result.updatedAt });
              resolve(result.payload);
            } else {
              resolve(null);
            }
          };
          req.onerror = () => resolve(null);
        } catch (_) {
          resolve(null);
        }
      });
    },

    /**
     * Store or merge stock history payload in IndexedDB
     * @param {string} symbol
     * @param {string} interval
     * @param {object} payload
     */
    async set(symbol, interval = '1d', payload) {
      if (!payload || !Array.isArray(payload.candles) || payload.candles.length === 0) return;
      const cleanSym = String(symbol || '').toUpperCase().trim();
      const key = `${cleanSym}_${interval}`;
      const now = Date.now();

      memoryFallback.set(key, { payload, updatedAt: now });

      const db = await getDB();
      if (!db) return;

      return new Promise((resolve) => {
        try {
          const tx = db.transaction(STORE_NAME, 'readwrite');
          const store = tx.objectStore(STORE_NAME);
          const record = {
            key,
            symbol: cleanSym,
            interval,
            payload,
            candleCount: payload.candles.length,
            updatedAt: now
          };
          const req = store.put(record);
          req.onsuccess = () => resolve(true);
          req.onerror = () => resolve(false);
        } catch (_) {
          resolve(false);
        }
      });
    },

    /**
     * Merge older historical candles with current candles, removing duplicates and sorting chronologically
     * @param {Array} currentCandles
     * @param {Array} olderCandles
     * @returns {Array} Clean unified candles
     */
    mergeCandles(currentCandles, olderCandles) {
      const map = new Map();
      if (Array.isArray(olderCandles)) {
        olderCandles.forEach(c => {
          if (c && c.time && c.close) map.set(String(c.time), c);
        });
      }
      if (Array.isArray(currentCandles)) {
        currentCandles.forEach(c => {
          if (c && c.time && c.close) map.set(String(c.time), c);
        });
      }

      const merged = Array.from(map.values());
      merged.sort((a, b) => String(a.time).localeCompare(String(b.time)));
      return merged;
    },

    /**
     * Compute full suite of indicators across candles in <1ms
     * @param {Array} candles
     * @returns {object} Calculated series
     */
    computeIndicators(candles) {
      if (!Array.isArray(candles) || candles.length === 0) return {};
      const closes = candles.map(c => c.close);
      const volumes = candles.map(c => c.volume || 0);

      const ema10 = calcEMA(closes, 10);
      const ema20 = calcEMA(closes, 20);
      const ema50 = calcEMA(closes, 50);
      const ema150 = calcEMA(closes, 150);
      const ema200 = calcEMA(closes, 200);
      const volAvg9 = calcSMA(volumes, 9);
      const rsi14 = calcRSI(closes, 14);
      const rsiSma14 = calcSMA(rsi14, 14);
      const darvasBox = calcDarvasBox(candles, 5);

      const volumeSeries = candles.map(c => ({
        time: c.time,
        value: c.volume || 0,
        color: c.close >= c.open ? 'rgba(16, 185, 129, 0.65)' : 'rgba(239, 68, 68, 0.65)'
      }));

      return {
        ema10: mapSeries(candles, ema10),
        ema20: mapSeries(candles, ema20),
        ema50: mapSeries(candles, ema50),
        ema150: mapSeries(candles, ema150),
        ema200: mapSeries(candles, ema200),
        volAvg9: mapSeries(candles, volAvg9),
        rsi14: mapSeries(candles, rsi14),
        rsiSma14: mapSeries(candles, rsiSma14),
        volumeSeries,
        darvasBox,
        latestEMA10: ema10[ema10.length - 1],
        latestEMA20: ema20[ema20.length - 1],
        latestEMA50: ema50[ema50.length - 1],
        latestEMA150: ema150[ema150.length - 1],
        latestEMA200: ema200[ema200.length - 1],
        latestRSI: rsi14[rsi14.length - 1],
        latestRsiSMA: rsiSma14[rsiSma14.length - 1],
        latestDarvasTop: darvasBox.latestTopBox,
        latestDarvasBottom: darvasBox.latestBottomBox
      };
    },

    /**
     * Incremental provisional EMA calculator for live tick updates
     * @param {number} currentPrice
     * @param {number} prevEma
     * @param {number} period
     * @returns {number}
     */
    calcProvisionalEMA(currentPrice, prevEma, period) {
      if (prevEma === null || prevEma === undefined || isNaN(prevEma)) return currentPrice;
      const k = 2 / (period + 1);
      return Number(((currentPrice * k) + (prevEma * (1 - k))).toFixed(2));
    },

    /**
     * Clear all cached candles (e.g. on manual sync or logout)
     */
    async clear() {
      memoryFallback.clear();
      const db = await getDB();
      if (!db) return;
      return new Promise((resolve) => {
        try {
          const tx = db.transaction(STORE_NAME, 'readwrite');
          const store = tx.objectStore(STORE_NAME);
          const req = store.clear();
          req.onsuccess = () => resolve(true);
          req.onerror = () => resolve(false);
        } catch (_) {
          resolve(false);
        }
      });
    }
  };

  window.CandleCache = CandleCache;
})();
