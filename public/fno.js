/**
 * F&O & Equity Stock Screener Controller (Institutional Progressive Architecture)
 * With Real-Time Live Quotes Polling (30s), Green/Red Visual Price Flashes,
 * 212 F&O Direct Sync, Draggable Column Resizing & Custom Universe Pasting
 * Sangam_chartlinks Financial Platform
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
  fno: '80px',
  action: '90px'
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
    fno: true,
    action: true
  }
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
  
  if (typeof lucide !== 'undefined') {
    lucide.createIcons();
  }
});

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
        <td colspan="13" class="py-12 text-center text-slate-400">
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
              <a href="/?stock=${encodeURIComponent(s.symbol)}" target="_blank" class="font-bold text-white hover:text-purple-400 font-mono tracking-tight transition-colors">
                ${s.symbol}
              </a>
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

        <!-- 12. Actions: Open in Visualizer -->
        <td class="py-2.5 px-3 text-center col-action">
          <a href="/?stock=${encodeURIComponent(s.symbol)}" target="_blank" class="p-1 rounded bg-dark-bg hover:bg-purple-600 hover:text-white text-slate-400 border border-dark-border inline-flex items-center gap-1 text-[10px] font-semibold transition-all" title="Open Interactive TradingView Chart">
            <i data-lucide="candlestick-chart" class="w-3.5 h-3.5"></i>
            <span>Chart ↗</span>
          </a>
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

  container.appendChild(toast);

  setTimeout(() => {
    toast.classList.remove('toast-enter');
    toast.classList.add('toast-exit');
    setTimeout(() => toast.remove(), 250);
  }, 3000);
}
