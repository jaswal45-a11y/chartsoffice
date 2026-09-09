/**
 * F&O & Equity Stock Screener Controller (Institutional Progressive Architecture)
 * With Real-Time Live Quotes Polling (30s), Green/Red Visual Price Flashes,
 * 212 F&O Direct Sync, Draggable Column Resizing & Custom Universe Pasting
 * Sangam_charts Financial Platform
 */

// -------------------------------------------------------------
// Official 212 F&O Preset List & Aliases
// -------------------------------------------------------------
const FNO_PRESET_212 = "ITC, ADANIGREEN, PERSISTENT, BHARTIARTL, ADANIPORTS, NAUKRI, MPHASIS, ADANIPOWER, HCLTECH, PFC, RELIANCE, MARICO, ONGC, INFY, HEROMOTOCO, BAJAJ-AUTO, LTM, BLUESTARCO, TATAELXSI, DRREDDY, OIL, HINDUNILVR, VBL, KOTAKBANK, SUPREMEIND, SHREECEM, SRF, PIIND, FORCEMOT, TATAPOWER, DELHIVERY, CIPLA, VOLTAS, FORTIS, PNB, UPL, KPITTECH, DABUR, MAHABANK, OBEROIRLTY, TECHM, NAM-INDIA, ZYDUSLIFE, BANKINDIA, GMRAIRPORT, APLAPOLLO, ATHERENERG, JSWSTEEL, GODREJCP, HDFCBANK, CONCOR, POWERGRID, TMPV, PNBHOUSING, HINDZINC, AMBUJACEM, PATANJALI, EICHERMOT, MAZDOCK, COFORGE, ADANIENT, HAL, RBLBANK, NTPC, CUMMINSIND, SIEMENS, ICICIGI, COALINDIA, SBILIFE, NIFTY, HINDALCO, ETERNAL, UNOMINDA, TATASTEEL, SOLARINDS, RADICO, BAJFINANCE, PAGEIND, BANDHANBNK, BANKBARODA, GLENMARK, PHOENIXLTD, LODHA, ULTRACEMCO, SONACOMS, JSWENERGY, ALKEM, NHPC, HDFCLIFE, TIINDIA, AUBANK, WAAREEENER, LICHSGFIN, TATACONSUM, M&M, HINDPETRO, RVNL, BEL, 360ONE, CDSL, TRENT, MANAPPURAM, ASTRAL, IRFC, CANBK, TITAN, SAIL, BANKNIFTY, IEX, ICICIBANK, HYUNDAI, NBCC, BRITANNIA, BSE, IDFCFIRSTB, INOXWIND, TCS, GODFRYPHLP, SAGILITY, UNITDSPR, LICI, AMBER, VEDL, WIPRO, LT, APOLLOHOSP, LUPIN, HAVELLS, GODREJPROP, ANGELONE, IOC, IDEA, INDIANB, PGEL, SBICARD, DMART, GRASIM, AUROPHARMA, BDL, IREDA, TORNTPHARM, BPCL, UNIONBANK, COLPAL, CROMPTON, FEDERALBNK, SUZLON, COCHINSHIP, PREMIERENE, JIOFIN, KAYNES, CHOLAFIN, DLF, JUBLFOOD, INDUSINDBK, SBIN, BAJAJFINSV, POLICYBZR, MFSL, MUTHOOTFIN, SWIGGY, NATIONALUM, BHARATFORG, ADANIENSOL, MOTILALOFS, MANKIND, DIXON, PIDILITIND, BIOCON, INDHOTEL, GAIL, GVT&D, JINDALSTEL, PETRONET, LAURUSLABS, SUNPHARMA, OFSS, MCX, NMDC, RECLTD, BAJAJHLDNG, BOSCHLTD, ASHOKLEY, ASIANPAINT, HDFCAMC, MOTHERSON, NYKAA, ABB, DIVISLAB, TVSMOTOR, YESBANK, AXISBANK, POWERINDIA, CGPOWER, KFINTECH, INDIGO, INDUSTOWER, BHEL, ABCAPITAL, VMM, LTF, MAXHEALTH, CAMS, PRESTIGE, NESTLEIND, ICICIPRULI, MARUTI, SHRIRAMFIN, KALYANKJIL, PAYTM, POLYCAB, KEI";

const SYMBOL_ALIAS_MAP = {
  'LTM': 'LTIM',
  'GMRAIRPORT': 'GMRINFRA',
  'HINDPETRO': 'HPCL',
  'LTF': 'L&TFH',
  'MOTHERSON': 'SAMVARDHANA'
};

const FNO_SET_212 = new Set(
  FNO_PRESET_212.split(/[,\s\n\r\t]+/)
    .map(s => s.trim().toUpperCase().replace(/[^A-Z0-9&\-_]/g, ''))
    .filter(Boolean)
);
Object.entries(SYMBOL_ALIAS_MAP).forEach(([from, to]) => {
  if (FNO_SET_212.has(from)) FNO_SET_212.add(to);
});

function isFnoStock(stockOrSymbol) {
  if (!stockOrSymbol) return false;
  if (typeof stockOrSymbol === 'object') {
    if (stockOrSymbol.fno === true) return true;
    stockOrSymbol = stockOrSymbol.symbol;
  }
  if (!stockOrSymbol || typeof stockOrSymbol !== 'string') return false;
  const sym = stockOrSymbol.toUpperCase().trim().replace(/[^A-Z0-9&\-_]/g, '');
  return FNO_SET_212.has(sym) || FNO_SET_212.has(SYMBOL_ALIAS_MAP[sym] || '');
}

function getFnoBadgeHtml(stockOrSymbol, extraClass = '') {
  if (!isFnoStock(stockOrSymbol)) return '';
  return `<span class="px-1 py-0.2 rounded text-[9px] font-bold bg-purple-500/20 text-purple-300 border border-purple-500/30 font-mono ${extraClass}" title="F&O Contract Available">F&O</span>`;
}

// Default Column Widths for Institutional Terminal Resizing
const DEFAULT_COLUMN_WIDTHS = {
  watchlist: '40px',
  stock: '210px',
  marketCap: '140px',
  sector: '140px',
  industry: '190px',
  price: '110px',
  changePercent: '100px',
  rsi: '90px',
  rvol: '90px',
  ema20Distance: '130px',
  fno: '80px'
};

// -------------------------------------------------------------
// Centralized State
// -------------------------------------------------------------
const state = {
  user: null,
  isAdmin: false,
  token: localStorage.getItem('authToken') || null,
  rawStocks: [],
  filteredStocks: [],
  watchlists: [],
  watchlistSymbols: new Set(),

  // Live Real-Time Quotes Map & Flash Tracking
  liveQuotes: {},
  priceFlashMap: {}, // { [symbol]: 'up' | 'down' }
  livePollInterval: null,
  lastQuoteTimestamp: null,

  // Native Chart State
  charts: {
    main: null,
    rsi: null,
    series: {},
    pivotLines: []
  },
  colors: {
    ema10: '#0284c7',
    ema20: '#2563eb',
    ema50: '#f59e0b',
    ema150: '#9333ea',
    ema200: '#e11d48',
    vwap: '#eab308',
    darvasTop: '#10b981',
    darvasBottom: '#ef4444',
    volAvg: '#fbbf24',
    rsi: '#60a5fa',
    rsiSma: '#fbbf24',
    avwap: '#a855f7',
    crosshair: '#3b82f6',
    closeLine: '#10b981'
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
  },
  customThemeColors: {
    bg: '#0b0f19',
    text: '#94a3b8',
    grid: '#1f293d',
    border: '#1f293d',
    candleUp: '#10b981',
    candleDown: '#ef4444'
  },
  chartTheme: localStorage.getItem('chart_theme') || 'dark',
  activeInterval: '1d',
  activeRange: '1y',
  toggles: {
    ema10: true,
    ema20: true,
    ema50: true,
    ema150: true,
    ema200: true,
    vol: true,
    volAvg: true,
    vwap: true,
    darvas: false,
    rsi: true,
    pivots: false
  },
  pivotType: 'Traditional (Auto)',
  drawings: {},
  activeDrawingTool: null,
  activeDrawingSeries: { avwaps: [], hlines: [] },
  lastCrosshairPrice: null,
  selectedStock: null,
  currentStockData: null,
  activeModalStockList: [],

  // Column Width Resizing State
  columnWidths: JSON.parse(localStorage.getItem('fno_column_widths') || '{}'),

  // Custom Universe State
  customUniverseRawText: localStorage.getItem('fno_custom_universe_text') || '',
  customUniverseSymbols: null, // Array of uppercase strings
  isCustomUniverseActive: localStorage.getItem('fno_custom_universe_active') === 'true',

  // Progressive Filter State
  filters: {
    search: '',
    marketCapMin: null, // number or null
    sectors: [],        // array of sector strings
    industries: [],     // array of industry strings
    fnoOnly: false,     // boolean
    rsiMin: null,
    rsiMax: null,
    rvolMin: null,
    ema20DistanceMin: null,
    ema20DistanceMax: null,
    priceMin: null,
    priceMax: null,
    change1DMin: null,
    change1DMax: null
  },

  // 3-State Sorting State: null -> asc -> desc -> null
  sort: {
    column: null,
    direction: null // 'asc' | 'desc' | null
  },

  // Pagination State
  pagination: {
    page: 1,
    pageSize: 50
  },

  // Column Visibility State
  columns: {
    watchlist: true,
    stock: true,
    marketCap: true,
    sector: true,
    industry: true,
    price: true,
    changePercent: true,
    rsi: true,
    rvol: true,
    ema20Distance: true,
    fno: true
  }
};

let activeChartTickerInterval = null;

// -------------------------------------------------------------
// Formatters & Helpers
// -------------------------------------------------------------
const fmt = {
  price: v => (v == null || isNaN(v)) ? '—' : '₹' + Number(v).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
  currency: v => (v == null || isNaN(v)) ? '—' : '₹' + Number(v).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
  percent: (v, showSign = true) => {
    if (v == null || isNaN(v)) return '—';
    const n = Number(v);
    const sign = showSign && n > 0 ? '+' : '';
    return `${sign}${n.toFixed(2)}%`;
  },
  volume: v => {
    if (v == null || isNaN(v)) return '—';
    const n = Number(v);
    if (n >= 1e7) return (n / 1e7).toFixed(2) + ' Cr';
    if (n >= 1e5) return (n / 1e5).toFixed(2) + ' L';
    if (n >= 1e3) return (n / 1e3).toFixed(1) + ' K';
    return n.toLocaleString('en-IN');
  },
  crore: v => (v == null || isNaN(v)) ? '—' : '₹' + Number(v).toLocaleString('en-IN') + ' Cr'
};

// -------------------------------------------------------------
// Formatters & Helpers
// -------------------------------------------------------------
const formatCurrencyCr = val => {
  if (val == null || isNaN(val)) return '—';
  return '₹' + Number(val).toLocaleString('en-IN') + ' Cr';
};

const formatPriceINR = val => {
  if (val == null || isNaN(val)) return '—';
  return '₹' + Number(val).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

const formatPercent = (val, showSign = true) => {
  if (val == null || isNaN(val)) return '—';
  const num = Number(val);
  const sign = showSign && num > 0 ? '+' : '';
  return `${sign}${num.toFixed(2)}%`;
};

const getAuthHeaders = () => {
  const token = state.token || localStorage.getItem('authToken') || localStorage.getItem('adminToken');
  return token ? { 'Authorization': `Bearer ${token}` } : {};
};

function parseTokensFromText(text) {
  if (!text) return [];
  return Array.from(new Set(
    text.split(/[,\s\n\r\t]+/)
      .map(s => s.trim().toUpperCase().replace(/[^A-Z0-9&\-_]/g, ''))
      .filter(s => s.length > 0)
  ));
}

// -------------------------------------------------------------
// Initialization Lifecycle
// -------------------------------------------------------------
document.addEventListener('DOMContentLoaded', async () => {
  initTheme();
  setupSearchInputListener();
  setupGlobalClickListener();
  
  await checkAuthStatus();
  await loadStockUniverse();
  
  if (state.user) {
    await loadUserWatchlists();
  }

  // Restore saved custom universe if active
  if (state.isCustomUniverseActive && state.customUniverseRawText) {
    state.customUniverseSymbols = parseTokensFromText(state.customUniverseRawText);
  }
  
  initColumnsSelector();
  initColumnResizers();
  populateSectorOptions();
  populateIndustryOptions();
  applyFilters();
  updateCustomUniverseHeaderBadge();
  
  // Start Live Real-Time Quotes Polling (30s Interval)
  startLiveQuotesPolling();
  
  // Sync Live Data Feed Status Badge (Dhan vs Backup)
  syncDataFeedStatus();

  // Initialize Native Chart engine & preferences
  loadSavedIndicatorPreferences();
  initIndicatorToggles();
  initChartControls();

  if (typeof lucide !== 'undefined') {
    lucide.createIcons();
  }
});

// -------------------------------------------------------------
// Live Broker Feed Status Indicator (Dhan HQ vs Backup)
// -------------------------------------------------------------
async function syncDataFeedStatus() {
  try {
    const res = await fetch('/api/feed/status');
    const data = await res.json();
    const badge = document.getElementById('data-feed-badge');
    const dot = document.getElementById('data-feed-dot');
    const label = document.getElementById('data-feed-label');

    if (!badge || !dot || !label) return;

    if (data.dhanConfigured) {
      badge.className = 'flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/25 text-emerald-400 text-xs font-mono select-none shadow-sm';
      badge.title = 'Active Feed: Official Dhan HQ Broker API (Connected)';
      dot.className = 'w-2 h-2 rounded-full bg-emerald-400 animate-pulse';
      label.textContent = '🟢 Dhan';
    } else {
      badge.className = 'flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-amber-500/10 border border-amber-500/25 text-amber-400 text-xs font-mono select-none';
      badge.title = 'Active Feed: Multi-Source Backup Feed (Dhan credentials not configured in environment)';
      dot.className = 'w-2 h-2 rounded-full bg-amber-400 animate-pulse';
      label.textContent = 'Backup';
    }
  } catch (err) {}
}

// -------------------------------------------------------------
// Live Real-Time Market Quotes Engine (30s Poller & Visual Flash)
// -------------------------------------------------------------
function startLiveQuotesPolling() {
  if (state.livePollInterval) clearInterval(state.livePollInterval);
  
  // Immediate initial live fetch
  pollLiveQuotes(true);

  // Recurring 30s auto-refresh
  state.livePollInterval = setInterval(() => {
    pollLiveQuotes(true);
  }, 30000);
}

async function pollLiveQuotes(silent = false) {
  const activeUniverse = getActiveUniverse();
  if (!activeUniverse || activeUniverse.length === 0) return;

  // Determine top priority symbols to refresh (visible page stocks + top 50 liquid heavyweights)
  const { page, pageSize } = state.pagination;
  const startIdx = (page - 1) * pageSize;
  const visibleStocks = state.filteredStocks.slice(startIdx, startIdx + pageSize);
  const visibleSymbols = visibleStocks.map(s => s.symbol);

  // Add top liquid F&O stocks
  const prioritySymbols = Array.from(new Set([
    ...visibleSymbols,
    'RELIANCE', 'TCS', 'HDFCBANK', 'INFY', 'ICICIBANK', 'SBIN', 'BHARTIARTL', 'ITC', 'LT', 'BAJFINANCE',
    'TATAMOTORS', 'SUNPHARMA', 'TITAN', 'M&M', 'NTPC', 'ONGC', 'KOTAKBANK', 'HINDUNILVR', 'AXISBANK', 'ZOMATO',
    'NIFTY', 'BANKNIFTY'
  ]));

  try {
    const url = `/api/fno/live-quotes?symbols=${encodeURIComponent(prioritySymbols.join(','))}`;
    const res = await fetch(url);
    const data = await res.json();

    if (data.success && data.quotes) {
      state.lastQuoteTimestamp = data.timestamp;
      const quotes = data.quotes;
      let hasChanges = false;
      state.priceFlashMap = {};

      // Merge quotes into master stocks and track price flashes
      state.rawStocks.forEach(s => {
        const q = quotes[s.symbol.toUpperCase()];
        if (q && q.price) {
          if (s.price && q.price !== s.price) {
            state.priceFlashMap[s.symbol] = q.price > s.price ? 'up' : 'down';
          }
          s.price = q.price;
          if (q.changePercent != null) {
            if (s.changePercent !== q.changePercent) hasChanges = true;
            s.changePercent = q.changePercent;
          }
          if (q.volume) s.volume = q.volume;
          hasChanges = true;
        }
      });

      // Update live status text with last refresh time
      const statusText = document.getElementById('live-quotes-status-text');
      if (statusText) {
        const timeStr = new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true });
        statusText.textContent = `Live (30s) • ${timeStr}`;
      }

      if (hasChanges) {
        applyFilters();
      }

      if (!silent) {
        showToast('Live market quotes refreshed!', 'success');
      }
    }
  } catch (err) {
    console.warn('Live quotes polling notice:', err);
  }
}

// -------------------------------------------------------------
// Interactive Horizontal Column Width Resizer Engine
// -------------------------------------------------------------
function initColumnResizers() {
  const table = document.getElementById('screener-data-table');
  if (!table) return;

  const ths = table.querySelectorAll('thead th');
  ths.forEach((th, index) => {
    th.classList.add('resizable-th');

    // Extract column key
    let colKey = null;
    th.classList.forEach(cls => {
      if (cls.startsWith('col-')) colKey = cls.replace('col-', '');
    });
    if (!colKey && index === 0) colKey = 'watchlist';

    // Apply saved or default width
    const currentWidth = state.columnWidths[colKey] || DEFAULT_COLUMN_WIDTHS[colKey];
    if (currentWidth) {
      th.style.width = currentWidth;
      th.style.minWidth = currentWidth;
    }

    // Ensure single resizer element
    let resizer = th.querySelector('.col-resizer');
    if (!resizer) {
      resizer = document.createElement('div');
      resizer.className = 'col-resizer';
      resizer.title = 'Drag left/right to resize column width (Double-click to reset)';
      th.appendChild(resizer);
    }

    // Drag to Resize Event Listeners
    resizer.addEventListener('mousedown', (e) => {
      e.stopPropagation();
      e.preventDefault();

      const startX = e.pageX;
      const startWidth = th.offsetWidth;
      resizer.classList.add('is-resizing');
      document.body.classList.add('is-col-resizing');

      const onMouseMove = (moveEvent) => {
        const deltaX = moveEvent.pageX - startX;
        const newWidth = Math.max(45, startWidth + deltaX);
        th.style.width = `${newWidth}px`;
        th.style.minWidth = `${newWidth}px`;
      };

      const onMouseUp = () => {
        document.removeEventListener('mousemove', onMouseMove);
        document.removeEventListener('mouseup', onMouseUp);
        resizer.classList.remove('is-resizing');
        document.body.classList.remove('is-col-resizing');

        const finalWidth = `${th.offsetWidth}px`;
        if (colKey) {
          state.columnWidths[colKey] = finalWidth;
          localStorage.setItem('fno_column_widths', JSON.stringify(state.columnWidths));
        }
      };

      document.addEventListener('mousemove', onMouseMove);
      document.addEventListener('mouseup', onMouseUp);
    });

    // Double-click to Reset Column to Default
    resizer.addEventListener('dblclick', (e) => {
      e.stopPropagation();
      e.preventDefault();
      if (colKey) {
        delete state.columnWidths[colKey];
        localStorage.setItem('fno_column_widths', JSON.stringify(state.columnWidths));
        const defWidth = DEFAULT_COLUMN_WIDTHS[colKey] || '120px';
        th.style.width = defWidth;
        th.style.minWidth = defWidth;
        showToast(`Reset ${th.innerText.replace(/[^A-Za-z0-9 ]/g, '').trim()} column to default width`, 'info');
      }
    });
  });
}

// -------------------------------------------------------------
// Active Universe Resolution (Full vs Custom)
// -------------------------------------------------------------
function getActiveUniverse() {
  if (!state.isCustomUniverseActive || !state.customUniverseSymbols || state.customUniverseSymbols.length === 0) {
    return state.rawStocks;
  }

  const rawMap = new Map();
  state.rawStocks.forEach(s => {
    rawMap.set(s.symbol.toUpperCase(), s);
  });

  const resolved = [];
  const processed = new Set();

  state.customUniverseSymbols.forEach(rawSym => {
    if (processed.has(rawSym)) return;
    processed.add(rawSym);

    const targetSym = SYMBOL_ALIAS_MAP[rawSym] || rawSym;
    let stock = rawMap.get(targetSym) || rawMap.get(rawSym);

    if (stock) {
      resolved.push(stock);
    } else {
      const isIndex = rawSym === 'NIFTY' || rawSym === 'BANKNIFTY';
      resolved.push({
        symbol: rawSym,
        name: isIndex ? `${rawSym} Index Derivative` : `${rawSym} Limited`,
        exchange: isIndex ? 'NSE_INDEX' : 'NSE',
        marketCap: isIndex ? 2500000 : 25000,
        sector: isIndex ? 'Index' : 'Diversified',
        industry: isIndex ? 'Index Futures & Options' : 'Equities',
        price: isIndex ? (rawSym === 'NIFTY' ? 25200.00 : 51400.00) : 450.00,
        changePercent: 0.75,
        rsi: 56.4,
        rvol: 1.25,
        ema20Distance: 1.8,
        fno: true
      });
    }
  });

  return resolved;
}

// -------------------------------------------------------------
// Custom Universe Modal Handlers & Presets
// -------------------------------------------------------------
function openCustomUniverseModal() {
  const modal = document.getElementById('custom-universe-modal');
  const textarea = document.getElementById('textarea-custom-universe');

  if (textarea) {
    if (state.customUniverseRawText) {
      textarea.value = state.customUniverseRawText;
    } else if (!state.isCustomUniverseActive) {
      textarea.value = FNO_PRESET_212;
    }
    handleUniverseTextareaInput();
  }

  if (modal) {
    modal.classList.remove('hidden');
    modal.classList.add('flex');
    if (typeof lucide !== 'undefined') lucide.createIcons();
  }
}

function closeCustomUniverseModal() {
  const modal = document.getElementById('custom-universe-modal');
  if (modal) {
    modal.classList.add('hidden');
    modal.classList.remove('flex');
  }
}

function handleUniverseTextareaInput() {
  const textarea = document.getElementById('textarea-custom-universe');
  const counter = document.getElementById('custom-universe-detected-count');
  if (!textarea || !counter) return;

  const tokens = parseTokensFromText(textarea.value);
  counter.textContent = `${tokens.length} symbol${tokens.length === 1 ? '' : 's'}`;
}

function loadFnoPreset212() {
  const textarea = document.getElementById('textarea-custom-universe');
  if (textarea) {
    textarea.value = FNO_PRESET_212;
    handleUniverseTextareaInput();
    showToast('Loaded 212 F&O Preset symbols into textarea', 'info');
  }
}

function clearCustomUniverseText() {
  const textarea = document.getElementById('textarea-custom-universe');
  if (textarea) {
    textarea.value = '';
    handleUniverseTextareaInput();
  }
}

function applyCustomUniverse() {
  const textarea = document.getElementById('textarea-custom-universe');
  const rawText = textarea ? textarea.value.trim() : '';
  const tokens = parseTokensFromText(rawText);

  if (tokens.length === 0) {
    showToast('Please enter or paste at least one valid stock symbol', 'error');
    return;
  }

  state.customUniverseRawText = rawText;
  state.customUniverseSymbols = tokens;
  state.isCustomUniverseActive = true;
  state.pagination.page = 1;

  localStorage.setItem('fno_custom_universe_text', rawText);
  localStorage.setItem('fno_custom_universe_active', 'true');

  closeCustomUniverseModal();
  updateCustomUniverseHeaderBadge();
  populateSectorOptions();
  populateIndustryOptions();
  applyFilters();

  // Trigger live quotes poll for newly activated custom universe
  pollLiveQuotes(true);

  showToast(`Custom Universe active with ${tokens.length} stocks! All filters applied with minimum delay.`, 'success');
}

function resetToFullUniverse() {
  state.isCustomUniverseActive = false;
  state.pagination.page = 1;
  localStorage.removeItem('fno_custom_universe_active');

  closeCustomUniverseModal();
  updateCustomUniverseHeaderBadge();
  populateSectorOptions();
  populateIndustryOptions();
  applyFilters();

  showToast('Reset to Full Stock Universe (1,100+ Stocks)', 'info');
}

function updateCustomUniverseHeaderBadge() {
  const badge = document.getElementById('badge-custom-universe-active');
  if (!badge) return;

  if (state.isCustomUniverseActive && state.customUniverseSymbols) {
    badge.textContent = state.customUniverseSymbols.length;
    badge.classList.remove('hidden');
    badge.classList.add('inline-block');
  } else {
    badge.classList.add('hidden');
    badge.classList.remove('inline-block');
  }
}

// -------------------------------------------------------------
// Auth Verification & UI Handling
// -------------------------------------------------------------
async function checkAuthStatus() {
  const token = localStorage.getItem('authToken') || localStorage.getItem('adminToken');
  if (!token) {
    updateAuthUI(null);
    return;
  }

  try {
    const res = await fetch('/api/auth/me', { headers: { 'Authorization': `Bearer ${token}` } });
    const data = await res.json();
    if (data.success && data.authenticated) {
      state.user = {
        userId: data.userId,
        username: data.username,
        role: data.role
      };
      state.isAdmin = (data.role === 'admin');
      state.token = token;
      updateAuthUI(state.user);
    } else {
      updateAuthUI(null);
    }
  } catch (err) {
    updateAuthUI(null);
  }
}

function updateAuthUI(user) {
  state.user = user;
  state.isAdmin = (user && user.role === 'admin');

  const btnOpenModal = document.getElementById('btn-open-auth-modal');
  const userBox = document.getElementById('user-auth-box');
  const userName = document.getElementById('user-badge-name');
  const userRole = document.getElementById('user-badge-role');
  const authGuard = document.getElementById('fno-auth-guard');
  const authContent = document.getElementById('fno-authenticated-content');

  if (user) {
    btnOpenModal?.classList.add('hidden');
    userBox?.classList.remove('hidden');
    userBox?.classList.add('flex');
    if (userName) userName.textContent = user.username;
    if (userRole) {
      userRole.textContent = user.role === 'admin' ? '(Admin)' : '(Member)';
      userRole.className = user.role === 'admin' ? 'text-emerald-400 text-[10px] font-bold' : 'text-purple-400 text-[10px] font-normal';
    }

    authGuard?.classList.add('hidden');
    authGuard?.classList.remove('flex');
    authContent?.classList.remove('hidden');
    authContent?.classList.add('flex');
  } else {
    btnOpenModal?.classList.remove('hidden');
    userBox?.classList.add('hidden');
    userBox?.classList.remove('flex');

    authGuard?.classList.remove('hidden');
    authGuard?.classList.add('flex');
    authContent?.classList.add('hidden');
    authContent?.classList.remove('flex');
  }

  if (typeof lucide !== 'undefined') {
    lucide.createIcons();
  }
}

function openAuthModal(tab = 'login') {
  switchAuthTab(tab);
  document.getElementById('login-error-banner')?.classList.add('hidden');
  document.getElementById('register-error-banner')?.classList.add('hidden');
  document.getElementById('register-success-banner')?.classList.add('hidden');

  const modal = document.getElementById('auth-modal');
  if (modal) {
    modal.classList.remove('hidden');
    modal.classList.add('flex');
  }
}

function closeAuthModal() {
  const modal = document.getElementById('auth-modal');
  if (modal) {
    modal.classList.add('hidden');
    modal.classList.remove('flex');
  }
}

function switchAuthTab(tab) {
  const tabLogin = document.getElementById('auth-tab-login');
  const tabRegister = document.getElementById('auth-tab-register');
  const formLogin = document.getElementById('login-form');
  const formRegister = document.getElementById('register-form');

  if (tab === 'login') {
    tabLogin?.classList.add('border-b-2', 'border-purple-500', 'text-purple-400');
    tabLogin?.classList.remove('text-slate-400');
    tabRegister?.classList.remove('border-b-2', 'border-purple-500', 'text-purple-400');
    tabRegister?.classList.add('text-slate-400');

    formLogin?.classList.remove('hidden');
    formRegister?.classList.add('hidden');
  } else {
    tabRegister?.classList.add('border-b-2', 'border-purple-500', 'text-purple-400');
    tabRegister?.classList.remove('text-slate-400');
    tabLogin?.classList.remove('border-b-2', 'border-purple-500', 'text-purple-400');
    tabLogin?.classList.add('text-slate-400');

    formRegister?.classList.remove('hidden');
    formLogin?.classList.add('hidden');
  }
}

async function handleLogin(e) {
  e.preventDefault();
  const username = document.getElementById('login-username')?.value.trim();
  const password = document.getElementById('login-password')?.value;
  const banner = document.getElementById('login-error-banner');

  try {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });
    const data = await res.json();
    if (!res.ok || !data.success) throw new Error(data.error || 'Login failed');

    state.token = data.token;
    localStorage.setItem('authToken', data.token);
    state.user = data.user;
    state.isAdmin = (data.user.role === 'admin');

    closeAuthModal();
    updateAuthUI(state.user);
    await loadUserWatchlists();
    applyFilters();
    showToast(`Welcome back, ${data.user.username}!`, 'success');
  } catch (err) {
    if (banner) {
      banner.textContent = err.message;
      banner.classList.remove('hidden');
    }
  }
}

async function handleRegister(e) {
  e.preventDefault();
  const username = document.getElementById('reg-username')?.value.trim();
  const password = document.getElementById('reg-password')?.value;
  const confirmPassword = document.getElementById('reg-confirm-password')?.value;
  const errBanner = document.getElementById('register-error-banner');

  if (password !== confirmPassword) {
    if (errBanner) {
      errBanner.textContent = 'Passwords do not match';
      errBanner.classList.remove('hidden');
    }
    return;
  }

  try {
    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });
    const data = await res.json();
    if (!res.ok || !data.success) throw new Error(data.error || 'Registration failed');

    state.token = data.token;
    localStorage.setItem('authToken', data.token);
    state.user = data.user;
    state.isAdmin = false;

    closeAuthModal();
    updateAuthUI(state.user);
    await loadUserWatchlists();
    applyFilters();
    showToast(`Account created for ${data.user.username}!`, 'success');
  } catch (err) {
    if (errBanner) {
      errBanner.textContent = err.message;
      errBanner.classList.remove('hidden');
    }
  }
}

async function handleLogout() {
  try {
    await fetch('/api/auth/logout', { method: 'POST', headers: getAuthHeaders() });
  } catch (e) {}

  state.user = null;
  state.isAdmin = false;
  state.token = null;
  state.watchlistSymbols.clear();
  localStorage.removeItem('authToken');
  localStorage.removeItem('adminToken');
  updateAuthUI(null);
  showToast('Logged out successfully', 'info');
}

// -------------------------------------------------------------
// Watchlist Management
// -------------------------------------------------------------
async function loadUserWatchlists() {
  if (!state.user && !state.isAdmin) return;
  try {
    const res = await fetch('/api/watchlists', { headers: getAuthHeaders() });
    const data = await res.json();
    if (data.success && Array.isArray(data.watchlists)) {
      state.watchlists = data.watchlists;
      state.watchlistSymbols.clear();
      data.watchlists.forEach(w => {
        (w.stocks || []).forEach(s => state.watchlistSymbols.add(s.symbol || s));
      });
      renderTable();
    }
  } catch (err) {
    console.warn('Failed to load watchlists:', err);
  }
}

async function toggleWatchlist(symbol) {
  if (!state.user && !state.isAdmin) {
    openAuthModal('login');
    showToast('Please login to pin stocks to your watchlist', 'info');
    return;
  }

  const isStarred = state.watchlistSymbols.has(symbol);
  let defaultWatchlist = state.watchlists[0];

  try {
    if (!defaultWatchlist) {
      const createRes = await fetch('/api/watchlists', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
        body: JSON.stringify({ name: 'Default Watchlist' })
      });
      const createData = await createRes.json();
      if (createData.success && createData.watchlist) {
        defaultWatchlist = createData.watchlist;
        state.watchlists.push(defaultWatchlist);
      }
    }

    if (!defaultWatchlist) return;

    if (isStarred) {
      state.watchlistSymbols.delete(symbol);
      await fetch(`/api/watchlists/${defaultWatchlist.id}/stocks/${symbol}`, {
        method: 'DELETE',
        headers: getAuthHeaders()
      });
      showToast(`${symbol} removed from Watchlist`, 'info');
    } else {
      state.watchlistSymbols.add(symbol);
      await fetch(`/api/watchlists/${defaultWatchlist.id}/stocks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
        body: JSON.stringify({ symbol })
      });
      showToast(`${symbol} pinned to Watchlist`, 'success');
    }

    renderTable();
  } catch (err) {
    console.error('Error toggling watchlist:', err);
  }
}

// -------------------------------------------------------------
// Stock Universe Data Loading
// -------------------------------------------------------------
async function loadStockUniverse() {
  try {
    const res = await fetch('/api/fno/stocks');
    const data = await res.json();
    if (data.success && Array.isArray(data.stocks)) {
      state.rawStocks = data.stocks;
      populateSectorOptions();
      populateIndustryOptions();
    }
  } catch (err) {
    console.error('Failed to load stock universe:', err);
  }
}

async function refreshStockData() {
  const icon = document.getElementById('icon-refresh-spin');
  if (icon) icon.classList.add('animate-spin');

  await pollLiveQuotes(false);

  setTimeout(() => {
    if (icon) icon.classList.remove('animate-spin');
  }, 400);
}

// -------------------------------------------------------------
// Dynamic Cascading Dropdown Populators
// -------------------------------------------------------------
function populateSectorOptions() {
  const sectorList = document.getElementById('sector-checkbox-list');
  if (!sectorList) return;

  const activeUniverse = getActiveUniverse();
  const sectors = Array.from(new Set(activeUniverse.map(s => s.sector).filter(Boolean))).sort();
  
  sectorList.innerHTML = sectors.map(sec => {
    const isChecked = state.filters.sectors.includes(sec);
    const count = activeUniverse.filter(s => s.sector === sec).length;
    return `
      <label class="flex items-center justify-between px-2 py-1.5 rounded-lg hover:bg-dark-bg cursor-pointer select-none text-xs transition-colors">
        <div class="flex items-center gap-2">
          <input type="checkbox" value="${sec}" ${isChecked ? 'checked' : ''} onchange="handleSectorCheckboxChange(this)" class="w-3.5 h-3.5 rounded border-slate-700 text-purple-600 focus:ring-0 bg-dark-bg cursor-pointer">
          <span class="text-slate-200 font-medium">${sec}</span>
        </div>
        <span class="text-[10px] text-slate-500 font-mono">${count}</span>
      </label>
    `;
  }).join('');

  updateSectorLabel();
}

function populateIndustryOptions() {
  const industryList = document.getElementById('industry-checkbox-list');
  if (!industryList) return;

  const activeUniverse = getActiveUniverse();
  let pool = activeUniverse;
  if (state.filters.sectors.length > 0) {
    pool = activeUniverse.filter(s => state.filters.sectors.includes(s.sector));
  }

  const industries = Array.from(new Set(pool.map(s => s.industry).filter(Boolean))).sort();
  state.filters.industries = state.filters.industries.filter(ind => industries.includes(ind));

  industryList.innerHTML = industries.map(ind => {
    const isChecked = state.filters.industries.includes(ind);
    const count = pool.filter(s => s.industry === ind).length;
    return `
      <label class="flex items-center justify-between px-2 py-1.5 rounded-lg hover:bg-dark-bg cursor-pointer select-none text-xs transition-colors">
        <div class="flex items-center gap-2">
          <input type="checkbox" value="${ind}" ${isChecked ? 'checked' : ''} onchange="handleIndustryCheckboxChange(this)" class="w-3.5 h-3.5 rounded border-slate-700 text-purple-600 focus:ring-0 bg-dark-bg cursor-pointer">
          <span class="text-slate-200 font-medium truncate max-w-[190px]" title="${ind}">${ind}</span>
        </div>
        <span class="text-[10px] text-slate-500 font-mono">${count}</span>
      </label>
    `;
  }).join('');

  updateIndustryLabel();
}

function updateSectorLabel() {
  const label = document.getElementById('sector-selected-label');
  if (!label) return;
  const count = state.filters.sectors.length;
  if (count === 0) {
    label.textContent = 'All Sectors';
    label.className = 'font-semibold text-purple-300';
  } else if (count === 1) {
    label.textContent = state.filters.sectors[0];
    label.className = 'font-bold text-white';
  } else {
    label.textContent = `${count} Sectors Selected`;
    label.className = 'font-bold text-white';
  }
}

function updateIndustryLabel() {
  const label = document.getElementById('industry-selected-label');
  if (!label) return;
  const count = state.filters.industries.length;
  if (count === 0) {
    label.textContent = 'All Industries';
    label.className = 'font-semibold text-purple-300';
  } else if (count === 1) {
    label.textContent = state.filters.industries[0];
    label.className = 'font-bold text-white';
  } else {
    label.textContent = `${count} Industries Selected`;
    label.className = 'font-bold text-white';
  }
}

function handleSectorCheckboxChange(input) {
  const val = input.value;
  if (input.checked) {
    if (!state.filters.sectors.includes(val)) state.filters.sectors.push(val);
  } else {
    state.filters.sectors = state.filters.sectors.filter(s => s !== val);
  }
  updateSectorLabel();
  populateIndustryOptions();
  applyFilters();
}

function handleIndustryCheckboxChange(input) {
  const val = input.value;
  if (input.checked) {
    if (!state.filters.industries.includes(val)) state.filters.industries.push(val);
  } else {
    state.filters.industries = state.filters.industries.filter(i => i !== val);
  }
  updateIndustryLabel();
  applyFilters();
}

function selectAllSectors() {
  const activeUniverse = getActiveUniverse();
  const sectors = Array.from(new Set(activeUniverse.map(s => s.sector).filter(Boolean)));
  state.filters.sectors = sectors;
  populateSectorOptions();
  populateIndustryOptions();
  applyFilters();
}

function clearSectors() {
  state.filters.sectors = [];
  populateSectorOptions();
  populateIndustryOptions();
  applyFilters();
}

function selectAllIndustries() {
  const activeUniverse = getActiveUniverse();
  let pool = activeUniverse;
  if (state.filters.sectors.length > 0) {
    pool = activeUniverse.filter(s => state.filters.sectors.includes(s.sector));
  }
  state.filters.industries = Array.from(new Set(pool.map(s => s.industry).filter(Boolean)));
  populateIndustryOptions();
  applyFilters();
}

function clearIndustries() {
  state.filters.industries = [];
  populateIndustryOptions();
  applyFilters();
}

function filterSectorList() {
  const query = document.getElementById('input-search-sector')?.value.toLowerCase() || '';
  const labels = document.querySelectorAll('#sector-checkbox-list label');
  labels.forEach(lbl => {
    const text = lbl.innerText.toLowerCase();
    lbl.style.display = text.includes(query) ? 'flex' : 'none';
  });
}

function filterIndustryList() {
  const query = document.getElementById('input-search-industry')?.value.toLowerCase() || '';
  const labels = document.querySelectorAll('#industry-checkbox-list label');
  labels.forEach(lbl => {
    const text = lbl.innerText.toLowerCase();
    lbl.style.display = text.includes(query) ? 'flex' : 'none';
  });
}

// -------------------------------------------------------------
// Dropdown Toggle Handlers
// -------------------------------------------------------------
function toggleSectorDropdown() {
  const menu = document.getElementById('sector-dropdown-menu');
  const industryMenu = document.getElementById('industry-dropdown-menu');
  const colMenu = document.getElementById('column-selector-dropdown');
  industryMenu?.classList.add('hidden');
  colMenu?.classList.add('hidden');
  menu?.classList.toggle('hidden');
}

function toggleIndustryDropdown() {
  const menu = document.getElementById('industry-dropdown-menu');
  const sectorMenu = document.getElementById('sector-dropdown-menu');
  const colMenu = document.getElementById('column-selector-dropdown');
  sectorMenu?.classList.add('hidden');
  colMenu?.classList.add('hidden');
  menu?.classList.toggle('hidden');
}

function toggleColumnMenu() {
  const colMenu = document.getElementById('column-selector-dropdown');
  const sectorMenu = document.getElementById('sector-dropdown-menu');
  const industryMenu = document.getElementById('industry-dropdown-menu');
  sectorMenu?.classList.add('hidden');
  industryMenu?.classList.add('hidden');
  colMenu?.classList.toggle('hidden');
}

function toggleMoreFiltersDrawer() {
  const drawer = document.getElementById('drawer-more-filters');
  const icon = document.getElementById('icon-more-filters');
  if (drawer) {
    const isHidden = drawer.classList.contains('hidden');
    drawer.classList.toggle('hidden');
    if (icon) icon.style.transform = isHidden ? 'rotate(180deg)' : 'rotate(0deg)';
  }
}

function setupGlobalClickListener() {
  document.addEventListener('click', e => {
    const sectorCont = document.getElementById('sector-multiselect-container');
    const industryCont = document.getElementById('industry-multiselect-container');
    const colBtn = document.getElementById('btn-columns-menu');
    const colMenu = document.getElementById('column-selector-dropdown');

    if (sectorCont && !sectorCont.contains(e.target)) {
      document.getElementById('sector-dropdown-menu')?.classList.add('hidden');
    }
    if (industryCont && !industryCont.contains(e.target)) {
      document.getElementById('industry-dropdown-menu')?.classList.add('hidden');
    }
    if (colMenu && !colMenu.contains(e.target) && !colBtn?.contains(e.target)) {
      colMenu.classList.add('hidden');
    }
  });
}

// -------------------------------------------------------------
// Search Input Handler
// -------------------------------------------------------------
function setupSearchInputListener() {
  const input = document.getElementById('input-stock-search');
  const clearBtn = document.getElementById('btn-clear-search');

  if (input) {
    input.addEventListener('input', e => {
      state.filters.search = e.target.value.trim();
      if (clearBtn) {
        clearBtn.classList.toggle('hidden', state.filters.search.length === 0);
      }
      state.pagination.page = 1;
      applyFilters();
    });
  }

  if (clearBtn) {
    clearBtn.addEventListener('click', () => {
      if (input) input.value = '';
      state.filters.search = '';
      clearBtn.classList.add('hidden');
      state.pagination.page = 1;
      applyFilters();
    });
  }
}

// -------------------------------------------------------------
// Filter Handlers & Progressive Filtering Pipeline
// -------------------------------------------------------------
function handleFilterChange() {
  const mcapVal = document.getElementById('select-market-cap')?.value;
  state.filters.marketCapMin = mcapVal === 'all' ? null : Number(mcapVal);

  state.filters.fnoOnly = Boolean(document.getElementById('chk-fno-only')?.checked);

  const rsiMin = document.getElementById('input-rsi-min')?.value;
  const rsiMax = document.getElementById('input-rsi-max')?.value;
  state.filters.rsiMin = rsiMin ? Number(rsiMin) : null;
  state.filters.rsiMax = rsiMax ? Number(rsiMax) : null;

  const rvolMin = document.getElementById('input-rvol-min')?.value;
  state.filters.rvolMin = rvolMin ? Number(rvolMin) : null;

  const emaMin = document.getElementById('input-ema-min')?.value;
  const emaMax = document.getElementById('input-ema-max')?.value;
  state.filters.ema20DistanceMin = emaMin ? Number(emaMin) : null;
  state.filters.ema20DistanceMax = emaMax ? Number(emaMax) : null;

  const priceMin = document.getElementById('input-price-min')?.value;
  const priceMax = document.getElementById('input-price-max')?.value;
  state.filters.priceMin = priceMin ? Number(priceMin) : null;
  state.filters.priceMax = priceMax ? Number(priceMax) : null;

  const changeMin = document.getElementById('input-change-min')?.value;
  const changeMax = document.getElementById('input-change-max')?.value;
  state.filters.change1DMin = changeMin ? Number(changeMin) : null;
  state.filters.change1DMax = changeMax ? Number(changeMax) : null;

  state.pagination.page = 1;
  applyFilters();
}

function resetAllFilters() {
  state.filters = {
    search: '',
    marketCapMin: null,
    sectors: [],
    industries: [],
    fnoOnly: false,
    rsiMin: null,
    rsiMax: null,
    rvolMin: null,
    ema20DistanceMin: null,
    ema20DistanceMax: null,
    priceMin: null,
    priceMax: null,
    change1DMin: null,
    change1DMax: null
  };

  state.sort = { column: null, direction: null };
  state.pagination.page = 1;

  const searchInput = document.getElementById('input-stock-search');
  if (searchInput) searchInput.value = '';
  document.getElementById('btn-clear-search')?.classList.add('hidden');

  const mcapSelect = document.getElementById('select-market-cap');
  if (mcapSelect) mcapSelect.value = 'all';

  const chkFno = document.getElementById('chk-fno-only');
  if (chkFno) chkFno.checked = false;

  ['input-rsi-min', 'input-rsi-max', 'input-rvol-min', 'input-ema-min', 'input-ema-max', 'input-price-min', 'input-price-max', 'input-change-min', 'input-change-max'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = '';
  });

  populateSectorOptions();
  populateIndustryOptions();
  applyFilters();
  showToast('All filters and sorting reset to default', 'info');
}

function applyFilters() {
  const universe = getActiveUniverse();
  let results = [...universe];

  // 1. Search Filter (Symbol & Name)
  if (state.filters.search) {
    const q = state.filters.search.toLowerCase();
    results = results.filter(s => 
      s.symbol.toLowerCase().includes(q) || 
      (s.name && s.name.toLowerCase().includes(q))
    );
  }

  // 2. Market Cap Filter
  if (state.filters.marketCapMin != null) {
    results = results.filter(s => (s.marketCap || 0) >= state.filters.marketCapMin);
  }

  // 3. Sector Filter
  if (state.filters.sectors.length > 0) {
    results = results.filter(s => state.filters.sectors.includes(s.sector));
  }

  // 4. Industry Filter
  if (state.filters.industries.length > 0) {
    results = results.filter(s => state.filters.industries.includes(s.industry));
  }

  // 5. F&O Filter (Matches fno: true or in 212 F&O Set)
  if (state.filters.fnoOnly) {
    results = results.filter(s => Boolean(s.fno) || FNO_SET_212.has(s.symbol.toUpperCase()));
  }

  // 6. Technical Filters
  if (state.filters.rsiMin != null) {
    results = results.filter(s => (s.rsi || 0) >= state.filters.rsiMin);
  }
  if (state.filters.rsiMax != null) {
    results = results.filter(s => (s.rsi || 0) <= state.filters.rsiMax);
  }
  if (state.filters.rvolMin != null) {
    results = results.filter(s => (s.rvol || 0) >= state.filters.rvolMin);
  }
  if (state.filters.ema20DistanceMin != null) {
    results = results.filter(s => (s.ema20Distance || 0) >= state.filters.ema20DistanceMin);
  }
  if (state.filters.ema20DistanceMax != null) {
    results = results.filter(s => (s.ema20Distance || 0) <= state.filters.ema20DistanceMax);
  }
  if (state.filters.priceMin != null) {
    results = results.filter(s => (s.price || 0) >= state.filters.priceMin);
  }
  if (state.filters.priceMax != null) {
    results = results.filter(s => (s.price || 0) <= state.filters.priceMax);
  }
  if (state.filters.change1DMin != null) {
    results = results.filter(s => (s.changePercent || 0) >= state.filters.change1DMin);
  }
  if (state.filters.change1DMax != null) {
    results = results.filter(s => (s.changePercent || 0) <= state.filters.change1DMax);
  }

  // 7. Independent 3-State Sorting
  if (state.sort.column && state.sort.direction) {
    const col = state.sort.column;
    const isAsc = state.sort.direction === 'asc';

    results.sort((a, b) => {
      let valA = a[col];
      let valB = b[col];

      if (col === 'fno') {
        valA = (a.fno || FNO_SET_212.has(a.symbol.toUpperCase())) ? 1 : 0;
        valB = (b.fno || FNO_SET_212.has(b.symbol.toUpperCase())) ? 1 : 0;
      }

      if (typeof valA === 'string') {
        return isAsc ? valA.localeCompare(valB) : valB.localeCompare(valA);
      }
      return isAsc ? (valA - valB) : (valB - valA);
    });
  }

  state.filteredStocks = results;
  
  renderTable();
  renderActiveFilterChips();
  renderPagination();
  updateMetricsHeader();
  updateSortingIcons();
}

// -------------------------------------------------------------
// Sorting Engine (3-State: null -> asc -> desc -> null)
// -------------------------------------------------------------
function handleSort(column) {
  if (state.sort.column !== column) {
    state.sort.column = column;
    state.sort.direction = 'asc';
  } else if (state.sort.direction === 'asc') {
    state.sort.direction = 'desc';
  } else {
    state.sort.column = null;
    state.sort.direction = null;
  }

  applyFilters();
}

function updateSortingIcons() {
  const columns = ['symbol', 'marketCap', 'sector', 'industry', 'price', 'changePercent', 'rsi', 'rvol', 'ema20Distance', 'fno'];
  
  columns.forEach(col => {
    const icon = document.getElementById(`sort-icon-${col}`);
    const th = document.querySelector(`.col-${col}`);
    if (!icon) return;

    if (state.sort.column === col) {
      if (state.sort.direction === 'asc') {
        icon.textContent = '↑';
        icon.className = 'sort-icon text-purple-400 font-bold';
      } else if (state.sort.direction === 'desc') {
        icon.textContent = '↓';
        icon.className = 'sort-icon text-purple-400 font-bold';
      }
      th?.classList.add('sort-active');
    } else {
      icon.textContent = '↕';
      icon.className = 'sort-icon text-slate-600 group-hover:text-slate-300';
      th?.classList.remove('sort-active');
    }
  });
}

// -------------------------------------------------------------
// Active Filter Chips Rendering
// -------------------------------------------------------------
function renderActiveFilterChips() {
  const container = document.getElementById('active-filter-chips-container');
  const list = document.getElementById('active-chips-list');
  if (!container || !list) return;

  const chips = [];

  // Custom Universe Chip
  if (state.isCustomUniverseActive && state.customUniverseSymbols) {
    chips.push({
      label: `📋 Universe: Custom (${state.customUniverseSymbols.length} Stocks)`,
      onRemove: () => resetToFullUniverse()
    });
  }

  if (state.filters.search) {
    chips.push({ label: `Search: "${state.filters.search}"`, onRemove: () => {
      state.filters.search = '';
      const input = document.getElementById('input-stock-search');
      if (input) input.value = '';
      document.getElementById('btn-clear-search')?.classList.add('hidden');
      applyFilters();
    }});
  }

  if (state.filters.marketCapMin) {
    chips.push({ label: `Market Cap > ₹${Number(state.filters.marketCapMin).toLocaleString('en-IN')} Cr`, onRemove: () => {
      state.filters.marketCapMin = null;
      const select = document.getElementById('select-market-cap');
      if (select) select.value = 'all';
      applyFilters();
    }});
  }

  state.filters.sectors.forEach(sec => {
    chips.push({ label: `Sector: ${sec}`, onRemove: () => {
      state.filters.sectors = state.filters.sectors.filter(s => s !== sec);
      populateSectorOptions();
      populateIndustryOptions();
      applyFilters();
    }});
  });

  state.filters.industries.forEach(ind => {
    chips.push({ label: `Industry: ${ind}`, onRemove: () => {
      state.filters.industries = state.filters.industries.filter(i => i !== ind);
      populateIndustryOptions();
      applyFilters();
    }});
  });

  if (state.filters.fnoOnly) {
    chips.push({ label: 'F&O Stocks Only (212)', onRemove: () => {
      state.filters.fnoOnly = false;
      const chk = document.getElementById('chk-fno-only');
      if (chk) chk.checked = false;
      applyFilters();
    }});
  }

  if (state.filters.rsiMin != null || state.filters.rsiMax != null) {
    chips.push({ label: `RSI: ${state.filters.rsiMin || 0} – ${state.filters.rsiMax || 100}`, onRemove: () => {
      state.filters.rsiMin = null;
      state.filters.rsiMax = null;
      document.getElementById('input-rsi-min').value = '';
      document.getElementById('input-rsi-max').value = '';
      applyFilters();
    }});
  }

  if (state.filters.rvolMin != null) {
    chips.push({ label: `RVOL > ${state.filters.rvolMin}x`, onRemove: () => {
      state.filters.rvolMin = null;
      document.getElementById('input-rvol-min').value = '';
      applyFilters();
    }});
  }

  if (state.filters.ema20DistanceMin != null || state.filters.ema20DistanceMax != null) {
    chips.push({ label: `% from 20 EMA: ${state.filters.ema20DistanceMin != null ? state.filters.ema20DistanceMin + '%' : '-∞'} to ${state.filters.ema20DistanceMax != null ? state.filters.ema20DistanceMax + '%' : '+∞'}`, onRemove: () => {
      state.filters.ema20DistanceMin = null;
      state.filters.ema20DistanceMax = null;
      document.getElementById('input-ema-min').value = '';
      document.getElementById('input-ema-max').value = '';
      applyFilters();
    }});
  }

  if (state.filters.priceMin != null || state.filters.priceMax != null) {
    chips.push({ label: `Price: ₹${state.filters.priceMin || 0} – ₹${state.filters.priceMax || '∞'}`, onRemove: () => {
      state.filters.priceMin = null;
      state.filters.priceMax = null;
      document.getElementById('input-price-min').value = '';
      document.getElementById('input-price-max').value = '';
      applyFilters();
    }});
  }

  if (state.filters.change1DMin != null || state.filters.change1DMax != null) {
    chips.push({ label: `1D %: ${state.filters.change1DMin != null ? state.filters.change1DMin + '%' : '-∞'} to ${state.filters.change1DMax != null ? state.filters.change1DMax + '%' : '+∞'}`, onRemove: () => {
      state.filters.change1DMin = null;
      state.filters.change1DMax = null;
      document.getElementById('input-change-min').value = '';
      document.getElementById('input-change-max').value = '';
      applyFilters();
    }});
  }

  if (chips.length > 0) {
    container.classList.remove('hidden');
    container.classList.add('flex');
    list.innerHTML = chips.map((chip, idx) => `
      <span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-purple-500/15 border border-purple-500/30 text-purple-200 text-xs font-medium">
        <span>${chip.label}</span>
        <button onclick="window._removeChip(${idx})" class="text-purple-400 hover:text-white p-0.5 rounded hover:bg-purple-500/30 transition-colors" title="Remove filter">
          <i data-lucide="x" class="w-3 h-3"></i>
        </button>
      </span>
    `).join('');

    window._activeChips = chips;
    window._removeChip = (idx) => {
      if (window._activeChips && window._activeChips[idx]) {
        window._activeChips[idx].onRemove();
      }
    };
  } else {
    container.classList.add('hidden');
    container.classList.remove('flex');
    list.innerHTML = '';
  }

  if (typeof lucide !== 'undefined') {
    lucide.createIcons();
  }
}

// -------------------------------------------------------------
// Header Metrics Update
// -------------------------------------------------------------
function updateMetricsHeader() {
  const activeUniverse = getActiveUniverse();
  const total = activeUniverse.length;
  const filtered = state.filteredStocks.length;
  
  const badgeTotal = document.getElementById('badge-total-stocks');
  const tableStatus = document.getElementById('table-status-showing');

  const universeLabel = state.isCustomUniverseActive ? '(Custom Universe)' : (state.filters.fnoOnly ? '(212 F&O Stocks)' : '(Full Market)');

  if (badgeTotal) {
    badgeTotal.textContent = `Showing ${filtered.toLocaleString('en-IN')} of ${total.toLocaleString('en-IN')} stocks ${universeLabel}`;
  }

  if (tableStatus) {
    if (filtered === total) {
      tableStatus.textContent = `Showing: All ${total.toLocaleString('en-IN')} Stocks ${universeLabel}`;
    } else {
      tableStatus.textContent = `Showing: ${filtered.toLocaleString('en-IN')} Stocks matching filters (of ${total.toLocaleString('en-IN')} in ${universeLabel})`;
    }
  }
}

// -------------------------------------------------------------
// Table Rendering (Data-Dense Terminal Style & Visual Flashes)
// -------------------------------------------------------------
function renderTable() {
  const tbody = document.getElementById('fno-stocks-tbody');
  if (!tbody) return;

  const { page, pageSize } = state.pagination;
  const total = state.filteredStocks.length;

  if (total === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="11" class="py-12 text-center text-slate-400">
          <div class="flex flex-col items-center justify-center gap-2">
            <i data-lucide="filter-x" class="w-8 h-8 text-slate-600"></i>
            <p class="text-sm font-semibold text-slate-300">No stocks matching your selected filter criteria</p>
            <p class="text-xs text-slate-500">Try broadening your filters or click Reset Filters above</p>
            <button onclick="resetAllFilters()" class="mt-2 px-3 py-1.5 bg-purple-600 hover:bg-purple-500 text-white rounded-lg text-xs font-semibold">Reset Filters</button>
          </div>
        </td>
      </tr>
    `;
    if (typeof lucide !== 'undefined') lucide.createIcons();
    return;
  }

  const startIdx = (page - 1) * pageSize;
  const pageStocks = state.filteredStocks.slice(startIdx, startIdx + pageSize);

  tbody.innerHTML = pageStocks.map(s => {
    const isStarred = state.watchlistSymbols.has(s.symbol);
    const isBull = (s.changePercent || 0) >= 0;
    const changeBadgeClass = isBull ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-rose-500/10 text-rose-400 border-rose-500/20';

    // Check if this stock had a live price flash in this tick
    const flashClass = state.priceFlashMap[s.symbol] === 'up' ? 'flash-up' : (state.priceFlashMap[s.symbol] === 'down' ? 'flash-down' : '');

    let rsiBadge = 'text-slate-300';
    if (s.rsi >= 70) rsiBadge = 'text-emerald-400 font-bold bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20';
    else if (s.rsi <= 35) rsiBadge = 'text-rose-400 font-bold bg-rose-500/10 px-1.5 py-0.5 rounded border border-rose-500/20';
    else if (s.rsi >= 60) rsiBadge = 'text-teal-300 font-semibold';
    else if (s.rsi <= 45) rsiBadge = 'text-amber-300 font-semibold';

    let rvolBadge = 'text-slate-300';
    if (s.rvol >= 2.0) rvolBadge = 'text-purple-300 font-bold bg-purple-500/15 px-1.5 py-0.5 rounded border border-purple-500/30';
    else if (s.rvol >= 1.5) rvolBadge = 'text-indigo-300 font-semibold';

    const emaDistBull = (s.ema20Distance || 0) >= 0;
    const emaClass = emaDistBull ? 'text-emerald-400' : 'text-rose-400';
    const isFno = s.fno || FNO_SET_212.has(s.symbol.toUpperCase());

    return `
      <tr class="hover:bg-slate-800/40 transition-colors group ${flashClass}">
        <!-- 1. Watchlist Pin Star -->
        <td class="py-2.5 px-3 text-center sticky-col-cell bg-dark-card group-hover:bg-slate-800/60 border-r border-dark-border/40">
          <button onclick="toggleWatchlist('${s.symbol}')" class="p-1 text-slate-500 hover:text-amber-400 transition-colors cursor-pointer" title="${isStarred ? 'Unpin from Watchlist' : 'Pin to Watchlist'}">
            <i data-lucide="star" class="w-4 h-4 ${isStarred ? 'fill-amber-400 text-amber-400' : 'text-slate-500'}"></i>
          </button>
        </td>

        <!-- 2. Stock Symbol & Name -->
        <td class="py-2.5 px-3 sticky-col-cell bg-dark-card group-hover:bg-slate-800/60 border-r border-dark-border/40 col-stock">
          <div class="flex flex-col">
            <div class="flex items-center gap-1.5">
              <button onclick="openStockChartModal('${s.symbol}', '${(s.name || '').replace(/'/g, "\\'")}', state.filteredStocks)" class="font-bold text-white hover:text-purple-400 font-mono tracking-tight transition-colors text-left cursor-pointer hover:underline">
                ${s.symbol}
              </button>
              <span class="px-1 text-[9px] font-semibold bg-slate-800 text-slate-400 rounded border border-slate-700 font-sans">${s.exchange || 'NSE'}</span>
            </div>
            <span class="text-[11px] text-slate-400 truncate max-w-[180px] font-sans" title="${s.name}">${s.name || s.symbol}</span>
          </div>
        </td>

        <!-- 3. Market Cap -->
        <td class="py-2.5 px-3 text-right font-medium text-slate-200 col-marketCap">
          ${formatCurrencyCr(s.marketCap)}
        </td>

        <!-- 4. Sector -->
        <td class="py-2.5 px-3 font-sans text-slate-300 col-sector">
          <span class="px-2 py-0.5 rounded-md bg-dark-bg text-slate-300 border border-dark-border text-[11px]">
            ${s.sector || '—'}
          </span>
        </td>

        <!-- 5. Industry -->
        <td class="py-2.5 px-3 font-sans text-slate-400 text-[11px] truncate max-w-[180px] col-industry" title="${s.industry}">
          ${s.industry || '—'}
        </td>

        <!-- 6. Price (With Flash Animation on Live Tick) -->
        <td class="py-2.5 px-3 text-right font-bold text-slate-100 col-price font-mono ${flashClass}">
          ${formatPriceINR(s.price)}
        </td>

        <!-- 7. 1D Change % -->
        <td class="py-2.5 px-3 text-right col-changePercent">
          <span class="inline-block px-1.5 py-0.5 rounded border text-[11px] font-bold font-mono ${changeBadgeClass}">
            ${formatPercent(s.changePercent)}
          </span>
        </td>

        <!-- 8. RSI (14) -->
        <td class="py-2.5 px-3 text-right col-rsi">
          <span class="${rsiBadge}">
            ${s.rsi != null ? Number(s.rsi).toFixed(1) : '—'}
          </span>
        </td>

        <!-- 9. Relative Volume (RVOL) -->
        <td class="py-2.5 px-3 text-right col-rvol">
          <span class="${rvolBadge}">
            ${s.rvol != null ? Number(s.rvol).toFixed(2) + 'x' : '—'}
          </span>
        </td>

        <!-- 10. % from 20 EMA -->
        <td class="py-2.5 px-3 text-right font-medium ${emaClass} col-ema20Distance">
          ${formatPercent(s.ema20Distance)}
        </td>

        <!-- 11. F&O Status -->
        <td class="py-2.5 px-3 text-center col-fno">
          ${isFno ? '<span class="px-2 py-0.5 text-[10px] font-bold bg-purple-500/15 text-purple-300 border border-purple-500/30 rounded-full font-sans">✓ F&O</span>' : '<span class="text-slate-600 font-mono">—</span>'}
        </td>
      </tr>
    `;
  }).join('');

  applyColumnVisibility();

  if (typeof lucide !== 'undefined') {
    lucide.createIcons();
  }
}

// -------------------------------------------------------------
// Pagination Controls
// -------------------------------------------------------------
function renderPagination() {
  const { page, pageSize } = state.pagination;
  const total = state.filteredStocks.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const info = document.getElementById('pagination-info');
  const buttonsContainer = document.getElementById('pagination-buttons-container');

  if (info) {
    const start = total === 0 ? 0 : (page - 1) * pageSize + 1;
    const end = Math.min(page * pageSize, total);
    info.textContent = `Showing ${start}–${end} of ${total.toLocaleString('en-IN')} stocks`;
  }

  if (buttonsContainer) {
    let btns = '';

    btns += `
      <button onclick="goToPage(${page - 1})" ${page === 1 ? 'disabled' : ''} class="px-2.5 py-1 rounded-lg bg-dark-card hover:bg-dark-accent border border-dark-border text-slate-300 disabled:opacity-30 disabled:pointer-events-none transition-colors text-xs">
        ← Prev
      </button>
    `;

    const pageWindow = [];
    for (let p = 1; p <= totalPages; p++) {
      if (p === 1 || p === totalPages || (p >= page - 2 && p <= page + 2)) {
        pageWindow.push(p);
      } else if (pageWindow[pageWindow.length - 1] !== '...') {
        pageWindow.push('...');
      }
    }

    pageWindow.forEach(p => {
      if (p === '...') {
        btns += `<span class="px-2 py-1 text-slate-600 font-mono text-xs">...</span>`;
      } else {
        const isActive = p === page;
        btns += `
          <button onclick="goToPage(${p})" class="px-2.5 py-1 rounded-lg ${isActive ? 'bg-purple-600 text-white font-bold shadow' : 'bg-dark-card hover:bg-dark-accent text-slate-300'} border border-dark-border transition-colors text-xs font-mono">
            ${p}
          </button>
        `;
      }
    });

    btns += `
      <button onclick="goToPage(${page + 1})" ${page === totalPages || total === 0 ? 'disabled' : ''} class="px-2.5 py-1 rounded-lg bg-dark-card hover:bg-dark-accent border border-dark-border text-slate-300 disabled:opacity-30 disabled:pointer-events-none transition-colors text-xs">
        Next →
      </button>
    `;

    buttonsContainer.innerHTML = btns;
  }
}

function goToPage(p) {
  const totalPages = Math.max(1, Math.ceil(state.filteredStocks.length / state.pagination.pageSize));
  if (p < 1 || p > totalPages) return;
  state.pagination.page = p;
  renderTable();
  renderPagination();

  // Scroll table viewport to top
  const tableCont = document.querySelector('.fno-table-container');
  if (tableCont) tableCont.scrollTop = 0;

  // Poll live quotes for the newly visible page
  pollLiveQuotes(true);
}

function handleRowsPerPageChange() {
  const select = document.getElementById('select-rows-per-page');
  if (select) {
    state.pagination.pageSize = Number(select.value) || 50;
    state.pagination.page = 1;
    renderTable();
    renderPagination();
    pollLiveQuotes(true);
  }
}

// -------------------------------------------------------------
// Column Visibility Customization
// -------------------------------------------------------------
const COLUMN_DEFS = [
  { key: 'stock', label: 'Stock & Exchange' },
  { key: 'marketCap', label: 'Market Cap' },
  { key: 'sector', label: 'Sector' },
  { key: 'industry', label: 'Industry' },
  { key: 'price', label: 'Price' },
  { key: 'changePercent', label: '1D % Change' },
  { key: 'rsi', label: 'RSI (14)' },
  { key: 'rvol', label: 'RVOL' },
  { key: 'ema20Distance', label: '% from 20 EMA' },
  { key: 'fno', label: 'F&O Status' }
];

function initColumnsSelector() {
  const saved = localStorage.getItem('fno_columns_prefs');
  if (saved) {
    try {
      state.columns = { ...state.columns, ...JSON.parse(saved) };
    } catch (e) {}
  }

  const list = document.getElementById('columns-checkbox-list');
  if (!list) return;

  list.innerHTML = COLUMN_DEFS.map(col => `
    <label class="flex items-center gap-2 px-1 py-1 hover:bg-dark-bg rounded cursor-pointer select-none">
      <input type="checkbox" ${state.columns[col.key] !== false ? 'checked' : ''} onchange="toggleColumnVisibility('${col.key}', this.checked)" class="w-3.5 h-3.5 rounded border-slate-700 text-purple-600 focus:ring-0 bg-dark-bg cursor-pointer">
      <span class="text-slate-200">${col.label}</span>
    </label>
  `).join('');

  applyColumnVisibility();
}

function toggleColumnVisibility(key, visible) {
  state.columns[key] = visible;
  localStorage.setItem('fno_columns_prefs', JSON.stringify(state.columns));
  applyColumnVisibility();
}

function resetColumns() {
  COLUMN_DEFS.forEach(col => state.columns[col.key] = true);
  localStorage.removeItem('fno_columns_prefs');
  initColumnsSelector();
}

function applyColumnVisibility() {
  COLUMN_DEFS.forEach(col => {
    const isVisible = state.columns[col.key] !== false;
    const elements = document.querySelectorAll(`.col-${col.key}`);
    elements.forEach(el => {
      el.style.display = isVisible ? '' : 'none';
    });
  });
}

// -------------------------------------------------------------
// CSV Export
// -------------------------------------------------------------
function exportFnoCsv() {
  if (state.filteredStocks.length === 0) {
    showToast('No stocks available to export', 'error');
    return;
  }

  const headers = ['Symbol', 'Company Name', 'Exchange', 'Market Cap (Cr)', 'Sector', 'Industry', 'Price', '1D Change %', 'RSI (14)', 'RVOL', '% from 20 EMA', 'F&O'];
  const rows = state.filteredStocks.map(s => [
    `"${s.symbol}"`,
    `"${(s.name || '').replace(/"/g, '""')}"`,
    `"${s.exchange || 'NSE'}"`,
    s.marketCap || '',
    `"${(s.sector || '').replace(/"/g, '""')}"`,
    `"${(s.industry || '').replace(/"/g, '""')}"`,
    s.price || '',
    s.changePercent || '',
    s.rsi || '',
    s.rvol || '',
    s.ema20Distance || '',
    (s.fno || FNO_SET_212.has(s.symbol.toUpperCase())) ? 'YES' : 'NO'
  ]);

  const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `Sangam_Stock_Screener_${state.isCustomUniverseActive ? 'CustomUniverse_' : (state.filters.fnoOnly ? 'FNO_212_' : '')}${new Date().toISOString().slice(0, 10)}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  showToast('Exported CSV successfully!', 'success');
}

// -------------------------------------------------------------
// Theme Management
// -------------------------------------------------------------
function initTheme() {
  const theme = localStorage.getItem('theme') || 'dark';
  if (theme === 'dark') {
    document.documentElement.classList.add('dark');
  } else {
    document.documentElement.classList.remove('dark');
  }
  updateThemeIcon();
}

function toggleTheme() {
  const isDark = document.documentElement.classList.toggle('dark');
  localStorage.setItem('theme', isDark ? 'dark' : 'light');
  updateThemeIcon();
}

function updateThemeIcon() {
  const icon = document.getElementById('theme-icon');
  if (!icon) return;
  const isDark = document.documentElement.classList.contains('dark');
  if (isDark) {
    icon.setAttribute('data-lucide', 'sun');
    icon.className = 'w-4 h-4 text-amber-400';
  } else {
    icon.setAttribute('data-lucide', 'moon');
    icon.className = 'w-4 h-4 text-slate-600';
  }
  if (typeof lucide !== 'undefined') lucide.createIcons();
}

// -------------------------------------------------------------
// Toast Notifications
// -------------------------------------------------------------
function showToast(message, type = 'info') {
  const container = document.getElementById('toast-container');
  if (!container) return;

  const toast = document.createElement('div');
  const bg = type === 'success' ? 'bg-emerald-600 text-white' : type === 'error' ? 'bg-rose-600 text-white' : 'bg-slate-800 text-slate-100 border border-slate-700';

  toast.className = `px-4 py-2.5 rounded-xl shadow-2xl text-xs font-semibold flex items-center gap-2 toast-enter pointer-events-auto ${bg}`;
  toast.innerHTML = `
    <span>${message}</span>
  `;

  setTimeout(() => {
    toast.classList.remove('toast-enter');
    toast.classList.add('toast-exit');
    setTimeout(() => toast.remove(), 250);
  }, 3000);
}

// -------------------------------------------------------------
// Native Lightweight Charts Engine (Price + Bottom Volume Overlay & RSI Sub-Pane)
// -------------------------------------------------------------

const CHART_THEME_CONFIGS = {
  'dark': {
    name: 'Dark',
    bg: '#0b0f19',
    text: '#94a3b8',
    grid: 'rgba(255, 255, 255, 0.04)',
    border: '#1f293d',
    candleUp: '#10b981',
    candleDown: '#ef4444'
  },
  'light': {
    name: 'Light',
    bg: '#ffffff',
    text: '#334155',
    grid: 'rgba(0, 0, 0, 0.05)',
    border: '#e2e8f0',
    candleUp: '#16a34a',
    candleDown: '#dc2626'
  },
  'tv-dark': {
    name: 'TradingView Dark',
    bg: '#131722',
    text: '#d1d4dc',
    grid: 'rgba(42, 46, 57, 0.6)',
    border: '#2a2e39',
    candleUp: '#089981',
    candleDown: '#f23645'
  },
  'midnight': {
    name: 'Midnight',
    bg: '#000000',
    text: '#a3a3a3',
    grid: 'rgba(255, 255, 255, 0.05)',
    border: '#262626',
    candleUp: '#00e676',
    candleDown: '#ff1744'
  },
  'paper': {
    name: 'Paper',
    bg: '#fbf7ee',
    text: '#44403c',
    grid: 'rgba(120, 113, 108, 0.08)',
    border: '#e7e0d3',
    candleUp: '#059669',
    candleDown: '#b91c1c'
  },
  'high-contrast': {
    name: 'High Contrast',
    bg: '#000000',
    text: '#ffffff',
    grid: 'rgba(255, 255, 255, 0.15)',
    border: '#525252',
    candleUp: '#00ff66',
    candleDown: '#ff0055'
  }
};

function getThemeConfig(themeKey) {
  if (themeKey === 'custom') {
    return {
      name: 'Custom',
      bg: state.customThemeColors?.bg || '#0b0f19',
      text: state.customThemeColors?.text || '#94a3b8',
      grid: state.customThemeColors?.grid || 'rgba(255, 255, 255, 0.04)',
      border: state.customThemeColors?.border || '#1f293d',
      candleUp: state.customThemeColors?.candleUp || '#10b981',
      candleDown: state.customThemeColors?.candleDown || '#ef4444'
    };
  }
  return CHART_THEME_CONFIGS[themeKey] || CHART_THEME_CONFIGS['dark'];
}

function applyChartTheme(themeName) {
  themeName = themeName || state.chartTheme || 'dark';
  state.chartTheme = themeName;
  localStorage.setItem('chart_theme', themeName);

  const cfg = getThemeConfig(themeName);

  const selectChartTheme = document.getElementById('select-chart-theme');
  if (selectChartTheme && selectChartTheme.value !== themeName) {
    selectChartTheme.value = themeName;
  }
  const modalSelectTheme = document.getElementById('modal-select-chart-theme');
  if (modalSelectTheme && modalSelectTheme.value !== themeName) {
    modalSelectTheme.value = themeName;
  }

  const customPalette = document.getElementById('custom-theme-palette');
  if (customPalette) {
    if (themeName === 'custom') {
      customPalette.classList.remove('hidden');
      customPalette.classList.add('grid');
    } else {
      customPalette.classList.add('hidden');
      customPalette.classList.remove('grid');
    }
  }

  const chartMainContainer = document.getElementById('chart-main-container');
  if (chartMainContainer) chartMainContainer.style.backgroundColor = cfg.bg;
  const tvRsiContainer = document.getElementById('tv_rsi_container');
  if (tvRsiContainer) tvRsiContainer.style.backgroundColor = cfg.bg;

  const themeOpts = {
    layout: {
      background: { color: cfg.bg },
      textColor: cfg.text
    },
    grid: {
      vertLines: { color: cfg.grid },
      horzLines: { color: cfg.grid }
    },
    rightPriceScale: {
      borderColor: cfg.border
    },
    timeScale: {
      borderColor: cfg.border
    }
  };

  if (state.charts?.main) {
    state.charts.main.applyOptions(themeOpts);
  }
  if (state.charts?.rsi) {
    state.charts.rsi.applyOptions(themeOpts);
  }

  if (state.charts?.series?.candles) {
    state.charts.series.candles.applyOptions({
      upColor: cfg.candleUp,
      downColor: cfg.candleDown,
      wickUpColor: cfg.candleUp,
      wickDownColor: cfg.candleDown
    });
  }
}

function handleChartThemeChange(themeName) {
  applyChartTheme(themeName);
  saveIndicatorPreferences();
  const themeLabel = getThemeConfig(themeName).name || themeName;
  showToast(`Chart theme set to ${themeLabel}`, 'info');
}

function handleModalThemeChange(themeName) {
  applyChartTheme(themeName);
  saveIndicatorPreferences();
}

function handleCustomColorChange() {
  const bg = document.getElementById('picker-custom-bg')?.value || '#0b0f19';
  const text = document.getElementById('picker-custom-text')?.value || '#94a3b8';
  const grid = document.getElementById('picker-custom-grid')?.value || '#1f293d';
  const border = document.getElementById('picker-custom-border')?.value || '#1f293d';
  const candleUp = document.getElementById('picker-custom-up')?.value || '#10b981';
  const candleDown = document.getElementById('picker-custom-down')?.value || '#ef4444';

  state.customThemeColors = { bg, text, grid, border, candleUp, candleDown };

  if (state.chartTheme === 'custom') {
    applyChartTheme('custom');
  }
  saveIndicatorPreferences();
}

function applyLineWidths(widths) {
  if (widths) {
    state.lineWidths = { ...state.lineWidths, ...widths };
  }

  const w = state.lineWidths;
  const widthSelectMap = {
    ema10: 'setting-width-ema10',
    ema20: 'setting-width-ema20',
    ema50: 'setting-width-ema50',
    ema150: 'setting-width-ema150',
    ema200: 'setting-width-ema200',
    vwap: 'setting-width-vwap',
    darvasTop: 'setting-width-darvas-top',
    darvasBottom: 'setting-width-darvas-bottom',
    volAvg: 'setting-width-vol-avg',
    rsi: 'setting-width-rsi',
    rsiSma: 'setting-width-rsi-sma',
    avwap: 'setting-width-avwap',
    pivots: 'setting-width-pivots',
    crosshair: 'setting-width-crosshair',
    closeLine: 'setting-width-close-line'
  };

  Object.entries(widthSelectMap).forEach(([key, elementId]) => {
    const elSel = document.getElementById(elementId);
    if (elSel && w[key] !== undefined) {
      elSel.value = String(w[key]);
    }
  });

  if (state.charts?.series) {
    const s = state.charts.series;
    if (s.candles) {
      s.candles.applyOptions({
        priceLineVisible: true,
        priceLineColor: state.colors.closeLine || '#10b981',
        priceLineWidth: Number(w.closeLine || 1),
        priceLineStyle: 2,
        lastValueVisible: true
      });
    }
    if (s.ema10) s.ema10.applyOptions({ lineWidth: Number(w.ema10 || 1.5) });
    if (s.ema20) s.ema20.applyOptions({ lineWidth: Number(w.ema20 || 1.5) });
    if (s.ema50) s.ema50.applyOptions({ lineWidth: Number(w.ema50 || 1.5) });
    if (s.ema150) s.ema150.applyOptions({ lineWidth: Number(w.ema150 || 2) });
    if (s.ema200) s.ema200.applyOptions({ lineWidth: Number(w.ema200 || 2) });
    if (s.vwap) s.vwap.applyOptions({ lineWidth: Number(w.vwap || 1.8) });
    if (s.darvasTop) s.darvasTop.applyOptions({ lineWidth: Number(w.darvasTop || 2.5) });
    if (s.darvasBottom) s.darvasBottom.applyOptions({ lineWidth: Number(w.darvasBottom || 2.5) });
    if (s.volAvg) s.volAvg.applyOptions({ lineWidth: Number(w.volAvg || 1.5) });
    if (s.rsi) s.rsi.applyOptions({ lineWidth: Number(w.rsi || 2) });
    if (s.rsiSma) s.rsiSma.applyOptions({ lineWidth: Number(w.rsiSma || 1.5) });
  }

  const crosshairOpts = {
    crosshair: {
      vertLine: {
        color: state.colors.crosshair || '#3b82f6',
        width: Number(w.crosshair || 1),
        style: 2
      },
      horzLine: {
        color: state.colors.crosshair || '#3b82f6',
        width: Number(w.crosshair || 1),
        style: 2
      }
    }
  };
  if (state.charts?.main) state.charts.main.applyOptions(crosshairOpts);
  if (state.charts?.rsi) state.charts.rsi.applyOptions(crosshairOpts);

  if (state.activeDrawingSeries?.avwaps && state.activeDrawingSeries.avwaps.length > 0) {
    state.activeDrawingSeries.avwaps.forEach(av => {
      try { av.applyOptions({ lineWidth: Number(w.avwap || 2) }); } catch(e) {}
    });
  }

  updatePivotLines();
}

function updateLineStyle(indicatorKey) {
  const colorMap = {
    ema10: ['setting-color-ema10', 'color-ema10'],
    ema20: ['setting-color-ema20', 'color-ema20'],
    ema50: ['setting-color-ema50', 'color-ema50'],
    ema150: ['setting-color-ema150', 'color-ema150'],
    ema200: ['setting-color-ema200', 'color-ema200'],
    vwap: ['setting-color-vwap', 'color-vwap'],
    darvasTop: ['setting-color-darvas-top', 'color-darvas-top'],
    darvasBottom: ['setting-color-darvas-bottom', 'color-darvas-bottom'],
    volAvg: ['setting-color-vol-avg', 'color-vol-avg'],
    rsi: ['setting-color-rsi', 'color-rsi'],
    rsiSma: ['setting-color-rsi-sma', 'color-rsi-sma'],
    avwap: ['setting-color-avwap', 'color-avwap'],
    crosshair: ['setting-color-crosshair', null],
    closeLine: ['setting-color-close-line', null]
  };

  const widthMap = {
    ema10: 'setting-width-ema10',
    ema20: 'setting-width-ema20',
    ema50: 'setting-width-ema50',
    ema150: 'setting-width-ema150',
    ema200: 'setting-width-ema200',
    vwap: 'setting-width-vwap',
    darvasTop: 'setting-width-darvas-top',
    darvasBottom: 'setting-width-darvas-bottom',
    volAvg: 'setting-width-vol-avg',
    rsi: 'setting-width-rsi',
    rsiSma: 'setting-width-rsi-sma',
    avwap: 'setting-width-avwap',
    pivots: 'setting-width-pivots',
    crosshair: 'setting-width-crosshair',
    closeLine: 'setting-width-close-line'
  };

  if (colorMap[indicatorKey]) {
    const [modalColId, barColId] = colorMap[indicatorKey];
    const modalCol = document.getElementById(modalColId);
    const barCol = barColId ? document.getElementById(barColId) : null;
    let chosenColor = null;

    if (modalCol && document.activeElement === modalCol) {
      chosenColor = modalCol.value;
      if (barCol) barCol.value = chosenColor;
    } else if (barCol && document.activeElement === barCol) {
      chosenColor = barCol.value;
      if (modalCol) modalCol.value = chosenColor;
    } else if (modalCol) {
      chosenColor = modalCol.value;
    } else if (barCol) {
      chosenColor = barCol.value;
    }

    if (chosenColor) {
      state.colors[indicatorKey] = chosenColor;
    }
  }

  if (widthMap[indicatorKey]) {
    const widthEl = document.getElementById(widthMap[indicatorKey]);
    if (widthEl) {
      state.lineWidths[indicatorKey] = Number(widthEl.value);
    }
  }

  const s = state.charts?.series;
  if (s) {
    const opts = {};
    if (state.colors[indicatorKey]) opts.color = state.colors[indicatorKey];
    if (state.lineWidths[indicatorKey]) opts.lineWidth = Number(state.lineWidths[indicatorKey]);

    if (indicatorKey === 'ema10' && s.ema10) s.ema10.applyOptions(opts);
    if (indicatorKey === 'ema20' && s.ema20) s.ema20.applyOptions(opts);
    if (indicatorKey === 'ema50' && s.ema50) s.ema50.applyOptions(opts);
    if (indicatorKey === 'ema150' && s.ema150) s.ema150.applyOptions(opts);
    if (indicatorKey === 'ema200' && s.ema200) s.ema200.applyOptions(opts);
    if (indicatorKey === 'vwap' && s.vwap) s.vwap.applyOptions(opts);
    if (indicatorKey === 'darvasTop' && s.darvasTop) s.darvasTop.applyOptions(opts);
    if (indicatorKey === 'darvasBottom' && s.darvasBottom) s.darvasBottom.applyOptions(opts);
    if (indicatorKey === 'volAvg' && s.volAvg) s.volAvg.applyOptions(opts);
    if (indicatorKey === 'rsi' && s.rsi) s.rsi.applyOptions(opts);
    if (indicatorKey === 'rsiSma' && s.rsiSma) s.rsiSma.applyOptions(opts);
    if (indicatorKey === 'closeLine' && s.candles) {
      s.candles.applyOptions({
        priceLineVisible: true,
        priceLineColor: state.colors.closeLine || '#10b981',
        priceLineWidth: Number(state.lineWidths.closeLine || 1),
        priceLineStyle: 2,
        lastValueVisible: true
      });
    }
  }

  if (indicatorKey === 'crosshair') {
    const crosshairOpts = {
      crosshair: {
        vertLine: {
          color: state.colors.crosshair || '#3b82f6',
          width: Number(state.lineWidths.crosshair || 1),
          style: 2
        },
        horzLine: {
          color: state.colors.crosshair || '#3b82f6',
          width: Number(state.lineWidths.crosshair || 1),
          style: 2
        }
      }
    };
    if (state.charts?.main) state.charts.main.applyOptions(crosshairOpts);
    if (state.charts?.rsi) state.charts.rsi.applyOptions(crosshairOpts);
  }

  if (indicatorKey === 'avwap') {
    renderPersistedDrawings();
  } else if (indicatorKey === 'pivots') {
    updatePivotLines();
  }

  saveIndicatorPreferences();
}

function openLineSettingsModal() {
  const modal = document.getElementById('line-settings-modal');
  if (!modal) return;

  const colorMap = {
    ema10: 'setting-color-ema10',
    ema20: 'setting-color-ema20',
    ema50: 'setting-color-ema50',
    ema150: 'setting-color-ema150',
    ema200: 'setting-color-ema200',
    vwap: 'setting-color-vwap',
    darvasTop: 'setting-color-darvas-top',
    darvasBottom: 'setting-color-darvas-bottom',
    volAvg: 'setting-color-vol-avg',
    rsi: 'setting-color-rsi',
    rsiSma: 'setting-color-rsi-sma',
    avwap: 'setting-color-avwap',
    crosshair: 'setting-color-crosshair',
    closeLine: 'setting-color-close-line'
  };
  Object.entries(colorMap).forEach(([key, id]) => {
    const colInput = document.getElementById(id);
    if (colInput && state.colors[key]) colInput.value = state.colors[key];
  });

  const widthSelectMap = {
    ema10: 'setting-width-ema10',
    ema20: 'setting-width-ema20',
    ema50: 'setting-width-ema50',
    ema150: 'setting-width-ema150',
    ema200: 'setting-width-ema200',
    vwap: 'setting-width-vwap',
    darvasTop: 'setting-width-darvas-top',
    darvasBottom: 'setting-width-darvas-bottom',
    volAvg: 'setting-width-vol-avg',
    rsi: 'setting-width-rsi',
    rsiSma: 'setting-width-rsi-sma',
    avwap: 'setting-width-avwap',
    pivots: 'setting-width-pivots',
    crosshair: 'setting-width-crosshair',
    closeLine: 'setting-width-close-line'
  };
  Object.entries(widthSelectMap).forEach(([key, id]) => {
    const sel = document.getElementById(id);
    if (sel && state.lineWidths[key] !== undefined) sel.value = String(state.lineWidths[key]);
  });

  const modalTheme = document.getElementById('modal-select-chart-theme');
  if (modalTheme) modalTheme.value = state.chartTheme || 'dark';

  const customPalette = document.getElementById('custom-theme-palette');
  if (customPalette) {
    if (state.chartTheme === 'custom') {
      customPalette.classList.remove('hidden');
      customPalette.classList.add('grid');
    } else {
      customPalette.classList.add('hidden');
      customPalette.classList.remove('grid');
    }
  }

  const c = state.customThemeColors;
  if (document.getElementById('picker-custom-bg') && c.bg) document.getElementById('picker-custom-bg').value = c.bg;
  if (document.getElementById('picker-custom-text') && c.text) document.getElementById('picker-custom-text').value = c.text;
  if (document.getElementById('picker-custom-grid') && c.grid) document.getElementById('picker-custom-grid').value = c.grid;
  if (document.getElementById('picker-custom-border') && c.border) document.getElementById('picker-custom-border').value = c.border;
  if (document.getElementById('picker-custom-up') && c.candleUp) document.getElementById('picker-custom-up').value = c.candleUp;
  if (document.getElementById('picker-custom-down') && c.candleDown) document.getElementById('picker-custom-down').value = c.candleDown;

  modal.classList.remove('hidden');
  modal.classList.add('flex');
}

function closeLineSettingsModal() {
  const modal = document.getElementById('line-settings-modal');
  if (modal) {
    modal.classList.add('hidden');
    modal.classList.remove('flex');
  }
}

function resetLineStylesToDefaults() {
  state.colors = {
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
  };
  state.lineWidths = {
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
  };
  state.customThemeColors = {
    bg: '#0b0f19',
    text: '#94a3b8',
    grid: '#1f293d',
    border: '#1f293d',
    candleUp: '#10b981',
    candleDown: '#ef4444'
  };

  openLineSettingsModal();
  applyLoadedIndicatorPreferences({
    toggles: state.toggles,
    colors: state.colors,
    lineWidths: state.lineWidths,
    chartTheme: state.chartTheme,
    customThemeColors: state.customThemeColors,
    pivotType: state.pivotType
  });
  saveIndicatorPreferences();
  showToast('Line styles and thicknesses reset to default', 'info');
}

let savePrefsTimeout = null;
function saveIndicatorPreferences() {
  const prefs = {
    toggles: { ...state.toggles },
    colors: { ...state.colors },
    pivotType: state.pivotType || document.getElementById('select-pivot-type')?.value || 'Traditional (Auto)',
    chartTheme: state.chartTheme || 'dark',
    customThemeColors: { ...state.customThemeColors },
    lineWidths: { ...state.lineWidths }
  };

  localStorage.setItem('user_indicator_prefs', JSON.stringify(prefs));
  localStorage.setItem('chart_theme', state.chartTheme || 'dark');

  if (state.user || state.isAdmin) {
    if (savePrefsTimeout) clearTimeout(savePrefsTimeout);
    savePrefsTimeout = setTimeout(async () => {
      try {
        await fetch('/api/user/indicators', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...getAuthHeaders()
          },
          body: JSON.stringify(prefs)
        });
      } catch (e) {}
    }, 500);
  }
}

function applyLoadedIndicatorPreferences(prefs) {
  if (!prefs) return;

  if (prefs.toggles) {
    state.toggles = { ...state.toggles, ...prefs.toggles };
    const checkboxMap = {
      ema10: 'chk-ema10',
      ema20: 'chk-ema20',
      ema50: 'chk-ema50',
      ema150: 'chk-ema150',
      ema200: 'chk-ema200',
      vwap: 'chk-vwap',
      vol: 'chk-vol',
      volAvg: 'chk-vol-avg',
      darvas: 'chk-darvas',
      rsi: 'chk-rsi',
      pivots: 'chk-pivots'
    };

    Object.entries(checkboxMap).forEach(([key, elementId]) => {
      const elCheck = document.getElementById(elementId);
      if (elCheck && state.toggles[key] !== undefined) {
        elCheck.checked = Boolean(state.toggles[key]);
      }
    });

    if (state.charts?.series) {
      const s = state.charts.series;
      if (s.ema10) s.ema10.applyOptions({ visible: Boolean(state.toggles.ema10) });
      if (s.ema20) s.ema20.applyOptions({ visible: Boolean(state.toggles.ema20) });
      if (s.ema50) s.ema50.applyOptions({ visible: Boolean(state.toggles.ema50) });
      if (s.ema150) s.ema150.applyOptions({ visible: Boolean(state.toggles.ema150) });
      if (s.ema200) s.ema200.applyOptions({ visible: Boolean(state.toggles.ema200) });
      if (s.vwap) s.vwap.applyOptions({ visible: Boolean(state.toggles.vwap) });
      if (s.volume) s.volume.applyOptions({ visible: Boolean(state.toggles.vol) });
      if (s.volAvg) s.volAvg.applyOptions({ visible: Boolean(state.toggles.volAvg) });
      if (s.darvasTop) s.darvasTop.applyOptions({ visible: Boolean(state.toggles.darvas) });
      if (s.darvasBottom) s.darvasBottom.applyOptions({ visible: Boolean(state.toggles.darvas) });
    }

    const rsiCont = document.getElementById('tv_rsi_container');
    const rsiResizer = document.getElementById('resizer-price-rsi');
    const rsiBottomResizer = document.getElementById('resizer-rsi-bottom');
    if (rsiCont) rsiCont.style.display = state.toggles.rsi ? '' : 'none';
    if (rsiResizer) rsiResizer.style.display = state.toggles.rsi ? '' : 'none';
    if (rsiBottomResizer) rsiBottomResizer.style.display = state.toggles.rsi ? '' : 'none';

    updateTimeScalesVisibility();
    handleResize();
    updatePivotLines();
  }

  if (prefs.colors) {
    state.colors = { ...state.colors, ...prefs.colors };
    Object.keys(state.colors).forEach(k => updateLineStyle(k));
  }

  if (prefs.lineWidths) {
    applyLineWidths(prefs.lineWidths);
  }

  if (prefs.customThemeColors) {
    state.customThemeColors = { ...state.customThemeColors, ...prefs.customThemeColors };
  }

  if (prefs.chartTheme) {
    applyChartTheme(prefs.chartTheme);
  }

  if (prefs.pivotType) {
    state.pivotType = prefs.pivotType;
    const selectPivot = document.getElementById('select-pivot-type');
    if (selectPivot) selectPivot.value = prefs.pivotType;
    updatePivotLines();
  }
}

function loadSavedIndicatorPreferences() {
  try {
    const raw = localStorage.getItem('user_indicator_prefs');
    if (raw) {
      const prefs = JSON.parse(raw);
      applyLoadedIndicatorPreferences(prefs);
    }
  } catch (e) {}
}

function updateDefaultVolumeBadges() {
  const volArr = state.currentStockData?.volumeSeries;
  const volAvgArr = state.currentStockData?.volAvg9;
  const volBadge = document.getElementById('vol-live-badge');
  const volAvgBadge = document.getElementById('vol-avg-live-badge');
  const rsiBadge = document.getElementById('rsi-live-badge');
  const rsiSmaBadge = document.getElementById('rsi-sma-live-badge');

  if (volArr && volArr.length > 0 && volBadge) {
    const lastVol = volArr[volArr.length - 1];
    volBadge.textContent = fmt.volume(lastVol?.value || 0);
  }
  if (volAvgArr && volAvgArr.length > 0 && volAvgBadge) {
    const lastVolAvg = volAvgArr[volAvgArr.length - 1];
    volAvgBadge.textContent = fmt.volume(lastVolAvg?.value || 0);
  }
  const rsiArr = state.currentStockData?.rsi14;
  const rsiSmaArr = state.currentStockData?.rsiSma14;
  if (rsiArr && rsiArr.length > 0 && rsiBadge) {
    const lastRsi = rsiArr[rsiArr.length - 1];
    rsiBadge.textContent = lastRsi?.value ?? '--';
  }
  if (rsiSmaArr && rsiSmaArr.length > 0 && rsiSmaBadge) {
    const lastRsiSma = rsiSmaArr[rsiSmaArr.length - 1];
    rsiSmaBadge.textContent = lastRsiSma?.value ?? '--';
  }
}

function initNativeCharts() {
  if (typeof LightweightCharts === 'undefined') {
    console.error('LightweightCharts library not loaded');
    return;
  }

  const elTvMainChart = document.getElementById('tv_main_chart');
  const elTvRsiChart = document.getElementById('tv_rsi_chart');
  if (!elTvMainChart || !elTvRsiChart) return;

  const themeCfg = getThemeConfig(state.chartTheme || 'dark');
  const bgColor = themeCfg.bg;
  const textColor = themeCfg.text;
  const gridColor = themeCfg.grid;
  const borderColor = themeCfg.border;

  const baseChartOptions = {
    layout: {
      background: { color: bgColor },
      textColor: textColor,
      fontFamily: 'Inter, system-ui, sans-serif'
    },
    grid: {
      vertLines: { color: gridColor },
      horzLines: { color: gridColor }
    },
    crosshair: {
      mode: LightweightCharts.CrosshairMode.Normal,
      vertLine: {
        color: state.colors.crosshair || '#3b82f6',
        width: Number(state.lineWidths?.crosshair || 1),
        style: 2
      },
      horzLine: {
        color: state.colors.crosshair || '#3b82f6',
        width: Number(state.lineWidths?.crosshair || 1),
        style: 2
      }
    }
  };

  // PANE 1: Main Price Chart
  elTvMainChart.innerHTML = '';
  const mainRect = elTvMainChart.getBoundingClientRect();
  const mainChart = LightweightCharts.createChart(elTvMainChart, {
    ...baseChartOptions,
    width: mainRect.width || 600,
    height: mainRect.height || 420,
    rightPriceScale: {
      borderColor: borderColor,
      autoScale: true,
      minimumWidth: 75,
      scaleMargins: { top: 0.08, bottom: 0.25 }
    },
    timeScale: {
      borderColor: borderColor,
      visible: true,
      timeVisible: false,
      secondsVisible: false,
      fixLeftEdge: false,
      fixRightEdge: false,
      rightOffset: 6,
      barSpacing: 8,
      minBarSpacing: 1
    }
  });

  const candlestickSeries = mainChart.addCandlestickSeries({
    upColor: themeCfg.candleUp || '#10b981',
    downColor: themeCfg.candleDown || '#ef4444',
    borderVisible: false,
    wickUpColor: themeCfg.candleUp || '#10b981',
    wickDownColor: themeCfg.candleDown || '#ef4444',
    priceLineVisible: true,
    priceLineColor: state.colors.closeLine || '#10b981',
    priceLineWidth: Number(state.lineWidths?.closeLine || 1),
    priceLineStyle: 2,
    lastValueVisible: true
  });

  const volumeSeries = mainChart.addHistogramSeries({
    color: '#26a69a',
    priceFormat: { type: 'volume' },
    priceScaleId: ''
  });
  volumeSeries.priceScale().applyOptions({
    scaleMargins: { top: 0.75, bottom: 0 }
  });

  const volAvgSeries = mainChart.addLineSeries({
    color: state.colors.volAvg || '#fbbf24',
    lineWidth: Number(state.lineWidths?.volAvg || 1.5),
    priceFormat: { type: 'volume' },
    priceScaleId: '',
    title: '',
    priceLineVisible: false,
    lastValueVisible: false,
    crosshairMarkerVisible: false
  });

  const ema10Series = mainChart.addLineSeries({
    color: state.colors.ema10 || '#0284c7',
    lineWidth: Number(state.lineWidths?.ema10 || 1.5),
    title: '',
    priceLineVisible: false,
    lastValueVisible: false,
    crosshairMarkerVisible: false
  });

  const ema20Series = mainChart.addLineSeries({
    color: state.colors.ema20 || '#2563eb',
    lineWidth: Number(state.lineWidths?.ema20 || 1.5),
    title: '',
    priceLineVisible: false,
    lastValueVisible: false,
    crosshairMarkerVisible: false
  });

  const ema50Series = mainChart.addLineSeries({
    color: state.colors.ema50 || '#f59e0b',
    lineWidth: Number(state.lineWidths?.ema50 || 1.5),
    title: '',
    priceLineVisible: false,
    lastValueVisible: false,
    crosshairMarkerVisible: false
  });

  const ema150Series = mainChart.addLineSeries({
    color: state.colors.ema150 || '#9333ea',
    lineWidth: Number(state.lineWidths?.ema150 || 2),
    title: '',
    priceLineVisible: false,
    lastValueVisible: false,
    crosshairMarkerVisible: false
  });

  const ema200Series = mainChart.addLineSeries({
    color: state.colors.ema200 || '#e11d48',
    lineWidth: Number(state.lineWidths?.ema200 || 2),
    title: '',
    priceLineVisible: false,
    lastValueVisible: false,
    crosshairMarkerVisible: false
  });

  const vwapSeries = mainChart.addLineSeries({
    color: state.colors.vwap || '#eab308',
    lineWidth: Number(state.lineWidths?.vwap || 1.8),
    title: '',
    priceLineVisible: false,
    lastValueVisible: false,
    crosshairMarkerVisible: false
  });

  const darvasTopSeries = mainChart.addLineSeries({
    color: state.colors.darvasTop || '#10b981',
    lineWidth: Number(state.lineWidths?.darvasTop || 2.5),
    title: '',
    priceLineVisible: false,
    lastValueVisible: false,
    crosshairMarkerVisible: false
  });

  const darvasBottomSeries = mainChart.addLineSeries({
    color: state.colors.darvasBottom || '#ef4444',
    lineWidth: Number(state.lineWidths?.darvasBottom || 2.5),
    title: '',
    priceLineVisible: false,
    lastValueVisible: false,
    crosshairMarkerVisible: false
  });

  // PANE 2: Dedicated RSI (14) + RSI SMA (14) Sub-Pane
  elTvRsiChart.innerHTML = '';
  const rsiRect = elTvRsiChart.getBoundingClientRect();
  const rsiChart = LightweightCharts.createChart(elTvRsiChart, {
    ...baseChartOptions,
    width: rsiRect.width || 600,
    height: rsiRect.height || 100,
    rightPriceScale: {
      borderColor: borderColor,
      autoScale: true,
      minimumWidth: 75,
      scaleMargins: { top: 0.15, bottom: 0.15 }
    },
    timeScale: {
      borderColor: borderColor,
      visible: true,
      timeVisible: false,
      secondsVisible: false,
      fixLeftEdge: false,
      fixRightEdge: false,
      rightOffset: 6,
      barSpacing: 8,
      minBarSpacing: 1
    }
  });

  const rsiSeries = rsiChart.addLineSeries({
    color: state.colors.rsi || '#60a5fa',
    lineWidth: Number(state.lineWidths?.rsi || 2),
    priceFormat: {
      type: 'custom',
      formatter: price => Number(price).toFixed(1)
    },
    priceLineVisible: false,
    lastValueVisible: false,
    crosshairMarkerVisible: false
  });

  const rsiSmaSeries = rsiChart.addLineSeries({
    color: state.colors.rsiSma || '#fbbf24',
    lineWidth: Number(state.lineWidths?.rsiSma || 1.5),
    priceFormat: {
      type: 'custom',
      formatter: price => Number(price).toFixed(1)
    },
    priceLineVisible: false,
    lastValueVisible: false,
    crosshairMarkerVisible: false
  });

  rsiSeries.createPriceLine({ price: 70, color: 'rgba(239, 68, 68, 0.75)', lineWidth: 1, lineStyle: 2, axisLabelVisible: true, title: '70' });
  rsiSeries.createPriceLine({ price: 50, color: 'rgba(148, 163, 184, 0.4)', lineWidth: 1, lineStyle: 2, axisLabelVisible: false, title: '50' });
  rsiSeries.createPriceLine({ price: 30, color: 'rgba(16, 185, 129, 0.75)', lineWidth: 1, lineStyle: 2, axisLabelVisible: true, title: '30' });

  // Synchronize TimeScales
  const allCharts = [mainChart, rsiChart];
  let isSyncing = false;
  allCharts.forEach(source => {
    source.timeScale().subscribeVisibleLogicalRangeChange(range => {
      if (isSyncing || !range) return;
      isSyncing = true;
      allCharts.forEach(target => {
        if (target && target !== source) {
          target.timeScale().setVisibleLogicalRange(range);
        }
      });
      isSyncing = false;
    });
  });

  function handleCrosshairUpdate(param) {
    if (!param.time) {
      updateDefaultVolumeBadges();
      return;
    }

    if (param.point && candlestickSeries) {
      const p = candlestickSeries.coordinateToPrice(param.point.y);
      if (typeof p === 'number' && !isNaN(p)) {
        state.lastCrosshairPrice = Number(p.toFixed(2));
      }
    }

    const vol = param.seriesData.get(volumeSeries) || state.currentStockData?.volumeSeries?.find(v => v.time === param.time);
    const volAvg = param.seriesData.get(volAvgSeries) || state.currentStockData?.volAvg9?.find(v => v.time === param.time);
    const rsiVal = state.currentStockData?.rsi14?.find(r => r.time === param.time)?.value;
    const rsiSmaVal = state.currentStockData?.rsiSma14?.find(r => r.time === param.time)?.value;

    const volBadge = document.getElementById('vol-live-badge');
    const volAvgBadge = document.getElementById('vol-avg-live-badge');
    const rsiBadge = document.getElementById('rsi-live-badge');
    const rsiSmaBadge = document.getElementById('rsi-sma-live-badge');

    if (vol && volBadge) volBadge.textContent = fmt.volume(vol.value);
    if (volAvg && volAvgBadge) volAvgBadge.textContent = fmt.volume(volAvg.value);
    if (rsiVal !== undefined && rsiBadge) rsiBadge.textContent = rsiVal;
    if (rsiSmaVal !== undefined && rsiSmaBadge) rsiSmaBadge.textContent = rsiSmaVal;
  }

  // Synchronize Crosshairs across Main Chart and RSI Chart
  let isCrosshairSyncing = false;

  mainChart.subscribeCrosshairMove(param => {
    handleCrosshairUpdate(param);
    if (isCrosshairSyncing) return;
    isCrosshairSyncing = true;
    try {
      if (!param.time || !param.point) {
        if (rsiChart && typeof rsiChart.clearCrosshairPosition === 'function') {
          rsiChart.clearCrosshairPosition();
        }
      } else if (rsiChart && rsiSeries && typeof rsiChart.setCrosshairPosition === 'function') {
        const rsiItem = state.currentStockData?.rsi14?.find(r => r.time === param.time);
        const rsiVal = (rsiItem && typeof rsiItem.value === 'number') ? rsiItem.value : 50;
        rsiChart.setCrosshairPosition(rsiVal, param.time, rsiSeries);
      }
    } catch (e) {}
    isCrosshairSyncing = false;
  });

  if (rsiChart && rsiSeries) {
    rsiChart.subscribeCrosshairMove(param => {
      handleCrosshairUpdate(param);
      if (isCrosshairSyncing) return;
      isCrosshairSyncing = true;
      try {
        if (!param.time || !param.point) {
          if (mainChart && typeof mainChart.clearCrosshairPosition === 'function') {
            mainChart.clearCrosshairPosition();
          }
        } else if (mainChart && candlestickSeries && typeof mainChart.setCrosshairPosition === 'function') {
          const candle = state.currentStockData?.candles?.find(c => c.time === param.time);
          const price = candle ? (candle.close ?? candle.value) : (state.lastCrosshairPrice || 0);
          if (price) {
            mainChart.setCrosshairPosition(price, param.time, candlestickSeries);
          }
        }
      } catch (e) {}
      isCrosshairSyncing = false;
    });
  }

  // Clear crosshairs when mouse leaves the chart container
  const chartMainContainer = document.getElementById('tv_chart_container') || elTvMainChart.parentElement;
  if (chartMainContainer && !chartMainContainer._hasCrosshairLeaveBound) {
    chartMainContainer._hasCrosshairLeaveBound = true;
    chartMainContainer.addEventListener('mouseleave', () => {
      try {
        if (mainChart && typeof mainChart.clearCrosshairPosition === 'function') mainChart.clearCrosshairPosition();
        if (rsiChart && typeof rsiChart.clearCrosshairPosition === 'function') rsiChart.clearCrosshairPosition();
        updateDefaultVolumeBadges();
      } catch (e) {}
    });
  }

  mainChart.subscribeClick(handleChartClick);

  state.charts.main = mainChart;
  state.charts.rsi = rsiChart;
  state.charts.series = {
    candles: candlestickSeries,
    ema10: ema10Series,
    ema20: ema20Series,
    ema50: ema50Series,
    ema150: ema150Series,
    ema200: ema200Series,
    vwap: vwapSeries,
    darvasTop: darvasTopSeries,
    darvasBottom: darvasBottomSeries,
    volume: volumeSeries,
    volAvg: volAvgSeries,
    rsi: rsiSeries,
    rsiSma: rsiSmaSeries
  };

  updateTimeScalesVisibility();
  handleResize();
}

function updateTimeScalesVisibility() {
  const tvRsiCont = document.getElementById('tv_rsi_container');
  const isRsiVisible = tvRsiCont && tvRsiCont.style.display !== 'none';
  const isIntraday = state.currentStockData?.isIntraday || false;

  if (state.charts.rsi) {
    state.charts.rsi.applyOptions({
      timeScale: { visible: isRsiVisible, timeVisible: isIntraday, secondsVisible: false, fixLeftEdge: false, fixRightEdge: false }
    });
  }

  if (state.charts.main) {
    state.charts.main.applyOptions({
      timeScale: { visible: true, timeVisible: isIntraday, secondsVisible: false, fixLeftEdge: false, fixRightEdge: false }
    });
  }
}

function syncChartPriceScales() {
  if (!state.charts.main || !state.charts.rsi) return;
  try {
    const mainScale = state.charts.main.priceScale('right');
    const rsiScale = state.charts.rsi.priceScale('right');
    if (!mainScale || !rsiScale) return;
    const mainW = (typeof mainScale.width === 'function') ? mainScale.width() : 0;
    const rsiW = (typeof rsiScale.width === 'function') ? rsiScale.width() : 0;
    const targetW = Math.max(mainW, rsiW, 75);
    mainScale.applyOptions({ minimumWidth: targetW });
    rsiScale.applyOptions({ minimumWidth: targetW });
  } catch (e) {}
}

function handleResize() {
  if (!state.charts.main) return;
  
  const chartMainContainer = document.getElementById('chart-main-container') || document.getElementById('tv_price_pane')?.parentElement;
  const pricePane = document.getElementById('tv_price_pane');
  const rsiContainer = document.getElementById('tv_rsi_container');
  const rsiChartEl = document.getElementById('tv_rsi_chart');
  const tvMainChart = document.getElementById('tv_main_chart');
  
  const containerWidth = chartMainContainer ? chartMainContainer.clientWidth : (pricePane ? pricePane.clientWidth : 600);
  const commonWidth = Math.round(containerWidth || 600);

  if (pricePane && tvMainChart) {
    const pRect = pricePane.getBoundingClientRect();
    const h = Math.round(Math.max(80, pRect.height));
    state.charts.main.applyOptions({ width: commonWidth, height: h });
  }

  if (state.charts.rsi && rsiContainer && rsiChartEl && rsiContainer.style.display !== 'none') {
    const rRect = rsiChartEl.getBoundingClientRect();
    const h = Math.round(Math.max(30, rRect.height));
    state.charts.rsi.applyOptions({ width: commonWidth, height: h });
  }

  syncChartPriceScales();
}

function applyActiveRangeZoom() {
  const totalCandles = state.currentStockData?.candles?.length || 0;
  if (totalCandles === 0 || !state.charts.main) return;

  let barCount = 250;
  const isWeekly = state.activeInterval === '1wk';
  if (state.activeRange === '3mo') {
    barCount = isWeekly ? 13 : 65;
  } else if (state.activeRange === '6mo') {
    barCount = isWeekly ? 26 : 130;
  } else {
    barCount = isWeekly ? 52 : 250;
  }

  const fromIndex = Math.max(0, totalCandles - barCount);
  const toIndex = totalCandles + 3;

  state.charts.main.timeScale().setVisibleLogicalRange({
    from: fromIndex,
    to: toIndex
  });

  if (state.charts.rsi) {
    state.charts.rsi.timeScale().setVisibleLogicalRange({ from: fromIndex, to: toIndex });
  }
}

function setupPaneResizers() {
  const resizerPriceRsi = document.getElementById('resizer-price-rsi');
  const resizerRsiBottom = document.getElementById('resizer-rsi-bottom');
  const resizerChartBottom = document.getElementById('resizer-chart-bottom');
  const chartMainContainer = document.getElementById('chart-main-container');
  const pricePane = document.getElementById('tv_price_pane');
  const rsiContainer = document.getElementById('tv_rsi_container');
  const tvMainChart = document.getElementById('tv_main_chart');
  const tvRsiChart = document.getElementById('tv_rsi_chart');

  if (!chartMainContainer || !pricePane || !rsiContainer) return;

  const savedRsiH = localStorage.getItem('sangam_rsi_height');
  if (savedRsiH) {
    const parsedRsiH = parseInt(savedRsiH, 10);
    if (parsedRsiH >= 35 && parsedRsiH <= 400) {
      rsiContainer.style.height = `${parsedRsiH}px`;
    }
  }

  const savedChartH = localStorage.getItem('sangam_chart_height');
  if (savedChartH) {
    const parsedChartH = parseInt(savedChartH, 10);
    if (parsedChartH >= 300 && parsedChartH <= 950) {
      chartMainContainer.style.height = `${parsedChartH}px`;
    }
  }

  if (resizerPriceRsi) {
    let isDraggingRsi = false;
    let startY = 0;
    let startPriceH = 0;
    let startRsiH = 0;
    let combinedH = 0;

    const onRsiStart = (e) => {
      e.preventDefault();
      isDraggingRsi = true;
      startY = e.touches ? e.touches[0].clientY : e.clientY;
      startPriceH = pricePane.getBoundingClientRect().height;
      startRsiH = rsiContainer.getBoundingClientRect().height;
      combinedH = startPriceH + startRsiH;

      document.body.style.cursor = 'row-resize';
      document.body.style.userSelect = 'none';
      if (tvMainChart) tvMainChart.style.pointerEvents = 'none';
      if (tvRsiChart) tvRsiChart.style.pointerEvents = 'none';

      window.addEventListener('mousemove', onRsiMove, { passive: false });
      window.addEventListener('mouseup', onRsiEnd);
      window.addEventListener('touchmove', onRsiMove, { passive: false });
      window.addEventListener('touchend', onRsiEnd);
    };

    const onRsiMove = (e) => {
      if (!isDraggingRsi) return;
      if (e.cancelable) e.preventDefault();

      const clientY = e.touches ? e.touches[0].clientY : e.clientY;
      const deltaY = clientY - startY;

      const maxRsi = Math.max(35, combinedH - 80);
      const newRsiH = Math.round(Math.max(35, Math.min(maxRsi, startRsiH - deltaY)));
      const newPriceH = Math.round(combinedH - newRsiH);

      pricePane.style.flex = 'none';
      pricePane.style.height = `${newPriceH}px`;
      rsiContainer.style.height = `${newRsiH}px`;

      localStorage.setItem('sangam_rsi_height', newRsiH);
      handleResize();
    };

    const onRsiEnd = () => {
      if (!isDraggingRsi) return;
      isDraggingRsi = false;

      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      if (tvMainChart) tvMainChart.style.pointerEvents = '';
      if (tvRsiChart) tvRsiChart.style.pointerEvents = '';

      window.removeEventListener('mousemove', onRsiMove);
      window.removeEventListener('mouseup', onRsiEnd);
      window.removeEventListener('touchmove', onRsiMove);
      window.removeEventListener('touchend', onRsiEnd);
      handleResize();
    };

    resizerPriceRsi.addEventListener('mousedown', onRsiStart);
    resizerPriceRsi.addEventListener('touchstart', onRsiStart, { passive: false });
    resizerPriceRsi.addEventListener('dblclick', () => {
      const defaultRsi = 105;
      rsiContainer.style.height = `${defaultRsi}px`;
      pricePane.style.flex = '1';
      pricePane.style.height = '';
      localStorage.setItem('sangam_rsi_height', defaultRsi);
      handleResize();
    });
  }

  if (resizerRsiBottom) {
    let isDraggingRsiBottom = false;
    let startY = 0;
    let startRsiH = 0;

    const onRsiBottomStart = (e) => {
      e.preventDefault();
      isDraggingRsiBottom = true;
      startY = e.touches ? e.touches[0].clientY : e.clientY;
      startRsiH = rsiContainer.getBoundingClientRect().height;

      document.body.style.cursor = 'row-resize';
      document.body.style.userSelect = 'none';
      if (tvMainChart) tvMainChart.style.pointerEvents = 'none';
      if (tvRsiChart) tvRsiChart.style.pointerEvents = 'none';

      window.addEventListener('mousemove', onRsiBottomMove, { passive: false });
      window.addEventListener('mouseup', onRsiBottomEnd);
      window.addEventListener('touchmove', onRsiBottomMove, { passive: false });
      window.addEventListener('touchend', onRsiBottomEnd);
    };

    const onRsiBottomMove = (e) => {
      if (!isDraggingRsiBottom) return;
      if (e.cancelable) e.preventDefault();

      const clientY = e.touches ? e.touches[0].clientY : e.clientY;
      const deltaY = clientY - startY;

      const newRsiH = Math.round(Math.max(35, Math.min(400, startRsiH + deltaY)));
      rsiContainer.style.height = `${newRsiH}px`;

      localStorage.setItem('sangam_rsi_height', newRsiH);
      handleResize();
    };

    const onRsiBottomEnd = () => {
      if (!isDraggingRsiBottom) return;
      isDraggingRsiBottom = false;

      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      if (tvMainChart) tvMainChart.style.pointerEvents = '';
      if (tvRsiChart) tvRsiChart.style.pointerEvents = '';

      window.removeEventListener('mousemove', onRsiBottomMove);
      window.removeEventListener('mouseup', onRsiBottomEnd);
      window.removeEventListener('touchmove', onRsiBottomMove);
      window.removeEventListener('touchend', onRsiBottomEnd);
      handleResize();
    };

    resizerRsiBottom.addEventListener('mousedown', onRsiBottomStart);
    resizerRsiBottom.addEventListener('touchstart', onRsiBottomStart, { passive: false });
    resizerRsiBottom.addEventListener('dblclick', () => {
      const defaultRsi = 105;
      rsiContainer.style.height = `${defaultRsi}px`;
      localStorage.setItem('sangam_rsi_height', defaultRsi);
      handleResize();
    });
  }

  if (resizerChartBottom) {
    let isDraggingChart = false;
    let startY = 0;
    let startChartH = 0;

    const onChartStart = (e) => {
      e.preventDefault();
      isDraggingChart = true;
      startY = e.touches ? e.touches[0].clientY : e.clientY;
      startChartH = chartMainContainer.getBoundingClientRect().height;

      document.body.style.cursor = 'ns-resize';
      document.body.style.userSelect = 'none';
      if (tvMainChart) tvMainChart.style.pointerEvents = 'none';
      if (tvRsiChart) tvRsiChart.style.pointerEvents = 'none';

      window.addEventListener('mousemove', onChartMove, { passive: false });
      window.addEventListener('mouseup', onChartEnd);
      window.addEventListener('touchmove', onChartMove, { passive: false });
      window.addEventListener('touchend', onChartEnd);
    };

    const onChartMove = (e) => {
      if (!isDraggingChart) return;
      if (e.cancelable) e.preventDefault();

      const clientY = e.touches ? e.touches[0].clientY : e.clientY;
      const deltaY = clientY - startY;
      const newChartH = Math.round(Math.max(300, Math.min(950, startChartH + deltaY)));

      chartMainContainer.style.height = `${newChartH}px`;
      pricePane.style.flex = '1';
      pricePane.style.height = '';

      localStorage.setItem('sangam_chart_height', newChartH);
      handleResize();
    };

    const onChartEnd = () => {
      if (!isDraggingChart) return;
      isDraggingChart = false;

      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      if (tvMainChart) tvMainChart.style.pointerEvents = '';
      if (tvRsiChart) tvRsiChart.style.pointerEvents = '';

      window.removeEventListener('mousemove', onChartMove);
      window.removeEventListener('mouseup', onChartEnd);
      window.removeEventListener('touchmove', onChartMove);
      window.removeEventListener('touchend', onChartEnd);
      handleResize();
    };

    resizerChartBottom.addEventListener('mousedown', onChartStart);
    resizerChartBottom.addEventListener('touchstart', onChartStart, { passive: false });
    resizerChartBottom.addEventListener('dblclick', () => {
      const defaultH = 430;
      chartMainContainer.style.height = `${defaultH}px`;
      pricePane.style.flex = '1';
      pricePane.style.height = '';
      localStorage.setItem('sangam_chart_height', defaultH);
      handleResize();
    });
  }
}

// ==========================================
// MODAL CHART SIZING & RESIZING SYSTEM
// ==========================================

const CHART_MODAL_PRESETS = {
  compact: { width: '68vw', height: '62vh' },
  standard: { width: '80vw', height: '75vh' },
  large: { width: '92vw', height: '86vh' },
  maximized: { width: '98vw', height: '96vh' }
};

let previousModalPresetBeforeMax = null;

function setChartModalSizePreset(presetKey, save = true) {
  const chartPane = document.getElementById('chart-pane');
  if (!chartPane) return;

  const preset = CHART_MODAL_PRESETS[presetKey] || CHART_MODAL_PRESETS.standard;
  chartPane.style.width = preset.width;
  chartPane.style.height = preset.height;
  chartPane.dataset.sizePreset = presetKey;

  // Update preset button active highlights
  ['compact', 'standard', 'large'].forEach(key => {
    const btn = document.getElementById(`btn-chart-preset-${key}`);
    if (btn) {
      if (key === presetKey) {
        btn.className = 'px-2 py-1 rounded-lg bg-purple-600 text-white font-semibold shadow transition-colors cursor-pointer';
      } else {
        btn.className = 'px-2 py-1 rounded-lg hover:text-white transition-colors cursor-pointer text-slate-400';
      }
    }
  });

  const maxBtn = document.getElementById('btn-chart-maximize');
  if (maxBtn) {
    if (presetKey === 'maximized') {
      maxBtn.innerHTML = '<i data-lucide="minimize-2" class="w-3.5 h-3.5 text-purple-400"></i>';
      maxBtn.title = 'Restore Window Size';
    } else {
      maxBtn.innerHTML = '<i data-lucide="maximize" class="w-3.5 h-3.5"></i>';
      maxBtn.title = 'Maximize to Fullscreen';
    }
    if (window.lucide) window.lucide.createIcons();
  }

  if (save) {
    localStorage.setItem('sangam_chart_modal_preset', presetKey);
    localStorage.removeItem('sangam_chart_modal_w');
    localStorage.removeItem('sangam_chart_modal_h');
  }

  handleResize();
  setTimeout(handleResize, 60);
  setTimeout(handleResize, 160);
}

function toggleChartModalMaximize() {
  const chartPane = document.getElementById('chart-pane');
  if (!chartPane) return;

  const currentPreset = chartPane.dataset.sizePreset;
  if (currentPreset === 'maximized') {
    const restorePreset = previousModalPresetBeforeMax || localStorage.getItem('sangam_chart_modal_prev_preset') || 'standard';
    setChartModalSizePreset(restorePreset);
  } else {
    previousModalPresetBeforeMax = currentPreset || 'standard';
    localStorage.setItem('sangam_chart_modal_prev_preset', previousModalPresetBeforeMax);
    setChartModalSizePreset('maximized');
  }
}

function restoreChartModalSize() {
  const chartPane = document.getElementById('chart-pane');
  if (!chartPane) return;

  const savedPreset = localStorage.getItem('sangam_chart_modal_preset');
  const savedW = localStorage.getItem('sangam_chart_modal_w');
  const savedH = localStorage.getItem('sangam_chart_modal_h');

  if (savedW && savedH) {
    const w = parseInt(savedW, 10);
    const h = parseInt(savedH, 10);
    if (w >= 460 && h >= 400 && w <= window.innerWidth && h <= window.innerHeight) {
      chartPane.style.width = `${w}px`;
      chartPane.style.height = `${h}px`;
      chartPane.dataset.sizePreset = 'custom';
      
      ['compact', 'standard', 'large'].forEach(key => {
        const btn = document.getElementById(`btn-chart-preset-${key}`);
        if (btn) btn.className = 'px-2 py-1 rounded-lg hover:text-white transition-colors cursor-pointer text-slate-400';
      });
      return;
    }
  }

  if (savedPreset && CHART_MODAL_PRESETS[savedPreset]) {
    setChartModalSizePreset(savedPreset, false);
  } else {
    setChartModalSizePreset('standard', false);
  }
}

function initChartModalResizer() {
  const chartPane = document.getElementById('chart-pane');
  const handleCorner = document.getElementById('chart-modal-resize-handle');
  const handleRight = document.getElementById('chart-modal-resize-right');
  const tvMainChart = document.getElementById('tv_main_chart');
  const tvRsiChart = document.getElementById('tv_rsi_chart');

  if (!chartPane) return;

  let isDragging = false;
  let dragMode = null;
  let startX = 0, startY = 0;
  let startW = 0, startH = 0;
  let rafId = null;

  const startDrag = (e, mode) => {
    e.preventDefault();
    e.stopPropagation();
    isDragging = true;
    dragMode = mode;

    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    startX = clientX;
    startY = clientY;

    const rect = chartPane.getBoundingClientRect();
    startW = rect.width;
    startH = rect.height;

    chartPane.classList.remove('transition-all');
    document.body.style.userSelect = 'none';
    if (mode === 'corner') document.body.style.cursor = 'nwse-resize';
    else if (mode === 'right') document.body.style.cursor = 'ew-resize';

    if (tvMainChart) tvMainChart.style.pointerEvents = 'none';
    if (tvRsiChart) tvRsiChart.style.pointerEvents = 'none';

    window.addEventListener('mousemove', onDragMove, { passive: false });
    window.addEventListener('mouseup', onDragEnd);
    window.addEventListener('touchmove', onDragMove, { passive: false });
    window.addEventListener('touchend', onDragEnd);
  };

  const onDragMove = (e) => {
    if (!isDragging) return;
    if (e.cancelable) e.preventDefault();

    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;

    const deltaX = clientX - startX;
    const deltaY = clientY - startY;

    if (dragMode === 'corner' || dragMode === 'right') {
      const newW = Math.round(Math.max(460, Math.min(window.innerWidth * 0.98, startW + deltaX * 2)));
      chartPane.style.width = `${newW}px`;
    }

    if (dragMode === 'corner') {
      const newH = Math.round(Math.max(420, Math.min(window.innerHeight * 0.96, startH + deltaY * 2)));
      chartPane.style.height = `${newH}px`;
    }

    chartPane.dataset.sizePreset = 'custom';

    if (!rafId) {
      rafId = requestAnimationFrame(() => {
        handleResize();
        rafId = null;
      });
    }
  };

  const onDragEnd = () => {
    if (!isDragging) return;
    isDragging = false;
    dragMode = null;

    chartPane.classList.add('transition-all');
    document.body.style.userSelect = '';
    document.body.style.cursor = '';
    if (tvMainChart) tvMainChart.style.pointerEvents = '';
    if (tvRsiChart) tvRsiChart.style.pointerEvents = '';

    window.removeEventListener('mousemove', onDragMove);
    window.removeEventListener('mouseup', onDragEnd);
    window.removeEventListener('touchmove', onDragMove);
    window.removeEventListener('touchend', onDragEnd);

    const rect = chartPane.getBoundingClientRect();
    const finalW = Math.round(rect.width);
    const finalH = Math.round(rect.height);

    localStorage.setItem('sangam_chart_modal_w', finalW);
    localStorage.setItem('sangam_chart_modal_h', finalH);
    localStorage.setItem('sangam_chart_modal_preset', 'custom');

    ['compact', 'standard', 'large'].forEach(key => {
      const btn = document.getElementById(`btn-chart-preset-${key}`);
      if (btn) btn.className = 'px-2 py-1 rounded-lg hover:text-white transition-colors cursor-pointer text-slate-400';
    });

    handleResize();
  };

  if (handleCorner) {
    handleCorner.addEventListener('mousedown', (e) => startDrag(e, 'corner'));
    handleCorner.addEventListener('touchstart', (e) => startDrag(e, 'corner'), { passive: false });
    handleCorner.addEventListener('dblclick', () => setChartModalSizePreset('standard'));
  }

  if (handleRight) {
    handleRight.addEventListener('mousedown', (e) => startDrag(e, 'right'));
    handleRight.addEventListener('touchstart', (e) => startDrag(e, 'right'), { passive: false });
    handleRight.addEventListener('dblclick', () => setChartModalSizePreset('standard'));
  }
}

function setupPredictiveSearch() {
  const input = document.getElementById('manual-stock-input');
  const dropdown = document.getElementById('stock-autocomplete-dropdown');
  const btnSearch = document.getElementById('btn-manual-stock-search');
  if (!input || !dropdown) return;

  let activeIndex = -1;
  let currentSuggestions = [];
  let debounceTimer = null;

  const closeDropdown = () => {
    dropdown.classList.add('hidden');
    dropdown.innerHTML = '';
    activeIndex = -1;
    currentSuggestions = [];
  };

  const renderDropdown = (items) => {
    currentSuggestions = items;
    activeIndex = -1;
    if (!items || items.length === 0) {
      closeDropdown();
      return;
    }

    dropdown.innerHTML = items.map((item, idx) => `
      <div class="stock-suggestion-item px-3.5 py-2.5 cursor-pointer hover:bg-purple-600/20 transition-colors flex items-center justify-between gap-2 text-left select-none" data-index="${idx}">
        <div class="min-w-0 flex-1">
          <div class="flex items-center gap-2">
            <span class="font-bold font-mono text-slate-100 text-xs tracking-tight">${item.symbol}</span>
            <span class="text-[9px] px-1 py-0.2 rounded bg-purple-500/15 text-purple-400 font-mono font-semibold">${item.exchange || 'NSE'}</span>
            ${getFnoBadgeHtml(item.symbol)}
          </div>
          <div class="text-[11px] text-slate-400 truncate mt-0.5">${item.name || item.symbol}</div>
        </div>
        <i data-lucide="arrow-up-right" class="w-3.5 h-3.5 text-slate-500 shrink-0"></i>
      </div>
    `).join('');

    if (typeof lucide !== 'undefined') lucide.createIcons();
    dropdown.classList.remove('hidden');

    dropdown.querySelectorAll('.stock-suggestion-item').forEach(itemEl => {
      itemEl.addEventListener('mousedown', (e) => {
        e.preventDefault();
        const idx = parseInt(itemEl.dataset.index, 10);
        const chosen = currentSuggestions[idx];
        if (chosen) {
          input.value = chosen.symbol;
          closeDropdown();
          selectStock({ symbol: chosen.symbol, name: chosen.name });
        }
      });
    });
  };

  const highlightActive = () => {
    const itemEls = dropdown.querySelectorAll('.stock-suggestion-item');
    itemEls.forEach((itemEl, idx) => {
      if (idx === activeIndex) {
        itemEl.classList.add('bg-purple-600/30', 'border-l-2', 'border-purple-500');
        itemEl.scrollIntoView({ block: 'nearest' });
      } else {
        itemEl.classList.remove('bg-purple-600/30', 'border-l-2', 'border-purple-500');
      }
    });
  };

  const fetchSuggestions = async (query) => {
    const q = (query || '').trim().toUpperCase();
    if (!q) {
      closeDropdown();
      return;
    }

    const pool = (state.rawStocks && state.rawStocks.length > 0) ? state.rawStocks : (state.filteredStocks || []);
    const localMatches = pool
      .filter(s => (s.symbol || '').toUpperCase().includes(q) || (s.name || '').toUpperCase().includes(q))
      .slice(0, 6)
      .map(s => ({ symbol: s.symbol, name: s.name, exchange: s.exchange || 'NSE' }));

    if (localMatches.length > 0) {
      renderDropdown(localMatches);
    }

    try {
      const res = await fetch(`/api/stocks/search?q=${encodeURIComponent(query.trim())}`);
      const data = await res.json();
      if (data.success && Array.isArray(data.results) && data.results.length > 0) {
        const combined = [...data.results];
        localMatches.forEach(lm => {
          if (!combined.some(c => c.symbol === lm.symbol)) {
            combined.push(lm);
          }
        });
        renderDropdown(combined.slice(0, 8));
      } else if (localMatches.length === 0) {
        closeDropdown();
      }
    } catch (err) {
      console.warn('Autocomplete fetch error:', err);
    }
  };

  input.addEventListener('input', (e) => {
    const val = e.target.value;
    clearTimeout(debounceTimer);
    if (!val.trim()) {
      closeDropdown();
      return;
    }
    debounceTimer = setTimeout(() => {
      fetchSuggestions(val);
    }, 120);
  });

  input.addEventListener('focus', () => {
    if (input.value.trim().length >= 1) {
      fetchSuggestions(input.value);
    }
  });

  input.addEventListener('keydown', (e) => {
    if (dropdown.classList.contains('hidden') || currentSuggestions.length === 0) {
      if (e.key === 'Enter') {
        const raw = input.value.trim().toUpperCase();
        if (raw) {
          closeDropdown();
          selectStock({ symbol: raw, name: raw });
        }
      }
      return;
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      activeIndex = (activeIndex + 1) % currentSuggestions.length;
      highlightActive();
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      activeIndex = (activeIndex - 1 + currentSuggestions.length) % currentSuggestions.length;
      highlightActive();
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (activeIndex >= 0 && activeIndex < currentSuggestions.length) {
        const chosen = currentSuggestions[activeIndex];
        input.value = chosen.symbol;
        closeDropdown();
        selectStock({ symbol: chosen.symbol, name: chosen.name });
      } else {
        const raw = input.value.trim().toUpperCase();
        if (raw) {
          closeDropdown();
          selectStock({ symbol: raw, name: raw });
        }
      }
    } else if (e.key === 'Escape') {
      closeDropdown();
    }
  });

  if (btnSearch) {
    btnSearch.addEventListener('click', () => {
      const raw = input.value.trim().toUpperCase();
      if (raw) {
        closeDropdown();
        selectStock({ symbol: raw, name: raw });
      }
    });
  }

  document.addEventListener('click', (e) => {
    if (!document.getElementById('manual-search-wrapper')?.contains(e.target)) {
      closeDropdown();
    }
  });
}

function updatePivotLines() {
  const { candles } = state.charts.series;
  if (!candles) return;

  if (state.charts.pivotLines && state.charts.pivotLines.length > 0) {
    state.charts.pivotLines.forEach(line => {
      try { candles.removePriceLine(line); } catch (e) {}
    });
    state.charts.pivotLines = [];
  }

  if (!state.toggles.pivots || !state.currentStockData?.pivotPoints) return;

  const { p, r1, s1 } = state.currentStockData.pivotPoints;
  const pWidth = Number(state.lineWidths?.pivots || 1.2);

  state.charts.pivotLines = [
    candles.createPriceLine({ price: p, color: '#06b6d4', lineWidth: pWidth, lineStyle: 2, axisLabelVisible: true, title: `P ${p}` }),
    candles.createPriceLine({ price: r1, color: '#f97316', lineWidth: pWidth, lineStyle: 2, axisLabelVisible: true, title: `R1 ${r1}` }),
    candles.createPriceLine({ price: s1, color: '#10b981', lineWidth: pWidth, lineStyle: 2, axisLabelVisible: true, title: `S1 ${s1}` })
  ];
}

function calculateAnchoredVwap(candles, anchorTime) {
  if (!Array.isArray(candles) || candles.length === 0 || !anchorTime) return [];

  const startIndex = candles.findIndex(c => {
    if (typeof c.time === 'number' && typeof anchorTime === 'number') return c.time >= anchorTime;
    if (typeof c.time === 'string' && typeof anchorTime === 'string') return c.time >= anchorTime;
    if (typeof c.time === 'object' && typeof anchorTime === 'object') {
      return (c.time.year > anchorTime.year) ||
             (c.time.year === anchorTime.year && c.time.month > anchorTime.month) ||
             (c.time.year === anchorTime.year && c.time.month === anchorTime.month && c.time.day >= anchorTime.day);
    }
    return String(c.time) >= String(anchorTime);
  });

  if (startIndex === -1) return [];

  let cumVolume = 0;
  let cumVolPrice = 0;
  const result = [];

  for (let i = startIndex; i < candles.length; i++) {
    const c = candles[i];
    const typicalPrice = (c.high + c.low + c.close) / 3;
    const vol = (typeof c.volume === 'number' && c.volume > 0) ? c.volume : 1000;
    cumVolume += vol;
    cumVolPrice += (typicalPrice * vol);
    const vwapVal = cumVolume > 0 ? Number((cumVolPrice / cumVolume).toFixed(2)) : c.close;
    result.push({ time: c.time, value: vwapVal });
  }

  return result;
}

let saveDrawingsTimeout = null;
function saveDrawingsToServer() {
  if (!state.token && !state.user) return;
  if (saveDrawingsTimeout) clearTimeout(saveDrawingsTimeout);
  saveDrawingsTimeout = setTimeout(async () => {
    try {
      await fetch('/api/user/drawings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders()
        },
        body: JSON.stringify({ drawings: state.drawings || {} })
      });
    } catch (e) {}
  }, 400);
}

function handleChartClick(param) {
  const currentSymbol = state.selectedStock?.symbol;
  if (!currentSymbol || !state.currentStockData?.candles) return;

  if (!state.drawings[currentSymbol]) {
    state.drawings[currentSymbol] = { avwaps: [], hlines: [] };
  }
  if (!Array.isArray(state.drawings[currentSymbol].avwaps)) {
    state.drawings[currentSymbol].avwaps = [];
  }
  if (!Array.isArray(state.drawings[currentSymbol].hlines)) {
    state.drawings[currentSymbol].hlines = [];
  }

  if (state.activeDrawingTool === 'avwap') {
    if (!param.time) return;
    const anchorTime = param.time;
    
    const exists = state.drawings[currentSymbol].avwaps.some(t => {
      if (typeof t === 'object' && typeof anchorTime === 'object') {
        return t.year === anchorTime.year && t.month === anchorTime.month && t.day === anchorTime.day;
      }
      return String(t) === String(anchorTime);
    });

    if (!exists) {
      state.drawings[currentSymbol].avwaps.push(anchorTime);
    }

    renderPersistedDrawings();
    saveDrawingsToServer();
    
    let dateStr = anchorTime;
    if (typeof anchorTime === 'number') {
      const d = new Date(anchorTime * 1000);
      dateStr = d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
    } else if (typeof anchorTime === 'object' && anchorTime.year) {
      dateStr = `${anchorTime.day}/${anchorTime.month}/${anchorTime.year}`;
    }
    showToast(`⚓ Anchored VWAP added from ${dateStr}!`, 'success');
    state.activeDrawingTool = null;
    updateAvwapWidgetUI();
    return;
  }

  if (!state.activeDrawingTool && param.point && state.charts.series?.candles) {
    const { candles } = state.charts.series;

    if (param.time && state.drawings[currentSymbol].avwaps.length > 0) {
      const avwaps = state.drawings[currentSymbol].avwaps;
      for (let i = avwaps.length - 1; i >= 0; i--) {
        const anchorTime = avwaps[i];
        const avwapData = calculateAnchoredVwap(state.currentStockData.candles, anchorTime);
        const matchPt = avwapData.find(d => {
          if (typeof d.time === 'object' && typeof param.time === 'object') {
            return d.time.year === param.time.year && d.time.month === param.time.month && d.time.day === param.time.day;
          }
          return String(d.time) === String(param.time);
        });

        if (matchPt && typeof matchPt.value === 'number') {
          const lineY = candles.priceToCoordinate(matchPt.value);
          if (lineY !== null && Math.abs(param.point.y - lineY) <= 14) {
            const removedAnchor = avwaps.splice(i, 1)[0];
            renderPersistedDrawings();
            saveDrawingsToServer();
            
            let dateStr = removedAnchor;
            if (typeof removedAnchor === 'number') {
              const d = new Date(removedAnchor * 1000);
              dateStr = d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
            } else if (typeof removedAnchor === 'object' && removedAnchor.year) {
              dateStr = `${removedAnchor.day}/${removedAnchor.month}/${removedAnchor.year}`;
            }
            showToast(`🗑️ Anchored VWAP from ${dateStr} deleted`, 'info');
            return;
          }
        }
      }
    }

    if (state.drawings[currentSymbol].hlines.length > 0) {
      const hlines = state.drawings[currentSymbol].hlines;
      for (let i = hlines.length - 1; i >= 0; i--) {
        const price = hlines[i];
        const lineY = candles.priceToCoordinate(price);
        if (lineY !== null && Math.abs(param.point.y - lineY) <= 10) {
          hlines.splice(i, 1);
          renderPersistedDrawings();
          saveDrawingsToServer();
          showToast(`🗑️ Horizontal Line at ₹${price.toLocaleString('en-IN')} deleted`, 'info');
          return;
        }
      }
    }
  }
}

function handleAltHShortcut() {
  const currentSymbol = state.selectedStock?.symbol;
  if (!currentSymbol || !state.charts.series.candles) return;

  const price = state.lastCrosshairPrice || state.currentStockData?.ltp;
  if (!price || isNaN(price)) {
    showToast('Hover over chart to position Horizontal Line', 'info');
    return;
  }

  if (!state.drawings[currentSymbol]) {
    state.drawings[currentSymbol] = { avwaps: [], hlines: [] };
  }
  if (!state.drawings[currentSymbol].hlines) {
    state.drawings[currentSymbol].hlines = [];
  }

  state.drawings[currentSymbol].hlines.push(price);
  renderPersistedDrawings();
  saveDrawingsToServer();
  showToast(`─ Horizontal Line placed at ₹${price.toLocaleString('en-IN')}`, 'success');
}

function toggleAvwapAnchorMode() {
  state.activeDrawingTool = (state.activeDrawingTool === 'avwap') ? null : 'avwap';
  updateAvwapWidgetUI();
  if (state.activeDrawingTool === 'avwap') {
    showToast('Click on any candle to anchor VWAP', 'info');
  }
}

function updateAvwapWidgetUI() {
  const currentSymbol = state.selectedStock?.symbol;
  const stockDrawings = (currentSymbol && state.drawings[currentSymbol]) ? state.drawings[currentSymbol] : { avwaps: [], hlines: [] };
  const avwapCount = (stockDrawings.avwaps && Array.isArray(stockDrawings.avwaps)) ? stockDrawings.avwaps.length : 0;

  const btnFloatingAvwap = document.getElementById('btn-floating-avwap');
  const floatingAvwapDivider = document.getElementById('floating-avwap-divider');
  const floatingAvwapStatus = document.getElementById('floating-avwap-status');
  const btnFloatingAvwapClear = document.getElementById('btn-floating-avwap-clear');

  if (state.activeDrawingTool === 'avwap') {
    if (btnFloatingAvwap) btnFloatingAvwap.classList.add('text-purple-400', 'animate-pulse');
  } else {
    if (btnFloatingAvwap) btnFloatingAvwap.classList.remove('text-purple-400', 'animate-pulse');
  }

  if (avwapCount > 0) {
    let anchorText = '';
    if (avwapCount === 1) {
      const firstAnchor = stockDrawings.avwaps[0];
      if (typeof firstAnchor === 'number') {
        const d = new Date(firstAnchor * 1000);
        anchorText = d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
      } else if (typeof firstAnchor === 'object' && firstAnchor.year) {
        anchorText = `${firstAnchor.day}/${firstAnchor.month}`;
      } else {
        anchorText = String(firstAnchor);
      }
    } else {
      anchorText = `(${avwapCount})`;
    }

    if (floatingAvwapDivider) floatingAvwapDivider.classList.remove('hidden');
    if (floatingAvwapStatus) {
      floatingAvwapStatus.classList.remove('hidden');
      floatingAvwapStatus.textContent = anchorText;
      floatingAvwapStatus.title = avwapCount > 1 ? `${avwapCount} Anchored VWAPs plotted` : `Anchored from ${anchorText}`;
    }
    if (btnFloatingAvwapClear) {
      btnFloatingAvwapClear.classList.remove('hidden');
      btnFloatingAvwapClear.title = avwapCount > 1 ? `Clear all ${avwapCount} Anchored VWAPs` : 'Remove Anchored VWAP';
    }
  } else {
    if (floatingAvwapDivider) floatingAvwapDivider.classList.add('hidden');
    if (floatingAvwapStatus) floatingAvwapStatus.classList.add('hidden');
    if (btnFloatingAvwapClear) btnFloatingAvwapClear.classList.add('hidden');
  }

  if (typeof lucide !== 'undefined') {
    try { lucide.createIcons(); } catch (e) {}
  }
}

function clearStockAvwaps() {
  const currentSymbol = state.selectedStock?.symbol;
  if (currentSymbol && state.drawings[currentSymbol]) {
    state.drawings[currentSymbol].avwaps = [];
  }
  renderPersistedDrawings();
  saveDrawingsToServer();
  updateAvwapWidgetUI();
  showToast('All Anchored VWAPs removed', 'info');
}

function renderPersistedDrawings() {
  const currentSymbol = state.selectedStock?.symbol;
  const { candles } = state.charts.series;
  if (!candles || !state.currentStockData?.candles || !state.charts.main) return;

  if (state.activeDrawingSeries.avwaps && state.activeDrawingSeries.avwaps.length > 0) {
    state.activeDrawingSeries.avwaps.forEach(series => {
      try { state.charts.main.removeSeries(series); } catch (e) {}
    });
    state.activeDrawingSeries.avwaps = [];
  }

  if (state.activeDrawingSeries.hlines && state.activeDrawingSeries.hlines.length > 0) {
    state.activeDrawingSeries.hlines.forEach(line => {
      try { candles.removePriceLine(line); } catch (e) {}
    });
    state.activeDrawingSeries.hlines = [];
  }

  const stockDrawings = state.drawings[currentSymbol] || { avwaps: [], hlines: [] };
  const avwapColors = ['#a855f7', '#ec4899', '#06b6d4', '#10b981', '#f59e0b'];

  (stockDrawings.avwaps || []).forEach((anchorTime, idx) => {
    const avwapData = calculateAnchoredVwap(state.currentStockData.candles, anchorTime);
    if (avwapData.length > 0) {
      const color = state.colors.avwap || avwapColors[idx % avwapColors.length];
      const avSeries = state.charts.main.addLineSeries({
        color: color,
        lineWidth: Number(state.lineWidths?.avwap || 2),
        title: '',
        priceLineVisible: false,
        lastValueVisible: false,
        crosshairMarkerVisible: false
      });
      avSeries.setData(avwapData);
      state.activeDrawingSeries.avwaps.push(avSeries);
    }
  });

  (stockDrawings.hlines || []).forEach(price => {
    const pLine = candles.createPriceLine({
      price: price,
      color: '#f59e0b',
      lineWidth: 1.5,
      lineStyle: 2,
      axisLabelVisible: true,
      title: `H ${price}`
    });
    state.activeDrawingSeries.hlines.push(pLine);
  });

  updateAvwapWidgetUI();
}

function cancelActiveDrawingTool() {
  state.activeDrawingTool = null;
  updateAvwapWidgetUI();
}

function adjustStockInputWidth() {
  const input = document.getElementById('manual-stock-input');
  if (!input) return;
  const val = (input.value || '').trim();
  const len = Math.max(val.length + 3, 11);
  const clamped = Math.min(len, 32);
  input.style.width = `${clamped}ch`;
}

function getActiveModalStocksList() {
  if (state.activeModalStockList && state.activeModalStockList.length > 0) {
    return state.activeModalStockList;
  }
  if (state.filteredStocks && state.filteredStocks.length > 0) {
    return state.filteredStocks;
  }
  return state.rawStocks || [];
}

function navigateStock(direction) {
  const list = getActiveModalStocksList();
  if (!list || list.length === 0) {
    showToast('No stocks in current list to navigate', 'warning');
    return;
  }

  const currentSym = state.selectedStock?.symbol;
  const currentIndex = list.findIndex(s => s.symbol === currentSym);

  let targetIndex = 0;
  if (direction > 0) {
    targetIndex = currentIndex === -1 ? 0 : (currentIndex + 1 >= list.length ? 0 : currentIndex + 1);
  } else {
    targetIndex = currentIndex === -1 ? 0 : (currentIndex - 1 < 0 ? list.length - 1 : currentIndex - 1);
  }

  if (targetIndex >= 0 && targetIndex < list.length) {
    const nextStock = list[targetIndex];
    selectStock(nextStock);
  }
}

function setupKeyboardNavigation() {
  window.addEventListener('keydown', (e) => {
    const modal = document.getElementById('stock-chart-modal');
    if (!modal || modal.classList.contains('hidden')) return;

    const tag = document.activeElement?.tagName?.toLowerCase();
    if (tag === 'input' || tag === 'textarea' || tag === 'select') {
      if (e.key === 'Escape') {
        document.activeElement.blur();
        cancelActiveDrawingTool();
      }
      return;
    }

    if (e.key === 'Escape') {
      if (state.activeDrawingTool) {
        cancelActiveDrawingTool();
      } else {
        closeStockChartModal();
      }
      return;
    }

    if (e.altKey && (e.key === 'h' || e.key === 'H')) {
      e.preventDefault();
      handleAltHShortcut();
      return;
    }

    if (e.key === 'ArrowDown' || e.key === 'j') {
      e.preventDefault();
      navigateStock(1);
    } else if (e.key === 'ArrowUp' || e.key === 'k') {
      e.preventDefault();
      navigateStock(-1);
    }
  });
}

function updateDefaultLegend() {
  const legend = document.getElementById('chart-ohlcv-legend');
  if (!legend) return;
  if (!state.currentStockData || !state.currentStockData.candles) {
    legend.innerHTML = '<span>Select a stock to view candlestick chart</span>';
    return;
  }
  const last = state.currentStockData.candles[state.currentStockData.candles.length - 1];
  if (last) {
    const isUp = last.close >= last.open;
    const chgColor = isUp ? 'text-emerald-400' : 'text-rose-400';
    
    let formattedTime = last.time;
    if (typeof last.time === 'number') {
      const d = new Date(last.time * 1000);
      formattedTime = `${d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })} ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    }

    legend.innerHTML = `
      <span class="text-slate-400 font-semibold">${formattedTime}</span>
      <span>O: <strong class="text-slate-200">${last.open?.toFixed(2)}</strong></span>
      <span>H: <strong class="text-slate-200">${last.high?.toFixed(2)}</strong></span>
      <span>L: <strong class="text-slate-200">${last.low?.toFixed(2)}</strong></span>
      <span>C: <strong class="${chgColor}">${last.close?.toFixed(2)}</strong></span>
      <span>Vol: <strong class="text-slate-300">${fmt.volume(last.volume)}</strong></span>
      ${state.currentStockData.latestVWAP ? `<span>VWAP: <strong class="text-yellow-400">₹${state.currentStockData.latestVWAP}</strong></span>` : ''}
      <span>RSI: <strong class="text-purple-400">${state.currentStockData.latestRSI || '--'}</strong></span>
      ${state.currentStockData.latestRsiSMA ? `<span>RSI-SMA: <strong class="text-amber-400">${state.currentStockData.latestRsiSMA}</strong></span>` : ''}
    `;

    const volBadge = document.getElementById('vol-live-badge');
    const volAvgBadge = document.getElementById('vol-avg-live-badge');
    const rsiBadge = document.getElementById('rsi-live-badge');
    const rsiSmaBadge = document.getElementById('rsi-sma-live-badge');

    if (volBadge) volBadge.textContent = fmt.volume(last.volume);
    const lastVolAvg = state.currentStockData.volAvg9?.[state.currentStockData.volAvg9.length - 1]?.value;
    if (volAvgBadge) volAvgBadge.textContent = lastVolAvg ? fmt.volume(lastVolAvg) : '--';
    if (rsiBadge) rsiBadge.textContent = state.currentStockData.latestRSI || '--';
    if (rsiSmaBadge) rsiSmaBadge.textContent = state.currentStockData.latestRsiSMA || '--';
  }
}

async function loadStockChart(rawSymbol) {
  if (!rawSymbol) return;
  const cleanSymbol = rawSymbol.trim().toUpperCase();

  const loadingOverlay = document.getElementById('chart-loading-overlay');
  if (loadingOverlay) {
    loadingOverlay.classList.remove('hidden');
    loadingOverlay.classList.add('flex');
  }

  try {
    const res = await fetch(`/api/stocks/${encodeURIComponent(cleanSymbol)}/history?interval=${state.activeInterval}&range=${state.activeRange}`);
    const data = await res.json();

    if (!res.ok || !data.success) {
      throw new Error(data.error || 'Historical data not available for this stock');
    }

    state.currentStockData = data;

    const elAvatar = document.getElementById('chart-symbol-avatar');
    const elManualInput = document.getElementById('manual-stock-input');
    const elOnchartSym = document.getElementById('onchart-stock-symbol');
    const elStockLtp = document.getElementById('chart-stock-ltp');
    const elStockExchange = document.getElementById('chart-stock-exchange');
    const elStockChange = document.getElementById('chart-stock-change');
    const elStockName = document.getElementById('chart-stock-name');
    const elLinkTv = document.getElementById('link-tradingview');
    const elLinkCi = document.getElementById('link-chartink');

    if (elAvatar) elAvatar.textContent = cleanSymbol.substring(0, 3);
    if (elManualInput) elManualInput.value = cleanSymbol;
    if (elOnchartSym) elOnchartSym.textContent = cleanSymbol;
    if (elStockLtp) elStockLtp.textContent = fmt.currency(data.ltp);
    if (elStockExchange) {
      elStockExchange.innerHTML = `${data.exchange || 'NSE'}${getFnoBadgeHtml(cleanSymbol, 'ml-1')}`;
    }
    
    if (elStockChange) {
      const isBull = (data.changePercent || 0) >= 0;
      elStockChange.className = `px-2 py-0.5 text-xs font-semibold rounded-md ${
        isBull ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
      }`;
      elStockChange.textContent = fmt.percent(data.changePercent);
    }

    if (elLinkTv) elLinkTv.href = `https://in.tradingview.com/chart/?symbol=${data.exchange || 'NSE'}:${cleanSymbol}`;
    if (elLinkCi) elLinkCi.href = `https://chartink.com/stocks/${cleanSymbol.toLowerCase()}.html`;

    const el52wHigh = document.getElementById('val-52w-high');
    const elAth = document.getElementById('val-ath');
    if (el52wHigh) {
      const dist52w = data.pctFrom52wHigh !== undefined ? ` (${data.pctFrom52wHigh >= 0 ? '+' : ''}${data.pctFrom52wHigh}%)` : '';
      el52wHigh.textContent = data.high52w ? `₹${data.high52w.toLocaleString('en-IN')}${dist52w}` : '--';
    }
    if (elAth) {
      const distAth = data.pctFromAth !== undefined ? ` (${data.pctFromAth >= 0 ? '+' : ''}${data.pctFromAth}%)` : '';
      elAth.textContent = data.allTimeHigh ? `₹${data.allTimeHigh.toLocaleString('en-IN')}${distAth}` : '--';
    }
    if (elStockName) elStockName.textContent = data.name || cleanSymbol;

    updateTimeScalesVisibility();

    if (state.charts.series.candles && data.candles) {
      state.charts.series.candles.setData(data.candles);
    }
    if (state.charts.series.ema10 && data.ema10) state.charts.series.ema10.setData(data.ema10);
    if (state.charts.series.ema20 && data.ema20) state.charts.series.ema20.setData(data.ema20);
    if (state.charts.series.ema50 && data.ema50) state.charts.series.ema50.setData(data.ema50);
    if (state.charts.series.ema150 && data.ema150) state.charts.series.ema150.setData(data.ema150);
    if (state.charts.series.ema200 && data.ema200) state.charts.series.ema200.setData(data.ema200);
    if (state.charts.series.vwap && data.vwapSeries) state.charts.series.vwap.setData(data.vwapSeries);

    if (state.charts.series.darvasTop && data.darvasBox?.topBox) {
      state.charts.series.darvasTop.setData(data.darvasBox.topBox);
    }
    if (state.charts.series.darvasBottom && data.darvasBox?.bottomBox) {
      state.charts.series.darvasBottom.setData(data.darvasBox.bottomBox);
    }

    updatePivotLines();

    if (state.charts.series.volume && data.volumeSeries) {
      state.charts.series.volume.setData(data.volumeSeries);
    }
    if (state.charts.series.volAvg && data.volAvg9) {
      state.charts.series.volAvg.setData(data.volAvg9);
    }

    const rsiBadge = document.getElementById('rsi-live-badge');
    const rsiSmaBadge = document.getElementById('rsi-sma-live-badge');

    if (state.charts.series.rsi && data.rsi14) {
      state.charts.series.rsi.setData(data.rsi14);
      if (rsiBadge) rsiBadge.textContent = data.latestRSI || '--';
    }
    if (state.charts.series.rsiSma && data.rsiSma14) {
      state.charts.series.rsiSma.setData(data.rsiSma14);
      if (rsiSmaBadge) rsiSmaBadge.textContent = data.latestRsiSMA || '--';
    }

    renderPersistedDrawings();
    applyActiveRangeZoom();
    syncChartPriceScales();
    setTimeout(syncChartPriceScales, 50);

    if (elManualInput) {
      elManualInput.value = cleanSymbol;
      adjustStockInputWidth();
    }
    
    updateDefaultVolumeBadges();
    pollActiveStockLiveQuote();

  } catch (err) {
    showToast(`Chart error for ${cleanSymbol}: ${err.message}`, 'error');
  } finally {
    if (loadingOverlay) {
      loadingOverlay.classList.remove('flex');
      loadingOverlay.classList.add('hidden');
    }
  }
}

function startActiveChartLiveTicker() {
  if (activeChartTickerInterval) clearInterval(activeChartTickerInterval);
  activeChartTickerInterval = setInterval(() => {
    pollActiveStockLiveQuote();
  }, 4000);
}

async function pollActiveStockLiveQuote() {
  const sym = state.selectedStock?.symbol;
  if (!sym || !state.currentStockData?.candles) return;

  try {
    const cleanSym = sym.toUpperCase().replace(/\.(NS|BO)$/, '');
    const res = await fetch(`/api/fno/live-quotes?symbols=${encodeURIComponent(cleanSym)}`);
    const data = await res.json();
    const q = data.quotes?.[cleanSym];
    if (!q || !q.price) return;

    const oldPrice = state.currentStockData.ltp;
    const newPrice = q.price;
    const newChange = q.changePercent != null ? q.changePercent : state.currentStockData.changePercent;

    state.currentStockData.ltp = newPrice;
    state.currentStockData.changePercent = newChange;

    const elStockLtp = document.getElementById('chart-stock-ltp');
    const elStockChange = document.getElementById('chart-stock-change');

    if (elStockLtp) {
      elStockLtp.textContent = fmt.currency(newPrice);
      if (oldPrice && oldPrice !== newPrice) {
        const isUp = newPrice > oldPrice;
        elStockLtp.style.color = isUp ? '#10b981' : '#ef4444';
        setTimeout(() => { if (elStockLtp) elStockLtp.style.color = ''; }, 1200);
      }
    }

    if (elStockChange) {
      const isBull = newChange >= 0;
      elStockChange.className = `px-2 py-0.5 text-xs font-semibold rounded-md ${
        isBull ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
      }`;
      elStockChange.textContent = fmt.percent(newChange);
    }

    const candles = state.currentStockData.candles;
    if (candles && candles.length > 0 && state.charts.series.candles) {
      const lastC = { ...candles[candles.length - 1] };
      lastC.close = newPrice;
      lastC.high = Math.max(lastC.high, newPrice);
      lastC.low = Math.min(lastC.low, newPrice);
      if (q.volume) lastC.volume = Math.max(lastC.volume || 0, q.volume);
      candles[candles.length - 1] = lastC;
      try {
        state.charts.series.candles.update(lastC);
      } catch (e) {}
    }

    updateDefaultLegend();
  } catch (err) {}
}

function selectStock(stockOrSymbol, name = '') {
  const sym = typeof stockOrSymbol === 'object' ? stockOrSymbol.symbol : stockOrSymbol;
  const cName = typeof stockOrSymbol === 'object' ? (stockOrSymbol.name || '') : name;
  if (!sym) return;

  state.selectedStock = { symbol: sym, name: cName || sym };
  const input = document.getElementById('manual-stock-input');
  if (input) {
    input.value = sym;
    adjustStockInputWidth();
  }
  const nameEl = document.getElementById('chart-stock-name');
  if (nameEl) nameEl.textContent = cName || sym;
  loadStockChart(sym);
  renderChartWatchlistDropdown(sym);
}

function openStockChartModal(symbol, name, stockList) {
  if (!symbol) return;
  const cleanSym = symbol.trim().toUpperCase();

  if (Array.isArray(stockList) && stockList.length > 0) {
    state.activeModalStockList = stockList;
  } else {
    state.activeModalStockList = state.filteredStocks || [];
  }

  const modal = document.getElementById('stock-chart-modal');
  if (modal) {
    modal.classList.remove('hidden');
    modal.classList.add('flex');
    document.body.style.overflow = 'hidden';
  }

  if (!state.charts.main) {
    initNativeCharts();
    initIndicatorToggles();
    initChartControls();
  }

  restoreChartModalSize();

  state.selectedStock = { symbol: cleanSym, name: name || cleanSym };
  loadStockChart(cleanSym);
  renderChartWatchlistDropdown(cleanSym);

  setTimeout(() => {
    handleResize();
    applyActiveRangeZoom();
  }, 50);

  startActiveChartLiveTicker();
}

function closeStockChartModal() {
  const modal = document.getElementById('stock-chart-modal');
  if (modal) {
    modal.classList.add('hidden');
    modal.classList.remove('flex');
    document.body.style.overflow = '';
  }
  if (activeChartTickerInterval) {
    clearInterval(activeChartTickerInterval);
    activeChartTickerInterval = null;
  }
}

function renderChartWatchlistDropdown(symbol) {
  const checklist = document.getElementById('chart-watchlist-checklist');
  const toggleBtn = document.getElementById('btn-chart-watchlist-toggle');

  if (symbol && toggleBtn) {
    const isSaved = (state.watchlists || []).some(wl => (wl.stocks || []).some(s => (typeof s === 'string' ? s : s.symbol) === symbol));
    if (isSaved) {
      toggleBtn.className = 'px-2.5 py-1 rounded-lg bg-amber-500 text-black border border-amber-400 shadow-sm transition-all cursor-pointer select-none flex items-center gap-1.5 font-sans font-semibold text-[11px]';
      toggleBtn.innerHTML = `<i data-lucide="star" class="w-3.5 h-3.5 fill-black text-black"></i><span>Watchlist</span>`;
      toggleBtn.title = `${symbol} is saved in your watchlist (Click to manage)`;
    } else {
      toggleBtn.className = 'px-2.5 py-1 rounded-lg bg-amber-500/15 hover:bg-amber-500 text-amber-400 hover:text-black border border-amber-500/30 shadow-sm transition-all cursor-pointer select-none flex items-center gap-1.5 font-sans font-semibold text-[11px]';
      toggleBtn.innerHTML = `<i data-lucide="star" class="w-3.5 h-3.5 fill-none text-amber-400"></i><span>Watchlist</span>`;
      toggleBtn.title = `Add ${symbol} to watchlist`;
    }
    lucide.createIcons();
  }

  if (!checklist) return;

  checklist.innerHTML = '';
  if (!state.user && !state.isAdmin) {
    checklist.innerHTML = `
      <div class="p-2.5 text-center text-slate-500 text-[11px]">
        Please <button onclick="openAuthModal('login')" class="text-purple-400 font-semibold underline">login</button> to manage watchlists.
      </div>
    `;
    return;
  }

  (state.watchlists || []).forEach(wl => {
    const hasStock = (wl.stocks || []).some(s => (typeof s === 'string' ? s : s.symbol) === symbol);
    const label = document.createElement('label');
    label.className = 'flex items-center justify-between p-2 rounded-lg hover:bg-dark-accent/40 cursor-pointer select-none text-slate-300 transition-colors';
    label.innerHTML = `
      <div class="flex items-center gap-2">
        <input type="checkbox" class="rounded border-slate-700 text-amber-400 focus:ring-0 bg-dark-bg" ${hasStock ? 'checked' : ''}>
        <span class="font-medium text-xs">${wl.name}</span>
      </div>
      <span class="text-[10px] text-slate-500 font-mono">${(wl.stocks || []).length}/50</span>
    `;

    const chk = label.querySelector('input');
    chk.addEventListener('change', async (e) => {
      e.stopPropagation();
      const adding = chk.checked;
      try {
        if (adding) {
          const res = await fetch(`/api/watchlists/${wl.id}/stocks`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
            body: JSON.stringify({ symbol })
          });
          const d = await res.json();
          if (!res.ok || !d.success) throw new Error(d.error || 'Failed to add');
          showToast(`Added ${symbol} to "${wl.name}"`, 'success');
        } else {
          const res = await fetch(`/api/watchlists/${wl.id}/stocks/${symbol}`, {
            method: 'DELETE',
            headers: getAuthHeaders()
          });
          const d = await res.json();
          if (!res.ok || !d.success) throw new Error(d.error || 'Failed to remove');
          showToast(`Removed ${symbol} from "${wl.name}"`, 'info');
        }
        if (typeof loadUserWatchlists === 'function') await loadUserWatchlists();
        renderChartWatchlistDropdown(symbol);
        renderTable();
      } catch (err) {
        chk.checked = !adding;
        showToast(err.message, 'error');
      }
    });

    checklist.appendChild(label);
  });
}

function toggleChartWatchlistDropdown() {
  const menu = document.getElementById('chart-watchlist-menu');
  if (menu) menu.classList.toggle('hidden');
}

function initIndicatorToggles() {
  const toggleMap = [
    { id: 'chk-ema10', key: 'ema10', series: 'ema10' },
    { id: 'chk-ema20', key: 'ema20', series: 'ema20' },
    { id: 'chk-ema50', key: 'ema50', series: 'ema50' },
    { id: 'chk-ema150', key: 'ema150', series: 'ema150' },
    { id: 'chk-ema200', key: 'ema200', series: 'ema200' },
    { id: 'chk-vwap', key: 'vwap', series: 'vwap' },
    { id: 'chk-darvas', key: 'darvas', series: ['darvasTop', 'darvasBottom'] },
    { id: 'chk-vol', key: 'vol', series: 'volume' },
    { id: 'chk-vol-avg', key: 'volAvg', series: 'volAvg' },
    { id: 'chk-rsi', key: 'rsi', custom: (checked) => {
      const rsiCont = document.getElementById('tv_rsi_container');
      const rsiResizer = document.getElementById('resizer-price-rsi');
      const rsiBottomResizer = document.getElementById('resizer-rsi-bottom');
      if (rsiCont) rsiCont.style.display = checked ? '' : 'none';
      if (rsiResizer) rsiResizer.style.display = checked ? '' : 'none';
      if (rsiBottomResizer) rsiBottomResizer.style.display = checked ? '' : 'none';
      updateTimeScalesVisibility();
      handleResize();
    }},
    { id: 'chk-pivots', key: 'pivots', custom: () => {
      updatePivotLines();
    }}
  ];

  toggleMap.forEach(({ id, key, series, custom }) => {
    const elChk = document.getElementById(id);
    if (!elChk) return;
    elChk.checked = Boolean(state.toggles[key]);
    elChk.addEventListener('change', () => {
      state.toggles[key] = elChk.checked;
      if (custom) {
        custom(elChk.checked);
      } else if (Array.isArray(series)) {
        series.forEach(s => state.charts.series[s]?.applyOptions({ visible: elChk.checked }));
      } else if (series) {
        state.charts.series[series]?.applyOptions({ visible: elChk.checked });
      }
      saveIndicatorPreferences();
    });
  });

  const selectPivot = document.getElementById('select-pivot-type');
  if (selectPivot) {
    selectPivot.value = state.pivotType || 'Traditional (Auto)';
    selectPivot.addEventListener('change', () => {
      state.pivotType = selectPivot.value;
      updatePivotLines();
      saveIndicatorPreferences();
    });
  }
}

function initChartControls() {
  document.querySelectorAll('[data-range]').forEach(btn => {
    btn.addEventListener('click', () => {
      const r = btn.dataset.range;
      state.activeRange = r;
      document.querySelectorAll('[data-range]').forEach(b => {
        if (b.dataset.range === r) {
          b.className = 'px-2 py-0.5 rounded text-[11px] font-semibold bg-purple-600 text-white shadow-sm transition-all cursor-pointer';
        } else {
          b.className = 'px-2 py-0.5 rounded text-[11px] font-semibold text-slate-400 hover:text-white transition-all cursor-pointer';
        }
      });
      loadStockChart(state.selectedStock?.symbol);
    });
  });

  document.querySelectorAll('[data-interval]').forEach(btn => {
    btn.addEventListener('click', () => {
      const itv = btn.dataset.interval;
      state.activeInterval = itv;
      document.querySelectorAll('[data-interval]').forEach(b => {
        if (b.dataset.interval === itv) {
          b.className = 'px-2.5 py-0.5 rounded text-[11px] font-semibold bg-purple-600 text-white shadow-sm transition-all cursor-pointer';
        } else {
          b.className = 'px-2.5 py-0.5 rounded text-[11px] font-semibold text-slate-400 hover:text-white transition-all cursor-pointer';
        }
      });
      loadStockChart(state.selectedStock?.symbol);
    });
  });

  document.getElementById('select-chart-theme')?.addEventListener('change', (e) => {
    handleChartThemeChange(e.target.value);
  });

  document.getElementById('btn-nav-prev-stock')?.addEventListener('click', () => navigateStock(-1));
  document.getElementById('btn-nav-next-stock')?.addEventListener('click', () => navigateStock(1));

  setupPredictiveSearch();
  setupPaneResizers();
  initChartModalResizer();
  restoreChartModalSize();
  setupKeyboardNavigation();

  document.getElementById('btn-chart-watchlist-toggle')?.addEventListener('click', (e) => {
    e.stopPropagation();
    toggleChartWatchlistDropdown();
  });

  document.addEventListener('click', (e) => {
    const menu = document.getElementById('chart-watchlist-menu');
    const toggleBtn = document.getElementById('btn-chart-watchlist-toggle');
    if (menu && !menu.classList.contains('hidden') && !menu.contains(e.target) && !toggleBtn?.contains(e.target)) {
      menu.classList.add('hidden');
    }
  });

  document.getElementById('btn-close-chart-modal')?.addEventListener('click', closeStockChartModal);
  
  document.getElementById('stock-chart-modal')?.addEventListener('click', (e) => {
    if (e.target === document.getElementById('stock-chart-modal')) {
      closeStockChartModal();
    }
  });

  window.addEventListener('resize', handleResize);
}

// Window Global Exports
window.openStockChartModal = openStockChartModal;
window.closeStockChartModal = closeStockChartModal;
window.setChartModalSizePreset = setChartModalSizePreset;
window.toggleChartModalMaximize = toggleChartModalMaximize;
window.restoreChartModalSize = restoreChartModalSize;
window.selectStock = selectStock;
window.navigateStock = navigateStock;
window.handleChartThemeChange = handleChartThemeChange;
window.handleModalThemeChange = handleModalThemeChange;
window.handleCustomColorChange = handleCustomColorChange;
window.openLineSettingsModal = openLineSettingsModal;
window.closeLineSettingsModal = closeLineSettingsModal;
window.updateLineStyle = updateLineStyle;
window.resetLineStylesToDefaults = resetLineStylesToDefaults;
window.toggleAvwapAnchorMode = toggleAvwapAnchorMode;
window.clearStockAvwaps = clearStockAvwaps;
window.toggleChartWatchlistDropdown = toggleChartWatchlistDropdown;
window.handleFilterChange = handleFilterChange;
window.toggleMoreFiltersDrawer = toggleMoreFiltersDrawer;
window.resetAllFilters = resetAllFilters;
window.handleSort = handleSort;
window.toggleWatchlist = toggleWatchlist;
window.goToPage = goToPage;
window.handleRowsPerPageChange = handleRowsPerPageChange;
window.toggleSectorDropdown = toggleSectorDropdown;
window.toggleIndustryDropdown = toggleIndustryDropdown;
window.toggleColumnMenu = toggleColumnMenu;
window.handleSectorCheckboxChange = handleSectorCheckboxChange;
window.handleIndustryCheckboxChange = handleIndustryCheckboxChange;
window.selectAllSectors = selectAllSectors;
window.clearSectors = clearSectors;
window.selectAllIndustries = selectAllIndustries;
window.clearIndustries = clearIndustries;
window.filterSectorList = filterSectorList;
window.filterIndustryList = filterIndustryList;
window.toggleColumnVisibility = toggleColumnVisibility;
window.resetColumns = resetColumns;
window.exportFnoCsv = exportFnoCsv;
window.openCustomUniverseModal = openCustomUniverseModal;
window.closeCustomUniverseModal = closeCustomUniverseModal;
window.applyCustomUniverse = applyCustomUniverse;
window.resetToFullUniverse = resetToFullUniverse;
window.handleUniverseTextareaInput = handleUniverseTextareaInput;
window.refreshStockData = refreshStockData;
window.initTheme = initTheme;
window.toggleTheme = toggleTheme;

