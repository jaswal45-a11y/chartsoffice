/**
 * Sangam_charts - Client Application Logic
 * Featuring:
 * - 3 Distinct, Unmixed Panes: Price, Dedicated Volume + 9 SMA, Dedicated RSI (14) + 14 SMA
 * - Traditional Auto Pivot Points (P, R1, S1 only as per selected timeframe)
 * - Admin Authentication System (Patent / Patent) for Adding, Editing, Deleting Screeners
 */

// -------------------------------------------------------------
// Official 212 F&O Preset List & Universal F&O Tagging
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

function getCapCategoryTooltip(capCategory, mcap) {
  const cat = String(capCategory || '').trim().toLowerCase();
  const numCap = typeof mcap === 'number' ? mcap : parseFloat(mcap);
  if (cat.includes('mega') || (!isNaN(numCap) && numCap >= 50000)) {
    return 'Mega Cap: Market Cap ≥ ₹50,000 Cr (India\'s largest bluechip market titans)';
  }
  if (cat.includes('large') || (!isNaN(numCap) && numCap >= 20000)) {
    return 'Large Cap: Market Cap ₹20,000 Cr to ₹50,000 Cr (Top 100 established market leaders)';
  }
  if (cat.includes('mid') || (!isNaN(numCap) && numCap >= 5000)) {
    return 'Mid Cap: Market Cap ₹5,000 Cr to ₹20,000 Cr (High-growth companies ranked 101st–250th)';
  }
  if (cat.includes('small') || (!isNaN(numCap) && numCap >= 1000)) {
    return 'Small Cap: Market Cap ₹1,000 Cr to ₹5,000 Cr (Small-cap growth companies ranked 251st–500th)';
  }
  if (cat.includes('micro') || (!isNaN(numCap) && numCap < 1000)) {
    return 'Micro Cap: Market Cap < ₹1,000 Cr (High-beta emerging small enterprises)';
  }
  return 'Market Capitalization = Total Shares Outstanding × Current Market Price';
}
window.getCapCategoryTooltip = getCapCategoryTooltip;

function getFnoBadgeHtml(stockOrSymbol, extraClass = '') {
  if (!isFnoStock(stockOrSymbol)) return '';
  return `<span class="px-1 py-0.2 rounded text-[9px] font-bold bg-purple-500/20 text-purple-300 border border-purple-500/30 font-mono ${extraClass}" title="Active in NSE Futures & Options Segment (Derivatives Traded)">F&O</span>`;
}

function getCircuitBandInfo(stockOrSymbol) {
  if (!stockOrSymbol) return null;
  let band = null;
  let symbol = '';
  if (typeof stockOrSymbol === 'object') {
    if (stockOrSymbol.circuitBand !== undefined && stockOrSymbol.circuitBand !== null) {
      band = Number(stockOrSymbol.circuitBand);
    }
    symbol = stockOrSymbol.symbol || '';
  } else if (typeof stockOrSymbol === 'string') {
    symbol = stockOrSymbol;
  }
  const cleanSym = (symbol || '').toUpperCase().trim().replace(/(\.NS|\.BO|-EQ)$/i, '').replace(/[^A-Z0-9&\-_]/g, '');
  if ((band === null || isNaN(band)) && state.circuitBandsMap && state.circuitBandsMap[cleanSym]) {
    band = Number(state.circuitBandsMap[cleanSym].band);
  }
  return isNaN(band) ? null : band;
}

function getCircuitBadgeHtml(stockOrSymbol, extraClass = '') {
  const band = getCircuitBandInfo(stockOrSymbol);
  if (band === 2) {
    return `<span class="px-1 py-0.2 rounded text-[9px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/40 font-mono tracking-tight ${extraClass}" title="NSE 2% Circuit Limit: Price capped to ±2% max daily fluctuation">2%</span>`;
  } else if (band === 5) {
    return `<span class="px-1 py-0.2 rounded text-[9px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40 font-mono tracking-tight ${extraClass}" title="NSE 5% Circuit Limit: Price capped to ±5% max daily fluctuation">5%</span>`;
  }
  return '';
}

function updateOnChartCircuitBadge(stockOrData) {
  const badge = document.getElementById('onchart-circuit-badge');
  if (!badge) return;
  const band = getCircuitBandInfo(stockOrData);
  if (band === 2) {
    badge.className = 'flex pointer-events-auto items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold font-mono tracking-wide shadow-2xl backdrop-blur-md w-fit transition-all bg-rose-500/20 text-rose-300 border border-rose-500/40';
    badge.innerHTML = `<span class="w-2 h-2 rounded-full bg-rose-400 animate-pulse"></span><span>2% CKT</span>`;
    badge.title = 'NSE 2% Circuit Limit: Price capped to ±2% max daily fluctuation';
  } else if (band === 5) {
    badge.className = 'flex pointer-events-auto items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold font-mono tracking-wide shadow-2xl backdrop-blur-md w-fit transition-all bg-amber-500/20 text-amber-300 border border-amber-500/40';
    badge.innerHTML = `<span class="w-2 h-2 rounded-full bg-amber-400 animate-pulse"></span><span>5% CKT</span>`;
    badge.title = 'NSE 5% Circuit Limit: Price capped to ±5% max daily fluctuation';
  } else {
    badge.className = 'hidden pointer-events-auto items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold font-mono tracking-wide shadow-2xl backdrop-blur-md w-fit transition-all';
    badge.innerHTML = '';
  }
}

// Application State
const state = {
  screeners: [],
  activeScreenerId: null,
  activeCategoryFilter: 'all',
  currentStocks: [],
  selectedStock: null,
  currentStockData: null,
  activeInterval: '1d', // '1d' or '1wk'
  activeRange: '6mo', // '3mo', '6mo' (Default), '1y'
  filterMc1000: false, // Filter stocks with Market Cap > 1000 Cr
  filterMc2000: false, // Filter stocks with Market Cap > 2000 Cr
  searchQuery: '',
  sortField: 'changePercent',
  sortAscending: false,
  // Watchlists Table State
  watchlistSortField: 'symbol',
  watchlistSortAscending: true,
  // DarvasScan State
  pricescanResults: [],
  pricescanSortField: 'spreadPercent',
  pricescanSortAscending: true,
  pricescanFilterMc1000: false,
  pricescanFilterMc2000: false,
  // SS_RVOL Scanner State
  ssrvolResults: [],
  ssrvolSortField: 'rvol',
  ssrvolSortAscending: false,
  ssrvolFormat: 'percent', // 'percent' (145%) or 'ratio' (1.45x)
  ssrvolFilterMc1000: false,
  ssrvolFilterMc2000: false,
  ssrvolFilterSsOnly: false,
  ssrvolLookback: 20,
  // VCP Scanner State
  vcpscanResults: [],
  vcpscanSortField: 'tightnessPercent',
  vcpscanSortAscending: true,
  vcpscanFilterMc1000: false,
  vcpscanFilterMc2000: false,
  runningScreeners: new Set(),
  isRunAllInProgress: false,
  isAggregatedMode: false,
  theme: localStorage.getItem('sangam_theme') || localStorage.getItem('theme') || 'nordic',
  circuitBandsMap: {},
  circuitStats: null,
  selectedCircuitFile: null,

  // Guest Feature Access Controls (Default: Pure Chart-Only for Guests)
  guestPermissions: {
    screenerDeck: false,
    sidebarScans: false,
    customScreener: false,
    screenerExport: false,
    watchlists: false,
    indicatorsToolbar: false,
    volumeIntelligence: false,
    intradayTimeframes: false,
    stockSearch: true,
    chartExport: false,
    navSubpages: false,
    guestBanner: true,
    guestBannerText: 'Viewing in Guest mode'
  },

  // Visual Chart Themes & Custom Colors
  chartTheme: localStorage.getItem('chart_theme') || 'dark',
  customThemeColors: {
    bg: '#0b0f19',
    text: '#94a3b8',
    grid: '#1f293d',
    border: '#1f293d',
    candleUp: '#10b981',
    candleDown: '#ef4444'
  },

  // Customizable Line Thicknesses (px)
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
    closeLine: 1,
    volIntelMa: 1.5
  },

  // Volume Intelligence Indicator Parameters & Settings
  volIntelSettings: {
    showVolMa: true,
    volMaPeriod: 50,
    ppLookback: 10,
    bsMult: 3.0,
    dryThresh: 0.20,
    paintBars: false,
    bsMarkerShape: 'circle', // 'circle' | 'triangle' | 'off'
    bsMarkerColor: '#a855f7'
  },

  // Authentication State
  user: null, // { userId, username, role }
  token: localStorage.getItem('authToken') || localStorage.getItem('adminToken') || null,
  isAdmin: false,
  authSlots: { totalUsers: 0, maxUsers: 5, slotsAvailable: 5 },

  // Watchlists State (5 Watchlists x 50 Stocks)
  activeSidebarTab: 'screeners', // 'screeners' | 'watchlists'
  watchlists: [],
  activeWatchlistId: null,
  watchlistQuotes: {}, // symbol -> quote snapshot
  volOverlayMode: 'volintel', // 'volintel' | 'simple' | 'off'

  // Indicator Visibility Toggles
  toggles: {
    ema10: true,
    ema20: true,
    ema50: true,
    ema150: true,
    ema200: true,
    volume: false,
    volAvg: false,
    vwap: true,
    pivots: true,
    darvas: true,
    rsi: true,
    volIntel: true
  },
  // Indicator Custom Stroke Colors (Persisted to storage and user profile)
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
    closeLine: '#10b981',
    volIntelMa: '#fbbf24',
    viBs: '#a855f7',
    viPp: '#0ea5e9',
    viPv: '#06b6d4',
    viDv: '#f59e0b',
    viSup: '#10b981',
    viSdn: '#ef4444',
    viGrey: '#64748b',
    viLowVol: '#e2e8f0'
  },
  pivotType: 'Traditional (Auto)',

  // Interactive Chart Drawing Tools & Persisted State
  activeDrawingTool: null, // null | 'avwap' | 'global_ray'
  lastCrosshairPrice: null, // Tracked from mouse cursor on price chart for Alt+H
  drawings: {}, // symbol -> { avwaps: [time], hlines: [price] }
  
  // Visual Trading Journal State
  journal: {
    charts: [],
    activeFilterSetup: 'all',
    searchQuery: '',
    sortOrder: 'newest',
    currentLightboxChart: null,
    pendingScreenshotBase64: null
  },

  // High-Density ScreeningMantis Layout & Customizer State
  denseColumns: {
    symbol: true,
    close: true,
    chg: true,
    vol: true,
    emas: true
  },
  recFilter: 'all',

  globalDateRay: {
    active: false,
    anchorDate: null,
    anchorTime: null,
    price: null
  },
  measureTool: {
    active: false,
    step: 0,
    startPoint: null,
    startTime: null,
    startPrice: null,
    startIndex: -1,
    endPoint: null,
    endTime: null,
    endPrice: null,
    endIndex: -1
  },
  activeDrawingSeries: {
    avwaps: [], // Array of LineSeries instances
    hlines: [], // Array of priceLine instances
    globalRay: null // PriceLine instance
  },

  // Chart Instances & Series
  charts: {
    main: null,
    rsi: null,
    volIntel: null,
    series: {
      candles: null,
      ema10: null,
      ema20: null,
      ema50: null,
      ema150: null,
      ema200: null,
      vwap: null,
      darvasTop: null,
      darvasBottom: null,
      volume: null,
      volAvg: null,
      rsi: null,
      rsiSma: null,
      volIntelHist: null,
      volIntelMa: null
    },
    pivotLines: []
  }
};

// DOM Element Selectors
const el = {
  screenersContainer: document.getElementById('screeners-container'),
  categoryFilterBar: document.getElementById('category-filter-bar'),
  stocksTbody: document.getElementById('stocks-tbody'),
  stockSearchInput: document.getElementById('stock-search-input'),
  visibleStocksCount: document.getElementById('visible-stocks-count'),
  activeScreenerTitle: document.getElementById('active-screener-title'),
  activeScreenerDesc: document.getElementById('active-screener-desc'),
  activeScreenerBadge: document.getElementById('active-screener-badge'),
  lastUpdatedTime: document.getElementById('last-updated-time'),
  resultsFooterMeta: document.getElementById('results-footer-meta'),
  headerSummaryStats: document.getElementById('header-summary-stats'),
  statTotalScreeners: document.getElementById('stat-total-screeners'),
  statTotalStocks: document.getElementById('stat-total-stocks'),
  btnRunAll: document.getElementById('btn-run-all'),
  btnCopyStocks: document.getElementById('btn-copy-stocks'),
  btnExportCsv: document.getElementById('btn-export-csv'),
  btnThemeToggle: document.getElementById('btn-theme-toggle'),
  themeIcon: document.getElementById('theme-icon'),
  btnNavAnalytics: document.getElementById('btn-nav-analytics'),
  btnAdminConsole: document.getElementById('btn-admin-console'),
  btnOpenNotes: document.getElementById('btn-open-notes'),
  btnOpenMfDeals: document.getElementById('btn-open-mf-deals'),
  btnOpenChartJournal: document.getElementById('btn-open-chart-journal'),
  journalCountBadge: document.getElementById('journal-count-badge'),
  btnSaveChartScreenshot: document.getElementById('btn-save-chart-screenshot'),
  saveChartModal: document.getElementById('save-chart-modal'),
  chartJournalModal: document.getElementById('chart-journal-modal'),
  chartLightboxModal: document.getElementById('chart-lightbox-modal'),

  // Floating On-Chart Controls & Badges (Symbol & AVWAP & Global Ray)
  onchartStockSymbol: document.getElementById('onchart-stock-symbol'),
  floatingAvwapControl: document.getElementById('floating-avwap-control'),
  btnFloatingAvwap: document.getElementById('btn-floating-avwap'),
  floatingAvwapLabel: document.getElementById('floating-avwap-label'),
  floatingAvwapDivider: document.getElementById('floating-avwap-divider'),
  floatingAvwapStatus: document.getElementById('floating-avwap-status'),
  btnFloatingAvwapClear: document.getElementById('btn-floating-avwap-clear'),
  chkGlobalDateRay: document.getElementById('chk-global-date-ray'),
  floatingGlobalRayBadge: document.getElementById('floating-global-ray-badge'),
  globalRayDateLabel: document.getElementById('global-ray-date-label'),
  btnMeasureTool: document.getElementById('btn-measure-tool'),
  chartMeasureOverlay: document.getElementById('chart-measure-overlay'),
  chartMeasureBox: document.getElementById('chart-measure-box'),
  chartMeasurePill: document.getElementById('chart-measure-pill'),
  chartMeasurePct: document.getElementById('chart-measure-pct'),
  chartMeasureDetails: document.getElementById('chart-measure-details'),
  chartMeasureSvg: document.getElementById('chart-measure-svg'),
  
  // Multi-User Auth Controls
  btnOpenAuthModal: document.getElementById('btn-open-auth-modal'),
  btnOpenCircuitModal: document.getElementById('btn-open-circuit-modal'),
  btnOpenChangePasswordModal: document.getElementById('btn-open-change-password-modal'),
  changePasswordModal: document.getElementById('change-password-modal'),
  changePasswordForm: document.getElementById('change-password-form'),
  currentPasswordInput: document.getElementById('current-password-input'),
  newPasswordInput: document.getElementById('new-password-input'),
  confirmPasswordInput: document.getElementById('confirm-password-input'),
  changePasswordErrorBanner: document.getElementById('change-password-error-banner'),
  changePasswordSuccessBanner: document.getElementById('change-password-success-banner'),
  btnSubmitChangePassword: document.getElementById('btn-submit-change-password'),
  userAuthBox: document.getElementById('user-auth-box'),
  btnUserProfileMenu: document.getElementById('btn-user-profile-menu'),
  userProfileDropdown: document.getElementById('user-profile-dropdown'),
  userDropdownArrow: document.getElementById('user-dropdown-arrow'),
  userBadgeIcon: document.getElementById('user-badge-icon'),
  userBadgeName: document.getElementById('user-badge-name'),
  userBadgeRole: document.getElementById('user-badge-role'),
  dropdownUserName: document.getElementById('dropdown-user-name'),
  dropdownUserRoleBadge: document.getElementById('dropdown-user-role-badge'),
  headerSlotsBadge: document.getElementById('header-slots-badge'),
  modalSlotsBadge: document.getElementById('modal-slots-badge'),
  btnLogout: document.getElementById('btn-logout'),
  authModal: document.getElementById('auth-modal'),
  authTabLogin: document.getElementById('auth-tab-login'),
  authTabRegister: document.getElementById('auth-tab-register'),
  loginForm: document.getElementById('login-form'),
  loginUsername: document.getElementById('login-username'),
  loginPassword: document.getElementById('login-password'),
  loginErrorBanner: document.getElementById('login-error-banner'),
  btnSubmitLogin: document.getElementById('btn-submit-login'),
  registerForm: document.getElementById('register-form'),
  regUsername: document.getElementById('reg-username'),
  regPassword: document.getElementById('reg-password'),
  regConfirmPassword: document.getElementById('reg-confirm-password'),
  registerErrorBanner: document.getElementById('register-error-banner'),
  registerSuccessBanner: document.getElementById('register-success-banner'),
  btnSubmitRegister: document.getElementById('btn-submit-register'),
  btnCloseAuthModal: document.getElementById('btn-close-auth-modal'),

  // Left Sidebar Tabs & Watchlist Elements
  tabBtnScreeners: document.getElementById('tab-btn-screeners'),
  tabBtnWatchlists: document.getElementById('tab-btn-watchlists'),
  tabBtnPricescan: document.getElementById('tab-btn-pricescan'),
  tabBtnSsrvol: document.getElementById('tab-btn-ssrvol'),
  tabBtnVcpscan: document.getElementById('tab-btn-vcpscan'),
  sidebarScreenersView: document.getElementById('sidebar-screeners-view'),
  sidebarWatchlistsView: document.getElementById('sidebar-watchlists-view'),
  sidebarPricescanView: document.getElementById('sidebar-pricescan-view'),
  sidebarSsrvolView: document.getElementById('sidebar-ssrvol-view'),
  sidebarVcpscanView: document.getElementById('sidebar-vcpscan-view'),
  selectActiveWatchlist: document.getElementById('select-active-watchlist'),
  btnRenameWatchlist: document.getElementById('btn-rename-watchlist'),
  btnAddNewWatchlist: document.getElementById('btn-add-new-watchlist'),
  btnDeleteWatchlist: document.getElementById('btn-delete-watchlist'),
  btnCopyWlStocks: document.getElementById('btn-copy-wl-stocks'),
  btnExportWlCsv: document.getElementById('btn-export-wl-csv'),
  wlQuickAddInput: document.getElementById('wl-quick-add-input'),
  wlAutocompleteDropdown: document.getElementById('wl-autocomplete-dropdown'),
  btnWlQuickAdd: document.getElementById('btn-wl-quick-add'),
  wlCapacityLabel: document.getElementById('wl-capacity-label'),
  wlSlotsLeft: document.getElementById('wl-slots-left'),
  watchlistTbody: document.getElementById('watchlist-tbody'),
  btnRefreshWlQuotes: document.getElementById('btn-refresh-wl-quotes'),

  // DarvasScan (Price Position Scanner) Elements
  btnRunPricescan: document.getElementById('btn-run-pricescan'),
  btnCopyPricescanStocks: document.getElementById('btn-copy-pricescan-stocks'),
  selectPricescanEma: document.getElementById('select-pricescan-ema'),
  selectPricescanTimeframe: document.getElementById('select-pricescan-timeframe'),
  selectPricescanScope: document.getElementById('select-pricescan-scope'),
  chkPricescanMc1000: document.getElementById('chk-pricescan-mc1000'),
  chkPricescanMc2000: document.getElementById('chk-pricescan-mc2000'),
  pricescanResultsCount: document.getElementById('pricescan-results-count'),
  pricescanResultsCountBadge: document.getElementById('pricescan-results-count-badge'),
  btnEma10: document.getElementById('btn-ema-10'),
  btnEma20: document.getElementById('btn-ema-20'),
  pricescanStatusBadge: document.getElementById('pricescan-status-badge'),
  pricescanTbody: document.getElementById('pricescan-tbody'),
  pricescanFooterInfo: document.getElementById('pricescan-footer-info'),
  pricescanDynamicEmaCol: document.getElementById('pricescan-dynamic-ema-col'),
  pricescanDynamicDarvasCol: document.getElementById('pricescan-dynamic-darvas-col'),
  btnOpenAddModalDeck: document.getElementById('btn-open-add-modal-deck'),

  // SS_RVOL Scanner Elements
  btnRunSsrvol: document.getElementById('btn-run-ssrvol'),
  btnCopySsrvolStocks: document.getElementById('btn-copy-ssrvol-stocks'),
  inputSsrvolLookback: document.getElementById('input-ssrvol-lookback'),
  btnSsrvolFormatToggle: document.getElementById('btn-ssrvol-format-toggle'),
  ssrvolFormatLabel: document.getElementById('ssrvol-format-label'),
  chkSsrvolSsOnly: document.getElementById('chk-ssrvol-ss-only'),
  selectSsrvolScope: document.getElementById('select-ssrvol-scope'),
  chkSsrvolMc1000: document.getElementById('chk-ssrvol-mc1000'),
  chkSsrvolMc2000: document.getElementById('chk-ssrvol-mc2000'),
  ssrvolResultsCountBadge: document.getElementById('ssrvol-results-count-badge'),
  ssrvolTbody: document.getElementById('ssrvol-tbody'),
  ssrvolDynamicAvgvolCol: document.getElementById('ssrvol-dynamic-avgvol-col'),
  ssrvolFooterInfo: document.getElementById('ssrvol-footer-info'),

  // VCP Scanner Elements
  btnRunVcpscan: document.getElementById('btn-run-vcpscan'),
  btnCopyVcpscanStocks: document.getElementById('btn-copy-vcpscan-stocks'),
  selectVcpscanTimeframe: document.getElementById('select-vcpscan-timeframe'),
  selectVcpscanStage: document.getElementById('select-vcpscan-stage'),
  selectVcpscanScope: document.getElementById('select-vcpscan-scope'),
  chkVcpscanMc1000: document.getElementById('chk-vcpscan-mc1000'),
  chkVcpscanMc2000: document.getElementById('chk-vcpscan-mc2000'),
  vcpscanResultsCountBadge: document.getElementById('vcpscan-results-count-badge'),
  vcpscanTbody: document.getElementById('vcpscan-tbody'),
  vcpscanFooterInfo: document.getElementById('vcpscan-footer-info'),

  // Chart Header Watchlist Elements
  chartWatchlistWrapper: document.getElementById('chart-watchlist-wrapper'),
  btnChartWatchlistToggle: document.getElementById('btn-chart-watchlist-toggle'),
  chartWatchlistMenu: document.getElementById('chart-watchlist-menu'),
  chartWatchlistChecklist: document.getElementById('chart-watchlist-checklist'),

  // Rename Watchlist Modal
  renameWatchlistModal: document.getElementById('rename-watchlist-modal'),
  renameWatchlistForm: document.getElementById('rename-watchlist-form'),
  renameWatchlistInput: document.getElementById('rename-watchlist-input'),

  // Native Chart Header Elements
  chartSymbolAvatar: document.getElementById('chart-symbol-avatar'),
  chartStockSymbol: document.getElementById('chart-stock-symbol'),
  manualStockInput: document.getElementById('manual-stock-input'),
  btnManualStockSearch: document.getElementById('btn-manual-stock-search'),
  stockAutocompleteDropdown: document.getElementById('stock-autocomplete-dropdown'),
  chkMc1000: document.getElementById('chk-mc1000'),
  chkMc2000: document.getElementById('chk-mc2000'),
  btnNavPrevStock: document.getElementById('btn-nav-prev-stock'),
  btnNavNextStock: document.getElementById('btn-nav-next-stock'),
  chartStockLtp: document.getElementById('chart-stock-ltp'),
  chartStockChange: document.getElementById('chart-stock-change'),
  chartStockExchange: document.getElementById('chart-stock-exchange'),
  chartStockName: document.getElementById('chart-stock-name'),
  linkTradingview: document.getElementById('link-tradingview'),
  linkChartink: document.getElementById('link-chartink'),
  
  // Indicator Metric Pills
  pillEma10: document.getElementById('pill-ema10'),
  pillEma20: document.getElementById('pill-ema20'),
  pillEma50: document.getElementById('pill-ema50'),
  pillEma150: document.getElementById('pill-ema150'),
  pillVwap: document.getElementById('pill-vwap'),
  pillPivots: document.getElementById('pill-pivots'),
  pillDarvas: document.getElementById('pill-darvas'),
  pillRsi: document.getElementById('pill-rsi'),
  pill52w: document.getElementById('pill-52w'),
  
  // 3 Separate Chart Containers & Badges
  chartMainContainer: document.getElementById('chart-main-container'),
  resizerPriceRsi: document.getElementById('resizer-price-rsi'),
  resizerRsiBottom: document.getElementById('resizer-rsi-bottom'),
  resizerChartBottom: document.getElementById('resizer-chart-bottom'),
  chartOhlcvLegend: document.getElementById('chart-ohlcv-legend'),
  tvPricePane: document.getElementById('tv_price_pane'),
  tvMainChart: document.getElementById('tv_main_chart'),

  // Workspace Layout & Splitters
  workspaceContainer: document.getElementById('workspace-container'),
  sidebarPane: document.getElementById('sidebar-pane'),
  chartPane: document.getElementById('chart-pane'),
  workspaceSplitter: document.getElementById('workspace-splitter'),
  splitterHandle: document.getElementById('splitter-handle'),
  btnLayoutHorizontal: document.getElementById('btn-layout-horizontal'),
  btnLayoutVertical: document.getElementById('btn-layout-vertical'),
  
  tvVolumeContainer: document.getElementById('tv_volume_container'),
  tvVolumeChart: document.getElementById('tv_volume_chart'),
  volLiveBadge: document.getElementById('vol-live-badge'),
  volAvgLiveBadge: document.getElementById('vol-avg-live-badge'),
  candleChgBadge: document.getElementById('candle-chg-badge'),
  
  tvRsiContainer: document.getElementById('tv_rsi_container'),
  tvRsiChart: document.getElementById('tv_rsi_chart'),
  rsiLiveBadge: document.getElementById('rsi-live-badge'),
  rsiSmaLiveBadge: document.getElementById('rsi-sma-live-badge'),
  
  viPpBadge: document.getElementById('vi-pp-badge'),
  viBsBadge: document.getElementById('vi-bs-badge'),
  viUdBadge: document.getElementById('vi-ud-badge'),
  viRvolBadge: document.getElementById('vi-rvol-badge'),
  viVolBadge: document.getElementById('vi-vol-badge'),
  viSmaBadge: document.getElementById('vi-sma-badge'),
  viSignalsBadge: document.getElementById('vi-signals-badge'),
  
  chartLoadingOverlay: document.getElementById('chart-loading-overlay'),
  
  // Checkbox Toggles & Selectors
  chkEma10: document.getElementById('chk-ema10'),
  chkEma20: document.getElementById('chk-ema20'),
  chkEma50: document.getElementById('chk-ema50'),
  chkEma150: document.getElementById('chk-ema150'),
  chkEma200: document.getElementById('chk-ema200'),
  chkVol: document.getElementById('chk-vol'),
  chkVolAvg: document.getElementById('chk-vol-avg'),
  chkVwap: document.getElementById('chk-vwap'),
  chkPivots: document.getElementById('chk-pivots'),
  selectPivotType: document.getElementById('select-pivot-type'),
  chkDarvas: document.getElementById('chk-darvas'),
  chkRsi: document.getElementById('chk-rsi'),
  chkVolIntel: document.getElementById('chk-vol-intel'),

  // Color Pickers
  colorEma10: document.getElementById('color-ema10'),
  colorEma20: document.getElementById('color-ema20'),
  colorEma50: document.getElementById('color-ema50'),
  colorEma150: document.getElementById('color-ema150'),
  colorEma200: document.getElementById('color-ema200'),
  colorVolAvg: document.getElementById('color-vol-avg'),
  colorVwap: document.getElementById('color-vwap'),
  colorDarvasTop: document.getElementById('color-darvas-top'),
  colorDarvasBottom: document.getElementById('color-darvas-bottom'),
  colorRsi: document.getElementById('color-rsi'),
  colorRsiSma: document.getElementById('color-rsi-sma'),
  colorAvwap: document.getElementById('color-avwap'),

  // Modal Elements
  screenerModal: document.getElementById('screener-modal'),
  screenerForm: document.getElementById('screener-form'),
  modalTitle: document.getElementById('modal-title'),
  modalScreenerId: document.getElementById('modal-screener-id'),
  modalScreenerName: document.getElementById('modal-screener-name'),
  modalScreenerUrl: document.getElementById('modal-screener-url'),
  modalScreenerCategory: document.getElementById('modal-screener-category'),
  modalScreenerTags: document.getElementById('modal-screener-tags'),
  modalScreenerDesc: document.getElementById('modal-screener-desc'),
  modalTestBanner: document.getElementById('modal-test-banner'),
  btnTestScreener: document.getElementById('btn-test-screener'),
  btnCloseModal: document.getElementById('btn-close-modal'),
  btnCancelModal: document.getElementById('btn-cancel-modal'),
  toastContainer: document.getElementById('toast-container')
};

// Formatters
const fmt = {
  currency: num => {
    if (typeof num !== 'number' || isNaN(num)) return '₹' + (num || '0.00');
    return '₹' + num.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  },
  percent: num => {
    if (typeof num !== 'number' || isNaN(num)) return '0.00%';
    const sign = num > 0 ? '+' : '';
    return `${sign}${num.toFixed(2)}%`;
  },
  volume: num => {
    if (typeof num !== 'number' || isNaN(num)) return num || '0';
    if (num >= 10000000) return (num / 10000000).toFixed(2) + ' Cr';
    if (num >= 100000) return (num / 100000).toFixed(2) + ' L';
    if (num >= 1000) return (num / 1000).toFixed(1) + ' K';
    return num.toLocaleString('en-IN');
  },
  time: iso => {
    if (!iso) return '';
    const d = new Date(iso);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  }
};

// Initialize Application
async function init() {
  applyTheme(state.theme);
  await loadGuestPermissions();
  const localPrefs = JSON.parse(localStorage.getItem('user_indicator_prefs') || 'null');
  if (localPrefs) applyLoadedIndicatorPreferences(localPrefs);

  setupEventListeners();
  initNativeCharts();
  await checkAuthStatus();
  await loadScreeners();
  await loadCircuitStats();

  // Initialize Global High-Performance Tooltip Engine
  initGlobalTooltipEngine();

  // Initialize Dense Table Column Preferences
  loadColumnPreferences();

  // Initialize Live Market Indices Tape
  initMarketIndicesStrip();

  // Update Watchlists Tab count badge dynamically
  updateWatchlistsTabBadge();

  // Load persisted Global Date Ray
  try {
    const savedRay = JSON.parse(localStorage.getItem('sangam_global_date_ray') || 'null');
    if (savedRay && typeof savedRay === 'object') {
      state.globalDateRay = Object.assign(state.globalDateRay, savedRay);
      const chk = document.getElementById('chk-global-date-ray');
      if (chk) chk.checked = Boolean(state.globalDateRay.active);
      updateGlobalRayWidgetUI();
    }
  } catch (e) {}

  // Load default stock chart
  selectStock({
    symbol: 'INDSWFTLAB',
    name: 'Ind-Swift Laboratories Limited',
    close: 324.38,
    changePercent: 12.18
  });

  // Start real-time active chart ticker (4s auto-pull for zero lag)
  startActiveChartLiveTicker();

  // Start periodic screened stocks live price and 1D% change synchronizer (6s)
  setInterval(syncScreenedStocksLivePrices, 6000);

  // Sync Live Data Feed Status Badge (Dhan vs Backup)
  syncDataFeedStatus();

  // Initialize Screener Command Deck Collapsed/Expanded State
  initScreenerDeckState();

  lucide.createIcons();
}

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
      badge.className = 'px-2 py-0.5 text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-full flex items-center gap-1 transition-all shadow-sm';
      badge.title = 'Active Feed: Official Dhan HQ Broker API (Connected)';
      dot.className = 'w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse';
      label.textContent = '🟢 Dhan';
    } else {
      badge.className = 'px-2 py-0.5 text-[10px] font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20 rounded-full flex items-center gap-1 transition-all';
      badge.title = 'Active Feed: Multi-Source Backup Feed (Dhan credentials not configured in environment)';
      dot.className = 'w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse';
      label.textContent = 'Backup';
    }
  } catch (err) {}
}

// -------------------------------------------------------------
// Chart Themes Preset Configurations & Custom Styling
// -------------------------------------------------------------

const CHART_THEME_CONFIGS = {
  'dark': {
    name: 'Midnight Obsidian',
    bg: '#121721',
    text: '#94a3b8',
    grid: 'rgba(255, 255, 255, 0.04)',
    border: '#232b3e',
    candleUp: '#22c55e',
    candleDown: '#f43f5e'
  },
  'obsidian': {
    name: 'Midnight Obsidian',
    bg: '#121721',
    text: '#94a3b8',
    grid: 'rgba(255, 255, 255, 0.04)',
    border: '#232b3e',
    candleUp: '#22c55e',
    candleDown: '#f43f5e'
  },
  'light': {
    name: 'Nordic Minimalist',
    bg: '#ffffff',
    text: '#1e293b',
    grid: 'rgba(0, 0, 0, 0.04)',
    border: '#e2e8f0',
    candleUp: '#10b981',
    candleDown: '#f43f5e'
  },
  'nordic': {
    name: 'Nordic Minimalist',
    bg: '#ffffff',
    text: '#1e293b',
    grid: 'rgba(0, 0, 0, 0.04)',
    border: '#e2e8f0',
    candleUp: '#10b981',
    candleDown: '#f43f5e'
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
    name: 'Warm Paper',
    bg: '#fdfbf7',
    text: '#2c2621',
    grid: 'rgba(44, 38, 33, 0.06)',
    border: '#e7e0d3',
    candleUp: '#2d7a46',
    candleDown: '#b93c2a'
  },
  'warm': {
    name: 'Warm Paper',
    bg: '#fdfbf7',
    text: '#2c2621',
    grid: 'rgba(44, 38, 33, 0.06)',
    border: '#e7e0d3',
    candleUp: '#2d7a46',
    candleDown: '#b93c2a'
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

  // Sync toolbar dropdown & modal dropdown
  const selectChartTheme = document.getElementById('select-chart-theme');
  if (selectChartTheme && selectChartTheme.value !== themeName) {
    selectChartTheme.value = themeName;
  }
  const modalSelectTheme = document.getElementById('modal-select-chart-theme');
  if (modalSelectTheme && modalSelectTheme.value !== themeName) {
    modalSelectTheme.value = themeName;
  }

  // Toggle custom palette visibility in modal
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

  // Update container backgrounds
  const chartMainContainer = document.getElementById('chart-main-container');
  if (chartMainContainer) chartMainContainer.style.backgroundColor = cfg.bg;
  const tvRsiContainer = document.getElementById('tv_rsi_container');
  if (tvRsiContainer) tvRsiContainer.style.backgroundColor = cfg.bg;

  // Apply to Lightweight Charts instances
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

  // Apply candlestick colors
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

// -------------------------------------------------------------
// Customizable Line Thickness & Style Settings
// -------------------------------------------------------------

function applyLineWidths(widths) {
  if (widths) {
    state.lineWidths = { ...state.lineWidths, ...widths };
  }

  const w = state.lineWidths;

  // Sync modal select elements if present
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
    closeLine: 'setting-width-close-line',
    volIntelMa: 'setting-width-vol-avg'
  };

  Object.entries(widthSelectMap).forEach(([key, elementId]) => {
    const elSel = document.getElementById(elementId);
    if (elSel && w[key] !== undefined) {
      elSel.value = String(w[key]);
    }
  });

  // Apply to chart series
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
    if (s.volIntelMa) s.volIntelMa.applyOptions({ lineWidth: Number(w.volIntelMa || w.volAvg || 1.5) });
  }

  // Apply crosshair options
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

  // Apply to active AVWAPs
  if (state.activeDrawingSeries?.avwaps && state.activeDrawingSeries.avwaps.length > 0) {
    state.activeDrawingSeries.avwaps.forEach(av => {
      try { av.applyOptions({ lineWidth: Number(w.avwap || 2) }); } catch(e) {}
    });
  }

  // Update Pivot lines
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
    closeLine: ['setting-color-close-line', null],
    volIntelMa: ['setting-color-vol-avg', null],
    viBs: ['setting-color-vi-bs', null],
    viPp: ['setting-color-vi-pp', null],
    viPv: ['setting-color-vi-pv', null],
    viDv: ['setting-color-vi-dv', null],
    viSup: ['setting-color-vi-sup', null],
    viSdn: ['setting-color-vi-sdn', null],
    viGrey: ['setting-color-vi-grey', null]
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

  // Sync colors if applicable
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

  // Update line width if applicable
  if (widthMap[indicatorKey]) {
    const widthEl = document.getElementById(widthMap[indicatorKey]);
    if (widthEl) {
      state.lineWidths[indicatorKey] = Number(widthEl.value);
    }
  }

  // Apply to chart series directly
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
    if (indicatorKey === 'volIntelMa' && s.volIntelMa) s.volIntelMa.applyOptions(opts);
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

  if (['viBs', 'viPp', 'viPv', 'viDv', 'viSup', 'viSdn', 'viGrey', 'volIntelMa'].includes(indicatorKey)) {
    renderVolumeIntelligence();
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

// -------------------------------------------------------------
// Volume Intelligence Calculation & Rendering Engine
// -------------------------------------------------------------

function calculateVolumeIntelligence(candles, options = {}, customColors = {}) {
  if (!candles || !Array.isArray(candles) || candles.length === 0) {
    return {
      histogram: [],
      volMaSeries: [],
      bsCandleMarkers: [],
      qyVolumeMarkers: [],
      paintedCandles: [],
      barSignals: [],
      stats: { ppCount: 0, bsCount: 0, latestRVol: 1.0, latestUD: 1.0, udStatus: 'Neutral', signals: [] }
    };
  }

  const volMaPeriod = Number(options.volMaPeriod) || 50;
  const ppLookback = Number(options.ppLookback) || 10;
  const bsMult = Number(options.bsMult) || 3.0;
  const dryThresh = Number(options.dryThresh) || 0.20;
  const paintBars = Boolean(options.paintBars);
  const bsMarkerShape = options.bsMarkerShape || 'circle'; // 'circle' | 'triangle' | 'arrowUp' | 'off'
  const bsMarkerColor = options.bsMarkerColor || customColors.viBs || '#a855f7';

  const colors = {
    viBs: bsMarkerColor,
    viPp: customColors.viPp || '#0ea5e9',
    viPv: customColors.viPv || '#06b6d4',
    viDv: customColors.viDv || '#f59e0b',
    viSup: customColors.viSup || '#10b981',
    viSdn: customColors.viSdn || '#ef4444',
    viGrey: customColors.viGrey || '#64748b',
    viLowVol: customColors.viLowVol || '#e2e8f0',
    ...customColors
  };

  const n = candles.length;
  const volValues = candles.map(c => Number(c.volume) || 0);

  // Calculate Volume MA (SMA)
  const volMa = [];
  let sum = 0;
  for (let i = 0; i < n; i++) {
    sum += volValues[i];
    if (i >= volMaPeriod) {
      sum -= volValues[i - volMaPeriod];
      volMa.push(sum / volMaPeriod);
    } else {
      volMa.push(sum / (i + 1));
    }
  }

  const histogram = [];
  const volMaSeries = [];
  const bsCandleMarkers = [];
  const qyVolumeMarkers = [];
  const paintedCandles = [];
  const barSignals = [];

  let ppCount = 0;
  let bsCount = 0;

  for (let i = 0; i < n; i++) {
    const c = candles[i];
    const prevC = i > 0 ? candles[i - 1] : c;
    const vol = volValues[i];
    const ma = volMa[i] || 1;
    const isUp = i > 0 ? c.close > prevC.close : c.close >= c.open;
    const isDown = i > 0 ? c.close < prevC.close : c.close < c.open;
    const range = c.high - c.low;
    const clv = range > 0 ? (c.close - c.low) / range : 0.5;
    const pctChg = (i > 0 && prevC.close > 0) ? ((c.close - prevC.close) / prevC.close) * 100 : 0;
    const rvol = ma > 0 ? (vol / ma) : 1.0;

    const signals = [];

    // 1. Dry Volume (DV): Volume <= dryThresh * VolMA (<= 20% of 50-VolMA by default)
    const isDry = i >= 5 && vol <= (dryThresh * ma);
    if (isDry) signals.push('DV');

    // 2. Bull Snort (BS): Volume >= bsMult * VolMA && Close in upper 35% of bar range && Up bar
    // Plotted as custom Circle or Triangle marker BELOW price candle
    const isBullSnort = i >= 5 && (vol >= bsMult * ma) && (clv >= 0.65) && isUp;
    if (isBullSnort) {
      signals.push('BS');
      bsCount++;
      if (bsMarkerShape !== 'off') {
        bsCandleMarkers.push({
          time: c.time,
          position: 'belowBar',
          color: colors.viBs,
          shape: (bsMarkerShape === 'triangle' || bsMarkerShape === 'arrowUp') ? 'arrowUp' : 'circle',
          text: '',
          size: 1
        });
      }
    }

    // 3. Pocket Pivot (PP): Up bar with Volume > max qualifying Down bar volume in lookback
    let isPocketPivot = false;
    if (i >= 5 && isUp) {
      const startIdx = Math.max(0, i - ppLookback);
      let maxDownVol = 0;
      let hasDownBar = false;
      for (let k = startIdx; k < i; k++) {
        const kPrev = k > 0 ? candles[k - 1] : candles[k];
        const kIsDown = k > 0 ? (candles[k].close < kPrev.close) : (candles[k].close < candles[k].open);
        if (kIsDown) {
          hasDownBar = true;
          if (volValues[k] > maxDownVol) maxDownVol = volValues[k];
        }
      }
      if (hasDownBar && vol > maxDownVol) {
        isPocketPivot = true;
        signals.push('PP');
        ppCount++;
      }
    }

    // 4. Lowest Volume in a Quarter and Year (Q & Y markers above Volume bars)
    let isLVY = false;
    let isLVQ = false;
    if (i >= 20) {
      const qStart = Math.max(0, i - 62);
      const qSlice = volValues.slice(qStart, i);
      const qMin = qSlice.length > 0 ? Math.min(...qSlice) : Infinity;
      if (vol <= qMin) {
        isLVQ = true;
        signals.push('LVQ');
      }

      if (i >= 60) {
        const yStart = Math.max(0, i - 251);
        const ySlice = volValues.slice(yStart, i);
        const yMin = ySlice.length > 0 ? Math.min(...ySlice) : Infinity;
        if (vol <= yMin) {
          isLVY = true;
          signals.push('LVY');
        }
      }

      if (isLVY) {
        qyVolumeMarkers.push({
          time: c.time,
          position: 'aboveBar',
          color: colors.viLowVol || '#e2e8f0',
          shape: 'circle',
          text: 'Y',
          size: 0
        });
      } else if (isLVQ) {
        qyVolumeMarkers.push({
          time: c.time,
          position: 'aboveBar',
          color: '#cbd5e1',
          shape: 'circle',
          text: 'Q',
          size: 0
        });
      }
    }

    // 5. Power Volume (PV) for stats/signals tracking
    const isPowerVol = (vol >= 2.5 * ma || vol >= 500000) && Math.abs(pctChg) >= 5.0;
    if (isPowerVol) signals.push('PV');

    // Volume Bar Color Rules Hierarchy:
    // 1. Dry Volume (vol <= 20% of 50-VolMA) -> Amber/Gold (viDv)
    // 2. Pocket Pivot (Up day > max 10-down-day vol) -> Cyan/Blue (viPp)
    // 3. Up day with vol > 50-SMA (including Bull Snort) -> Bright Green (viSup)
    // 4. Down day with vol > 50-SMA -> Bright Red (viSdn)
    // 5. Any day with vol <= 50-SMA -> Neutral Grey (viGrey: #64748b)
    let barColor = colors.viGrey;
    if (isDry) {
      barColor = colors.viDv;
    } else if (isPocketPivot && !isBullSnort) {
      barColor = colors.viPp;
    } else if (isUp && vol > ma) {
      barColor = colors.viSup;
    } else if (isDown && vol > ma) {
      barColor = colors.viSdn;
    } else {
      barColor = colors.viGrey;
    }

    histogram.push({
      time: c.time,
      value: vol,
      color: barColor
    });

    volMaSeries.push({
      time: c.time,
      value: Number(ma.toFixed(0))
    });

    // Paint Bars formatting on Candlesticks
    paintedCandles.push({
      time: c.time,
      open: c.open,
      high: c.high,
      low: c.low,
      close: c.close,
      ...(paintBars ? {
        color: barColor,
        borderColor: barColor,
        wickColor: barColor
      } : {})
    });

    barSignals.push({
      time: c.time,
      rvol: Number(rvol.toFixed(2)),
      vol,
      ma: Number(ma.toFixed(0)),
      signals,
      isBullSnort,
      isPocketPivot,
      isDry,
      isLVQ,
      isLVY,
      isPowerVol,
      barColor
    });
  }

  // Calculate latest U/D Volume Ratio over past 20 bars
  const udLookback = Math.min(20, n);
  let sumUp = 0;
  let sumDown = 0;
  for (let i = n - udLookback; i < n; i++) {
    if (i < 0) continue;
    const c = candles[i];
    const prevC = i > 0 ? candles[i - 1] : c;
    const isUp = i > 0 ? c.close > prevC.close : c.close >= c.open;
    const isDown = i > 0 ? c.close < prevC.close : c.close < c.open;
    if (isUp) sumUp += volValues[i];
    if (isDown) sumDown += volValues[i];
  }
  const udRatio = sumDown > 0 ? Number((sumUp / sumDown).toFixed(2)) : (sumUp > 0 ? 9.99 : 1.0);
  const udStatus = udRatio > 1.2 ? 'Bullish' : (udRatio < 0.8 ? 'Bearish' : 'Neutral');

  const latestSignal = barSignals[barSignals.length - 1] || {};

  return {
    histogram,
    volMaSeries,
    bsCandleMarkers,
    qyVolumeMarkers,
    paintedCandles,
    barSignals,
    stats: {
      ppCount,
      bsCount,
      latestRVol: latestSignal.rvol || 1.0,
      latestUD: udRatio,
      udStatus,
      signals: latestSignal.signals || []
    }
  };
}

function renderVolumeIntelligence() {
  if (!state.currentStockData?.candles) return;
  const candles = state.currentStockData.candles;
  const mode = state.volOverlayMode || 'volintel';

  if (mode === 'off') {
    if (state.charts?.series?.volume) {
      state.charts.series.volume.applyOptions({ visible: false });
    }
    if (state.charts?.series?.volAvg) {
      state.charts.series.volAvg.applyOptions({ visible: false });
    }
    if (state.charts?.series?.candles) {
      state.charts.series.candles.setData(candles);
    }
    updateDefaultVolumeBadges();
    updateAllChartMarkers();
    return;
  }

  if (mode === 'simple') {
    if (state.charts?.series?.volume) {
      state.charts.series.volume.applyOptions({
        visible: true,
        color: '#26a69a'
      });
      if (state.currentStockData.volumeSeries) {
        state.charts.series.volume.setData(state.currentStockData.volumeSeries);
      }
    }
    if (state.charts?.series?.volAvg) {
      state.charts.series.volAvg.applyOptions({
        visible: Boolean(state.toggles.volAvg !== false),
        color: state.colors.volAvg || '#fbbf24',
        lineWidth: Number(state.lineWidths?.volAvg || 1.5)
      });
      if (state.currentStockData.volAvg9) {
        state.charts.series.volAvg.setData(state.currentStockData.volAvg9);
      }
    }
    if (state.charts?.series?.candles) {
      state.charts.series.candles.setData(candles);
    }
    updateDefaultVolumeBadges();
    updateAllChartMarkers();
    return;
  }

  // mode === 'volintel' (Default primary volume indicator overlay)
  const viData = calculateVolumeIntelligence(candles, state.volIntelSettings, state.colors);
  state.currentStockData.volIntel = viData;

  if (state.charts?.series?.volume && viData.histogram) {
    state.charts.series.volume.applyOptions({ visible: true });
    state.charts.series.volume.setData(viData.histogram);
  }

  const showVolMa = state.volIntelSettings?.showVolMa !== false;
  if (state.charts?.series?.volAvg) {
    if (showVolMa && viData.volMaSeries) {
      state.charts.series.volAvg.applyOptions({
        visible: true,
        color: state.colors.volIntelMa || state.colors.volAvg || '#fbbf24',
        lineWidth: Number(state.lineWidths?.volAvg || 1.5)
      });
      state.charts.series.volAvg.setData(viData.volMaSeries);
    } else {
      state.charts.series.volAvg.applyOptions({ visible: false });
      state.charts.series.volAvg.setData([]);
    }
  }

  // Paint Bars on Main Candlesticks when toggled on
  if (state.charts?.series?.candles) {
    if (state.volIntelSettings?.paintBars && viData.paintedCandles) {
      state.charts.series.candles.setData(viData.paintedCandles);
    } else {
      state.charts.series.candles.setData(candles);
    }
  }

  updateDefaultVolumeBadges();
  updateAllChartMarkers();
}

function setVolumeOverlayMode(mode) {
  if (!['off', 'simple', 'volintel'].includes(mode)) mode = 'volintel';
  state.volOverlayMode = mode;
  state.toggles.volIntel = (mode === 'volintel');
  state.toggles.volume = (mode === 'simple');

  const radios = document.querySelectorAll('input[name="setting-vol-mode"], input[name="vol-overlay-mode"]');
  radios.forEach(r => {
    r.checked = (r.value === mode);
  });

  const sel = document.getElementById('select-vol-mode');
  if (sel) sel.value = mode;

  renderVolumeIntelligence();
  saveIndicatorPreferences();
}
window.setVolumeOverlayMode = setVolumeOverlayMode;

function updateVolIntelSetting(key, val) {
  if (!state.volIntelSettings) {
    state.volIntelSettings = {
      showVolMa: true,
      volMaPeriod: 50,
      ppLookback: 10,
      bsMult: 3.0,
      dryThresh: 0.20,
      paintBars: false,
      bsMarkerShape: 'circle',
      bsMarkerColor: '#a855f7'
    };
  }
  if (key === 'paintBars' || key === 'showVolMa') {
    state.volIntelSettings[key] = Boolean(val);
  } else if (key === 'bsMarkerShape') {
    state.volIntelSettings[key] = val;
  } else if (key === 'bsMarkerColor') {
    state.volIntelSettings[key] = val;
    state.colors.viBs = val;
  } else {
    state.volIntelSettings[key] = (typeof val === 'string' && !isNaN(val)) ? Number(val) : val;
  }
  saveIndicatorPreferences();

  if (state.currentStockData?.candles) {
    renderVolumeIntelligence();
  }
}
window.updateVolIntelSetting = updateVolIntelSetting;

function updateSimpleVolSetting(type, checked) {
  if (type === 'volume') {
    state.toggles.volume = Boolean(checked);
    if (state.volOverlayMode === 'simple') {
      if (state.charts?.series?.volume) {
        state.charts.series.volume.applyOptions({ visible: Boolean(checked) });
      }
    }
  } else if (type === 'volAvg') {
    state.toggles.volAvg = Boolean(checked);
    if (state.charts?.series?.volAvg) {
      state.charts.series.volAvg.applyOptions({ visible: Boolean(checked) });
    }
  }
  saveIndicatorPreferences();
}
window.updateSimpleVolSetting = updateSimpleVolSetting;

function openLineSettingsModal() {
  const modal = document.getElementById('line-settings-modal');
  if (!modal) return;

  // Sync Volume Overlay Mode Radio Buttons
  const volMode = state.volOverlayMode || (state.toggles.volIntel ? 'volintel' : (state.toggles.volume ? 'simple' : 'off'));
  const radios = document.querySelectorAll('input[name="setting-vol-mode"], input[name="vol-overlay-mode"]');
  radios.forEach(r => {
    r.checked = (r.value === volMode);
  });

  // Sync color pickers
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
    closeLine: 'setting-color-close-line',
    viBs: 'setting-color-vi-bs',
    viPp: 'setting-color-vi-pp',
    viPv: 'setting-color-vi-pv',
    viDv: 'setting-color-vi-dv',
    viSup: 'setting-color-vi-sup',
    viSdn: 'setting-color-vi-sdn',
    viGrey: 'setting-color-vi-grey'
  };
  Object.entries(colorMap).forEach(([key, id]) => {
    const colInput = document.getElementById(id);
    if (colInput && state.colors[key]) colInput.value = state.colors[key];
  });

  // Sync Volume Intelligence Parameters
  const vi = state.volIntelSettings || {};
  const setElVal = (id, val) => {
    const element = document.getElementById(id);
    if (element) {
      if (element.type === 'checkbox') element.checked = Boolean(val);
      else element.value = String(val);
    }
  };
  setElVal('setting-vi-show-volma', vi.showVolMa !== false);
  setElVal('setting-vi-volma-period', vi.volMaPeriod ?? 50);
  setElVal('setting-vi-pp-lookback', vi.ppLookback ?? 10);
  setElVal('setting-vi-bs-mult', vi.bsMult ?? 3.0);
  setElVal('setting-vi-dry-thresh', vi.dryThresh ?? 0.20);
  setElVal('setting-vi-paint-bars', vi.paintBars ?? false);
  setElVal('setting-vi-bs-marker-shape', vi.bsMarkerShape ?? 'circle');

  // Sync width selects
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

  // Sync theme dropdown & custom pickers
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
  if (window.lucide) lucide.createIcons();
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
    closeLine: '#10b981',
    volIntelMa: '#fbbf24',
    viBs: '#a855f7',
    viPp: '#0ea5e9',
    viPv: '#06b6d4',
    viDv: '#f59e0b',
    viSup: '#10b981',
    viSdn: '#ef4444',
    viGrey: '#64748b',
    viLowVol: '#e2e8f0'
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
    closeLine: 1,
    volIntelMa: 1.5
  };
  state.volIntelSettings = {
    showVolMa: true,
    volMaPeriod: 50,
    ppLookback: 10,
    bsMult: 3.0,
    dryThresh: 0.20,
    paintBars: false,
    bsMarkerShape: 'circle',
    bsMarkerColor: '#a855f7'
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
    volIntelSettings: state.volIntelSettings,
    chartTheme: state.chartTheme,
    customThemeColors: state.customThemeColors,
    pivotType: state.pivotType
  });
  renderVolumeIntelligence();
  saveIndicatorPreferences();
  showToast('Line styles and thicknesses reset to default', 'info');
}

// -------------------------------------------------------------
// User Indicator Preferences Management & Cloud Sync
// -------------------------------------------------------------

let savePrefsTimeout = null;

function saveIndicatorPreferences() {
  const prefs = {
    volOverlayMode: state.volOverlayMode || 'volintel',
    toggles: { ...state.toggles },
    colors: { ...state.colors },
    pivotType: state.pivotType || el.selectPivotType?.value || 'Traditional (Auto)',
    chartTheme: state.chartTheme || 'dark',
    customThemeColors: { ...state.customThemeColors },
    lineWidths: { ...state.lineWidths },
    volIntelSettings: { ...state.volIntelSettings }
  };

  try {
    localStorage.setItem('user_indicator_prefs', JSON.stringify(prefs));
    localStorage.setItem('chart_theme', state.chartTheme || 'dark');
  } catch (e) {}

  const hasAuth = state.user || state.isAdmin || state.token || localStorage.getItem('authToken') || localStorage.getItem('adminToken');
  if (hasAuth) {
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
      } catch (e) {
        console.warn('Failed to save indicator preferences to server:', e);
      }
    }, 400);
  }
}

function applyLoadedIndicatorPreferences(prefs) {
  if (!prefs) return;
  if (prefs.volOverlayMode) {
    state.volOverlayMode = prefs.volOverlayMode;
  } else if (prefs.toggles) {
    if (prefs.toggles.volIntel) state.volOverlayMode = 'volintel';
    else if (prefs.toggles.volume || prefs.toggles.vol) state.volOverlayMode = 'simple';
    else state.volOverlayMode = 'volintel';
  } else {
    state.volOverlayMode = 'volintel';
  }

  if (prefs.toggles) {
    state.toggles = { ...state.toggles, ...prefs.toggles };
  }
  if (prefs.colors) {
    state.colors = { ...state.colors, ...prefs.colors };
  }
  if (prefs.lineWidths) {
    state.lineWidths = { ...state.lineWidths, ...prefs.lineWidths };
  }
  if (prefs.pivotType) {
    state.pivotType = prefs.pivotType;
    if (el.selectPivotType) el.selectPivotType.value = prefs.pivotType;
  }
  if (prefs.chartTheme) {
    state.chartTheme = prefs.chartTheme;
  }
  if (prefs.customThemeColors) {
    state.customThemeColors = { ...state.customThemeColors, ...prefs.customThemeColors };
  }
  if (prefs.volIntelSettings) {
    state.volIntelSettings = { ...state.volIntelSettings, ...prefs.volIntelSettings };
  }

  try {
    localStorage.setItem('user_indicator_prefs', JSON.stringify({
      volOverlayMode: state.volOverlayMode,
      toggles: state.toggles,
      colors: state.colors,
      lineWidths: state.lineWidths,
      pivotType: state.pivotType,
      chartTheme: state.chartTheme,
      customThemeColors: state.customThemeColors,
      volIntelSettings: state.volIntelSettings
    }));
  } catch (e) {}

  // Apply theme & line widths
  applyChartTheme(state.chartTheme);
  applyLineWidths(state.lineWidths);

  // Update Color Input DOM states in toolbar
  if (el.colorEma10 && state.colors.ema10) el.colorEma10.value = state.colors.ema10;
  if (el.colorEma20 && state.colors.ema20) el.colorEma20.value = state.colors.ema20;
  if (el.colorEma50 && state.colors.ema50) el.colorEma50.value = state.colors.ema50;
  if (el.colorEma150 && state.colors.ema150) el.colorEma150.value = state.colors.ema150;
  if (el.colorEma200 && state.colors.ema200) el.colorEma200.value = state.colors.ema200;
  if (el.colorVolAvg && state.colors.volAvg) el.colorVolAvg.value = state.colors.volAvg;
  if (el.colorVwap && state.colors.vwap) el.colorVwap.value = state.colors.vwap;
  if (el.colorDarvasTop && state.colors.darvasTop) el.colorDarvasTop.value = state.colors.darvasTop;
  if (el.colorDarvasBottom && state.colors.darvasBottom) el.colorDarvasBottom.value = state.colors.darvasBottom;
  if (el.colorRsi && state.colors.rsi) el.colorRsi.value = state.colors.rsi;
  if (el.colorRsiSma && state.colors.rsiSma) el.colorRsiSma.value = state.colors.rsiSma;
  if (el.colorAvwap && state.colors.avwap) el.colorAvwap.value = state.colors.avwap;

  const colorSettingIds = {
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
    closeLine: 'setting-color-close-line',
    viBs: 'setting-color-vi-bs',
    viPp: 'setting-color-vi-pp',
    viPv: 'setting-color-vi-pv',
    viDv: 'setting-color-vi-dv',
    viSup: 'setting-color-vi-sup',
    viSdn: 'setting-color-vi-sdn'
  };
  Object.entries(colorSettingIds).forEach(([k, cid]) => {
    const inp = document.getElementById(cid);
    if (inp && state.colors[k]) inp.value = state.colors[k];
  });

  // Update Checkbox & Radio DOM states
  if (el.chkEma10) el.chkEma10.checked = Boolean(state.toggles.ema10);
  if (el.chkEma20) el.chkEma20.checked = Boolean(state.toggles.ema20);
  if (el.chkEma50) el.chkEma50.checked = Boolean(state.toggles.ema50);
  if (el.chkEma150) el.chkEma150.checked = Boolean(state.toggles.ema150);
  if (el.chkEma200) el.chkEma200.checked = Boolean(state.toggles.ema200);
  if (el.chkVwap) el.chkVwap.checked = Boolean(state.toggles.vwap);
  if (el.chkPivots) el.chkPivots.checked = Boolean(state.toggles.pivots);
  if (el.chkDarvas) el.chkDarvas.checked = Boolean(state.toggles.darvas);
  if (el.chkRsi) el.chkRsi.checked = Boolean(state.toggles.rsi);

  const volMode = state.volOverlayMode || 'volintel';
  const radios = document.querySelectorAll('input[name="setting-vol-mode"], input[name="vol-overlay-mode"]');
  radios.forEach(r => {
    r.checked = (r.value === volMode);
  });
  const sel = document.getElementById('select-vol-mode');
  if (sel) sel.value = volMode;

  // Apply Series Colors, Visibility & Line Widths
  if (state.charts?.series) {
    if (state.charts.series.candles) {
      state.charts.series.candles.applyOptions({
        priceLineVisible: true,
        priceLineColor: state.colors.closeLine || '#10b981',
        priceLineWidth: Number(state.lineWidths.closeLine || 1),
        priceLineStyle: 2,
        lastValueVisible: true
      });
    }
    state.charts.series.ema10?.applyOptions({ visible: Boolean(state.toggles.ema10), color: state.colors.ema10, lineWidth: Number(state.lineWidths.ema10 || 1.5) });
    state.charts.series.ema20?.applyOptions({ visible: Boolean(state.toggles.ema20), color: state.colors.ema20, lineWidth: Number(state.lineWidths.ema20 || 1.5) });
    state.charts.series.ema50?.applyOptions({ visible: Boolean(state.toggles.ema50), color: state.colors.ema50, lineWidth: Number(state.lineWidths.ema50 || 1.5) });
    state.charts.series.ema150?.applyOptions({ visible: Boolean(state.toggles.ema150), color: state.colors.ema150, lineWidth: Number(state.lineWidths.ema150 || 2) });
    state.charts.series.ema200?.applyOptions({ visible: Boolean(state.toggles.ema200), color: state.colors.ema200, lineWidth: Number(state.lineWidths.ema200 || 2) });
    state.charts.series.vwap?.applyOptions({ visible: Boolean(state.toggles.vwap), color: state.colors.vwap, lineWidth: Number(state.lineWidths.vwap || 1.8) });
    state.charts.series.darvasTop?.applyOptions({ visible: Boolean(state.toggles.darvas), color: state.colors.darvasTop, lineWidth: Number(state.lineWidths.darvasTop || 2.5) });
    state.charts.series.darvasBottom?.applyOptions({ visible: Boolean(state.toggles.darvas), color: state.colors.darvasBottom, lineWidth: Number(state.lineWidths.darvasBottom || 2.5) });
    state.charts.series.volAvg?.applyOptions({ visible: Boolean(state.toggles.volAvg), color: state.colors.volAvg, lineWidth: Number(state.lineWidths.volAvg || 1.5) });
    state.charts.series.rsi?.applyOptions({ visible: Boolean(state.toggles.rsi), color: state.colors.rsi, lineWidth: Number(state.lineWidths.rsi || 2) });
    state.charts.series.rsiSma?.applyOptions({ visible: Boolean(state.toggles.rsi), color: state.colors.rsiSma, lineWidth: Number(state.lineWidths.rsiSma || 1.5) });
  }

  renderPersistedDrawings();
  renderVolumeIntelligence();

  if (el.tvRsiContainer) {
    el.tvRsiContainer.style.display = state.toggles.rsi ? 'flex' : 'none';
  }
  if (el.resizerPriceRsi) {
    el.resizerPriceRsi.style.display = state.toggles.rsi ? 'flex' : 'none';
  }
  if (el.resizerRsiBottom) {
    el.resizerRsiBottom.style.display = state.toggles.rsi ? 'flex' : 'none';
  }

  updateTimeScalesVisibility();
  updatePivotLines();
  syncChartIndicatorsWithPermissions();
  handleResize();
}

// -------------------------------------------------------------
// Authentication System (Multi-User: Max 5 Users + Admin)
// -------------------------------------------------------------

function getAuthHeaders() {
  const headers = {};
  const token = state.token || localStorage.getItem('authToken') || localStorage.getItem('adminToken') || localStorage.getItem('sangam_auth_token');
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

async function checkAuthStatus() {
  try {
    const statusRes = await fetch('/api/auth/status');
    const statusData = await statusRes.json();
    if (statusData.success) {
      state.authSlots = statusData;
      updateAuthSlotsUI();
    }
  } catch (err) {}

  if (!state.token) {
    await loadGuestPermissions();
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
        userId: data.userId || (data.username === 'Patent' ? 'admin' : data.username),
        username: data.username,
        role: data.role
      };
      state.isAdmin = (data.role === 'admin');
      updateAuthUI(state.user);

      if (data.indicatorPreferences) {
        applyLoadedIndicatorPreferences(data.indicatorPreferences);
      }
      if (data.drawings) {
        state.drawings = data.drawings;
        renderPersistedDrawings();
      }
      if (typeof data.notes === 'string') {
        try { localStorage.setItem('sangam_user_notes', data.notes); } catch (e) {}
        if (window.SangamNotes && typeof window.SangamNotes.setNotes === 'function') {
          window.SangamNotes.setNotes(data.notes);
        }
      }

      await loadWatchlists();
      await loadScreeners();
    } else {
      state.user = null;
      state.isAdmin = false;
      state.token = null;
      localStorage.removeItem('authToken');
      localStorage.removeItem('adminToken');
      await loadGuestPermissions();
      updateAuthUI(null);
    }
  } catch (err) {
    await loadGuestPermissions();
    updateAuthUI(null);
  }
}

function updateAuthSlotsUI() {
  if (el.headerSlotsBadge) {
    el.headerSlotsBadge.classList.add('hidden');
  }
  if (el.modalSlotsBadge) {
    el.modalSlotsBadge.classList.add('hidden');
  }
  if (el.btnSubmitRegister) {
    el.btnSubmitRegister.disabled = false;
    el.btnSubmitRegister.innerHTML = `<i data-lucide="user-plus" class="w-3.5 h-3.5"></i><span>Register Account</span>`;
    el.btnSubmitRegister.className = 'px-5 py-2 text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl shadow-lg shadow-emerald-900/30 transition-all flex items-center gap-1.5 cursor-pointer';
    lucide.createIcons();
  }
}

function updateAuthUI(user) {
  state.user = user;
  state.isAdmin = (user && user.role === 'admin');

  if (user) {
    el.headerSummaryStats?.classList.add('hidden');
    el.btnNavAnalytics?.classList.remove('hidden');
    el.btnNavAnalytics?.classList.add('flex');
    el.btnOpenAuthModal?.classList.add('hidden');
    el.userAuthBox?.classList.remove('hidden');
    el.userAuthBox?.classList.add('flex');
    if (el.userBadgeName) el.userBadgeName.textContent = user.username;
    if (el.userBadgeRole) {
      el.userBadgeRole.textContent = user.role === 'admin' ? '(Admin)' : '(User)';
      el.userBadgeRole.className = user.role === 'admin' ? 'text-emerald-400 text-[10px] font-bold' : 'text-slate-400 text-[10px] font-normal';
    }
    // Notes, MF Deals & Update CKTs buttons visible strictly to logged-in/registered user
    el.btnOpenNotes?.classList.remove('hidden');
    el.btnOpenNotes?.classList.add('flex');
    if (window.SangamNotes?.refreshAuth) {
      window.SangamNotes.refreshAuth();
    }

    el.btnOpenMfDeals?.classList.remove('hidden');
    el.btnOpenMfDeals?.classList.add('flex');
    if (window.SangamMfDeals?.refreshAuth) {
      window.SangamMfDeals.refreshAuth();
    }

    el.btnOpenCircuitModal?.classList.remove('hidden');
    el.btnOpenCircuitModal?.classList.add('flex');

    // Chart Journal launcher button visible to logged-in users
    el.btnOpenChartJournal?.classList.remove('hidden');
    el.btnOpenChartJournal?.classList.add('flex');
    if (typeof refreshJournalBadgeCount === 'function') {
      refreshJournalBadgeCount();
    }

    // Add Screener button in Command Deck category bar
    el.btnOpenAddModalDeck?.classList.remove('hidden');
    el.btnOpenAddModalDeck?.classList.add('flex');

    // Admin Console button visible strictly to admin
    if (user.role === 'admin') {
      el.btnAdminConsole?.classList.remove('hidden');
      el.btnAdminConsole?.classList.add('flex');
    } else {
      el.btnAdminConsole?.classList.add('hidden');
      el.btnAdminConsole?.classList.remove('flex');
    }

    if (el.dropdownUserName) el.dropdownUserName.textContent = user.username;
    if (el.dropdownUserRoleBadge) {
      el.dropdownUserRoleBadge.textContent = user.role === 'admin' ? 'Superadmin' : 'Active Member';
      el.dropdownUserRoleBadge.className = user.role === 'admin' 
        ? 'px-2 py-0.5 rounded-full text-[9px] font-bold bg-amber-500/15 text-amber-400 border border-amber-500/30 font-mono'
        : 'px-2 py-0.5 rounded-full text-[9px] font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 font-mono';
    }
    closeUserProfileDropdown();
  } else {
    el.headerSummaryStats?.classList.add('hidden');
    el.headerSummaryStats?.classList.remove('sm:flex', 'flex');
    el.btnNavAnalytics?.classList.add('hidden');
    el.btnNavAnalytics?.classList.remove('flex');
    el.btnOpenAuthModal?.classList.remove('hidden');
    el.userAuthBox?.classList.add('hidden');
    el.userAuthBox?.classList.remove('flex');
    closeUserProfileDropdown();
    el.btnOpenAddModalDeck?.classList.remove('hidden');
    el.btnOpenAddModalDeck?.classList.add('flex');
    el.btnOpenNotes?.classList.add('hidden');
    el.btnOpenNotes?.classList.remove('flex');
    if (window.SangamNotes && typeof window.SangamNotes.close === 'function') {
      window.SangamNotes.close();
    }
    el.btnOpenMfDeals?.classList.add('hidden');
    el.btnOpenMfDeals?.classList.remove('flex');
    if (window.SangamMfDeals && typeof window.SangamMfDeals.close === 'function') {
      window.SangamMfDeals.close();
    }
    el.btnOpenCircuitModal?.classList.add('hidden');
    el.btnOpenCircuitModal?.classList.remove('flex');
    el.btnOpenChartJournal?.classList.add('hidden');
    el.btnOpenChartJournal?.classList.remove('flex');
    closeCircuitModal();
    closeChangePasswordModal();
    if (typeof closeSaveChartModal === 'function') closeSaveChartModal();
    if (typeof closeChartJournalModal === 'function') closeChartJournalModal();
    if (typeof closeChartLightboxModal === 'function') closeChartLightboxModal();
    el.btnAdminConsole?.classList.add('hidden');
    el.btnAdminConsole?.classList.remove('flex');
  }

  renderScreeners();
  renderChartWatchlistDropdown();
  applyGuestPermissions();
  lucide.createIcons();
}

function toggleUserProfileDropdown() {
  const dd = document.getElementById('user-profile-dropdown');
  const arrow = document.getElementById('user-dropdown-arrow');
  if (!dd) return;
  const isHidden = dd.classList.contains('hidden');
  if (isHidden) {
    dd.classList.remove('hidden');
    if (arrow) arrow.classList.add('rotate-180');
  } else {
    dd.classList.add('hidden');
    if (arrow) arrow.classList.remove('rotate-180');
  }
}

function closeUserProfileDropdown() {
  const dd = document.getElementById('user-profile-dropdown');
  const arrow = document.getElementById('user-dropdown-arrow');
  if (dd) dd.classList.add('hidden');
  if (arrow) arrow.classList.remove('rotate-180');
}

window.toggleUserProfileDropdown = toggleUserProfileDropdown;
window.closeUserProfileDropdown = closeUserProfileDropdown;

// Close User Profile dropdown on click outside
document.addEventListener('click', (e) => {
  const box = document.getElementById('user-auth-box');
  if (box && !box.contains(e.target)) {
    closeUserProfileDropdown();
  }
});

async function loadGuestPermissions() {
  try {
    const res = await fetch('/api/guest-permissions');
    const data = await res.json();
    if (data.success && data.permissions) {
      state.guestPermissions = Object.assign({}, state.guestPermissions, data.permissions);
    }
  } catch (err) {
    console.warn('[GuestPermissions] Failed to load guest permissions:', err.message);
  }
  applyGuestPermissions();
}

function syncChartIndicatorsWithPermissions() {
  const isGuest = !state.user;
  const p = state.guestPermissions || {};
  const allowIndicators = !isGuest || Boolean(p.indicatorsToolbar);
  const allowVolIntel = !isGuest || Boolean(p.volumeIntelligence);

  const indToolbar = document.getElementById('chart-indicators-toolbar');
  const indDivider = document.getElementById('chart-indicators-divider');
  const btnSettings = document.getElementById('btn-open-line-settings');

  if (indToolbar) {
    if (allowIndicators) {
      indToolbar.classList.remove('hidden');
      indToolbar.classList.add('flex');
    } else {
      indToolbar.classList.add('hidden');
      indToolbar.classList.remove('flex');
    }
  }
  if (indDivider) {
    if (allowIndicators) indDivider.classList.remove('hidden');
    else indDivider.classList.add('hidden');
  }
  if (btnSettings) {
    if (allowIndicators) btnSettings.classList.remove('hidden');
    else btnSettings.classList.add('hidden');
  }

  if (state.charts?.series) {
    const s = state.charts.series;
    const t = state.toggles || {};

    s.ema10?.applyOptions({ visible: allowIndicators && Boolean(t.ema10 !== false) });
    s.ema20?.applyOptions({ visible: allowIndicators && Boolean(t.ema20 !== false) });
    s.ema50?.applyOptions({ visible: allowIndicators && Boolean(t.ema50 !== false) });
    s.ema150?.applyOptions({ visible: allowIndicators && Boolean(t.ema150 !== false) });
    s.ema200?.applyOptions({ visible: allowIndicators && Boolean(t.ema200 !== false) });
    s.vwap?.applyOptions({ visible: allowIndicators && Boolean(t.vwap !== false) });
    s.darvasTop?.applyOptions({ visible: allowIndicators && Boolean(t.darvas !== false) });
    s.darvasBottom?.applyOptions({ visible: allowIndicators && Boolean(t.darvas !== false) });

    const showRsi = allowIndicators && Boolean(t.rsi !== false);
    s.rsi?.applyOptions({ visible: showRsi });
    s.rsiSma?.applyOptions({ visible: showRsi });

    if (el.tvRsiContainer) el.tvRsiContainer.style.display = showRsi ? 'flex' : 'none';
    if (el.resizerPriceRsi) el.resizerPriceRsi.style.display = showRsi ? 'flex' : 'none';
    if (el.resizerRsiBottom) el.resizerRsiBottom.style.display = showRsi ? 'flex' : 'none';
  }

  updatePivotLines();

  if (allowVolIntel && allowIndicators) {
    if (!state.volOverlayMode || state.volOverlayMode === 'off') {
      state.volOverlayMode = 'volintel';
    }
  } else if (!allowVolIntel) {
    if (state.volOverlayMode === 'volintel') {
      state.volOverlayMode = 'simple';
    }
  }
  renderVolumeIntelligence();

  updateTimeScalesVisibility();
  if (typeof handleResize === 'function') {
    handleResize();
  }
}

function applyGuestPermissions() {
  const p = state.guestPermissions || {};
  const isGuest = !state.user;

  // 0. Top Header Summary Stats (Screeners count & Stocks count) - Logged-in only
  const headerStatsEl = document.getElementById('header-summary-stats');
  if (isGuest) {
    headerStatsEl?.classList.add('hidden');
    headerStatsEl?.classList.remove('sm:flex', 'flex');
  } else {
    headerStatsEl?.classList.remove('hidden');
    headerStatsEl?.classList.add('sm:flex', 'flex');
  }

  // 1. Guest Announcement & Call-to-Action Banner
  const guestBannerEl = document.getElementById('guest-announcement-banner');
  const guestBannerTextEl = document.getElementById('guest-banner-text-display');
  if (isGuest && p.guestBanner) {
    guestBannerEl?.classList.remove('hidden');
    guestBannerEl?.classList.add('flex');
    if (guestBannerTextEl) {
      guestBannerTextEl.textContent = p.guestBannerText || 'Viewing in Guest mode';
    }
  } else {
    guestBannerEl?.classList.add('hidden');
    guestBannerEl?.classList.remove('flex');
  }

  // 2. Screener Command Deck (Top Pull-down Bar)
  const deckEl = document.getElementById('screener-command-deck');
  if (isGuest && !p.screenerDeck) {
    deckEl?.classList.add('hidden');
  } else {
    deckEl?.classList.remove('hidden');
  }

  // 3. Left Sidebar & Dual Pane vs Fullscreen Chart
  const sidebarEl = document.getElementById('sidebar-pane');
  const splitterEl = document.getElementById('workspace-splitter');
  const chartPaneEl = document.getElementById('chart-pane');

  if (isGuest && !p.sidebarScans) {
    sidebarEl?.classList.add('hidden');
    splitterEl?.classList.add('hidden');
    splitterEl?.classList.remove('lg:flex');
    chartPaneEl?.classList.add('w-full');
    chartPaneEl?.classList.remove('flex-1');
  } else {
    sidebarEl?.classList.remove('hidden');
    splitterEl?.classList.remove('hidden');
    splitterEl?.classList.add('lg:flex');
    chartPaneEl?.classList.remove('w-full');
    chartPaneEl?.classList.add('flex-1');
  }

  // 4. Custom Screener Button
  const btnAddScreener = document.getElementById('btn-open-add-modal-deck');
  if (isGuest && !p.customScreener) {
    btnAddScreener?.classList.add('hidden');
  } else if (!isGuest || p.customScreener) {
    btnAddScreener?.classList.remove('hidden');
  }

  // 5. Screener Export & Copy Buttons
  const btnExport = document.getElementById('btn-export-csv');
  const btnCopy = document.getElementById('btn-copy-stocks');
  if (isGuest && !p.screenerExport) {
    btnExport?.classList.add('hidden');
    btnCopy?.classList.add('hidden');
  } else {
    btnExport?.classList.remove('hidden');
    btnCopy?.classList.remove('hidden');
  }

  // 6. Watchlists
  const tabWl = document.getElementById('tab-btn-watchlists');
  const chartWlWrapper = document.getElementById('chart-watchlist-wrapper');
  if (isGuest && !p.watchlists) {
    tabWl?.classList.add('hidden');
    chartWlWrapper?.classList.add('hidden');
  } else {
    tabWl?.classList.remove('hidden');
    chartWlWrapper?.classList.remove('hidden');
  }

  // 7. Technical Indicators Toolbar & Chart Series Sync
  syncChartIndicatorsWithPermissions();

  // 8. Intraday Timeframes Visual State
  const intradayBtns = document.querySelectorAll('.timeframe-btn[data-interval="5m"], .timeframe-btn[data-interval="15m"], .timeframe-btn[data-interval="60m"]');
  intradayBtns.forEach(btn => {
    if (isGuest && !p.intradayTimeframes) {
      btn.title = 'Intraday (5m, 15m, 1H) - Requires Account Login';
      btn.classList.add('opacity-60');
    } else {
      btn.title = btn.dataset.interval + ' timeframe';
      btn.classList.remove('opacity-60');
    }
  });

  // 9. Stock Search Switcher
  const manualSearch = document.getElementById('manual-search-wrapper');
  if (isGuest && !p.stockSearch) {
    manualSearch?.classList.add('hidden');
  } else {
    manualSearch?.classList.remove('hidden');
  }

  // 10. Sub-Page Links in Navbar
  if (isGuest && p.navSubpages) {
    el.btnNavAnalytics?.classList.remove('hidden');
    el.btnNavAnalytics?.classList.add('flex');
  }

  // Resize chart to adapt to full-screen width smoothly
  if (typeof handleResize === 'function') {
    setTimeout(handleResize, 50);
  }
  if (window.lucide) lucide.createIcons();
}

function openAuthModal(tab = 'login') {
  switchAuthTab(tab);
  if (el.loginErrorBanner) el.loginErrorBanner.className = 'hidden';
  if (el.registerErrorBanner) el.registerErrorBanner.className = 'hidden';
  if (el.registerSuccessBanner) el.registerSuccessBanner.className = 'hidden';
  
  if (el.authModal) {
    el.authModal.classList.remove('hidden');
    el.authModal.classList.add('flex');
  }
}

function closeAuthModal() {
  if (el.authModal) {
    el.authModal.classList.add('hidden');
    el.authModal.classList.remove('flex');
  }
}

function switchAuthTab(tab) {
  if (tab === 'login') {
    el.authTabLogin?.classList.add('bg-blue-600', 'text-white', 'shadow-sm');
    el.authTabLogin?.classList.remove('text-slate-400');
    el.authTabRegister?.classList.remove('bg-emerald-600', 'text-white', 'shadow-sm');
    el.authTabRegister?.classList.add('text-slate-400');
    el.loginForm?.classList.remove('hidden');
    el.registerForm?.classList.add('hidden');
    if (el.loginUsername) el.loginUsername.focus();
  } else {
    el.authTabRegister?.classList.add('bg-emerald-600', 'text-white', 'shadow-sm');
    el.authTabRegister?.classList.remove('text-slate-400');
    el.authTabLogin?.classList.remove('bg-blue-600', 'text-white', 'shadow-sm');
    el.authTabLogin?.classList.add('text-slate-400');
    el.registerForm?.classList.remove('hidden');
    el.loginForm?.classList.add('hidden');
    if (el.regUsername) el.regUsername.focus();
  }
  updateAuthSlotsUI();
}

async function handleLoginSubmit(e) {
  if (e && e.preventDefault) e.preventDefault();
  const username = (el.loginUsername?.value || '').trim();
  const password = el.loginPassword?.value || '';
  const banner = el.loginErrorBanner;

  try {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });
    const data = await res.json();

    if (!res.ok || !data.success) {
      if (banner) {
        banner.className = 'p-2.5 rounded-xl text-xs bg-rose-500/10 text-rose-400 border border-rose-500/20';
        banner.textContent = data.error || 'Invalid username or password.';
      }
      return;
    }

    state.token = data.token;
    localStorage.setItem('authToken', data.token);
    state.user = { userId: data.userId || (data.username === 'Patent' ? 'admin' : data.username), username: data.username, role: data.role };
    state.isAdmin = (data.role === 'admin');

    updateAuthUI(state.user);
    if (data.indicatorPreferences) {
      applyLoadedIndicatorPreferences(data.indicatorPreferences);
    }
    if (data.drawings) {
      state.drawings = data.drawings;
      renderPersistedDrawings();
    }
    if (typeof data.notes === 'string') {
      try { localStorage.setItem('sangam_user_notes', data.notes); } catch (e) {}
      if (window.SangamNotes && typeof window.SangamNotes.setNotes === 'function') {
        window.SangamNotes.setNotes(data.notes);
      }
    }
    closeAuthModal();
    showToast(`Welcome back, ${data.username}! Logged in successfully.`, 'success');
    await loadScreeners();
    await loadWatchlists();
  } catch (err) {
    if (banner) {
      banner.className = 'p-2.5 rounded-xl text-xs bg-rose-500/10 text-rose-400 border border-rose-500/20';
      banner.textContent = 'Server connection error: ' + err.message;
    }
  }
}

async function handleRegisterSubmit(e) {
  if (e && e.preventDefault) e.preventDefault();
  const username = (el.regUsername?.value || '').trim();
  const password = el.regPassword?.value || '';
  const confirmPassword = el.regConfirmPassword?.value || '';
  const errBanner = el.registerErrorBanner;
  const succBanner = el.registerSuccessBanner;

  if (errBanner) errBanner.className = 'hidden';
  if (succBanner) succBanner.className = 'hidden';

  if (!username || !password) {
    if (errBanner) {
      errBanner.className = 'p-2.5 rounded-xl text-xs bg-rose-500/10 text-rose-400 border border-rose-500/20';
      errBanner.textContent = 'Please fill in all fields';
    }
    return;
  }

  if (password !== confirmPassword) {
    if (errBanner) {
      errBanner.className = 'p-2.5 rounded-xl text-xs bg-rose-500/10 text-rose-400 border border-rose-500/20';
      errBanner.textContent = 'Passwords do not match!';
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

    if (!res.ok || !data.success) {
      if (errBanner) {
        errBanner.className = 'p-2.5 rounded-xl text-xs bg-rose-500/10 text-rose-400 border border-rose-500/20';
        errBanner.textContent = data.error || 'Registration failed.';
      }
      return;
    }

    state.token = data.token;
    localStorage.setItem('authToken', data.token);
    state.user = { userId: data.userId || data.username, username: data.username, role: 'user' };
    state.isAdmin = false;

    updateAuthUI(state.user);
    if (data.indicatorPreferences) {
      applyLoadedIndicatorPreferences(data.indicatorPreferences);
    }
    closeAuthModal();
    showToast(`Account registered successfully! Welcome ${data.username}.`, 'success');
    await loadScreeners();
    await loadWatchlists();
  } catch (err) {
    if (errBanner) {
      errBanner.className = 'p-2.5 rounded-xl text-xs bg-rose-500/10 text-rose-400 border border-rose-500/20';
      errBanner.textContent = 'Registration error: ' + err.message;
    }
  }
}

async function handleLogout() {
  if (state.token) {
    try {
      await fetch('/api/auth/logout', {
        method: 'POST',
        headers: getAuthHeaders()
      });
    } catch (err) {}
  }

  state.user = null;
  state.isAdmin = false;
  state.token = null;
  state.watchlists = [];
  state.activeWatchlistId = null;
  localStorage.removeItem('authToken');
  localStorage.removeItem('adminToken');

  await loadGuestPermissions();
  updateAuthUI(null);
  switchSidebarTab('screeners');
  await loadScreeners();
  showToast('Logged out successfully.', 'info');
}

// -------------------------------------------------------------
// User Change Password Modal Controller (with Eye Visibility Toggles)
// -------------------------------------------------------------

function openChangePasswordModal() {
  if (!state.user) {
    showToast('Please log in to change your password', 'info');
    openAuthModal('login');
    return;
  }
  const modal = document.getElementById('change-password-modal');
  if (!modal) return;
  const errBanner = document.getElementById('change-password-error-banner');
  const succBanner = document.getElementById('change-password-success-banner');
  if (errBanner) { errBanner.className = 'hidden'; errBanner.textContent = ''; }
  if (succBanner) { succBanner.className = 'hidden'; succBanner.textContent = ''; }

  const cp = document.getElementById('current-password-input');
  const np = document.getElementById('new-password-input');
  const cnp = document.getElementById('confirm-password-input');
  if (cp) { cp.value = ''; cp.type = 'password'; }
  if (np) { np.value = ''; np.type = 'password'; }
  if (cnp) { cnp.value = ''; cnp.type = 'password'; }

  // Reset eye icons
  ['icon-current-pw', 'icon-new-pw', 'icon-confirm-pw'].forEach(id => {
    const icon = document.getElementById(id);
    if (icon) icon.setAttribute('data-lucide', 'eye');
  });

  modal.classList.remove('hidden');
  modal.classList.add('flex');
  if (window.lucide) lucide.createIcons();
  if (cp) cp.focus();
}

function closeChangePasswordModal() {
  const modal = document.getElementById('change-password-modal');
  if (modal) {
    modal.classList.add('hidden');
    modal.classList.remove('flex');
  }
}

function togglePasswordVisibility(inputId, iconId) {
  const input = document.getElementById(inputId);
  const icon = document.getElementById(iconId);
  if (!input) return;
  if (input.type === 'password') {
    input.type = 'text';
    if (icon) icon.setAttribute('data-lucide', 'eye-off');
  } else {
    input.type = 'password';
    if (icon) icon.setAttribute('data-lucide', 'eye');
  }
  if (window.lucide) lucide.createIcons();
}

async function handleChangePasswordSubmit(e) {
  if (e && e.preventDefault) e.preventDefault();
  const errBanner = document.getElementById('change-password-error-banner');
  const succBanner = document.getElementById('change-password-success-banner');
  if (errBanner) { errBanner.className = 'hidden'; errBanner.textContent = ''; }
  if (succBanner) { succBanner.className = 'hidden'; succBanner.textContent = ''; }

  const currentPassword = (document.getElementById('current-password-input')?.value || '').trim();
  const newPassword = (document.getElementById('new-password-input')?.value || '').trim();
  const confirmPassword = (document.getElementById('confirm-password-input')?.value || '').trim();

  if (!currentPassword || !newPassword || !confirmPassword) {
    if (errBanner) {
      errBanner.className = 'p-3 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-400 font-medium text-xs';
      errBanner.textContent = 'Please fill in all password fields.';
    }
    return;
  }

  if (newPassword.length < 4) {
    if (errBanner) {
      errBanner.className = 'p-3 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-400 font-medium text-xs';
      errBanner.textContent = 'New password must be at least 4 characters long.';
    }
    return;
  }

  if (newPassword !== confirmPassword) {
    if (errBanner) {
      errBanner.className = 'p-3 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-400 font-medium text-xs';
      errBanner.textContent = 'New password and confirm password do not match!';
    }
    return;
  }

  const btn = document.getElementById('btn-submit-change-password');
  if (btn) {
    btn.disabled = true;
    btn.innerHTML = `<i data-lucide="loader-2" class="w-4 h-4 animate-spin"></i><span>Updating...</span>`;
    if (window.lucide) lucide.createIcons();
  }

  try {
    const res = await fetch('/api/auth/change-password', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeaders()
      },
      body: JSON.stringify({ currentPassword, newPassword })
    });
    const data = await res.json();

    if (!res.ok || !data.success) {
      if (errBanner) {
        errBanner.className = 'p-3 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-400 font-medium text-xs';
        errBanner.textContent = data.error || 'Failed to update password.';
      }
      return;
    }

    if (succBanner) {
      succBanner.className = 'p-3 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 font-medium text-xs';
      succBanner.textContent = 'Password changed successfully!';
    }
    showToast('Password updated successfully!', 'success');
    setTimeout(() => {
      closeChangePasswordModal();
    }, 1200);
  } catch (err) {
    if (errBanner) {
      errBanner.className = 'p-3 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-400 font-medium text-xs';
      errBanner.textContent = 'Server connection error: ' + err.message;
    }
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.innerHTML = `<i data-lucide="check" class="w-4 h-4"></i><span>Update Password</span>`;
      if (window.lucide) lucide.createIcons();
    }
  }
}

// -------------------------------------------------------------
// Left Sidebar Tabs (Screeners vs 5 Watchlists)
// -------------------------------------------------------------

function switchSidebarTab(tab) {
  state.activeSidebarTab = tab;

  // Reset tab button states
  [el.tabBtnScreeners, el.tabBtnWatchlists, el.tabBtnPricescan, el.tabBtnSsrvol, el.tabBtnVcpscan].forEach(btn => {
    if (!btn) return;
    btn.classList.remove('active', 'bg-blue-600', 'bg-amber-500', 'bg-emerald-600', 'bg-purple-600', 'text-white', 'text-black', 'shadow-sm');
    btn.classList.add('bg-dark-bg', 'text-slate-400', 'border', 'border-dark-border');
  });

  // Reset views
  [el.sidebarScreenersView, el.sidebarWatchlistsView, el.sidebarPricescanView, el.sidebarSsrvolView, el.sidebarVcpscanView].forEach(v => {
    if (!v) return;
    v.classList.add('hidden');
    v.classList.remove('flex');
  });

  if (tab === 'screeners') {
    el.tabBtnScreeners?.classList.add('active', 'bg-blue-600', 'text-white', 'shadow-sm');
    el.tabBtnScreeners?.classList.remove('bg-dark-bg', 'text-slate-400', 'border', 'border-dark-border');
    el.sidebarScreenersView?.classList.remove('hidden');
    el.sidebarScreenersView?.classList.add('flex');
  } else if (tab === 'watchlists') {
    if (!state.user) {
      showToast('Please log in or register to access your 5 custom watchlists.', 'info');
      openAuthModal('login');
      return;
    }

    el.tabBtnWatchlists?.classList.add('active', 'bg-amber-500', 'text-black', 'shadow-sm');
    el.tabBtnWatchlists?.classList.remove('bg-dark-bg', 'text-slate-400', 'border', 'border-dark-border');
    el.sidebarWatchlistsView?.classList.remove('hidden');
    el.sidebarWatchlistsView?.classList.add('flex');

    loadWatchlists();
  } else if (tab === 'pricescan') {
    if (!state.user) {
      showToast('Please log in or register to access DarvasScan.', 'info');
      openAuthModal('login');
      return;
    }

    el.tabBtnPricescan?.classList.add('active', 'bg-emerald-600', 'text-white', 'shadow-sm');
    el.tabBtnPricescan?.classList.remove('bg-dark-bg', 'text-slate-400', 'border', 'border-dark-border');
    el.sidebarPricescanView?.classList.remove('hidden');
    el.sidebarPricescanView?.classList.add('flex');

    populatePricescanScopeOptions();
  } else if (tab === 'ssrvol') {
    if (!state.user) {
      showToast('Please log in or register to access Strong Start RVOL Dashboard.', 'info');
      openAuthModal('login');
      return;
    }

    el.tabBtnSsrvol?.classList.add('active', 'bg-amber-500', 'text-black', 'shadow-sm');
    el.tabBtnSsrvol?.classList.remove('bg-dark-bg', 'text-slate-400', 'border', 'border-dark-border');
    el.sidebarSsrvolView?.classList.remove('hidden');
    el.sidebarSsrvolView?.classList.add('flex');

    populateSsrvolScopeOptions();
  } else if (tab === 'vcpscan') {
    if (!state.user) {
      showToast('Please log in or register to access the VCP Scanner.', 'info');
      openAuthModal('login');
      return;
    }

    el.tabBtnVcpscan?.classList.add('active', 'bg-purple-600', 'text-white', 'shadow-sm');
    el.tabBtnVcpscan?.classList.remove('bg-dark-bg', 'text-slate-400', 'border', 'border-dark-border');
    el.sidebarVcpscanView?.classList.remove('hidden');
    el.sidebarVcpscanView?.classList.add('flex');

    populateVcpscanScopeOptions();
  }
}

// -------------------------------------------------------------
// Watchlist Management System (5 Lists x 50 Stocks Each)
// -------------------------------------------------------------

async function loadWatchlists() {
  if (!state.token) return;

  try {
    const res = await fetch('/api/watchlists', {
      headers: getAuthHeaders()
    });
    const data = await res.json();
    if (data.success && Array.isArray(data.watchlists)) {
      state.watchlists = data.watchlists;
      state.maxWatchlists = data.maxWatchlists || state.maxWatchlists || 5;
      if (!state.activeWatchlistId || !state.watchlists.some(w => w.id === state.activeWatchlistId)) {
        state.activeWatchlistId = state.watchlists[0]?.id || null;
      }
      renderWatchlistSelector();
      renderWatchlistStocks();
      renderChartWatchlistDropdown();
      refreshWatchlistQuotes();
    }
  } catch (err) {
    console.error('Failed to load watchlists:', err);
  }
}

function getActiveWatchlist() {
  return state.watchlists.find(w => w.id === state.activeWatchlistId) || state.watchlists[0] || null;
}

function updateWatchlistsTabBadge() {
  const tabWl = document.getElementById('tab-btn-watchlists');
  const tabLabel = document.getElementById('tab-watchlists-label') || tabWl?.querySelector('span:not(.sr-only)');
  const count = Array.isArray(state.watchlists) ? state.watchlists.length : 0;
  if (tabLabel) {
    tabLabel.textContent = `W(${count})`;
  }
  if (tabWl) {
    tabWl.title = `${count} User Custom Watchlist${count === 1 ? '' : 's'}`;
  }
}

function renderWatchlistSelector() {
  updateWatchlistsTabBadge();
  if (!el.selectActiveWatchlist) return;
  el.selectActiveWatchlist.innerHTML = '';

  state.watchlists.forEach(w => {
    const opt = document.createElement('option');
    opt.value = w.id;
    opt.textContent = `⭐ ${w.name} (${w.stocks.length}/500)`;
    if (w.id === state.activeWatchlistId) opt.selected = true;
    el.selectActiveWatchlist.appendChild(opt);
  });

  const activeWl = getActiveWatchlist();
  if (activeWl) {
    const count = activeWl.stocks.length;
    const slotsLeft = 500 - count;
    if (el.wlCapacityLabel) el.wlCapacityLabel.textContent = `${count} of 500 stocks filled`;
    if (el.wlSlotsLeft) {
      el.wlSlotsLeft.textContent = slotsLeft === 0 ? 'Full capacity' : `${slotsLeft} slot${slotsLeft > 1 ? 's' : ''} free`;
      el.wlSlotsLeft.className = slotsLeft === 0 ? 'text-rose-400 font-semibold' : 'text-amber-400 font-semibold';
    }
  }

  // Synchronize DarvasScan, SS_RVOL & VCP scan scope dropdowns with active watchlists
  populatePricescanScopeOptions();
  populateSsrvolScopeOptions();
  populateVcpscanScopeOptions();
}


function formatWatchlistDate(isoStr) {
  if (!isoStr) return '—';
  try {
    const d = new Date(isoStr);
    if (isNaN(d.getTime())) return '—';
    const day = String(d.getDate()).padStart(2, '0');
    const month = d.toLocaleString('en-US', { month: 'short' });
    const year = d.getFullYear();
    return `${day}-${month}-${year}`;
  } catch (_) {
    return '—';
  }
}

function renderWatchlistStocks() {
  if (!el.watchlistTbody) return;
  el.watchlistTbody.innerHTML = '';

  const sortField = state.watchlistSortField || 'symbol';
  const isAsc = state.watchlistSortAscending;

  // Update Table Header Sort Indicators
  document.querySelectorAll('th[data-wlsort]').forEach(th => {
    const isThisCol = th.dataset.wlsort === sortField;
    const icon = th.querySelector('svg, i');
    if (isThisCol) {
      th.classList.add('text-amber-400');
      th.classList.remove('text-slate-400');
      if (icon) {
        icon.setAttribute('data-lucide', isAsc ? 'arrow-up' : 'arrow-down');
      }
    } else {
      th.classList.remove('text-amber-400');
      th.classList.add('text-slate-400');
      if (icon) {
        icon.setAttribute('data-lucide', 'arrow-up-down');
      }
    }
  });

  const activeWl = getActiveWatchlist();
  if (!activeWl || !Array.isArray(activeWl.stocks) || activeWl.stocks.length === 0) {
    el.watchlistTbody.innerHTML = `
      <tr>
        <td colspan="7" class="py-16 text-center text-slate-500">
          <div class="flex flex-col items-center justify-center gap-2">
            <div class="w-10 h-10 rounded-full bg-dark-bg flex items-center justify-center text-slate-600">
              <i data-lucide="star" class="w-5 h-5 text-amber-500/40"></i>
            </div>
            <p class="text-xs font-semibold text-slate-300">Watchlist is Empty</p>
            <p class="text-[11px] text-slate-500 max-w-xs">Type stock symbols above or paste copied screener lists to save stocks here.</p>
          </div>
        </td>
      </tr>
    `;
    lucide.createIcons();
    return;
  }

  // Clone and sort stocks
  const sortedStocks = [...activeWl.stocks];

  sortedStocks.sort((a, b) => {
    const quoteA = state.watchlistQuotes[a.symbol] || {};
    const quoteB = state.watchlistQuotes[b.symbol] || {};

    if (sortField === 'symbol') {
      const symA = (a.symbol || '').toUpperCase();
      const symB = (b.symbol || '').toUpperCase();
      return isAsc ? symA.localeCompare(symB) : symB.localeCompare(symA);
    } else if (sortField === 'name') {
      const nameA = (a.name || a.symbol || '').toUpperCase();
      const nameB = (b.name || b.symbol || '').toUpperCase();
      return isAsc ? nameA.localeCompare(nameB) : nameB.localeCompare(nameA);
    } else if (sortField === 'ltp') {
      const valA = (typeof quoteA.ltp === 'number' && quoteA.ltp > 0) ? quoteA.ltp : 0;
      const valB = (typeof quoteB.ltp === 'number' && quoteB.ltp > 0) ? quoteB.ltp : 0;
      return isAsc ? valA - valB : valB - valA;
    } else if (sortField === 'changePercent') {
      const valA = (typeof quoteA.changePercent === 'number' && !isNaN(quoteA.changePercent)) ? quoteA.changePercent : (isAsc ? 99999 : -99999);
      const valB = (typeof quoteB.changePercent === 'number' && !isNaN(quoteB.changePercent)) ? quoteB.changePercent : (isAsc ? 99999 : -99999);
      return isAsc ? valA - valB : valB - valA;
    } else if (sortField === 'volume') {
      const valA = (typeof quoteA.volume === 'number' && quoteA.volume > 0) ? quoteA.volume : 0;
      const valB = (typeof quoteB.volume === 'number' && quoteB.volume > 0) ? quoteB.volume : 0;
      return isAsc ? valA - valB : valB - valA;
    } else if (sortField === 'addedAt') {
      const timeA = a.addedAt ? new Date(a.addedAt).getTime() : 0;
      const timeB = b.addedAt ? new Date(b.addedAt).getTime() : 0;
      return isAsc ? timeA - timeB : timeB - timeA;
    } else if (sortField === 'returnSinceAdded') {
      const getRet = (stk, q) => {
        const base = (typeof stk.addedPrice === 'number' && stk.addedPrice > 0) ? stk.addedPrice : null;
        const cur = (typeof q?.ltp === 'number' && q.ltp > 0) ? q.ltp : null;
        if (base !== null && cur !== null) {
          return ((cur - base) / base) * 100;
        }
        return null;
      };
      const retA = getRet(a, quoteA);
      const retB = getRet(b, quoteB);
      if (retA === null && retB === null) return 0;
      if (retA === null) return 1;
      if (retB === null) return -1;
      return isAsc ? retA - retB : retB - retA;
    }

    const symA = (a.symbol || '').toUpperCase();
    const symB = (b.symbol || '').toUpperCase();
    return isAsc ? symA.localeCompare(symB) : symB.localeCompare(symA);
  });

  sortedStocks.forEach(stock => {
    const isSelected = state.selectedStock && state.selectedStock.symbol === stock.symbol;
    const quote = state.watchlistQuotes[stock.symbol] || {};
    const ltpStr = quote.ltp ? fmt.currency(quote.ltp) : '...';
    const chgStr = quote.changePercent !== undefined ? fmt.percent(quote.changePercent) : '...';
    const volStr = (quote.volume && quote.volume > 0) ? fmt.volume(quote.volume) : '--';
    const isBull = (quote.changePercent || 0) >= 0;
    const chgBadge = quote.changePercent !== undefined
      ? (isBull ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-rose-500/10 text-rose-400 border border-rose-500/20')
      : 'text-slate-500';

    const addedDateStr = stock.addedAt ? formatWatchlistDate(stock.addedAt) : '—';
    const curLtp = (typeof quote.ltp === 'number' && quote.ltp > 0) ? quote.ltp : null;
    const basePrice = (typeof stock.addedPrice === 'number' && stock.addedPrice > 0) ? stock.addedPrice : null;

    let retHtml = '<span class="text-slate-500 font-mono text-[11px]">—</span>';
    if (basePrice !== null && curLtp !== null) {
      const retPct = ((curLtp - basePrice) / basePrice) * 100;
      const isProfit = retPct >= 0;
      const retClass = isProfit 
        ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
        : 'bg-rose-500/10 text-rose-400 border border-rose-500/20';
      const sign = isProfit ? '+' : '';
      const tooltip = `Added at ₹${basePrice.toFixed(2)} on ${addedDateStr}`;
      retHtml = `<span class="px-1.5 py-0.5 rounded text-[11px] font-mono font-semibold ${retClass}" title="${tooltip}">${sign}${retPct.toFixed(2)}%</span>`;
    } else if (basePrice !== null) {
      retHtml = `<span class="text-slate-400 font-mono text-[10px]" title="Added at ₹${basePrice}">₹${basePrice.toFixed(2)}</span>`;
    }

    const tr = document.createElement('tr');
    tr.className = `wl-stock-row border-b border-dark-border/40 hover:bg-dark-accent/40 cursor-pointer transition-colors ${isSelected ? 'bg-amber-500/10 border-l-2 border-amber-500' : ''}`;
    tr.innerHTML = `
      <td class="py-2.5 px-3">
        <div class="flex flex-col">
          <div class="flex items-center gap-1.5">
            <span class="font-mono font-bold text-slate-100 text-xs">${stock.symbol}</span>
            ${typeof getStockInfoButtonHtml === 'function' ? getStockInfoButtonHtml(stock.symbol, stock.name) : ''}
            ${getFnoBadgeHtml(stock.symbol)}
            ${getCircuitBadgeHtml(stock)}
          </div>
          <span class="text-[10px] text-slate-400 truncate max-w-[130px]" title="${stock.name || stock.symbol}">${stock.name || stock.symbol}</span>
        </div>
      </td>
      <td class="py-2.5 px-2 text-right font-mono font-semibold text-slate-200 text-xs">${ltpStr}</td>
      <td class="py-2.5 px-2 text-right">
        <span class="px-1.5 py-0.5 rounded text-[11px] font-mono font-semibold ${chgBadge}">${chgStr}</span>
      </td>
      <td class="py-2.5 px-2 text-right font-mono text-slate-400 text-[11px]">${volStr}</td>
      <td class="py-2.5 px-2 text-center font-mono text-slate-400 text-[11px] whitespace-nowrap" title="Added on ${addedDateStr}">${addedDateStr}</td>
      <td class="py-2.5 px-2 text-right whitespace-nowrap">${retHtml}</td>
      <td class="py-2.5 px-1 text-center">
        <button class="btn-remove-wl-stock p-1 rounded hover:bg-rose-500/20 text-slate-500 hover:text-rose-400 transition-colors cursor-pointer" data-symbol="${stock.symbol}" title="Remove from watchlist">
          <i data-lucide="x" class="w-3.5 h-3.5"></i>
        </button>
      </td>
    `;

    tr.addEventListener('click', (e) => {
      if (e.target.closest('.btn-remove-wl-stock')) return;
      selectStock({
        symbol: stock.symbol,
        name: stock.name || stock.symbol,
        close: quote.ltp || 0,
        changePercent: quote.changePercent || 0,
        volume: quote.volume || 0
      });
    });

    const removeBtn = tr.querySelector('.btn-remove-wl-stock');
    if (removeBtn) {
      removeBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        removeStockFromWatchlist(activeWl.id, stock.symbol);
      });
    }

    el.watchlistTbody.appendChild(tr);
  });

  lucide.createIcons();
}

async function addStockToActiveWatchlist(symbolOrSymbols, name = '') {
  if (!state.token) {
    showToast('Please login to use watchlists', 'info');
    openAuthModal('login');
    return;
  }

  const activeWl = getActiveWatchlist();
  if (!activeWl) return;

  // Split multi-symbols if pasted (e.g. from copy button: "RELIANCE, TCS, INFY")
  let symbols = [];
  if (Array.isArray(symbolOrSymbols)) {
    symbols = symbolOrSymbols;
  } else if (typeof symbolOrSymbols === 'string') {
    symbols = symbolOrSymbols.split(/[\s,;\n\r]+/);
  }

  const cleanSymbols = [...new Set(
    symbols
      .map(s => String(s || '').trim().toUpperCase().replace(/\.(NS|BO)$/, ''))
      .filter(Boolean)
  )];

  if (cleanSymbols.length === 0) return;

  if (cleanSymbols.length === 1) {
    const cleanSymbol = cleanSymbols[0];
    if (activeWl.stocks.length >= 500) {
      showToast(`Watchlist "${activeWl.name}" is at full capacity (500/500 stocks)`, 'error');
      return;
    }

    if (activeWl.stocks.some(s => (s.symbol || '').toUpperCase() === cleanSymbol)) {
      showToast(`${cleanSymbol} is already in "${activeWl.name}"`, 'info');
      return;
    }

    const curQuote = state.watchlistQuotes[cleanSymbol] || (state.selectedStock?.symbol === cleanSymbol ? state.selectedStock : null) || state.quotes?.[cleanSymbol];
    const entryPrice = curQuote?.ltp || curQuote?.close || curQuote?.price || null;

    try {
      const res = await fetch(`/api/watchlists/${activeWl.id}/stocks`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders()
        },
        body: JSON.stringify({ symbol: cleanSymbol, name, price: entryPrice })
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to add stock');
      }

      activeWl.stocks.push(data.stock);
      renderWatchlistSelector();
      renderWatchlistStocks();
      renderChartWatchlistDropdown();
      refreshWatchlistQuotes();
      showToast(`Added ${cleanSymbol} to "${activeWl.name}" (${activeWl.stocks.length}/500)`, 'success');

      if (el.wlQuickAddInput) el.wlQuickAddInput.value = '';
    } catch (err) {
      showToast(err.message, 'error');
    }
  } else {
    // Multi-stock batch add (e.g. pasting copied screener results)
    try {
      showToast(`Adding ${cleanSymbols.length} stocks to "${activeWl.name}"...`, 'info');
      const res = await fetch(`/api/watchlists/${activeWl.id}/stocks`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders()
        },
        body: JSON.stringify({ symbols: cleanSymbols })
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to add stocks');
      }

      if (Array.isArray(data.addedStocks) && data.addedStocks.length > 0) {
        activeWl.stocks.push(...data.addedStocks);
        renderWatchlistSelector();
        renderWatchlistStocks();
        renderChartWatchlistDropdown();
        refreshWatchlistQuotes();
      }

      let toastMsg = `Added ${data.addedCount || 0} stocks to "${activeWl.name}" (${activeWl.stocks.length}/500)`;
      if (data.skippedDuplicates > 0) {
        toastMsg += ` (${data.skippedDuplicates} duplicates skipped)`;
      }
      if (data.capacityReached) {
        toastMsg += ` (Capacity limit 500 reached)`;
      }
      showToast(toastMsg, (data.addedCount > 0 ? 'success' : 'info'));

      if (el.wlQuickAddInput) el.wlQuickAddInput.value = '';
    } catch (err) {
      showToast(err.message, 'error');
    }
  }
}

async function removeStockFromWatchlist(wlId, symbol) {
  if (!state.token) return;
  const wl = state.watchlists.find(w => w.id === wlId);
  if (!wl) return;

  try {
    const res = await fetch(`/api/watchlists/${wlId}/stocks/${encodeURIComponent(symbol)}`, {
      method: 'DELETE',
      headers: getAuthHeaders()
    });
    const data = await res.json();
    if (!res.ok || !data.success) throw new Error(data.error || 'Failed to remove stock');

    wl.stocks = wl.stocks.filter(s => s.symbol !== symbol);
    renderWatchlistSelector();
    renderWatchlistStocks();
    renderChartWatchlistDropdown();
    showToast(`Removed ${symbol} from "${wl.name}"`, 'info');
  } catch (err) {
    showToast(err.message, 'error');
  }
}

async function handleCreateNewWatchlist() {
  if (!state.token) {
    openAuthModal('login');
    return;
  }

  const maxWls = state.maxWatchlists || 5;
  if (state.watchlists.length >= maxWls) {
    showToast(`Maximum limit of ${maxWls} watchlists reached! Contact Admin to increase your limit.`, 'error');
    return;
  }

  const defaultName = `Watchlist ${state.watchlists.length + 1}`;
  const name = prompt(`Enter name for the new watchlist (Current capacity: ${state.watchlists.length}/${maxWls}):`, defaultName);
  if (!name || !name.trim()) return;

  try {
    const res = await fetch('/api/watchlists', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeaders()
      },
      body: JSON.stringify({ name: name.trim() })
    });
    const data = await res.json();
    if (!res.ok || !data.success) throw new Error(data.error || 'Failed to create watchlist');

    state.watchlists = data.watchlists;
    state.maxWatchlists = data.maxWatchlists || state.maxWatchlists || 5;
    state.activeWatchlistId = data.watchlist.id;
    renderWatchlistSelector();
    renderWatchlistStocks();
    renderChartWatchlistDropdown();
    showToast(`Created watchlist "${data.watchlist.name}" (${state.watchlists.length}/${state.maxWatchlists})`, 'success');
  } catch (err) {
    showToast(err.message, 'error');
  }
}

function openRenameModal() {
  const activeWl = getActiveWatchlist();
  if (!activeWl) return;
  if (el.renameWatchlistInput) el.renameWatchlistInput.value = activeWl.name;
  if (el.renameWatchlistModal) {
    el.renameWatchlistModal.classList.remove('hidden');
    el.renameWatchlistModal.classList.add('flex');
    if (el.renameWatchlistInput) el.renameWatchlistInput.focus();
  }
}

function closeRenameModal() {
  if (el.renameWatchlistModal) {
    el.renameWatchlistModal.classList.add('hidden');
    el.renameWatchlistModal.classList.remove('flex');
  }
}

async function handleRenameWatchlistSubmit(e) {
  if (e && e.preventDefault) e.preventDefault();
  const activeWl = getActiveWatchlist();
  if (!activeWl) return;

  const newName = (el.renameWatchlistInput?.value || '').trim();
  if (!newName) return;

  try {
    const res = await fetch(`/api/watchlists/${activeWl.id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeaders()
      },
      body: JSON.stringify({ name: newName })
    });
    const data = await res.json();
    if (!res.ok || !data.success) throw new Error(data.error || 'Failed to rename watchlist');

    activeWl.name = newName;
    renderWatchlistSelector();
    renderChartWatchlistDropdown();
    closeRenameModal();
    showToast(`Renamed watchlist to "${newName}"`, 'success');
  } catch (err) {
    showToast(err.message, 'error');
  }
}

async function handleDeleteWatchlist() {
  if (state.watchlists.length <= 1) {
    showToast('You must maintain at least 1 watchlist.', 'info');
    return;
  }

  const activeWl = getActiveWatchlist();
  if (!activeWl) return;

  const confirmed = confirm(`Are you sure you want to delete "${activeWl.name}" (${activeWl.stocks.length} stocks)?`);
  if (!confirmed) return;

  try {
    const res = await fetch(`/api/watchlists/${activeWl.id}`, {
      method: 'DELETE',
      headers: getAuthHeaders()
    });
    const data = await res.json();
    if (!res.ok || !data.success) throw new Error(data.error || 'Failed to delete watchlist');

    state.watchlists = data.watchlists;
    state.activeWatchlistId = state.watchlists[0]?.id || null;
    renderWatchlistSelector();
    renderWatchlistStocks();
    renderChartWatchlistDropdown();
    showToast(`Watchlist "${activeWl.name}" deleted`, 'info');
  } catch (err) {
    showToast(err.message, 'error');
  }
}

async function refreshWatchlistQuotes(isManual = false) {
  if (!state.token) {
    if (isManual) {
      showToast('Please login to refresh watchlists', 'info');
      openAuthModal('login');
    }
    return;
  }

  const refreshBtn = el.btnRefreshWlQuotes || document.getElementById('btn-refresh-wl-quotes');
  const icon = refreshBtn?.querySelector('i, svg');
  if (isManual && icon) {
    icon.classList.add('animate-spin');
  }
  if (refreshBtn && isManual) {
    refreshBtn.disabled = true;
    refreshBtn.classList.add('opacity-50');
  }

  try {
    // 1. Reload latest watchlists from server to sync newly added/removed stocks
    const wlRes = await fetch('/api/watchlists', {
      headers: getAuthHeaders()
    });
    const wlData = await wlRes.json();
    if (wlData.success && Array.isArray(wlData.watchlists)) {
      state.watchlists = wlData.watchlists;
      state.maxWatchlists = wlData.maxWatchlists || state.maxWatchlists || 5;
      if (!state.activeWatchlistId || !state.watchlists.some(w => w.id === state.activeWatchlistId)) {
        state.activeWatchlistId = state.watchlists[0]?.id || null;
      }
      renderWatchlistSelector();
      renderChartWatchlistDropdown();
    }

    const activeWl = getActiveWatchlist();
    if (!activeWl || !Array.isArray(activeWl.stocks) || activeWl.stocks.length === 0) {
      renderWatchlistStocks();
      if (isManual) {
        showToast('Watchlist is empty. Add stocks to view live data.', 'info');
      }
      return;
    }

    // 2. Fetch fresh live quotes for all stocks in the active watchlist
    const res = await fetch(`/api/watchlists/${activeWl.id}/quotes?fresh=1`, {
      headers: getAuthHeaders()
    });
    const data = await res.json();
    if (data.success && Array.isArray(data.quotes)) {
      data.quotes.forEach(q => {
        if (q && q.symbol) {
          state.watchlistQuotes[q.symbol] = q;
        }
      });
      renderWatchlistStocks();
      if (isManual) {
        showToast(`Refreshed live quotes for ${data.quotes.length} stock(s)`, 'success');
      }
    } else {
      renderWatchlistStocks();
    }
  } catch (err) {
    console.error('Quotes refresh error:', err);
    if (isManual) {
      showToast('Failed to refresh quotes: ' + (err.message || 'Network error'), 'error');
    }
  } finally {
    if (icon) icon.classList.remove('animate-spin');
    if (refreshBtn) {
      refreshBtn.disabled = false;
      refreshBtn.classList.remove('opacity-50');
    }
    if (window.lucide) lucide.createIcons();
  }
}

// -------------------------------------------------------------
// Chart Header "Add to Watchlist" Dropdown
// -------------------------------------------------------------

function toggleChartWatchlistMenu() {
  if (!el.chartWatchlistMenu) return;
  if (!state.user) {
    showToast('Please login or register to save stocks into your 5 watchlists.', 'info');
    openAuthModal('login');
    return;
  }

  const isHidden = el.chartWatchlistMenu.classList.contains('hidden');
  if (isHidden) {
    renderChartWatchlistDropdown();
    el.chartWatchlistMenu.classList.remove('hidden');
  } else {
    el.chartWatchlistMenu.classList.add('hidden');
  }
}

function renderChartWatchlistDropdown() {
  if (!el.chartWatchlistChecklist) return;
  el.chartWatchlistChecklist.innerHTML = '';

  const activeSym = (state.selectedStock?.symbol || el.manualStockInput?.value || 'RELIANCE').toUpperCase().replace(/\.(NS|BO)$/, '');
  const activeName = state.selectedStock?.name || activeSym;

  const anyWlHasStock = state.watchlists.some(wl => wl.stocks.some(s => (s.symbol || '').toUpperCase() === activeSym));
  if (el.btnChartWatchlistToggle) {
    if (anyWlHasStock) {
      el.btnChartWatchlistToggle.className = 'px-2.5 py-1 rounded-lg bg-amber-500 text-black border border-amber-400 shadow-sm transition-all cursor-pointer select-none flex items-center gap-1.5 font-sans font-semibold text-[11px]';
      el.btnChartWatchlistToggle.innerHTML = `<i data-lucide="star" class="w-3.5 h-3.5 fill-black text-black"></i><span>Watchlist</span>`;
      el.btnChartWatchlistToggle.title = `${activeSym} is in your watchlist (Click to manage)`;
    } else {
      el.btnChartWatchlistToggle.className = 'px-2.5 py-1 rounded-lg bg-amber-500/15 hover:bg-amber-500 text-amber-400 hover:text-black border border-amber-500/30 shadow-sm transition-all cursor-pointer select-none flex items-center gap-1.5 font-sans font-semibold text-[11px]';
      el.btnChartWatchlistToggle.innerHTML = `<i data-lucide="star" class="w-3.5 h-3.5 fill-none text-amber-400"></i><span>Watchlist</span>`;
      el.btnChartWatchlistToggle.title = `Add ${activeSym} to watchlist`;
    }
    lucide.createIcons();
  }

  if (state.watchlists.length === 0) {
    el.chartWatchlistChecklist.innerHTML = `<div class="text-[11px] text-slate-500 py-1 px-2">No watchlists available</div>`;
    return;
  }

  state.watchlists.forEach(wl => {
    const isPresent = wl.stocks.some(s => (s.symbol || '').toUpperCase() === activeSym);
    const isFull = wl.stocks.length >= 500 && !isPresent;

    const label = document.createElement('label');
    label.className = `flex items-center justify-between p-1.5 rounded-lg text-xs cursor-pointer select-none transition-colors ${
      isFull ? 'opacity-50 cursor-not-allowed bg-dark-bg/40' : 'hover:bg-dark-accent/60'
    }`;

    label.innerHTML = `
      <div class="flex items-center gap-2">
        <input type="checkbox" ${isPresent ? 'checked' : ''} ${isFull ? 'disabled' : ''} 
          class="rounded border-slate-700 text-amber-500 focus:ring-0 bg-dark-bg w-3.5 h-3.5 cursor-pointer">
        <span class="text-slate-200 font-medium">${wl.name}</span>
      </div>
      <span class="text-[10px] font-mono ${isPresent ? 'text-amber-400 font-bold' : 'text-slate-500'}">
        ${wl.stocks.length}/500
      </span>
    `;

    const chk = label.querySelector('input');
    chk.addEventListener('change', async (e) => {
      e.stopPropagation();
      if (chk.checked) {
        await addStockToSpecificWatchlist(wl.id, activeSym, activeName);
      } else {
        await removeStockFromWatchlist(wl.id, activeSym);
      }
    });

    el.chartWatchlistChecklist.appendChild(label);
  });
}

async function addStockToSpecificWatchlist(wlId, symbol, name) {
  const wl = state.watchlists.find(w => w.id === wlId);
  if (!wl) return;

  const curQuote = state.watchlistQuotes[symbol] || (state.selectedStock?.symbol === symbol ? state.selectedStock : null) || state.quotes?.[symbol];
  const entryPrice = curQuote?.ltp || curQuote?.close || curQuote?.price || null;

  try {
    const res = await fetch(`/api/watchlists/${wlId}/stocks`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeaders()
      },
      body: JSON.stringify({ symbol, name, price: entryPrice })
    });
    const data = await res.json();
    if (!res.ok || !data.success) throw new Error(data.error || 'Failed to add stock');

    wl.stocks.push(data.stock);
    renderWatchlistSelector();
    renderWatchlistStocks();
    renderChartWatchlistDropdown();
    refreshWatchlistQuotes();
    showToast(`Added ${symbol} to "${wl.name}" (${wl.stocks.length}/500)`, 'success');
  } catch (err) {
    showToast(err.message, 'error');
  }
}

window.openAuthModal = openAuthModal;
window.closeAuthModal = closeAuthModal;
window.switchAuthTab = switchAuthTab;
window.handleLogout = handleLogout;
window.switchSidebarTab = switchSidebarTab;
window.closeRenameModal = closeRenameModal;
window.openAddModal = openAddModal;
window.closeModal = closeModal;

// Theme handling (3 Soothing Modes: Nordic, Warm Paper, Midnight Obsidian)
function applyTheme(theme) {
  applyAppTheme(theme);
}

function applyAppTheme(theme) {
  if (theme === 'dark') theme = 'obsidian';
  if (theme === 'light') theme = 'nordic';
  if (!['nordic', 'warm', 'obsidian'].includes(theme)) theme = 'nordic';

  state.theme = theme;
  localStorage.setItem('sangam_theme', theme);
  localStorage.setItem('theme', theme);

  const root = document.documentElement;
  root.setAttribute('data-theme', theme);
  if (theme === 'obsidian') {
    root.classList.add('dark');
  } else {
    root.classList.remove('dark');
  }

  // Update body class for Option 2 themes
  if (document.body) {
    document.body.classList.remove('theme-warm', 'theme-obsidian');
    if (theme === 'warm') document.body.classList.add('theme-warm');
    else if (theme === 'obsidian') document.body.classList.add('theme-obsidian');
  }

  // Update theme segmented buttons (Banner buttons)
  const segBtns = document.querySelectorAll('.theme-seg-btn, .theme-opt-btn');
  segBtns.forEach(btn => {
    const isChosen = btn.getAttribute('data-theme') === theme || btn.id === `seg-btn-${theme}`;
    btn.classList.toggle('active', isChosen);
  });

  // Update button icon & checkmarks
  const activeIcon = document.getElementById('theme-active-icon');
  if (activeIcon) {
    if (theme === 'nordic') activeIcon.textContent = '🌿';
    else if (theme === 'warm') activeIcon.textContent = '📜';
    else activeIcon.textContent = '🌌';
  }

  const choices = document.querySelectorAll('.theme-choice-btn');
  choices.forEach(btn => {
    const check = btn.querySelector('.theme-check-mark');
    const isChosen = btn.getAttribute('data-choice') === theme;
    if (check) check.classList.toggle('hidden', !isChosen);
  });

  // Sync native chart theme
  if (typeof applyChartTheme === 'function') {
    if (theme === 'nordic') applyChartTheme('nordic');
    else if (theme === 'warm') applyChartTheme('warm');
    else applyChartTheme('obsidian');
  } else if (state.selectedStock && typeof updateNativeChartTheme === 'function') {
    updateNativeChartTheme();
  }

  // Re-render table if stocks present to update RSI colors
  if (typeof renderStocksTable === 'function' && state.currentStocks && state.currentStocks.length > 0) {
    renderStocksTable();
  }

  const dropdown = document.getElementById('theme-menu-dropdown');
  if (dropdown) dropdown.classList.add('hidden');
}

window.applyAppTheme = applyAppTheme;
window.switchTheme = applyAppTheme;

window.applyAppTheme = applyAppTheme;
window.toggleThemeDropdown = function(e) {
  if (e) {
    e.preventDefault();
    e.stopPropagation();
  }
  const dropdown = document.getElementById('theme-menu-dropdown');
  if (dropdown) dropdown.classList.toggle('hidden');
};

document.addEventListener('click', (e) => {
  const container = document.getElementById('theme-dropdown-container');
  if (container && !container.contains(e.target)) {
    const dropdown = document.getElementById('theme-menu-dropdown');
    if (dropdown) dropdown.classList.add('hidden');
  }
});

// Setup Event Listeners
function setupEventListeners() {

  // Multi-User Auth Modals & Logout
  el.btnOpenAuthModal?.addEventListener('click', () => openAuthModal('login'));
  el.btnCloseAuthModal?.addEventListener('click', closeAuthModal);
  el.authModal?.addEventListener('click', e => {
    if (e.target === el.authModal) closeAuthModal();
  });
  el.loginForm?.addEventListener('submit', handleLoginSubmit);
  el.registerForm?.addEventListener('submit', handleRegisterSubmit);
  el.btnLogout?.addEventListener('click', handleLogout);

  // Watchlist Selector & Actions
  el.selectActiveWatchlist?.addEventListener('change', (e) => {
    state.activeWatchlistId = e.target.value;
    renderWatchlistSelector();
    renderWatchlistStocks();
    refreshWatchlistQuotes();
  });

  el.btnCopyWlStocks?.addEventListener('click', handleCopyWatchlistStocks);
  el.btnExportWlCsv?.addEventListener('click', exportWatchlistToCsv);
  el.btnAddNewWatchlist?.addEventListener('click', handleCreateNewWatchlist);
  el.btnRenameWatchlist?.addEventListener('click', openRenameModal);
  el.btnDeleteWatchlist?.addEventListener('click', handleDeleteWatchlist);
  el.renameWatchlistForm?.addEventListener('submit', handleRenameWatchlistSubmit);
  el.renameWatchlistModal?.addEventListener('click', e => {
    if (e.target === el.renameWatchlistModal) closeRenameModal();
  });
  el.btnRefreshWlQuotes?.addEventListener('click', () => refreshWatchlistQuotes(true));

  // Quick Add Stock to Watchlist
  el.btnWlQuickAdd?.addEventListener('click', () => {
    const sym = el.wlQuickAddInput?.value;
    if (sym) addStockToActiveWatchlist(sym);
  });
  el.wlQuickAddInput?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      const sym = el.wlQuickAddInput?.value;
      if (sym) addStockToActiveWatchlist(sym);
    }
  });

  // Chart Header "Add to Watchlist" toggle
  el.btnChartWatchlistToggle?.addEventListener('click', (e) => {
    e.stopPropagation();
    toggleChartWatchlistMenu();
  });

  document.addEventListener('click', (e) => {
    if (!e.target.closest('#chart-watchlist-wrapper')) {
      el.chartWatchlistMenu?.classList.add('hidden');
    }
  });

  // Run All Button
  el.btnRunAll?.addEventListener('click', () => {
    runAllScreeners();
  });

  // Category Filter Tabs
  el.categoryFilterBar?.addEventListener('click', e => {
    const btn = e.target.closest('button[data-category]');
    if (!btn) return;
    document.querySelectorAll('.cat-pill, .cat-btn').forEach(p => p.classList.remove('active'));
    btn.classList.add('active');
    state.activeCategoryFilter = btn.dataset.category;
    renderScreeners();
  });

  // Copy Screened Stock Symbols Button
  el.btnCopyStocks?.addEventListener('click', handleCopyStocks);

  // Floating On-Chart AVWAP Badge Controls
  el.btnFloatingAvwap?.addEventListener('click', toggleAvwapAnchorMode);
  el.btnFloatingAvwapClear?.addEventListener('click', clearStockAvwaps);

  // Global Keyboard Shortcut: Alt + H for Horizontal Support/Resistance Line
  window.addEventListener('keydown', e => {
    if (e.altKey && (e.key === 'h' || e.key === 'H')) {
      e.preventDefault();
      handleAltHShortcut();
    }
  });

  // Dynamic Adaptive Input Width on Manual Stock Input
  el.manualStockInput?.addEventListener('input', adjustStockInputWidth);

  // Global Keyboard Arrow Navigation (↑ / ↓)
  setupKeyboardNavigation();

  // Circuit Limits Modal Backdrop & Drag-and-Drop Handlers
  const circuitModal = document.getElementById('circuit-modal');
  circuitModal?.addEventListener('click', e => {
    if (e.target === circuitModal) closeCircuitModal();
  });

  const circuitDropzone = document.getElementById('circuit-dropzone');
  if (circuitDropzone) {
    ['dragenter', 'dragover'].forEach(eventName => {
      circuitDropzone.addEventListener(eventName, (e) => {
        e.preventDefault();
        e.stopPropagation();
        circuitDropzone.classList.add('border-rose-500', 'bg-rose-500/10');
      }, false);
    });

    ['dragleave', 'drop'].forEach(eventName => {
      circuitDropzone.addEventListener(eventName, (e) => {
        e.preventDefault();
        e.stopPropagation();
        circuitDropzone.classList.remove('border-rose-500', 'bg-rose-500/10');
      }, false);
    });

    circuitDropzone.addEventListener('drop', (e) => {
      const dt = e.dataTransfer;
      const files = dt?.files;
      if (files && files.length > 0) {
        handleCircuitFileSelect({ target: { files } });
      }
    }, false);
  }

  // Stock Search Filter
  el.stockSearchInput?.addEventListener('input', e => {
    state.searchQuery = e.target.value.toLowerCase().trim();
    renderStocksTable();
  });

  // Table Column Sorting (Screeners Table)
  document.querySelectorAll('th[data-sort]').forEach(th => {
    th.addEventListener('click', () => {
      const field = th.dataset.sort;
      if (state.sortField === field) {
        state.sortAscending = !state.sortAscending;
      } else {
        state.sortField = field;
        state.sortAscending = false;
      }
      renderStocksTable();
    });
  });

  // Table Column Sorting (DarvasScan Table)
  document.querySelectorAll('th[data-psort]').forEach(th => {
    th.addEventListener('click', () => {
      const field = th.dataset.psort;
      if (state.pricescanSortField === field) {
        state.pricescanSortAscending = !state.pricescanSortAscending;
      } else {
        state.pricescanSortField = field;
        state.pricescanSortAscending = (field === 'spreadPercent' || field === 'symbol');
      }
      renderPricescanTable();
    });
  });

  // Table Column Sorting (VCP Scan Table)
  document.querySelectorAll('th[data-vsort]').forEach(th => {
    th.addEventListener('click', () => {
      const field = th.dataset.vsort;
      if (state.vcpscanSortField === field) {
        state.vcpscanSortAscending = !state.vcpscanSortAscending;
      } else {
        state.vcpscanSortField = field;
        state.vcpscanSortAscending = (field === 'tightnessPercent' || field === 'dryVolRatio' || field === 'symbol');
      }
      renderVcpscanTable();
    });
  });

  // Table Column Sorting (SS_RVOL Table)
  document.querySelectorAll('th[data-ssort]').forEach(th => {
    th.addEventListener('click', () => {
      const field = th.dataset.ssort;
      if (state.ssrvolSortField === field) {
        state.ssrvolSortAscending = !state.ssrvolSortAscending;
      } else {
        state.ssrvolSortField = field;
        state.ssrvolSortAscending = (field === 'symbol');
      }
      renderSsrvolTable();
    });
  });

  // Table Column Sorting (Watchlists Table)
  document.querySelectorAll('th[data-wlsort]').forEach(th => {
    th.addEventListener('click', () => {
      const field = th.dataset.wlsort;
      if (state.watchlistSortField === field) {
        state.watchlistSortAscending = !state.watchlistSortAscending;
      } else {
        state.watchlistSortField = field;
        state.watchlistSortAscending = (field === 'symbol' || field === 'name');
      }
      renderWatchlistStocks();
    });
  });

  // Timeframe Buttons (Daily, Weekly, Intraday)
  document.querySelectorAll('.timeframe-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const interval = btn.dataset.interval;
      const isIntraday = ['1m', '5m', '15m', '60m'].includes(interval);
      if (isIntraday && !state.user && !state.guestPermissions?.intradayTimeframes) {
        showToast('Intraday timeframes (5m, 15m, 1H) are locked in Guest Mode. Please Login or Register!', 'warning');
        openAuthModal('login');
        return;
      }
      document.querySelectorAll('.timeframe-btn').forEach(b => {
        b.classList.remove('active', 'bg-blue-600', 'text-white', 'shadow');
        b.classList.add('hover:text-white');
      });
      btn.classList.add('active', 'bg-blue-600', 'text-white', 'shadow');
      btn.classList.remove('hover:text-white');
      state.activeInterval = interval;
      const targetSym = state.selectedStock?.symbol || state.currentStockData?.symbol || el.manualStockInput?.value || 'RELIANCE';
      loadStockChart(targetSym);
    });
  });

  // Range Buttons (3month, 6month, 12M) - Smooth Viewport Zoom without losing history
  document.querySelectorAll('.range-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.range-btn').forEach(b => {
        b.classList.remove('active', 'bg-indigo-600', 'text-white', 'shadow');
        b.classList.add('hover:text-white');
      });
      btn.classList.add('active', 'bg-indigo-600', 'text-white', 'shadow');
      btn.classList.remove('hover:text-white');
      state.activeRange = btn.dataset.range; // '3mo', '6mo', '1y'
      applyActiveRangeZoom();
    });
  });

  // Market Cap > 1000 Cr & > 2000 Cr Filter Checkboxes
  if (el.chkMc1000) {
    el.chkMc1000.addEventListener('change', e => {
      state.filterMc1000 = e.target.checked;
      if (state.filterMc1000 && state.filterMc2000) {
        if (el.chkMc2000) el.chkMc2000.checked = false;
        state.filterMc2000 = false;
      }
      renderStocksTable();
    });
  }
  if (el.chkMc2000) {
    el.chkMc2000.addEventListener('change', e => {
      state.filterMc2000 = e.target.checked;
      if (state.filterMc2000 && state.filterMc1000) {
        if (el.chkMc1000) el.chkMc1000.checked = false;
        state.filterMc1000 = false;
      }
      renderStocksTable();
    });
  }

  // Next & Previous Stock Quick-Navigation Buttons (Toolbar Capsule)
  if (el.btnNavPrevStock) {
    el.btnNavPrevStock.addEventListener('click', () => navigateStock(-1));
  }
  if (el.btnNavNextStock) {
    el.btnNavNextStock.addEventListener('click', () => navigateStock(1));
  }

  // Initialize Predictive Autocomplete Search on Manual Stock Input & Watchlist Add Input
  setupPredictiveSearch();
  setupWatchlistPredictiveSearch();

  // Checkbox Indicator Toggles
  const setupToggle = (checkbox, key, onToggle) => {
    if (checkbox) {
      checkbox.addEventListener('change', e => {
        state.toggles[key] = e.target.checked;
        if (onToggle) onToggle(e.target.checked);
        saveIndicatorPreferences();
      });
    }
  };

  setupToggle(el.chkEma10, 'ema10', vis => state.charts.series?.ema10?.applyOptions({ visible: vis }));
  setupToggle(el.chkEma20, 'ema20', vis => state.charts.series?.ema20?.applyOptions({ visible: vis }));
  setupToggle(el.chkEma50, 'ema50', vis => state.charts.series?.ema50?.applyOptions({ visible: vis }));
  setupToggle(el.chkEma150, 'ema150', vis => state.charts.series?.ema150?.applyOptions({ visible: vis }));
  setupToggle(el.chkEma200, 'ema200', vis => state.charts.series?.ema200?.applyOptions({ visible: vis }));
  setupToggle(el.chkVol, 'volume', vis => state.charts.series?.volume?.applyOptions({ visible: vis }));
  setupToggle(el.chkVolAvg, 'volAvg', vis => state.charts.series?.volAvg?.applyOptions({ visible: vis }));
  setupToggle(el.chkVwap, 'vwap', vis => state.charts.series?.vwap?.applyOptions({ visible: vis }));
  setupToggle(el.chkPivots, 'pivots', () => updatePivotLines());
  setupToggle(el.chkDarvas, 'darvas', vis => {
    state.charts.series?.darvasTop?.applyOptions({ visible: vis });
    state.charts.series?.darvasBottom?.applyOptions({ visible: vis });
  });

  // Interactive Color Pickers
  const setupColorPicker = (input, key, onColorChange) => {
    if (!input) return;
    const handleColor = e => {
      const val = e.target.value;
      state.colors[key] = val;
      if (onColorChange) onColorChange(val);
      saveIndicatorPreferences();
    };
    input.addEventListener('input', handleColor);
    input.addEventListener('change', handleColor);
  };

  setupColorPicker(el.colorEma10, 'ema10', c => state.charts.series?.ema10?.applyOptions({ color: c }));
  setupColorPicker(el.colorEma20, 'ema20', c => state.charts.series?.ema20?.applyOptions({ color: c }));
  setupColorPicker(el.colorEma50, 'ema50', c => state.charts.series?.ema50?.applyOptions({ color: c }));
  setupColorPicker(el.colorEma150, 'ema150', c => state.charts.series?.ema150?.applyOptions({ color: c }));
  setupColorPicker(el.colorEma200, 'ema200', c => state.charts.series?.ema200?.applyOptions({ color: c }));
  setupColorPicker(el.colorVolAvg, 'volAvg', c => state.charts.series?.volAvg?.applyOptions({ color: c }));
  setupColorPicker(el.colorVwap, 'vwap', c => state.charts.series?.vwap?.applyOptions({ color: c }));
  setupColorPicker(el.colorDarvasTop, 'darvasTop', c => state.charts.series?.darvasTop?.applyOptions({ color: c }));
  setupColorPicker(el.colorDarvasBottom, 'darvasBottom', c => state.charts.series?.darvasBottom?.applyOptions({ color: c }));
  setupColorPicker(el.colorRsi, 'rsi', c => state.charts.series?.rsi?.applyOptions({ color: c }));
  setupColorPicker(el.colorRsiSma, 'rsiSma', c => state.charts.series?.rsiSma?.applyOptions({ color: c }));
  setupColorPicker(el.colorAvwap, 'avwap', () => renderPersistedDrawings());

  // Toggle RSI Pane visibility
  setupToggle(el.chkRsi, 'rsi', vis => {
    if (el.tvRsiContainer) {
      el.tvRsiContainer.style.display = vis ? 'flex' : 'none';
    }
    if (el.resizerPriceRsi) {
      el.resizerPriceRsi.style.display = vis ? 'flex' : 'none';
    }
    if (el.resizerRsiBottom) {
      el.resizerRsiBottom.style.display = vis ? 'flex' : 'none';
    }
    updateTimeScalesVisibility();
    handleResize();
  });

  // Toggle Volume Intelligence Overlay
  setupToggle(el.chkVolIntel, 'volIntel', vis => {
    setVolumeOverlayMode(vis ? 'volintel' : 'off');
  });

  // Pivot Type Selector
  if (el.selectPivotType) {
    el.selectPivotType.addEventListener('change', e => {
      state.pivotType = e.target.value;
      saveIndicatorPreferences();
      if (state.selectedStock) loadStockChart(state.selectedStock.symbol);
    });
  }

  // DarvasScan Listeners (Segmented 1-Click Toggle + Enter Shortcut + Copy)
  const setPricescanEma = (val) => {
    const vStr = String(val);
    if (el.selectPricescanEma) el.selectPricescanEma.value = vStr;
    const tf = el.selectPricescanTimeframe?.value || '1d';
    const tfCode = tf === '1wk' ? 'W' : 'D';
    const btn10 = document.getElementById('btn-ema-10');
    const btn20 = document.getElementById('btn-ema-20');
    if (vStr === '10') {
      btn10?.classList.add('bg-blue-600', 'text-white', 'shadow-sm');
      btn10?.classList.remove('text-slate-400');
      btn20?.classList.remove('bg-blue-600', 'text-white', 'shadow-sm');
      btn20?.classList.add('text-slate-400');
      if (el.pricescanDynamicEmaCol) {
        el.pricescanDynamicEmaCol.textContent = `EMA 10 (${tfCode}) (₹)`;
      }
    } else {
      btn20?.classList.add('bg-blue-600', 'text-white', 'shadow-sm');
      btn20?.classList.remove('text-slate-400');
      btn10?.classList.remove('bg-blue-600', 'text-white', 'shadow-sm');
      btn10?.classList.add('text-slate-400');
      if (el.pricescanDynamicEmaCol) {
        el.pricescanDynamicEmaCol.textContent = `EMA 20 (${tfCode}) (₹)`;
      }
    }
    if (el.pricescanDynamicDarvasCol) {
      el.pricescanDynamicDarvasCol.textContent = `Darvas (${tfCode})`;
    }
    if (el.pricescanFooterInfo) {
      el.pricescanFooterInfo.textContent = `min(DarvasGreen(${tfCode}), EMA${vStr}(${tfCode})) ≤ Close ≤ max(DarvasGreen(${tfCode}), EMA${vStr}(${tfCode}))`;
    }
    if (state.pricescanResults && state.pricescanResults.length > 0) {
      renderPricescanTable();
    }
  };

  document.getElementById('btn-ema-10')?.addEventListener('click', () => setPricescanEma(10));
  document.getElementById('btn-ema-20')?.addEventListener('click', () => setPricescanEma(20));

  if (el.selectPricescanEma) {
    el.selectPricescanEma.addEventListener('change', () => setPricescanEma(el.selectPricescanEma.value));
  }

  if (el.selectPricescanTimeframe) {
    el.selectPricescanTimeframe.addEventListener('change', () => {
      const tf = el.selectPricescanTimeframe.value;
      const tfCode = tf === '1wk' ? 'W' : 'D';
      const ema = parseInt(el.selectPricescanEma?.value || '10', 10);
      if (el.pricescanDynamicDarvasCol) {
        el.pricescanDynamicDarvasCol.textContent = `Darvas (${tfCode})`;
      }
      if (el.pricescanDynamicEmaCol) {
        el.pricescanDynamicEmaCol.textContent = `EMA ${ema} (${tfCode}) (₹)`;
      }
      if (el.pricescanFooterInfo) {
        el.pricescanFooterInfo.textContent = `min(DarvasGreen(${tfCode}), EMA${ema}(${tfCode})) ≤ Close ≤ max(DarvasGreen(${tfCode}), EMA${ema}(${tfCode}))`;
      }
    });
  }

  if (el.btnRunPricescan) {
    el.btnRunPricescan.addEventListener('click', runPricePositionScan);
  }

  if (el.btnCopyPricescanStocks) {
    el.btnCopyPricescanStocks.addEventListener('click', handleCopyStocks);
  }

  // DarvasScan Market Cap > 1000 Cr & > 2000 Cr Filter Checkboxes
  if (el.chkPricescanMc1000) {
    el.chkPricescanMc1000.addEventListener('change', e => {
      state.pricescanFilterMc1000 = e.target.checked;
      if (state.pricescanFilterMc1000 && state.pricescanFilterMc2000) {
        if (el.chkPricescanMc2000) el.chkPricescanMc2000.checked = false;
        state.pricescanFilterMc2000 = false;
      }
      renderPricescanTable();
    });
  }
  if (el.chkPricescanMc2000) {
    el.chkPricescanMc2000.addEventListener('change', e => {
      state.pricescanFilterMc2000 = e.target.checked;
      if (state.pricescanFilterMc2000 && state.pricescanFilterMc1000) {
        if (el.chkPricescanMc1000) el.chkPricescanMc1000.checked = false;
        state.pricescanFilterMc1000 = false;
      }
      renderPricescanTable();
    });
  }

  // Keyboard Enter Shortcut to run scan when Scanner view is open
  document.addEventListener('keydown', (e) => {
    if (state.activeSidebarTab === 'pricescan' && e.key === 'Enter' && !e.target.matches('input, textarea, select')) {
      e.preventDefault();
      runPricePositionScan();
    } else if (state.activeSidebarTab === 'ssrvol' && e.key === 'Enter' && !e.target.matches('input, textarea, select')) {
      e.preventDefault();
      runSsRvolScan();
    } else if (state.activeSidebarTab === 'vcpscan' && e.key === 'Enter' && !e.target.matches('input, textarea, select')) {
      e.preventDefault();
      runVcpScan();
    }
  });

  // SS_RVOL Scanner Event Listeners
  if (el.btnRunSsrvol) {
    el.btnRunSsrvol.addEventListener('click', runSsRvolScan);
  }
  if (el.btnCopySsrvolStocks) {
    el.btnCopySsrvolStocks.addEventListener('click', handleCopySsrvolStocks);
  }
  if (el.btnSsrvolFormatToggle) {
    el.btnSsrvolFormatToggle.addEventListener('click', () => {
      state.ssrvolFormat = state.ssrvolFormat === 'percent' ? 'ratio' : 'percent';
      if (el.ssrvolFormatLabel) {
        el.ssrvolFormatLabel.textContent = state.ssrvolFormat === 'percent' ? '%' : 'x';
      }
      renderSsrvolTable();
    });
  }
  if (el.chkSsrvolSsOnly) {
    el.chkSsrvolSsOnly.addEventListener('change', e => {
      state.ssrvolFilterSsOnly = e.target.checked;
      renderSsrvolTable();
    });
  }
  if (el.chkSsrvolMc1000) {
    el.chkSsrvolMc1000.addEventListener('change', e => {
      state.ssrvolFilterMc1000 = e.target.checked;
      if (state.ssrvolFilterMc1000 && state.ssrvolFilterMc2000) {
        if (el.chkSsrvolMc2000) el.chkSsrvolMc2000.checked = false;
        state.ssrvolFilterMc2000 = false;
      }
      renderSsrvolTable();
    });
  }
  if (el.chkSsrvolMc2000) {
    el.chkSsrvolMc2000.addEventListener('change', e => {
      state.ssrvolFilterMc2000 = e.target.checked;
      if (state.ssrvolFilterMc2000 && state.ssrvolFilterMc1000) {
        if (el.chkSsrvolMc1000) el.chkSsrvolMc1000.checked = false;
        state.ssrvolFilterMc1000 = false;
      }
      renderSsrvolTable();
    });
  }
  if (el.inputSsrvolLookback) {
    el.inputSsrvolLookback.addEventListener('change', e => {
      let val = parseInt(e.target.value, 10);
      if (isNaN(val) || val < 1) val = 20;
      if (val > 100) val = 100;
      e.target.value = val;
      state.ssrvolLookback = val;
      if (el.ssrvolDynamicAvgvolCol) {
        el.ssrvolDynamicAvgvolCol.textContent = `Avg Vol (${val}D)`;
      }
      if (state.ssrvolResults && state.ssrvolResults.length > 0) {
        runSsRvolScan();
      }
    });
  }

  // VCP Scanner Event Listeners
  if (el.btnRunVcpscan) {
    el.btnRunVcpscan.addEventListener('click', runVcpScan);
  }
  if (el.btnCopyVcpscanStocks) {
    el.btnCopyVcpscanStocks.addEventListener('click', handleCopyVcpscanStocks);
  }
  if (el.chkVcpscanMc1000) {
    el.chkVcpscanMc1000.addEventListener('change', e => {
      state.vcpscanFilterMc1000 = e.target.checked;
      if (state.vcpscanFilterMc1000 && state.vcpscanFilterMc2000) {
        if (el.chkVcpscanMc2000) el.chkVcpscanMc2000.checked = false;
        state.vcpscanFilterMc2000 = false;
      }
      renderVcpscanTable();
    });
  }
  if (el.chkVcpscanMc2000) {
    el.chkVcpscanMc2000.addEventListener('change', e => {
      state.vcpscanFilterMc2000 = e.target.checked;
      if (state.vcpscanFilterMc2000 && state.vcpscanFilterMc1000) {
        if (el.chkVcpscanMc1000) el.chkVcpscanMc1000.checked = false;
        state.vcpscanFilterMc1000 = false;
      }
      renderVcpscanTable();
    });
  }
  if (el.selectVcpscanStage) {
    el.selectVcpscanStage.addEventListener('change', () => {
      if (state.vcpscanResults && state.vcpscanResults.length > 0) {
        runVcpScan();
      }
    });
  }
  if (el.selectVcpscanTimeframe) {
    el.selectVcpscanTimeframe.addEventListener('change', () => {
      if (state.vcpscanResults && state.vcpscanResults.length > 0) {
        runVcpScan();
      }
    });
  }

  // Export CSV
  el.btnExportCsv?.addEventListener('click', exportToCsv);

  // Modal Triggers
  el.btnOpenAddModalDeck?.addEventListener('click', openAddModal);
  el.btnCloseModal?.addEventListener('click', closeModal);
  el.btnCancelModal?.addEventListener('click', closeModal);
  el.screenerModal?.addEventListener('click', e => {
    if (e.target === el.screenerModal) closeModal();
  });

  // Modal Form Submit
  el.screenerForm?.addEventListener('submit', handleSaveScreener);

  // Test Screener Button in Modal
  el.btnTestScreener?.addEventListener('click', testScreenerLink);

  // Window Resize Listener for Charts
  window.addEventListener('resize', handleResize);

  // Initialize Workspace Layout & Draggable Pane Resizers
  const savedLayoutMode = localStorage.getItem('sangam_workspace_layout_mode') || 'horizontal';
  switchWorkspaceLayout(savedLayoutMode);
  setupPaneResizers();
}

// -------------------------------------------------------------
// Native Lightweight Charts Engine (Price + Bottom Volume Overlay & RSI Pane)
// -------------------------------------------------------------

function updateDefaultVolumeBadges() {
  const mode = state.volOverlayMode || 'volintel';
  const volArr = state.currentStockData?.volumeSeries;
  const volAvgArr = state.currentStockData?.volAvg9;
  const viData = state.currentStockData?.volIntel;

  const badgeDivider = document.getElementById('badge-vi-divider');
  const ppWrap = document.getElementById('badge-vi-pp-wrap');
  const bsWrap = document.getElementById('badge-vi-bs-wrap');
  const udWrap = document.getElementById('badge-vi-ud-wrap');
  const rvolWrap = document.getElementById('badge-vi-rvol-wrap');
  const maLabel = document.getElementById('badge-vol-ma-label');

  if (mode === 'volintel' && viData?.meta) {
    if (maLabel) maLabel.textContent = `${state.volIntelSettings?.volMaPeriod || 50}-SMA:`;
    if (el.volLiveBadge && volArr && volArr.length > 0) {
      el.volLiveBadge.textContent = fmt.volume(volArr[volArr.length - 1]?.value || 0);
    }
    if (el.volAvgLiveBadge && viData.volMaSeries && viData.volMaSeries.length > 0) {
      el.volAvgLiveBadge.textContent = fmt.volume(viData.volMaSeries[viData.volMaSeries.length - 1]?.value || 0);
    }
    if (el.viPpBadge) el.viPpBadge.textContent = viData.meta.ppCount || 0;
    if (el.viBsBadge) el.viBsBadge.textContent = viData.meta.bsCount || 0;
    if (el.viUdBadge) el.viUdBadge.textContent = `${viData.meta.latestUD || '--'} (${viData.meta.udStatus || ''})`;
    if (el.viRvolBadge) el.viRvolBadge.textContent = `${viData.meta.latestRVol || 1.0}x`;

    if (badgeDivider) badgeDivider.classList.remove('hidden');
    if (ppWrap) ppWrap.classList.remove('hidden');
    if (bsWrap) bsWrap.classList.remove('hidden');
    if (udWrap) udWrap.classList.remove('hidden');
    if (rvolWrap) rvolWrap.classList.remove('hidden');
    if (el.viSignalsBadge) {
      if (viData.meta.signals && viData.meta.signals.length > 0) {
        el.viSignalsBadge.textContent = viData.meta.signals.join(' · ');
        el.viSignalsBadge.classList.remove('hidden');
      } else {
        el.viSignalsBadge.classList.add('hidden');
      }
    }
  } else {
    if (maLabel) maLabel.textContent = 'Avg:';
    if (volArr && volArr.length > 0 && el.volLiveBadge) {
      el.volLiveBadge.textContent = fmt.volume(volArr[volArr.length - 1]?.value || 0);
    }
    if (volAvgArr && volAvgArr.length > 0 && el.volAvgLiveBadge) {
      el.volAvgLiveBadge.textContent = fmt.volume(volAvgArr[volAvgArr.length - 1]?.value || 0);
    }
    if (badgeDivider) badgeDivider.classList.add('hidden');
    if (ppWrap) ppWrap.classList.add('hidden');
    if (bsWrap) bsWrap.classList.add('hidden');
    if (udWrap) udWrap.classList.add('hidden');
    if (rvolWrap) rvolWrap.classList.add('hidden');
    if (el.viSignalsBadge) el.viSignalsBadge.classList.add('hidden');
  }

  const candles = state.currentStockData?.candles;
  if (candles && candles.length > 0 && el.candleChgBadge) {
    const lastIdx = candles.length - 1;
    const lastCandle = candles[lastIdx];
    let chgPercent = 0;
    if (lastIdx > 0 && candles[lastIdx - 1]?.close) {
      const prevClose = candles[lastIdx - 1].close;
      chgPercent = Number((((lastCandle.close - prevClose) / prevClose) * 100).toFixed(2));
    } else if (lastCandle.open) {
      chgPercent = Number((((lastCandle.close - lastCandle.open) / lastCandle.open) * 100).toFixed(2));
    }
    const isUp = chgPercent >= 0;
    el.candleChgBadge.textContent = (isUp ? '+' : '') + chgPercent.toFixed(2) + '%';
    el.candleChgBadge.className = isUp ? 'font-bold text-emerald-400' : 'font-bold text-rose-400';
  }
  const rsiArr = state.currentStockData?.rsi14;
  const rsiSmaArr = state.currentStockData?.rsiSma14;
  if (rsiArr && rsiArr.length > 0 && el.rsiLiveBadge) {
    const lastRsi = rsiArr[rsiArr.length - 1];
    el.rsiLiveBadge.textContent = lastRsi?.value ?? '--';
  }
  if (rsiSmaArr && rsiSmaArr.length > 0 && el.rsiSmaLiveBadge) {
    const lastRsiSma = rsiSmaArr[rsiSmaArr.length - 1];
    el.rsiSmaLiveBadge.textContent = lastRsiSma?.value ?? '--';
  }
}

function updateAllChartMarkers() {
  const data = state.currentStockData;
  if (!data?.candles || !Array.isArray(data.candles) || data.candles.length === 0) return;

  const mode = state.volOverlayMode || 'volintel';
  const viData = (mode === 'volintel' && data.volIntel) ? data.volIntel : null;

  // 1. Candlestick Series Markers: Bull Snort markers below respective price candles
  if (state.charts?.series?.candles && typeof state.charts.series.candles.setMarkers === 'function') {
    if (viData && Array.isArray(viData.bsCandleMarkers) && viData.bsCandleMarkers.length > 0 && state.volIntelSettings?.bsMarkerShape !== 'off') {
      const candleMarkers = [...viData.bsCandleMarkers];
      candleMarkers.sort((a, b) => {
        const timeA = typeof a.time === 'string' ? a.time : (a.time?.year ? `${a.time.year}-${String(a.time.month).padStart(2, '0')}-${String(a.time.day).padStart(2, '0')}` : a.time);
        const timeB = typeof b.time === 'string' ? b.time : (b.time?.year ? `${b.time.year}-${String(b.time.month).padStart(2, '0')}-${String(b.time.day).padStart(2, '0')}` : b.time);
        return timeA > timeB ? 1 : (timeA < timeB ? -1 : 0);
      });
      state.charts.series.candles.setMarkers(candleMarkers);
    } else {
      state.charts.series.candles.setMarkers([]);
    }
  }

  // 2. Volume Series Markers: Lowest Volume Events (Q & Y) and Earnings Events ('e')
  if (state.charts?.series?.volume && typeof state.charts.series.volume.setMarkers === 'function') {
    const volMarkers = [];

    // Add Q / Y markers if Volume Intelligence is active (stackOrder: 1 -> sits closest to the volume bar)
    if (viData && Array.isArray(viData.qyVolumeMarkers)) {
      viData.qyVolumeMarkers.forEach(m => {
        const timeKey = typeof m.time === 'string' ? m.time : (m.time?.year ? `${m.time.year}-${String(m.time.month).padStart(2, '0')}-${String(m.time.day).padStart(2, '0')}` : JSON.stringify(m.time));
        volMarkers.push({
          time: m.time,
          position: 'aboveBar',
          color: m.color || '#cbd5e1',
          shape: m.shape || 'circle',
          text: m.text,
          size: m.size ?? 0,
          timeKey,
          stackOrder: 1 // Q or Y is lower, directly above the volume bar
        });
      });
    }

    // Add Earnings 'e' markers (stackOrder: 2 -> placed directly above Q or Y if on same day)
    const earningsDates = data.earningsDates || [];
    if (Array.isArray(earningsDates) && earningsDates.length > 0) {
      const candleTimes = data.candles.map(c => {
        if (typeof c.time === 'string') return c.time;
        if (c.time?.year) return `${c.time.year}-${String(c.time.month).padStart(2, '0')}-${String(c.time.day).padStart(2, '0')}`;
        return String(c.time);
      });

      earningsDates.forEach(eDate => {
        if (typeof eDate !== 'string' || eDate < '2026-01-01') return;
        let matchedCandleTime = null;
        let matchedIdx = candleTimes.indexOf(eDate);
        if (matchedIdx !== -1) {
          matchedCandleTime = data.candles[matchedIdx].time;
        } else {
          const nextIdx = candleTimes.findIndex(t => t >= eDate);
          if (nextIdx !== -1) {
            matchedCandleTime = data.candles[nextIdx].time;
            matchedIdx = nextIdx;
          }
        }

        if (matchedCandleTime && matchedIdx !== -1) {
          const timeKey = candleTimes[matchedIdx];
          volMarkers.push({
            time: matchedCandleTime,
            position: 'aboveBar',
            color: '#f59e0b',
            size: 0,
            text: 'e',
            timeKey,
            stackOrder: 2 // 'e' is higher, placed above Q or Y
          });
        }
      });
    }

    // Sort ascending by timeKey, then by stackOrder (1 for Q/Y, 2 for 'e')
    volMarkers.sort((a, b) => {
      if (a.timeKey !== b.timeKey) {
        return a.timeKey > b.timeKey ? 1 : -1;
      }
      return (a.stackOrder || 1) - (b.stackOrder || 1);
    });

    volMarkers.forEach(m => {
      delete m.timeKey;
      delete m.stackOrder;
    });

    state.charts.series.volume.setMarkers(volMarkers);
  }
}

function updateEarningsVolumeMarkers() {
  updateAllChartMarkers();
}

function initNativeCharts() {
  if (typeof LightweightCharts === 'undefined') {
    console.error('LightweightCharts library not loaded');
    return;
  }

  const themeCfg = getThemeConfig(state.chartTheme || 'dark');
  const bgColor = themeCfg.bg;
  const textColor = themeCfg.text;
  const gridColor = themeCfg.grid;
  const borderColor = themeCfg.border;

  const formatIstTime = (businessDayOrTimestamp) => {
    if (typeof businessDayOrTimestamp === 'number') {
      const d = new Date(businessDayOrTimestamp * 1000);
      const dateStr = d.toLocaleDateString('en-IN', {
        timeZone: 'Asia/Kolkata',
        day: '2-digit',
        month: 'short',
        year: 'numeric'
      });
      const timeStr = d.toLocaleTimeString('en-IN', {
        timeZone: 'Asia/Kolkata',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
      });
      return `${dateStr} ${timeStr}`;
    }
    return String(businessDayOrTimestamp);
  };

  const istTickMarkFormatter = (time, tickMarkType, locale) => {
    if (typeof time === 'number') {
      const d = new Date(time * 1000);
      if (tickMarkType === 3 || tickMarkType === 4) {
        return d.toLocaleTimeString('en-IN', {
          timeZone: 'Asia/Kolkata',
          hour: '2-digit',
          minute: '2-digit',
          hour12: false
        });
      }
      if (tickMarkType === 2) {
        return d.toLocaleDateString('en-IN', {
          timeZone: 'Asia/Kolkata',
          day: '2-digit',
          month: 'short'
        });
      }
      if (tickMarkType === 1) {
        return d.toLocaleDateString('en-IN', {
          timeZone: 'Asia/Kolkata',
          month: 'short',
          year: '2-digit'
        });
      }
      if (tickMarkType === 0) {
        return d.toLocaleDateString('en-IN', {
          timeZone: 'Asia/Kolkata',
          year: 'numeric'
        });
      }
      return d.toLocaleTimeString('en-IN', {
        timeZone: 'Asia/Kolkata',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
      });
    }
    return null;
  };

  const baseChartOptions = {
    localization: {
      locale: 'en-IN',
      dateFormat: 'yyyy-MM-dd',
      timeFormatter: formatIstTime
    },
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

  // ==========================================
  // PANE 1: Main Price Chart (Candlesticks + Clean EMAs + VWAP + Pivots + Integrated Bottom Volume)
  // ==========================================
  el.tvMainChart.innerHTML = '';
  const mainRect = el.tvMainChart.getBoundingClientRect();
  const mainChart = LightweightCharts.createChart(el.tvMainChart, {
    ...baseChartOptions,
    width: mainRect.width || 600,
    height: mainRect.height || 420,
    rightPriceScale: {
      borderColor: borderColor,
      autoScale: true,
      minimumWidth: 75,
      scaleMargins: { top: 0.08, bottom: 0.25 } // Leaves bottom 25% for integrated volume
    },
    timeScale: {
      borderColor: borderColor,
      visible: true,
      timeVisible: false,
      secondsVisible: false,
      tickMarkFormatter: istTickMarkFormatter,
      fixLeftEdge: false,
      fixRightEdge: false,
      rightOffset: 6,
      barSpacing: 8,
      minBarSpacing: 1
    }
  });

  // Candlestick Series (Customizable TradingView-style Day Close Price Line)
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

  // Volume Histogram Series (Integrated at bottom of main chart via overlay scale)
  const volumeSeries = mainChart.addHistogramSeries({
    color: '#26a69a',
    priceFormat: { type: 'volume' },
    priceScaleId: '', // overlay scale
    visible: Boolean(state.toggles.volume)
  });
  volumeSeries.priceScale().applyOptions({
    scaleMargins: { top: 0.75, bottom: 0 } // Bottom 25%
  });

  // 9-Period Volume SMA Overlay Line
  const volAvgSeries = mainChart.addLineSeries({
    color: state.colors.volAvg || '#fbbf24',
    lineWidth: Number(state.lineWidths?.volAvg || 1.5),
    priceFormat: { type: 'volume' },
    priceScaleId: '', // overlay scale
    title: '',
    priceLineVisible: false,
    lastValueVisible: false,
    crosshairMarkerVisible: false,
    visible: Boolean(state.toggles.volAvg)
  });

  // EMA Lines (WITHOUT ANY TEXT LABELS or crosshair circle markers)
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

  // VWAP Line (WITHOUT ANY TEXT LABELS or circle markers)
  const vwapSeries = mainChart.addLineSeries({
    color: state.colors.vwap || '#eab308',
    lineWidth: Number(state.lineWidths?.vwap || 1.8),
    title: '',
    priceLineVisible: false,
    lastValueVisible: false,
    crosshairMarkerVisible: false
  });

  // Darvas Box - Top Box Line
  const darvasTopSeries = mainChart.addLineSeries({
    color: state.colors.darvasTop || '#10b981',
    lineWidth: Number(state.lineWidths?.darvasTop || 2.5),
    title: '',
    priceLineVisible: false,
    lastValueVisible: false,
    crosshairMarkerVisible: false
  });

  // Darvas Box - Bottom Box Line
  const darvasBottomSeries = mainChart.addLineSeries({
    color: state.colors.darvasBottom || '#ef4444',
    lineWidth: Number(state.lineWidths?.darvasBottom || 2.5),
    title: '',
    priceLineVisible: false,
    lastValueVisible: false,
    crosshairMarkerVisible: false
  });

  // ==========================================
  // PANE 2: Dedicated RSI (14) + RSI SMA (14) Sub-Pane
  // ==========================================
  el.tvRsiChart.innerHTML = '';
  const rsiRect = el.tvRsiChart.getBoundingClientRect();
  const rsiChart = LightweightCharts.createChart(el.tvRsiChart, {
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
      tickMarkFormatter: istTickMarkFormatter,
      fixLeftEdge: false,
      fixRightEdge: false,
      rightOffset: 6,
      barSpacing: 8,
      minBarSpacing: 1
    }
  });

  // RSI Line
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

  // RSI 14-Period SMA Line
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

  // Built-in Reference Lines at 70, 50, and 30 for RSI
  rsiSeries.createPriceLine({
    price: 70,
    color: 'rgba(239, 68, 68, 0.75)',
    lineWidth: 1,
    lineStyle: 2,
    axisLabelVisible: false,
    title: '70'
  });

  rsiSeries.createPriceLine({
    price: 50,
    color: 'rgba(148, 163, 184, 0.4)',
    lineWidth: 1,
    lineStyle: 2,
    axisLabelVisible: false,
    title: '50'
  });

  rsiSeries.createPriceLine({
    price: 30,
    color: 'rgba(16, 185, 129, 0.75)',
    lineWidth: 1,
    lineStyle: 2,
    axisLabelVisible: false,
    title: '30'
  });

  // ==========================================
  // Synchronize TimeScales between Main and RSI charts
  // ==========================================
  const allCharts = [mainChart, rsiChart].filter(Boolean);
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

  // ==========================================
  // Synchronize Crosshairs & Floating Volume Badge Updates
  // ==========================================
  function handleCrosshairUpdate(param) {
    if (!param.time) {
      updateDefaultVolumeBadges();
      if (typeof updateOption1LegendLine === 'function') updateOption1LegendLine();
      return;
    }

    // Track price at current mouse crosshair point for Alt+H
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

    if (vol && el.volLiveBadge) {
      el.volLiveBadge.textContent = fmt.volume(vol.value);
    }
    if (volAvg && el.volAvgLiveBadge) {
      el.volAvgLiveBadge.textContent = fmt.volume(volAvg.value);
    }
    if (el.candleChgBadge && state.currentStockData?.candles) {
      const candles = state.currentStockData.candles;
      const candleIdx = candles.findIndex(c => c.time === param.time);
      if (candleIdx !== -1) {
        const c = candles[candleIdx];
        let chgPercent = 0;
        if (candleIdx > 0 && candles[candleIdx - 1]?.close) {
          const prevClose = candles[candleIdx - 1].close;
          chgPercent = Number((((c.close - prevClose) / prevClose) * 100).toFixed(2));
        } else if (c.open) {
          chgPercent = Number((((c.close - c.open) / c.open) * 100).toFixed(2));
        }
        const isUp = chgPercent >= 0;
        el.candleChgBadge.textContent = (isUp ? '+' : '') + chgPercent.toFixed(2) + '%';
        el.candleChgBadge.className = isUp ? 'font-bold text-emerald-400' : 'font-bold text-rose-400';
      }
    }
    if (rsiVal !== undefined && el.rsiLiveBadge) {
      el.rsiLiveBadge.textContent = rsiVal;
    }
    if (rsiSmaVal !== undefined && el.rsiSmaLiveBadge) {
      el.rsiSmaLiveBadge.textContent = rsiSmaVal;
    }

    // Update Vol Intel badges on hover
    const viData = state.currentStockData?.volIntel;
    if (viData?.barSignals) {
      const barSig = viData.barSignals.find(s => s.time === param.time);
      if (barSig) {
        if (el.viRvolBadge) el.viRvolBadge.textContent = `${barSig.rvol}x`;
        if (el.viVolBadge) el.viVolBadge.textContent = fmt.volume(barSig.vol);
        if (el.viSmaBadge) el.viSmaBadge.textContent = fmt.volume(barSig.ma);
        if (el.viSignalsBadge) {
          if (barSig.signals && barSig.signals.length > 0) {
            el.viSignalsBadge.textContent = barSig.signals.join(' · ');
            el.viSignalsBadge.classList.remove('hidden');
          } else {
            el.viSignalsBadge.classList.add('hidden');
          }
        }
      }
    }

    if (typeof updateOption1LegendLine === 'function') updateOption1LegendLine(param.time);
  }

  // Synchronize Crosshairs across Main and RSI Charts
  let isCrosshairSyncing = false;

  mainChart.subscribeCrosshairMove(param => {
    handleCrosshairUpdate(param);
    if (isCrosshairSyncing) return;
    isCrosshairSyncing = true;
    try {
      if (!param.time || !param.point) {
        if (rsiChart && typeof rsiChart.clearCrosshairPosition === 'function') rsiChart.clearCrosshairPosition();
      } else {
        if (rsiChart && rsiSeries && typeof rsiChart.setCrosshairPosition === 'function') {
          const rsiItem = state.currentStockData?.rsi14?.find(r => r.time === param.time);
          const rsiVal = (rsiItem && typeof rsiItem.value === 'number') ? rsiItem.value : 50;
          rsiChart.setCrosshairPosition(rsiVal, param.time, rsiSeries);
        }
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
          if (mainChart && typeof mainChart.clearCrosshairPosition === 'function') mainChart.clearCrosshairPosition();
        } else {
          if (mainChart && candlestickSeries && typeof mainChart.setCrosshairPosition === 'function') {
            const candle = state.currentStockData?.candles?.find(c => c.time === param.time);
            const price = candle ? (candle.close ?? candle.value) : (state.lastCrosshairPrice || 0);
            if (price) mainChart.setCrosshairPosition(price, param.time, candlestickSeries);
          }
        }
      } catch (e) {}
      isCrosshairSyncing = false;
    });
  }

  // Clear crosshairs when mouse leaves the chart container
  const chartMainContainer = document.getElementById('tv_chart_container') || el.tvMainChart?.parentElement;
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

  // Store references
  state.charts.main = mainChart;
  state.charts.rsi = rsiChart;
  state.charts.volIntel = null;
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
  syncChartIndicatorsWithPermissions();
  handleResize();
  initMeasureTool();
}

function updateTimeScalesVisibility() {
  const isRsiVisible = el.tvRsiContainer && el.tvRsiContainer.style.display !== 'none';
  const isIntraday = state.currentStockData?.isIntraday || false;

  if (state.charts?.rsi) {
    state.charts.rsi.applyOptions({
      timeScale: { visible: isRsiVisible, timeVisible: isIntraday, secondsVisible: false, fixLeftEdge: false, fixRightEdge: false }
    });
  }

  if (state.charts?.main) {
    state.charts.main.applyOptions({
      timeScale: { visible: true, timeVisible: isIntraday, secondsVisible: false, fixLeftEdge: false, fixRightEdge: false }
    });
  }
}

function syncChartPriceScales() {
  if (!state.charts.main) return;
  try {
    const mainScale = state.charts.main.priceScale('right');
    const rsiScale = state.charts.rsi?.priceScale('right');
    const mainW = (mainScale && typeof mainScale.width === 'function') ? mainScale.width() : 0;
    const rsiW = (rsiScale && typeof rsiScale.width === 'function') ? rsiScale.width() : 0;
    const targetW = Math.max(mainW, rsiW, 75);
    if (mainScale) mainScale.applyOptions({ minimumWidth: targetW });
    if (rsiScale) rsiScale.applyOptions({ minimumWidth: targetW });
  } catch (e) {}
}

function handleResize() {
  if (!state.charts.main) return;
  
  const chartMainContainer = document.getElementById('chart-main-container') || el.tvPricePane?.parentElement;
  const pricePane = el.tvPricePane || document.getElementById('tv_price_pane');
  const rsiContainer = el.tvRsiContainer || document.getElementById('tv_rsi_container');
  const rsiChartEl = el.tvRsiChart || document.getElementById('tv_rsi_chart');
  
  const containerWidth = chartMainContainer ? chartMainContainer.clientWidth : (pricePane ? pricePane.clientWidth : 600);
  const commonWidth = Math.round(containerWidth || 600);

  if (pricePane && el.tvMainChart) {
    const pRect = pricePane.getBoundingClientRect();
    const h = Math.round(Math.max(80, pRect.height));
    state.charts.main.applyOptions({
      width: commonWidth,
      height: h
    });
  }

  if (state.charts.rsi && rsiContainer && rsiChartEl && rsiContainer.style.display !== 'none') {
    const rRect = rsiChartEl.getBoundingClientRect();
    const h = Math.round(Math.max(30, rRect.height));
    state.charts.rsi.applyOptions({
      width: commonWidth,
      height: h
    });
  }

  syncChartPriceScales();
}

// Set viewport zoom to activeRange (3M, 6M, 12M) without discarding historical candles
function applyActiveRangeZoom() {
  const totalCandles = state.currentStockData?.candles?.length || 0;
  if (totalCandles === 0 || !state.charts.main) return;

  let barCount = 250;
  const isWeekly = state.activeInterval === '1wk';
  const is5m = state.activeInterval === '5m';
  const is15m = state.activeInterval === '15m';
  const is60m = state.activeInterval === '60m' || state.activeInterval === '1h';

  if (is5m) {
    barCount = state.activeRange === '3mo' ? 75 : (state.activeRange === '6mo' ? 225 : 375);
  } else if (is15m) {
    barCount = state.activeRange === '3mo' ? 50 : (state.activeRange === '6mo' ? 125 : 250);
  } else if (is60m) {
    barCount = state.activeRange === '3mo' ? 40 : (state.activeRange === '6mo' ? 100 : 200);
  } else if (state.activeRange === '3mo') {
    barCount = isWeekly ? 13 : 65;
  } else if (state.activeRange === '6mo') {
    barCount = isWeekly ? 26 : 130;
  } else { // 1y / 12M
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

// Workspace Layout Management (Horizontal Side-by-Side ↔ Vertical Stacked)
function switchWorkspaceLayout(mode) {
  state.workspaceLayout = mode || 'horizontal';
  localStorage.setItem('sangam_workspace_layout_mode', state.workspaceLayout);

  const container = el.workspaceContainer || document.getElementById('workspace-container');
  const sidebar = el.sidebarPane || document.getElementById('sidebar-pane');
  const chart = el.chartPane || document.getElementById('chart-pane');
  const splitter = el.workspaceSplitter || document.getElementById('workspace-splitter');
  const splitterHandle = el.splitterHandle || document.getElementById('splitter-handle');
  const btnH = el.btnLayoutHorizontal || document.getElementById('btn-layout-horizontal');
  const btnV = el.btnLayoutVertical || document.getElementById('btn-layout-vertical');

  if (!container || !sidebar || !chart) return;

  if (state.workspaceLayout === 'vertical') {
    if (btnH) {
      btnH.className = 'px-2.5 py-1 rounded-full text-[11px] font-semibold flex items-center gap-1.5 text-slate-400 hover:text-white transition-all cursor-pointer';
    }
    if (btnV) {
      btnV.className = 'px-2.5 py-1 rounded-full text-[11px] font-semibold flex items-center gap-1.5 bg-blue-600 text-white shadow-sm transition-all cursor-pointer';
    }

    container.className = 'flex flex-col gap-0 flex-1 w-full items-stretch transition-all duration-150';
    sidebar.className = 'w-full flex-shrink-0 flex flex-col bg-dark-card border border-dark-border rounded-2xl shadow-xl overflow-hidden';
    sidebar.style.width = '100%';

    const savedH = localStorage.getItem('sangam_sidebar_height');
    sidebar.style.height = savedH ? `${savedH}px` : '440px';

    if (splitter) {
      splitter.className = 'flex h-3.5 hover:h-3.5 bg-dark-bg/40 hover:bg-blue-500/20 active:bg-blue-600/30 cursor-row-resize items-center justify-center select-none transition-colors z-20 group flex-shrink-0 py-0.5';
    }
    if (splitterHandle) {
      splitterHandle.className = 'w-14 h-1 bg-slate-600 group-hover:bg-blue-400 group-active:bg-blue-300 rounded-full transition-colors';
    }

    chart.className = 'w-full flex-1 min-h-[520px] flex flex-col bg-dark-card border border-dark-border rounded-2xl shadow-xl overflow-hidden';
  } else {
    // Horizontal Mode (Side-by-Side)
    if (btnH) {
      btnH.className = 'px-2.5 py-1 rounded-full text-[11px] font-semibold flex items-center gap-1.5 bg-blue-600 text-white shadow-sm transition-all cursor-pointer';
    }
    if (btnV) {
      btnV.className = 'px-2.5 py-1 rounded-full text-[11px] font-semibold flex items-center gap-1.5 text-slate-400 hover:text-white transition-all cursor-pointer';
    }

    container.className = 'flex flex-col lg:flex-row gap-0 flex-1 min-h-[680px] w-full items-stretch transition-all duration-150';
    sidebar.className = 'w-full lg:w-[42%] flex-shrink-0 flex flex-col bg-dark-card border border-dark-border rounded-2xl shadow-xl overflow-hidden min-h-[500px]';
    sidebar.style.height = '';

    const savedW = localStorage.getItem('sangam_sidebar_width');
    if (savedW && window.innerWidth >= 1024) {
      sidebar.style.width = `${savedW}px`;
    } else {
      sidebar.style.width = '';
    }

    if (splitter) {
      splitter.className = 'hidden lg:flex w-3.5 hover:w-3.5 bg-dark-bg/40 hover:bg-blue-500/20 active:bg-blue-600/30 cursor-col-resize items-center justify-center select-none transition-colors z-20 group flex-shrink-0 px-0.5';
    }
    if (splitterHandle) {
      splitterHandle.className = 'w-1 h-10 bg-slate-600 group-hover:bg-blue-400 group-active:bg-blue-300 rounded-full transition-colors';
    }

    chart.className = 'flex-1 min-w-0 flex flex-col bg-dark-card border border-dark-border rounded-2xl shadow-xl overflow-hidden min-h-[480px]';
  }

  handleResize();
  setTimeout(handleResize, 80);
  if (window.lucide) window.lucide.createIcons();
}

function toggleDashboardChartMaximize() {
  const chart = el.chartPane || document.getElementById('chart-pane');
  const btn = document.getElementById('btn-dashboard-chart-maximize');
  if (!chart) return;

  const isMax = chart.classList.contains('fixed');
  if (!isMax) {
    chart.classList.add('fixed', 'inset-2', 'z-50', 'shadow-2xl');
    if (btn) {
      btn.innerHTML = '<i data-lucide="minimize-2" class="w-4 h-4 text-blue-400"></i>';
      btn.title = 'Restore Window Size';
    }
  } else {
    chart.classList.remove('fixed', 'inset-2', 'z-50', 'shadow-2xl');
    if (btn) {
      btn.innerHTML = '<i data-lucide="maximize" class="w-4 h-4"></i>';
      btn.title = 'Toggle Fullscreen Maximize Chart';
    }
  }
  if (window.lucide) window.lucide.createIcons();
  handleResize();
  setTimeout(handleResize, 60);
  setTimeout(handleResize, 150);
}

window.switchWorkspaceLayout = switchWorkspaceLayout;
window.toggleDashboardChartMaximize = toggleDashboardChartMaximize;

// Draggable Pane Resizers:
// 1. Workspace Splitter between Sidebar & Chart (Horizontal width / Vertical height)
// 2. Divider between Price+Volume and RSI pane (#resizer-price-rsi)
// 3. Dedicated bottom handle for RSI pane (#resizer-rsi-bottom)
// 4. Bottom handle for total chart card height (#resizer-chart-bottom)
function setupPaneResizers() {
  const workspaceSplitter = el.workspaceSplitter || document.getElementById('workspace-splitter');
  const workspaceContainer = el.workspaceContainer || document.getElementById('workspace-container');
  const sidebarPane = el.sidebarPane || document.getElementById('sidebar-pane');
  const chartPane = el.chartPane || document.getElementById('chart-pane');

  const resizerPriceRsi = el.resizerPriceRsi || document.getElementById('resizer-price-rsi');
  const resizerRsiBottom = el.resizerRsiBottom || document.getElementById('resizer-rsi-bottom');
  const resizerChartBottom = el.resizerChartBottom || document.getElementById('resizer-chart-bottom');
  const chartMainContainer = el.chartMainContainer || document.getElementById('chart-main-container');
  const pricePane = el.tvPricePane || document.getElementById('tv_price_pane');
  const rsiContainer = el.tvRsiContainer || document.getElementById('tv_rsi_container');

  // 1. Workspace Splitter (Sidebar ↔ Chart)
  if (workspaceSplitter && workspaceContainer && sidebarPane && chartPane) {
    let isDraggingSplitter = false;
    let startX = 0;
    let startY = 0;
    let startSidebarW = 0;
    let startSidebarH = 0;
    let totalContainerW = 0;

    const onSplitterStart = (e) => {
      e.preventDefault();
      isDraggingSplitter = true;
      const clientX = e.touches ? e.touches[0].clientX : e.clientX;
      const clientY = e.touches ? e.touches[0].clientY : e.clientY;
      startX = clientX;
      startY = clientY;

      startSidebarW = sidebarPane.getBoundingClientRect().width;
      startSidebarH = sidebarPane.getBoundingClientRect().height;
      totalContainerW = workspaceContainer.getBoundingClientRect().width;

      const isVert = (state.workspaceLayout === 'vertical');
      document.body.style.cursor = isVert ? 'row-resize' : 'col-resize';
      document.body.style.userSelect = 'none';
      if (el.tvMainChart) el.tvMainChart.style.pointerEvents = 'none';
      if (el.tvRsiChart) el.tvRsiChart.style.pointerEvents = 'none';

      window.addEventListener('mousemove', onSplitterMove, { passive: false });
      window.addEventListener('mouseup', onSplitterEnd);
      window.addEventListener('touchmove', onSplitterMove, { passive: false });
      window.addEventListener('touchend', onSplitterEnd);
    };

    const onSplitterMove = (e) => {
      if (!isDraggingSplitter) return;
      if (e.cancelable) e.preventDefault();

      const clientX = e.touches ? e.touches[0].clientX : e.clientX;
      const clientY = e.touches ? e.touches[0].clientY : e.clientY;

      if (state.workspaceLayout === 'vertical') {
        const deltaY = clientY - startY;
        const newH = Math.round(Math.max(200, Math.min(850, startSidebarH + deltaY)));
        sidebarPane.style.height = `${newH}px`;
        localStorage.setItem('sangam_sidebar_height', newH);
      } else {
        const deltaX = clientX - startX;
        const minW = 280;
        const maxW = Math.max(minW, totalContainerW - 350);
        const newW = Math.round(Math.max(minW, Math.min(maxW, startSidebarW + deltaX)));
        sidebarPane.style.width = `${newW}px`;
        localStorage.setItem('sangam_sidebar_width', newW);
      }

      handleResize();
    };

    const onSplitterEnd = () => {
      if (!isDraggingSplitter) return;
      isDraggingSplitter = false;

      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      if (el.tvMainChart) el.tvMainChart.style.pointerEvents = '';
      if (el.tvRsiChart) el.tvRsiChart.style.pointerEvents = '';

      window.removeEventListener('mousemove', onSplitterMove);
      window.removeEventListener('mouseup', onSplitterEnd);
      window.removeEventListener('touchmove', onSplitterMove);
      window.removeEventListener('touchend', onSplitterEnd);
      handleResize();
    };

    workspaceSplitter.addEventListener('mousedown', onSplitterStart);
    workspaceSplitter.addEventListener('touchstart', onSplitterStart, { passive: false });
    workspaceSplitter.addEventListener('dblclick', () => {
      if (state.workspaceLayout === 'vertical') {
        const defaultH = 440;
        sidebarPane.style.height = `${defaultH}px`;
        localStorage.setItem('sangam_sidebar_height', defaultH);
      } else {
        sidebarPane.style.width = '';
        localStorage.removeItem('sangam_sidebar_width');
      }
      handleResize();
    });
  }

  if (!chartMainContainer || !pricePane) return;

  // Restore saved heights from localStorage if present
  const savedRsiH = localStorage.getItem('sangam_rsi_height');
  if (savedRsiH && rsiContainer) {
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

  // 2. Resizer: Price & RSI divider (adjusts proportion between Price and RSI)
  if (resizerPriceRsi && rsiContainer) {
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
      if (el.tvMainChart) el.tvMainChart.style.pointerEvents = 'none';
      if (el.tvRsiChart) el.tvRsiChart.style.pointerEvents = 'none';

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

      // Dragging UP: RSI taller, Price shorter; Dragging DOWN: RSI shorter, Price taller
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
      if (el.tvMainChart) el.tvMainChart.style.pointerEvents = '';
      if (el.tvRsiChart) el.tvRsiChart.style.pointerEvents = '';

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

  // 3. Resizer: Dedicated RSI Bottom Drag Handle (Direct bottom control of RSI)
  if (resizerRsiBottom && rsiContainer) {
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
      if (el.tvMainChart) el.tvMainChart.style.pointerEvents = 'none';
      if (el.tvRsiChart) el.tvRsiChart.style.pointerEvents = 'none';

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
      if (el.tvMainChart) el.tvMainChart.style.pointerEvents = '';
      if (el.tvRsiChart) el.tvRsiChart.style.pointerEvents = '';

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

  // 6. Resizer: Overall Chart Card Bottom Handle
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
      if (el.tvMainChart) el.tvMainChart.style.pointerEvents = 'none';
      if (el.tvRsiChart) el.tvRsiChart.style.pointerEvents = 'none';

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
      if (el.tvMainChart) el.tvMainChart.style.pointerEvents = '';
      if (el.tvRsiChart) el.tvRsiChart.style.pointerEvents = '';

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

// Predictive Autocomplete Search for Stock Input Field
function setupPredictiveSearch() {
  const input = el.manualStockInput;
  const dropdown = el.stockAutocompleteDropdown;
  const btnSearch = el.btnManualStockSearch;
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
            ${typeof getStockInfoButtonHtml === 'function' ? getStockInfoButtonHtml(item.symbol, item.name) : ''}
            ${item.exchange && item.exchange !== 'NSE' ? `<span class="text-[9px] px-1 py-0.2 rounded bg-blue-500/15 text-blue-400 font-mono font-semibold">${item.exchange}</span>` : ''}
            ${getFnoBadgeHtml(item.symbol)}
            ${getCircuitBadgeHtml(item.symbol)}
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

    // 1. Instant local matching from loaded screener stocks in memory
    const localMatches = (state.currentStocks || [])
      .filter(s => (s.symbol || '').toUpperCase().includes(q) || (s.name || '').toUpperCase().includes(q))
      .slice(0, 6)
      .map(s => ({ symbol: s.symbol, name: s.name, exchange: 'NSE' }));

    if (localMatches.length > 0) {
      renderDropdown(localMatches);
    }

    // 2. Fetch comprehensive results from backend autocomplete API
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

  // Predictive input event with debounce
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

  // Focus event: show suggestions if input already has text
  input.addEventListener('focus', () => {
    if (input.value.trim().length >= 1) {
      fetchSuggestions(input.value);
    }
  });

  // Keyboard navigation
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

  // Dismiss dropdown on outside click
  document.addEventListener('click', (e) => {
    if (!document.getElementById('manual-search-wrapper')?.contains(e.target)) {
      closeDropdown();
    }
  });
}

// Predictive Autocomplete Search for Watchlist Quick-Add Input Field
function setupWatchlistPredictiveSearch() {
  const input = el.wlQuickAddInput;
  const dropdown = el.wlAutocompleteDropdown || document.getElementById('wl-autocomplete-dropdown');
  const btnAdd = el.btnWlQuickAdd;
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

    const activeWl = getActiveWatchlist();
    const existingSymbols = new Set((activeWl?.stocks || []).map(s => (s.symbol || '').toUpperCase()));

    dropdown.innerHTML = items.map((item, idx) => {
      const isAlreadyAdded = existingSymbols.has((item.symbol || '').toUpperCase());
      return `
        <div class="wl-suggestion-item px-3 py-2 cursor-pointer hover:bg-amber-500/15 transition-colors flex items-center justify-between gap-2 text-left select-none group" data-index="${idx}">
          <div class="min-w-0 flex-1">
            <div class="flex items-center gap-1.5 flex-wrap">
              <span class="font-bold font-mono text-slate-100 text-xs tracking-tight">${item.symbol}</span>
              ${typeof getStockInfoButtonHtml === 'function' ? getStockInfoButtonHtml(item.symbol, item.name) : ''}
              ${item.exchange && item.exchange !== 'NSE' ? `<span class="text-[9px] px-1 py-0.2 rounded bg-amber-500/15 text-amber-400 font-mono font-semibold">${item.exchange}</span>` : ''}
              ${typeof getFnoBadgeHtml === 'function' ? getFnoBadgeHtml(item.symbol) : ''}
              ${typeof getCircuitBadgeHtml === 'function' ? getCircuitBadgeHtml(item.symbol) : ''}
            </div>
            <div class="text-[10px] text-slate-400 truncate mt-0.5">${item.name || item.symbol}</div>
          </div>
          <div class="shrink-0 flex items-center">
            ${isAlreadyAdded
              ? `<span class="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 font-semibold flex items-center gap-1"><i data-lucide="check" class="w-3 h-3"></i> In List</span>`
              : `<span class="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-400 group-hover:bg-amber-500 group-hover:text-black font-semibold flex items-center gap-0.5 transition-colors"><i data-lucide="plus" class="w-3 h-3"></i> Add</span>`
            }
          </div>
        </div>
      `;
    }).join('');

    if (window.lucide) lucide.createIcons();
    dropdown.classList.remove('hidden');

    dropdown.querySelectorAll('.wl-suggestion-item').forEach(itemEl => {
      itemEl.addEventListener('mousedown', async (e) => {
        if (e.target.closest('.btn-stock-info')) return;
        e.preventDefault();
        const idx = parseInt(itemEl.dataset.index, 10);
        const chosen = currentSuggestions[idx];
        if (chosen) {
          input.value = '';
          closeDropdown();
          await addStockToActiveWatchlist(chosen.symbol, chosen.name);
        }
      });
    });
  };

  const highlightActive = () => {
    const itemEls = dropdown.querySelectorAll('.wl-suggestion-item');
    itemEls.forEach((itemEl, idx) => {
      if (idx === activeIndex) {
        itemEl.classList.add('bg-amber-500/25', 'border-l-2', 'border-amber-500');
        itemEl.scrollIntoView({ block: 'nearest' });
      } else {
        itemEl.classList.remove('bg-amber-500/25', 'border-l-2', 'border-amber-500');
      }
    });
  };

  const fetchSuggestions = async (query) => {
    const q = (query || '').trim().toUpperCase();
    if (!q) {
      closeDropdown();
      return;
    }

    // If query has commas or whitespace-separated list (pasting multiple stocks), don't show autocomplete
    if (q.includes(',') || q.includes('\n') || q.includes(';')) {
      closeDropdown();
      return;
    }

    // 1. Instant local matching from loaded stocks in memory
    const localMatches = [];
    const seen = new Set();

    if (Array.isArray(state.currentStocks)) {
      for (const s of state.currentStocks) {
        const sym = (s.symbol || '').toUpperCase();
        const nm = (s.name || '').toUpperCase();
        if ((sym.includes(q) || nm.includes(q)) && !seen.has(sym)) {
          localMatches.push({ symbol: s.symbol, name: s.name, exchange: 'NSE' });
          seen.add(sym);
          if (localMatches.length >= 6) break;
        }
      }
    }

    if (localMatches.length > 0) {
      renderDropdown(localMatches);
    }

    // 2. Fetch comprehensive backend autocomplete API results
    try {
      const res = await fetch(`/api/stocks/search?q=${encodeURIComponent(q)}`);
      const data = await res.json();
      if (data.success && Array.isArray(data.results) && data.results.length > 0) {
        const combined = [...data.results];
        localMatches.forEach(lm => {
          if (!combined.some(c => (c.symbol || '').toUpperCase() === lm.symbol.toUpperCase())) {
            combined.push(lm);
          }
        });
        renderDropdown(combined.slice(0, 8));
      } else if (localMatches.length === 0) {
        closeDropdown();
      }
    } catch (err) {
      console.warn('Watchlist autocomplete fetch error:', err);
    }
  };

  // Predictive input event with debounce
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

  // Focus event: show suggestions if input already has text
  input.addEventListener('focus', () => {
    if (input.value.trim().length >= 1) {
      fetchSuggestions(input.value);
    }
  });

  // Keyboard navigation
  input.addEventListener('keydown', async (e) => {
    if (dropdown.classList.contains('hidden') || currentSuggestions.length === 0) {
      if (e.key === 'Enter') {
        const raw = input.value.trim();
        if (raw) {
          closeDropdown();
          addStockToActiveWatchlist(raw);
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
        input.value = '';
        closeDropdown();
        await addStockToActiveWatchlist(chosen.symbol, chosen.name);
      } else {
        const raw = input.value.trim();
        if (raw) {
          closeDropdown();
          addStockToActiveWatchlist(raw);
        }
      }
    } else if (e.key === 'Escape') {
      closeDropdown();
    }
  });

  // Dismiss dropdown on outside click
  document.addEventListener('click', (e) => {
    if (!input.contains(e.target) && !dropdown.contains(e.target)) {
      closeDropdown();
    }
  });
}

function updateNativeChartTheme() {
  applyChartTheme(state.chartTheme || (state.theme === 'light' ? 'light' : 'dark'));
}

// Draw ONLY Pivot line (P), Resistance line 1 (R1), and Support line 1 (S1)
function updatePivotLines() {
  const { candles } = state.charts?.series || {};
  if (!candles) return;

  // Clear existing pivot lines
  if (state.charts.pivotLines && state.charts.pivotLines.length > 0) {
    state.charts.pivotLines.forEach(line => {
      try { candles.removePriceLine(line); } catch (e) {}
    });
    state.charts.pivotLines = [];
  }

  const isGuest = !state.user;
  const p = state.guestPermissions || {};
  const allowIndicators = !isGuest || Boolean(p.indicatorsToolbar);

  if (!allowIndicators || !state.toggles.pivots || !state.currentStockData?.pivotPoints) return;

  const { p: pivotPrice, r1, s1 } = state.currentStockData.pivotPoints;
  const pWidth = Number(state.lineWidths?.pivots || 1.2);

  // EXACTLY 3 lines only: P, R1, S1
  state.charts.pivotLines = [
    candles.createPriceLine({ price: pivotPrice, color: '#06b6d4', lineWidth: pWidth, lineStyle: 2, axisLabelVisible: true, title: `P ${pivotPrice}` }),
    candles.createPriceLine({ price: r1, color: '#f97316', lineWidth: pWidth, lineStyle: 2, axisLabelVisible: true, title: `R1 ${r1}` }),
    candles.createPriceLine({ price: s1, color: '#10b981', lineWidth: pWidth, lineStyle: 2, axisLabelVisible: true, title: `S1 ${s1}` })
  ];
}

// -------------------------------------------------------------
// Interactive Chart Drawing Tools (Anchored VWAP, H-Line, V-Line)
// -------------------------------------------------------------

// -------------------------------------------------------------
// Interactive Chart Drawing Tools (On-Chart AVWAP & Alt+H Horizontal Line)
// -------------------------------------------------------------

function calculateAnchoredVwap(candles, anchorTime) {
  if (!Array.isArray(candles) || candles.length === 0 || !anchorTime) return [];

  // Find index of the anchor candle
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
    } catch (e) {
      console.warn('Failed to save chart drawings to server:', e);
    }
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

  // 0. GLOBAL RAY PLACEMENT MODE: Lock selected candle date across ALL charts (anchoring from HIGH)
  if (state.activeDrawingTool === 'global_ray') {
    if (!param || !param.time) return;
    const anchorTime = param.time;
    const dateStr = normalizeCandleDateString(anchorTime);
    if (!dateStr) return;

    const allCandles = state.currentStockData?.candles || [];
    let matchCandle = allCandles.find(c => normalizeCandleDateString(c.time) === dateStr);

    const anchorHigh = (matchCandle && matchCandle.high !== undefined && matchCandle.high !== null) 
      ? matchCandle.high 
      : (param.seriesData?.get(state.charts.series?.candles)?.high || (matchCandle?.close || null));

    state.globalDateRay = {
      active: true,
      anchorDate: dateStr,
      anchorTime: anchorTime,
      price: anchorHigh,
      color: state.globalDateRay?.color || '#06b6d4',
      lineWidth: state.globalDateRay?.lineWidth || 2
    };

    state.activeDrawingTool = null;
    saveGlobalDateRay();
    renderPersistedDrawings();
    updateGlobalRayWidgetUI();

    const priceText = (anchorHigh !== null && anchorHigh !== undefined) ? ` at High ₹${anchorHigh}` : '';
    showToast(`🌐 Universal Global Ray anchored to ${dateStr}${priceText} across ALL stocks!`, 'success');
    return;
  }

  // 1. PLACING NEW ANCHORED VWAP: Add to list without deleting previous ones
  if (state.activeDrawingTool === 'avwap') {
    if (!param.time) return;
    const anchorTime = param.time;
    
    // Add new AVWAP anchor alongside previous ones
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

  // 2. NORMAL MODE: Check if user clicked directly on any drawn AVWAP or H-Line to delete it
  if (!state.activeDrawingTool && param.point && state.charts.series?.candles) {
    const { candles } = state.charts.series;

    // Check AVWAPs click-to-delete
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
            // Clicked directly on this AVWAP line! Delete it.
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

    // Check H-Lines click-to-delete
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

  if (state.activeDrawingTool === 'avwap') {
    if (el.btnFloatingAvwap) {
      el.btnFloatingAvwap.classList.add('text-purple-400', 'animate-pulse');
    }
  } else {
    if (el.btnFloatingAvwap) {
      el.btnFloatingAvwap.classList.remove('text-purple-400', 'animate-pulse');
    }
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

    if (el.floatingAvwapDivider) el.floatingAvwapDivider.classList.remove('hidden');
    if (el.floatingAvwapStatus) {
      el.floatingAvwapStatus.classList.remove('hidden');
      el.floatingAvwapStatus.textContent = anchorText;
      el.floatingAvwapStatus.title = avwapCount > 1 ? `${avwapCount} Anchored VWAPs plotted` : `Anchored from ${anchorText}`;
    }
    if (el.btnFloatingAvwapClear) {
      el.btnFloatingAvwapClear.classList.remove('hidden');
      el.btnFloatingAvwapClear.title = avwapCount > 1 ? `Clear all ${avwapCount} Anchored VWAPs` : 'Remove Anchored VWAP';
    }
  } else {
    if (el.floatingAvwapDivider) el.floatingAvwapDivider.classList.add('hidden');
    if (el.floatingAvwapStatus) el.floatingAvwapStatus.classList.add('hidden');
    if (el.btnFloatingAvwapClear) el.btnFloatingAvwapClear.classList.add('hidden');
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

function normalizeCandleDateString(time) {
  if (!time) return '';
  if (typeof time === 'string') return time.split('T')[0];
  if (typeof time === 'number') {
    const ms = time > 1e11 ? time : time * 1000;
    const d = new Date(ms);
    return d.toISOString().split('T')[0];
  }
  if (typeof time === 'object' && time.year) {
    return `${time.year}-${String(time.month).padStart(2, '0')}-${String(time.day).padStart(2, '0')}`;
  }
  return String(time);
}

// Official NSE / BSE Trading Holidays Guard for Charts
const NSE_CALENDAR_HOLIDAYS = new Set([
  '2026-01-15', '2026-01-26', '2026-03-03', '2026-03-26', '2026-03-31',
  '2026-04-03', '2026-04-14', '2026-05-01', '2026-05-28', '2026-06-26',
  '2026-09-14', '2026-10-02', '2026-10-20', '2026-11-10', '2026-11-24', '2026-12-25',
  '2025-01-26', '2025-02-26', '2025-03-14', '2025-03-31', '2025-04-10', '2025-04-14',
  '2025-04-18', '2025-05-01', '2025-06-07', '2025-08-15', '2025-08-27', '2025-10-02',
  '2025-10-21', '2025-10-22', '2025-11-05', '2025-12-25'
]);

function isNSEHolidayDate(timeVal) {
  if (!timeVal) return false;
  let dStr = '';
  if (typeof timeVal === 'string') dStr = timeVal.slice(0, 10);
  else if (typeof timeVal === 'number') {
    const ms = timeVal > 1e11 ? timeVal : timeVal * 1000;
    dStr = new Date(ms).toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
  } else if (typeof timeVal === 'object' && timeVal.year) {
    dStr = `${timeVal.year}-${String(timeVal.month).padStart(2, '0')}-${String(timeVal.day).padStart(2, '0')}`;
  }
  return Boolean(dStr && NSE_CALENDAR_HOLIDAYS.has(dStr));
}

function generateFutureRayPoints(lastCandle, gPrice, allCandles, count = 120) {
  if (!lastCandle || lastCandle.time === undefined || lastCandle.time === null) return [];
  const futurePoints = [];

  if (typeof lastCandle.time === 'object' && lastCandle.time.year) {
    let curr = new Date(lastCandle.time.year, lastCandle.time.month - 1, lastCandle.time.day);
    let added = 0;
    while (added < count) {
      curr.setDate(curr.getDate() + 1);
      const dayOfWeek = curr.getDay();
      if (dayOfWeek === 0 || dayOfWeek === 6) continue; // skip Sat, Sun
      futurePoints.push({
        time: {
          year: curr.getFullYear(),
          month: curr.getMonth() + 1,
          day: curr.getDate()
        },
        value: gPrice
      });
      added++;
    }
  } else if (typeof lastCandle.time === 'string') {
    const parts = lastCandle.time.split('T')[0].split('-');
    let curr = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
    let added = 0;
    while (added < count) {
      curr.setDate(curr.getDate() + 1);
      const dayOfWeek = curr.getDay();
      if (dayOfWeek === 0 || dayOfWeek === 6) continue; // skip Sat, Sun
      const y = curr.getFullYear();
      const m = String(curr.getMonth() + 1).padStart(2, '0');
      const d = String(curr.getDate()).padStart(2, '0');
      futurePoints.push({
        time: `${y}-${m}-${d}`,
        value: gPrice
      });
      added++;
    }
  } else if (typeof lastCandle.time === 'number') {
    let step = 86400; // default 1 day in seconds
    if (allCandles && allCandles.length >= 2) {
      const t1 = allCandles[allCandles.length - 2]?.time;
      const t2 = allCandles[allCandles.length - 1]?.time;
      if (typeof t1 === 'number' && typeof t2 === 'number' && t2 > t1) {
        step = Math.max(60, t2 - t1);
      }
    }
    let currTime = lastCandle.time;
    for (let k = 0; k < count; k++) {
      currTime += step;
      futurePoints.push({
        time: currTime,
        value: gPrice
      });
    }
  }

  return futurePoints;
}

function renderPersistedDrawings() {
  const currentSymbol = state.selectedStock?.symbol;
  const { candles } = state.charts.series;
  if (!candles || !state.currentStockData?.candles || !state.charts.main) return;

  // 1. Remove previously active AVWAP series
  if (state.activeDrawingSeries.avwaps && state.activeDrawingSeries.avwaps.length > 0) {
    state.activeDrawingSeries.avwaps.forEach(series => {
      try { state.charts.main.removeSeries(series); } catch (e) {}
    });
    state.activeDrawingSeries.avwaps = [];
  }

  // 2. Remove previously active price lines (H-lines)
  if (state.activeDrawingSeries.hlines && state.activeDrawingSeries.hlines.length > 0) {
    state.activeDrawingSeries.hlines.forEach(line => {
      try { candles.removePriceLine(line); } catch (e) {}
    });
    state.activeDrawingSeries.hlines = [];
  }

  // 3. Remove previously active Global Ray line
  if (state.activeDrawingSeries.globalRay) {
    try { state.charts.main.removeSeries(state.activeDrawingSeries.globalRay); } catch (e) {}
    try { candles.removePriceLine(state.activeDrawingSeries.globalRay); } catch (e) {}
    state.activeDrawingSeries.globalRay = null;
  }

  const stockDrawings = state.drawings[currentSymbol] || { avwaps: [], hlines: [] };
  const avwapColors = ['#a855f7', '#ec4899', '#06b6d4', '#10b981', '#f59e0b'];

  // 4. Render AVWAPs for current stock
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

  // 5. Render H-lines for current stock
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

  // 6. Render Universal Global Ray if active (Plain horizontal ray towards the right of clicked day)
  if (state.globalDateRay && state.globalDateRay.active && state.globalDateRay.anchorDate) {
    const targetDate = state.globalDateRay.anchorDate;
    const allCandles = state.currentStockData?.candles || [];

    if (allCandles.length > 0) {
      // Find candle index on target date or nearest trading date
      let matchIdx = -1;
      for (let i = 0; i < allCandles.length; i++) {
        const cDateStr = normalizeCandleDateString(allCandles[i]?.time);
        if (cDateStr === targetDate) {
          matchIdx = i;
          break;
        }
      }

      // Fallback 1: If exact date not found (e.g. weekend, holiday, or missing bar), find the first candle ON or AFTER target date
      if (matchIdx === -1) {
        for (let i = 0; i < allCandles.length; i++) {
          const cDateStr = normalizeCandleDateString(allCandles[i]?.time);
          if (cDateStr && cDateStr >= targetDate) {
            matchIdx = i;
            break;
          }
        }
      }

      // Fallback 2: If targetDate is earlier than history, start from index 0
      if (matchIdx === -1) {
        const firstDate = normalizeCandleDateString(allCandles[0]?.time);
        if (firstDate && targetDate <= firstDate) {
          matchIdx = 0;
        }
      }

      if (matchIdx !== -1 && matchIdx < allCandles.length) {
        const matchCandle = allCandles[matchIdx];
        const candleHigh = (matchCandle && matchCandle.high !== undefined && matchCandle.high !== null && !isNaN(matchCandle.high))
          ? matchCandle.high
          : (matchCandle?.close || 0);
        const gPrice = Number(Number(candleHigh).toFixed(2));
        const rayColor = state.globalDateRay.color || '#06b6d4';
        const rayWidth = Number(state.globalDateRay.lineWidth || 2);

        // Deduplicate and strictly validate ascending time points for Lightweight Charts
        const rayPoints = [];
        const seenTimes = new Set();
        for (let i = matchIdx; i < allCandles.length; i++) {
          const c = allCandles[i];
          if (!c || c.time === undefined || c.time === null) continue;

          let timeKey = '';
          if (typeof c.time === 'object' && c.time.year) {
            timeKey = `${c.time.year}-${String(c.time.month).padStart(2, '0')}-${String(c.time.day).padStart(2, '0')}`;
          } else {
            timeKey = String(c.time);
          }

          if (seenTimes.has(timeKey)) continue;
          seenTimes.add(timeKey);

          rayPoints.push({
            time: c.time,
            value: gPrice
          });
        }

        // Extend into future bars across the right margin all the way to the end of the chart canvas
        const lastCandle = allCandles[allCandles.length - 1];
        const futureExtension = generateFutureRayPoints(lastCandle, gPrice, allCandles, 150);
        for (const fp of futureExtension) {
          rayPoints.push(fp);
        }

        if (rayPoints.length > 0) {
          try {
            const raySeries = state.charts.main.addLineSeries({
              color: rayColor,
              lineWidth: rayWidth,
              lineStyle: 0,
              lineType: 0,
              crosshairMarkerVisible: false,
              lastValueVisible: false,
              priceLineVisible: false,
              axisLabelVisible: false,
              title: ''
            });
            raySeries.setData(rayPoints);
            state.activeDrawingSeries.globalRay = raySeries;
          } catch (err) {
            console.warn('[GlobalRay] Failed to set ray series data:', err);
          }
        }
      }
    }
  }

  updateAvwapWidgetUI();
  updateGlobalRayWidgetUI();
}

function cancelActiveDrawingTool() {
  state.activeDrawingTool = null;
  updateAvwapWidgetUI();
}

// -------------------------------------------------------------
// Universal Global Date Ray Tool (Checkbox Toggle Mode)
// -------------------------------------------------------------

function handleToggleGlobalDateRay(isChecked) {
  if (!state.globalDateRay) {
    state.globalDateRay = { active: false, anchorDate: null, anchorTime: null, price: null, color: '#06b6d4', lineWidth: 2 };
  }

  if (isChecked) {
    state.globalDateRay.active = true;
    if (state.globalDateRay.anchorDate) {
      renderPersistedDrawings();
      updateGlobalRayWidgetUI();
      showToast(`🌐 Global Ray active (anchored to ${state.globalDateRay.anchorDate})`, 'success');
    } else {
      state.activeDrawingTool = 'global_ray';
      updateGlobalRayWidgetUI();
      showToast('🎯 Global Ray active: Click any candle/date on the chart to anchor across all stocks!', 'info');
    }
  } else {
    state.globalDateRay.active = false;
    if (state.activeDrawingTool === 'global_ray') {
      state.activeDrawingTool = null;
    }
    renderPersistedDrawings();
    updateGlobalRayWidgetUI();
    showToast('Global Ray hidden', 'info');
  }
  saveGlobalDateRay();
}

function promptPickGlobalRayDate() {
  if (!state.globalDateRay) {
    state.globalDateRay = { active: true, anchorDate: null, anchorTime: null, price: null, color: '#06b6d4', lineWidth: 2 };
  }
  state.globalDateRay.active = true;
  state.activeDrawingTool = 'global_ray';
  const chk = document.getElementById('chk-global-date-ray');
  if (chk) chk.checked = true;
  updateGlobalRayWidgetUI();
  showToast('🎯 Click any candle/date on the chart to set or update the Global Ray anchor!', 'info');
}

function handleGlobalRayColorChange(color) {
  if (!state.globalDateRay) {
    state.globalDateRay = { active: false, anchorDate: null, anchorTime: null, price: null, color: '#06b6d4', lineWidth: 2 };
  }
  state.globalDateRay.color = color;
  saveGlobalDateRay();
  renderPersistedDrawings();
  updateGlobalRayWidgetUI();
}

function clearGlobalDateRay(e) {
  if (e) e.stopPropagation();
  const preservedColor = state.globalDateRay?.color || '#06b6d4';
  state.globalDateRay = { active: false, anchorDate: null, anchorTime: null, price: null, color: preservedColor, lineWidth: 2 };
  if (state.activeDrawingTool === 'global_ray') state.activeDrawingTool = null;
  const chk = document.getElementById('chk-global-date-ray');
  if (chk) chk.checked = false;
  saveGlobalDateRay();
  renderPersistedDrawings();
  updateGlobalRayWidgetUI();
  showToast('🌐 Universal Global Ray cleared', 'info');
}

function saveGlobalDateRay() {
  try {
    localStorage.setItem('sangam_global_date_ray', JSON.stringify(state.globalDateRay));
  } catch (e) {}
}

function updateGlobalRayWidgetUI() {
  const chk = document.getElementById('chk-global-date-ray');
  const colorPicker = document.getElementById('global-ray-color-picker');
  const badge = document.getElementById('floating-global-ray-badge');
  const label = document.getElementById('global-ray-date-label');
  const isActive = Boolean(state.globalDateRay?.active && state.globalDateRay?.anchorDate);

  if (chk) chk.checked = Boolean(state.globalDateRay?.active);
  if (colorPicker && state.globalDateRay?.color) {
    colorPicker.value = state.globalDateRay.color;
  }
  if (isActive) {
    if (badge) badge.classList.remove('hidden');
    if (label) label.textContent = `${state.globalDateRay.anchorDate}`;
  } else {
    if (badge) badge.classList.add('hidden');
  }

  if (typeof lucide !== 'undefined') {
    try { lucide.createIcons(); } catch (e) {}
  }
}

// -------------------------------------------------------------
// Interactive Measure / Ruler Tool Engine (2-Click Measurement)
// -------------------------------------------------------------

function toggleMeasureTool() {
  state.measureTool.active = !state.measureTool.active;
  state.measureTool.step = 0;
  const btn = document.getElementById('btn-measure-tool');
  const pricePane = document.getElementById('tv_price_pane');

  if (state.measureTool.active) {
    if (btn) {
      btn.className = 'p-1 px-1.5 rounded-lg bg-emerald-600 text-white border border-emerald-400 text-xs font-semibold flex items-center gap-1 transition-all cursor-pointer shadow-md ring-2 ring-emerald-400/40';
    }
    if (pricePane) pricePane.classList.add('measuring-cursor');
    showToast('📏 Measure Tool: Click 1st point, move to 2nd point and click to measure (Esc to cancel)', 'info');
  } else {
    if (btn) {
      btn.className = 'p-1 px-1.5 rounded-lg bg-emerald-600/15 hover:bg-emerald-600 text-emerald-300 hover:text-white border border-emerald-500/30 hover:border-emerald-500 text-xs font-semibold flex items-center gap-1 transition-all cursor-pointer shadow-sm';
    }
    if (pricePane) pricePane.classList.remove('measuring-cursor');
    clearChartMeasurement();
  }
}

function clearChartMeasurement() {
  const overlay = document.getElementById('chart-measure-overlay');
  const box = document.getElementById('chart-measure-box');
  const svg = document.getElementById('chart-measure-svg');
  if (overlay) overlay.classList.add('hidden');
  if (box) {
    box.style.width = '0px';
    box.style.height = '0px';
    box.className = 'absolute border border-dashed rounded pointer-events-none transition-all duration-75';
  }
  if (svg) svg.innerHTML = '';
  state.measureTool.step = 0;
  state.measureTool.startPoint = null;
  state.measureTool.startPrice = null;
  state.measureTool.startTime = null;
  state.measureTool.startIndex = -1;
  state.measureTool.endPoint = null;
  state.measureTool.endPrice = null;
  state.measureTool.endTime = null;
  state.measureTool.endIndex = -1;
}

function initMeasureTool() {
  const pricePane = document.getElementById('tv_price_pane');
  if (!pricePane || pricePane._hasMeasureBound) return;
  pricePane._hasMeasureBound = true;

  pricePane.addEventListener('click', (e) => {
    // If Shift key clicked in normal mode, auto-activate measure tool
    if (e.shiftKey && !state.measureTool.active) {
      toggleMeasureTool();
    }

    if (!state.measureTool.active) return;

    // Ignore clicks on close buttons inside measurement pill
    if (e.target.closest('#chart-measure-pill button')) return;

    const rect = pricePane.getBoundingClientRect();
    const x = Math.max(0, Math.min(rect.width, e.clientX - rect.left));
    const y = Math.max(0, Math.min(rect.height, e.clientY - rect.top));

    const candlesSeries = state.charts.series?.candles;
    if (!candlesSeries || !state.charts.main) return;

    const price = candlesSeries.coordinateToPrice(y);
    if (typeof price !== 'number' || isNaN(price)) return;

    const candles = state.currentStockData?.candles || [];
    const logical = state.charts.main.timeScale().coordinateToLogical(x);
    const time = state.charts.main.timeScale().coordinateToTime(x);

    let candleIdx = -1;
    if (typeof logical === 'number') {
      candleIdx = Math.max(0, Math.min(candles.length - 1, Math.round(logical)));
    } else if (time) {
      candleIdx = candles.findIndex(c => String(c.time) === String(time));
    }

    if (state.measureTool.step === 0 || state.measureTool.step === 2) {
      // FIRST CLICK: Set Point 1 & start live tracking
      state.measureTool.step = 1;
      state.measureTool.startPoint = { x, y };
      state.measureTool.startPrice = price;
      state.measureTool.startTime = time;
      state.measureTool.startIndex = candleIdx !== -1 ? candleIdx : 0;

      const overlay = document.getElementById('chart-measure-overlay');
      if (overlay) overlay.classList.remove('hidden');

      renderMeasureOverlay(x, y, x, y, price, price, state.measureTool.startIndex, state.measureTool.startIndex);
      showToast('🎯 Point 1 set. Move mouse and click Point 2 to lock measurement.', 'info');

    } else if (state.measureTool.step === 1) {
      // SECOND CLICK: Set Point 2 & lock measurement in place
      state.measureTool.step = 2;
      state.measureTool.endPoint = { x, y };
      state.measureTool.endPrice = price;
      state.measureTool.endTime = time;
      state.measureTool.endIndex = candleIdx !== -1 ? candleIdx : state.measureTool.startIndex;

      renderMeasureOverlay(
        state.measureTool.startPoint.x,
        state.measureTool.startPoint.y,
        x,
        y,
        state.measureTool.startPrice,
        price,
        state.measureTool.startIndex,
        state.measureTool.endIndex
      );

      const deltaPrice = price - state.measureTool.startPrice;
      const pct = state.measureTool.startPrice > 0 ? ((deltaPrice / state.measureTool.startPrice) * 100) : 0;
      const sign = deltaPrice >= 0 ? '+' : '';
      showToast(`📏 Measurement locked: ${sign}${pct.toFixed(2)}% (${sign}₹${deltaPrice.toFixed(2)})`, 'success');
    }

    e.stopPropagation();
  }, true);

  pricePane.addEventListener('mousemove', (e) => {
    // Only update preview when waiting for 2nd click (step === 1)
    if (!state.measureTool.active || state.measureTool.step !== 1 || !state.measureTool.startPoint) return;

    const rect = pricePane.getBoundingClientRect();
    const x = Math.max(0, Math.min(rect.width, e.clientX - rect.left));
    const y = Math.max(0, Math.min(rect.height, e.clientY - rect.top));

    const candlesSeries = state.charts.series?.candles;
    if (!candlesSeries || !state.charts.main) return;

    const currentPrice = candlesSeries.coordinateToPrice(y);
    if (typeof currentPrice !== 'number' || isNaN(currentPrice)) return;

    const candles = state.currentStockData?.candles || [];
    const logical = state.charts.main.timeScale().coordinateToLogical(x);
    const time = state.charts.main.timeScale().coordinateToTime(x);

    let candleIdx = -1;
    if (typeof logical === 'number') {
      candleIdx = Math.max(0, Math.min(candles.length - 1, Math.round(logical)));
    } else if (time) {
      candleIdx = candles.findIndex(c => String(c.time) === String(time));
    }

    renderMeasureOverlay(
      state.measureTool.startPoint.x,
      state.measureTool.startPoint.y,
      x,
      y,
      state.measureTool.startPrice,
      currentPrice,
      state.measureTool.startIndex,
      candleIdx !== -1 ? candleIdx : state.measureTool.startIndex
    );
  }, { passive: true });

  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      if (state.measureTool.active || state.measureTool.step > 0) {
        clearChartMeasurement();
        if (state.measureTool.active) toggleMeasureTool();
      }
    }
  });
}

function renderMeasureOverlay(x1, y1, x2, y2, price1, price2, idx1, idx2) {
  const overlay = document.getElementById('chart-measure-overlay');
  const box = document.getElementById('chart-measure-box');
  const pill = document.getElementById('chart-measure-pill');
  const pctEl = document.getElementById('chart-measure-pct');
  const detailsEl = document.getElementById('chart-measure-details');
  const svg = document.getElementById('chart-measure-svg');

  if (!overlay || !box || !pill || !pctEl || !detailsEl) return;
  overlay.classList.remove('hidden');

  const left = Math.min(x1, x2);
  const top = Math.min(y1, y2);
  const width = Math.max(2, Math.abs(x2 - x1));
  const height = Math.max(2, Math.abs(y2 - y1));

  const deltaPrice = price2 - price1;
  const pct = price1 > 0 ? ((deltaPrice / price1) * 100) : 0;
  const isUp = deltaPrice >= 0;
  const barsCount = Math.abs(idx2 - idx1) + 1;

  box.style.left = `${left}px`;
  box.style.top = `${top}px`;
  box.style.width = `${width}px`;
  box.style.height = `${height}px`;

  if (isUp) {
    box.className = 'absolute border border-dashed rounded pointer-events-none up';
    pill.className = 'pointer-events-auto absolute z-40 px-2.5 py-1.5 rounded-xl shadow-2xl backdrop-blur-md border text-xs flex flex-col gap-0.5 cursor-default transition-all duration-75 up';
    pctEl.className = 'font-mono font-bold text-sm leading-none text-emerald-400';
    pctEl.textContent = `+${pct.toFixed(2)}%`;
  } else {
    box.className = 'absolute border border-dashed rounded pointer-events-none down';
    pill.className = 'pointer-events-auto absolute z-40 px-2.5 py-1.5 rounded-xl shadow-2xl backdrop-blur-md border text-xs flex flex-col gap-0.5 cursor-default transition-all duration-75 down';
    pctEl.className = 'font-mono font-bold text-sm leading-none text-rose-400';
    pctEl.textContent = `${pct.toFixed(2)}%`;
  }

  const sign = isUp ? '+' : '';
  detailsEl.textContent = `${sign}₹${deltaPrice.toFixed(2)} · ${barsCount} bars (₹${price1.toFixed(2)} → ₹${price2.toFixed(2)})`;

  // Draw arrow line in SVG
  if (svg) {
    const strokeColor = isUp ? '#10b981' : '#f43f5e';
    svg.innerHTML = `
      <defs>
        <marker id="measure-arrow-${isUp ? 'up' : 'down'}" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
          <path d="M 0 1.5 L 10 5 L 0 8.5 z" fill="${strokeColor}" />
        </marker>
      </defs>
      <line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${strokeColor}" stroke-width="2" stroke-dasharray="4,3" marker-end="url(#measure-arrow-${isUp ? 'up' : 'down'})" />
    `;
  }

  // Position Pill
  let pillX = x2 + 10;
  let pillY = y2 - 20;

  // Clamp within price pane bounds
  const paneRect = overlay.getBoundingClientRect();
  if (pillX + 160 > paneRect.width) pillX = x2 - 170;
  if (pillX < 10) pillX = 10;
  if (pillY < 10) pillY = 10;
  if (pillY + 60 > paneRect.height) pillY = paneRect.height - 65;

  pill.style.left = `${Math.round(pillX)}px`;
  pill.style.top = `${Math.round(pillY)}px`;
}

// -------------------------------------------------------------
// Adaptive Stock Input Width & Copy Stock Symbols
// -------------------------------------------------------------

function adjustStockInputWidth() {
  if (!el.manualStockInput) return;
  const val = (el.manualStockInput.value || '').trim();
  const len = Math.max(val.length + 3, 11);
  const clamped = Math.min(len, 32);
  el.manualStockInput.style.width = `${clamped}ch`;
}

function handleCopyStocks() {
  let list = [];
  if (state.activeSidebarTab === 'watchlists') {
    const activeWl = getActiveWatchlist();
    list = activeWl ? activeWl.stocks || [] : [];
  } else if (state.activeSidebarTab === 'pricescan') {
    list = (state.pricescanResults || []).filter(stock => {
      if (state.pricescanFilterMc2000 && stock.mcOver2000Cr !== true) return false;
      if (state.pricescanFilterMc1000 && stock.mcOver1000Cr !== true && stock.mcOver2000Cr !== true) return false;
      return true;
    });
  } else {
    list = (state.currentStocks || []).filter(stock => {
      if (state.filterMc2000 && stock.mcOver2000Cr !== true) return false;
      if (state.filterMc1000 && stock.mcOver1000Cr !== true && stock.mcOver2000Cr !== true) return false;
      if (!state.searchQuery) return true;
      const q = state.searchQuery;
      const sym = (stock.symbol || '').toLowerCase();
      const name = (stock.name || '').toLowerCase();
      return sym.includes(q) || name.includes(q);
    });
  }

  if (!list || list.length === 0) {
    showToast('No stocks available to copy', 'error');
    return;
  }

  const symbols = list.map(s => s.symbol).filter(Boolean);
  const textToCopy = symbols.join(', ');

  const copySuccess = () => {
    showToast(`Copied ${symbols.length} stock symbols! (Ready for TradingView / Dhan / Chartink)`, 'success');
  };

  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(textToCopy).then(copySuccess).catch(() => {
      fallbackCopyText(textToCopy, symbols.length);
    });
  } else {
    fallbackCopyText(textToCopy, symbols.length);
  }
}

function fallbackCopyText(text, count) {
  const ta = document.createElement('textarea');
  ta.value = text;
  ta.style.position = 'fixed';
  ta.style.left = '-9999px';
  document.body.appendChild(ta);
  ta.select();
  try {
    document.execCommand('copy');
    showToast(`Copied ${count} stock symbols! (Ready for TradingView / Dhan / Chartink)`, 'success');
  } catch (err) {
    showToast('Failed to copy to clipboard', 'error');
  }
  document.body.removeChild(ta);
}

// -------------------------------------------------------------
// Stock Navigation (Next / Previous) & Keyboard Shortcuts (↑ / ↓, J / K)
// -------------------------------------------------------------

function getActiveDisplayedStocksList() {
  let list = [];
  if (state.activeSidebarTab === 'watchlists') {
    const activeWl = getActiveWatchlist();
    list = activeWl ? activeWl.stocks || [] : [];
  } else if (state.activeSidebarTab === 'pricescan') {
    list = [...(state.pricescanResults || [])].filter(stock => {
      if (state.pricescanFilterMc2000 && stock.mcOver2000Cr !== true) return false;
      if (state.pricescanFilterMc1000 && stock.mcOver1000Cr !== true && stock.mcOver2000Cr !== true) return false;
      return true;
    });
    const sortField = state.pricescanSortField || 'spreadPercent';
    const isAsc = state.pricescanSortAscending;
    const ema = parseInt(el.selectPricescanEma?.value || '10', 10);

    list.sort((a, b) => {
      let valA = a[sortField];
      let valB = b[sortField];
      if (sortField === 'close' || sortField === 'ltp') {
        valA = (typeof a.close === 'number' && a.close > 0) ? a.close : (a.ltp || 0);
        valB = (typeof b.close === 'number' && b.close > 0) ? b.close : (b.ltp || 0);
      } else if (sortField === 'selectedEmaValue') {
        valA = ema === 20 ? (a.ema20 || a.selectedEmaValue) : (a.ema10 || a.selectedEmaValue);
        valB = ema === 20 ? (b.ema20 || b.selectedEmaValue) : (b.ema10 || b.selectedEmaValue);
      }
      if (typeof valA === 'string') {
        return isAsc ? valA.localeCompare(valB) : valB.localeCompare(valA);
      }
      valA = (valA !== undefined && valA !== null && !isNaN(valA)) ? Number(valA) : 0;
      valB = (valB !== undefined && valB !== null && !isNaN(valB)) ? Number(valB) : 0;
      return isAsc ? valA - valB : valB - valA;
    });
  } else {
    list = (state.currentStocks || []).filter(stock => {
      if (state.filterMc2000 && stock.mcOver2000Cr !== true) return false;
      if (state.filterMc1000 && stock.mcOver1000Cr !== true && stock.mcOver2000Cr !== true) return false;
      if (!state.searchQuery) return true;
      const q = state.searchQuery;
      const sym = (stock.symbol || '').toLowerCase();
      const name = (stock.name || '').toLowerCase();
      return sym.includes(q) || name.includes(q);
    });

    list.sort((a, b) => {
      let valA = a[state.sortField];
      let valB = b[state.sortField];
      if (typeof valA === 'string') {
        return state.sortAscending ? valA.localeCompare(valB) : valB.localeCompare(valA);
      }
      valA = valA || 0;
      valB = valB || 0;
      return state.sortAscending ? valA - valB : valB - valA;
    });
  }
  return list;
}

function navigateStock(direction) {
  const list = getActiveDisplayedStocksList();
  if (!list || list.length === 0) {
    showToast('No stocks in current list to navigate', 'warning');
    return;
  }

  const currentSym = state.selectedStock?.symbol;
  const currentIndex = list.findIndex(s => s.symbol === currentSym);

  let targetIndex = 0;
  if (direction > 0) {
    // Next stock (wrap to top if at end)
    targetIndex = currentIndex === -1 ? 0 : (currentIndex + 1 >= list.length ? 0 : currentIndex + 1);
  } else {
    // Previous stock (wrap to bottom if at top)
    targetIndex = currentIndex === -1 ? 0 : (currentIndex - 1 < 0 ? list.length - 1 : currentIndex - 1);
  }

  if (targetIndex >= 0 && targetIndex < list.length) {
    const nextStock = list[targetIndex];
    selectStock(nextStock);

    const tbody = state.activeSidebarTab === 'watchlists' 
      ? el.watchlistTbody 
      : (state.activeSidebarTab === 'pricescan' ? el.pricescanTbody : el.stocksTbody);
    if (tbody) {
      const rows = tbody.querySelectorAll('tr.stock-row, tr.pricescan-stock-row');
      rows.forEach((r, idx) => {
        if (idx === targetIndex) {
          r.classList.add('selected', state.activeSidebarTab === 'pricescan' ? 'bg-emerald-600/20' : 'bg-blue-600/20');
          // Smooth internal container scroll only (NEVER scrolls or shifts the page/chart window)
          const container = tbody.closest('.overflow-y-auto') || tbody.parentElement;
          if (container) {
            const cRect = container.getBoundingClientRect();
            const rRect = r.getBoundingClientRect();
            // 35px buffer accounts for sticky table thead
            if (rRect.top < cRect.top + 35) {
              container.scrollTop += (rRect.top - (cRect.top + 38));
            } else if (rRect.bottom > cRect.bottom) {
              container.scrollTop += (rRect.bottom - cRect.bottom + 10);
            }
          }
        } else {
          r.classList.remove('selected', 'bg-blue-600/20', 'bg-emerald-600/20');
        }
      });
    }
  }
}

function setupKeyboardNavigation() {
  window.addEventListener('keydown', (e) => {
    const tag = document.activeElement?.tagName?.toLowerCase();
    if (tag === 'input' || tag === 'textarea' || tag === 'select') {
      if (e.key === 'Escape') {
        document.activeElement.blur();
        cancelActiveDrawingTool();
        if (typeof closeSaveChartModal === 'function') closeSaveChartModal();
        if (typeof closeChartJournalModal === 'function') closeChartJournalModal();
        if (typeof closeChartLightboxModal === 'function') closeChartLightboxModal();
      }
      return;
    }

    if (e.key === 'Escape') {
      cancelActiveDrawingTool();
      if (typeof closeSaveChartModal === 'function') closeSaveChartModal();
      if (typeof closeChartJournalModal === 'function') closeChartJournalModal();
      if (typeof closeChartLightboxModal === 'function') closeChartLightboxModal();
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
  if (!state.currentStockData || !state.currentStockData.candles) {
    el.chartOhlcvLegend.innerHTML = '<span>Select a stock to view candlestick chart</span>';
    return;
  }
  const last = state.currentStockData.candles[state.currentStockData.candles.length - 1];
  if (last) {
    const isUp = last.close >= last.open;
    const chgColor = isUp ? 'text-emerald-400' : 'text-rose-400';
    
    let formattedTime = last.time;
    if (typeof last.time === 'number') {
      const d = new Date(last.time * 1000);
      const dateStr = d.toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata', day: '2-digit', month: 'short' });
      const timeStr = d.toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit', hour12: false });
      formattedTime = `${dateStr} ${timeStr}`;
    }

    el.chartOhlcvLegend.innerHTML = `
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

    if (el.volLiveBadge) {
      el.volLiveBadge.textContent = fmt.volume(last.volume);
    }
    const lastVolAvg = state.currentStockData.volAvg9?.[state.currentStockData.volAvg9.length - 1]?.value;
    if (el.volAvgLiveBadge) {
      el.volAvgLiveBadge.textContent = lastVolAvg ? fmt.volume(lastVolAvg) : '--';
    }
    if (el.candleChgBadge) {
      const candles = state.currentStockData.candles;
      const lastIdx = candles.length - 1;
      let chgPercent = 0;
      if (lastIdx > 0 && candles[lastIdx - 1]?.close) {
        const prevClose = candles[lastIdx - 1].close;
        chgPercent = Number((((last.close - prevClose) / prevClose) * 100).toFixed(2));
      } else if (last.open) {
        chgPercent = Number((((last.close - last.open) / last.open) * 100).toFixed(2));
      }
      const isUp = chgPercent >= 0;
      el.candleChgBadge.textContent = (isUp ? '+' : '') + chgPercent.toFixed(2) + '%';
      el.candleChgBadge.className = isUp ? 'font-bold text-emerald-400' : 'font-bold text-rose-400';
    }
    if (el.rsiLiveBadge) {
      el.rsiLiveBadge.textContent = state.currentStockData.latestRSI || '--';
    }
    if (el.rsiSmaLiveBadge) {
      el.rsiSmaLiveBadge.textContent = state.currentStockData.latestRsiSMA || '--';
    }
    updateOption1LegendLine();
  }
}

function updateOption1LegendLine(hoverTime) {
  const d = state.currentStockData;
  if (!d) return;

  const targetTime = hoverTime;
  const findVal = (series) => {
    if (!series || !series.length) return null;
    if (targetTime) {
      const match = series.find(item => item.time === targetTime);
      if (match && typeof match.value === 'number') return match.value;
    }
    return series[series.length - 1]?.value;
  };

  const e10Val = findVal(d.ema10);
  const e20Val = findVal(d.ema20);
  const e50Val = findVal(d.ema50);
  const e150Val = findVal(d.ema150);
  const e200Val = findVal(d.ema200);

  let volVal = '--';
  if (targetTime && d.candles) {
    const cMatch = d.candles.find(c => c.time === targetTime);
    if (cMatch && cMatch.volume) volVal = fmt.volume(cMatch.volume);
  } else if (d.candles && d.candles.length > 0) {
    volVal = fmt.volume(d.candles[d.candles.length - 1].volume);
  }

  const elE10 = document.getElementById('legend-ema10');
  const elE20 = document.getElementById('legend-ema20');
  const elE50 = document.getElementById('legend-ema50');
  const elE150 = document.getElementById('legend-ema150');
  const elE200 = document.getElementById('legend-ema200');
  const elVol = document.getElementById('legend-volume');

  if (elE10) elE10.textContent = e10Val != null ? e10Val.toFixed(1) : '--';
  if (elE20) elE20.textContent = e20Val != null ? e20Val.toFixed(1) : '--';
  if (elE50) elE50.textContent = e50Val != null ? e50Val.toFixed(1) : '--';
  if (elE150) elE150.textContent = e150Val != null ? e150Val.toFixed(1) : '--';
  if (elE200) elE200.textContent = e200Val != null ? e200Val.toFixed(1) : '--';
  if (elVol) elVol.textContent = volVal;
}

// -------------------------------------------------------------
// Load Stock Data & Populate 3 Panes
// -------------------------------------------------------------

async function loadStockChart(rawSymbol) {
  if (!rawSymbol) return;
  const cleanSymbol = rawSymbol.trim().toUpperCase();

  // Clear prior measurement on stock switch
  clearChartMeasurement();

  // Show loading spinner
  el.chartLoadingOverlay.classList.remove('hidden');
  el.chartLoadingOverlay.classList.add('flex');

  try {
    const res = await fetch(`/api/stocks/${encodeURIComponent(cleanSymbol)}/history?interval=${state.activeInterval}&range=${state.activeRange}`);
    const data = await res.json();

    if (!res.ok || !data.success) {
      throw new Error(data.error || 'Historical data not available for this stock');
    }

    if (Array.isArray(data.candles)) {
      data.candles = data.candles.filter(c => {
        if (!c) return false;
        if ((!state.activeInterval || state.activeInterval === '1d') && isNSEHolidayDate(c.time)) return false;
        return !(c.volume === 0 && (c.high === c.low || Math.abs(c.high - c.low) < 0.001));
      });
    }

    state.currentStockData = data;

    // Update Header & On-Chart Details
    if (el.chartSymbolAvatar) el.chartSymbolAvatar.textContent = cleanSymbol.substring(0, 3);
    if (el.manualStockInput) el.manualStockInput.value = cleanSymbol;
    if (el.onchartStockSymbol) el.onchartStockSymbol.textContent = cleanSymbol;
    if (el.chartStockSymbol) {
      if ('value' in el.chartStockSymbol) el.chartStockSymbol.value = cleanSymbol;
      else el.chartStockSymbol.textContent = cleanSymbol;
    }
    if (el.chartStockLtp) el.chartStockLtp.textContent = fmt.currency(data.ltp);

    const chartProfileSymbol = document.getElementById('chart-profile-symbol');
    if (chartProfileSymbol) chartProfileSymbol.textContent = cleanSymbol;

    // Day Range Slider update
    const elDayLow = document.getElementById('chart-day-low');
    const elDayHigh = document.getElementById('chart-day-high');
    const elDayThumb = document.getElementById('chart-day-slider-thumb');
    const dLow = Number(data.dayLow || (data.low != null ? data.low : 0));
    const dHigh = Number(data.dayHigh || (data.high != null ? data.high : 0));
    if (elDayLow && elDayHigh) {
      if (dLow > 0 && dHigh > 0) {
        elDayLow.textContent = fmt.currency(dLow);
        elDayHigh.textContent = fmt.currency(dHigh);
        if (elDayThumb && dHigh > dLow) {
          const ltpVal = Number(data.ltp || 0);
          const pct = Math.max(0, Math.min(100, ((ltpVal - dLow) / (dHigh - dLow)) * 100));
          elDayThumb.style.left = `${pct}%`;
        }
      } else {
        elDayLow.textContent = '--';
        elDayHigh.textContent = '--';
      }
    }

    if (el.chartStockExchange) {
      const exchHtml = (data.exchange && data.exchange !== 'NSE') ? `<span class="px-1.5 py-0.5 text-[10px] font-mono font-bold bg-dark-bg text-slate-400 rounded border border-dark-border mr-1">${data.exchange}</span>` : '';
      el.chartStockExchange.innerHTML = `${exchHtml}${typeof getStockInfoButtonHtml === 'function' ? getStockInfoButtonHtml(cleanSymbol, data.name, 'ml-1') : ''}${getFnoBadgeHtml(cleanSymbol, 'ml-1')}`;
    }
    
    // Percent change pill
    if (el.chartStockChange) {
      const isBull = (data.changePercent || 0) >= 0;
      el.chartStockChange.className = `px-2 py-0.5 text-xs font-semibold rounded-md font-mono ${
        isBull ? 'badge-gain-v2' : 'badge-loss-v2'
      }`;
      el.chartStockChange.textContent = fmt.percent(data.changePercent);
    }

    // External link shortcuts
    if (el.linkTradingview) el.linkTradingview.href = `https://in.tradingview.com/chart/?symbol=${data.exchange}:${cleanSymbol}`;
    if (el.linkChartink) el.linkChartink.href = `https://chartink.com/stocks/${cleanSymbol.toLowerCase()}.html`;

    // Update Metric Badges (52W High & All-Time High only)
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
    if (el.chartStockName) el.chartStockName.textContent = data.name || cleanSymbol;
    updateOnChartCircuitBadge(data);

    // Configure timeScale visibility for intraday vs daily/higher
    updateTimeScalesVisibility();

    // 1. POPULATE PANE 1: Candlesticks & Overlays (Clean, NO text)
    if (state.charts.series.candles && data.candles) {
      state.charts.series.candles.setData(data.candles);
    }
    if (state.charts.series.ema10 && data.ema10) state.charts.series.ema10.setData(data.ema10);
    if (state.charts.series.ema20 && data.ema20) state.charts.series.ema20.setData(data.ema20);
    if (state.charts.series.ema50 && data.ema50) state.charts.series.ema50.setData(data.ema50);
    if (state.charts.series.ema150 && data.ema150) state.charts.series.ema150.setData(data.ema150);
    if (state.charts.series.ema200 && data.ema200) state.charts.series.ema200.setData(data.ema200);
    if (state.charts.series.vwap && data.vwapSeries) state.charts.series.vwap.setData(data.vwapSeries);

    // Populate Darvas Box Lines (Top: Green, Bottom: Red)
    if (state.charts.series.darvasTop && data.darvasBox?.topBox) {
      state.charts.series.darvasTop.setData(data.darvasBox.topBox);
    }
    if (state.charts.series.darvasBottom && data.darvasBox?.bottomBox) {
      state.charts.series.darvasBottom.setData(data.darvasBox.bottomBox);
    }

    // Populate Pivot Point Lines (P, R1, S1 only)
    updatePivotLines();

    // 2. POPULATE PANE 2: Dedicated Volume & 9-Period AVG Volume SMA
    if (state.charts.series.volume && data.volumeSeries) {
      state.charts.series.volume.setData(data.volumeSeries);
    }
    if (state.charts.series.volAvg && data.volAvg9) {
      state.charts.series.volAvg.setData(data.volAvg9);
    }
    updateEarningsVolumeMarkers();

    // 3. POPULATE PANE 3: Dedicated RSI (14) + RSI SMA (14)
    if (state.charts.series.rsi && data.rsi14) {
      state.charts.series.rsi.setData(data.rsi14);
      if (el.rsiLiveBadge) {
        el.rsiLiveBadge.textContent = data.latestRSI || '--';
      }
    }
    if (state.charts.series.rsiSma && data.rsiSma14) {
      state.charts.series.rsiSma.setData(data.rsiSma14);
      if (el.rsiSmaLiveBadge) {
        el.rsiSmaLiveBadge.textContent = data.latestRsiSMA || '--';
      }
    }

    // 4. POPULATE PANE 4: Dedicated Volume Intelligence (50-SMA, PP, BS, RVol, Dry Vol, HV/LV, Paint Bars)
    renderVolumeIntelligence();
    syncChartIndicatorsWithPermissions();

    // Render any active drawings (AVWAPs, H-lines, V-lines) for this stock
    renderPersistedDrawings();

    // Set initial visible range based on activeRange (3M, 6M, 12M)
    // while keeping all full history available for backwards scrolling
    applyActiveRangeZoom();
    syncChartPriceScales();
    setTimeout(syncChartPriceScales, 50);

    if (el.manualStockInput) {
      el.manualStockInput.value = cleanSymbol;
      adjustStockInputWidth();
    }
    
    updateDefaultVolumeBadges();
    updateOption1LegendLine();

    // Trigger immediate live quote verification for the chart
    pollActiveStockLiveQuote();

  } catch (err) {
    showToast(`Chart error for ${cleanSymbol}: ${err.message}`, 'error');
  } finally {
    el.chartLoadingOverlay.classList.remove('flex');
    el.chartLoadingOverlay.classList.add('hidden');
  }
}

// -------------------------------------------------------------
// Real-Time Active Chart Ticker & Screener Price Sync
// -------------------------------------------------------------
let activeChartTickerInterval = null;

function startActiveChartLiveTicker() {
  if (activeChartTickerInterval) clearInterval(activeChartTickerInterval);
  activeChartTickerInterval = setInterval(() => {
    pollActiveStockLiveQuote();
  }, 4000); // Poll active stock every 4s for zero-lag intraday precision
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

    // Update Header LTP Display
    if (el.chartStockLtp) {
      el.chartStockLtp.textContent = fmt.currency(newPrice);
      if (oldPrice && oldPrice !== newPrice) {
        const isUp = newPrice > oldPrice;
        el.chartStockLtp.style.color = isUp ? '#10b981' : '#ef4444';
        setTimeout(() => { if (el.chartStockLtp) el.chartStockLtp.style.color = ''; }, 1200);
      }
    }

    if (el.chartStockChange) {
      const isBull = newChange >= 0;
      el.chartStockChange.className = `px-2 py-0.5 text-xs font-semibold rounded-md ${
        isBull ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
      }`;
      el.chartStockChange.textContent = fmt.percent(newChange);
    }

    // Update the last candle on the chart in real-time
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

    // Update matching stock in current screened list if present
    if (state.currentStocks && state.currentStocks.length > 0) {
      const matchInList = state.currentStocks.find(s => (s.symbol || '').toUpperCase() === cleanSym);
      if (matchInList && (matchInList.close !== newPrice || matchInList.changePercent !== newChange)) {
        matchInList.price = newPrice;
        matchInList.close = newPrice;
        if (newChange != null && !isNaN(newChange)) matchInList.changePercent = Number(newChange.toFixed(2));
        if (q.volume) matchInList.volume = q.volume;
        renderStocksTable();
      }
    }

    updateDefaultLegend();
  } catch (err) {}
}

async function syncScreenedStocksLivePrices() {
  if (!state.currentStocks || state.currentStocks.length === 0) return;
  const symbols = state.currentStocks.map(s => s.symbol).filter(Boolean);
  if (symbols.length === 0) return;

  try {
    const res = await fetch(`/api/fno/live-quotes?symbols=${encodeURIComponent(symbols.slice(0, 100).join(','))}`);
    const data = await res.json();
    if (data.success && data.quotes) {
      let updated = false;
      state.currentStocks.forEach(s => {
        const q = data.quotes[(s.symbol || '').toUpperCase()];
        if (q && q.price) {
          s.price = q.price;
          s.close = q.price;
          if (q.changePercent !== undefined && q.changePercent !== null && !isNaN(q.changePercent)) {
            s.changePercent = Number(q.changePercent.toFixed(2));
          }
          if (q.volume) s.volume = q.volume;
          updated = true;
        }
      });
      if (updated) {
        renderStocksTable();
      }
    }
  } catch (err) {}
}

// Select a stock from the table or manual search
function selectStock(stock) {
  if (!stock) return;
  state.selectedStock = stock;

  if (el.manualStockInput) {
    el.manualStockInput.value = stock.symbol;
    adjustStockInputWidth();
  }

  // Highlight selected row in table
  document.querySelectorAll('.stock-row, .pricescan-stock-row').forEach(row => {
    row.classList.remove('selected', 'bg-blue-600/20', 'bg-emerald-600/20');
  });
  const matchingRow = Array.from(document.querySelectorAll('.stock-row, .pricescan-stock-row')).find(row => {
    return (row.dataset && row.dataset.symbol === stock.symbol) || row.querySelector('span.font-mono')?.textContent?.trim() === stock.symbol;
  });
  if (matchingRow) {
    if (matchingRow.classList.contains('pricescan-stock-row')) {
      matchingRow.classList.add('selected', 'bg-emerald-600/20');
    } else {
      matchingRow.classList.add('selected', 'bg-blue-600/20');
    }
  }

  if (el.chartStockName) el.chartStockName.textContent = stock.name || stock.symbol;
  updateOnChartCircuitBadge(stock);
  loadStockChart(stock.symbol);
}

// -------------------------------------------------------------
// DarvasScan Controller (Darvas Green ↔ EMA 10 / 20) (Registered Users Only)
// -------------------------------------------------------------

function populatePricescanScopeOptions() {
  if (!el.selectPricescanScope) return;
  const currentVal = el.selectPricescanScope.value || 'current';

  let html = `<optgroup label="Active Workspace">`;
  const screenerStockCount = (state.currentStocks || []).length;
  html += `<option value="current">⚡ Current Screener (${screenerStockCount} stocks)</option>`;

  if (Array.isArray(state.watchlists) && state.watchlists.length > 0) {
    state.watchlists.forEach(w => {
      html += `<option value="${w.id}">⭐ Watchlist: ${w.name} (${(w.stocks || []).length} stocks)</option>`;
    });
  }

  html += `
    </optgroup>
    <optgroup label="Market Indices & Universes">
      <option value="fno">🎯 F&O Stocks (~200)</option>
      <option value="large">🏢 Large Cap (Top 100)</option>
      <option value="mid">📈 Mid Cap (150)</option>
      <option value="small">🚀 Small Cap (250)</option>
      <option value="micro">🔬 Micro Cap</option>
      <option value="midsmall400">🌐 MidSmall400 (400)</option>
      <option value="universe">🌍 Full Universe (1.1k)</option>
    </optgroup>
  `;

  el.selectPricescanScope.innerHTML = html;

  const exists = Array.from(el.selectPricescanScope.options).some(o => o.value === currentVal);
  if (exists) {
    el.selectPricescanScope.value = currentVal;
  }
}

async function runPricePositionScan() {
  const ema = parseInt(el.selectPricescanEma?.value || '10', 10);
  const interval = el.selectPricescanTimeframe?.value || '1d';
  const tfCode = interval === '1wk' ? 'W' : 'D';
  const tfLabel = interval === '1wk' ? 'Weekly' : 'Daily';
  const scope = el.selectPricescanScope?.value || 'current';
  const btn = el.btnRunPricescan;
  const tbody = el.pricescanTbody;
  const statusBadge = el.pricescanStatusBadge;
  const countEl = el.pricescanResultsCount;
  const footerInfo = el.pricescanFooterInfo;

  // Update dynamic table column header
  if (el.pricescanDynamicEmaCol) {
    el.pricescanDynamicEmaCol.textContent = `EMA ${ema} (${tfCode}) (₹)`;
  }
  if (el.pricescanDynamicDarvasCol) {
    el.pricescanDynamicDarvasCol.textContent = `Darvas (${tfCode})`;
  }

  if (footerInfo) {
    footerInfo.textContent = `Condition: min(DarvasGreen(${tfCode}), EMA${ema}(${tfCode})) ≤ Close ≤ max(DarvasGreen(${tfCode}), EMA${ema}(${tfCode}))`;
  }

  // Determine stock list & scanning label based on scope
  let stockList = [];
  let scanScopeLabel = '';

  if (scope === 'current') {
    stockList = (state.currentStocks || []).map(s => s.symbol).filter(Boolean);
    scanScopeLabel = `${stockList.length} Screener Stocks`;
    if (stockList.length === 0) {
      showToast('No stocks loaded in current screener. Switch scope or run a screener first.', 'warning');
      return;
    }
  } else if (scope.startsWith('wl_') || scope === 'watchlist') {
    const targetWl = (state.watchlists || []).find(w => w.id === scope) || getActiveWatchlist();
    if (targetWl) {
      stockList = (targetWl.stocks || []).map(s => s.symbol).filter(Boolean);
      scanScopeLabel = `Watchlist "${targetWl.name}" (${stockList.length} stocks)`;
    } else {
      scanScopeLabel = 'Watchlist Stocks';
    }
    if (stockList.length === 0) {
      showToast('Selected watchlist is empty. Add stocks to this watchlist first.', 'warning');
      return;
    }
  } else if (scope === 'universe') {
    scanScopeLabel = 'Universe Stocks';
  } else {
    scanScopeLabel = `${scope.toUpperCase()} Stocks`;
  }

  if (btn) {
    btn.disabled = true;
    btn.classList.add('opacity-70', 'cursor-not-allowed');
    btn.innerHTML = `<i data-lucide="loader-2" class="w-3.5 h-3.5 animate-spin"></i><span>Scanning...</span>`;
    lucide.createIcons();
  }

  if (statusBadge) {
    statusBadge.textContent = 'Scanning...';
    statusBadge.className = 'text-[11px] text-amber-400 font-mono animate-pulse';
  }

  if (tbody) {
    tbody.innerHTML = `
      <tr>
        <td colspan="7" class="p-8 text-center text-slate-400">
          <div class="flex flex-col items-center justify-center gap-3">
            <i data-lucide="loader-2" class="w-8 h-8 text-emerald-400 animate-spin"></i>
            <p class="text-xs font-semibold text-slate-200">Scanning ${scanScopeLabel} (${tfLabel})...</p>
            <p class="text-[11px] text-slate-500">Checking Darvas Green Line (${tfLabel}) & EMA ${ema} (${tfLabel}) boundary condition</p>
          </div>
        </td>
      </tr>
    `;
    lucide.createIcons();
  }

  try {
    const res = await fetch('/api/scan/darvas-ema', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeaders()
      },
      body: JSON.stringify({
        targetEma: ema,
        interval,
        scope,
        stockList
      })
    });

    if (res.status === 401) {
      state.pricescanResults = [];
      showToast('Please log in or register to run DarvasScan.', 'warning');
      openAuthModal('login');
      return;
    }

    const data = await res.json();

    if (!data.success) {
      throw new Error(data.error || 'Scan failed');
    }

    const matches = data.results || [];
    state.pricescanResults = matches;

    if (countEl) countEl.textContent = matches.length;
    if (el.pricescanResultsCountBadge) el.pricescanResultsCountBadge.textContent = matches.length;
    if (statusBadge) {
      statusBadge.textContent = `${matches.length} Matches (${new Date().toLocaleTimeString('en-IN', { hour12: false })})`;
      statusBadge.className = 'text-[11px] text-emerald-400 font-mono font-semibold';
    }

    renderPricescanTable();
    showToast(`DarvasScan complete: Found ${matches.length} matching stocks (${tfLabel}).`, 'success');
  } catch (err) {
    console.error('Scan error:', err);
    state.pricescanResults = [];
    if (statusBadge) {
      statusBadge.textContent = 'Scan Error';
      statusBadge.className = 'text-[11px] text-rose-400 font-mono';
    }
    if (tbody) {
      tbody.innerHTML = `
        <tr>
          <td colspan="7" class="p-6 text-center text-rose-400">
            <p class="text-xs font-semibold">Error running scan: ${err.message}</p>
          </td>
        </tr>
      `;
    }
    showToast(`Scan error: ${err.message}`, 'error');
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.classList.remove('opacity-70', 'cursor-not-allowed');
      btn.innerHTML = `<i data-lucide="play" class="w-3.5 h-3.5 fill-current"></i><span>RUN</span>`;
      lucide.createIcons();
    }
  }
}

// -------------------------------------------------------------
// Render DarvasScan Table with Dynamic Sorting
// -------------------------------------------------------------
function renderPricescanTable() {
  const tbody = el.pricescanTbody;
  if (!tbody) return;

  const ema = parseInt(el.selectPricescanEma?.value || '10', 10);
  const interval = el.selectPricescanTimeframe?.value || '1d';
  const tfCode = interval === '1wk' ? 'W' : 'D';

  const matches = [...(state.pricescanResults || [])].filter(stock => {
    if (state.pricescanFilterMc2000 && stock.mcOver2000Cr !== true) {
      return false;
    }
    if (state.pricescanFilterMc1000 && stock.mcOver1000Cr !== true && stock.mcOver2000Cr !== true) {
      return false;
    }
    return true;
  });

  if (el.pricescanResultsCount) el.pricescanResultsCount.textContent = matches.length;
  if (el.pricescanResultsCountBadge) el.pricescanResultsCountBadge.textContent = matches.length;

  // Update dynamic table column header text
  if (el.pricescanDynamicEmaCol) {
    el.pricescanDynamicEmaCol.textContent = `EMA ${ema} (${tfCode}) (₹)`;
  }
  if (el.pricescanDynamicDarvasCol) {
    el.pricescanDynamicDarvasCol.textContent = `Darvas (${tfCode})`;
  }

  // Update active column header highlight and icon
  const sortField = state.pricescanSortField || 'spreadPercent';
  const isAsc = state.pricescanSortAscending;

  document.querySelectorAll('th[data-psort]').forEach(th => {
    const isThisCol = th.dataset.psort === sortField;
    const icon = th.querySelector('svg, i');
    if (isThisCol) {
      th.classList.add('text-slate-100');
      if (icon) {
        icon.setAttribute('data-lucide', isAsc ? 'arrow-up' : 'arrow-down');
      }
    } else {
      th.classList.remove('text-slate-100');
      if (icon) {
        icon.setAttribute('data-lucide', 'arrow-up-down');
      }
    }
  });

  if (matches.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="7" class="p-8 text-center text-slate-500">
          <div class="flex flex-col items-center justify-center gap-2">
            <i data-lucide="inbox" class="w-8 h-8 text-slate-600"></i>
            <p class="text-xs text-slate-300">No stocks matched the condition: <span class="font-mono text-amber-400">min(DarvasGreen(${tfCode}), EMA${ema}(${tfCode})) ≤ Close ≤ max(DarvasGreen(${tfCode}), EMA${ema}(${tfCode}))</span></p>
            <p class="text-[11px] text-slate-500">Try adjusting Market Cap filters, changing EMA to ${ema === 10 ? 'EMA 20' : 'EMA 10'}, or scanning a broader scope.</p>
          </div>
        </td>
      </tr>
    `;
    lucide.createIcons();
    return;
  }

  // Sort matches
  matches.sort((a, b) => {
    let valA = a[sortField];
    let valB = b[sortField];
    if (sortField === 'close' || sortField === 'ltp') {
      valA = (typeof a.close === 'number' && a.close > 0) ? a.close : (a.ltp || 0);
      valB = (typeof b.close === 'number' && b.close > 0) ? b.close : (b.ltp || 0);
    } else if (sortField === 'selectedEmaValue') {
      valA = ema === 20 ? (a.ema20 || a.selectedEmaValue) : (a.ema10 || a.selectedEmaValue);
      valB = ema === 20 ? (b.ema20 || b.selectedEmaValue) : (b.ema10 || b.selectedEmaValue);
    }
    if (typeof valA === 'string') {
      return isAsc ? valA.localeCompare(valB) : valB.localeCompare(valA);
    }
    valA = (valA !== undefined && valA !== null && !isNaN(valA)) ? Number(valA) : 0;
    valB = (valB !== undefined && valB !== null && !isNaN(valB)) ? Number(valB) : 0;
    return isAsc ? valA - valB : valB - valA;
  });

  tbody.innerHTML = matches.map((m) => {
    const isSelected = state.selectedStock && state.selectedStock.symbol === m.symbol;
    const rawChg = typeof m.changePercent === 'number' ? m.changePercent : parseFloat(m.changePercent);
    const chgVal = isNaN(rawChg) ? 0 : Number(rawChg.toFixed(2));
    const isBull = chgVal >= 0;
    const changeBadge = isBull 
      ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
      : 'bg-rose-500/10 text-rose-400 border border-rose-500/20';
    const ltpPrice = (typeof m.close === 'number' && m.close > 0) ? m.close : (m.ltp || 0);
    const selectedEmaVal = ema === 20 ? (m.ema20 || m.selectedEmaValue) : (m.ema10 || m.selectedEmaValue);

    let mcBadgeHtml = '';
    if (m.mcOver2000Cr) {
      mcBadgeHtml = `
        <span class="px-1 py-0.2 rounded bg-indigo-500/15 text-indigo-300 border border-indigo-500/30 text-[9px] font-mono font-medium" title="Market Cap > ₹2000 Cr">
          &gt;2k
        </span>
      `;
    } else if (m.mcOver1000Cr) {
      mcBadgeHtml = `
        <span class="px-1 py-0.2 rounded bg-cyan-500/15 text-cyan-300 border border-cyan-500/30 text-[9px] font-mono font-medium" title="Market Cap > ₹1000 Cr">
          &gt;1k
        </span>
      `;
    }

    return `
      <tr class="pricescan-stock-row hover:bg-emerald-500/10 cursor-pointer transition-colors group select-none ${isSelected ? 'selected bg-emerald-600/20' : ''}" data-symbol="${m.symbol}">
        <td class="py-2.5 px-3">
          <div class="flex flex-col">
            <div class="flex items-center gap-1.5">
              <span class="font-mono font-bold text-slate-100 group-hover:text-emerald-300 text-xs">${m.symbol}</span>
              ${typeof getStockInfoButtonHtml === 'function' ? getStockInfoButtonHtml(m.symbol, m.name) : ''}
              ${m.exchange && m.exchange !== 'NSE' ? `<span class="text-[9px] px-1 py-0.2 rounded bg-dark-bg text-slate-400 font-mono">${m.exchange}</span>` : ''}
              ${getFnoBadgeHtml(m.symbol)}
              ${getCircuitBadgeHtml(m)}
              ${mcBadgeHtml}
            </div>
            <span class="text-[10px] text-slate-400 truncate max-w-[130px]">${m.name || m.symbol}</span>
          </div>
        </td>
        <td class="py-2.5 px-2 text-right font-mono font-bold text-slate-100 text-xs">
          ${fmt.currency(ltpPrice)}
        </td>
        <td class="py-2.5 px-2 text-right">
          <span class="px-1.5 py-0.5 rounded text-[10px] font-mono font-semibold ${changeBadge}">
            ${fmt.percent(chgVal)}
          </span>
        </td>
        <td class="py-2.5 px-2 text-right font-mono text-slate-400 text-[11px]">
          ${fmt.volume(m.volume)}
        </td>
        <td class="py-2.5 px-2 text-right font-mono text-xs text-blue-400 font-bold bg-blue-500/5 rounded">
          ${fmt.currency(selectedEmaVal)}
        </td>
        <td class="py-2.5 px-2 text-right font-mono text-xs font-bold text-emerald-400">
          ${fmt.currency(m.darvasGreen)}
        </td>
        <td class="py-2.5 px-2 text-center font-mono text-[11px]">
          <span class="px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 text-[10px] font-semibold" title="Channel width between Darvas Green and EMA${ema} (${tfCode}): ${m.spreadPercent}%">
            ${m.spreadPercent}%
          </span>
        </td>
      </tr>
    `;
  }).join('');

  lucide.createIcons();

  // Attach row click listeners to load chart
  tbody.querySelectorAll('.pricescan-stock-row').forEach(row => {
    row.addEventListener('click', () => {
      const sym = row.dataset.symbol;
      if (sym) {
        tbody.querySelectorAll('.pricescan-stock-row').forEach(r => r.classList.remove('selected', 'bg-emerald-600/20'));
        row.classList.add('selected', 'bg-emerald-600/20');

        // Sync chart timeframe with scanner timeframe
        const scanTf = el.selectPricescanTimeframe?.value || '1d';
        state.selectedInterval = scanTf;
        document.querySelectorAll('.timeframe-btn').forEach(btn => {
          if (btn.dataset.interval === scanTf) {
            btn.classList.add('active', 'bg-blue-600', 'text-white', 'font-semibold', 'shadow');
            btn.classList.remove('hover:text-white');
          } else {
            btn.classList.remove('active', 'bg-blue-600', 'text-white', 'font-semibold', 'shadow');
          }
        });

        selectStock({ symbol: sym, name: sym });
        // Ensure Darvas and selected EMA toggles are enabled
        if (state.toggles) {
          if (!state.toggles.darvas && el.chkDarvas) {
            el.chkDarvas.checked = true;
            state.toggles.darvas = true;
            state.charts.series?.darvasTop?.applyOptions({ visible: true });
            state.charts.series?.darvasBottom?.applyOptions({ visible: true });
          }
          const emaToggleKey = ema === 20 ? 'ema20' : 'ema10';
          const emaChk = ema === 20 ? el.chkEma20 : el.chkEma10;
          if (emaChk && !state.toggles[emaToggleKey]) {
            emaChk.checked = true;
            state.toggles[emaToggleKey] = true;
            state.charts.series?.[emaToggleKey]?.applyOptions({ visible: true });
          }
        }
      }
    });
  });
}

// -------------------------------------------------------------
// Strong Start RVOL Dashboard Controller (SS_RVOL) (Registered Users Only)
// -------------------------------------------------------------

function populateSsrvolScopeOptions() {
  if (!el.selectSsrvolScope) return;
  const currentVal = el.selectSsrvolScope.value || 'current';

  let html = `<optgroup label="Active Workspace">`;
  const screenerStockCount = (state.currentStocks || []).length;
  html += `<option value="current">⚡ Current Screener (${screenerStockCount} stocks)</option>`;

  if (Array.isArray(state.watchlists) && state.watchlists.length > 0) {
    state.watchlists.forEach(w => {
      html += `<option value="${w.id}">⭐ Watchlist: ${w.name} (${(w.stocks || []).length} stocks)</option>`;
    });
  }

  html += `
    </optgroup>
    <optgroup label="Market Indices & Universes">
      <option value="fno">🎯 F&O Stocks (~200)</option>
      <option value="large">🏢 Large Cap (Top 100)</option>
      <option value="mid">📈 Mid Cap (150)</option>
      <option value="small">🚀 Small Cap (250)</option>
      <option value="micro">🔬 Micro Cap</option>
      <option value="midsmall400">🌐 MidSmall400 (400)</option>
      <option value="universe">🌍 Full Universe (1.1k)</option>
    </optgroup>
  `;

  el.selectSsrvolScope.innerHTML = html;

  const exists = Array.from(el.selectSsrvolScope.options).some(o => o.value === currentVal);
  if (exists) {
    el.selectSsrvolScope.value = currentVal;
  }
}

async function runSsRvolScan() {
  const lookback = parseInt(el.inputSsrvolLookback?.value || state.ssrvolLookback || '20', 10);
  const scope = el.selectSsrvolScope?.value || 'current';
  const ssOnly = Boolean(el.chkSsrvolSsOnly?.checked || state.ssrvolFilterSsOnly);
  const btn = el.btnRunSsrvol;
  const tbody = el.ssrvolTbody;
  const countBadge = el.ssrvolResultsCountBadge;

  // Update dynamic column header
  if (el.ssrvolDynamicAvgvolCol) {
    el.ssrvolDynamicAvgvolCol.textContent = `Avg Vol (${lookback}D)`;
  }

  let stockList = [];
  let scanScopeLabel = '';

  if (scope === 'current') {
    stockList = (state.currentStocks || []).map(s => s.symbol).filter(Boolean);
    scanScopeLabel = `${stockList.length} Screener Stocks`;
    if (stockList.length === 0) {
      showToast('No stocks loaded in current screener. Switch scope or run a screener first.', 'warning');
      return;
    }
  } else if (scope.startsWith('wl_') || scope === 'watchlist') {
    const targetWl = (state.watchlists || []).find(w => w.id === scope) || getActiveWatchlist();
    if (targetWl) {
      stockList = (targetWl.stocks || []).map(s => s.symbol).filter(Boolean);
      scanScopeLabel = `Watchlist "${targetWl.name}" (${stockList.length} stocks)`;
    } else {
      scanScopeLabel = 'Watchlist Stocks';
    }
    if (stockList.length === 0) {
      showToast('Selected watchlist is empty. Add stocks to this watchlist first.', 'warning');
      return;
    }
  } else if (scope === 'universe') {
    scanScopeLabel = 'Universe Stocks';
  } else {
    scanScopeLabel = `${scope.toUpperCase()} Stocks`;
  }

  if (btn) {
    btn.disabled = true;
    btn.classList.add('opacity-70', 'cursor-not-allowed');
    btn.innerHTML = `<i data-lucide="loader-2" class="w-3.5 h-3.5 animate-spin"></i><span>Scanning...</span>`;
    lucide.createIcons();
  }

  if (tbody) {
    tbody.innerHTML = `
      <tr>
        <td colspan="6" class="p-8 text-center text-slate-400">
          <div class="flex flex-col items-center justify-center gap-3">
            <i data-lucide="loader-2" class="w-8 h-8 text-amber-400 animate-spin"></i>
            <p class="text-xs font-semibold text-slate-200">Scanning ${scanScopeLabel} for Strong Start & RVOL...</p>
            <p class="text-[11px] text-slate-500">Checking Open > PrevClose, DayLow ≥ PrevClose × 0.995, and ${lookback}D Volume SMA</p>
          </div>
        </td>
      </tr>
    `;
    lucide.createIcons();
  }

  try {
    const res = await fetch('/api/scan/ss-rvol', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeaders()
      },
      body: JSON.stringify({
        lookback,
        scope,
        stockList,
        ssOnly
      })
    });

    if (res.status === 401) {
      state.ssrvolResults = [];
      showToast('Please log in or register to run Strong Start RVOL Dashboard.', 'warning');
      openAuthModal('login');
      return;
    }

    const data = await res.json();

    if (!data.success) {
      throw new Error(data.error || 'Scan failed');
    }

    const matches = data.results || [];
    state.ssrvolResults = matches;

    if (countBadge) countBadge.textContent = matches.length;

    renderSsrvolTable();
    showToast(`SS_RVOL scan complete: Found ${matches.length} stocks (${lookback}D Lookback).`, 'success');
  } catch (err) {
    console.error('SS_RVOL scan error:', err);
    state.ssrvolResults = [];
    if (tbody) {
      tbody.innerHTML = `
        <tr>
          <td colspan="6" class="p-6 text-center text-rose-400">
            <p class="text-xs font-semibold">Error running SS_RVOL scan: ${err.message}</p>
          </td>
        </tr>
      `;
    }
    showToast(`SS_RVOL scan error: ${err.message}`, 'error');
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.classList.remove('opacity-70', 'cursor-not-allowed');
      btn.innerHTML = `<i data-lucide="play" class="w-3 h-3 fill-current"></i><span>RUN</span>`;
      lucide.createIcons();
    }
  }
}

function renderSsrvolTable() {
  const tbody = el.ssrvolTbody;
  if (!tbody) return;

  const lookback = parseInt(el.inputSsrvolLookback?.value || state.ssrvolLookback || '20', 10);
  if (el.ssrvolDynamicAvgvolCol) {
    el.ssrvolDynamicAvgvolCol.textContent = `Avg Vol (${lookback}D)`;
  }

  const matches = [...(state.ssrvolResults || [])].filter(stock => {
    if (state.ssrvolFilterSsOnly && !stock.isStrongStart) {
      return false;
    }
    if (state.ssrvolFilterMc2000 && stock.mcOver2000Cr !== true) {
      return false;
    }
    if (state.ssrvolFilterMc1000 && stock.mcOver1000Cr !== true && stock.mcOver2000Cr !== true) {
      return false;
    }
    return true;
  });

  if (el.ssrvolResultsCountBadge) el.ssrvolResultsCountBadge.textContent = matches.length;

  const sortField = state.ssrvolSortField || 'rvol';
  const isAsc = state.ssrvolSortAscending;

  document.querySelectorAll('th[data-ssort]').forEach(th => {
    const isThisCol = th.dataset.ssort === sortField;
    const icon = th.querySelector('svg, i');
    if (isThisCol) {
      th.classList.add('text-slate-100');
      if (icon) {
        icon.setAttribute('data-lucide', isAsc ? 'arrow-up' : 'arrow-down');
      }
    } else {
      th.classList.remove('text-slate-100');
      if (icon) {
        icon.setAttribute('data-lucide', 'arrow-up-down');
      }
    }
  });

  if (matches.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="6" class="p-8 text-center text-slate-500">
          <div class="flex flex-col items-center justify-center gap-2">
            <i data-lucide="inbox" class="w-8 h-8 text-slate-600"></i>
            <p class="text-xs text-slate-300">No stocks matched the SS_RVOL criteria.</p>
            <p class="text-[11px] text-slate-500">Try adjusting Market Cap / SS filters or scanning a broader scope (e.g. F&O or Universe).</p>
          </div>
        </td>
      </tr>
    `;
    lucide.createIcons();
    return;
  }

  // Sort matches
  matches.sort((a, b) => {
    let valA = a[sortField];
    let valB = b[sortField];
    if (sortField === 'close' || sortField === 'ltp') {
      valA = (typeof a.close === 'number' && a.close > 0) ? a.close : (a.ltp || 0);
      valB = (typeof b.close === 'number' && b.close > 0) ? b.close : (b.ltp || 0);
    }
    if (sortField === 'isStrongStart') {
      valA = a.isStrongStart ? 1 : 0;
      valB = b.isStrongStart ? 1 : 0;
    }
    if (typeof valA === 'string') {
      return isAsc ? valA.localeCompare(valB) : valB.localeCompare(valA);
    }
    return isAsc ? (valA - valB) : (valB - valA);
  });

  // Calculate 50% Top RVOL cutoff for PineScript gating highlight
  const rvolSorted = [...matches].map(m => m.rvol).sort((a, b) => b - a);
  const gateIdx = Math.floor(rvolSorted.length * 0.5);
  const rvolGateThreshold = rvolSorted[gateIdx] !== undefined ? rvolSorted[gateIdx] : 1.0;

  const showAsPercent = state.ssrvolFormat === 'percent';

  tbody.innerHTML = matches.map((m, idx) => {
    const ltpPrice = (typeof m.close === 'number' && m.close > 0) ? m.close : (m.ltp || 0);
    const chgVal = typeof m.changePercent === 'number' ? m.changePercent : 0;

    let changeBadge = 'bg-slate-500/10 text-slate-400 border border-slate-500/20';
    if (chgVal >= 1.5) {
      changeBadge = 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30';
    } else if (chgVal > 0) {
      changeBadge = 'bg-emerald-500/10 text-emerald-300/90 border border-emerald-500/20';
    } else if (chgVal <= -1.5) {
      changeBadge = 'bg-rose-500/15 text-rose-400 border border-rose-500/30';
    } else if (chgVal < 0) {
      changeBadge = 'bg-rose-500/10 text-rose-300/90 border border-rose-500/20';
    }

    let mcBadgeHtml = '';
    if (m.mcOver2000Cr === true) {
      mcBadgeHtml = `<span class="px-1 py-0.2 rounded text-[9px] font-mono font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30" title="Market Cap > ₹2000 Cr">2k</span>`;
    } else if (m.mcOver1000Cr === true) {
      mcBadgeHtml = `<span class="px-1 py-0.2 rounded text-[9px] font-mono font-medium bg-slate-700/50 text-slate-300 border border-slate-600/40" title="Market Cap > ₹1000 Cr">1k</span>`;
    }

    // Strong Start Badge
    const ssBadge = m.isStrongStart
      ? `<span class="px-2 py-0.5 rounded-md font-bold font-mono text-[11px] bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-sm flex items-center justify-center gap-1">
          <i data-lucide="star" class="w-3 h-3 fill-amber-400 text-amber-400"></i>
          <span>SS</span>
        </span>`
      : `<span class="text-slate-600 font-mono text-xs">—</span>`;

    // RVOL display value & badge
    const rvolFormatted = showAsPercent ? `${m.rvolPercent}%` : `${m.rvolRatio.toFixed(2)}x`;
    const isHighRvol = m.rvol >= 1.20;
    const rvolBadge = isHighRvol
      ? `<span class="px-1.5 py-0.5 rounded font-mono font-bold text-xs bg-amber-500/15 text-amber-300 border border-amber-500/30" title="RVOL ≥ 1.20x (${m.rvolPercent}%)">${rvolFormatted}</span>`
      : `<span class="font-mono text-xs text-slate-300">${rvolFormatted}</span>`;

    // Row illumination for top 50% RVOL
    const isTopRvolGated = m.rvol >= rvolGateThreshold && m.rvol >= 1.0;
    const rowTint = isTopRvolGated ? 'bg-amber-500/[0.03]' : '';

    return `
      <tr class="ssrvol-stock-row hover:bg-dark-accent/70 transition-colors cursor-pointer group ${rowTint}" data-symbol="${m.symbol}">
        <td class="py-2.5 px-3">
          <div class="flex flex-col">
            <div class="flex items-center gap-1.5">
              <span class="font-mono font-bold text-slate-100 group-hover:text-amber-300 text-xs">${m.symbol}</span>
              ${typeof getStockInfoButtonHtml === 'function' ? getStockInfoButtonHtml(m.symbol, m.name) : ''}
              ${m.exchange && m.exchange !== 'NSE' ? `<span class="text-[9px] px-1 py-0.2 rounded bg-dark-bg text-slate-400 font-mono">${m.exchange}</span>` : ''}
              ${getFnoBadgeHtml(m.symbol)}
              ${getCircuitBadgeHtml(m)}
              ${mcBadgeHtml}
            </div>
            <span class="text-[10px] text-slate-400 truncate max-w-[130px]">${m.name || m.symbol}</span>
          </div>
        </td>
        <td class="py-2.5 px-2 text-right font-mono font-bold text-slate-100 text-xs">
          ${fmt.currency(ltpPrice)}
        </td>
        <td class="py-2.5 px-2 text-right">
          <span class="px-1.5 py-0.5 rounded text-[10px] font-mono font-semibold ${changeBadge}">
            ${fmt.percent(chgVal)}
          </span>
        </td>
        <td class="py-2.5 px-2 text-right">
          ${rvolBadge}
        </td>
        <td class="py-2.5 px-2 text-right font-mono text-slate-400 text-[11px]">
          ${fmt.volume(m.avgVolume)}
        </td>
        <td class="py-2.5 px-2 text-center">
          <div class="flex items-center justify-center">
            ${ssBadge}
          </div>
        </td>
      </tr>
    `;
  }).join('');

  lucide.createIcons();

  tbody.querySelectorAll('.ssrvol-stock-row').forEach(row => {
    row.addEventListener('click', () => {
      const sym = row.dataset.symbol;
      if (sym) {
        tbody.querySelectorAll('.ssrvol-stock-row').forEach(r => r.classList.remove('selected', 'bg-amber-500/20'));
        row.classList.add('selected', 'bg-amber-500/20');
        selectStock({ symbol: sym, name: sym });
      }
    });
  });
}

function handleCopySsrvolStocks() {
  const matches = (state.ssrvolResults || []).filter(stock => {
    if (state.ssrvolFilterSsOnly && !stock.isStrongStart) return false;
    if (state.ssrvolFilterMc2000 && stock.mcOver2000Cr !== true) return false;
    if (state.ssrvolFilterMc1000 && stock.mcOver1000Cr !== true && stock.mcOver2000Cr !== true) return false;
    return true;
  });

  if (matches.length === 0) {
    showToast('No SS_RVOL stocks to copy.', 'info');
    return;
  }

  const symbols = matches.map(s => s.symbol).join(', ');
  navigator.clipboard.writeText(symbols).then(() => {
    showToast(`Copied ${matches.length} SS_RVOL stock symbols to clipboard.`, 'success');
  }).catch(() => {
    showToast('Failed to copy to clipboard.', 'error');
  });
}

// -------------------------------------------------------------
// VCP Scanner Controller (Minervini Volatility Contraction Pattern)
// -------------------------------------------------------------

function populateVcpscanScopeOptions() {
  if (!el.selectVcpscanScope) return;
  const currentVal = el.selectVcpscanScope.value || 'current';

  let html = `<optgroup label="Active Workspace">`;
  const screenerStockCount = (state.currentStocks || []).length;
  html += `<option value="current">⚡ Current Screener (${screenerStockCount} stocks)</option>`;

  if (Array.isArray(state.watchlists) && state.watchlists.length > 0) {
    state.watchlists.forEach(w => {
      html += `<option value="${w.id}">⭐ Watchlist: ${w.name} (${(w.stocks || []).length} stocks)</option>`;
    });
  }

  html += `
    </optgroup>
    <optgroup label="Market Indices & Universes">
      <option value="fno">🎯 F&O Stocks (~200)</option>
      <option value="large">🏢 Large Cap (Top 100)</option>
      <option value="mid">📈 Mid Cap (150)</option>
      <option value="small">🚀 Small Cap (250)</option>
      <option value="micro">🔬 Micro Cap</option>
      <option value="midsmall400">🌐 MidSmall400 (400)</option>
      <option value="universe">🌍 Full Universe (1.1k)</option>
    </optgroup>
  `;

  el.selectVcpscanScope.innerHTML = html;

  const exists = Array.from(el.selectVcpscanScope.options).some(o => o.value === currentVal);
  if (exists) {
    el.selectVcpscanScope.value = currentVal;
  }
}

async function runVcpScan() {
  const stage = el.selectVcpscanStage?.value || 'all';
  const interval = el.selectVcpscanTimeframe?.value || '1d';
  const tfLabel = interval === '1wk' ? 'Weekly' : 'Daily';
  const scope = el.selectVcpscanScope?.value || 'current';
  const btn = el.btnRunVcpscan;
  const tbody = el.vcpscanTbody;
  const countBadge = el.vcpscanResultsCountBadge;

  let stockList = [];
  let scanScopeLabel = '';

  if (scope === 'current') {
    stockList = (state.currentStocks || []).map(s => s.symbol).filter(Boolean);
    scanScopeLabel = `${stockList.length} Screener Stocks`;
    if (stockList.length === 0) {
      showToast('No stocks loaded in current screener. Switch scope or run a screener first.', 'warning');
      return;
    }
  } else if (scope.startsWith('wl_') || scope === 'watchlist') {
    const targetWl = (state.watchlists || []).find(w => w.id === scope) || getActiveWatchlist();
    if (targetWl) {
      stockList = (targetWl.stocks || []).map(s => s.symbol).filter(Boolean);
      scanScopeLabel = `Watchlist "${targetWl.name}" (${stockList.length} stocks)`;
    } else {
      scanScopeLabel = 'Watchlist Stocks';
    }
    if (stockList.length === 0) {
      showToast('Selected watchlist is empty. Add stocks to this watchlist first.', 'warning');
      return;
    }
  } else if (scope === 'universe') {
    scanScopeLabel = 'Universe Stocks';
  } else {
    scanScopeLabel = `${scope.toUpperCase()} Stocks`;
  }

  if (btn) {
    btn.disabled = true;
    btn.classList.add('opacity-70', 'cursor-not-allowed');
    btn.innerHTML = `<i data-lucide="loader-2" class="w-3.5 h-3.5 animate-spin"></i><span>Scanning...</span>`;
    lucide.createIcons();
  }

  if (tbody) {
    tbody.innerHTML = `
      <tr>
        <td colspan="8" class="p-8 text-center text-slate-400">
          <div class="flex flex-col items-center justify-center gap-3">
            <i data-lucide="loader-2" class="w-8 h-8 text-purple-400 animate-spin"></i>
            <p class="text-xs font-semibold text-slate-200">Scanning ${scanScopeLabel} for VCP Patterns (${tfLabel})...</p>
            <p class="text-[11px] text-slate-500">Checking Stage 2 trend, progressive contractions (T1→T2→T3), tightness & volume dry-up</p>
          </div>
        </td>
      </tr>
    `;
    lucide.createIcons();
  }

  try {
    const res = await fetch('/api/scan/vcp', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeaders()
      },
      body: JSON.stringify({
        stage,
        interval,
        scope,
        stockList
      })
    });

    if (res.status === 401) {
      state.vcpscanResults = [];
      showToast('Please log in or register to run VCP Scanner.', 'warning');
      openAuthModal('login');
      return;
    }

    const data = await res.json();

    if (!data.success) {
      throw new Error(data.error || 'VCP Scan failed');
    }

    const matches = data.results || [];
    state.vcpscanResults = matches;

    if (countBadge) countBadge.textContent = matches.length;

    renderVcpscanTable();
    showToast(`VCP Scan complete: Found ${matches.length} matching stocks (${tfLabel}).`, 'success');
  } catch (err) {
    console.error('VCP scan error:', err);
    state.vcpscanResults = [];
    if (tbody) {
      tbody.innerHTML = `
        <tr>
          <td colspan="8" class="p-6 text-center text-rose-400">
            <p class="text-xs font-semibold">Error running VCP scan: ${err.message}</p>
          </td>
        </tr>
      `;
    }
    showToast(`VCP Scan error: ${err.message}`, 'error');
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.classList.remove('opacity-70', 'cursor-not-allowed');
      btn.innerHTML = `<i data-lucide="play" class="w-3.5 h-3.5 fill-current"></i><span>RUN</span>`;
      lucide.createIcons();
    }
  }
}

function renderVcpscanTable() {
  const tbody = el.vcpscanTbody;
  if (!tbody) return;

  const matches = [...(state.vcpscanResults || [])].filter(stock => {
    if (state.vcpscanFilterMc2000 && stock.mcOver2000Cr !== true) {
      return false;
    }
    if (state.vcpscanFilterMc1000 && stock.mcOver1000Cr !== true && stock.mcOver2000Cr !== true) {
      return false;
    }
    return true;
  });

  if (el.vcpscanResultsCountBadge) el.vcpscanResultsCountBadge.textContent = matches.length;

  const sortField = state.vcpscanSortField || 'tightnessPercent';
  const isAsc = state.vcpscanSortAscending;

  document.querySelectorAll('th[data-vsort]').forEach(th => {
    const isThisCol = th.dataset.vsort === sortField;
    const icon = th.querySelector('svg, i');
    if (isThisCol) {
      th.classList.add('text-slate-100');
      if (icon) {
        icon.setAttribute('data-lucide', isAsc ? 'arrow-up' : 'arrow-down');
      }
    } else {
      th.classList.remove('text-slate-100');
      if (icon) {
        icon.setAttribute('data-lucide', 'arrow-up-down');
      }
    }
  });

  if (matches.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="8" class="p-8 text-center text-slate-500">
          <div class="flex flex-col items-center justify-center gap-2">
            <i data-lucide="inbox" class="w-8 h-8 text-slate-600"></i>
            <p class="text-xs text-slate-300">No stocks matched the VCP criteria.</p>
            <p class="text-[11px] text-slate-500">Try adjusting Market Cap filters, selecting "All Stages", or scanning a broader scope (e.g. MidCap or Universe).</p>
          </div>
        </td>
      </tr>
    `;
    lucide.createIcons();
    return;
  }

  // Sort matches
  matches.sort((a, b) => {
    let valA = a[sortField];
    let valB = b[sortField];
    if (sortField === 'close' || sortField === 'ltp') {
      valA = (typeof a.close === 'number' && a.close > 0) ? a.close : (a.ltp || 0);
      valB = (typeof b.close === 'number' && b.close > 0) ? b.close : (b.ltp || 0);
    }
    if (typeof valA === 'string') {
      return isAsc ? valA.localeCompare(valB) : valB.localeCompare(valA);
    }
    valA = (valA !== undefined && valA !== null && !isNaN(valA)) ? Number(valA) : 0;
    valB = (valB !== undefined && valB !== null && !isNaN(valB)) ? Number(valB) : 0;
    return isAsc ? valA - valB : valB - valA;
  });

  tbody.innerHTML = matches.map(m => {
    const isSelected = state.selectedStock && state.selectedStock.symbol === m.symbol;
    const rawChg = typeof m.changePercent === 'number' ? m.changePercent : parseFloat(m.changePercent);
    const chgVal = isNaN(rawChg) ? 0 : Number(rawChg.toFixed(2));
    const isBull = chgVal >= 0;
    const changeBadge = isBull 
      ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
      : 'bg-rose-500/10 text-rose-400 border border-rose-500/20';
    const ltpPrice = (typeof m.close === 'number' && m.close > 0) ? m.close : (m.ltp || 0);

    let stageBadge = '';
    if (m.stageCode === 'breakout') {
      stageBadge = `<span class="px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[9px] font-bold">🚀 BREAKOUT</span>`;
    } else if (m.stageCode === 'squeeze') {
      stageBadge = `<span class="px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[9px] font-bold">🎯 SQUEEZE</span>`;
    } else {
      stageBadge = `<span class="px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-300 border border-blue-500/30 text-[9px] font-bold">📈 FORMING</span>`;
    }

    let mcBadgeHtml = '';
    if (m.mcOver2000Cr) {
      mcBadgeHtml = `<span class="px-1 py-0.2 rounded bg-indigo-500/15 text-indigo-300 border border-indigo-500/30 text-[9px] font-mono font-medium" title="Market Cap > ₹2000 Cr">&gt;2k</span>`;
    } else if (m.mcOver1000Cr) {
      mcBadgeHtml = `<span class="px-1 py-0.2 rounded bg-cyan-500/15 text-cyan-300 border border-cyan-500/30 text-[9px] font-mono font-medium" title="Market Cap > ₹1000 Cr">&gt;1k</span>`;
    }

    const tightClass = m.tightnessPercent <= 3.5 ? 'text-emerald-400 font-bold' : (m.tightnessPercent <= 4.5 ? 'text-amber-300' : 'text-slate-300');
    const dryVolClass = m.dryVolRatio <= 0.60 ? 'text-emerald-400 font-bold' : (m.dryVolRatio <= 0.80 ? 'text-amber-300' : 'text-slate-300');

    return `
      <tr class="vcpscan-stock-row hover:bg-purple-500/10 cursor-pointer transition-colors group select-none ${isSelected ? 'selected bg-purple-600/20' : ''}" data-symbol="${m.symbol}">
        <td class="py-2.5 px-3">
          <div class="flex flex-col">
            <div class="flex items-center gap-1.5">
              <span class="font-mono font-bold text-slate-100 group-hover:text-purple-300 text-xs">${m.symbol}</span>
              ${typeof getStockInfoButtonHtml === 'function' ? getStockInfoButtonHtml(m.symbol, m.name) : ''}
              ${m.exchange && m.exchange !== 'NSE' ? `<span class="text-[9px] px-1 py-0.2 rounded bg-dark-bg text-slate-400 font-mono">${m.exchange}</span>` : ''}
              ${getFnoBadgeHtml(m.symbol)}
              ${getCircuitBadgeHtml(m)}
              ${mcBadgeHtml}
            </div>
            <span class="text-[10px] text-slate-400 truncate max-w-[130px]">${m.name || m.symbol}</span>
          </div>
        </td>
        <td class="py-2.5 px-2 text-right font-mono font-bold text-slate-100 text-xs">
          ${fmt.currency(ltpPrice)}
        </td>
        <td class="py-2.5 px-2 text-right">
          <span class="px-1.5 py-0.5 rounded text-[10px] font-mono font-semibold ${changeBadge}">
            ${fmt.percent(chgVal)}
          </span>
        </td>
        <td class="py-2.5 px-2 text-center">
          <div class="flex flex-col items-center gap-0.5">
            <span class="px-1.5 py-0.2 rounded bg-purple-500/20 text-purple-300 font-mono font-bold text-[10px]">${m.contractionsCount}</span>
            ${stageBadge}
          </div>
        </td>
        <td class="py-2.5 px-2 text-center font-mono text-[10px] text-slate-300">
          <span class="px-1.5 py-0.5 rounded bg-dark-bg border border-dark-border" title="Contraction Waves">${m.depths}</span>
        </td>
        <td class="py-2.5 px-2 text-right font-mono text-xs ${tightClass}">
          ${m.tightnessPercent}%
        </td>
        <td class="py-2.5 px-2 text-right font-mono text-xs ${dryVolClass}">
          ${m.dryVolRatio}x
        </td>
        <td class="py-2.5 px-2 text-right font-mono text-xs font-bold text-purple-300">
          ${fmt.currency(m.pivotPrice)}
        </td>
      </tr>
    `;
  }).join('');

  lucide.createIcons();

  tbody.querySelectorAll('.vcpscan-stock-row').forEach(row => {
    row.addEventListener('click', () => {
      const sym = row.dataset.symbol;
      if (sym) {
        tbody.querySelectorAll('.vcpscan-stock-row').forEach(r => r.classList.remove('selected', 'bg-purple-600/20'));
        row.classList.add('selected', 'bg-purple-600/20');

        const scanTf = el.selectVcpscanTimeframe?.value || '1d';
        state.selectedInterval = scanTf;
        document.querySelectorAll('.timeframe-btn').forEach(btn => {
          if (btn.dataset.interval === scanTf) {
            btn.classList.add('active', 'bg-blue-600', 'text-white', 'font-semibold', 'shadow');
            btn.classList.remove('hover:text-white');
          } else {
            btn.classList.remove('active', 'bg-blue-600', 'text-white', 'font-semibold', 'shadow');
          }
        });

        selectStock({ symbol: sym, name: sym });
      }
    });
  });
}

function handleCopyVcpscanStocks() {
  const matches = (state.vcpscanResults || []).filter(stock => {
    if (state.vcpscanFilterMc2000 && stock.mcOver2000Cr !== true) return false;
    if (state.vcpscanFilterMc1000 && stock.mcOver1000Cr !== true && stock.mcOver2000Cr !== true) return false;
    return true;
  });

  if (matches.length === 0) {
    showToast('No VCP stocks to copy.', 'info');
    return;
  }

  const symbols = matches.map(s => s.symbol).join(', ');
  navigator.clipboard.writeText(symbols).then(() => {
    showToast(`Copied ${matches.length} VCP stock symbols to clipboard.`, 'success');
  }).catch(() => {
    showToast('Failed to copy to clipboard.', 'error');
  });
}

// -------------------------------------------------------------
// Screener Command Deck (Collapsible Pull-Down Deck)
// -------------------------------------------------------------
function toggleScreenerDeck(forceState) {
  const deck = document.getElementById('screener-command-deck');
  const body = document.getElementById('deck-collapsible-body');
  const icon = document.getElementById('deck-toggle-icon');
  const label = document.getElementById('deck-toggle-label');
  const activeBadge = document.getElementById('deck-collapsed-active-badge');
  if (!deck || !body) return;

  const isCurrentlyCollapsed = deck.classList.contains('deck-collapsed');
  const shouldCollapse = (forceState !== undefined) ? forceState : !isCurrentlyCollapsed;

  if (shouldCollapse) {
    deck.classList.add('deck-collapsed');
    body.style.maxHeight = '0px';
    body.style.paddingTop = '0px';
    body.style.paddingBottom = '0px';
    body.style.opacity = '0';
    body.style.pointerEvents = 'none';

    if (icon) {
      icon.setAttribute('data-lucide', 'chevron-down');
    }
    if (label) {
      label.textContent = 'Expand';
    }

    if (activeBadge) {
      const activeScreener = state.screeners.find(s => s.id === state.activeScreenerId);
      if (activeScreener) {
        activeBadge.textContent = activeScreener.name;
        activeBadge.classList.remove('hidden');
      } else {
        activeBadge.classList.add('hidden');
      }
    }

    localStorage.setItem('sangam_screener_deck_collapsed', 'true');
  } else {
    deck.classList.remove('deck-collapsed');
    body.style.maxHeight = '1200px';
    body.style.paddingTop = '';
    body.style.paddingBottom = '';
    body.style.opacity = '1';
    body.style.pointerEvents = '';

    if (icon) {
      icon.setAttribute('data-lucide', 'chevron-up');
    }
    if (label) {
      label.textContent = 'Collapse';
    }
    if (activeBadge) {
      activeBadge.classList.add('hidden');
    }

    localStorage.setItem('sangam_screener_deck_collapsed', 'false');
  }

  if (typeof lucide !== 'undefined') {
    try { lucide.createIcons(); } catch (e) {}
  }

  // Trigger smooth resize for TradingView charts
  setTimeout(() => {
    handleResize();
  }, 320);
}

function initScreenerDeckState() {
  const isCollapsed = localStorage.getItem('sangam_screener_deck_collapsed') === 'true';
  if (isCollapsed) {
    toggleScreenerDeck(true);
  }
}

// -------------------------------------------------------------
// Screener Management & Table Logic (Admin Controlled)
// -------------------------------------------------------------

async function loadScreeners() {
  try {
    const res = await fetch('/api/screeners', {
      headers: getAuthHeaders()
    });
    const data = await res.json();
    if (data.success && Array.isArray(data.screeners)) {
      state.screeners = data.screeners;
      if (el.statTotalScreeners) el.statTotalScreeners.textContent = state.screeners.length;
      renderScreeners();
    }
  } catch (err) {
    showToast('Failed to load screeners: ' + err.message, 'error');
  }
}

function displayScreener(screener) {
  if (!screener) return;
  state.activeScreenerId = screener.id;
  state.isAggregatedMode = false;
  if (el.activeScreenerBadge) el.activeScreenerBadge.textContent = screener.category || 'Screener';
  if (el.activeScreenerTitle) el.activeScreenerTitle.textContent = screener.name;
  if (el.activeScreenerDesc) el.activeScreenerDesc.textContent = screener.description || screener.url;
  if (el.lastUpdatedTime) el.lastUpdatedTime.textContent = screener.lastRun ? `Updated: ${fmt.time(screener.lastRun)}` : '';

  const collapsedActiveBadge = document.getElementById('deck-collapsed-active-badge');
  if (collapsedActiveBadge) {
    collapsedActiveBadge.textContent = screener.name;
  }

  if (Array.isArray(screener.lastResults) && screener.lastResults.length > 0) {
    state.currentStocks = screener.lastResults;
    if (el.statTotalStocks) el.statTotalStocks.textContent = screener.stockCount || screener.lastResults.length;
    renderStocksTable();
  }
  renderScreeners();
}

function renderScreeners() {
  el.screenersContainer.innerHTML = '';

  const filtered = state.screeners.filter(s => {
    if (state.activeCategoryFilter === 'all') return true;
    if (state.activeCategoryFilter.toLowerCase() === 'custom') {
      return Boolean(s.isCustom) || (s.category && s.category.toLowerCase() === 'custom');
    }
    return s.category && s.category.toLowerCase() === state.activeCategoryFilter.toLowerCase();
  });

  if (filtered.length === 0) {
    el.screenersContainer.innerHTML = `
      <div class="col-span-full py-4 text-center text-slate-500 text-xs">
        No screeners found in "${state.activeCategoryFilter}" category.
      </div>
    `;
    return;
  }

  filtered.forEach(screener => {
    const isRunning = state.runningScreeners.has(screener.id);
    const isActive = state.activeScreenerId === screener.id && !state.isAggregatedMode;
    const count = screener.stockCount || 0;
    const isCustom = Boolean(screener.isCustom);
    const canEditOrDelete = Boolean(state.isAdmin || (state.user && isCustom));

    const catLower = (screener.category || '').toLowerCase();
    let badgeClass = 'text-slate-400 border-slate-700 bg-slate-800/40';
    if (isCustom || catLower === 'custom') badgeClass = 'text-purple-300 border-purple-500/30 bg-purple-500/15';
    else if (catLower.includes('intraday')) badgeClass = 'text-amber-300 border-amber-500/30 bg-amber-500/15';
    else if (catLower.includes('breakout')) badgeClass = 'text-emerald-300 border-emerald-500/30 bg-emerald-500/15';
    else if (catLower.includes('swing')) badgeClass = 'text-sky-300 border-sky-500/30 bg-sky-500/15';
    else if (catLower.includes('momentum')) badgeClass = 'text-indigo-300 border-indigo-500/30 bg-indigo-500/15';
    else if (catLower.includes('reversal')) badgeClass = 'text-rose-300 border-rose-500/30 bg-rose-500/15';

    const card = document.createElement('div');
    card.className = `screener-box group ${isActive ? 'active' : ''} ${isRunning ? 'running' : ''}`;
    card.dataset.id = screener.id;
    card.title = `${screener.name} (${screener.category || 'General'})\n${screener.description || screener.url}\nLast run: ${screener.lastRun ? fmt.time(screener.lastRun) : 'Not run'}`;

    // Screener action buttons (visible on hover for admin on all, or user on custom screeners)
    const actionsHtml = canEditOrDelete ? `
      <div class="hidden group-hover:flex items-center gap-0.5 shrink-0">
        <button class="btn-edit-scr sb-action-btn p-0.5 rounded transition-colors" title="Edit Screener" data-id="${screener.id}">
          <i data-lucide="edit-2" class="w-2.5 h-2.5"></i>
        </button>
        <button class="btn-del-scr sb-action-btn p-0.5 rounded transition-colors" title="Delete Screener" data-id="${screener.id}">
          <i data-lucide="trash-2" class="w-2.5 h-2.5"></i>
        </button>
      </div>
    ` : '';

    card.innerHTML = `
      <div style="display: flex; justify-content: space-between; align-items: center; gap: 4px;">
        <span class="sc-name" title="${screener.name}">${screener.name}</span>
        ${isRunning ? `
          <span class="w-2 h-2 rounded-full bg-amber-400 animate-pulse shrink-0" title="Scanning in progress..."></span>
        ` : actionsHtml}
      </div>
      <div class="sc-meta">
        <span>${screener.category || 'General'}${isCustom ? ' (C)' : ''}</span>
        <strong style="color: var(--pos-text);">${count > 0 ? count : '--'}</strong>
      </div>
    `;

    card.addEventListener('click', e => {
      if (e.target.closest('.btn-edit-scr') || e.target.closest('.btn-del-scr')) return;
      runScreener(screener.id);
    });

    if (canEditOrDelete) {
      const editBtn = card.querySelector('.btn-edit-scr');
      if (editBtn) {
        editBtn.addEventListener('click', e => {
          e.stopPropagation();
          openEditModal(screener.id);
        });
      }

      const delBtn = card.querySelector('.btn-del-scr');
      if (delBtn) {
        delBtn.addEventListener('click', e => {
          e.stopPropagation();
          deleteScreener(screener.id);
        });
      }
    }

    el.screenersContainer.appendChild(card);
  });
  lucide.createIcons();
}

async function runScreener(id) {
  const screener = state.screeners.find(s => s.id === id);
  if (!screener) return;

  state.activeScreenerId = id;
  state.isAggregatedMode = false;
  state.runningScreeners.add(id);
  renderScreeners();

  if (el.activeScreenerBadge) el.activeScreenerBadge.textContent = screener.category || 'Screener';
  if (el.activeScreenerTitle) el.activeScreenerTitle.textContent = screener.name;
  if (el.activeScreenerDesc) el.activeScreenerDesc.textContent = screener.description || screener.url;
  if (el.lastUpdatedTime) el.lastUpdatedTime.textContent = 'Executing...';

  try {
    const res = await fetch(`/api/screeners/${id}/run`, {
      method: 'POST',
      headers: getAuthHeaders()
    });
    const data = await res.json();

    if (!res.ok || !data.success) {
      throw new Error(data.error || 'Execution failed');
    }

    screener.lastRun = data.timestamp;
    screener.stockCount = data.count;
    screener.lastResults = data.stocks;
    state.currentStocks = data.stocks || [];

    if (el.lastUpdatedTime) el.lastUpdatedTime.textContent = `Updated: ${fmt.time(data.timestamp)}`;
    if (el.statTotalStocks) el.statTotalStocks.textContent = data.count;

    const collapsedActiveBadge = document.getElementById('deck-collapsed-active-badge');
    if (collapsedActiveBadge) {
      collapsedActiveBadge.textContent = screener.name;
    }
    
    showToast(`Found ${data.count} stocks for "${screener.name}"`, 'success');

    renderStocksTable();

    if (state.currentStocks.length > 0) {
      selectStock(state.currentStocks[0]);
    }

    // Trigger instant live prices sync for screened results
    syncScreenedStocksLivePrices();
  } catch (err) {
    showToast(`Error running screener: ${err.message}`, 'error');
    el.lastUpdatedTime.textContent = 'Execution failed';
  } finally {
    state.runningScreeners.delete(id);
    renderScreeners();
  }
}

async function runAllScreeners() {
  if (state.isRunAllInProgress) return;
  state.isRunAllInProgress = true;
  state.isAggregatedMode = true;

  state.screeners.forEach(s => state.runningScreeners.add(s.id));
  renderScreeners();

  el.btnRunAll.disabled = true;
  el.btnRunAll.innerHTML = `
    <svg class="animate-spin h-3.5 w-3.5 text-white" fill="none" viewBox="0 0 24 24">
      <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
      <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
    </svg>
    <span>Scanning All Screeners...</span>
  `;

  if (el.activeScreenerBadge) el.activeScreenerBadge.textContent = 'All Screeners Confluence';
  if (el.activeScreenerTitle) el.activeScreenerTitle.textContent = `Aggregated Multi-Screener Scan (${state.screeners.length} Screeners)`;
  if (el.activeScreenerDesc) el.activeScreenerDesc.textContent = 'Aggregated results across all screeners. Stocks matching multiple screeners are highlighted at the top!';
  if (el.lastUpdatedTime) el.lastUpdatedTime.textContent = 'Scanning in progress...';

  try {
    const res = await fetch('/api/screeners/run-all', {
      method: 'POST',
      headers: getAuthHeaders()
    });
    const data = await res.json();

    if (!res.ok || !data.success) {
      throw new Error(data.error || 'Failed to run all screeners');
    }

    await loadScreeners();

    state.currentStocks = data.aggregatedStocks || [];
    if (el.statTotalStocks) el.statTotalStocks.textContent = data.uniqueStocksCount;
    if (el.lastUpdatedTime) el.lastUpdatedTime.textContent = `Updated: ${fmt.time(new Date().toISOString())}`;

    showToast(`Scan complete! ${data.uniqueStocksCount} unique stocks found across ${data.totalScreeners} screeners`, 'success');

    renderStocksTable();

    if (state.currentStocks.length > 0) {
      selectStock(state.currentStocks[0]);
    }

    // Trigger instant live prices sync for aggregated results
    syncScreenedStocksLivePrices();
  } catch (err) {
    showToast(`Run All failed: ${err.message}`, 'error');
  } finally {
    state.isRunAllInProgress = false;
    state.runningScreeners.clear();
    el.btnRunAll.disabled = false;
    el.btnRunAll.innerHTML = `
      <i data-lucide="play-circle" class="w-4 h-4"></i>
      <span>Run All Screeners</span>
    `;
    lucide.createIcons();
    renderScreeners();
  }
}

function renderStocksTable() {
  el.stocksTbody.innerHTML = '';

  let list = state.currentStocks.filter(stock => {
    // 1. Market Cap filters
    if (state.filterMc2000 && stock.mcOver2000Cr !== true) {
      return false;
    }
    if (state.filterMc1000 && stock.mcOver1000Cr !== true && stock.mcOver2000Cr !== true) {
      return false;
    }

    // 2. Search query filter
    if (state.searchQuery) {
      const q = state.searchQuery;
      const sym = (stock.symbol || '').toLowerCase();
      const name = (stock.name || '').toLowerCase();
      const sector = (stock.sector || '').toLowerCase();
      if (!sym.includes(q) && !name.includes(q) && !sector.includes(q)) return false;
    }

    // 3. Recommended Filter Quick Pills (EMAs Aligned)
    if (state.recFilter && state.recFilter !== 'all') {
      const close = (typeof stock.close === 'number' && stock.close > 0) ? stock.close : ((typeof stock.price === 'number' && stock.price > 0) ? stock.price : 0);
      const chg = typeof stock.changePercent === 'number' ? stock.changePercent : parseFloat(stock.changePercent || 0);
      const isBullStock = chg >= 0;

      // Real EMA values calculation for filter (Strictly real math, no synthetic multipliers)
      const e10 = (typeof stock.ema10 === 'number') ? stock.ema10 : (stock.emas && typeof stock.emas[10] === 'number' ? stock.emas[10] : null);
      const e20 = (typeof stock.ema20 === 'number') ? stock.ema20 : (stock.emas && typeof stock.emas[20] === 'number' ? stock.emas[20] : null);
      const e50 = (typeof stock.ema50 === 'number') ? stock.ema50 : (stock.emas && typeof stock.emas[50] === 'number' ? stock.emas[50] : null);
      const e150 = (typeof stock.ema150 === 'number') ? stock.ema150 : (stock.emas && typeof stock.emas[150] === 'number' ? stock.emas[150] : null);

      if (state.recFilter === 'emas-aligned') {
        const hasAllEmas = (e10 != null && e20 != null && e50 != null && e150 != null);
        const hasAnyEma = (e10 != null || e20 != null || e50 != null || e150 != null);

        // Stocks with no candle/EMA data at all or zero price are excluded from EMAs Aligned
        if (!hasAnyEma || close <= 0) return false;

        if (hasAllEmas) {
          // If all 4 EMAs are available, apply strict EMA aligned filter:
          // Price > 10 EMA AND 10 EMA > 20 EMA AND 20 EMA > 50 EMA AND 50 EMA > 150 EMA
          const isFullyAligned = (close > e10) && (e10 > e20) && (e20 > e50) && (e50 > e150);
          if (!isFullyAligned) return false;
        } else if (e10 != null && e20 != null) {
          // If all 4 EMAs are not available (e.g. IPOs with <150 bars), ensure available EMAs are strictly aligned
          if (close <= e10 || e10 <= e20) return false;
          if (e50 != null && e20 <= e50) return false;
        } else {
          return false;
        }
      }
    }

    return true;
  });

  // Sort list
  list.sort((a, b) => {
    // When EMAs Aligned filter is active:
    // Place fully aligned stocks first, and stocks with incomplete EMAs (e.g. recent IPOs) at the last of the list
    if (state.recFilter === 'emas-aligned') {
      const aHasAll = ((typeof a.ema10 === 'number' || a.emas?.[10] != null) && (typeof a.ema20 === 'number' || a.emas?.[20] != null) && (typeof a.ema50 === 'number' || a.emas?.[50] != null) && (typeof a.ema150 === 'number' || a.emas?.[150] != null));
      const bHasAll = ((typeof b.ema10 === 'number' || b.emas?.[10] != null) && (typeof b.ema20 === 'number' || b.emas?.[20] != null) && (typeof b.ema50 === 'number' || b.emas?.[50] != null) && (typeof b.ema150 === 'number' || b.emas?.[150] != null));
      if (aHasAll && !bHasAll) return -1;
      if (!aHasAll && bHasAll) return 1;
    }
    let valA = a[state.sortField];
    let valB = b[state.sortField];

    if (state.sortField === 'high52wDist') {
      const closeA = a.close || a.price || 0;
      const raw52wA = Number(a.high52w || a.fiftyTwoWeekHigh || 0);
      const hA = Math.max(closeA, Number(a.dayHigh || 0), raw52wA);
      valA = hA > 0 ? Math.min(0, ((closeA - hA) / hA) * 100) : -999;

      const closeB = b.close || b.price || 0;
      const raw52wB = Number(b.high52w || b.fiftyTwoWeekHigh || 0);
      const hB = Math.max(closeB, Number(b.dayHigh || 0), raw52wB);
      valB = hB > 0 ? Math.min(0, ((closeB - hB) / hB) * 100) : -999;
    } else if (state.sortField === 'emaCross') {
      const crossA = a.emaCross?.daysAgo || 1;
      const bullA = a.emaCross?.isBullish !== false && (a.changePercent >= 0 || (a.ema10 || 0) >= (a.ema20 || 0));
      valA = bullA ? crossA : -crossA;

      const crossB = b.emaCross?.daysAgo || 1;
      const bullB = b.emaCross?.isBullish !== false && (b.changePercent >= 0 || (b.ema10 || 0) >= (b.ema20 || 0));
      valB = bullB ? crossB : -crossB;
    } else if (state.sortField === 'volume') {
      valA = a.volume || 0;
      valB = b.volume || 0;
    } else if (state.sortField === 'close') {
      valA = a.close || a.price || 0;
      valB = b.close || b.price || 0;
    } else if (state.sortField === 'changePercent') {
      valA = typeof a.changePercent === 'number' ? a.changePercent : parseFloat(a.changePercent || 0);
      valB = typeof b.changePercent === 'number' ? b.changePercent : parseFloat(b.changePercent || 0);
    } else if (state.sortField === 'rsi') {
      valA = typeof a.rsi === 'number' ? a.rsi : 0;
      valB = typeof b.rsi === 'number' ? b.rsi : 0;
    } else if (state.sortField === 'rvol') {
      valA = typeof a.rvol === 'number' ? a.rvol : 0;
      valB = typeof b.rvol === 'number' ? b.rvol : 0;
    }

    if (typeof valA === 'string') {
      return state.sortAscending ? valA.localeCompare(valB) : valB.localeCompare(valA);
    }

    valA = valA !== undefined && valA !== null ? valA : 0;
    valB = valB !== undefined && valB !== null ? valB : 0;
    return state.sortAscending ? valA - valB : valB - valA;
  });

  if (el.visibleStocksCount) el.visibleStocksCount.textContent = list.length;
  if (el.resultsFooterMeta) el.resultsFooterMeta.textContent = `${list.length} displayed`;

  if (list.length === 0) {
    el.stocksTbody.innerHTML = `
      <tr>
        <td colspan="5" class="py-16 text-center text-slate-500">
          <div class="flex flex-col items-center justify-center gap-2">
            <i data-lucide="search-x" class="w-6 h-6 text-slate-600"></i>
            <p class="text-sm font-medium text-slate-400">No matching stocks found</p>
            <p class="text-xs text-slate-500">Try adjusting your search filter or selecting a different filter pill.</p>
          </div>
        </td>
      </tr>
    `;
    lucide.createIcons();
    applyColumnVisibilityToTable();
    return;
  }

  list.forEach((stock, idx) => {
    const isSelected = state.selectedStock && state.selectedStock.symbol === stock.symbol;
    const rawChg = typeof stock.changePercent === 'number' ? stock.changePercent : parseFloat(stock.changePercent || 0);
    const chgVal = isNaN(rawChg) ? 0 : Number(rawChg.toFixed(2));
    const isBull = chgVal >= 0;
    const changeBadge = isBull 
      ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30' 
      : 'bg-rose-500/15 text-rose-400 border border-rose-500/30';
    const closePrice = (typeof stock.close === 'number' && stock.close > 0) ? stock.close : ((typeof stock.price === 'number' && stock.price > 0) ? stock.price : 0);

    // Confluence Badge
    let confluenceHtml = '';
    if (stock.matchCount && stock.matchCount > 1) {
      confluenceHtml = `
        <span class="inline-flex items-center gap-0.5 px-1 py-0.2 rounded bg-amber-500/15 text-amber-400 border border-amber-500/30 text-[8.5px] font-bold" title="${(stock.matchingScreeners || []).join(', ')}">
          <i data-lucide="zap" class="w-2.5 h-2.5"></i>
          ${stock.matchCount}x
        </span>
      `;
    }

    // 4-in-1 EMA Matrix [10 20 50 150] (Real values only)
    const e10 = (typeof stock.ema10 === 'number') ? stock.ema10 : (stock.emas && typeof stock.emas[10] === 'number' ? stock.emas[10] : null);
    const e20 = (typeof stock.ema20 === 'number') ? stock.ema20 : (stock.emas && typeof stock.emas[20] === 'number' ? stock.emas[20] : null);
    const e50 = (typeof stock.ema50 === 'number') ? stock.ema50 : (stock.emas && typeof stock.emas[50] === 'number' ? stock.emas[50] : null);
    const e150 = (typeof stock.ema150 === 'number') ? stock.ema150 : (stock.emas && typeof stock.emas[150] === 'number' ? stock.emas[150] : null);

    const hasE10 = e10 != null && e10 > 0;
    const hasE20 = e20 != null && e20 > 0;
    const hasE50 = e50 != null && e50 > 0;
    const hasE150 = e150 != null && e150 > 0;

    const above10 = hasE10 ? closePrice > e10 : false;
    const above20 = hasE20 ? closePrice > e20 : false;
    const above50 = hasE50 ? closePrice > e50 : false;
    const above150 = hasE150 ? closePrice > e150 : false;

    // Volume Today
    const todayVol = (typeof stock.volume === 'number' && stock.volume > 0) ? stock.volume : ((typeof stock.vol === 'number' && stock.vol > 0) ? stock.vol : 0);
    const volFormatted = fmt.volume(todayVol);

    const tr = document.createElement('tr');
    tr.className = `dense-row stock-row cursor-pointer select-none ${isSelected ? 'selected' : ''}`;
    tr.dataset.symbol = stock.symbol;

    tr.innerHTML = `
      <!-- 1. Stock Name & Sector -->
      <td class="col-symbol">
        <div class="flex flex-col justify-center leading-tight">
          <div class="flex items-center gap-1.5 flex-wrap">
            <span class="sym-bold" title="Ticker: ${stock.symbol}">${stock.symbol}</span>
            ${typeof getStockInfoButtonHtml === 'function' ? getStockInfoButtonHtml(stock.symbol, stock.name) : ''}
            ${getFnoBadgeHtml(stock.symbol)}
            ${getCircuitBadgeHtml(stock)}
            ${confluenceHtml}
          </div>
          <span class="sym-sub block line-clamp-1 max-w-[160px]" title="${stock.name ? stock.name + (stock.sector ? ' • ' + stock.sector : '') : (stock.sector || stock.symbol)}">
            ${stock.name && stock.name !== stock.symbol ? stock.name : (stock.sector || stock.symbol)}
          </span>
        </div>
      </td>

      <!-- 2. Close Price (₹) -->
      <td class="col-close num" title="Close Price: ${fmt.currency(closePrice)}">
        <strong>${fmt.currency(closePrice)}</strong>
      </td>

      <!-- 3. Change % -->
      <td class="col-chg num" title="1-Day Price Change: ${fmt.percent(chgVal)}">
        <span class="${isBull ? 'badge-gain' : 'badge-loss'}">
          ${chgVal > 0 ? '+' : ''}${chgVal.toFixed(2)}%
        </span>
      </td>

      <!-- 4. Volume Today -->
      <td class="col-vol num" title="Today's Traded Volume: ${todayVol.toLocaleString('en-IN')} shares">
        ${volFormatted}
      </td>

      <!-- 5. 4-in-1 EMA Matrix [10 20 50 150] -->
      <td class="col-emas" style="text-align: center;">
        <div class="matrix-box" title="Price vs EMAs [10 20 50 150] (P=Pass/Above, F=Fail/Below, -=Insufficient History)">
          <span class="m-dot ${hasE10 ? (above10 ? 'm-p' : 'm-f') : 'm-n'}" title="EMA 10: ${hasE10 ? (above10 ? 'Price Above (₹' + e10.toFixed(2) + ')' : 'Price Below (₹' + e10.toFixed(2) + ')') : 'N/A'}">${hasE10 ? (above10 ? 'P' : 'F') : '-'}</span>
          <span class="m-dot ${hasE20 ? (above20 ? 'm-p' : 'm-f') : 'm-n'}" title="EMA 20: ${hasE20 ? (above20 ? 'Price Above (₹' + e20.toFixed(2) + ')' : 'Price Below (₹' + e20.toFixed(2) + ')') : 'N/A'}">${hasE20 ? (above20 ? 'P' : 'F') : '-'}</span>
          <span class="m-dot ${hasE50 ? (above50 ? 'm-p' : 'm-f') : 'm-n'}" title="EMA 50: ${hasE50 ? (above50 ? 'Price Above (₹' + e50.toFixed(2) + ')' : 'Price Below (₹' + e50.toFixed(2) + ')') : 'N/A'}">${hasE50 ? (above50 ? 'P' : 'F') : '-'}</span>
          <span class="m-dot ${hasE150 ? (above150 ? 'm-p' : 'm-f') : 'm-n'}" title="EMA 150: ${hasE150 ? (above150 ? 'Price Above (₹' + e150.toFixed(2) + ')' : 'Price Below (₹' + e150.toFixed(2) + ')') : 'N/A'}">${hasE150 ? (above150 ? 'P' : 'F') : '-'}</span>
        </div>
      </td>

      <!-- 6. RSI(14) -->
      <td class="col-rsi num" title="RSI(14): ${typeof stock.rsi === 'number' ? stock.rsi.toFixed(1) : '--'}">
        ${typeof stock.rsi === 'number' 
          ? `<span class="rsi-chip" style="background: ${stock.rsi >= 70 ? (state.theme === 'warm' ? '#F4EDE4' : '#F3E8FF') : stock.rsi >= 60 ? 'var(--pos-bg)' : stock.rsi <= 40 ? 'var(--neg-bg)' : 'var(--neutral-bg)'}; color: ${stock.rsi >= 70 ? (state.theme === 'warm' ? '#7D4E8D' : '#6B21A8') : stock.rsi >= 60 ? 'var(--pos-text)' : stock.rsi <= 40 ? 'var(--neg-text)' : 'var(--neutral-text)'};">${stock.rsi.toFixed(1)}</span>`
          : `<span class="font-mono text-[10px]" style="color: var(--text-muted);">--</span>`}
      </td>
    `;

    tr.addEventListener('click', (e) => {
      if (e.target.closest('.stock-info-btn')) return;
      selectStock(stock);
    });

    el.stocksTbody.appendChild(tr);
  });

  populatePricescanScopeOptions();
  populateVcpscanScopeOptions();
  applyColumnVisibilityToTable();
  lucide.createIcons();
}

// -------------------------------------------------------------
// Watchlist 3-Dot Instant Click Handler
// -------------------------------------------------------------
async function handleWatchlistDotClick(e, symbol, wlIndex) {
  if (e) e.stopPropagation();
  const dotEl = e?.target;
  const sym = String(symbol || '').toUpperCase();
  if (!sym) return;

  if (!state.watchlists || state.watchlists.length <= wlIndex) {
    showToast(`Watchlist ${wlIndex + 1} does not exist yet. Please create it first.`, 'info');
    return;
  }

  const wl = state.watchlists[wlIndex];
  const isPresent = (wl.stocks || []).some(s => (s.symbol || '').toUpperCase() === sym);

  if (isPresent) {
    if (dotEl) dotEl.classList.remove('active');
    await removeStockFromWatchlist(wl.id, sym);
  } else {
    if (dotEl) dotEl.classList.add('active');
    const stockObj = state.currentStocks.find(s => (s.symbol || '').toUpperCase() === sym);
    const stockName = stockObj?.name || sym;
    await addStockToSpecificWatchlist(wl.id, sym, stockName);
  }
}

// -------------------------------------------------------------
// Recommended Filter Pills Controller
// -------------------------------------------------------------
function setRecommendedFilter(filterKey) {
  state.recFilter = filterKey || 'all';
  
  document.querySelectorAll('#rec-filter-pills-bar .rec-filter-pill, .rec-pill').forEach(btn => {
    if (btn.dataset.filter === state.recFilter) {
      btn.classList.add('active');
    } else {
      btn.classList.remove('active');
    }
  });

  renderStocksTable();
}

// -------------------------------------------------------------
// Columns Customizer Controller
// -------------------------------------------------------------
function openColumnsCustomizerModal() {
  const modal = document.getElementById('columns-customizer-modal');
  if (modal) {
    modal.classList.remove('hidden');
    const prefs = state.denseColumns || {};
    Object.keys(prefs).forEach(k => {
      const chk = document.getElementById(`col-toggle-${k}`);
      if (chk) chk.checked = prefs[k] !== false;
    });
  }
}

function closeColumnsCustomizerModal() {
  const modal = document.getElementById('columns-customizer-modal');
  if (modal) modal.classList.add('hidden');
}

function handleColumnToggle(colKey, isChecked) {
  if (!state.denseColumns) state.denseColumns = {};
  state.denseColumns[colKey] = Boolean(isChecked);
  saveColumnPreferences();
}

function toggleAllActiveColumns() {
  const cols = ['close', 'chg', 'vol', 'emas', 'rsi'];
  const allChecked = cols.every(k => state.denseColumns[k] !== false);
  const targetState = !allChecked;

  cols.forEach(k => {
    state.denseColumns[k] = targetState;
    const chk = document.getElementById(`col-toggle-${k}`);
    if (chk) chk.checked = targetState;
  });

  saveColumnPreferences();
}

function resetDefaultColumns() {
  state.denseColumns = {
    symbol: true,
    close: true,
    chg: true,
    vol: true,
    emas: true,
    rsi: true
  };

  Object.keys(state.denseColumns).forEach(k => {
    const chk = document.getElementById(`col-toggle-${k}`);
    if (chk) chk.checked = true;
  });

  saveColumnPreferences();
  showToast('Table columns reset to default', 'info');
}

function loadColumnPreferences() {
  try {
    const saved = localStorage.getItem('dense_table_columns_prefs');
    if (saved) {
      const parsed = JSON.parse(saved);
      // Clean up legacy keys that were removed
      delete parsed.sr;
      delete parsed.wl;
      delete parsed.cap;
      delete parsed.gap;
      delete parsed.ema20;
      delete parsed.dpivot;
      delete parsed.wpivot;
      delete parsed.rvol;
      delete parsed.emax;
      delete parsed['52wh'];
      delete parsed['high52w'];
      state.denseColumns = { ...state.denseColumns, ...parsed };
      if (state.denseColumns.vol === undefined) state.denseColumns.vol = true;
      if (state.denseColumns.emas === undefined) state.denseColumns.emas = true;
      if (state.denseColumns.rsi === undefined) state.denseColumns.rsi = true;
    }
  } catch (e) {}
  applyColumnVisibilityToTable();
}

function saveColumnPreferences() {
  try {
    localStorage.setItem('dense_table_columns_prefs', JSON.stringify(state.denseColumns));
  } catch (e) {}
  applyColumnVisibilityToTable();
}

function applyColumnVisibilityToTable() {
  const prefs = state.denseColumns || {};
  const allColKeys = ['symbol', 'close', 'chg', 'vol', 'emas', 'rsi'];
  
  allColKeys.forEach(colKey => {
    const isVisible = prefs[colKey] !== false;
    document.querySelectorAll(`.col-${colKey}`).forEach(node => {
      if (isVisible) {
        node.style.display = '';
      } else {
        node.style.display = 'none';
      }
    });
  });
}

// -------------------------------------------------------------
// Live Market Indices Strip Controller
// -------------------------------------------------------------
let marketIndicesTimer = null;

function initMarketIndicesStrip() {
  fetchMarketIndices();
  if (marketIndicesTimer) clearInterval(marketIndicesTimer);
  marketIndicesTimer = setInterval(fetchMarketIndices, 12000);
}

async function fetchMarketIndices() {
  try {
    const res = await fetch('/api/market-indices');
    if (!res.ok) return;
    const data = await res.json();
    if (data.success && data.indices) {
      updateMarketIndicesDisplay(data.indices);
    }
  } catch (e) {}
}

function updateMarketIndicesDisplay(indices) {
  if (!indices) return;
  const updateIdx = (id, info) => {
    if (!info) return;
    const container = document.getElementById(id);
    if (!container) return;
    const ltpEl = container.querySelector('.index-ltp');
    const chgEl = container.querySelector('.index-chg');
    if (ltpEl) {
      ltpEl.textContent = typeof info.price === 'number' ? info.price.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : info.price;
    }
    if (chgEl) {
      const chg = typeof info.changePercent === 'number' ? info.changePercent : parseFloat(info.changePercent || '0');
      chgEl.textContent = `${chg >= 0 ? '+' : ''}${chg.toFixed(2)}%`;
      if (chg >= 0) {
        chgEl.className = 'index-chg px-1.5 py-0.2 rounded font-semibold text-[10px] bg-emerald-500/15 text-emerald-400';
      } else {
        chgEl.className = 'index-chg px-1.5 py-0.2 rounded font-semibold text-[10px] bg-rose-500/15 text-rose-400';
      }
    }
  };

  updateIdx('idx-nifty50', indices.nifty50);
  updateIdx('idx-niftybank', indices.niftybank);
  updateIdx('idx-midcap150', indices.midcap150);
  updateIdx('idx-smallcap250', indices.smallcap250);
  updateIdx('idx-indiavix', indices.indiavix);
}

function exportToCsv() {
  if (!state.currentStocks || state.currentStocks.length === 0) {
    showToast('No stocks available to export', 'error');
    return;
  }

  const screenerName = state.isAggregatedMode 
    ? 'All_Screeners_Confluence' 
    : (state.screeners.find(s => s.id === state.activeScreenerId)?.name || 'Screener_Results');

  const headers = ['Sr', 'Symbol', 'Name', 'Close Price (INR)', 'Change (%)', 'Volume', 'Confluence Count'];
  const rows = state.currentStocks.map((s, idx) => [
    idx + 1,
    `"${s.symbol}"`,
    `"${(s.name || '').replace(/"/g, '""')}"`,
    s.close || '',
    s.changePercent || '',
    s.volume || '',
    s.matchCount || 1
  ]);

  const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
  const encodedUri = encodeURI(csvContent);
  const link = document.createElement('a');
  link.setAttribute('href', encodedUri);
  link.setAttribute('download', `${screenerName.replace(/[^a-zA-Z0-9_-]/g, '_')}_${Date.now()}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  showToast('Exported results to CSV successfully', 'success');
}

function handleCopyWatchlistStocks() {
  const activeWl = getActiveWatchlist();
  const list = activeWl ? activeWl.stocks || [] : [];

  if (!list || list.length === 0) {
    showToast('No stocks in current watchlist to copy', 'error');
    return;
  }

  const symbols = list.map(s => s.symbol).filter(Boolean);
  const textToCopy = symbols.join(', ');

  const copySuccess = () => {
    showToast(`Copied ${symbols.length} symbols from "${activeWl.name}"! (Ready for TradingView / Dhan / Chartink)`, 'success');
  };

  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(textToCopy).then(copySuccess).catch(() => {
      fallbackCopyText(textToCopy, symbols.length);
    });
  } else {
    fallbackCopyText(textToCopy, symbols.length);
  }
}

function exportWatchlistToCsv() {
  const activeWl = getActiveWatchlist();
  if (!activeWl || !Array.isArray(activeWl.stocks) || activeWl.stocks.length === 0) {
    showToast('No stocks in current watchlist to export', 'error');
    return;
  }

  const wlName = activeWl.name || 'Watchlist';
  const headers = ['Sr', 'Symbol', 'Name', 'LTP (INR)', 'Change (%)', 'Volume', 'Added At'];
  const rows = activeWl.stocks.map((s, idx) => {
    const q = state.watchlistQuotes[s.symbol] || {};
    return [
      idx + 1,
      `"${s.symbol}"`,
      `"${(s.name || s.symbol || '').replace(/"/g, '""')}"`,
      q.ltp != null ? q.ltp : '',
      q.changePercent != null ? q.changePercent : '',
      q.volume != null ? q.volume : '',
      `"${s.addedAt || ''}"`
    ];
  });

  const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
  const encodedUri = encodeURI(csvContent);
  const link = document.createElement('a');
  link.setAttribute('href', encodedUri);
  link.setAttribute('download', `${wlName.replace(/[^a-zA-Z0-9_-]/g, '_')}_${Date.now()}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  showToast(`Exported "${wlName}" (${activeWl.stocks.length} stocks) to CSV successfully`, 'success');
}

// -------------------------------------------------------------
// Modal Workflows (Admin Only)
// -------------------------------------------------------------

function openAddModal() {
  if (!state.user && !state.isAdmin) {
    showToast('Please log in or register to add custom screeners', 'info');
    openAuthModal('login');
    return;
  }

  el.modalTitle.textContent = state.isAdmin ? 'Add New Global System Screener' : 'Add Custom Screener (My Workspace)';
  el.modalScreenerId.value = '';
  el.modalScreenerName.value = '';
  el.modalScreenerUrl.value = '';
  el.modalScreenerCategory.value = state.isAdmin ? 'Intraday' : 'Custom';
  el.modalScreenerTags.value = '';
  el.modalScreenerDesc.value = '';
  el.modalTestBanner.className = 'hidden';
  el.screenerModal.classList.remove('hidden');
  el.screenerModal.classList.add('flex');
  el.modalScreenerName.focus();
}

function openEditModal(id) {
  if (!state.user && !state.isAdmin) {
    showToast('Please log in to edit screeners', 'info');
    openAuthModal('login');
    return;
  }

  const screener = state.screeners.find(s => s.id === id);
  if (!screener) return;

  if (!state.isAdmin && !screener.isCustom) {
    showToast('Global system screeners can only be modified by Admin', 'error');
    return;
  }

  el.modalTitle.textContent = state.isAdmin && screener.isGlobal ? 'Edit Global System Screener' : 'Edit Custom Screener';
  el.modalScreenerId.value = screener.id;
  el.modalScreenerName.value = screener.name;
  el.modalScreenerUrl.value = screener.url;
  el.modalScreenerCategory.value = screener.category || (screener.isCustom ? 'Custom' : 'Intraday');
  el.modalScreenerTags.value = Array.isArray(screener.tags) ? screener.tags.join(', ') : '';
  el.modalScreenerDesc.value = screener.description || '';
  el.modalTestBanner.className = 'hidden';
  el.screenerModal.classList.remove('hidden');
  el.screenerModal.classList.add('flex');
}

function closeModal() {
  el.screenerModal.classList.add('hidden');
  el.screenerModal.classList.remove('flex');
}

async function testScreenerLink() {
  const url = el.modalScreenerUrl.value.trim();
  if (!url) {
    showToast('Please enter a Chartink URL first', 'error');
    return;
  }

  el.btnTestScreener.disabled = true;
  el.btnTestScreener.innerHTML = `
    <svg class="animate-spin h-3 w-3 text-slate-300" fill="none" viewBox="0 0 24 24">
      <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
      <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
    </svg>
    <span>Testing...</span>
  `;

  try {
    const res = await fetch('/api/screeners/preview', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeaders()
      },
      body: JSON.stringify({ url })
    });
    const data = await res.json();

    if (!res.ok || !data.success) {
      throw new Error(data.error || 'Failed to execute screener');
    }

    if (!el.modalScreenerName.value && data.title) el.modalScreenerName.value = data.title;
    if (!el.modalScreenerDesc.value && data.description) el.modalScreenerDesc.value = data.description;

    el.modalTestBanner.className = 'p-3 rounded-xl text-xs border bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
    el.modalTestBanner.innerHTML = `
      <div class="flex items-center gap-2 font-semibold">
        <i data-lucide="check-circle" class="w-4 h-4"></i>
        <span>Success! Screener executed cleanly.</span>
      </div>
      <p class="mt-1 text-slate-300">Returned <strong>${data.count} stocks</strong> right now.</p>
    `;
    lucide.createIcons();
  } catch (err) {
    el.modalTestBanner.className = 'p-3 rounded-xl text-xs border bg-rose-500/10 text-rose-400 border-rose-500/20';
    el.modalTestBanner.innerHTML = `
      <div class="flex items-center gap-2 font-semibold">
        <i data-lucide="alert-circle" class="w-4 h-4"></i>
        <span>Test failed</span>
      </div>
      <p class="mt-1 text-slate-300">${err.message}</p>
    `;
    lucide.createIcons();
  } finally {
    el.btnTestScreener.disabled = false;
    el.btnTestScreener.innerHTML = `
      <i data-lucide="flask-conical" class="w-3.5 h-3.5"></i>
      <span>Test Run Link</span>
    `;
    lucide.createIcons();
  }
}

async function handleSaveScreener(e) {
  e.preventDefault();
  if (!state.user && !state.isAdmin) {
    showToast('Login required to save screeners', 'info');
    openAuthModal('login');
    return;
  }

  const id = el.modalScreenerId.value;
  const name = el.modalScreenerName.value.trim();
  const url = el.modalScreenerUrl.value.trim();
  const category = el.modalScreenerCategory.value;
  const description = el.modalScreenerDesc.value.trim();
  const rawTags = el.modalScreenerTags.value;
  const tags = rawTags ? rawTags.split(',').map(t => t.trim()).filter(Boolean) : [category];

  const payload = { name, url, category, description, tags };

  try {
    let res;
    if (id) {
      res = await fetch(`/api/screeners/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders()
        },
        body: JSON.stringify(payload)
      });
    } else {
      res = await fetch('/api/screeners', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders()
        },
        body: JSON.stringify(payload)
      });
    }

    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data.error || 'Failed to save screener');
    }

    showToast(`Screener "${name}" saved successfully!`, 'success');
    closeModal();
    await loadScreeners();
  } catch (err) {
    showToast(`Error saving screener: ${err.message}`, 'error');
  }
}

async function deleteScreener(id) {
  if (!state.user && !state.isAdmin) {
    showToast('Login required to delete screeners', 'info');
    openAuthModal('login');
    return;
  }

  const screener = state.screeners.find(s => s.id === id);
  if (!screener) return;

  if (!state.isAdmin && !screener.isCustom) {
    showToast('Global system screeners can only be deleted by Admin', 'error');
    return;
  }

  const confirmed = confirm(`Are you sure you want to delete screener "${screener.name}"?`);
  if (!confirmed) return;

  try {
    const res = await fetch(`/api/screeners/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders()
    });
    const data = await res.json();
    if (!res.ok || !data.success) throw new Error(data.error || 'Failed to delete');

    showToast(`Screener "${screener.name}" deleted`, 'success');
    if (state.activeScreenerId === id) {
      state.activeScreenerId = null;
      state.currentStocks = [];
      renderStocksTable();
    }
    await loadScreeners();
  } catch (err) {
    showToast(`Error deleting screener: ${err.message}`, 'error');
  }
}

function showToast(message, type = 'info') {
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

  el.toastContainer.appendChild(toast);
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
let adminCurrentTab = 'users'; // 'users' | 'universe' | 'docs'

let adminUniverseState = {
  stocks: [],
  filtered: [],
  totalCount: 0,
  fnoCount: 0,
  autoCount: 0,
  adminCount: 0,
  sectorsCount: 0,
  sectors: {},
  page: 1,
  pageSize: 50,
  search: '',
  sector: 'ALL',
  cap: 'ALL',
  fno: 'ALL',
  source: 'ALL',
  isLoading: false,
  isLoaded: false
};

function switchAdminConsoleTab(tab) {
  adminCurrentTab = tab || 'users';

  // Desktop buttons
  const btnUsers = document.getElementById('admin-tab-btn-users');
  const btnGuest = document.getElementById('admin-tab-btn-guest');
  const btnUniverse = document.getElementById('admin-tab-btn-universe');
  const btnDocs = document.getElementById('admin-tab-btn-docs');

  // Mobile buttons
  const mBtnUsers = document.getElementById('admin-mobile-tab-users');
  const mBtnGuest = document.getElementById('admin-mobile-tab-guest');
  const mBtnUniverse = document.getElementById('admin-mobile-tab-universe');
  const mBtnDocs = document.getElementById('admin-mobile-tab-docs');

  // Content panels
  const contentUsers = document.getElementById('admin-tab-content-users');
  const contentGuest = document.getElementById('admin-tab-content-guest');
  const contentUniverse = document.getElementById('admin-tab-content-universe');
  const contentDocs = document.getElementById('admin-tab-content-docs');

  const activeClass = 'bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-sm font-bold';
  const inactiveClass = 'text-slate-400 hover:text-white font-semibold hover:bg-dark-accent';

  if (btnUsers) btnUsers.className = `px-3 py-1.5 rounded-lg text-xs transition-all flex items-center gap-1.5 cursor-pointer ${adminCurrentTab === 'users' ? activeClass : inactiveClass}`;
  if (btnGuest) btnGuest.className = `px-3 py-1.5 rounded-lg text-xs transition-all flex items-center gap-1.5 cursor-pointer ${adminCurrentTab === 'guest' ? activeClass : inactiveClass}`;
  if (btnUniverse) btnUniverse.className = `px-3 py-1.5 rounded-lg text-xs transition-all flex items-center gap-1.5 cursor-pointer ${adminCurrentTab === 'universe' ? activeClass : inactiveClass}`;
  if (btnDocs) btnDocs.className = `px-3 py-1.5 rounded-lg text-xs transition-all flex items-center gap-1.5 cursor-pointer ${adminCurrentTab === 'docs' ? activeClass : inactiveClass}`;

  if (mBtnUsers) mBtnUsers.className = `px-2.5 py-1 rounded-lg ${adminCurrentTab === 'users' ? 'font-bold text-amber-300 bg-amber-500/20' : 'text-slate-400'}`;
  if (mBtnGuest) mBtnGuest.className = `px-2.5 py-1 rounded-lg ${adminCurrentTab === 'guest' ? 'font-bold text-amber-300 bg-amber-500/20' : 'text-slate-400'}`;
  if (mBtnUniverse) mBtnUniverse.className = `px-2.5 py-1 rounded-lg ${adminCurrentTab === 'universe' ? 'font-bold text-amber-300 bg-amber-500/20' : 'text-slate-400'}`;
  if (mBtnDocs) mBtnDocs.className = `px-2.5 py-1 rounded-lg ${adminCurrentTab === 'docs' ? 'font-bold text-amber-300 bg-amber-500/20' : 'text-slate-400'}`;

  if (contentUsers) {
    if (adminCurrentTab === 'users') {
      contentUsers.classList.remove('hidden');
      contentUsers.classList.add('flex');
    } else {
      contentUsers.classList.add('hidden');
      contentUsers.classList.remove('flex');
    }
  }

  if (contentGuest) {
    if (adminCurrentTab === 'guest') {
      contentGuest.classList.remove('hidden');
      contentGuest.classList.add('flex');
      loadAdminGuestPermissions();
    } else {
      contentGuest.classList.add('hidden');
      contentGuest.classList.remove('flex');
    }
  }

  if (contentUniverse) {
    if (adminCurrentTab === 'universe') {
      contentUniverse.classList.remove('hidden');
      contentUniverse.classList.add('flex');
      loadAdminUniverse(true);
    } else {
      contentUniverse.classList.add('hidden');
      contentUniverse.classList.remove('flex');
    }
  }

  if (contentDocs) {
    if (adminCurrentTab === 'docs') {
      contentDocs.classList.remove('hidden');
      contentDocs.classList.add('flex');
      loadAdminArchitecture();
    } else {
      contentDocs.classList.add('hidden');
      contentDocs.classList.remove('flex');
    }
  }

  if (window.lucide) lucide.createIcons();
}

async function loadAdminGuestPermissions() {
  try {
    const res = await fetch('/api/admin/guest-permissions', {
      headers: { ...getAuthHeaders() }
    });
    const data = await res.json();
    if (data.success && data.permissions) {
      state.guestPermissions = Object.assign({}, state.guestPermissions, data.permissions);
    }
  } catch (e) {}

  const p = state.guestPermissions || {};
  
  const setChk = (id, val) => {
    const el = document.getElementById(id);
    if (el) el.checked = Boolean(val);
  };

  setChk('admin-guest-screener-deck', p.screenerDeck);
  setChk('admin-guest-sidebar-scans', p.sidebarScans);
  setChk('admin-guest-custom-screener', p.customScreener);
  setChk('admin-guest-screener-export', p.screenerExport);
  setChk('admin-guest-watchlists', p.watchlists);
  setChk('admin-guest-indicators-toolbar', p.indicatorsToolbar);
  setChk('admin-guest-volume-intel', p.volumeIntelligence);
  setChk('admin-guest-intraday', p.intradayTimeframes);
  setChk('admin-guest-stock-search', p.stockSearch);
  setChk('admin-guest-chart-export', p.chartExport);
  setChk('admin-guest-nav-subpages', p.navSubpages);
  setChk('admin-guest-banner', p.guestBanner);

  const bannerInput = document.getElementById('admin-guest-banner-text');
  if (bannerInput) {
    bannerInput.value = p.guestBannerText || '';
  }
}

function applyGuestPreset(preset) {
  const setChk = (id, val) => {
    const el = document.getElementById(id);
    if (el) el.checked = Boolean(val);
  };

  if (preset === 'chart_only') {
    setChk('admin-guest-screener-deck', false);
    setChk('admin-guest-sidebar-scans', false);
    setChk('admin-guest-custom-screener', false);
    setChk('admin-guest-screener-export', false);
    setChk('admin-guest-watchlists', false);
    setChk('admin-guest-indicators-toolbar', false);
    setChk('admin-guest-volume-intel', false);
    setChk('admin-guest-intraday', false);
    setChk('admin-guest-stock-search', true);
    setChk('admin-guest-chart-export', false);
    setChk('admin-guest-nav-subpages', false);
    setChk('admin-guest-banner', true);
    showToast('Applied "Pure Chart Only (Default)" preset.', 'info');
  } else if (preset === 'chart_indicators') {
    setChk('admin-guest-screener-deck', false);
    setChk('admin-guest-sidebar-scans', false);
    setChk('admin-guest-custom-screener', false);
    setChk('admin-guest-screener-export', false);
    setChk('admin-guest-watchlists', false);
    setChk('admin-guest-indicators-toolbar', true);
    setChk('admin-guest-volume-intel', true);
    setChk('admin-guest-intraday', false);
    setChk('admin-guest-stock-search', true);
    setChk('admin-guest-chart-export', true);
    setChk('admin-guest-nav-subpages', false);
    setChk('admin-guest-banner', true);
    showToast('Applied "Chart + Indicators" preset.', 'info');
  } else if (preset === 'full_open') {
    setChk('admin-guest-screener-deck', true);
    setChk('admin-guest-sidebar-scans', true);
    setChk('admin-guest-custom-screener', true);
    setChk('admin-guest-screener-export', true);
    setChk('admin-guest-watchlists', true);
    setChk('admin-guest-indicators-toolbar', true);
    setChk('admin-guest-volume-intel', true);
    setChk('admin-guest-intraday', true);
    setChk('admin-guest-stock-search', true);
    setChk('admin-guest-chart-export', true);
    setChk('admin-guest-nav-subpages', true);
    setChk('admin-guest-banner', false);
    showToast('Applied "Full Public Open" preset.', 'info');
  }

  handleAdminSaveGuestPermissions();
}

async function handleAdminSaveGuestPermissions(e) {
  if (e && e.preventDefault) e.preventDefault();
  
  const statusEl = document.getElementById('admin-guest-perms-status');
  const btn = document.getElementById('btn-save-guest-perms');
  if (statusEl) { statusEl.className = 'hidden'; statusEl.textContent = ''; }

  const getChk = id => {
    const el = document.getElementById(id);
    return el ? Boolean(el.checked) : false;
  };

  const payload = {
    screenerDeck: getChk('admin-guest-screener-deck'),
    sidebarScans: getChk('admin-guest-sidebar-scans'),
    customScreener: getChk('admin-guest-custom-screener'),
    screenerExport: getChk('admin-guest-screener-export'),
    watchlists: getChk('admin-guest-watchlists'),
    indicatorsToolbar: getChk('admin-guest-indicators-toolbar'),
    volumeIntelligence: getChk('admin-guest-volume-intel'),
    intradayTimeframes: getChk('admin-guest-intraday'),
    stockSearch: getChk('admin-guest-stock-search'),
    chartExport: getChk('admin-guest-chart-export'),
    navSubpages: getChk('admin-guest-nav-subpages'),
    guestBanner: getChk('admin-guest-banner'),
    guestBannerText: (document.getElementById('admin-guest-banner-text')?.value || '').trim()
  };

  if (btn) {
    btn.disabled = true;
    btn.innerHTML = `<i data-lucide="loader-2" class="w-4 h-4 animate-spin"></i><span>Saving Permissions...</span>`;
    if (window.lucide) lucide.createIcons();
  }

  try {
    const res = await fetch('/api/admin/guest-permissions', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeaders()
      },
      body: JSON.stringify(payload)
    });
    const data = await res.json();

    if (!res.ok || !data.success) {
      if (statusEl) {
        statusEl.className = 'p-3 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-400 font-semibold text-xs';
        statusEl.textContent = data.error || 'Failed to save guest permissions.';
      }
      showToast(data.error || 'Failed to save guest permissions', 'error');
      return;
    }

    state.guestPermissions = data.permissions || payload;
    applyGuestPermissions();

    if (statusEl) {
      statusEl.className = 'p-3 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 font-semibold text-xs';
      statusEl.textContent = '✅ Guest access permissions saved & applied successfully!';
    }
    showToast('Guest permissions updated live!', 'success');
  } catch (err) {
    if (statusEl) {
      statusEl.className = 'p-3 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-400 font-semibold text-xs';
      statusEl.textContent = 'Error connecting to server: ' + err.message;
    }
    showToast('Error: ' + err.message, 'error');
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.innerHTML = `<i data-lucide="save" class="w-4 h-4"></i><span>Save & Apply Guest Access Controls</span>`;
      if (window.lucide) lucide.createIcons();
    }
  }
}

function openAdminConsole() {
  const modal = document.getElementById('admin-console-modal');
  if (!modal) return;
  modal.classList.remove('hidden');
  modal.classList.add('flex');
  switchAdminConsoleTab(adminCurrentTab || 'users');
  loadAdminData();
  loadAdminUniverse();
  loadAdminArchitecture();
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

function toggleAdminAddStockPanel() {
  const panel = document.getElementById('admin-add-stock-panel');
  if (panel) panel.classList.toggle('hidden');
}

async function loadAdminUniverse(forceRefresh = false) {
  if (adminUniverseState.isLoading) return;
  adminUniverseState.isLoading = true;

  const tbody = document.getElementById('admin-universe-tbody');
  if (tbody && (!adminUniverseState.stocks || adminUniverseState.stocks.length === 0 || forceRefresh)) {
    tbody.innerHTML = `<tr><td colspan="10" class="py-12 text-center text-slate-400 font-sans">
      <div class="flex flex-col items-center gap-2">
        <i data-lucide="loader-2" class="w-6 h-6 animate-spin text-blue-400"></i>
        <span>Loading stock universe database (${forceRefresh ? 'Refreshing' : '1,300+ securities'})...</span>
      </div>
    </td></tr>`;
    if (window.lucide) lucide.createIcons();
  }

  try {
    const res = await fetch('/api/admin/universe', {
      headers: { ...getAuthHeaders() }
    });
    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data.error || 'Failed to load stock universe');
    }

    adminUniverseState.stocks = data.stocks || [];
    adminUniverseState.totalCount = data.totalCount || adminUniverseState.stocks.length;
    adminUniverseState.fnoCount = data.fnoCount || 0;
    adminUniverseState.autoCount = data.autoAddedCount || 0;
    adminUniverseState.adminCount = data.adminAddedCount || 0;
    adminUniverseState.sectorsCount = data.sectorsCount || 0;
    adminUniverseState.sectors = data.sectors || {};
    adminUniverseState.isLoaded = true;

    // Update KPI & Badges
    const kpiTotal = document.getElementById('admin-kpi-universe-total');
    const kpiSub = document.getElementById('admin-kpi-universe-sub');
    const tabBadge = document.getElementById('admin-tab-badge-universe-count');
    const totalBadge = document.getElementById('admin-universe-total-badge');
    const fnoBadge = document.getElementById('admin-universe-fno-badge');
    const autoBadge = document.getElementById('admin-universe-auto-badge');

    if (kpiTotal) kpiTotal.textContent = `${adminUniverseState.totalCount.toLocaleString()}`;
    if (kpiSub) kpiSub.textContent = `${adminUniverseState.fnoCount} F&O · ${adminUniverseState.sectorsCount} Sectors`;
    if (tabBadge) tabBadge.textContent = `${adminUniverseState.totalCount}`;
    if (totalBadge) totalBadge.textContent = `${adminUniverseState.totalCount.toLocaleString()} Stocks`;
    if (fnoBadge) fnoBadge.textContent = `${adminUniverseState.fnoCount} F&O Active`;
    if (autoBadge) autoBadge.textContent = `${adminUniverseState.autoCount} Auto-Ingested`;

    // Populate sector dropdown
    populateAdminUniverseSectors();

    // Apply filters and render
    applyAdminUniverseFilters();
  } catch (err) {
    if (tbody) {
      tbody.innerHTML = `<tr><td colspan="10" class="py-8 text-center text-rose-400 font-sans">Error loading universe: ${err.message}</td></tr>`;
    }
    showToast(err.message, 'error');
  } finally {
    adminUniverseState.isLoading = false;
  }
}

function populateAdminUniverseSectors() {
  const select = document.getElementById('admin-universe-sector-filter');
  if (!select) return;

  const currentVal = select.value || 'ALL';
  const sectorList = Object.keys(adminUniverseState.sectors || {}).sort((a, b) => a.localeCompare(b));

  select.innerHTML = '<option value="ALL">All Sectors (All)</option>';
  sectorList.forEach(sec => {
    const count = adminUniverseState.sectors[sec] || 0;
    const opt = document.createElement('option');
    opt.value = sec;
    opt.textContent = `${sec} (${count})`;
    if (sec === currentVal) opt.selected = true;
    select.appendChild(opt);
  });
}

function handleAdminUniverseFilterChange() {
  const searchInput = document.getElementById('admin-universe-search');
  const sectorSelect = document.getElementById('admin-universe-sector-filter');
  const capSelect = document.getElementById('admin-universe-cap-filter');
  const fnoSelect = document.getElementById('admin-universe-fno-filter');
  const sourceSelect = document.getElementById('admin-universe-source-filter');

  adminUniverseState.search = (searchInput?.value || '').trim().toLowerCase();
  adminUniverseState.sector = sectorSelect?.value || 'ALL';
  adminUniverseState.cap = capSelect?.value || 'ALL';
  adminUniverseState.fno = fnoSelect?.value || 'ALL';
  adminUniverseState.source = sourceSelect?.value || 'ALL';
  adminUniverseState.page = 1;

  applyAdminUniverseFilters();
}

function applyAdminUniverseFilters() {
  const { stocks, search, sector, cap, fno, source } = adminUniverseState;

  adminUniverseState.filtered = stocks.filter(stk => {
    if (!stk) return false;

    // Search filter
    if (search) {
      const sym = (stk.symbol || '').toLowerCase();
      const name = (stk.name || '').toLowerCase();
      const sec = (stk.sector || '').toLowerCase();
      const ind = (stk.industry || '').toLowerCase();
      if (!sym.includes(search) && !name.includes(search) && !sec.includes(search) && !ind.includes(search)) {
        return false;
      }
    }

    // Sector filter
    if (sector !== 'ALL' && stk.sector !== sector) {
      return false;
    }

    // Market Cap Category Filter
    if (cap !== 'ALL') {
      const mcap = stk.marketCap || 0;
      if (cap === 'MEGA' && mcap < 50000) return false;
      if (cap === 'LARGE' && (mcap < 20000 || mcap >= 50000)) return false;
      if (cap === 'MID' && (mcap < 5000 || mcap >= 20000)) return false;
      if (cap === 'SMALL' && (mcap < 1000 || mcap >= 5000)) return false;
      if (cap === 'MICRO' && mcap >= 1000) return false;
    }

    // FNO Filter
    if (fno === 'FNO_ONLY' && !stk.fno) return false;
    if (fno === 'NON_FNO' && stk.fno) return false;

    // Source Filter
    if (source === 'AUTO' && !stk.autoAdded) return false;
    if (source === 'ADMIN' && !stk.adminAdded) return false;
    if (source === 'BASE' && (stk.autoAdded || stk.adminAdded)) return false;

    return true;
  });

  renderAdminUniverseTable();
}

function renderAdminUniverseTable() {
  const tbody = document.getElementById('admin-universe-tbody');
  const paginationInfo = document.getElementById('admin-universe-pagination-info');
  const pageDisplay = document.getElementById('admin-universe-page-display');
  const btnPrev = document.getElementById('admin-universe-btn-prev');
  const btnNext = document.getElementById('admin-universe-btn-next');

  if (!tbody) return;

  const totalFiltered = adminUniverseState.filtered.length;
  const pageSize = adminUniverseState.pageSize || 50;
  const totalPages = Math.max(1, Math.ceil(totalFiltered / pageSize));
  adminUniverseState.page = Math.min(Math.max(1, adminUniverseState.page), totalPages);
  const curPage = adminUniverseState.page;

  const startIdx = (curPage - 1) * pageSize;
  const endIdx = Math.min(startIdx + pageSize, totalFiltered);
  const pageItems = adminUniverseState.filtered.slice(startIdx, endIdx);

  // Update pagination controls
  if (paginationInfo) {
    paginationInfo.textContent = totalFiltered > 0
      ? `Showing ${startIdx + 1} to ${endIdx} of ${totalFiltered.toLocaleString()} stocks`
      : 'No matching stocks in universe';
  }
  if (pageDisplay) pageDisplay.textContent = `Page ${curPage} of ${totalPages}`;
  if (btnPrev) btnPrev.disabled = curPage <= 1;
  if (btnNext) btnNext.disabled = curPage >= totalPages;

  if (pageItems.length === 0) {
    tbody.innerHTML = `<tr><td colspan="10" class="py-8 text-center text-slate-500 font-sans">
      No stocks matched the active universe filters. Try adjusting your search query or filters.
    </td></tr>`;
    return;
  }

  tbody.innerHTML = '';
  pageItems.forEach((stk, index) => {
    const tr = document.createElement('tr');
    tr.className = 'hover:bg-dark-accent/40 transition-colors';

    const rowNum = startIdx + index + 1;
    const isFno = Boolean(stk.fno);
    const mcapCr = stk.marketCap ? `₹${Number(stk.marketCap).toLocaleString('en-IN', { maximumFractionDigits: 0 })} Cr` : '₹5,000 Cr';
    const capCat = stk.capCategory || 'Small Cap';
    const capTooltip = getCapCategoryTooltip(capCat, stk.marketCap);
    const ltpStr = typeof stk.price === 'number' && stk.price > 0 ? `₹${stk.price.toFixed(2)}` : '--';
    const chgStr = typeof stk.changePercent === 'number'
      ? `${stk.changePercent >= 0 ? '+' : ''}${stk.changePercent.toFixed(2)}%`
      : '0.00%';
    const chgColor = stk.changePercent >= 0 ? 'text-emerald-400' : 'text-rose-400';

    const h52 = stk.high52w ? Number(stk.high52w).toFixed(1) : '--';
    const l52 = stk.low52w ? Number(stk.low52w).toFixed(1) : '--';

    const tags = [];
    if (isFno) tags.push('<span class="px-1.5 py-0.2 rounded text-[9px] font-bold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30" title="Active in NSE Futures & Options Segment">F&O</span>');
    if (stk.autoAdded) tags.push('<span class="px-1.5 py-0.2 rounded text-[9px] font-bold bg-purple-500/15 text-purple-300 border border-purple-500/30" title="Auto-Ingested: Added dynamically to universe from live scanner discovery">Auto-Ingested</span>');
    if (stk.adminAdded) tags.push('<span class="px-1.5 py-0.2 rounded text-[9px] font-bold bg-amber-500/15 text-amber-300 border border-amber-500/30" title="Admin Added: Manually registered into persistent database by Administrator">Admin Added</span>');
    if (stk.rsi) tags.push(`<span class="px-1.5 py-0.2 rounded text-[9px] bg-slate-800 text-slate-300 border border-slate-700" title="14-Period Relative Strength Index: Momentum oscillator">RSI ${stk.rsi}</span>`);
    if (stk.rvol && stk.rvol > 1) tags.push(`<span class="px-1.5 py-0.2 rounded text-[9px] bg-cyan-950 text-cyan-300 border border-cyan-800" title="Relative Volume: ${stk.rvol}x vs 20-day average baseline">RVOL ${stk.rvol}x</span>`);

    tr.innerHTML = `
      <td class="py-2.5 px-3 text-center text-slate-500 font-mono text-[11px]" title="Row ${rowNum}">${rowNum}</td>
      <td class="py-2.5 px-3">
        <div class="flex items-center gap-1.5">
          <span class="font-bold text-white font-mono text-xs tracking-wide" title="NSE Symbol: ${stk.symbol}">${stk.symbol}</span>
          ${typeof getStockInfoButtonHtml === 'function' ? getStockInfoButtonHtml(stk.symbol, stk.name) : ''}
          ${stk.exchange && stk.exchange !== 'NSE' ? `<span class="px-1.5 py-0.2 rounded text-[9px] font-mono font-semibold bg-dark-card border border-dark-border text-slate-400" title="Exchange: ${stk.exchange}">${stk.exchange}</span>` : ''}
        </div>
      </td>
      <td class="py-2.5 px-3 text-slate-200 font-sans text-xs truncate max-w-[200px]" title="${stk.name}">${stk.name}</td>
      <td class="py-2.5 px-3 whitespace-nowrap" title="Sector: ${stk.sector || 'General'} | Industry: ${stk.industry || 'Diversified'}">
        <div class="flex flex-col">
          <span class="font-semibold text-teal-300 text-[11px]">${stk.sector || 'General'}</span>
          <span class="text-[10px] text-slate-500 truncate max-w-[150px]">${stk.industry || 'Diversified'}</span>
        </div>
      </td>
      <td class="py-2.5 px-3 whitespace-nowrap font-mono" title="${capTooltip}">
        <div class="flex flex-col">
          <span class="font-bold text-slate-200 text-xs">${mcapCr}</span>
          <span class="text-[9px] text-slate-400 font-semibold">${capCat}</span>
        </div>
      </td>
      <td class="py-2.5 px-2 text-center whitespace-nowrap">
        ${isFno ? '<span class="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40" title="Active in NSE Futures & Options Segment">F&O</span>' : '<span class="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-800 text-slate-400 border border-slate-700" title="Cash Equities Segment">Cash</span>'}
      </td>
      <td class="py-2.5 px-3 text-right whitespace-nowrap font-mono" title="Last Traded Price: ${ltpStr} (${chgStr} today)">
        <div class="flex flex-col items-end">
          <span class="font-bold text-white text-xs">${ltpStr}</span>
          <span class="text-[10px] font-bold ${chgColor}">${chgStr}</span>
        </div>
      </td>
      <td class="py-2.5 px-3 text-center whitespace-nowrap font-mono text-[11px] text-slate-400" title="52-Week High: ₹${h52} | 52-Week Low: ₹${l52}">
        ${h52} / ${l52}
      </td>
      <td class="py-2.5 px-3">
        <div class="flex items-center gap-1 flex-wrap">
          ${tags.join('')}
        </div>
      </td>
      <td class="py-2.5 px-3 text-right whitespace-nowrap">
        <button onclick="handleAdminDeleteStock('${stk.symbol}')" class="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/25 text-rose-400 hover:text-rose-200 border border-rose-500/20 transition-all cursor-pointer" title="Delete stock ${stk.symbol} from Universe">
          <i data-lucide="trash-2" class="w-3.5 h-3.5"></i>
        </button>
      </td>
    `;

    tbody.appendChild(tr);
  });

  if (window.lucide) lucide.createIcons();
}

function handleAdminUniversePageChange(delta) {
  adminUniverseState.page += delta;
  renderAdminUniverseTable();
}

function handleAdminUniversePageSizeChange(newSize) {
  adminUniverseState.pageSize = parseInt(newSize, 10) || 50;
  adminUniverseState.page = 1;
  renderAdminUniverseTable();
}

async function handleAdminAddStock(e) {
  e.preventDefault();
  const symInput = document.getElementById('admin-new-stock-symbol');
  const nameInput = document.getElementById('admin-new-stock-name');
  const exSelect = document.getElementById('admin-new-stock-exchange');
  const secInput = document.getElementById('admin-new-stock-sector');
  const indInput = document.getElementById('admin-new-stock-industry');
  const mcapInput = document.getElementById('admin-new-stock-mcap');
  const priceInput = document.getElementById('admin-new-stock-price');
  const fnoCheck = document.getElementById('admin-new-stock-fno');
  const banner = document.getElementById('admin-add-stock-banner');

  const symbol = (symInput?.value || '').trim().toUpperCase();
  if (!symbol) return;

  const payload = {
    symbol,
    name: (nameInput?.value || '').trim() || symbol,
    exchange: exSelect?.value || 'NSE',
    sector: (secInput?.value || '').trim() || 'General',
    industry: (indInput?.value || '').trim() || 'Diversified',
    marketCap: parseFloat(mcapInput?.value) || 5000,
    price: parseFloat(priceInput?.value) || 100.0,
    fno: Boolean(fnoCheck?.checked)
  };

  try {
    const res = await fetch('/api/admin/universe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
      body: JSON.stringify(payload)
    });
    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data.error || 'Failed to add stock to universe');
    }

    if (banner) {
      banner.className = 'mt-2 p-2 rounded-lg text-xs bg-emerald-500/15 text-emerald-400 border border-emerald-500/30';
      banner.textContent = `Stock "${symbol}" successfully added to universe database!`;
    }
    showToast(`Stock "${symbol}" added to universe!`, 'success');

    // Reset inputs
    if (symInput) symInput.value = '';
    if (nameInput) nameInput.value = '';
    if (secInput) secInput.value = '';
    if (indInput) indInput.value = '';
    if (mcapInput) mcapInput.value = '';
    if (priceInput) priceInput.value = '';
    if (fnoCheck) fnoCheck.checked = false;

    // Reload universe
    await loadAdminUniverse(true);
  } catch (err) {
    if (banner) {
      banner.className = 'mt-2 p-2 rounded-lg text-xs bg-rose-500/15 text-rose-400 border border-rose-500/30';
      banner.textContent = err.message;
    }
    showToast(err.message, 'error');
  }
}

async function handleAdminDeleteStock(symbol) {
  if (!symbol) return;
  if (!confirm(`Are you sure you want to permanently remove stock "${symbol}" from the entire universe? This will remove it from all scanner engines, watchlists, and market insights.`)) {
    return;
  }

  try {
    const res = await fetch(`/api/admin/universe/${encodeURIComponent(symbol)}`, {
      method: 'DELETE',
      headers: { ...getAuthHeaders() }
    });
    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data.error || 'Failed to delete stock from universe');
    }

    showToast(`Stock "${symbol}" removed from universe!`, 'info');
    await loadAdminUniverse(true);
  } catch (err) {
    showToast(err.message, 'error');
  }
}

function handleExportUniverseCSV() {
  const list = adminUniverseState.filtered && adminUniverseState.filtered.length > 0
    ? adminUniverseState.filtered
    : adminUniverseState.stocks;

  if (!list || list.length === 0) {
    showToast('No stocks available to export', 'warning');
    return;
  }

  const headers = ['Symbol', 'Company Name', 'Exchange', 'Sector', 'Industry', 'Market Cap (Cr)', 'Cap Category', 'F&O Active', 'LTP', '1D Change %', '52W High', '52W Low', 'RSI', 'RVOL', 'Auto Ingested', 'Admin Added', 'Last Price Updated'];
  
  const rows = list.map(s => [
    `"${s.symbol || ''}"`,
    `"${(s.name || '').replace(/"/g, '""')}"`,
    `"${s.exchange || 'NSE'}"`,
    `"${(s.sector || '').replace(/"/g, '""')}"`,
    `"${(s.industry || '').replace(/"/g, '""')}"`,
    s.marketCap || 0,
    `"${s.capCategory || ''}"`,
    s.fno ? 'YES' : 'NO',
    s.price || 0,
    s.changePercent || 0,
    s.high52w || '',
    s.low52w || '',
    s.rsi || '',
    s.rvol || '',
    s.autoAdded ? 'YES' : 'NO',
    s.adminAdded ? 'YES' : 'NO',
    `"${s.lastPriceUpdated || ''}"`
  ]);

  const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\r\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `Sangam_Stock_Universe_${new Date().toISOString().split('T')[0]}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  showToast(`Exported ${list.length} stocks to CSV!`, 'success');
}

function handleAdminOpenArchitectureTab() {
  const token = state.authToken || localStorage.getItem('sangam_auth_token') || '';
  const url = token ? `/architecture.html?token=${encodeURIComponent(token)}` : '/architecture.html';
  window.open(url, '_blank');
}

function handleAdminOpenCheatsheetTab() {
  const token = state.authToken || localStorage.getItem('sangam_auth_token') || '';
  const url = token ? `/cheatsheet.html?token=${encodeURIComponent(token)}` : '/cheatsheet.html';
  window.open(url, '_blank');
}

function closeAdminDocViewer() {
  const container = document.getElementById('admin-doc-viewer-container');
  const iframe = document.getElementById('admin-doc-iframe');
  if (container) container.classList.add('hidden');
  if (iframe) iframe.src = 'about:blank';
}

let adminArchData = null;

async function loadAdminArchitecture(forceRefresh = false) {
  if (adminArchData && !forceRefresh) {
    renderAdminArchitectureUI(adminArchData);
    return;
  }

  const lastVerifiedEl = document.getElementById('admin-arch-last-verified');
  if (lastVerifiedEl && !adminArchData) {
    lastVerifiedEl.textContent = 'Auditing MongoDB Atlas & Services...';
  }

  try {
    const res = await fetch('/api/admin/architecture/status', {
      headers: { ...getAuthHeaders() }
    });
    const data = await res.json();
    if (res.ok && data.success) {
      adminArchData = data;
      renderAdminArchitectureUI(data);
      try {
        localStorage.setItem('sangam_last_arch_audit', JSON.stringify({
          timestamp: data.auditDateFormatted,
          db: data.database?.dbName,
          universe: data.database?.universeCount
        }));
      } catch (e) {}
    }
  } catch (err) {
    console.error('Failed to load architecture status:', err);
    if (lastVerifiedEl) {
      lastVerifiedEl.textContent = 'Error connecting to audit service';
    }
  }
}

async function refreshAdminArchitecture(forceRefresh = true) {
  const btn = document.getElementById('btn-admin-refresh-arch');
  const btnLabel = document.getElementById('btn-admin-refresh-arch-label');
  const lastVerifiedEl = document.getElementById('admin-arch-last-verified');

  if (btn) {
    btn.disabled = true;
    if (btnLabel) btnLabel.textContent = 'Auditing & Verifying Specs...';
    btn.classList.add('opacity-75', 'cursor-wait');
  }
  if (lastVerifiedEl) {
    lastVerifiedEl.innerHTML = `<span class="inline-flex items-center gap-1"><i data-lucide="loader-2" class="w-3 h-3 animate-spin text-teal-300"></i> Auditing Cluster...</span>`;
    if (window.lucide) lucide.createIcons();
  }

  try {
    const res = await fetch('/api/admin/architecture/refresh', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeaders()
      }
    });
    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data.error || 'Failed to refresh architecture specs');
    }

    adminArchData = data;
    renderAdminArchitectureUI(data);

    try {
      localStorage.setItem('sangam_last_arch_audit', JSON.stringify({
        timestamp: data.auditDateFormatted,
        db: data.database?.dbName,
        universe: data.database?.universeCount
      }));
    } catch (e) {}

    showToast(`✅ System Specs & Database Cluster Audited (${data.auditDateFormatted})`, 'success');
  } catch (err) {
    showToast(`Error auditing specs: ${err.message}`, 'error');
    if (lastVerifiedEl) {
      lastVerifiedEl.textContent = 'Audit failed: ' + err.message;
    }
  } finally {
    if (btn) {
      btn.disabled = false;
      if (btnLabel) btnLabel.textContent = 'Refresh & Verify System Specs';
      btn.classList.remove('opacity-75', 'cursor-wait');
    }
  }
}

function renderAdminArchitectureUI(data) {
  if (!data) return;

  // Header & Badges
  const lastVerifiedEl = document.getElementById('admin-arch-last-verified');
  const healthEl = document.getElementById('admin-arch-system-health');

  if (lastVerifiedEl) {
    lastVerifiedEl.textContent = `${data.auditDateFormatted || new Date().toLocaleString()}`;
  }
  if (healthEl) {
    healthEl.innerHTML = `<span class="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span><span>${data.systemHealth || '100% Operational & Synced'}</span>`;
  }

  // Card 1: Database
  const dbHost = document.getElementById('arch-db-host');
  const dbName = document.getElementById('arch-db-name');
  const dbUniverse = document.getElementById('arch-db-universe-count');
  const dbMeta = document.getElementById('arch-db-meta-count');
  const dbUsersScreeners = document.getElementById('arch-db-users-screeners');
  const dbBadge = document.getElementById('arch-db-badge');

  if (data.database) {
    if (dbHost) dbHost.textContent = data.database.clusterHost || 'cluster0.v9lxx1h.mongodb.net';
    if (dbName) dbName.textContent = `db: ${data.database.dbName || 'sangam_stocks'}`;
    if (dbUniverse) dbUniverse.textContent = `${(data.database.universeCount || 0).toLocaleString()} stocks`;
    if (dbMeta) dbMeta.textContent = `${(data.database.companyMetadataCount || 0).toLocaleString()} records`;
    if (dbUsersScreeners) dbUsersScreeners.textContent = `${data.database.usersCount || 0} users · ${data.database.screenersCount || 0} screeners`;
    if (dbBadge) {
      dbBadge.textContent = data.database.isConnected ? 'MongoDB Atlas' : 'Local Fallback';
      dbBadge.className = data.database.isConnected 
        ? 'px-1.5 py-0.5 rounded text-[9px] font-mono font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
        : 'px-1.5 py-0.5 rounded text-[9px] font-mono font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30';
    }
  }

  // Card 2: Market Feeds
  const feedPrimary = document.getElementById('arch-feed-primary');
  const feedStatus = document.getElementById('arch-feed-status');
  const feedQuotes = document.getElementById('arch-feed-quotes-cache');
  const feedHist = document.getElementById('arch-feed-hist-cache');
  const feedCrumb = document.getElementById('arch-feed-crumb-status');

  if (data.feeds) {
    if (feedPrimary) feedPrimary.textContent = data.feeds.activeFeed || 'DhanHQ REST v2 & WebSocket';
    if (feedStatus) feedStatus.textContent = data.feeds.backupFeedStatus || 'Fast 15ms In-Memory Fallback';
    if (feedQuotes) feedQuotes.textContent = `${(data.feeds.quotesCacheSize || data.database?.universeCount || 0).toLocaleString()} cached`;
    if (feedHist) feedHist.textContent = `${(data.feeds.historyCacheSize || data.database?.universeCount || 0).toLocaleString()} series`;
    if (feedCrumb) feedCrumb.textContent = data.feeds.yahooCrumbActive ? 'Active & Validated' : 'Ready';
  }

  // Card 3: Strategy Engines
  const stratTitle = document.getElementById('arch-strat-title');
  const stratSub = document.getElementById('arch-strat-sub');
  const stratCount = document.getElementById('arch-strat-total-count');

  if (data.strategies) {
    if (stratTitle) stratTitle.textContent = `${data.strategies.categories?.length || 6} Strategy Archetypes`;
    if (stratSub) stratSub.textContent = 'VCP · Darvas · 52W · RVOL · Snort';
    if (stratCount) stratCount.textContent = `${data.strategies.totalScreeners || 11} Screeners`;
  }

  // Card 4: Runtime & Memory
  const rtUptime = document.getElementById('arch-runtime-uptime-label');
  const rtNode = document.getElementById('arch-runtime-node');
  const rtRss = document.getElementById('arch-runtime-rss');
  const rtHeap = document.getElementById('arch-runtime-heap');
  const rtPlatform = document.getElementById('arch-runtime-platform');

  if (data.runtime) {
    if (rtUptime) rtUptime.textContent = `Uptime: ${data.runtime.uptimeFormatted || '--'}`;
    if (rtNode) rtNode.textContent = `Node ${data.runtime.nodeVersion || 'v22.x'}`;
    if (rtRss) rtRss.textContent = `${data.runtime.memoryRssMb || '--'} MB`;
    if (rtHeap) rtHeap.textContent = `${data.runtime.heapUsedMb || '--'} / ${data.runtime.heapTotalMb || '--'} MB`;
    if (rtPlatform) rtPlatform.textContent = `${data.runtime.platform || 'win32'} (${data.runtime.arch || 'x64'})`;
  }

  if (window.lucide) lucide.createIcons();
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
      <td class="py-3 px-2 text-center">
        <div class="flex flex-col items-center gap-1">
          <span class="font-bold text-slate-200">${u.watchlistsCount || 0} <span class="text-[10px] text-slate-400 font-normal">/ ${u.maxWatchlists || 5}</span></span>
          <button onclick="handleAdminSetWatchlistLimit('${u.id}', '${u.username}', ${u.maxWatchlists || 5})" class="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-teal-500/15 hover:bg-teal-500/30 text-teal-300 border border-teal-500/30 transition-all cursor-pointer flex items-center gap-0.5" title="Increase/Change max watchlists limit for ${u.username}">
            <i data-lucide="layers" class="w-2.5 h-2.5"></i>
            <span>Limit (${u.maxWatchlists || 5})</span>
          </button>
        </div>
      </td>
      <td class="py-3 px-2 text-center font-bold text-emerald-400">${u.totalStocksTracked || 0}</td>
      <td class="py-3 px-3 text-right whitespace-nowrap">
        ${isRootMaster ? `
          <div class="flex items-center justify-end gap-1.5">
            <button onclick="handleAdminSetWatchlistLimit('${u.id}', '${u.username}', ${u.maxWatchlists || 5})" class="px-2.5 py-1 rounded-lg bg-teal-500/15 hover:bg-teal-500/30 border border-teal-500/30 text-teal-300 hover:text-white text-[11px] font-semibold transition-all cursor-pointer flex items-center gap-1" title="Set Watchlist Capacity for Root Admin">
              <i data-lucide="layers" class="w-3 h-3 text-teal-400"></i>
              <span>Limit (${u.maxWatchlists || 5})</span>
            </button>
            <span class="text-[10px] text-amber-400/80 font-mono italic px-2 py-1 bg-amber-500/10 rounded-lg border border-amber-500/20">Master Root Admin</span>
          </div>
        ` : `
          <div class="flex items-center justify-end gap-1.5">
            <button onclick="handleAdminSetWatchlistLimit('${u.id}', '${u.username}', ${u.maxWatchlists || 5})" class="px-2.5 py-1 rounded-lg bg-teal-500/15 hover:bg-teal-500/30 border border-teal-500/30 text-teal-300 hover:text-white text-[11px] font-semibold transition-all cursor-pointer flex items-center gap-1" title="Increase/Change Watchlist Limit for ${u.username}">
              <i data-lucide="layers" class="w-3 h-3 text-teal-400"></i>
              <span>Watchlists (${u.maxWatchlists || 5})</span>
            </button>
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

async function handleAdminSetWatchlistLimit(userId, username, currentLimit) {
  const currentVal = parseInt(currentLimit, 10) || 5;
  const promptText = `Increase / Set Maximum Watchlists for User: "${username}"\n\nCurrent limit: ${currentVal} watchlists\nEnter new limit (1 to 100):`;
  const input = prompt(promptText, currentVal >= 5 ? currentVal + 5 : 10);
  if (input === null) return;

  const newLimit = parseInt(String(input).trim(), 10);
  if (isNaN(newLimit) || newLimit < 1 || newLimit > 100) {
    showToast('Please enter a valid number between 1 and 100', 'error');
    return;
  }

  try {
    const res = await fetch(`/api/admin/users/${userId}/watchlists-limit`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
      body: JSON.stringify({ maxWatchlists: newLimit })
    });
    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data.error || 'Failed to update watchlist limit');
    }

    showToast(data.message || `Watchlist limit for "${username}" set to ${newLimit}!`, 'success');
    await loadAdminData();
    if (state.user && (state.user.userId === userId || state.user.username === username)) {
      state.maxWatchlists = newLimit;
      renderWatchlistSelector();
    }
  } catch (err) {
    showToast(err.message, 'error');
  }
}

// -------------------------------------------------------------
// NSE Price Bands & Circuit Limits Modal Engine (2% & 5% Tracker)
// -------------------------------------------------------------

async function loadCircuitStats() {
  try {
    const res = await fetch('/api/circuit-limits');
    if (!res.ok) return;
    const data = await res.json();
    if (data.success) {
      state.circuitBandsMap = data.bands || {};
      state.circuitStats = data.stats || null;
      updateCircuitModalStats(data.stats, data.lastUpdated);
    }
  } catch (err) {
    console.warn('[Circuit] Could not load circuit stats:', err.message);
  }
}

function updateCircuitModalStats(stats, lastUpdated) {
  if (!stats) return;
  const elTotal = document.getElementById('circuit-stat-total');
  const elBand2 = document.getElementById('circuit-stat-band2');
  const elBand5 = document.getElementById('circuit-stat-band5');
  const elUpdated = document.getElementById('circuit-stat-updated');
  if (elTotal) elTotal.textContent = (stats.total || 0).toLocaleString();
  if (elBand2) elBand2.textContent = (stats.band2 || 0).toLocaleString();
  if (elBand5) elBand5.textContent = (stats.band5 || 0).toLocaleString();
  if (elUpdated) {
    if (lastUpdated) {
      const d = new Date(lastUpdated);
      elUpdated.textContent = isNaN(d.getTime()) ? lastUpdated : d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
    } else {
      elUpdated.textContent = 'Active';
    }
  }
}

function openCircuitModal() {
  const modal = document.getElementById('circuit-modal');
  if (!modal) return;
  modal.classList.remove('hidden');
  loadCircuitStats();
}

function closeCircuitModal() {
  const modal = document.getElementById('circuit-modal');
  if (!modal) return;
  modal.classList.add('hidden');
  const statusEl = document.getElementById('circuit-upload-status');
  if (statusEl) {
    statusEl.classList.add('hidden');
    statusEl.innerHTML = '';
  }
}

function switchCircuitTab(tab) {
  const tabUpload = document.getElementById('circuit-tab-upload');
  const tabPaste = document.getElementById('circuit-tab-paste');
  const viewUpload = document.getElementById('circuit-view-upload');
  const viewPaste = document.getElementById('circuit-view-paste');

  if (tab === 'upload') {
    if (tabUpload) tabUpload.className = 'px-3 py-1.5 rounded-lg font-bold text-xs bg-rose-500/20 text-rose-300 border border-rose-500/40 transition-all cursor-pointer';
    if (tabPaste) tabPaste.className = 'px-3 py-1.5 rounded-lg font-bold text-xs bg-dark-bg text-slate-400 hover:text-slate-200 border border-dark-border transition-all cursor-pointer';
    if (viewUpload) viewUpload.classList.remove('hidden');
    if (viewPaste) viewPaste.classList.add('hidden');
  } else {
    if (tabPaste) tabPaste.className = 'px-3 py-1.5 rounded-lg font-bold text-xs bg-rose-500/20 text-rose-300 border border-rose-500/40 transition-all cursor-pointer';
    if (tabUpload) tabUpload.className = 'px-3 py-1.5 rounded-lg font-bold text-xs bg-dark-bg text-slate-400 hover:text-slate-200 border border-dark-border transition-all cursor-pointer';
    if (viewPaste) viewPaste.classList.remove('hidden');
    if (viewUpload) viewUpload.classList.add('hidden');
  }
}

function handleCircuitFileSelect(event) {
  const file = event.target?.files && event.target.files[0];
  if (!file) return;
  state.selectedCircuitFile = file;
  const preview = document.getElementById('circuit-file-preview');
  const nameSpan = document.getElementById('circuit-selected-filename');
  if (nameSpan) nameSpan.textContent = `${file.name} (${(file.size / 1024).toFixed(1)} KB)`;
  if (preview) preview.classList.remove('hidden');
}

function clearSelectedCircuitFile() {
  state.selectedCircuitFile = null;
  const input = document.getElementById('circuit-file-input');
  if (input) input.value = '';
  const preview = document.getElementById('circuit-file-preview');
  if (preview) preview.classList.add('hidden');
}

async function submitCircuitData() {
  const btn = document.getElementById('btn-submit-circuit-upload');
  const statusEl = document.getElementById('circuit-upload-status');
  const viewUpload = document.getElementById('circuit-view-upload');
  const isUploadActive = viewUpload && !viewUpload.classList.contains('hidden');

  let csvContent = '';

  if (isUploadActive) {
    if (!state.selectedCircuitFile) {
      if (statusEl) {
        statusEl.className = 'p-3 rounded-xl text-xs font-semibold bg-rose-500/15 text-rose-400 border border-rose-500/30';
        statusEl.textContent = 'Please select a CSV file first.';
        statusEl.classList.remove('hidden');
      }
      return;
    }
    try {
      csvContent = await state.selectedCircuitFile.text();
    } catch (fErr) {
      if (statusEl) {
        statusEl.className = 'p-3 rounded-xl text-xs font-semibold bg-rose-500/15 text-rose-400 border border-rose-500/30';
        statusEl.textContent = 'Failed to read file: ' + fErr.message;
        statusEl.classList.remove('hidden');
      }
      return;
    }
  } else {
    const textarea = document.getElementById('circuit-paste-textarea');
    csvContent = textarea ? textarea.value.trim() : '';
    if (!csvContent) {
      if (statusEl) {
        statusEl.className = 'p-3 rounded-xl text-xs font-semibold bg-rose-500/15 text-rose-400 border border-rose-500/30';
        statusEl.textContent = 'Please paste CSV content with Symbol and Band columns.';
        statusEl.classList.remove('hidden');
      }
      return;
    }
  }

  if (btn) {
    btn.disabled = true;
    btn.innerHTML = `<i data-lucide="loader-2" class="w-3.5 h-3.5 animate-spin inline-block"></i><span>Processing...</span>`;
    if (window.lucide) lucide.createIcons();
  }

  try {
    const res = await fetch('/api/circuit-limits/upload', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ csvContent })
    });
    const data = await res.json();

    if (!res.ok || !data.success) {
      throw new Error(data.error || 'Failed to update circuit limits');
    }

    if (statusEl) {
      statusEl.className = 'p-3 rounded-xl text-xs font-semibold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30';
      statusEl.textContent = `✅ ${data.message}`;
      statusEl.classList.remove('hidden');
    }

    // Refresh state circuit band map and stats
    await loadCircuitStats();

    // Re-render tables and update current chart badge
    if (typeof renderStocksTable === 'function') renderStocksTable();
    if (typeof renderWatchlistStocks === 'function') renderWatchlistStocks();
    if (typeof renderPricescanTable === 'function' && state.pricescanResults?.length) renderPricescanTable();
    if (typeof renderSsrvolTable === 'function' && state.ssrvolResults?.length) renderSsrvolTable();
    if (typeof renderVcpscanTable === 'function' && state.vcpscanResults?.length) renderVcpscanTable();
    if (state.selectedStock) {
      updateOnChartCircuitBadge(state.selectedStock);
    }

    showToast('Circuit limits updated successfully!', 'success');
  } catch (err) {
    if (statusEl) {
      statusEl.className = 'p-3 rounded-xl text-xs font-semibold bg-rose-500/15 text-rose-400 border border-rose-500/30';
      statusEl.textContent = `❌ ${err.message}`;
      statusEl.classList.remove('hidden');
    }
    showToast(err.message, 'error');
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.innerHTML = `<i data-lucide="check" class="w-3.5 h-3.5 inline-block"></i><span>Process & Update Bands</span>`;
      if (window.lucide) lucide.createIcons();
    }
  }
}

// Window Globals for HTML onclick listeners
window.switchAdminConsoleTab = switchAdminConsoleTab;
window.openAdminConsole = openAdminConsole;
window.closeAdminConsole = closeAdminConsole;
window.toggleAdminAddUserPanel = toggleAdminAddUserPanel;
window.toggleAdminAddStockPanel = toggleAdminAddStockPanel;
window.loadAdminData = loadAdminData;
window.loadAdminUniverse = loadAdminUniverse;
window.populateAdminUniverseSectors = populateAdminUniverseSectors;
window.handleAdminUniverseFilterChange = handleAdminUniverseFilterChange;
window.applyAdminUniverseFilters = applyAdminUniverseFilters;
window.renderAdminUniverseTable = renderAdminUniverseTable;
window.handleAdminUniversePageChange = handleAdminUniversePageChange;
window.handleAdminUniversePageSizeChange = handleAdminUniversePageSizeChange;
window.handleAdminAddStock = handleAdminAddStock;
window.handleAdminDeleteStock = handleAdminDeleteStock;
window.handleExportUniverseCSV = handleExportUniverseCSV;
window.handleAdminOpenArchitectureTab = handleAdminOpenArchitectureTab;
window.handleAdminOpenCheatsheetTab = handleAdminOpenCheatsheetTab;
window.closeAdminDocViewer = closeAdminDocViewer;
window.filterAdminUserTable = filterAdminUserTable;
window.handleAdminAddUser = handleAdminAddUser;
window.handleAdminDeleteUser = handleAdminDeleteUser;
window.handleAdminResetPassword = handleAdminResetPassword;
window.handleAdminSetWatchlistLimit = handleAdminSetWatchlistLimit;
window.handleAdminUpdateMaxUsers = handleAdminUpdateMaxUsers;
window.toggleAvwapAnchorMode = toggleAvwapAnchorMode;
window.clearStockAvwaps = clearStockAvwaps;
window.cancelActiveDrawingTool = cancelActiveDrawingTool;
window.handleAltHShortcut = handleAltHShortcut;
window.handleCopyStocks = handleCopyStocks;
window.handleCopyWatchlistStocks = handleCopyWatchlistStocks;
window.exportWatchlistToCsv = exportWatchlistToCsv;
window.toggleScreenerDeck = toggleScreenerDeck;
window.handleChartThemeChange = handleChartThemeChange;
window.handleModalThemeChange = handleModalThemeChange;
window.handleCustomColorChange = handleCustomColorChange;
window.openLineSettingsModal = openLineSettingsModal;
window.closeLineSettingsModal = closeLineSettingsModal;
window.resetLineStylesToDefaults = resetLineStylesToDefaults;
window.updateLineStyle = updateLineStyle;
window.openCircuitModal = openCircuitModal;
window.closeCircuitModal = closeCircuitModal;
window.switchCircuitTab = switchCircuitTab;
window.handleCircuitFileSelect = handleCircuitFileSelect;
window.clearSelectedCircuitFile = clearSelectedCircuitFile;
window.submitCircuitData = submitCircuitData;
window.loadCircuitStats = loadCircuitStats;
window.getCircuitBadgeHtml = getCircuitBadgeHtml;
window.openChangePasswordModal = openChangePasswordModal;
window.closeChangePasswordModal = closeChangePasswordModal;
window.togglePasswordVisibility = togglePasswordVisibility;
window.handleChangePasswordSubmit = handleChangePasswordSubmit;
window.applyGuestPreset = applyGuestPreset;
window.handleAdminSaveGuestPermissions = handleAdminSaveGuestPermissions;
window.loadAdminGuestPermissions = loadAdminGuestPermissions;
window.loadGuestPermissions = loadGuestPermissions;
window.applyGuestPermissions = applyGuestPermissions;
window.loadAdminArchitecture = loadAdminArchitecture;
window.refreshAdminArchitecture = refreshAdminArchitecture;

// =============================================================
// Global Custom High-Performance Rich Tooltip Engine
// =============================================================
function initGlobalTooltipEngine() {
  let tooltipEl = document.getElementById('global-app-tooltip');
  if (!tooltipEl) {
    tooltipEl = document.createElement('div');
    tooltipEl.id = 'global-app-tooltip';
    document.body.appendChild(tooltipEl);
  }

  let currentTarget = null;
  let showTimeout = null;

  function hideTooltip() {
    clearTimeout(showTimeout);
    if (currentTarget) {
      if (currentTarget.hasAttribute('data-orig-title')) {
        currentTarget.setAttribute('title', currentTarget.getAttribute('data-orig-title'));
        currentTarget.removeAttribute('data-orig-title');
      }
      currentTarget = null;
    }
    tooltipEl.classList.remove('visible');
  }

  function showTooltip(el, text) {
    if (!text || !text.trim()) return;
    tooltipEl.textContent = text.trim();
    tooltipEl.classList.add('visible');

    const rect = el.getBoundingClientRect();
    const tooltipRect = tooltipEl.getBoundingClientRect();

    const margin = 8;
    let left = rect.left + (rect.width / 2) - (tooltipRect.width / 2);
    let top = rect.top - tooltipRect.height - 8;

    // Flip to bottom if top is out of bounds
    if (top < margin) {
      top = rect.bottom + 8;
    }

    // Clamp horizontally to viewport
    if (left < margin) left = margin;
    if (left + tooltipRect.width > window.innerWidth - margin) {
      left = window.innerWidth - tooltipRect.width - margin;
    }

    tooltipEl.style.left = Math.round(left) + 'px';
    tooltipEl.style.top = Math.round(top) + 'px';
  }

  document.addEventListener('mouseover', function(e) {
    const target = e.target.closest('[title], [data-tooltip]');
    if (!target) return;
    
    // Ignore active typing inputs
    if (target.tagName === 'INPUT' && (target.type === 'text' || target.type === 'password' || target.type === 'search') && target === document.activeElement) {
      return;
    }

    const rawText = target.getAttribute('data-tooltip') || target.getAttribute('title');
    if (!rawText || !rawText.trim()) return;

    if (target.hasAttribute('title')) {
      target.setAttribute('data-orig-title', rawText);
      target.removeAttribute('title');
    }

    currentTarget = target;
    clearTimeout(showTimeout);
    showTimeout = setTimeout(() => {
      if (currentTarget === target) {
        showTooltip(target, rawText);
      }
    }, 150);
  }, { passive: true });

  document.addEventListener('mouseout', function(e) {
    if (currentTarget && !currentTarget.contains(e.relatedTarget)) {
      hideTooltip();
    }
  }, { passive: true });

  window.addEventListener('scroll', hideTooltip, { passive: true });
  document.addEventListener('click', hideTooltip, { passive: true });
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// =============================================================
// Visual Trading Journal (Chart Screenshot & Journal Gallery)
// =============================================================

function getSelectedStockSymbol() {
  if (state.selectedStock) {
    if (typeof state.selectedStock === 'string') return state.selectedStock.toUpperCase().trim();
    if (typeof state.selectedStock === 'object' && state.selectedStock.symbol) {
      return String(state.selectedStock.symbol).toUpperCase().trim();
    }
  }
  if (state.currentStockData?.symbol) {
    return String(state.currentStockData.symbol).toUpperCase().trim();
  }
  if (el.manualStockInput?.value) {
    return String(el.manualStockInput.value).toUpperCase().trim();
  }
  return 'TATAMOTORS';
}

/**
 * Capture high-resolution visual screenshot of current chart (Price + Indicators + RSI)
 * Returns a Base64 WebP/PNG Data URL.
 */
function captureChartScreenshot() {
  if (!state.charts?.main) {
    showToast('Chart is not initialized', 'warning');
    return null;
  }

  try {
    // 1. Capture primary price + volume pane
    const mainCanvas = state.charts.main.takeScreenshot();
    if (!mainCanvas) {
      showToast('Unable to capture chart canvas', 'error');
      return null;
    }

    // 2. Capture RSI sub-pane if visible
    let rsiCanvas = null;
    const isRsiVisible = Boolean(state.toggles.rsi && state.charts.rsi && el.tvRsiPane && !el.tvRsiPane.classList.contains('hidden'));
    if (isRsiVisible) {
      try {
        rsiCanvas = state.charts.rsi.takeScreenshot();
      } catch (e) {}
    }

    // 3. Create composite off-screen canvas
    const width = mainCanvas.width;
    const separatorHeight = rsiCanvas ? 2 : 0;
    const height = mainCanvas.height + (rsiCanvas ? (rsiCanvas.height + separatorHeight) : 0);

    const compositeCanvas = document.createElement('canvas');
    compositeCanvas.width = width;
    compositeCanvas.height = height;
    const ctx = compositeCanvas.getContext('2d');
    if (!ctx) return null;

    // Draw dark background fallback
    ctx.fillStyle = '#0b0f19';
    ctx.fillRect(0, 0, width, height);

    // Draw main chart canvas
    ctx.drawImage(mainCanvas, 0, 0);

    // Draw RSI sub-pane canvas if present
    if (rsiCanvas) {
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(0, mainCanvas.height, width, separatorHeight);
      ctx.drawImage(rsiCanvas, 0, mainCanvas.height + separatorHeight);
    }

    // Draw watermark badge in top-left
    const symbol = getSelectedStockSymbol();
    const timeframe = state.activeInterval === '1wk' ? '1W (Weekly)' : (state.activeInterval === '1h' ? '1H' : (state.activeInterval === '15m' ? '15m' : (state.activeInterval === '5m' ? '5m' : '1D (Daily)')));
    const now = new Date();
    const dateStr = now.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) + ', ' + now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });

    // Watermark badge
    const badgePadX = 14;
    const badgePadY = 8;
    const badgeX = 14;
    const badgeY = 14;
    const badgeText = `${symbol} • ${timeframe} • ${dateStr}`;

    ctx.font = 'bold 12px Inter, system-ui, -apple-system, sans-serif';
    const textMetrics = ctx.measureText(badgeText);
    const badgeWidth = textMetrics.width + (badgePadX * 2);
    const badgeHeight = 28;

    // Badge background pill
    ctx.save();
    ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.4)';
    ctx.lineWidth = 1;

    if (typeof ctx.roundRect === 'function') {
      ctx.beginPath();
      ctx.roundRect(badgeX, badgeY, badgeWidth, badgeHeight, 6);
      ctx.fill();
      ctx.stroke();
    } else {
      ctx.fillRect(badgeX, badgeY, badgeWidth, badgeHeight);
      ctx.strokeRect(badgeX, badgeY, badgeWidth, badgeHeight);
    }

    // Badge text
    ctx.fillStyle = '#f8fafc';
    ctx.fillText(badgeText, badgeX + badgePadX, badgeY + 18);
    ctx.restore();

    // Convert to WebP (92% quality for great compression + crisp lines)
    try {
      return compositeCanvas.toDataURL('image/webp', 0.92);
    } catch (e) {
      return compositeCanvas.toDataURL('image/png');
    }
  } catch (err) {
    console.error('Screenshot capture failed:', err);
    showToast('Screenshot capture failed: ' + err.message, 'error');
    return null;
  }
}

/**
 * Open Save Chart Modal with live screenshot & metadata pre-filled
 */
function openSaveChartModal() {
  if (!state.user && !state.isAdmin && !state.token) {
    showToast('Please login to save charts to your journal', 'warning');
    openAuthModal('login');
    return;
  }

  const screenshot = captureChartScreenshot();
  if (!screenshot) return;

  state.journal.pendingScreenshotBase64 = screenshot;

  const symbol = getSelectedStockSymbol();
  const tfLabel = state.activeInterval === '1wk' ? 'Weekly (1W)' : (state.activeInterval === '1h' ? '1 Hour' : (state.activeInterval === '15m' ? '15 Min' : (state.activeInterval === '5m' ? '5 Min' : 'Daily (1D)')));
  const now = new Date();
  const dateFormatted = now.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) + ', ' + now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });

  const symEl = document.getElementById('save-chart-symbol');
  const tfEl = document.getElementById('save-chart-timeframe');
  const dtEl = document.getElementById('save-chart-datetime');
  const prevImg = document.getElementById('save-chart-preview-img');
  const setupEl = document.getElementById('save-chart-setup');
  const notesEl = document.getElementById('save-chart-notes');
  const alertEl = document.getElementById('save-chart-alert');
  const btnText = document.getElementById('save-chart-btn-text');
  const btnSubmit = document.getElementById('btn-submit-save-chart');

  if (symEl) symEl.textContent = symbol;
  if (tfEl) tfEl.textContent = tfLabel;
  if (dtEl) dtEl.textContent = dateFormatted;
  if (prevImg) prevImg.src = screenshot;
  if (setupEl) setupEl.value = 'None';
  if (notesEl) notesEl.value = '';
  if (alertEl) {
    alertEl.className = 'hidden p-2.5 rounded-xl text-xs font-medium';
    alertEl.textContent = '';
  }
  if (btnText) btnText.textContent = 'Save Chart';
  if (btnSubmit) btnSubmit.disabled = false;

  const modal = document.getElementById('save-chart-modal');
  if (modal) {
    modal.classList.remove('hidden');
    modal.classList.add('flex');
    if (setupEl) setupEl.focus();
  }
  lucide.createIcons();
}

function closeSaveChartModal() {
  const modal = document.getElementById('save-chart-modal');
  if (modal) {
    modal.classList.add('hidden');
    modal.classList.remove('flex');
  }
  state.journal.pendingScreenshotBase64 = null;
}

/**
 * Handle submission of Save Chart form
 */
async function handleSaveChartSubmit(e) {
  if (e) e.preventDefault();

  if (!state.journal.pendingScreenshotBase64) {
    showToast('No screenshot available. Please try again.', 'error');
    return;
  }

  const btnSubmit = document.getElementById('btn-submit-save-chart');
  const btnText = document.getElementById('save-chart-btn-text');
  const alertEl = document.getElementById('save-chart-alert');
  const setupEl = document.getElementById('save-chart-setup');
  const notesEl = document.getElementById('save-chart-notes');

  const symbol = getSelectedStockSymbol();
  const timeframe = state.activeInterval === '1wk' ? '1W' : (state.activeInterval === '1h' ? '1H' : (state.activeInterval === '15m' ? '15m' : (state.activeInterval === '5m' ? '5m' : '1D')));
  const setup = setupEl ? setupEl.value : 'None';
  const notes = notesEl ? notesEl.value.trim() : '';

  if (btnSubmit) btnSubmit.disabled = true;
  if (btnText) btnText.textContent = 'Saving...';
  if (alertEl) {
    alertEl.className = 'p-2.5 rounded-xl text-xs font-medium bg-blue-500/15 border border-blue-500/30 text-blue-300';
    alertEl.textContent = 'Uploading high-res chart to journal...';
  }

  try {
    const res = await fetch('/api/charts', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeaders()
      },
      body: JSON.stringify({
        screenshot: state.journal.pendingScreenshotBase64,
        symbol,
        timeframe,
        exchange: 'NSE',
        setup,
        notes
      })
    });

    const data = await res.json();

    if (!res.ok || !data.success) {
      throw new Error(data.error || 'Unable to save chart. Please try again.');
    }

    showToast('Chart saved successfully to journal! 📸', 'success');
    closeSaveChartModal();
    refreshJournalBadgeCount();

    // If journal modal is open, reload list
    const jModal = document.getElementById('chart-journal-modal');
    if (jModal && !jModal.classList.contains('hidden')) {
      loadJournalCharts();
    }
  } catch (err) {
    console.error('Save chart error:', err);
    if (alertEl) {
      alertEl.className = 'p-2.5 rounded-xl text-xs font-medium bg-rose-500/15 border border-rose-500/30 text-rose-300';
      alertEl.textContent = err.message || 'Unable to save chart. Please try again.';
    }
    showToast(err.message || 'Unable to save chart', 'error');
  } finally {
    if (btnSubmit) btnSubmit.disabled = false;
    if (btnText) btnText.textContent = 'Save Chart';
  }
}

/**
 * Open Chart Journal Gallery Modal
 */
function openChartJournalModal() {
  if (!state.user && !state.isAdmin && !state.token) {
    showToast('Please login to view your Chart Journal', 'warning');
    openAuthModal('login');
    return;
  }

  const modal = document.getElementById('chart-journal-modal');
  if (modal) {
    modal.classList.remove('hidden');
    modal.classList.add('flex');
    loadJournalCharts();
  }
  lucide.createIcons();
}

function closeChartJournalModal() {
  const modal = document.getElementById('chart-journal-modal');
  if (modal) {
    modal.classList.add('hidden');
    modal.classList.remove('flex');
  }
}

let journalFilterDebounce = null;
function handleJournalFilterChange() {
  if (journalFilterDebounce) clearTimeout(journalFilterDebounce);
  journalFilterDebounce = setTimeout(() => {
    loadJournalCharts();
  }, 250);
}

function selectJournalSetupFilter(setup) {
  state.journal.activeFilterSetup = setup;

  // Update pill styles
  const pills = document.querySelectorAll('.journal-filter-pill');
  pills.forEach(p => {
    if (p.getAttribute('data-setup') === setup) {
      p.className = 'journal-filter-pill px-2.5 py-1 rounded-lg font-semibold bg-indigo-600 text-white shadow-sm cursor-pointer whitespace-nowrap transition-all';
    } else {
      p.className = 'journal-filter-pill px-2.5 py-1 rounded-lg font-semibold bg-dark-bg text-slate-300 hover:text-white hover:bg-dark-accent border border-dark-border cursor-pointer whitespace-nowrap transition-all';
    }
  });

  loadJournalCharts();
}

/**
 * Fetch and render saved charts list from /api/charts
 */
async function loadJournalCharts() {
  const searchInput = document.getElementById('journal-search-input');
  const sortSelect = document.getElementById('journal-sort-select');
  const loadingEl = document.getElementById('journal-loading-state');
  const emptyEl = document.getElementById('journal-empty-state');
  const gridEl = document.getElementById('journal-cards-grid');
  const countEl = document.getElementById('journal-header-count');

  const symbolQuery = searchInput ? searchInput.value.trim() : '';
  const setupQuery = state.journal.activeFilterSetup || 'all';
  const sortQuery = sortSelect ? sortSelect.value : 'newest';

  if (loadingEl) loadingEl.classList.remove('hidden');
  if (emptyEl) emptyEl.classList.add('hidden');
  if (gridEl) gridEl.innerHTML = '';

  try {
    const params = new URLSearchParams();
    if (symbolQuery) params.append('symbol', symbolQuery);
    if (setupQuery && setupQuery !== 'all') params.append('setup', setupQuery);
    if (sortQuery) params.append('sort', sortQuery);

    const res = await fetch(`/api/charts?${params.toString()}`, {
      headers: getAuthHeaders()
    });

    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data.error || 'Failed to load journal');
    }

    state.journal.charts = data.charts || [];
    if (countEl) countEl.textContent = `${state.journal.charts.length} Chart${state.journal.charts.length === 1 ? '' : 's'}`;

    renderJournalGrid(state.journal.charts);
    updateJournalBadgeCount(state.journal.charts.length);
  } catch (err) {
    console.error('Failed to load journal:', err);
    showToast('Failed to load chart journal: ' + err.message, 'error');
  } finally {
    if (loadingEl) loadingEl.classList.add('hidden');
  }
}

function getSetupBadgeColor(setup) {
  switch ((setup || '').toUpperCase()) {
    case 'VCP':
      return 'bg-purple-500/20 text-purple-300 border-purple-500/30';
    case 'DARVAS':
      return 'bg-blue-500/20 text-blue-300 border-blue-500/30';
    case 'BREAKOUT':
      return 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30';
    case 'PULLBACK':
      return 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30';
    case 'REVERSAL':
      return 'bg-amber-500/20 text-amber-300 border-amber-500/30';
    case 'RANGE':
      return 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30';
    case 'BASE':
      return 'bg-teal-500/20 text-teal-300 border-teal-500/30';
    default:
      return 'bg-slate-700/50 text-slate-300 border-slate-600/30';
  }
}

/**
 * Render Journal Cards Grid
 */
function renderJournalGrid(charts) {
  const gridEl = document.getElementById('journal-cards-grid');
  const emptyEl = document.getElementById('journal-empty-state');
  if (!gridEl) return;

  gridEl.innerHTML = '';

  if (!charts || charts.length === 0) {
    if (emptyEl) emptyEl.classList.remove('hidden');
    return;
  }

  if (emptyEl) emptyEl.classList.add('hidden');

  charts.forEach(c => {
    const card = document.createElement('div');
    card.className = 'group bg-dark-bg/80 hover:bg-dark-card border border-dark-border hover:border-indigo-500/50 rounded-2xl overflow-hidden shadow-lg hover:shadow-2xl transition-all duration-200 flex flex-col cursor-pointer';
    card.onclick = () => openChartLightbox(c.id);

    const setupBadgeColor = getSetupBadgeColor(c.setup);
    const dateFormatted = new Date(c.createdAt || Date.now()).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
    const notesPreview = c.notes ? escapeHtml(c.notes.slice(0, 90) + (c.notes.length > 90 ? '...' : '')) : '<span class="text-slate-500 italic">No notes</span>';

    card.innerHTML = `
      <!-- Screenshot Thumbnail -->
      <div class="relative w-full aspect-video bg-black/60 overflow-hidden border-b border-dark-border">
        <img src="${c.screenshotUrl}" alt="${escapeHtml(c.symbol)}" loading="lazy" class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300">
        
        <!-- Setup Tag Floating Badge -->
        ${c.setup && c.setup !== 'None' ? `
          <div class="absolute top-2 left-2 px-2 py-0.5 rounded-md text-[10px] font-bold border backdrop-blur-md shadow-md ${setupBadgeColor}">
            ${escapeHtml(c.setup)}
          </div>
        ` : ''}

        <!-- Timeframe Floating Badge -->
        <div class="absolute top-2 right-2 px-1.5 py-0.5 rounded-md text-[10px] font-bold bg-black/70 text-sky-300 border border-white/10 backdrop-blur-md">
          ${escapeHtml(c.timeframe || '1D')}
        </div>
      </div>

      <!-- Card Metadata Body -->
      <div class="p-3.5 flex flex-col flex-1 justify-between gap-2.5">
        <div>
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-1.5">
              <span class="font-bold text-white font-mono text-sm tracking-tight">${escapeHtml(c.symbol)}</span>
              <span class="text-[10px] text-slate-400 uppercase font-semibold">(${escapeHtml(c.exchange || 'NSE')})</span>
            </div>
            <span class="text-[10px] text-slate-400">${dateFormatted}</span>
          </div>

          <div class="text-[11px] text-slate-300 leading-snug mt-2 line-clamp-2">
            ${notesPreview}
          </div>
        </div>

        <!-- Card Footer -->
        <div class="pt-2 border-t border-dark-border/60 flex items-center justify-between text-[11px] text-indigo-400 group-hover:text-indigo-300 font-semibold">
          <span class="flex items-center gap-1"><i data-lucide="zoom-in" class="w-3.5 h-3.5"></i> View Details</span>
          <button onclick="event.stopPropagation(); deleteJournalChart('${c.id}')" class="p-1 rounded text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors" title="Delete Saved Chart">
            <i data-lucide="trash-2" class="w-3.5 h-3.5"></i>
          </button>
        </div>
      </div>
    `;

    gridEl.appendChild(card);
  });

  lucide.createIcons();
}

/**
 * Open Lightbox Detail Viewer for a single saved chart
 */
function openChartLightbox(chartId) {
  const chart = state.journal.charts.find(c => c.id === chartId);
  if (!chart) return;

  state.journal.currentLightboxChart = chart;

  const symEl = document.getElementById('lightbox-symbol');
  const exEl = document.getElementById('lightbox-exchange');
  const tfEl = document.getElementById('lightbox-timeframe');
  const setupEl = document.getElementById('lightbox-setup');
  const dtEl = document.getElementById('lightbox-datetime');
  const imgEl = document.getElementById('lightbox-image');
  const notesEl = document.getElementById('lightbox-notes');
  const extLink = document.getElementById('lightbox-open-external');

  if (symEl) symEl.textContent = chart.symbol;
  if (exEl) exEl.textContent = chart.exchange || 'NSE';
  if (tfEl) tfEl.textContent = chart.timeframe || '1D';

  if (setupEl) {
    if (chart.setup && chart.setup !== 'None') {
      setupEl.textContent = chart.setup;
      setupEl.className = `px-2 py-0.5 rounded text-[10px] font-semibold border ${getSetupBadgeColor(chart.setup)}`;
      setupEl.classList.remove('hidden');
    } else {
      setupEl.classList.add('hidden');
    }
  }

  const dateFormatted = new Date(chart.createdAt || Date.now()).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) + ', ' + new Date(chart.createdAt || Date.now()).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  if (dtEl) dtEl.textContent = dateFormatted;

  if (imgEl) imgEl.src = chart.screenshotUrl;
  if (extLink) extLink.href = chart.screenshotUrl;
  if (notesEl) notesEl.textContent = chart.notes || 'No notes attached to this chart record.';

  const modal = document.getElementById('chart-lightbox-modal');
  if (modal) {
    modal.classList.remove('hidden');
    modal.classList.add('flex');
  }
  lucide.createIcons();
}

function closeChartLightboxModal() {
  const modal = document.getElementById('chart-lightbox-modal');
  if (modal) {
    modal.classList.add('hidden');
    modal.classList.remove('flex');
  }
  state.journal.currentLightboxChart = null;
}

function handleDeleteCurrentLightboxChart() {
  if (!state.journal.currentLightboxChart) return;
  const chartId = state.journal.currentLightboxChart.id;
  closeChartLightboxModal();
  deleteJournalChart(chartId);
}

/**
 * Delete a chart from the journal (with confirmation)
 */
async function deleteJournalChart(chartId) {
  if (!confirm('Are you sure you want to delete this saved chart from your journal? This will also remove the image from Cloudinary.')) {
    return;
  }

  try {
    const res = await fetch(`/api/charts/${chartId}`, {
      method: 'DELETE',
      headers: getAuthHeaders()
    });

    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data.error || 'Failed to delete chart');
    }

    showToast('Chart deleted successfully', 'info');
    state.journal.charts = state.journal.charts.filter(c => c.id !== chartId);
    renderJournalGrid(state.journal.charts);
    updateJournalBadgeCount(state.journal.charts.length);

    const countEl = document.getElementById('journal-header-count');
    if (countEl) countEl.textContent = `${state.journal.charts.length} Chart${state.journal.charts.length === 1 ? '' : 's'}`;
  } catch (err) {
    console.error('Delete chart error:', err);
    showToast('Failed to delete chart: ' + err.message, 'error');
  }
}

/**
 * Refresh badge counter in top header
 */
async function refreshJournalBadgeCount() {
  if (!state.user && !state.isAdmin && !state.token) return;
  try {
    const res = await fetch('/api/charts', {
      headers: getAuthHeaders()
    });
    const data = await res.json();
    if (res.ok && data.success && Array.isArray(data.charts)) {
      updateJournalBadgeCount(data.charts.length);
    }
  } catch (e) {}
}

function updateJournalBadgeCount(count) {
  const badge = document.getElementById('journal-count-badge');
  if (!badge) return;
  if (count > 0) {
    badge.textContent = count;
    badge.classList.remove('hidden');
  } else {
    badge.classList.add('hidden');
  }
}

window.initGlobalTooltipEngine = initGlobalTooltipEngine;
window.handleToggleGlobalDateRay = handleToggleGlobalDateRay;
window.handleGlobalRayColorChange = handleGlobalRayColorChange;
window.clearGlobalDateRay = clearGlobalDateRay;
window.promptPickGlobalRayDate = promptPickGlobalRayDate;
window.updateWatchlistsTabBadge = updateWatchlistsTabBadge;
window.toggleMeasureTool = toggleMeasureTool;
window.clearChartMeasurement = clearChartMeasurement;

// Visual Trading Journal Window Exports
window.openSaveChartModal = openSaveChartModal;
window.closeSaveChartModal = closeSaveChartModal;
window.handleSaveChartSubmit = handleSaveChartSubmit;
window.openChartJournalModal = openChartJournalModal;
window.closeChartJournalModal = closeChartJournalModal;
window.handleJournalFilterChange = handleJournalFilterChange;
window.selectJournalSetupFilter = selectJournalSetupFilter;
window.loadJournalCharts = loadJournalCharts;
window.openChartLightbox = openChartLightbox;
window.closeChartLightboxModal = closeChartLightboxModal;
window.handleDeleteCurrentLightboxChart = handleDeleteCurrentLightboxChart;
window.deleteJournalChart = deleteJournalChart;
window.refreshJournalBadgeCount = refreshJournalBadgeCount;

// High-Density ScreeningMantis Layout & Columns Window Exports
window.handleWatchlistDotClick = handleWatchlistDotClick;
window.setRecommendedFilter = setRecommendedFilter;
window.openColumnsCustomizerModal = openColumnsCustomizerModal;
window.closeColumnsCustomizerModal = closeColumnsCustomizerModal;
window.handleColumnToggle = handleColumnToggle;
window.toggleAllColumnsInGroup = toggleAllActiveColumns;
window.toggleAllActiveColumns = toggleAllActiveColumns;
window.resetDefaultColumns = resetDefaultColumns;
window.applyColumnVisibilityToTable = applyColumnVisibilityToTable;

// Bootstrap on DOM Ready
window.addEventListener('DOMContentLoaded', init);



