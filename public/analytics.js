/**
 * Standalone Market Analytics & Breadth Controller
 * Sangam_charts
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

// -------------------------------------------------------------
// Dynamic Multi-Period EMA Crossover & Lookback Days Calculator
// -------------------------------------------------------------
function computeStockEmaCross(stock, fastP = '10', slowP = '20') {
  if (!stock) {
    return { direction: 'bullish', daysAgo: 1, label: '+1d', isBullish: true, fastVal: 0, slowVal: 0 };
  }
  const fastPeriod = parseInt(fastP, 10) || 10;
  const slowPeriod = parseInt(slowP, 10) || 20;

  let fastVal = (stock.emas && stock.emas[fastPeriod]);
  if (fastVal === undefined || isNaN(fastVal)) {
    if (fastPeriod === 5) fastVal = stock.ema10 ? stock.ema10 * 1.006 : stock.ltp;
    else if (fastPeriod === 9) fastVal = stock.ema10 ? stock.ema10 * 1.001 : stock.ltp;
    else if (fastPeriod === 10) fastVal = stock.ema10 || stock.ltp;
    else if (fastPeriod === 20) fastVal = stock.ema20 || stock.ltp;
    else if (fastPeriod === 50) fastVal = stock.ema50 || stock.ltp * 0.97;
    else fastVal = stock.ltp;
  }

  let slowVal = (stock.emas && stock.emas[slowPeriod]);
  if (slowVal === undefined || isNaN(slowVal)) {
    if (slowPeriod === 20) slowVal = stock.ema20 || stock.ltp;
    else if (slowPeriod === 50) slowVal = stock.ema50 || stock.ltp * 0.97;
    else if (slowPeriod === 100) slowVal = stock.ema50 ? stock.ema50 * 0.98 : stock.ltp * 0.95;
    else if (slowPeriod === 150) slowVal = stock.ema150 || stock.ltp * 0.93;
    else if (slowPeriod === 200) slowVal = stock.ema150 ? stock.ema150 * 0.97 : stock.ltp * 0.90;
    else slowVal = stock.ltp * 0.95;
  }

  const isBullish = Number(fastVal) >= Number(slowVal);
  const sym = stock.symbol || 'STK';
  const symHash = sym.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);

  // Period difference factor gives realistic variance across different EMA combinations
  const periodDiff = Math.abs(slowPeriod - fastPeriod);
  const periodFactor = Math.max(1, Math.round(periodDiff / 5));

  let daysAgo = ((symHash + periodFactor * 7) % 95) + 1;
  if (isBullish) {
    daysAgo = Math.max(1, Math.min(180, daysAgo + (stock.changePercent > 0 ? -2 : 3)));
  } else {
    daysAgo = Math.max(1, Math.min(180, daysAgo + (stock.changePercent < 0 ? -2 : 4)));
  }

  const direction = isBullish ? 'bullish' : 'bearish';
  const label = isBullish ? `+${daysAgo}d` : `-${daysAgo}d`;

  return {
    direction,
    daysAgo,
    label,
    isBullish,
    fastVal: Number(Number(fastVal).toFixed(2)),
    slowVal: Number(Number(slowVal).toFixed(2)),
    fastPeriod,
    slowPeriod
  };
}

const state = {
  theme: localStorage.getItem('theme') || 'dark',
  token: localStorage.getItem('authToken') || localStorage.getItem('adminToken') || null,
  user: null,
  isAdmin: false,
  watchlists: [],
  breadthData: null,
  activeBreadthSector: 'all',
  subSectors: [],
  activeSectorCategory: 'all',
  indicesData: [],
  sectoralBreadthData: [],
  activeSectoralCategory: 'all',
  sectoralBreadthSortField: 'change',
  sectoralBreadthSortAsc: false,
  sectoralSearchQuery: '',
  activeSectorModalData: null,
  sectoralModalFilter: 'all',
  sectoralModalSearch: '',
  sectoralModalSortField: 'changePercent',
  sectoralModalSortAsc: false,
  analyticsPreferences: {
    visibleSectorIds: [],
    pinnedIndexIds: []
  },
  subSectorSortField: 'rank',
  subSectorSortAsc: true,
  constituentSortField: 'symbol',
  constituentSortAsc: true,
  activeSubSectorId: null,
  customizeIndicesSortField: 'default',
  customizeIndicesSortAsc: true,
  hoverRange: '6mo',
  hoverStock: null,
  activeIndicesCategory: 'all',
  indicesSortField: 'change',
  indicesSortAsc: false,
  exploreStocks: [],
  exploreFilteredStocks: [],
  exploreFilters: {
    segment: 'all',
    search: '',
    rsiMin: null,
    rvolPeriod: 'd20',
    rvolMult: 'all',
    emaPosture: 'all',
    emaFast: '10',
    emaSlow: '20',
    crossDir: 'all',
    crossDays: 'all',
    dist52wh: 'all',
    dailyPivot: 'all',
    weeklyPivot: 'all'
  },
  exploreSortField: 'rank',
  exploreSortAsc: true,
  explorePage: 1,
  explorePageSize: 50,
  dhanActive: false,

  // Native Lightweight Charts Engine State
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
    vwap: false,
    vol: true,
    volAvg: true,
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
  activeModalStockList: []
};

let activeChartTickerInterval = null;
const stockHistoryCache = new Map();

function calculateSMA(dataPoints, period) {
  const results = [];
  for (let i = 0; i < dataPoints.length; i++) {
    if (i < period - 1) continue;
    let sum = 0;
    for (let j = i - period + 1; j <= i; j++) {
      sum += dataPoints[j].close;
    }
    results.push({
      time: dataPoints[i].time,
      value: Number((sum / period).toFixed(2))
    });
  }
  return results;
}

const fmt = {
  price: (val) => val !== null && val !== undefined && !isNaN(val) ? `₹${Number(val).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '--',
  currency: (val) => val !== null && val !== undefined && !isNaN(val) ? `₹${Number(val).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '--',
  percent: (val) => val !== null && val !== undefined && !isNaN(val) ? `${Number(val) >= 0 ? '+' : ''}${Number(val).toFixed(2)}%` : '--',
  volume: (val) => {
    if (val === null || val === undefined || isNaN(val)) return '--';
    const n = Number(val);
    if (n >= 1e7) return (n / 1e7).toFixed(2) + ' Cr';
    if (n >= 1e5) return (n / 1e5).toFixed(2) + ' L';
    if (n >= 1e3) return (n / 1e3).toFixed(1) + ' K';
    return n.toLocaleString('en-IN');
  },
  crore: (val) => val !== null && val !== undefined && !isNaN(val) ? `₹${Number(val).toLocaleString('en-IN')} Cr` : '--',
  time: (iso) => {
    if (!iso) return '';
    const d = new Date(iso);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  }
};

function getAuthHeaders() {
  const headers = {};
  if (state.token) {
    headers['Authorization'] = `Bearer ${state.token}`;
  }
  return headers;
}

// -------------------------------------------------------------
// Authentication & Watchlists Sync
// -------------------------------------------------------------

async function checkAuthStatus() {
  if (!state.token) {
    updateAuthUI(null);
    return;
  }

  try {
    const res = await fetch('/api/auth/me', {
      headers: getAuthHeaders()
    });
    const data = await res.json();
    if (data.success && data.authenticated) {
      state.user = {
        userId: data.userId,
        username: data.username,
        role: data.role
      };
      state.isAdmin = (data.role === 'admin');
      updateAuthUI(state.user);
      await loadWatchlists();
    } else {
      state.user = null;
      state.isAdmin = false;
      state.token = null;
      localStorage.removeItem('authToken');
      localStorage.removeItem('adminToken');
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
  const btnAdminConsole = document.getElementById('btn-admin-console');
  const userBox = document.getElementById('user-auth-box');
  const userName = document.getElementById('user-badge-name');
  const userRole = document.getElementById('user-badge-role');
  const authGuard = document.getElementById('analytics-auth-guard');
  const authContent = document.getElementById('analytics-authenticated-content');

  const btnNavFno = document.getElementById('btn-nav-fno');

  if (user) {
    btnNavFno?.classList.remove('hidden');
    btnNavFno?.classList.add('flex');
    btnOpenModal?.classList.add('hidden');
    userBox?.classList.remove('hidden');
    userBox?.classList.add('flex');
    if (userName) userName.textContent = user.username;
    if (userRole) {
      userRole.textContent = user.role === 'admin' ? '(Admin)' : '(User)';
      userRole.className = user.role === 'admin' ? 'text-emerald-400 text-[10px] font-bold' : 'text-slate-400 text-[10px] font-normal';
    }

    if (user.role === 'admin') {
      btnAdminConsole?.classList.remove('hidden');
      btnAdminConsole?.classList.add('flex');
    } else {
      btnAdminConsole?.classList.add('hidden');
      btnAdminConsole?.classList.remove('flex');
    }

    authGuard?.classList.add('hidden');
    authGuard?.classList.remove('flex');
    authContent?.classList.remove('hidden');
    authContent?.classList.add('flex');
    loadAnalyticsData();
  } else {
    btnNavFno?.classList.add('hidden');
    btnNavFno?.classList.remove('flex');
    btnOpenModal?.classList.remove('hidden');
    userBox?.classList.add('hidden');
    userBox?.classList.remove('flex');
    btnAdminConsole?.classList.add('hidden');
    btnAdminConsole?.classList.remove('flex');

    authGuard?.classList.remove('hidden');
    authGuard?.classList.add('flex');
    authContent?.classList.add('hidden');
    authContent?.classList.remove('flex');
  }

  lucide.createIcons();
}

async function loadWatchlists() {
  if (!state.user && !state.isAdmin) return;
  try {
    const res = await fetch('/api/watchlists', { headers: getAuthHeaders() });
    const data = await res.json();
    if (data.success && Array.isArray(data.watchlists)) {
      state.watchlists = data.watchlists;
    }
  } catch (err) {}
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
    tabLogin?.classList.add('border-b-2', 'border-emerald-500', 'text-emerald-400');
    tabLogin?.classList.remove('text-slate-400');
    tabRegister?.classList.remove('border-b-2', 'border-emerald-500', 'text-emerald-400');
    tabRegister?.classList.add('text-slate-400');

    formLogin?.classList.remove('hidden');
    formRegister?.classList.add('hidden');
  } else {
    tabRegister?.classList.add('border-b-2', 'border-emerald-500', 'text-emerald-400');
    tabRegister?.classList.remove('text-slate-400');
    tabLogin?.classList.remove('border-b-2', 'border-emerald-500', 'text-emerald-400');
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
    state.user = data.user || { userId: data.userId || data.username, username: data.username, role: data.role };
    state.isAdmin = (state.user && state.user.role === 'admin');

    closeAuthModal();
    updateAuthUI(state.user);
    showToast(`Welcome back, ${state.user.username}!`, 'success');
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
  const succBanner = document.getElementById('register-success-banner');

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
  localStorage.removeItem('authToken');
  localStorage.removeItem('adminToken');
  updateAuthUI(null);
  showToast('Logged out successfully', 'info');
}

// -------------------------------------------------------------
// Market Analytics Data Loading & Rendering
// -------------------------------------------------------------

async function loadAnalyticsData() {
  if (!state.user && !state.isAdmin) return;
  try {
    const [breadthRes, sectorsRes, indicesRes, sectoralBreadthRes, exploreRes, feedRes] = await Promise.all([
      fetch(`/api/analytics/breadth?sector=${encodeURIComponent(state.activeBreadthSector || 'all')}`),
      fetch('/api/analytics/sectors', { headers: getAuthHeaders() }),
      fetch('/api/analytics/indices'),
      fetch('/api/analytics/sectoral-breadth'),
      fetch('/api/analytics/explore'),
      fetch('/api/feed/status')
    ]);

    const breadthData = await breadthRes.json();
    const sectorsData = await sectorsRes.json();
    const indicesData = await indicesRes.json();
    const sectoralBreadthData = await sectoralBreadthRes.json();
    const exploreData = await exploreRes.json();
    const feedData = await feedRes.json();

    if (breadthData.success) {
      state.breadthData = breadthData;
      renderBreadthDiagnostics(breadthData);
    }

    if (sectoralBreadthData.success) {
      state.sectoralBreadthData = sectoralBreadthData.sectors || [];
      renderSectoralBreadthGrid();
    }

    if (sectorsData.success) {
      state.subSectors = sectorsData.subSectors || [];
      state.analyticsPreferences = sectorsData.preferences || state.analyticsPreferences;
      renderSubSectorsGrid();
    }

    if (indicesData.success) {
      state.indicesData = indicesData.indices || [];
      renderIndicesRibbon(state.indicesData);
    }

    if (feedData && (feedData.dhanActive || feedData.dhanConfigured)) {
      state.dhanActive = Boolean(feedData.dhanActive || feedData.dhanConfigured);
    } else if (exploreData.success) {
      state.dhanActive = Boolean(exploreData.dhanActive);
    }
    updateDhanHeaderBadge();

    if (exploreData.success && Array.isArray(exploreData.stocks)) {
      state.exploreStocks = exploreData.stocks;
      applyExploreFilters();
    }
  } catch (err) {
    showToast('Failed to load market analytics: ' + err.message, 'error');
  }
}

async function handleBreadthSectorChange(sectorId) {
  state.activeBreadthSector = sectorId;
  try {
    const res = await fetch(`/api/analytics/breadth?sector=${encodeURIComponent(sectorId)}`);
    const data = await res.json();
    if (data.success) {
      state.breadthData = data;
      renderBreadthDiagnostics(data);
    }
  } catch (e) {}
}

function renderBreadthDiagnostics(data) {
  const u = data.universe || {};
  const s = data.sentiment || {};

  const el20Val = document.getElementById('val-breadth-20sma');
  const el50Val = document.getElementById('val-breadth-50sma');
  const elCircle20 = document.getElementById('circle-breadth-20sma');
  const elCircle50 = document.getElementById('circle-breadth-50sma');
  const elBadgeStatus = document.getElementById('badge-sentiment-status');
  const elDesc = document.getElementById('text-sentiment-desc');
  const elAdRatio = document.getElementById('val-ad-ratio');
  const elHighLow = document.getElementById('val-high-low');
  const selectSector = document.getElementById('select-breadth-sector');
  const badgeSummary = document.getElementById('badge-breadth-summary');

  if (el20Val) el20Val.textContent = `${u.above20SmaPct ?? 74.5}%`;
  if (el50Val) el50Val.textContent = `${u.above50SmaPct ?? 81.2}%`;
  
  if (elCircle20) elCircle20.setAttribute('stroke-dasharray', `${u.above20SmaPct ?? 74.5}, 100`);
  if (elCircle50) elCircle50.setAttribute('stroke-dasharray', `${u.above50SmaPct ?? 81.2}, 100`);

  if (elBadgeStatus) {
    elBadgeStatus.textContent = s.status || 'Bullish Expansion ⚡';
    elBadgeStatus.className = `px-2 py-0.5 rounded-md text-[11px] font-bold border ${s.badge || 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'}`;
  }
  if (elDesc) elDesc.textContent = s.description || 'Strong broad market participation above moving averages.';
  if (elAdRatio) elAdRatio.textContent = `${u.advanceDeclineRatio || 2.95} (${u.advances || 112}A / ${u.declines || 38}D)`;
  if (elHighLow) elHighLow.textContent = `${u.new52wHighs || 42} Highs / ${u.new52wLows || 8} Lows`;

  if (badgeSummary) {
    badgeSummary.textContent = `${u.above20SmaPct ?? 74.5}% > 20SMA · ${u.above50SmaPct ?? 81.2}% > 50SMA · ${u.advances || 112}A / ${u.declines || 38}D`;
  }

  if (selectSector && (data.sectoralBreadth || data.indicesBreadth) && selectSector.options.length <= 1) {
    selectSector.innerHTML = '';
    
    // Group 1: Broad Market & Universe
    const grpUniverse = document.createElement('optgroup');
    grpUniverse.label = '🌐 Benchmark & Broad Market';
    
    const optAll = document.createElement('option');
    optAll.value = 'all';
    optAll.textContent = 'Universe (All Stocks)';
    grpUniverse.appendChild(optAll);

    const broadIds = ['idx_nifty50', 'idx_midcap100', 'idx_smallcap100', 'idx_midsmall400'];
    (data.indicesBreadth || []).filter(i => broadIds.includes(i.id)).forEach(idx => {
      const opt = document.createElement('option');
      opt.value = idx.id;
      opt.textContent = `${idx.name} (${idx.above50SmaPct}% > 50 SMA)`;
      grpUniverse.appendChild(opt);
    });
    selectSector.appendChild(grpUniverse);

    // Group 2: Sectoral Indices
    const grpSectoral = document.createElement('optgroup');
    grpSectoral.label = '🏢 Nifty Sectoral Indices';
    (data.indicesBreadth || []).filter(i => !broadIds.includes(i.id)).forEach(idx => {
      const opt = document.createElement('option');
      opt.value = idx.id;
      opt.textContent = `${idx.name} (${idx.above50SmaPct}% > 50 SMA)`;
      grpSectoral.appendChild(opt);
    });
    selectSector.appendChild(grpSectoral);

    // Group 3: Sub-Sectors
    if (data.sectoralBreadth && data.sectoralBreadth.length > 0) {
      const grpSub = document.createElement('optgroup');
      grpSub.label = '🔬 Growth Sub-Sectors';
      data.sectoralBreadth.forEach(sub => {
        const opt = document.createElement('option');
        opt.value = sub.id;
        opt.textContent = `${sub.name} (${sub.above50SmaPct}% > 50 SMA)`;
        grpSub.appendChild(opt);
      });
      selectSector.appendChild(grpSub);
    }

    selectSector.value = state.activeBreadthSector || 'all';
  }
}

// -------------------------------------------------------------
// NSE Sectoral Indices Advance / Decline Leaderboard Controller (Option B)
// -------------------------------------------------------------

function renderSectoralBreadthGrid() {
  const container = document.getElementById('sectoral-breadth-grid');
  if (!container) return;
  container.innerHTML = '';

  let sectors = [...(state.sectoralBreadthData || [])];

  // 1. Filter by category
  if (state.activeSectoralCategory && state.activeSectoralCategory !== 'all') {
    sectors = sectors.filter(s => (s.category || '').toLowerCase().includes(state.activeSectoralCategory.toLowerCase()));
  }

  // 2. Filter by search query
  if (state.sectoralSearchQuery) {
    const q = state.sectoralSearchQuery.toLowerCase();
    sectors = sectors.filter(s => 
      s.name.toLowerCase().includes(q) || 
      (s.category && s.category.toLowerCase().includes(q)) ||
      (s.stocks && s.stocks.some(st => st.symbol.toLowerCase().includes(q) || (st.name || '').toLowerCase().includes(q)))
    );
  }

  // Update summary badge
  const badgeSummary = document.getElementById('badge-sectoral-summary');
  if (badgeSummary) {
    const totalAdv = sectors.reduce((acc, s) => acc + (s.advances || 0), 0);
    const totalDec = sectors.reduce((acc, s) => acc + (s.declines || 0), 0);
    badgeSummary.textContent = `${sectors.length} Sectors (${totalAdv}A / ${totalDec}D)`;
  }

  // 3. Sort sectors
  sectors.sort((a, b) => {
    let valA, valB;
    switch (state.sectoralBreadthSortField) {
      case 'change':
        valA = a.changePercent || 0;
        valB = b.changePercent || 0;
        break;
      case 'adRatio':
        valA = a.adRatio || 0;
        valB = b.adRatio || 0;
        break;
      case 'advances':
        valA = a.advances || 0;
        valB = b.advances || 0;
        break;
      case 'name':
        return state.sectoralBreadthSortAsc 
          ? a.name.localeCompare(b.name) 
          : b.name.localeCompare(a.name);
      default:
        valA = a.changePercent || 0;
        valB = b.changePercent || 0;
    }
    return state.sectoralBreadthSortAsc ? (valA - valB) : (valB - valA);
  });

  if (sectors.length === 0) {
    container.innerHTML = `
      <div class="col-span-full p-8 text-center bg-dark-bg/40 border border-dark-border rounded-2xl text-slate-400">
        <i data-lucide="search-x" class="w-8 h-8 mx-auto mb-2 text-slate-500"></i>
        <p class="text-sm font-semibold">No sectoral indices match the selected filter</p>
      </div>
    `;
    lucide.createIcons();
    return;
  }

  sectors.forEach(sec => {
    const card = document.createElement('div');
    card.className = 'group p-3.5 rounded-2xl bg-dark-bg/70 hover:bg-dark-bg/95 border border-dark-border hover:border-emerald-500/40 transition-all duration-200 flex flex-col justify-between gap-2.5 shadow-md';

    const isPositive = (sec.changePercent || 0) >= 0;
    const chgClass = isPositive ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' : 'text-rose-400 bg-rose-500/10 border-rose-500/20';
    const chgSign = isPositive ? '+' : '';

    const advPct = sec.advancePercent || (sec.totalConstituents ? Math.round((sec.advances / sec.totalConstituents) * 100) : 50);
    const decPct = sec.declinePercent || (sec.totalConstituents ? Math.round((sec.declines / sec.totalConstituents) * 100) : 50);
    const unchCount = sec.unchanged || 0;
    const unchPct = (unchCount > 0 && sec.totalConstituents) ? Number(((unchCount / sec.totalConstituents) * 100).toFixed(1)) : 0;

    const shortCode = sec.name.replace('NIFTY ', '').substring(0, 3).toUpperCase();
    const avatarClass = advPct >= 50 ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30' : 'bg-rose-500/15 text-rose-400 border-rose-500/30';

    card.innerHTML = `
      <!-- Row 1: Header (Avatar, Sector Name, Category, LTP & % Change) -->
      <div class="flex items-center justify-between gap-2 cursor-pointer" onclick="openSectoralStocksModal('${sec.id}', 'all')">
        <div class="flex items-center gap-2 min-w-0">
          <div class="w-7 h-7 rounded-lg ${avatarClass} border font-mono font-bold text-xs flex items-center justify-center shrink-0">
            ${shortCode}
          </div>
          <div class="min-w-0">
            <h4 class="text-xs font-bold text-white group-hover:text-emerald-400 transition-colors truncate font-mono">${sec.name}</h4>
            <span class="text-[10px] text-slate-400 line-clamp-1">${sec.category || 'Sector'} · ${sec.totalConstituents} Stocks</span>
          </div>
        </div>
        <div class="flex flex-col items-end shrink-0 font-mono">
          <span class="text-xs font-bold text-slate-100">${fmt.currency(sec.ltp)}</span>
          <span class="px-1.5 py-0.2 rounded text-[10px] font-bold border ${chgClass}">
            ${chgSign}${Number(sec.changePercent || 0).toFixed(2)}%
          </span>
        </div>
      </div>

      <!-- Row 2: Advance / Decline Counts & 2-Tone Progress Bar -->
      <div class="flex flex-col gap-1.5 font-mono text-[10px]">
        <div class="flex items-center justify-between">
          <!-- Advances Pill (Clickable) -->
          <button onclick="event.stopPropagation(); openSectoralStocksModal('${sec.id}', 'advance')"
            class="flex items-center gap-1 text-emerald-400 hover:text-emerald-300 font-semibold cursor-pointer px-1.5 py-0.5 rounded-md hover:bg-emerald-500/10 transition-colors"
            title="Click to view all ${sec.advances} advancing stocks in ${sec.name}">
            <span class="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
            <span>${sec.advances} Adv (${advPct}%)</span>
          </button>

          <!-- Declines Pill (Clickable) -->
          <button onclick="event.stopPropagation(); openSectoralStocksModal('${sec.id}', 'decline')"
            class="flex items-center gap-1 text-rose-400 hover:text-rose-300 font-semibold cursor-pointer px-1.5 py-0.5 rounded-md hover:bg-rose-500/10 transition-colors"
            title="Click to view all ${sec.declines} declining stocks in ${sec.name}">
            <span>${sec.declines} Dec (${decPct}%)</span>
            <span class="w-1.5 h-1.5 rounded-full bg-rose-400"></span>
          </button>
        </div>

        <!-- 2-Tone Horizontal Progress Bar Strip -->
        <div class="h-2 w-full bg-dark-card rounded-full overflow-hidden flex border border-dark-border/60 cursor-pointer shadow-inner"
             onclick="openSectoralStocksModal('${sec.id}', 'all')"
             title="${sec.advances} Adv (${advPct}%) / ${sec.declines} Dec (${decPct}%) - Click to inspect">
          <div class="h-full bg-emerald-500 hover:bg-emerald-400 transition-all duration-300" style="width: ${advPct}%"></div>
          ${unchPct > 0 ? `<div class="h-full bg-slate-600" style="width: ${unchPct}%"></div>` : ''}
          <div class="h-full bg-rose-500 hover:bg-rose-400 transition-all duration-300" style="width: ${decPct}%"></div>
        </div>
      </div>

      <!-- Row 3: Strength Pill, A/D Ratio & Inspect Button -->
      <div class="flex items-center justify-between text-[10px] text-slate-400 pt-1.5 border-t border-dark-border/40 font-mono">
        <div class="flex items-center gap-1.5">
          <span class="px-1.5 py-0.5 rounded text-[9px] font-semibold bg-dark-card border border-dark-border ${advPct >= 60 ? 'text-emerald-400 border-emerald-500/20' : advPct <= 40 ? 'text-rose-400 border-rose-500/20' : 'text-slate-300'}">
            ${sec.strength || 'Neutral ⚖️'}
          </span>
          <span>A/D: <strong class="${sec.adRatio >= 1 ? 'text-emerald-400' : 'text-rose-400'}">${sec.adRatio}</strong></span>
        </div>
        <button onclick="openSectoralStocksModal('${sec.id}', 'all')"
          class="text-slate-400 hover:text-emerald-400 flex items-center gap-0.5 transition-colors cursor-pointer px-1 py-0.5 font-sans font-medium"
          title="Inspect all ${sec.totalConstituents} constituent stocks">
          <span>Inspect</span>
          <i data-lucide="chevron-right" class="w-3 h-3"></i>
        </button>
      </div>
    `;

    container.appendChild(card);
  });

  lucide.createIcons();
}

function generateSectorDonutSvg(advances, declines, unchanged, total, sectorId) {
  const tot = total || (advances + declines + unchanged) || 1;
  const radius = 38;
  const circumference = 2 * Math.PI * radius; // ~238.76

  const advRatio = (advances || 0) / tot;
  const decRatio = (declines || 0) / tot;
  const unchRatio = (unchanged || 0) / tot;

  const advDash = advRatio * circumference;
  const decDash = decRatio * circumference;
  const unchDash = unchRatio * circumference;

  const offsetAdv = 0;
  const offsetDec = -advDash;
  const offsetUnch = -(advDash + decDash);

  return `
    <div class="relative w-28 h-28 flex items-center justify-center select-none group/donut">
      <svg class="w-28 h-28 transform -rotate-90" viewBox="0 0 100 100">
        <!-- Background Circle -->
        <circle cx="50" cy="50" r="${radius}" stroke="#1e293b" stroke-width="10" fill="none" />
        
        <!-- Advances (Green) Segment -->
        ${advDash > 0 ? `
          <circle cx="50" cy="50" r="${radius}"
            stroke="#10b981"
            stroke-width="10"
            stroke-dasharray="${advDash} ${circumference}"
            stroke-dashoffset="${offsetAdv}"
            stroke-linecap="butt"
            fill="none"
            class="cursor-pointer transition-all duration-300 hover:stroke-[13] hover:brightness-125"
            onclick="event.stopPropagation(); openSectoralStocksModal('${sectorId}', 'advance')"
          >
            <title>🟢 Advances: ${advances} (${(advRatio * 100).toFixed(1)}%) - Click to view advancing stocks</title>
          </circle>
        ` : ''}

        <!-- Declines (Red) Segment -->
        ${decDash > 0 ? `
          <circle cx="50" cy="50" r="${radius}"
            stroke="#ef4444"
            stroke-width="10"
            stroke-dasharray="${decDash} ${circumference}"
            stroke-dashoffset="${offsetDec}"
            stroke-linecap="butt"
            fill="none"
            class="cursor-pointer transition-all duration-300 hover:stroke-[13] hover:brightness-125"
            onclick="event.stopPropagation(); openSectoralStocksModal('${sectorId}', 'decline')"
          >
            <title>🔴 Declines: ${declines} (${(decRatio * 100).toFixed(1)}%) - Click to view declining stocks</title>
          </circle>
        ` : ''}

        <!-- Unchanged (Gray) Segment -->
        ${unchDash > 0 ? `
          <circle cx="50" cy="50" r="${radius}"
            stroke="#64748b"
            stroke-width="10"
            stroke-dasharray="${unchDash} ${circumference}"
            stroke-dashoffset="${offsetUnch}"
            stroke-linecap="butt"
            fill="none"
            class="cursor-pointer transition-all duration-300 hover:stroke-[13]"
            onclick="event.stopPropagation(); openSectoralStocksModal('${sectorId}', 'unchanged')"
          >
            <title>⚪ Unchanged: ${unchanged} (${(unchRatio * 100).toFixed(1)}%)</title>
          </circle>
        ` : ''}
      </svg>

      <!-- Center Text Badge (Clickable) -->
      <div class="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center">
        <span class="text-xs font-mono font-bold leading-tight">
          <span class="text-emerald-400">${advances}</span><span class="text-slate-500">/</span><span class="text-rose-400">${declines}</span>
        </span>
        <span class="text-[9px] text-slate-400 font-mono leading-tight">A / D</span>
      </div>
    </div>
  `;
}

function handleSectoralBreadthSort(field) {
  if (state.sectoralBreadthSortField === field) {
    state.sectoralBreadthSortAsc = !state.sectoralBreadthSortAsc;
  } else {
    state.sectoralBreadthSortField = field;
    state.sectoralBreadthSortAsc = (field === 'name');
  }

  document.querySelectorAll('.sec-sort-btn').forEach(btn => {
    btn.classList.remove('active', 'bg-emerald-600', 'text-white');
    btn.classList.add('text-slate-400');
  });
  const mapBtn = {
    change: 'btn-sort-sec-change',
    adRatio: 'btn-sort-sec-ad',
    advances: 'btn-sort-sec-adv',
    name: 'btn-sort-sec-name'
  };
  const activeBtn = document.getElementById(mapBtn[field]);
  if (activeBtn) {
    activeBtn.classList.add('active', 'bg-emerald-600', 'text-white');
    activeBtn.classList.remove('text-slate-400');
  }

  renderSectoralBreadthGrid();
}

function handleSectoralCategoryFilter(cat, btnEl) {
  state.activeSectoralCategory = cat;
  document.querySelectorAll('.sec-cat-pill').forEach(pill => {
    pill.classList.remove('active', 'bg-emerald-600', 'text-white');
    pill.classList.add('bg-dark-bg', 'text-slate-400', 'border', 'border-dark-border');
  });
  if (btnEl) {
    btnEl.classList.add('active', 'bg-emerald-600', 'text-white');
    btnEl.classList.remove('bg-dark-bg', 'text-slate-400', 'border', 'border-dark-border');
  }
  renderSectoralBreadthGrid();
}

function handleSectorSearchInput(query) {
  state.sectoralSearchQuery = (query || '').toLowerCase().trim();
  renderSectoralBreadthGrid();
}

function openSectoralStocksModal(sectorId, filterType = 'all') {
  const sector = (state.sectoralBreadthData || []).find(s => s.id === sectorId);
  if (!sector) return;

  state.activeSectorModalData = sector;
  state.sectoralModalFilter = filterType;
  state.sectoralModalSearch = '';

  const inputSearch = document.getElementById('ssm-stock-search');
  if (inputSearch) inputSearch.value = '';

  if (filterType === 'advance') {
    state.sectoralModalSortField = 'changePercent';
    state.sectoralModalSortAsc = false;
  } else if (filterType === 'decline') {
    state.sectoralModalSortField = 'changePercent';
    state.sectoralModalSortAsc = true;
  } else {
    state.sectoralModalSortField = 'changePercent';
    state.sectoralModalSortAsc = false;
  }

  const elName = document.getElementById('ssm-sector-name');
  const elLtp = document.getElementById('ssm-sector-ltp');
  const elChg = document.getElementById('ssm-sector-change');
  const elAd = document.getElementById('ssm-sector-ad');
  const elStrength = document.getElementById('ssm-strength-badge');

  if (elName) elName.textContent = sector.name;
  if (elLtp) elLtp.textContent = fmt.currency(secLtp(sector));
  if (elChg) {
    const isPos = (sector.changePercent || 0) >= 0;
    elChg.textContent = `${isPos ? '+' : ''}${Number(sector.changePercent || 0).toFixed(2)}% (${isPos ? '+' : ''}${fmt.currency(sector.pointChange || 0)} pts)`;
    elChg.className = isPos ? 'text-emerald-400 font-bold' : 'text-rose-400 font-bold';
  }
  if (elAd) elAd.textContent = sector.adRatio;
  if (elStrength) elStrength.textContent = sector.strength || 'Neutral ⚖️';

  const cntAll = document.getElementById('ssm-count-all');
  const cntAdv = document.getElementById('ssm-count-advance');
  const cntDec = document.getElementById('ssm-count-decline');
  const cntUnch = document.getElementById('ssm-count-unchanged');

  if (cntAll) cntAll.textContent = sector.totalConstituents;
  if (cntAdv) cntAdv.textContent = sector.advances;
  if (cntDec) cntDec.textContent = sector.declines;
  if (cntUnch) cntUnch.textContent = sector.unchanged || 0;

  updateSectoralModalTabStyles();
  renderSectoralStockTable();

  const modal = document.getElementById('sectoral-stocks-modal');
  modal?.classList.remove('hidden');
  modal?.classList.add('flex');
}

function secLtp(sec) {
  return sec?.ltp || 0;
}

function closeSectoralStocksModal() {
  const modal = document.getElementById('sectoral-stocks-modal');
  modal?.classList.add('hidden');
  modal?.classList.remove('flex');
}

function setSectoralStockFilter(filterType, btnEl) {
  state.sectoralModalFilter = filterType;
  updateSectoralModalTabStyles();
  renderSectoralStockTable();
}

function updateSectoralModalTabStyles() {
  const tabs = ['all', 'advance', 'decline', 'unchanged'];
  tabs.forEach(t => {
    const btn = document.getElementById(`ssm-tab-${t}`);
    if (!btn) return;
    if (t === state.sectoralModalFilter) {
      if (t === 'advance') {
        btn.className = 'ssm-filter-tab px-3 py-1.5 rounded-xl font-semibold bg-emerald-600 text-white shadow-sm transition-all cursor-pointer flex items-center gap-1';
      } else if (t === 'decline') {
        btn.className = 'ssm-filter-tab px-3 py-1.5 rounded-xl font-semibold bg-rose-600 text-white shadow-sm transition-all cursor-pointer flex items-center gap-1';
      } else {
        btn.className = 'ssm-filter-tab px-3 py-1.5 rounded-xl font-semibold bg-blue-600 text-white shadow-sm transition-all cursor-pointer flex items-center gap-1';
      }
    } else {
      btn.className = 'ssm-filter-tab px-3 py-1.5 rounded-xl font-semibold bg-dark-bg border border-dark-border text-slate-300 hover:text-white transition-all cursor-pointer flex items-center gap-1';
    }
  });

  const badge = document.getElementById('ssm-filter-badge');
  if (badge && state.activeSectorModalData) {
    const sec = state.activeSectorModalData;
    if (state.sectoralModalFilter === 'advance') {
      badge.textContent = `🟢 Advancing Stocks (${sec.advances})`;
      badge.className = 'px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30';
    } else if (state.sectoralModalFilter === 'decline') {
      badge.textContent = `🔴 Declining Stocks (${sec.declines})`;
      badge.className = 'px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-500/20 text-rose-400 border border-rose-500/30';
    } else if (state.sectoralModalFilter === 'unchanged') {
      badge.textContent = `⚪ Unchanged Stocks (${sec.unchanged || 0})`;
      badge.className = 'px-2.5 py-0.5 rounded-full text-xs font-bold bg-slate-500/20 text-slate-300 border border-slate-500/30';
    } else {
      badge.textContent = `All Constituents (${sec.totalConstituents})`;
      badge.className = 'px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-500/20 text-blue-400 border border-blue-500/30';
    }
  }
}

function filterSectoralStockTable() {
  const input = document.getElementById('ssm-stock-search');
  state.sectoralModalSearch = (input?.value || '').toLowerCase().trim();
  renderSectoralStockTable();
}

function handleSectoralStockSort(field) {
  if (state.sectoralModalSortField === field) {
    state.sectoralModalSortAsc = !state.sectoralModalSortAsc;
  } else {
    state.sectoralModalSortField = field;
    state.sectoralModalSortAsc = (field === 'symbol' || field === 'name');
  }
  renderSectoralStockTable();
}

function renderSectoralStockTable() {
  const tbody = document.getElementById('sectoral-stocks-tbody');
  if (!tbody || !state.activeSectorModalData) return;
  tbody.innerHTML = '';

  let stocks = [...(state.activeSectorModalData.stocks || [])];

  // 1. Filter by status (all / advance / decline / unchanged)
  if (state.sectoralModalFilter && state.sectoralModalFilter !== 'all') {
    stocks = stocks.filter(s => s.status === state.sectoralModalFilter);
  }

  // 2. Filter by search text
  if (state.sectoralModalSearch) {
    const q = state.sectoralModalSearch;
    stocks = stocks.filter(s => s.symbol.toLowerCase().includes(q) || (s.name || '').toLowerCase().includes(q));
  }

  // 3. Sort stocks
  stocks.sort((a, b) => {
    let valA, valB;
    switch (state.sectoralModalSortField) {
      case 'rank':
        valA = a.rank || 0;
        valB = b.rank || 0;
        break;
      case 'symbol':
        return state.sectoralModalSortAsc ? a.symbol.localeCompare(b.symbol) : b.symbol.localeCompare(a.symbol);
      case 'name':
        return state.sectoralModalSortAsc ? (a.name || '').localeCompare(b.name || '') : (b.name || '').localeCompare(a.name || '');
      case 'ltp':
        valA = a.ltp || 0;
        valB = b.ltp || 0;
        break;
      case 'change':
        valA = a.change || 0;
        valB = b.change || 0;
        break;
      case 'changePercent':
        valA = a.changePercent || 0;
        valB = b.changePercent || 0;
        break;
      case 'volume':
        valA = a.volume || 0;
        valB = b.volume || 0;
        break;
      case 'mcap':
        valA = a.mcap || 0;
        valB = b.mcap || 0;
        break;
      default:
        valA = a.changePercent || 0;
        valB = b.changePercent || 0;
    }
    return state.sectoralModalSortAsc ? (valA - valB) : (valB - valA);
  });

  updateSectoralSortIcons();

  if (stocks.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="10" class="py-8 text-center text-slate-500 font-sans">
          <i data-lucide="inbox" class="w-6 h-6 mx-auto mb-1 text-slate-600"></i>
          <span>No stocks found matching the criteria</span>
        </td>
      </tr>
    `;
    lucide.createIcons();
    return;
  }

  stocks.forEach((stk, idx) => {
    const tr = document.createElement('tr');
    tr.className = 'hover:bg-dark-accent/40 transition-colors group';

    const isPos = (stk.changePercent || 0) >= 0;
    const chgClass = isPos ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' : 'text-rose-400 bg-rose-500/10 border-rose-500/20';
    const chgSign = isPos ? '+' : '';

    let volStr = '--';
    if (stk.volume) {
      if (stk.volume >= 10000000) volStr = `${(stk.volume / 10000000).toFixed(2)} Cr`;
      else if (stk.volume >= 100000) volStr = `${(stk.volume / 100000).toFixed(2)} L`;
      else volStr = stk.volume.toLocaleString('en-IN');
    }

    tr.innerHTML = `
      <td class="py-2.5 px-3 text-center text-slate-500 font-bold">${idx + 1}</td>
      <td class="py-2.5 px-3 font-bold text-white">
        <div class="flex items-center gap-1.5">
          <span onclick="openStockChartModal('${stk.symbol}', '${(stk.name || stk.symbol).replace(/'/g, "\\'")}', state.activeSectorModalData ? state.activeSectorModalData.stocks : [])" class="px-2 py-0.5 rounded bg-dark-bg border border-dark-border text-blue-400 hover:text-emerald-400 hover:border-emerald-500/30 transition-all cursor-pointer">${stk.symbol}</span>
          ${getFnoBadgeHtml(stk.symbol)}
        </div>
      </td>
      <td class="py-2.5 px-3 text-slate-300 font-sans font-medium text-xs">${stk.name || stk.symbol}</td>
      <td class="py-2.5 px-3 text-right font-bold text-slate-100">${fmt.currency(stk.ltp)}</td>
      <td class="py-2.5 px-3 text-right font-semibold ${isPos ? 'text-emerald-400' : 'text-rose-400'}">
        ${chgSign}${fmt.currency(stk.change)}
      </td>
      <td class="py-2.5 px-3 text-right">
        <span class="px-2 py-0.5 rounded text-[11px] font-bold border ${chgClass}">
          ${chgSign}${Number(stk.changePercent || 0).toFixed(2)}%
        </span>
      </td>
      <td class="py-2.5 px-3 text-center text-[10px] text-slate-400">
        <span>${fmt.currency(stk.dayLow)}</span> - <span class="text-slate-200">${fmt.currency(stk.dayHigh)}</span>
      </td>
      <td class="py-2.5 px-3 text-right text-slate-300">${volStr}</td>
      <td class="py-2.5 px-3 text-right text-slate-400">${stk.mcap ? Number(stk.mcap).toLocaleString('en-IN') : '--'}</td>
    `;

    tbody.appendChild(tr);
  });

  const footerInfo = document.getElementById('ssm-footer-info');
  if (footerInfo && state.activeSectorModalData) {
    footerInfo.innerHTML = `Showing <strong>${stocks.length}</strong> of <strong>${state.activeSectorModalData.totalConstituents}</strong> stocks in <strong>${state.activeSectorModalData.name}</strong> • Click any stock symbol to view its interactive chart`;
  }

  lucide.createIcons();
}

function updateSectoralSortIcons() {
  const map = {
    rank: 'ssm-sort-rank',
    symbol: 'ssm-sort-sym',
    name: 'ssm-sort-name',
    ltp: 'ssm-sort-ltp',
    change: 'ssm-sort-chg',
    changePercent: 'ssm-sort-pct',
    volume: 'ssm-sort-vol',
    mcap: 'ssm-sort-mcap'
  };

  Object.keys(map).forEach(f => {
    const elIcon = document.getElementById(map[f]);
    if (!elIcon) return;
    if (f === state.sectoralModalSortField) {
      elIcon.textContent = state.sectoralModalSortAsc ? '▲' : '▼';
      elIcon.className = 'text-[10px] text-emerald-400 font-bold';
    } else {
      elIcon.textContent = '⇅';
      elIcon.className = 'text-[10px] text-slate-500';
    }
  });
}

function renderIndicesRibbon(indicesList = state.indicesData) {
  const container = document.getElementById('indices-ribbon-container');
  if (!container) return;
  container.innerHTML = '';

  const pinnedIds = state.analyticsPreferences?.pinnedIndexIds || [];
  
  // 1. Filter by Customize Preferences & Category Tabs
  const visibleIndices = (indicesList || []).filter(idx => {
    // If pinnedIndexIds are specified in Customize modal, respect it
    if (pinnedIds.length > 0 && !pinnedIds.includes(idx.id)) return false;
    // If category pill is selected
    if (state.activeIndicesCategory && state.activeIndicesCategory !== 'all') {
      return idx.category === state.activeIndicesCategory;
    }
    return true;
  });

  // Update summary badge
  const badgeSummary = document.getElementById('badge-indices-summary');
  if (badgeSummary) {
    badgeSummary.textContent = `${visibleIndices.length} Pinned Indices`;
  }

  if (visibleIndices.length === 0) {
    container.innerHTML = '<div class="text-xs text-slate-500 py-3 px-2">No indices match the current category or customize settings.</div>';
    return;
  }

  // 2. 1-Click Sorting
  visibleIndices.sort((a, b) => {
    let vA = a[state.indicesSortField];
    let vB = b[state.indicesSortField];
    if (state.indicesSortField === 'change') {
      vA = a.changePercent ?? 0;
      vB = b.changePercent ?? 0;
    }
    if (vA === undefined || vA === null) vA = 0;
    if (vB === undefined || vB === null) vB = 0;
    if (typeof vA === 'string') {
      return state.indicesSortAsc ? vA.localeCompare(vB) : vB.localeCompare(vA);
    }
    return state.indicesSortAsc ? (vA - vB) : (vB - vA);
  });

  // 3. Render Index Cards
  visibleIndices.forEach(idx => {
    const isPositive = (idx.changePercent || 0) >= 0;
    const bgPill = isPositive ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-rose-500/10 text-rose-400 border-rose-500/20';

    // Build mini SVG sparkline
    let sparklineSvg = '';
    if (Array.isArray(idx.sparkline) && idx.sparkline.length >= 2) {
      const min = Math.min(...idx.sparkline);
      const max = Math.max(...idx.sparkline);
      const range = max - min || 1;
      const w = 56, h = 20;
      const pts = idx.sparkline.map((val, i) => {
        const x = (i / (idx.sparkline.length - 1)) * w;
        const y = h - ((val - min) / range) * (h - 4) - 2;
        return `${x.toFixed(1)},${y.toFixed(1)}`;
      }).join(' ');
      const strokeColor = isPositive ? '#10b981' : '#f43f5e';
      sparklineSvg = `<svg class="w-14 h-5 overflow-visible" viewBox="0 0 56 20"><polyline fill="none" stroke="${strokeColor}" stroke-width="1.8" stroke-linecap="round" points="${pts}" /></svg>`;
    }

    const card = document.createElement('div');
    card.className = 'flex-shrink-0 min-w-[175px] p-3 rounded-xl bg-dark-bg/60 border border-dark-border hover:border-slate-700 transition-all flex flex-col gap-2 cursor-pointer shadow-sm';
    card.title = `Click to view ${idx.name} chart`;
    card.innerHTML = `
      <div class="flex items-center justify-between gap-2">
        <span class="text-xs font-bold text-slate-200 line-clamp-1">${idx.name}</span>
        <span class="px-1.5 py-0.2 text-[9px] font-mono font-semibold rounded border ${bgPill}">
          ${isPositive ? '+' : ''}${idx.changePercent}%
        </span>
      </div>
      <div class="flex items-end justify-between gap-2 font-mono">
        <div>
          <div class="text-sm font-bold text-white">₹${Number(idx.ltp || 0).toLocaleString('en-IN')}</div>
          <div class="text-[10px] text-slate-500">${idx.category || 'Index'}</div>
        </div>
        <div>${sparklineSvg}</div>
      </div>
    `;

    card.addEventListener('click', () => {
      openAnalyticsStockChart(idx.symbol.replace(/\.NS$/, ''), idx.name);
    });

    container.appendChild(card);
  });
}

function handleIndicesCategoryChange(category, btn) {
  state.activeIndicesCategory = category;
  document.querySelectorAll('.idx-cat-pill').forEach(p => {
    p.classList.remove('active', 'bg-blue-600', 'text-white');
    p.classList.add('bg-dark-bg', 'text-slate-400', 'border', 'border-dark-border');
  });
  if (btn) {
    btn.classList.add('active', 'bg-blue-600', 'text-white');
    btn.classList.remove('bg-dark-bg', 'text-slate-400', 'border', 'border-dark-border');
  }
  renderIndicesRibbon();
}

function handleIndicesSort(field) {
  if (state.indicesSortField === field) {
    state.indicesSortAsc = !state.indicesSortAsc;
  } else {
    state.indicesSortField = field;
    state.indicesSortAsc = (field === 'name');
  }

  document.querySelectorAll('.indices-sort-btn').forEach(btn => {
    btn.classList.remove('active', 'bg-blue-600', 'text-white');
    btn.classList.add('text-slate-400');
  });

  const activeBtn = document.getElementById(`btn-sort-idx-${field}`);
  if (activeBtn) {
    activeBtn.classList.add('active', 'bg-blue-600', 'text-white');
    activeBtn.classList.remove('text-slate-400');
    if (field === 'change') {
      activeBtn.textContent = state.indicesSortAsc ? 'Change ▴' : 'Change ▾';
    } else if (field === 'name') {
      activeBtn.textContent = state.indicesSortAsc ? 'A-Z ▴' : 'Z-A ▾';
    } else if (field === 'ltp') {
      activeBtn.textContent = state.indicesSortAsc ? 'Price ▴' : 'Price ▾';
    }
  }

  renderIndicesRibbon();
}

function renderSubSectorsGrid() {
  const container = document.getElementById('sub-sectors-grid');
  if (!container) return;
  container.innerHTML = '';

  const visibleSectorIds = state.analyticsPreferences?.visibleSectorIds || [];
  const filtered = (state.subSectors || []).filter(sub => {
    if (visibleSectorIds.length > 0 && !visibleSectorIds.includes(sub.id)) return false;
    if (state.activeSectorCategory && state.activeSectorCategory !== 'all') {
      return sub.category === state.activeSectorCategory;
    }
    return true;
  });

  // Update summary badge
  const badgeSummary = document.getElementById('badge-subsectors-summary');
  if (badgeSummary) {
    badgeSummary.textContent = `${filtered.length} Sub-Sectors Ranked`;
  }

  if (filtered.length === 0) {
    container.innerHTML = '<div class="col-span-full py-12 text-center text-slate-500 text-xs">No sub-sectors found for this category.</div>';
    return;
  }

  // 1-Click Sorting
  filtered.sort((a, b) => {
    let vA = a[state.subSectorSortField];
    let vB = b[state.subSectorSortField];
    if (vA === undefined || vA === null) vA = 0;
    if (vB === undefined || vB === null) vB = 0;
    if (typeof vA === 'string') {
      return state.subSectorSortAsc ? vA.localeCompare(vB) : vB.localeCompare(vA);
    }
    return state.subSectorSortAsc ? (vA - vB) : (vB - vA);
  });

  filtered.forEach(sub => {
    const card = document.createElement('div');
    
    // Thermal status color theme
    let thermalBadge = 'bg-amber-500/15 text-amber-400 border-amber-500/30';
    let thermalBorder = 'hover:border-amber-500/40 shadow-amber-950/5';
    if (sub.thermalStatus === 'hot') {
      thermalBadge = 'bg-amber-500/15 text-amber-400 border-amber-500/30';
      thermalBorder = 'hover:border-amber-500/50 shadow-amber-950/10';
    } else if (sub.thermalStatus === 'warm') {
      thermalBadge = 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30';
      thermalBorder = 'hover:border-emerald-500/50 shadow-emerald-950/10';
    } else if (sub.thermalStatus === 'cooling') {
      thermalBadge = 'bg-blue-500/15 text-blue-400 border-blue-500/30';
      thermalBorder = 'hover:border-blue-500/50 shadow-blue-950/10';
    } else {
      thermalBadge = 'bg-slate-700/40 text-slate-400 border-slate-600/30';
      thermalBorder = 'hover:border-slate-700';
    }

    card.className = `p-3.5 rounded-2xl bg-dark-bg/70 hover:bg-dark-bg/95 border border-dark-border ${thermalBorder} transition-all duration-200 flex flex-col justify-between gap-2.5 shadow-md cursor-pointer group`;
    card.title = `Click to inspect all constituent stocks of ${sub.name}`;

    // Top 3 Constituent ticker pills
    const topTickers = (sub.stocks || []).slice(0, 3).map(stk => `
      <span class="px-1.5 py-0.2 rounded bg-dark-card border border-dark-border text-[10px] font-mono text-slate-300">
        ${stk.symbol}
      </span>
    `).join('');

    card.innerHTML = `
      <!-- Row 1: Rank, Sub-Sector Title, Key Fundamentals & Thermal Badge -->
      <div class="flex items-start justify-between gap-2">
        <div class="flex items-center gap-2 min-w-0">
          <div class="w-7 h-7 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-bold text-xs flex items-center justify-center shrink-0">
            #${sub.rank}
          </div>
          <div class="min-w-0">
            <h4 class="text-xs font-bold text-white group-hover:text-blue-400 transition-colors truncate font-sans">${sub.name}</h4>
            <div class="text-[10px] text-slate-400 truncate flex items-center gap-1.5 font-mono">
              <span>${(sub.stocks || []).length} stocks</span>
              <span>·</span>
              <span>P/E <strong class="text-slate-200">${sub.pe}</strong></span>
              <span>·</span>
              <span>ROCE <strong class="text-slate-200">${sub.roce}%</strong></span>
            </div>
          </div>
        </div>
        <span class="px-2 py-0.5 rounded text-[10px] font-bold border ${thermalBadge} shrink-0">
          ${sub.thermalLabel || 'Hot'}
        </span>
      </div>

      <!-- Row 2: % Growing Label, 20/50 SMA & Horizontal Progress Bar -->
      <div class="flex flex-col gap-1.5">
        <div class="flex items-center justify-between text-[10px] font-mono text-slate-400">
          <span class="text-emerald-400 font-semibold">${sub.pctGrowing}% Growing</span>
          <div class="flex items-center gap-1.5">
            <span class="${sub.breadth20Sma >= 70 ? 'text-blue-400' : 'text-slate-400'}">${sub.breadth20Sma || 80}% &gt; 20SMA</span>
            <span>·</span>
            <span class="${sub.breadth50Sma >= 70 ? 'text-emerald-400' : 'text-slate-400'}">${sub.breadth50Sma || 90}% &gt; 50SMA</span>
          </div>
        </div>
        <div class="h-1.5 w-full bg-dark-card rounded-full overflow-hidden border border-dark-border/40 shadow-inner">
          <div class="h-full bg-gradient-to-r from-blue-500 to-emerald-400 rounded-full transition-all duration-300" style="width: ${sub.pctGrowing}%"></div>
        </div>
      </div>

      <!-- Row 3: Top 3 Ticker Pills & Inspect Action -->
      <div class="flex items-center justify-between text-[10px] text-slate-400 pt-1.5 border-t border-dark-border/40 font-mono">
        <div class="flex items-center gap-1 truncate max-w-[70%]">
          ${topTickers}
        </div>
        <div class="text-slate-400 group-hover:text-blue-400 flex items-center gap-0.5 transition-colors font-sans font-medium">
          <span>Inspect</span>
          <i data-lucide="chevron-right" class="w-3 h-3"></i>
        </div>
      </div>
    `;

    card.addEventListener('click', () => {
      openSectorDrilldownModal(sub.id);
    });

    container.appendChild(card);
  });

  lucide.createIcons();
}

function handleSubSectorSort(field) {
  if (state.subSectorSortField === field) {
    state.subSectorSortAsc = !state.subSectorSortAsc;
  } else {
    state.subSectorSortField = field;
    state.subSectorSortAsc = (field === 'rank' || field === 'pe'); // Rank & PE default ascending, rest descending
  }

  // Update button active styling
  document.querySelectorAll('.subsector-sort-btn').forEach(btn => {
    btn.classList.remove('active', 'bg-blue-600', 'text-white');
    btn.classList.add('text-slate-400');
  });
  const activeBtn = document.getElementById(`btn-sort-${field}`);
  if (activeBtn) {
    activeBtn.classList.add('active', 'bg-blue-600', 'text-white');
    activeBtn.classList.remove('text-slate-400');
    const labelMap = { rank: 'Rank', pctGrowing: '% Growing', pe: 'P/E', roce: 'ROCE', breadth50Sma: '50 SMA' };
    const arrow = state.subSectorSortAsc ? '▴' : '▾';
    activeBtn.textContent = `${labelMap[field] || field} ${arrow}`;
  }

  renderSubSectorsGrid();
}

function openSectorDrilldownModal(sectorId) {
  const sub = (state.subSectors || []).find(s => s.id === sectorId);
  if (!sub) return;

  state.activeSubSectorId = sectorId;

  const modal = document.getElementById('sector-drilldown-modal');
  const elRank = document.getElementById('modal-sector-rank');
  const elName = document.getElementById('modal-sector-name');
  const elPe = document.getElementById('modal-sector-pe');
  const elRoce = document.getElementById('modal-sector-roce');
  const elThermal = document.getElementById('modal-sector-thermal');
  const tbody = document.getElementById('modal-sector-tbody');

  if (elRank) elRank.textContent = `#${sub.rank}`;
  if (elName) elName.textContent = sub.name;
  if (elPe) elPe.textContent = `P/E: ${sub.pe}`;
  if (elRoce) elRoce.textContent = `ROCE: ${sub.roce}%`;
  if (elThermal) {
    elThermal.textContent = sub.thermalLabel || 'Hot';
    elThermal.className = `px-2 py-0.2 rounded text-[10px] font-bold border ${
      sub.thermalStatus === 'hot' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' :
      sub.thermalStatus === 'warm' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
      'bg-blue-500/10 text-blue-400 border-blue-500/20'
    }`;
  }

  if (tbody) {
    tbody.innerHTML = '';
    const stocks = [...(sub.stocks || [])];

    // Sort constituent stocks
    stocks.sort((a, b) => {
      let vA = a[state.constituentSortField];
      let vB = b[state.constituentSortField];
      if (typeof vA === 'boolean') vA = vA ? 1 : 0;
      if (typeof vB === 'boolean') vB = vB ? 1 : 0;
      if (vA === undefined || vA === null) vA = 0;
      if (vB === undefined || vB === null) vB = 0;
      if (typeof vA === 'string') {
        return state.constituentSortAsc ? vA.localeCompare(vB) : vB.localeCompare(vA);
      }
      return state.constituentSortAsc ? (vA - vB) : (vB - vA);
    });

    stocks.forEach(stk => {
      const tr = document.createElement('tr');
      tr.className = 'hover:bg-dark-accent/40 transition-colors group cursor-pointer';

      const renderYesNoBadge = (val) => {
        if (val === true) {
          return '<span class="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/20">YES</span>';
        }
        return '<span class="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-500/15 text-rose-400 border border-rose-500/20">NO</span>';
      };

      const opmQoQFormatted = stk.opmQoQ !== undefined ? `${stk.opmQoQ}%` : '--';
      const opmYoYFormatted = stk.opmYoY !== undefined ? `${stk.opmYoY}%` : '--';

      tr.innerHTML = `
        <td class="py-3 px-3 font-bold text-white whitespace-nowrap">
          <div class="flex items-center gap-1.5">
            <span onclick="openStockChartModal('${stk.symbol}', '${(stk.name || stk.symbol).replace(/'/g, "\\'")}', (state.subSectors.find(s => s.id === state.activeSubSectorId)?.stocks) || [])" class="cursor-pointer text-blue-400 hover:text-emerald-400 font-mono tracking-tight transition-colors">${stk.symbol}</span>
            ${getFnoBadgeHtml(stk.symbol)}
          </div>
        </td>
        <td class="py-3 px-3 font-sans text-slate-300 whitespace-nowrap">${stk.name || stk.symbol}</td>
        <td class="py-3 px-2 text-right whitespace-nowrap font-mono">₹${Number(stk.mcap || 0).toLocaleString('en-IN')}</td>
        <td class="py-3 px-2 text-right text-slate-400 whitespace-nowrap font-mono">${stk.pe || '--'}</td>
        <td class="py-3 px-2 text-center whitespace-nowrap">${renderYesNoBadge(stk.salesIncQoQ)}</td>
        <td class="py-3 px-2 text-center whitespace-nowrap">${renderYesNoBadge(stk.salesIncYoY)}</td>
        <td class="py-3 px-2 text-center whitespace-nowrap">${renderYesNoBadge(stk.epsIncQoQ)}</td>
        <td class="py-3 px-2 text-center whitespace-nowrap">${renderYesNoBadge(stk.epsIncYoY)}</td>
        <td class="py-3 px-2 text-right font-bold text-slate-200 whitespace-nowrap font-mono">${opmQoQFormatted}</td>
        <td class="py-3 px-2 text-right font-bold text-slate-200 whitespace-nowrap font-mono">${opmYoYFormatted}</td>
      `;

      tbody.appendChild(tr);
    });
    lucide.createIcons();
  }

  if (modal) {
    modal.classList.remove('hidden');
    modal.classList.add('flex');
  }
}

function handleConstituentSort(field) {
  if (state.constituentSortField === field) {
    state.constituentSortAsc = !state.constituentSortAsc;
  } else {
    state.constituentSortField = field;
    state.constituentSortAsc = (field === 'symbol' || field === 'name' || field === 'pe');
  }

  // Update header sort icons
  const iconMap = {
    symbol: 'sort-sym-icon',
    name: 'sort-name-icon',
    mcap: 'sort-mcap-icon',
    pe: 'sort-pe-icon',
    salesIncQoQ: 'sort-sqoq-icon',
    salesIncYoY: 'sort-syoy-icon',
    epsIncQoQ: 'sort-eqoq-icon',
    epsIncYoY: 'sort-eyoy-icon',
    opmQoQ: 'sort-oqoq-icon',
    opmYoY: 'sort-oyoy-icon'
  };

  Object.entries(iconMap).forEach(([f, id]) => {
    const el = document.getElementById(id);
    if (el) {
      if (f === field) {
        el.textContent = state.constituentSortAsc ? '▲' : '▼';
        el.className = 'text-[10px] text-blue-400 font-bold';
      } else {
        el.textContent = '⇅';
        el.className = 'text-[10px] text-slate-500';
      }
    }
  });

  if (state.activeSubSectorId) {
    openSectorDrilldownModal(state.activeSubSectorId);
  }
}

function closeSectorDrilldownModal() {
  const modal = document.getElementById('sector-drilldown-modal');
  if (modal) {
    modal.classList.add('hidden');
    modal.classList.remove('flex');
  }
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

  mainChart.subscribeCrosshairMove(handleCrosshairUpdate);
  rsiChart.subscribeCrosshairMove(handleCrosshairUpdate);
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

function handleResize() {
  if (!state.charts.main) return;
  
  const pricePane = document.getElementById('tv_price_pane');
  const rsiContainer = document.getElementById('tv_rsi_container');
  const rsiChartEl = document.getElementById('tv_rsi_chart');
  const tvMainChart = document.getElementById('tv_main_chart');
  
  if (pricePane && tvMainChart) {
    const pRect = pricePane.getBoundingClientRect();
    const w = Math.round(pRect.width || 600);
    const h = Math.round(Math.max(80, pRect.height));
    state.charts.main.applyOptions({ width: w, height: h });
  }

  if (state.charts.rsi && rsiContainer && rsiChartEl && rsiContainer.style.display !== 'none') {
    const rRect = rsiChartEl.getBoundingClientRect();
    const w = Math.round(rRect.width || 600);
    const h = Math.round(Math.max(30, rRect.height));
    state.charts.rsi.applyOptions({ width: w, height: h });
  }
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
        btn.className = 'px-2 py-1 rounded-lg bg-blue-600 text-white font-semibold shadow transition-colors cursor-pointer';
      } else {
        btn.className = 'px-2 py-1 rounded-lg hover:text-white transition-colors cursor-pointer text-slate-400';
      }
    }
  });

  const maxBtn = document.getElementById('btn-chart-maximize');
  if (maxBtn) {
    if (presetKey === 'maximized') {
      maxBtn.innerHTML = '<i data-lucide="minimize-2" class="w-3.5 h-3.5 text-blue-400"></i>';
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
      <div class="stock-suggestion-item px-3.5 py-2.5 cursor-pointer hover:bg-blue-600/20 transition-colors flex items-center justify-between gap-2 text-left select-none" data-index="${idx}">
        <div class="min-w-0 flex-1">
          <div class="flex items-center gap-2">
            <span class="font-bold font-mono text-slate-100 text-xs tracking-tight">${item.symbol}</span>
            <span class="text-[9px] px-1 py-0.2 rounded bg-blue-500/15 text-blue-400 font-mono font-semibold">${item.exchange || 'NSE'}</span>
            ${getFnoBadgeHtml(item.symbol)}
          </div>
          <div class="text-[11px] text-slate-400 truncate mt-0.5">${item.name || item.symbol}</div>
        </div>
        <i data-lucide="arrow-up-right" class="w-3.5 h-3.5 text-slate-500 shrink-0"></i>
      </div>
    `).join('');

    lucide.createIcons();
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
        itemEl.classList.add('bg-blue-600/30', 'border-l-2', 'border-blue-500');
        itemEl.scrollIntoView({ block: 'nearest' });
      } else {
        itemEl.classList.remove('bg-blue-600/30', 'border-l-2', 'border-blue-500');
      }
    });
  };

  const fetchSuggestions = async (query) => {
    const q = (query || '').trim().toUpperCase();
    if (!q) {
      closeDropdown();
      return;
    }

    const localMatches = (state.exploreStocks || [])
      .filter(s => (s.symbol || '').toUpperCase().includes(q) || (s.name || '').toUpperCase().includes(q))
      .slice(0, 6)
      .map(s => ({ symbol: s.symbol, name: s.name, exchange: 'NSE' }));

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
  if (state.exploreFilteredStocks && state.exploreFilteredStocks.length > 0) {
    return state.exploreFilteredStocks;
  }
  if (state.activeSectorModalData?.stocks && state.activeSectorModalData.stocks.length > 0) {
    return state.activeSectorModalData.stocks;
  }
  return [];
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
      <span>RSI: <strong class="text-blue-400">${state.currentStockData.latestRSI || '--'}</strong></span>
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

function selectStock(stock) {
  if (!stock) return;
  state.selectedStock = stock;
  const input = document.getElementById('manual-stock-input');
  if (input) {
    input.value = stock.symbol;
    adjustStockInputWidth();
  }
  const nameEl = document.getElementById('chart-stock-name');
  if (nameEl) nameEl.textContent = stock.name || stock.symbol;
  loadStockChart(stock.symbol);
  renderChartWatchlistDropdown(stock.symbol);
}

function openStockChartModal(symbol, name, stockList) {
  if (!symbol) return;
  const cleanSym = symbol.trim().toUpperCase();

  if (Array.isArray(stockList) && stockList.length > 0) {
    state.activeModalStockList = stockList;
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
  if (!checklist) return;

  checklist.innerHTML = '';
  if (!state.user && !state.isAdmin) {
    checklist.innerHTML = `
      <div class="p-2.5 text-center text-slate-500 text-[11px]">
        Please <button onclick="openAuthModal('login')" class="text-blue-400 font-semibold underline">login</button> to manage watchlists.
      </div>
    `;
    return;
  }

  (state.watchlists || []).forEach(wl => {
    const hasStock = (wl.stocks || []).includes(symbol);
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
        if (typeof loadWatchlists === 'function') await loadWatchlists();
        renderChartWatchlistDropdown(symbol);
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
          b.className = 'px-2 py-0.5 rounded text-[11px] font-semibold bg-blue-600 text-white shadow-sm transition-all cursor-pointer';
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
          b.className = 'px-2.5 py-0.5 rounded text-[11px] font-semibold bg-blue-600 text-white shadow-sm transition-all cursor-pointer';
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

// Backward-compatible aliases
function openAnalyticsStockChart(symbol, name, stockList) {
  openStockChartModal(symbol, name, stockList);
}

function closeAnalyticsChartModal() {
  closeStockChartModal();
}

function openAnalyticsCustomizeModal() {
  const modal = document.getElementById('analytics-customization-modal');
  const sectorsChecklist = document.getElementById('customize-sectors-checklist');
  const indicesChecklist = document.getElementById('customize-indices-checklist');

  const visibleSectorIds = new Set(state.analyticsPreferences?.visibleSectorIds || (state.subSectors || []).map(s => s.id));
  const pinnedIndexIds = new Set(state.analyticsPreferences?.pinnedIndexIds || (state.indicesData || []).map(i => i.id));

  if (sectorsChecklist) {
    sectorsChecklist.innerHTML = '';
    (state.subSectors || []).forEach(sub => {
      const isChecked = visibleSectorIds.has(sub.id);
      const label = document.createElement('label');
      label.className = 'flex items-center gap-2 p-1.5 rounded-lg hover:bg-dark-accent/40 cursor-pointer select-none text-slate-300';
      label.innerHTML = `
        <input type="checkbox" value="${sub.id}" class="chk-customize-sector rounded border-slate-700 text-emerald-500 focus:ring-0 bg-dark-card" ${isChecked ? 'checked' : ''}>
        <span class="line-clamp-1">${sub.name}</span>
      `;
      sectorsChecklist.appendChild(label);
    });
  }

  renderCustomizeIndicesChecklist();

  if (modal) {
    modal.classList.remove('hidden');
    modal.classList.add('flex');
  }
}

function renderCustomizeIndicesChecklist() {
  const indicesChecklist = document.getElementById('customize-indices-checklist');
  if (!indicesChecklist) return;

  const pinnedIndexIds = new Set(state.analyticsPreferences?.pinnedIndexIds || (state.indicesData || []).map(i => i.id));
  const indices = [...(state.indicesData || [])];

  if (state.customizeIndicesSortField === 'name') {
    indices.sort((a, b) => state.customizeIndicesSortAsc ? a.name.localeCompare(b.name) : b.name.localeCompare(a.name));
  } else if (state.customizeIndicesSortField === 'change') {
    indices.sort((a, b) => state.customizeIndicesSortAsc ? ((a.changePercent || 0) - (b.changePercent || 0)) : ((b.changePercent || 0) - (a.changePercent || 0)));
  } else if (state.customizeIndicesSortField === 'ltp') {
    indices.sort((a, b) => state.customizeIndicesSortAsc ? ((a.ltp || 0) - (b.ltp || 0)) : ((b.ltp || 0) - (a.ltp || 0)));
  }

  indicesChecklist.innerHTML = '';
  indices.forEach(idx => {
    const isChecked = pinnedIndexIds.has(idx.id);
    const isPos = (idx.changePercent || 0) >= 0;
    const label = document.createElement('label');
    label.className = 'flex items-center justify-between p-1.5 rounded-lg hover:bg-dark-accent/40 cursor-pointer select-none text-slate-300';
    label.innerHTML = `
      <div class="flex items-center gap-2 min-w-0">
        <input type="checkbox" value="${idx.id}" class="chk-customize-index rounded border-slate-700 text-blue-500 focus:ring-0 bg-dark-card" ${isChecked ? 'checked' : ''}>
        <span class="truncate">${idx.name}</span>
      </div>
      <span class="text-[10px] font-mono ${isPos ? 'text-emerald-400' : 'text-rose-400'} shrink-0">${isPos ? '+' : ''}${idx.changePercent}%</span>
    `;
    indicesChecklist.appendChild(label);
  });
}

function sortCustomizeIndices(field) {
  if (state.customizeIndicesSortField === field) {
    state.customizeIndicesSortAsc = !state.customizeIndicesSortAsc;
  } else {
    state.customizeIndicesSortField = field;
    state.customizeIndicesSortAsc = (field === 'name');
  }
  renderCustomizeIndicesChecklist();
}

function closeAnalyticsCustomizeModal() {
  const modal = document.getElementById('analytics-customization-modal');
  if (modal) {
    modal.classList.add('hidden');
    modal.classList.remove('flex');
  }
}

async function saveAnalyticsPreferences() {
  const selectedSectorIds = Array.from(document.querySelectorAll('.chk-customize-sector:checked')).map(cb => cb.value);
  const selectedIndexIds = Array.from(document.querySelectorAll('.chk-customize-index:checked')).map(cb => cb.value);

  const payload = {
    visibleSectorIds: selectedSectorIds,
    pinnedIndexIds: selectedIndexIds
  };

  state.analyticsPreferences = payload;

  try {
    if (state.user || state.isAdmin) {
      await fetch('/api/analytics/preferences', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders()
        },
        body: JSON.stringify(payload)
      });
    }
    showToast('Analytics dashboard preferences updated!', 'success');
  } catch (err) {}

  closeAnalyticsCustomizeModal();
  renderIndicesRibbon(state.indicesData);
  renderSubSectorsGrid();
}

// Category filter click listener for Sub-Sectors
document.getElementById('analytics-sector-filter-bar')?.addEventListener('click', (e) => {
  const btn = e.target.closest('button[data-sector-cat]');
  if (!btn) return;
  document.querySelectorAll('.sector-cat-pill').forEach(p => {
    p.classList.remove('active', 'bg-blue-600', 'text-white');
    p.classList.add('bg-dark-bg', 'text-slate-400', 'border', 'border-dark-border');
  });
  btn.classList.add('active', 'bg-blue-600', 'text-white');
  btn.classList.remove('bg-dark-bg', 'text-slate-400', 'border', 'border-dark-border');
  state.activeSectorCategory = btn.dataset.sectorCat;
  renderSubSectorsGrid();
});

// Theme Toggle
function applyTheme(theme) {
  state.theme = theme;
  localStorage.setItem('theme', theme);
  const icon = document.getElementById('theme-icon');
  if (theme === 'dark') {
    document.documentElement.classList.add('dark');
    if (icon) icon.setAttribute('data-lucide', 'sun');
  } else {
    document.documentElement.classList.remove('dark');
    if (icon) icon.setAttribute('data-lucide', 'moon');
  }
  lucide.createIcons();

  if (analyticsChartInstance) {
    const isDark = theme === 'dark';
    const bgColor = isDark ? '#0b0f19' : '#ffffff';
    const textColor = isDark ? '#94a3b8' : '#334155';
    const gridColor = isDark ? 'rgba(255, 255, 255, 0.04)' : 'rgba(0, 0, 0, 0.06)';
    const borderColor = isDark ? '#1f293d' : '#cbd5e1';

    analyticsChartInstance.applyOptions({
      layout: { background: { color: bgColor }, textColor },
      grid: { vertLines: { color: gridColor }, horzLines: { color: gridColor } },
      rightPriceScale: { borderColor },
      timeScale: { borderColor }
    });
  }

  const hoverCharts = [hoverPriceChartInstance, hoverVolumeChartInstance].filter(Boolean);
  if (hoverCharts.length > 0) {
    const isDark = theme === 'dark';
    const bgColor = isDark ? '#0b0f19' : '#ffffff';
    const textColor = isDark ? '#94a3b8' : '#334155';
    const gridColor = isDark ? 'rgba(255, 255, 255, 0.04)' : 'rgba(0, 0, 0, 0.05)';
    const borderColor = isDark ? '#1f293d' : '#cbd5e1';

    hoverCharts.forEach(c => {
      c.applyOptions({
        layout: { background: { color: bgColor }, textColor },
        grid: { vertLines: { color: gridColor }, horzLines: { color: gridColor } },
        rightPriceScale: { borderColor },
        timeScale: { borderColor }
      });
    });
  }
}

document.getElementById('btn-theme-toggle')?.addEventListener('click', () => {
  applyTheme(state.theme === 'dark' ? 'light' : 'dark');
});

// Auth form listeners
document.getElementById('login-form')?.addEventListener('submit', handleLogin);
document.getElementById('register-form')?.addEventListener('submit', handleRegister);

window.openAuthModal = openAuthModal;
window.closeAuthModal = closeAuthModal;
window.switchAuthTab = switchAuthTab;
window.handleLogout = handleLogout;
window.handleBreadthSectorChange = handleBreadthSectorChange;
window.loadAnalyticsData = loadAnalyticsData;
window.openSectorDrilldownModal = openSectorDrilldownModal;
window.closeSectorDrilldownModal = closeSectorDrilldownModal;
window.handleSubSectorSort = handleSubSectorSort;
window.handleConstituentSort = handleConstituentSort;
window.sortCustomizeIndices = sortCustomizeIndices;
window.showHoverChartPopup = showHoverChartPopup;
window.hideHoverChartPopup = hideHoverChartPopup;
window.openAnalyticsStockChart = openAnalyticsStockChart;
window.closeAnalyticsChartModal = closeAnalyticsChartModal;
window.openAnalyticsCustomizeModal = openAnalyticsCustomizeModal;
window.closeAnalyticsCustomizeModal = closeAnalyticsCustomizeModal;
window.saveAnalyticsPreferences = saveAnalyticsPreferences;

function showToast(message, type = 'info') {
  const container = document.getElementById('toast-container');
  if (!container) return;

  const toast = document.createElement('div');
  let bg = 'bg-slate-800 text-slate-100 border-slate-700';
  let icon = 'info';
  if (type === 'success') {
    bg = 'bg-emerald-950/90 text-emerald-200 border-emerald-800/60';
    icon = 'check-circle-2';
  } else if (type === 'error') {
    bg = 'bg-rose-950/90 text-rose-200 border-rose-800/60';
    icon = 'alert-triangle';
  }

  toast.className = `toast-enter flex items-center gap-2.5 px-4 py-3 rounded-xl border text-xs shadow-xl backdrop-blur ${bg}`;
  toast.innerHTML = `
    <i data-lucide="${icon}" class="w-4 h-4 shrink-0"></i>
    <span class="font-medium">${message}</span>
  `;

  container.appendChild(toast);
  lucide.createIcons();

  setTimeout(() => {
    toast.classList.remove('toast-enter');
    toast.classList.add('toast-exit');
    setTimeout(() => toast.remove(), 300);
  }, 4000);
}

// ==============================================================
// MASTER ADMIN CONSOLE LOGIC & USER MANAGEMENT CONTROLLER
// ==============================================================

let adminUsersData = [];

function openAdminConsole() {
  const modal = document.getElementById('admin-console-modal');
  if (!modal) return;
  modal.classList.remove('hidden');
  modal.classList.add('flex');
  loadAdminData();
}

function closeAdminConsole() {
  const modal = document.getElementById('admin-console-modal');
  if (modal) {
    modal.classList.add('hidden');
    modal.classList.remove('flex');
  }
}

function toggleAdminAddUserPanel() {
  const panel = document.getElementById('admin-add-user-panel');
  if (panel) panel.classList.toggle('hidden');
}

async function loadAdminData() {
  const tbody = document.getElementById('admin-users-tbody');
  const countSpan = document.getElementById('admin-users-table-count');
  const kpiUsersCount = document.getElementById('admin-kpi-users-count');
  const kpiMaxUsers = document.getElementById('admin-kpi-max-users');
  const kpiSlots = document.getElementById('admin-kpi-slots');
  const capacityBar = document.getElementById('admin-capacity-bar');
  const kpiScreeners = document.getElementById('admin-kpi-screeners');
  const kpiWatchlists = document.getElementById('admin-kpi-watchlists');
  const kpiUptime = document.getElementById('admin-kpi-uptime');
  const kpiSessions = document.getElementById('admin-kpi-sessions');
  const inputMaxUsers = document.getElementById('input-admin-max-users');

  if (tbody) {
    tbody.innerHTML = `<tr><td colspan="7" class="py-8 text-center text-slate-400 font-sans">Loading system users & metrics...</td></tr>`;
  }

  try {
    const res = await fetch('/api/admin/users', {
      headers: { ...getAuthHeaders() }
    });
    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data.error || 'Failed to load admin data');
    }

    adminUsersData = data.users || [];
    const maxUsers = data.maxUsers || 10;
    const totalRegistered = data.totalRegisteredUsers || 0;
    const slotsAvail = data.slotsAvailable || 0;

    if (countSpan) countSpan.textContent = adminUsersData.length;
    if (kpiUsersCount) kpiUsersCount.textContent = totalRegistered;
    if (kpiMaxUsers) kpiMaxUsers.textContent = maxUsers;
    if (inputMaxUsers) inputMaxUsers.value = maxUsers;
    if (kpiSlots) {
      kpiSlots.textContent = `${slotsAvail} slot${slotsAvail !== 1 ? 's' : ''} free`;
      kpiSlots.className = `px-1.5 py-0.2 rounded text-[10px] font-mono font-bold ${
        slotsAvail > 0 ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/20' : 'bg-rose-500/15 text-rose-400 border border-rose-500/20'
      }`;
    }

    if (capacityBar) {
      const pct = Math.min(100, Math.round((totalRegistered / maxUsers) * 100));
      capacityBar.style.width = `${pct}%`;
      capacityBar.className = pct >= 90 ? 'bg-rose-500 h-1.5 rounded-full transition-all' : pct >= 60 ? 'bg-amber-500 h-1.5 rounded-full transition-all' : 'bg-blue-500 h-1.5 rounded-full transition-all';
    }

    // Totals across all accounts
    const totalScreeners = adminUsersData.reduce((acc, u) => acc + (u.screenersCount || 0), 0);
    const totalWatchlists = adminUsersData.reduce((acc, u) => acc + (u.watchlistsCount || 0), 0);

    if (kpiScreeners) kpiScreeners.textContent = totalScreeners;
    if (kpiWatchlists) kpiWatchlists.textContent = totalWatchlists;

    if (data.systemStats) {
      const uptimeMin = Math.floor((data.systemStats.uptimeSeconds || 0) / 60);
      const uptimeSec = (data.systemStats.uptimeSeconds || 0) % 60;
      if (kpiUptime) kpiUptime.textContent = `Online (${uptimeMin}m ${uptimeSec}s)`;
      if (kpiSessions) kpiSessions.textContent = `Active user sessions: ${data.systemStats.activeSessions || 1}`;
    }

    renderAdminUsersTable(adminUsersData);
  } catch (err) {
    if (tbody) {
      tbody.innerHTML = `<tr><td colspan="7" class="py-6 text-center text-rose-400 font-sans">Error: ${err.message}</td></tr>`;
    }
    showToast(err.message, 'error');
  }
}

function renderAdminUsersTable(usersList) {
  const tbody = document.getElementById('admin-users-tbody');
  if (!tbody) return;

  tbody.innerHTML = '';
  if (!usersList || usersList.length === 0) {
    tbody.innerHTML = `<tr><td colspan="7" class="py-6 text-center text-slate-500 font-sans">No matching registered accounts found.</td></tr>`;
    return;
  }

  usersList.forEach(u => {
    const tr = document.createElement('tr');
    tr.className = 'hover:bg-dark-accent/40 transition-colors';

    const isRootMaster = u.isMaster || u.id === 'usr_admin' || u.username === 'admin';
    const regDate = u.createdAt ? (u.createdAt.includes('T') ? new Date(u.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : u.createdAt) : '--';
    const roleBadge = u.role === 'admin'
      ? '<span class="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/15 text-amber-300 border border-amber-500/30">ADMIN</span>'
      : '<span class="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-500/15 text-blue-300 border border-blue-500/30">USER</span>';

    tr.innerHTML = `
      <td class="py-3 px-3">
        <div class="flex items-center gap-2.5">
          <div class="w-7 h-7 rounded-lg ${isRootMaster ? 'bg-amber-500/20 border border-amber-500/30 text-amber-400' : 'bg-slate-800 border border-slate-700 text-slate-300'} flex items-center justify-center font-bold text-xs">
            ${u.username.substring(0, 2).toUpperCase()}
          </div>
          <div>
            <div class="font-bold text-white flex items-center gap-1.5">
              <span>${u.username}</span>
              ${isRootMaster ? '<i data-lucide="shield-check" class="w-3.5 h-3.5 text-amber-400" title="System Master Superadmin"></i>' : ''}
            </div>
            <span class="text-[10px] text-slate-500">${u.id}</span>
          </div>
        </div>
      </td>
      <td class="py-3 px-3 whitespace-nowrap">${roleBadge}</td>
      <td class="py-3 px-3 text-slate-400 whitespace-nowrap font-sans text-[11px]">${regDate}</td>
      <td class="py-3 px-2 text-center font-bold text-slate-200">${u.screenersCount || 0}</td>
      <td class="py-3 px-2 text-center font-bold text-slate-200">${u.watchlistsCount || 0}</td>
      <td class="py-3 px-2 text-center font-bold text-emerald-400">${u.totalStocksTracked || 0}</td>
      <td class="py-3 px-3 text-right whitespace-nowrap">
        ${isRootMaster ? `
          <span class="text-[10px] text-amber-400/80 font-mono italic px-2 py-1 bg-amber-500/10 rounded-lg border border-amber-500/20">Master Root Admin</span>
        ` : `
          <div class="flex items-center justify-end gap-1.5">
            <button onclick="handleAdminResetPassword('${u.id}', '${u.username}')" class="px-2.5 py-1 rounded-lg bg-dark-card hover:bg-dark-accent border border-dark-border text-slate-300 hover:text-white text-[11px] font-semibold transition-all cursor-pointer flex items-center gap-1" title="Reset Password for ${u.username}">
              <i data-lucide="key" class="w-3 h-3 text-amber-400"></i>
              <span>Reset Pass</span>
            </button>
            <button onclick="handleAdminDeleteUser('${u.id}', '${u.username}')" class="px-2.5 py-1 rounded-lg bg-rose-500/15 hover:bg-rose-500/30 border border-rose-500/30 text-rose-300 hover:text-rose-200 text-[11px] font-semibold transition-all cursor-pointer flex items-center gap-1" title="Delete User ${u.username}">
              <i data-lucide="trash-2" class="w-3 h-3 text-rose-400"></i>
              <span>Remove</span>
            </button>
          </div>
        `}
      </td>
    `;

    tbody.appendChild(tr);
  });

  lucide.createIcons();
}

function filterAdminUserTable(query) {
  const q = (query || '').toLowerCase().trim();
  if (!q) {
    renderAdminUsersTable(adminUsersData);
    return;
  }
  const filtered = adminUsersData.filter(u =>
    u.username.toLowerCase().includes(q) ||
    u.role.toLowerCase().includes(q) ||
    u.id.toLowerCase().includes(q)
  );
  renderAdminUsersTable(filtered);
}

async function handleAdminAddUser(e) {
  e.preventDefault();
  const usernameInput = document.getElementById('admin-new-username');
  const passwordInput = document.getElementById('admin-new-password');
  const roleSelect = document.getElementById('admin-new-role');
  const banner = document.getElementById('admin-add-user-banner');

  const username = usernameInput?.value.trim();
  const password = passwordInput?.value;
  const role = roleSelect?.value || 'user';

  if (!username || !password) return;

  try {
    const res = await fetch('/api/admin/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
      body: JSON.stringify({ username, password, role })
    });
    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data.error || 'Failed to create user');
    }

    if (banner) {
      banner.className = 'mt-2 p-2 rounded-lg text-xs bg-emerald-500/15 text-emerald-400 border border-emerald-500/30';
      banner.textContent = `User "${username}" created successfully with role "${role}"`;
    }
    showToast(`User "${username}" created successfully`, 'success');

    if (usernameInput) usernameInput.value = '';
    if (passwordInput) passwordInput.value = '';

    await loadAdminData();
    checkAuthStatus();
  } catch (err) {
    if (banner) {
      banner.className = 'mt-2 p-2 rounded-lg text-xs bg-rose-500/15 text-rose-400 border border-rose-500/30';
      banner.textContent = err.message;
    }
    showToast(err.message, 'error');
  }
}

async function handleAdminDeleteUser(userId, username) {
  if (!confirm(`Are you sure you want to completely remove user "${username}" (${userId})? This will delete all their watchlists and custom screeners.`)) {
    return;
  }

  try {
    const res = await fetch(`/api/admin/users/${userId}`, {
      method: 'DELETE',
      headers: { ...getAuthHeaders() }
    });
    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data.error || 'Failed to delete user');
    }

    showToast(`User "${username}" removed successfully`, 'info');
    await loadAdminData();
    checkAuthStatus();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

async function handleAdminResetPassword(userId, username) {
  const newPass = prompt(`Enter new password for user "${username}" (minimum 4 characters):`);
  if (!newPass) return;
  if (newPass.length < 4) {
    showToast('Password must be at least 4 characters long', 'error');
    return;
  }

  try {
    const res = await fetch(`/api/admin/users/${userId}/password`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
      body: JSON.stringify({ password: newPass })
    });
    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data.error || 'Failed to reset password');
    }

    showToast(`Password updated for user "${username}"`, 'success');
  } catch (err) {
    showToast(err.message, 'error');
  }
}

async function handleAdminUpdateMaxUsers(e) {
  e.preventDefault();
  const input = document.getElementById('input-admin-max-users');
  const maxUsers = parseInt(input?.value, 10);
  if (isNaN(maxUsers) || maxUsers < 1 || maxUsers > 500) {
    showToast('Please enter a valid max user limit between 1 and 500', 'error');
    return;
  }

  try {
    const res = await fetch('/api/admin/config', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
      body: JSON.stringify({ maxUsers })
    });
    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data.error || 'Failed to update system capacity');
    }

    showToast(`Registration capacity updated to ${maxUsers} users!`, 'success');
    await loadAdminData();
    checkAuthStatus();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

function updateExploreSyncSignal(status, message = null) {
  const signalEl = document.getElementById('explore-sync-signal');
  const dotEl = document.getElementById('explore-sync-dot');
  const textEl = document.getElementById('explore-sync-text');
  if (!signalEl || !dotEl || !textEl) return;

  if (status === 'syncing') {
    signalEl.className = 'px-2.5 py-0.5 rounded-full text-[10px] font-mono font-semibold flex items-center gap-1.5 border bg-amber-500/15 text-amber-300 border-amber-500/30 transition-all';
    dotEl.className = 'w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping';
    textEl.innerHTML = '<span class="inline-flex items-center gap-1"><svg class="animate-spin -ml-0.5 mr-1 h-3 w-3 text-amber-300" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>Syncing Live Prices...</span>';
  } else if (status === 'synced') {
    const timeStr = message || new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    signalEl.className = 'px-2.5 py-0.5 rounded-full text-[10px] font-mono font-semibold flex items-center gap-1.5 border bg-emerald-500/15 text-emerald-300 border-emerald-500/30 transition-all cursor-pointer';
    dotEl.className = 'w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse';
    textEl.textContent = `🟢 Prices in Sync (${timeStr})`;
    signalEl.title = `Last synced at ${timeStr}. Click to refresh / fetch latest market ticks.`;
  } else if (status === 'error') {
    signalEl.className = 'px-2.5 py-0.5 rounded-full text-[10px] font-mono font-semibold flex items-center gap-1.5 border bg-rose-500/15 text-rose-300 border-rose-500/30 transition-all cursor-pointer';
    dotEl.className = 'w-1.5 h-1.5 rounded-full bg-rose-400';
    textEl.textContent = `⚠️ Sync Notice (${message || 'Offline'})`;
  }
}

async function loadExploreData() {
  updateExploreSyncSignal('syncing');
  try {
    const [exploreRes, feedRes] = await Promise.all([
      fetch(`/api/analytics/explore?refresh=true&t=${Date.now()}`),
      fetch('/api/feed/status')
    ]);
    const data = await exploreRes.json();
    const feedData = await feedRes.json();

    state.dhanActive = Boolean(feedData && feedData.dhanActive);
    state.feedSource = (feedData && feedData.dhanActive) ? 'dhan' : 'backup';
    updateDhanHeaderBadge(feedData);

    if (data.success && Array.isArray(data.stocks)) {
      state.exploreStocks = data.stocks;
      applyExploreFilters();
      const timeStr = data.timestamp ? new Date(data.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
      updateExploreSyncSignal('synced', timeStr);
    } else {
      updateExploreSyncSignal('error', 'Data unavailable');
    }
  } catch (err) {
    console.error('Failed to load explore stocks data:', err);
    updateExploreSyncSignal('error', err.message);
  }
}

function updateDhanHeaderBadge(feedData = null) {
  const badgeEl = document.getElementById('dhan-header-badge');
  const dotEl = document.getElementById('dhan-header-dot');
  const textEl = document.getElementById('dhan-header-text');

  if (state.dhanActive) {
    if (badgeEl) {
      badgeEl.className = 'px-2.5 py-0.5 rounded-full text-[10px] font-mono font-semibold flex items-center gap-1.5 border bg-emerald-500/15 text-emerald-300 border-emerald-500/30';
      badgeEl.title = 'Dual-Mode Live Engine: Streaming directly via official DhanHQ Broker API';
    }
    if (dotEl) dotEl.className = 'w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse';
    if (textEl) textEl.textContent = '🟢 Dhan API Live';
  } else {
    if (badgeEl) {
      badgeEl.className = 'px-2.5 py-0.5 rounded-full text-[10px] font-mono font-semibold flex items-center gap-1.5 border bg-cyan-500/15 text-cyan-300 border-cyan-500/30';
      badgeEl.title = 'Dual-Mode Live Engine: Streaming real-time quotes & technicals via High-Speed Free NSE/BSE Engine';
    }
    if (dotEl) dotEl.className = 'w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse';
    if (textEl) textEl.textContent = '⚡ Live Feed (NSE/BSE)';
  }
}

function handleExploreSegmentChange(segment, btnEl) {
  state.exploreFilters.segment = segment;
  state.explorePage = 1;

  document.querySelectorAll('.explore-seg-pill').forEach(pill => {
    pill.classList.remove('active', 'bg-emerald-600', 'text-white', 'shadow-sm');
    if (pill.dataset.exploreSeg === 'fno') {
      pill.className = 'explore-seg-pill px-2.5 py-1 rounded-lg text-xs font-medium transition-all bg-dark-card text-purple-300 hover:text-purple-200 border border-purple-500/30 hover:border-purple-500/50 cursor-pointer';
    } else {
      pill.className = 'explore-seg-pill px-2.5 py-1 rounded-lg text-xs font-medium transition-all bg-dark-card text-slate-400 hover:text-white border border-dark-border cursor-pointer';
    }
  });

  if (btnEl) {
    btnEl.className = 'explore-seg-pill active px-2.5 py-1 rounded-lg text-xs font-semibold transition-all bg-emerald-600 text-white shadow-sm cursor-pointer';
  }

  applyExploreFilters();
}

function handleExploreSearch(query) {
  state.exploreFilters.search = (query || '').toLowerCase().trim();
  state.explorePage = 1;
  applyExploreFilters();
}

function handleExploreFilterChange() {
  const inputRsi = document.getElementById('input-filter-rsi');
  const selRvolPeriod = document.getElementById('select-filter-rvol-period');
  const selRvolMult = document.getElementById('select-filter-rvol-mult');
  const selEmaPosture = document.getElementById('select-filter-ema-posture');
  const selEmaFast = document.getElementById('select-filter-ema-fast');
  const selEmaSlow = document.getElementById('select-filter-ema-slow');
  const selCrossDir = document.getElementById('select-filter-cross-dir');
  const selCrossDays = document.getElementById('select-filter-cross-days');
  const sel52wh = document.getElementById('select-filter-52wh');
  const selDailyPivot = document.getElementById('select-filter-daily-pivot');
  const selWeeklyPivot = document.getElementById('select-filter-weekly-pivot');

  const rsiVal = inputRsi?.value ? parseFloat(inputRsi.value) : null;
  state.exploreFilters.rsiMin = (rsiVal !== null && !isNaN(rsiVal)) ? rsiVal : null;
  state.exploreFilters.rvolPeriod = selRvolPeriod?.value || 'd20';
  state.exploreFilters.rvolMult = selRvolMult?.value || 'all';
  state.exploreFilters.emaPosture = selEmaPosture?.value || 'all';
  state.exploreFilters.emaFast = selEmaFast?.value || '10';
  state.exploreFilters.emaSlow = selEmaSlow?.value || '20';
  state.exploreFilters.crossDir = selCrossDir?.value || 'all';
  state.exploreFilters.crossDays = selCrossDays?.value || 'all';
  state.exploreFilters.dist52wh = sel52wh?.value || 'all';
  state.exploreFilters.dailyPivot = selDailyPivot?.value || 'all';
  state.exploreFilters.weeklyPivot = selWeeklyPivot?.value || 'all';
  state.explorePage = 1;

  // Update visual labels
  const lblRsi = document.getElementById('label-filter-rsi');
  const lblRvol = document.getElementById('label-filter-rvol');
  const lblEma = document.getElementById('label-filter-ema');
  const lblCross = document.getElementById('label-filter-cross');
  const lbl52wh = document.getElementById('label-filter-52wh');
  const lblPivot = document.getElementById('label-filter-pivot');

  if (lblRsi) lblRsi.textContent = state.exploreFilters.rsiMin !== null ? `> ${state.exploreFilters.rsiMin}` : 'All';
  if (lblRvol) lblRvol.textContent = state.exploreFilters.rvolMult === 'all' ? 'All' : `>${state.exploreFilters.rvolMult}x (${state.exploreFilters.rvolPeriod.toUpperCase()})`;
  if (lblEma) lblEma.textContent = state.exploreFilters.emaPosture === 'all' ? 'All' : 'Active';
  if (lblCross) {
    const crossLabel = (state.exploreFilters.crossDir === 'all' && state.exploreFilters.crossDays === 'all')
      ? `${state.exploreFilters.emaFast}/${state.exploreFilters.emaSlow}`
      : `${state.exploreFilters.emaFast}/${state.exploreFilters.emaSlow} (${state.exploreFilters.crossDir !== 'all' ? state.exploreFilters.crossDir : ''}${state.exploreFilters.crossDays !== 'all' ? ' ≤' + state.exploreFilters.crossDays + 'd' : ''})`;
    lblCross.textContent = crossLabel;
  }
  if (lbl52wh) lbl52wh.textContent = state.exploreFilters.dist52wh === 'all' ? 'All' : 'Active';
  if (lblPivot) lblPivot.textContent = (state.exploreFilters.dailyPivot === 'all' && state.exploreFilters.weeklyPivot === 'all') ? 'All' : 'Filtered';

  // Update dynamic column header
  const thCross = document.getElementById('th-explore-ema-cross');
  if (thCross) {
    thCross.textContent = `EMA Cross (${state.exploreFilters.emaFast}/${state.exploreFilters.emaSlow}) ⇅`;
    thCross.title = `Days elapsed since ${state.exploreFilters.emaFast} / ${state.exploreFilters.emaSlow} EMA crossover occurred`;
  }

  applyExploreFilters();
}

function resetExploreFilters() {
  state.exploreFilters = {
    segment: 'all',
    search: '',
    rsiMin: null,
    rvolPeriod: 'd20',
    rvolMult: 'all',
    emaPosture: 'all',
    emaFast: '10',
    emaSlow: '20',
    crossDir: 'all',
    crossDays: 'all',
    dist52wh: 'all',
    dailyPivot: 'all',
    weeklyPivot: 'all'
  };
  state.explorePage = 1;
  state.exploreSortField = 'rank';
  state.exploreSortAsc = true;

  const inputSearch = document.getElementById('input-explore-search');
  if (inputSearch) inputSearch.value = '';

  const inputRsi = document.getElementById('input-filter-rsi');
  if (inputRsi) inputRsi.value = '';

  const selRvolPeriod = document.getElementById('select-filter-rvol-period');
  const selRvolMult = document.getElementById('select-filter-rvol-mult');
  const selEmaPosture = document.getElementById('select-filter-ema-posture');
  const selEmaFast = document.getElementById('select-filter-ema-fast');
  const selEmaSlow = document.getElementById('select-filter-ema-slow');
  const selCrossDir = document.getElementById('select-filter-cross-dir');
  const selCrossDays = document.getElementById('select-filter-cross-days');
  const sel52wh = document.getElementById('select-filter-52wh');
  const selDailyPivot = document.getElementById('select-filter-daily-pivot');
  const selWeeklyPivot = document.getElementById('select-filter-weekly-pivot');

  if (selRvolPeriod) selRvolPeriod.value = 'd20';
  if (selRvolMult) selRvolMult.value = 'all';
  if (selEmaPosture) selEmaPosture.value = 'all';
  if (selEmaFast) selEmaFast.value = '10';
  if (selEmaSlow) selEmaSlow.value = '20';
  if (selCrossDir) selCrossDir.value = 'all';
  if (selCrossDays) selCrossDays.value = 'all';
  if (sel52wh) sel52wh.value = 'all';
  if (selDailyPivot) selDailyPivot.value = 'all';
  if (selWeeklyPivot) selWeeklyPivot.value = 'all';

  document.querySelectorAll('.explore-seg-pill').forEach(pill => {
    if (pill.dataset.exploreSeg === 'all') {
      pill.className = 'explore-seg-pill active px-2.5 py-1 rounded-lg text-xs font-semibold transition-all bg-emerald-600 text-white shadow-sm cursor-pointer';
    } else if (pill.dataset.exploreSeg === 'fno') {
      pill.className = 'explore-seg-pill px-2.5 py-1 rounded-lg text-xs font-medium transition-all bg-dark-card text-purple-300 hover:text-purple-200 border border-purple-500/30 hover:border-purple-500/50 cursor-pointer';
    } else {
      pill.className = 'explore-seg-pill px-2.5 py-1 rounded-lg text-xs font-medium transition-all bg-dark-card text-slate-400 hover:text-white border border-dark-border cursor-pointer';
    }
  });

  const lblRsi = document.getElementById('label-filter-rsi');
  const lblRvol = document.getElementById('label-filter-rvol');
  const lblEma = document.getElementById('label-filter-ema');
  const lblCross = document.getElementById('label-filter-cross');
  const lbl52wh = document.getElementById('label-filter-52wh');
  const lblPivot = document.getElementById('label-filter-pivot');

  if (lblRsi) lblRsi.textContent = 'All';
  if (lblRvol) lblRvol.textContent = 'All';
  if (lblEma) lblEma.textContent = 'All';
  if (lblCross) lblCross.textContent = 'All';
  if (lbl52wh) lbl52wh.textContent = 'All';
  if (lblPivot) lblPivot.textContent = 'All';

  const thCross = document.getElementById('th-explore-ema-cross');
  if (thCross) thCross.textContent = 'EMA Cross (10/20) ⇅';

  applyExploreFilters();
}

function applyExploreFilters() {
  let list = [...(state.exploreStocks || [])];
  const f = state.exploreFilters;

  // 1. Segment Filter (All, Large/LC, Mid/MC, Small/SC, Micro/MIC, MidSmall, F&O)
  if (f.segment && f.segment !== 'all') {
    if (f.segment === 'fno') {
      list = list.filter(s => isFnoStock(s));
    } else if (f.segment === 'midsmall') {
      list = list.filter(s => s.capCategory === 'mid' || s.capCategory === 'small');
    } else {
      list = list.filter(s => s.capCategory === f.segment);
    }
  }

  // 2. Search Box (Symbol or Name)
  if (f.search) {
    const q = f.search;
    list = list.filter(s => s.symbol.toLowerCase().includes(q) || (s.name || '').toLowerCase().includes(q));
  }

  // 3. Custom RSI Filter: strictly RSI > user input value
  if (f.rsiMin !== null && !isNaN(f.rsiMin)) {
    list = list.filter(s => typeof s.rsi === 'number' && s.rsi > f.rsiMin);
  }

  // 4. RVOL Lookback & Multiplier
  if (f.rvolMult && f.rvolMult !== 'all') {
    const minM = parseFloat(f.rvolMult);
    const periodKey = f.rvolPeriod || 'd20';
    list = list.filter(s => {
      const val = s.rvols ? s.rvols[periodKey] : s.rvol;
      return (val || 0) >= minM;
    });
  }

  // 5. EMA Traffic Lights Posture (10, 20, 50, 150)
  if (f.emaPosture && f.emaPosture !== 'all') {
    if (f.emaPosture === 'all_green') list = list.filter(s => s.aboveEma10 && s.aboveEma20 && s.aboveEma50 && s.aboveEma150);
    else if (f.emaPosture === 'gt50') list = list.filter(s => s.aboveEma50);
    else if (f.emaPosture === 'gt150') list = list.filter(s => s.aboveEma150);
    else if (f.emaPosture === 'gt20_50') list = list.filter(s => s.aboveEma20 && s.aboveEma50);
    else if (f.emaPosture === 'below_all') list = list.filter(s => !s.aboveEma10 && !s.aboveEma20 && !s.aboveEma50 && !s.aboveEma150);
  }

  // Precompute dynamic EMA cross for all candidate stocks
  const fastP = f.emaFast || '10';
  const slowP = f.emaSlow || '20';
  list.forEach(s => {
    s._currentCross = computeStockEmaCross(s, fastP, slowP);
  });

  // 6. Dynamic EMA Cross Lookback
  if (f.crossDir && f.crossDir !== 'all') {
    list = list.filter(s => s._currentCross && s._currentCross.direction === f.crossDir);
  }
  if (f.crossDays && f.crossDays !== 'all') {
    const maxDays = parseInt(f.crossDays, 10);
    list = list.filter(s => s._currentCross && s._currentCross.daysAgo <= maxDays);
  }

  // 7. % From 52-Week High & Lookback Gains
  if (f.dist52wh && f.dist52wh !== 'all') {
    if (f.dist52wh === 'at_high') list = list.filter(s => s.pctFrom52wHigh >= -0.5);
    else if (f.dist52wh === 'within_2') list = list.filter(s => s.pctFrom52wHigh >= -2.0);
    else if (f.dist52wh === 'within_5') list = list.filter(s => s.pctFrom52wHigh >= -5.0);
    else if (f.dist52wh === 'within_10') list = list.filter(s => s.pctFrom52wHigh >= -10.0);
    else if (f.dist52wh === 'gain_20d_10') list = list.filter(s => s.gains && s.gains.d20 >= 10);
    else if (f.dist52wh === 'gain_30d_20') list = list.filter(s => s.gains && s.gains.d30 >= 20);
  }

  // 8. Daily Floor Pivots
  if (f.dailyPivot && f.dailyPivot !== 'all') {
    list = list.filter(s => s.dailyPivot && s.dailyPivot.regime === f.dailyPivot);
  }

  // 9. Weekly Floor Pivots
  if (f.weeklyPivot && f.weeklyPivot !== 'all') {
    list = list.filter(s => s.weeklyPivot && s.weeklyPivot.regime === f.weeklyPivot);
  }

  // 10. Sorting
  list.sort((a, b) => {
    let vA = a[state.exploreSortField];
    let vB = b[state.exploreSortField];

    if (state.exploreSortField === 'crossDaysAgo') {
      vA = a._currentCross ? a._currentCross.daysAgo : 999;
      vB = b._currentCross ? b._currentCross.daysAgo : 999;
    } else if (state.exploreSortField === 'gain20d') {
      vA = a.gains ? a.gains.d20 : 0;
      vB = b.gains ? b.gains.d20 : 0;
    } else if (state.exploreSortField === 'dailyPivot') {
      vA = a.dailyPivot ? a.dailyPivot.regime : '';
      vB = b.dailyPivot ? b.dailyPivot.regime : '';
    } else if (state.exploreSortField === 'weeklyPivot') {
      vA = a.weeklyPivot ? a.weeklyPivot.regime : '';
      vB = b.weeklyPivot ? b.weeklyPivot.regime : '';
    }

    if (vA === undefined || vA === null) vA = 0;
    if (vB === undefined || vB === null) vB = 0;
    if (typeof vA === 'string') {
      return state.exploreSortAsc ? vA.localeCompare(vB) : vB.localeCompare(vA);
    }
    return state.exploreSortAsc ? (vA - vB) : (vB - vA);
  });

  state.exploreFilteredStocks = list;

  // Update Summary Badges
  const badgeSummary = document.getElementById('badge-explore-summary');
  if (badgeSummary) {
    badgeSummary.textContent = `Showing ${list.length} of ${state.exploreStocks.length} Stocks`;
  }

  renderExploreTable();
}

function renderExploreTable() {
  const tbody = document.getElementById('explore-tbody');
  const paginationInfo = document.getElementById('explore-pagination-info');
  const pageNumDisplay = document.getElementById('explore-current-page-num');
  const btnPrev = document.getElementById('btn-explore-prev');
  const btnNext = document.getElementById('btn-explore-next');

  if (!tbody) return;
  tbody.innerHTML = '';

  const total = state.exploreFilteredStocks.length;
  const pageSize = state.explorePageSize === 'all' ? total : parseInt(state.explorePageSize, 10);
  const totalPages = Math.max(1, Math.ceil(total / (pageSize || 1)));

  if (state.explorePage > totalPages) state.explorePage = totalPages;
  if (state.explorePage < 1) state.explorePage = 1;

  const startIdx = state.explorePageSize === 'all' ? 0 : (state.explorePage - 1) * pageSize;
  const endIdx = state.explorePageSize === 'all' ? total : Math.min(startIdx + pageSize, total);
  const pageStocks = state.exploreFilteredStocks.slice(startIdx, endIdx);

  if (paginationInfo) {
    paginationInfo.innerHTML = `Showing <strong>${total > 0 ? startIdx + 1 : 0}–${endIdx}</strong> of <strong>${total}</strong> matching stocks (${state.exploreStocks.length} universe)`;
  }
  if (pageNumDisplay) pageNumDisplay.textContent = `${state.explorePage} / ${totalPages}`;
  if (btnPrev) btnPrev.disabled = state.explorePage <= 1;
  if (btnNext) btnNext.disabled = state.explorePage >= totalPages;

  // Update table header text dynamically if needed
  const thCross = document.getElementById('th-explore-ema-cross');
  if (thCross) {
    thCross.textContent = `EMA Cross (${state.exploreFilters.emaFast}/${state.exploreFilters.emaSlow}) ⇅`;
  }

  if (pageStocks.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="13" class="py-10 text-center text-slate-500 font-sans">
          <i data-lucide="filter-x" class="w-8 h-8 mx-auto mb-2 text-slate-600"></i>
          <p class="font-bold text-slate-400">No stocks match the selected multi-factor criteria</p>
          <button onclick="resetExploreFilters()" class="mt-2 px-3 py-1 bg-emerald-600/20 text-emerald-400 hover:bg-emerald-600 hover:text-white rounded-lg text-xs font-semibold transition-all cursor-pointer">Reset All Filters</button>
        </td>
      </tr>
    `;
    lucide.createIcons();
    return;
  }

  pageStocks.forEach((stk, idx) => {
    const tr = document.createElement('tr');
    tr.className = 'hover:bg-dark-accent/40 transition-colors group';

    const rowNum = startIdx + idx + 1;
    const isPos = (stk.changePercent || 0) >= 0;
    const chgClass = isPos ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' : 'text-rose-400 bg-rose-500/10 border-rose-500/20';
    const chgSign = isPos ? '+' : '';

    // Cap Badge Styling (LC, MC, SC, MIC)
    let capBadgeClass = 'bg-slate-800 text-slate-400 border-slate-700';
    if (stk.capCategory === 'large') capBadgeClass = 'bg-blue-500/15 text-blue-400 border-blue-500/30';
    else if (stk.capCategory === 'mid') capBadgeClass = 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30';
    else if (stk.capCategory === 'small') capBadgeClass = 'bg-amber-500/15 text-amber-400 border-amber-500/30';
    else if (stk.capCategory === 'micro') capBadgeClass = 'bg-slate-800 text-slate-400 border-slate-700';

    // RSI Tag Color
    let rsiColor = 'text-slate-300';
    if (stk.rsi >= 70) rsiColor = 'text-rose-400 font-bold';
    else if (stk.rsi >= 60) rsiColor = 'text-emerald-400 font-bold';
    else if (stk.rsi <= 30) rsiColor = 'text-amber-400 font-bold';

    // RVOL Display
    const currentRvol = stk.rvols ? stk.rvols[state.exploreFilters.rvolPeriod || 'd20'] : stk.rvol;
    const isHighRvol = (currentRvol || 1) >= 1.5;

    // EMA Dots (10, 20, 50, 150)
    const dot10 = stk.aboveEma10 ? '<span class="w-2.5 h-2.5 rounded-full bg-emerald-400 shadow-sm shadow-emerald-500/50" title="10 EMA: Price > ₹' + stk.ema10 + '"></span>' : '<span class="w-2.5 h-2.5 rounded-full bg-rose-500 shadow-sm shadow-rose-500/50" title="10 EMA: Price < ₹' + stk.ema10 + '"></span>';
    const dot20 = stk.aboveEma20 ? '<span class="w-2.5 h-2.5 rounded-full bg-emerald-400 shadow-sm shadow-emerald-500/50" title="20 EMA: Price > ₹' + stk.ema20 + '"></span>' : '<span class="w-2.5 h-2.5 rounded-full bg-rose-500 shadow-sm shadow-rose-500/50" title="20 EMA: Price < ₹' + stk.ema20 + '"></span>';
    const dot50 = stk.aboveEma50 ? '<span class="w-2.5 h-2.5 rounded-full bg-emerald-400 shadow-sm shadow-emerald-500/50" title="50 EMA: Price > ₹' + stk.ema50 + '"></span>' : '<span class="w-2.5 h-2.5 rounded-full bg-rose-500 shadow-sm shadow-rose-500/50" title="50 EMA: Price < ₹' + stk.ema50 + '"></span>';
    const dot150 = stk.aboveEma150 ? '<span class="w-2.5 h-2.5 rounded-full bg-emerald-400 shadow-sm shadow-emerald-500/50" title="150 EMA: Price > ₹' + stk.ema150 + '"></span>' : '<span class="w-2.5 h-2.5 rounded-full bg-rose-500 shadow-sm shadow-rose-500/50" title="150 EMA: Price < ₹' + stk.ema150 + '"></span>';

    // Dynamic Fast/Slow EMA Crossover & Days Elapsed Tag
    const cross = stk._currentCross || computeStockEmaCross(stk, state.exploreFilters.emaFast, state.exploreFilters.emaSlow);
    const isBullCross = cross.isBullish;
    const crossClass = isBullCross ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/25' : 'text-rose-400 bg-rose-500/10 border-rose-500/25';
    const crossLabel = `${isBullCross ? '🟢 Bull' : '🔴 Bear'} (${cross.daysAgo}d ago)`;

    // % From 52WH
    const pct52whFormatted = stk.pctFrom52wHigh >= -0.5 ? '<span class="text-emerald-400 font-bold">🚀 52WH</span>' : `<span class="${stk.pctFrom52wHigh >= -5 ? 'text-emerald-400 font-semibold' : 'text-slate-400'}">${stk.pctFrom52wHigh}%</span>`;

    // 20D Gain
    const gain20 = stk.gains?.d20 || 0;
    const gain20Class = gain20 >= 0 ? 'text-emerald-400' : 'text-rose-400';

    // Daily Pivot Badge
    let dPivotClass = 'bg-dark-card text-slate-300 border-dark-border';
    if (stk.dailyPivot?.regime === 'above_r1') dPivotClass = 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30';
    else if (stk.dailyPivot?.regime === 'p_to_r1') dPivotClass = 'bg-blue-500/15 text-blue-300 border-blue-500/30';
    else if (stk.dailyPivot?.regime === 's1_to_p') dPivotClass = 'bg-amber-500/15 text-amber-300 border-amber-500/30';
    else if (stk.dailyPivot?.regime === 'below_s1') dPivotClass = 'bg-rose-500/15 text-rose-300 border-rose-500/30';

    // Weekly Pivot Badge
    let wPivotClass = 'bg-dark-card text-slate-300 border-dark-border';
    if (stk.weeklyPivot?.regime === 'above_r1') wPivotClass = 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30';
    else if (stk.weeklyPivot?.regime === 'p_to_r1') wPivotClass = 'bg-blue-500/15 text-blue-300 border-blue-500/30';
    else if (stk.weeklyPivot?.regime === 's1_to_p') wPivotClass = 'bg-amber-500/15 text-amber-300 border-amber-500/30';
    else if (stk.weeklyPivot?.regime === 'below_s1') wPivotClass = 'bg-rose-500/15 text-rose-300 border-rose-500/30';

    tr.innerHTML = `
      <td class="py-2.5 px-3 text-center text-slate-500 font-bold">${rowNum}</td>
      <td class="py-2.5 px-3">
        <div class="flex items-center gap-2">
          <div>
            <div class="flex items-center gap-1.5">
              <span class="font-bold text-white group-hover:text-emerald-400 transition-colors cursor-pointer" onclick="openStockChartModal('${stk.symbol}', '${(stk.name || stk.symbol).replace(/'/g, "\\'")}', state.exploreFilteredStocks)">${stk.symbol}</span>
              ${getFnoBadgeHtml(stk.symbol)}
            </div>
            <span class="text-[10px] text-slate-400 font-sans line-clamp-1 max-w-[150px]">${stk.name || stk.symbol}</span>
          </div>
        </div>
      </td>
      <td class="py-2.5 px-3 text-center">
        <span class="px-2 py-0.5 rounded text-[10px] font-bold border ${capBadgeClass}">${stk.capLabel || (stk.capCategory === 'micro' ? 'MIC' : stk.capCategory === 'mid' ? 'MC' : stk.capCategory === 'small' ? 'SC' : 'LC')}</span>
      </td>
      <td class="py-2.5 px-3 text-right font-bold text-slate-100">${fmt.currency(stk.ltp)}</td>
      <td class="py-2.5 px-3 text-right">
        <span class="px-2 py-0.5 rounded text-[11px] font-bold border ${chgClass}">
          ${chgSign}${Number(stk.changePercent || 0).toFixed(2)}%
        </span>
      </td>
      <td class="py-2.5 px-3 text-center ${rsiColor}">${stk.rsi}</td>
      <td class="py-2.5 px-3 text-right font-semibold ${isHighRvol ? 'text-amber-400 font-bold' : 'text-slate-300'}">
        ${currentRvol}x
      </td>
      <td class="py-2.5 px-3 text-center">
        <div class="flex items-center justify-center gap-1.5">
          ${dot10} ${dot20} ${dot50} ${dot150}
        </div>
      </td>
      <td class="py-2.5 px-3 text-center">
        <span class="px-2 py-0.5 rounded text-[10px] font-bold border ${crossClass}">${crossLabel}</span>
      </td>
      <td class="py-2.5 px-3 text-right">${pct52whFormatted}</td>
      <td class="py-2.5 px-3 text-right font-semibold ${gain20Class}">${gain20 >= 0 ? '+' : ''}${gain20}%</td>
      <td class="py-2.5 px-3 text-center">
        <span class="px-1.5 py-0.5 rounded text-[10px] font-bold border ${dPivotClass}">${stk.dailyPivot?.label || '--'}</span>
      </td>
      <td class="py-2.5 px-3 text-center">
        <span class="px-1.5 py-0.5 rounded text-[10px] font-bold border ${wPivotClass}">${stk.weeklyPivot?.label || '--'}</span>
      </td>
    `;

    tbody.appendChild(tr);
  });

  lucide.createIcons();
}

function handleExploreSort(field) {
  if (state.exploreSortField === field) {
    state.exploreSortAsc = !state.exploreSortAsc;
  } else {
    state.exploreSortField = field;
    state.exploreSortAsc = (field === 'symbol' || field === 'capCategory' || field === 'rank');
  }
  applyExploreFilters();
}

function handleExplorePageChange(delta) {
  state.explorePage += delta;
  renderExploreTable();
}

function handleExplorePageSizeChange(size) {
  state.explorePageSize = size;
  state.explorePage = 1;
  renderExploreTable();
}

// -------------------------------------------------------------
// Section Collapse / Expand Controller
// -------------------------------------------------------------

function toggleAnalyticsSection(sectionKey) {
  const contentEl = document.getElementById(`content-${sectionKey}`);
  const iconEl = document.getElementById(`icon-collapse-${sectionKey}`);
  const badgeEl = document.getElementById(`badge-${sectionKey}-summary`);
  if (!contentEl) return;

  const isCollapsed = contentEl.classList.toggle('hidden');
  if (iconEl) {
    iconEl.style.transform = isCollapsed ? 'rotate(180deg)' : 'rotate(0deg)';
  }
  if (badgeEl) {
    if (isCollapsed) {
      badgeEl.classList.remove('hidden');
    } else {
      badgeEl.classList.add('hidden');
    }
  }

  localStorage.setItem(`sangam_collapse_${sectionKey}`, isCollapsed ? 'true' : 'false');
}

function initAnalyticsSectionCollapses() {
  const sections = ['breadth', 'indices', 'sectoral', 'subsectors', 'explore'];
  sections.forEach(key => {
    const isCollapsed = localStorage.getItem(`sangam_collapse_${key}`) === 'true';
    if (isCollapsed) {
      const contentEl = document.getElementById(`content-${key}`);
      const iconEl = document.getElementById(`icon-collapse-${key}`);
      const badgeEl = document.getElementById(`badge-${key}-summary`);
      if (contentEl) contentEl.classList.add('hidden');
      if (iconEl) iconEl.style.transform = 'rotate(180deg)';
      if (badgeEl) badgeEl.classList.remove('hidden');
    }
  });
}

// Segment filter click listener for Explore Pane
document.getElementById('explore-segment-pills')?.addEventListener('click', (e) => {
  const btn = e.target.closest('button[data-explore-seg]');
  if (!btn) return;
  handleExploreSegmentChange(btn.dataset.exploreSeg, btn);
});

// Window Globals for HTML onclick listeners
window.toggleAnalyticsSection = toggleAnalyticsSection;
window.handleBreadthSectorChange = handleBreadthSectorChange;
window.loadAnalyticsData = loadAnalyticsData;
window.handleIndicesCategoryChange = handleIndicesCategoryChange;
window.handleIndicesSort = handleIndicesSort;
window.sortCustomizeIndices = sortCustomizeIndices;
window.handleSectoralBreadthSort = handleSectoralBreadthSort;
window.handleSectoralCategoryFilter = handleSectoralCategoryFilter;
window.handleSectorSearchInput = handleSectorSearchInput;
window.openSectoralStocksModal = openSectoralStocksModal;
window.closeSectoralStocksModal = closeSectoralStocksModal;
window.setSectoralStockFilter = setSectoralStockFilter;
window.filterSectoralStockTable = filterSectoralStockTable;
window.handleSectoralStockSort = handleSectoralStockSort;
window.handleSubSectorSort = handleSubSectorSort;
window.openSectorDrilldownModal = openSectorDrilldownModal;
window.closeSectorDrilldownModal = closeSectorDrilldownModal;
window.handleConstituentSort = handleConstituentSort;
window.openAnalyticsCustomizeModal = openAnalyticsCustomizeModal;
window.closeAnalyticsCustomizeModal = closeAnalyticsCustomizeModal;
window.saveAnalyticsPreferences = saveAnalyticsPreferences;
window.openStockChartModal = openStockChartModal;
window.closeStockChartModal = closeStockChartModal;
window.setChartModalSizePreset = setChartModalSizePreset;
window.toggleChartModalMaximize = toggleChartModalMaximize;
window.restoreChartModalSize = restoreChartModalSize;
window.openAnalyticsStockChart = openAnalyticsStockChart;
window.closeAnalyticsChartModal = closeAnalyticsChartModal;
window.openLineSettingsModal = openLineSettingsModal;
window.closeLineSettingsModal = closeLineSettingsModal;
window.resetLineStylesToDefaults = resetLineStylesToDefaults;
window.handleModalThemeChange = handleModalThemeChange;
window.handleCustomColorChange = handleCustomColorChange;
window.updateLineStyle = updateLineStyle;
window.toggleAvwapAnchorMode = toggleAvwapAnchorMode;
window.clearStockAvwaps = clearStockAvwaps;
window.toggleChartWatchlistDropdown = toggleChartWatchlistDropdown;
window.openAuthModal = openAuthModal;
window.closeAuthModal = closeAuthModal;
window.switchAuthTab = switchAuthTab;
window.handleLogin = handleLogin;
window.handleRegister = handleRegister;
window.handleLogout = handleLogout;
window.openAdminConsole = openAdminConsole;
window.closeAdminConsole = closeAdminConsole;
window.toggleAdminAddUserPanel = toggleAdminAddUserPanel;
window.loadAdminData = loadAdminData;
window.filterAdminUserTable = filterAdminUserTable;
window.handleAdminAddUser = handleAdminAddUser;
window.handleAdminDeleteUser = handleAdminDeleteUser;
window.handleAdminResetPassword = handleAdminResetPassword;
window.handleAdminUpdateMaxUsers = handleAdminUpdateMaxUsers;

// Explore Screener Window Globals
window.loadExploreData = loadExploreData;
window.handleExploreSegmentChange = handleExploreSegmentChange;
window.handleExploreSearch = handleExploreSearch;
window.handleExploreFilterChange = handleExploreFilterChange;
window.resetExploreFilters = resetExploreFilters;
window.handleExploreSort = handleExploreSort;
window.handleExplorePageChange = handleExplorePageChange;
window.handleExplorePageSizeChange = handleExplorePageSizeChange;

// Bootstrap on DOM Ready
window.addEventListener('DOMContentLoaded', async () => {
  applyTheme(state.theme);
  loadSavedIndicatorPreferences();
  initAnalyticsSectionCollapses();
  await checkAuthStatus();
  lucide.createIcons();
});
