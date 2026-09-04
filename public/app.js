/**
 * Sangam_chartlinks - Client Application Logic
 * Featuring:
 * - 3 Distinct, Unmixed Panes: Price, Dedicated Volume + 9 SMA, Dedicated RSI (14) + 14 SMA
 * - Traditional Auto Pivot Points (P, R1, S1 only as per selected timeframe)
 * - Admin Authentication System (Patent / Patent) for Adding, Editing, Deleting Screeners
 */

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
  filterMc2000: false, // Filter stocks with Market Cap > 2000 Cr
  searchQuery: '',
  sortField: 'changePercent',
  sortAscending: false,
  runningScreeners: new Set(),
  isRunAllInProgress: false,
  isAggregatedMode: false,
  theme: localStorage.getItem('theme') || 'dark',

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

  // Indicator Visibility Toggles
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
    avwap: '#a855f7'
  },
  pivotType: 'Traditional (Auto)',

  // Interactive Chart Drawing Tools & Persisted State
  activeDrawingTool: null, // null | 'avwap'
  lastCrosshairPrice: null, // Tracked from mouse cursor on price chart for Alt+H
  drawings: {}, // symbol -> { avwaps: [time], hlines: [price] }
  activeDrawingSeries: {
    avwaps: [], // Array of LineSeries instances
    hlines: []  // Array of priceLine instances
  },

  // Chart Instances & Series
  charts: {
    main: null,
    rsi: null,
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
      rsiSma: null
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
  statTotalScreeners: document.getElementById('stat-total-screeners'),
  statTotalStocks: document.getElementById('stat-total-stocks'),
  btnRunAll: document.getElementById('btn-run-all'),
  btnOpenAddModal: document.getElementById('btn-open-add-modal'),
  btnCopyStocks: document.getElementById('btn-copy-stocks'),
  btnExportCsv: document.getElementById('btn-export-csv'),
  btnThemeToggle: document.getElementById('btn-theme-toggle'),
  themeIcon: document.getElementById('theme-icon'),
  btnNavAnalytics: document.getElementById('btn-nav-analytics'),
  btnNavFno: document.getElementById('btn-nav-fno'),
  btnAdminConsole: document.getElementById('btn-admin-console'),

  // Floating On-Chart AVWAP Controls & Drawing Helpers
  floatingAvwapControl: document.getElementById('floating-avwap-control'),
  btnFloatingAvwap: document.getElementById('btn-floating-avwap'),
  floatingAvwapLabel: document.getElementById('floating-avwap-label'),
  floatingAvwapDivider: document.getElementById('floating-avwap-divider'),
  floatingAvwapStatus: document.getElementById('floating-avwap-status'),
  btnFloatingAvwapClear: document.getElementById('btn-floating-avwap-clear'),
  
  // Multi-User Auth Controls
  btnOpenAuthModal: document.getElementById('btn-open-auth-modal'),
  userAuthBox: document.getElementById('user-auth-box'),
  userBadgeIcon: document.getElementById('user-badge-icon'),
  userBadgeName: document.getElementById('user-badge-name'),
  userBadgeRole: document.getElementById('user-badge-role'),
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
  sidebarScreenersView: document.getElementById('sidebar-screeners-view'),
  sidebarWatchlistsView: document.getElementById('sidebar-watchlists-view'),
  selectActiveWatchlist: document.getElementById('select-active-watchlist'),
  btnRenameWatchlist: document.getElementById('btn-rename-watchlist'),
  btnAddNewWatchlist: document.getElementById('btn-add-new-watchlist'),
  btnDeleteWatchlist: document.getElementById('btn-delete-watchlist'),
  wlQuickAddInput: document.getElementById('wl-quick-add-input'),
  btnWlQuickAdd: document.getElementById('btn-wl-quick-add'),
  wlCapacityLabel: document.getElementById('wl-capacity-label'),
  wlSlotsLeft: document.getElementById('wl-slots-left'),
  watchlistTbody: document.getElementById('watchlist-tbody'),
  btnRefreshWlQuotes: document.getElementById('btn-refresh-wl-quotes'),

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
  chkMc2000: document.getElementById('chk-mc2000'),
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
  chartOhlcvLegend: document.getElementById('chart-ohlcv-legend'),
  tvPricePane: document.getElementById('tv_price_pane'),
  tvMainChart: document.getElementById('tv_main_chart'),
  
  tvVolumeContainer: document.getElementById('tv_volume_container'),
  tvVolumeChart: document.getElementById('tv_volume_chart'),
  volLiveBadge: document.getElementById('vol-live-badge'),
  volAvgLiveBadge: document.getElementById('vol-avg-live-badge'),
  
  tvRsiContainer: document.getElementById('tv_rsi_container'),
  tvRsiChart: document.getElementById('tv_rsi_chart'),
  rsiLiveBadge: document.getElementById('rsi-live-badge'),
  rsiSmaLiveBadge: document.getElementById('rsi-sma-live-badge'),
  
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
  const localPrefs = JSON.parse(localStorage.getItem('user_indicator_prefs') || 'null');
  if (localPrefs) applyLoadedIndicatorPreferences(localPrefs);

  setupEventListeners();
  initNativeCharts();
  await checkAuthStatus();
  await loadScreeners();

  // Load default stock chart
  selectStock({
    symbol: 'INDSWFTLAB',
    name: 'Ind-Swift Laboratories Limited',
    close: 324.38,
    changePercent: 12.18
  });

  // Start real-time active chart ticker (4s auto-pull for zero lag)
  startActiveChartLiveTicker();

  // Sync Live Data Feed Status Badge (Dhan vs Backup)
  syncDataFeedStatus();

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
      label.textContent = '🟢 Dhan HQ Live';
    } else {
      badge.className = 'px-2 py-0.5 text-[10px] font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20 rounded-full flex items-center gap-1 transition-all';
      badge.title = 'Active Feed: Multi-Source Backup Feed (Dhan credentials not configured in environment)';
      dot.className = 'w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse';
      label.textContent = 'Backup Feed';
    }
  } catch (err) {}
}

// -------------------------------------------------------------
// User Indicator Preferences Management
// -------------------------------------------------------------

let savePrefsTimeout = null;

function saveIndicatorPreferences() {
  const prefs = {
    toggles: { ...state.toggles },
    colors: { ...state.colors },
    pivotType: state.pivotType || el.selectPivotType?.value || 'Traditional (Auto)'
  };

  localStorage.setItem('user_indicator_prefs', JSON.stringify(prefs));

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
      } catch (e) {
        console.warn('Failed to save indicator preferences to server:', e);
      }
    }, 500);
  }
}

function applyLoadedIndicatorPreferences(prefs) {
  if (!prefs) return;
  if (prefs.toggles) {
    state.toggles = { ...state.toggles, ...prefs.toggles };
  }
  if (prefs.colors) {
    state.colors = { ...state.colors, ...prefs.colors };
  }
  if (prefs.pivotType) {
    state.pivotType = prefs.pivotType;
    if (el.selectPivotType) el.selectPivotType.value = prefs.pivotType;
  }

  // Update Color Input DOM states
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

  // Update Checkbox DOM states
  if (el.chkEma10) el.chkEma10.checked = Boolean(state.toggles.ema10);
  if (el.chkEma20) el.chkEma20.checked = Boolean(state.toggles.ema20);
  if (el.chkEma50) el.chkEma50.checked = Boolean(state.toggles.ema50);
  if (el.chkEma150) el.chkEma150.checked = Boolean(state.toggles.ema150);
  if (el.chkEma200) el.chkEma200.checked = Boolean(state.toggles.ema200);
  if (el.chkVol) el.chkVol.checked = Boolean(state.toggles.volume);
  if (el.chkVolAvg) el.chkVolAvg.checked = Boolean(state.toggles.volAvg);
  if (el.chkVwap) el.chkVwap.checked = Boolean(state.toggles.vwap);
  if (el.chkPivots) el.chkPivots.checked = Boolean(state.toggles.pivots);
  if (el.chkDarvas) el.chkDarvas.checked = Boolean(state.toggles.darvas);
  if (el.chkRsi) el.chkRsi.checked = Boolean(state.toggles.rsi);

  // Apply Series Colors & Visibility
  if (state.charts?.series) {
    state.charts.series.ema10?.applyOptions({ visible: Boolean(state.toggles.ema10), color: state.colors.ema10 });
    state.charts.series.ema20?.applyOptions({ visible: Boolean(state.toggles.ema20), color: state.colors.ema20 });
    state.charts.series.ema50?.applyOptions({ visible: Boolean(state.toggles.ema50), color: state.colors.ema50 });
    state.charts.series.ema150?.applyOptions({ visible: Boolean(state.toggles.ema150), color: state.colors.ema150 });
    state.charts.series.ema200?.applyOptions({ visible: Boolean(state.toggles.ema200), color: state.colors.ema200 });
    state.charts.series.vwap?.applyOptions({ visible: Boolean(state.toggles.vwap), color: state.colors.vwap });
    state.charts.series.volAvg?.applyOptions({ visible: Boolean(state.toggles.volAvg), color: state.colors.volAvg });
    state.charts.series.darvasTop?.applyOptions({ visible: Boolean(state.toggles.darvas), color: state.colors.darvasTop });
    state.charts.series.darvasBottom?.applyOptions({ visible: Boolean(state.toggles.darvas), color: state.colors.darvasBottom });
    state.charts.series.rsi?.applyOptions({ visible: Boolean(state.toggles.rsi), color: state.colors.rsi });
    state.charts.series.rsiSma?.applyOptions({ visible: Boolean(state.toggles.rsi), color: state.colors.rsiSma });
  }

  renderPersistedDrawings();
  if (el.tvRsiContainer) {
    el.tvRsiContainer.style.display = state.toggles.rsi ? 'flex' : 'none';
  }

  updateTimeScalesVisibility();
  updatePivotLines();
  handleResize();
}

// -------------------------------------------------------------
// Authentication System (Multi-User: Max 5 Users + Admin)
// -------------------------------------------------------------

function getAuthHeaders() {
  const headers = {};
  if (state.token) {
    headers['Authorization'] = `Bearer ${state.token}`;
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

      if (data.indicatorPreferences) {
        applyLoadedIndicatorPreferences(data.indicatorPreferences);
      }

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
    el.btnNavAnalytics?.classList.remove('hidden');
    el.btnNavAnalytics?.classList.add('flex');
    el.btnNavFno?.classList.remove('hidden');
    el.btnNavFno?.classList.add('flex');
    el.btnOpenAuthModal?.classList.add('hidden');
    el.userAuthBox?.classList.remove('hidden');
    el.userAuthBox?.classList.add('flex');
    if (el.userBadgeName) el.userBadgeName.textContent = user.username;
    if (el.userBadgeRole) {
      el.userBadgeRole.textContent = user.role === 'admin' ? '(Admin)' : '(User)';
      el.userBadgeRole.className = user.role === 'admin' ? 'text-emerald-400 text-[10px] font-bold' : 'text-slate-400 text-[10px] font-normal';
    }
    // Add screener button visible to logged-in user or admin
    el.btnOpenAddModal?.classList.remove('hidden');
    el.btnOpenAddModal?.classList.add('flex');

    // Admin Console button visible strictly to admin
    if (user.role === 'admin') {
      el.btnAdminConsole?.classList.remove('hidden');
      el.btnAdminConsole?.classList.add('flex');
    } else {
      el.btnAdminConsole?.classList.add('hidden');
      el.btnAdminConsole?.classList.remove('flex');
    }
  } else {
    el.btnNavAnalytics?.classList.add('hidden');
    el.btnNavAnalytics?.classList.remove('flex');
    el.btnNavFno?.classList.add('hidden');
    el.btnNavFno?.classList.remove('flex');
    el.btnOpenAuthModal?.classList.remove('hidden');
    el.userAuthBox?.classList.add('hidden');
    el.userAuthBox?.classList.remove('flex');
    el.btnOpenAddModal?.classList.add('hidden');
    el.btnOpenAddModal?.classList.remove('flex');
    el.btnAdminConsole?.classList.add('hidden');
    el.btnAdminConsole?.classList.remove('flex');
  }

  renderScreeners();
  renderChartWatchlistDropdown();
  lucide.createIcons();
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
    state.user = { userId: data.username === 'Patent' ? 'admin' : data.username, username: data.username, role: data.role };
    state.isAdmin = (data.role === 'admin');

    updateAuthUI(state.user);
    if (data.indicatorPreferences) {
      applyLoadedIndicatorPreferences(data.indicatorPreferences);
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
    state.user = { userId: data.username, username: data.username, role: 'user' };
    state.isAdmin = false;

    updateAuthUI(state.user);
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

  updateAuthUI(null);
  switchSidebarTab('screeners');
  await loadScreeners();
  showToast('Logged out successfully.', 'info');
}

// -------------------------------------------------------------
// Left Sidebar Tabs (Screeners vs 5 Watchlists)
// -------------------------------------------------------------

function switchSidebarTab(tab) {
  state.activeSidebarTab = tab;

  if (tab === 'screeners') {
    el.tabBtnScreeners?.classList.add('bg-blue-600', 'text-white', 'shadow-sm');
    el.tabBtnScreeners?.classList.remove('bg-dark-bg', 'text-slate-400', 'border', 'border-dark-border');
    el.tabBtnWatchlists?.classList.remove('bg-amber-500', 'text-black', 'shadow-sm');
    el.tabBtnWatchlists?.classList.add('bg-dark-bg', 'text-slate-400', 'border', 'border-dark-border');

    el.sidebarScreenersView?.classList.remove('hidden');
    el.sidebarScreenersView?.classList.add('flex');
    el.sidebarWatchlistsView?.classList.add('hidden');
    el.sidebarWatchlistsView?.classList.remove('flex');
  } else {
    if (!state.user) {
      showToast('Please log in or register to access your 5 custom watchlists.', 'info');
      openAuthModal('login');
      return;
    }

    el.tabBtnWatchlists?.classList.add('bg-amber-500', 'text-black', 'shadow-sm');
    el.tabBtnWatchlists?.classList.remove('bg-dark-bg', 'text-slate-400', 'border', 'border-dark-border');
    el.tabBtnScreeners?.classList.remove('bg-blue-600', 'text-white', 'shadow-sm');
    el.tabBtnScreeners?.classList.add('bg-dark-bg', 'text-slate-400', 'border', 'border-dark-border');

    el.sidebarWatchlistsView?.classList.remove('hidden');
    el.sidebarWatchlistsView?.classList.add('flex');
    el.sidebarScreenersView?.classList.add('hidden');
    el.sidebarScreenersView?.classList.remove('flex');

    loadWatchlists();
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

function renderWatchlistSelector() {
  if (!el.selectActiveWatchlist) return;
  el.selectActiveWatchlist.innerHTML = '';

  state.watchlists.forEach(w => {
    const opt = document.createElement('option');
    opt.value = w.id;
    opt.textContent = `⭐ ${w.name} (${w.stocks.length}/50)`;
    if (w.id === state.activeWatchlistId) opt.selected = true;
    el.selectActiveWatchlist.appendChild(opt);
  });

  const activeWl = getActiveWatchlist();
  if (activeWl) {
    const count = activeWl.stocks.length;
    const slotsLeft = 50 - count;
    if (el.wlCapacityLabel) el.wlCapacityLabel.textContent = `${count} of 50 stocks filled`;
    if (el.wlSlotsLeft) {
      el.wlSlotsLeft.textContent = slotsLeft === 0 ? 'Full capacity' : `${slotsLeft} slot${slotsLeft > 1 ? 's' : ''} free`;
      el.wlSlotsLeft.className = slotsLeft === 0 ? 'text-rose-400 font-semibold' : 'text-amber-400 font-semibold';
    }
  }
}

function renderWatchlistStocks() {
  if (!el.watchlistTbody) return;
  el.watchlistTbody.innerHTML = '';

  const activeWl = getActiveWatchlist();
  if (!activeWl || !Array.isArray(activeWl.stocks) || activeWl.stocks.length === 0) {
    el.watchlistTbody.innerHTML = `
      <tr>
        <td colspan="4" class="py-16 text-center text-slate-500">
          <div class="flex flex-col items-center justify-center gap-2">
            <div class="w-10 h-10 rounded-full bg-dark-bg flex items-center justify-center text-slate-600">
              <i data-lucide="star" class="w-5 h-5 text-amber-500/40"></i>
            </div>
            <p class="text-xs font-semibold text-slate-300">Watchlist is Empty</p>
            <p class="text-[11px] text-slate-500 max-w-xs">Type a stock symbol above or click the "⭐ Watchlist" button on any chart to save stocks here.</p>
          </div>
        </td>
      </tr>
    `;
    lucide.createIcons();
    return;
  }

  activeWl.stocks.forEach(stock => {
    const isSelected = state.selectedStock && state.selectedStock.symbol === stock.symbol;
    const quote = state.watchlistQuotes[stock.symbol] || {};
    const ltpStr = quote.ltp ? fmt.currency(quote.ltp) : '...';
    const chgStr = quote.changePercent !== undefined ? fmt.percent(quote.changePercent) : '...';
    const isBull = (quote.changePercent || 0) >= 0;
    const chgBadge = quote.changePercent !== undefined
      ? (isBull ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-rose-500/10 text-rose-400 border border-rose-500/20')
      : 'text-slate-500';

    const tr = document.createElement('tr');
    tr.className = `wl-stock-row border-b border-dark-border/40 hover:bg-dark-accent/40 cursor-pointer transition-colors ${isSelected ? 'bg-amber-500/10 border-l-2 border-amber-500' : ''}`;
    tr.innerHTML = `
      <td class="py-2.5 px-3">
        <div class="flex flex-col">
          <span class="font-mono font-bold text-slate-100 text-xs">${stock.symbol}</span>
          <span class="text-[10px] text-slate-400 truncate max-w-[140px]">${stock.name || stock.symbol}</span>
        </div>
      </td>
      <td class="py-2.5 px-3 text-right font-mono font-semibold text-slate-200">${ltpStr}</td>
      <td class="py-2.5 px-3 text-right">
        <span class="px-1.5 py-0.5 rounded text-[11px] font-mono font-semibold ${chgBadge}">${chgStr}</span>
      </td>
      <td class="py-2.5 px-2 text-center">
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
        changePercent: quote.changePercent || 0
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

async function addStockToActiveWatchlist(symbol, name = '') {
  if (!state.token) {
    showToast('Please login to use watchlists', 'info');
    openAuthModal('login');
    return;
  }

  const activeWl = getActiveWatchlist();
  if (!activeWl) return;

  const cleanSymbol = symbol.trim().toUpperCase().replace(/\.(NS|BO)$/, '');
  if (!cleanSymbol) return;

  if (activeWl.stocks.length >= 50) {
    showToast(`Watchlist "${activeWl.name}" is at full capacity (50/50 stocks)`, 'error');
    return;
  }

  if (activeWl.stocks.some(s => s.symbol === cleanSymbol)) {
    showToast(`${cleanSymbol} is already in "${activeWl.name}"`, 'info');
    return;
  }

  try {
    const res = await fetch(`/api/watchlists/${activeWl.id}/stocks`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeaders()
      },
      body: JSON.stringify({ symbol: cleanSymbol, name })
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
    showToast(`Added ${cleanSymbol} to "${activeWl.name}" (${activeWl.stocks.length}/50)`, 'success');

    if (el.wlQuickAddInput) el.wlQuickAddInput.value = '';
  } catch (err) {
    showToast(err.message, 'error');
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

  if (state.watchlists.length >= 5) {
    showToast('Maximum limit of 5 watchlists reached!', 'error');
    return;
  }

  const defaultName = `Watchlist ${state.watchlists.length + 1}`;
  const name = prompt('Enter name for the new watchlist (Max 5 allowed):', defaultName);
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
    state.activeWatchlistId = data.watchlist.id;
    renderWatchlistSelector();
    renderWatchlistStocks();
    renderChartWatchlistDropdown();
    showToast(`Created watchlist "${data.watchlist.name}"`, 'success');
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

async function refreshWatchlistQuotes() {
  const activeWl = getActiveWatchlist();
  if (!activeWl || !Array.isArray(activeWl.stocks) || activeWl.stocks.length === 0) return;

  try {
    const res = await fetch(`/api/watchlists/${activeWl.id}/quotes`, {
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
    }
  } catch (err) {
    console.error('Quotes refresh error:', err);
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
      el.btnChartWatchlistToggle.className = 'p-2 rounded-xl bg-amber-500 text-black border border-amber-400 shadow-sm transition-all cursor-pointer select-none flex items-center justify-center';
      el.btnChartWatchlistToggle.innerHTML = `<i data-lucide="star" class="w-4 h-4 fill-black text-black"></i>`;
      el.btnChartWatchlistToggle.title = `${activeSym} is in your watchlist (Click to manage)`;
    } else {
      el.btnChartWatchlistToggle.className = 'p-2 rounded-xl bg-amber-500/15 hover:bg-amber-500 text-amber-400 hover:text-black border border-amber-500/30 shadow-sm transition-all cursor-pointer select-none flex items-center justify-center';
      el.btnChartWatchlistToggle.innerHTML = `<i data-lucide="star" class="w-4 h-4 fill-none text-amber-400"></i>`;
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
    const isFull = wl.stocks.length >= 50 && !isPresent;

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
        ${wl.stocks.length}/50
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

  try {
    const res = await fetch(`/api/watchlists/${wlId}/stocks`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeaders()
      },
      body: JSON.stringify({ symbol, name })
    });
    const data = await res.json();
    if (!res.ok || !data.success) throw new Error(data.error || 'Failed to add stock');

    wl.stocks.push(data.stock);
    renderWatchlistSelector();
    renderWatchlistStocks();
    renderChartWatchlistDropdown();
    refreshWatchlistQuotes();
    showToast(`Added ${symbol} to "${wl.name}" (${wl.stocks.length}/50)`, 'success');
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

// Theme handling
function applyTheme(theme) {
  state.theme = theme;
  localStorage.setItem('theme', theme);
  const root = document.documentElement;
  if (theme === 'dark') {
    root.classList.add('dark');
  } else {
    root.classList.remove('dark');
  }
  if (state.selectedStock) {
    updateNativeChartTheme();
  }
}

// Setup Event Listeners
function setupEventListeners() {
  // Theme toggle
  el.btnThemeToggle?.addEventListener('click', () => {
    applyTheme(state.theme === 'dark' ? 'light' : 'dark');
  });

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

  el.btnAddNewWatchlist?.addEventListener('click', handleCreateNewWatchlist);
  el.btnRenameWatchlist?.addEventListener('click', openRenameModal);
  el.btnDeleteWatchlist?.addEventListener('click', handleDeleteWatchlist);
  el.renameWatchlistForm?.addEventListener('submit', handleRenameWatchlistSubmit);
  el.renameWatchlistModal?.addEventListener('click', e => {
    if (e.target === el.renameWatchlistModal) closeRenameModal();
  });
  el.btnRefreshWlQuotes?.addEventListener('click', refreshWatchlistQuotes);

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
    document.querySelectorAll('.cat-pill').forEach(p => p.classList.remove('active'));
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

  // Stock Search Filter
  el.stockSearchInput?.addEventListener('input', e => {
    state.searchQuery = e.target.value.toLowerCase().trim();
    renderStocksTable();
  });

  // Table Column Sorting
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

  // Timeframe Buttons (Daily, Weekly)
  document.querySelectorAll('.timeframe-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.timeframe-btn').forEach(b => {
        b.classList.remove('active', 'bg-blue-600', 'text-white', 'shadow');
        b.classList.add('hover:text-white');
      });
      btn.classList.add('active', 'bg-blue-600', 'text-white', 'shadow');
      btn.classList.remove('hover:text-white');
      state.activeInterval = btn.dataset.interval;
      if (state.selectedStock) loadStockChart(state.selectedStock.symbol);
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

  // Market Cap > 2000 Cr Filter Checkbox
  if (el.chkMc2000) {
    el.chkMc2000.addEventListener('change', e => {
      state.filterMc2000 = e.target.checked;
      renderStocksTable();
    });
  }

  // Initialize Predictive Autocomplete Search on Manual Stock Input
  setupPredictiveSearch();

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
      updateTimeScalesVisibility();
      handleResize();
    }
  });

  // Pivot Type Selector
  if (el.selectPivotType) {
    el.selectPivotType.addEventListener('change', e => {
      state.pivotType = e.target.value;
      saveIndicatorPreferences();
      if (state.selectedStock) loadStockChart(state.selectedStock.symbol);
    });
  }

  // Export CSV
  el.btnExportCsv?.addEventListener('click', exportToCsv);

  // Modal Triggers
  el.btnOpenAddModal?.addEventListener('click', openAddModal);
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

  // Initialize Draggable Pane Resizers
  setupPaneResizers();
}

// -------------------------------------------------------------
// Native Lightweight Charts Engine (Price + Bottom Volume Overlay & RSI Pane)
// -------------------------------------------------------------

function initNativeCharts() {
  if (typeof LightweightCharts === 'undefined') {
    console.error('LightweightCharts library not loaded');
    return;
  }

  const isDark = state.theme === 'dark';
  const bgColor = isDark ? '#0b0f19' : '#ffffff';
  const textColor = isDark ? '#94a3b8' : '#64748b';
  const gridColor = isDark ? 'rgba(255, 255, 255, 0.04)' : 'rgba(0, 0, 0, 0.04)';
  const borderColor = isDark ? '#1f293d' : '#e2e8f0';

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
      vertLine: { color: 'rgba(59, 130, 246, 0.5)', width: 1, style: 2 },
      horzLine: { color: 'rgba(59, 130, 246, 0.5)', width: 1, style: 2 }
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
      scaleMargins: { top: 0.08, bottom: 0.25 } // Leaves bottom 25% for integrated volume
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

  // Candlestick Series
  const candlestickSeries = mainChart.addCandlestickSeries({
    upColor: '#10b981',
    downColor: '#ef4444',
    borderVisible: false,
    wickUpColor: '#10b981',
    wickDownColor: '#ef4444'
  });

  // Volume Histogram Series (Integrated at bottom of main chart via overlay scale)
  const volumeSeries = mainChart.addHistogramSeries({
    color: '#26a69a',
    priceFormat: { type: 'volume' },
    priceScaleId: '' // overlay scale
  });
  volumeSeries.priceScale().applyOptions({
    scaleMargins: { top: 0.75, bottom: 0 } // Bottom 25%
  });

  // 9-Period Volume SMA Overlay Line
  const volAvgSeries = mainChart.addLineSeries({
    color: state.colors.volAvg || '#fbbf24',
    lineWidth: 1.5,
    priceFormat: { type: 'volume' },
    priceScaleId: '', // overlay scale
    title: '',
    priceLineVisible: false,
    lastValueVisible: false,
    crosshairMarkerVisible: false
  });

  // EMA Lines (WITHOUT ANY TEXT LABELS or crosshair circle markers)
  const ema10Series = mainChart.addLineSeries({
    color: state.colors.ema10 || '#0284c7',
    lineWidth: 1.5,
    title: '',
    priceLineVisible: false,
    lastValueVisible: false,
    crosshairMarkerVisible: false
  });

  const ema20Series = mainChart.addLineSeries({
    color: state.colors.ema20 || '#2563eb',
    lineWidth: 1.5,
    title: '',
    priceLineVisible: false,
    lastValueVisible: false,
    crosshairMarkerVisible: false
  });

  const ema50Series = mainChart.addLineSeries({
    color: state.colors.ema50 || '#f59e0b',
    lineWidth: 1.5,
    title: '',
    priceLineVisible: false,
    lastValueVisible: false,
    crosshairMarkerVisible: false
  });

  const ema150Series = mainChart.addLineSeries({
    color: state.colors.ema150 || '#9333ea',
    lineWidth: 2,
    title: '',
    priceLineVisible: false,
    lastValueVisible: false,
    crosshairMarkerVisible: false
  });

  const ema200Series = mainChart.addLineSeries({
    color: state.colors.ema200 || '#e11d48',
    lineWidth: 2,
    title: '',
    priceLineVisible: false,
    lastValueVisible: false,
    crosshairMarkerVisible: false
  });

  // VWAP Line (WITHOUT ANY TEXT LABELS or circle markers)
  const vwapSeries = mainChart.addLineSeries({
    color: state.colors.vwap || '#eab308',
    lineWidth: 1.8,
    title: '',
    priceLineVisible: false,
    lastValueVisible: false,
    crosshairMarkerVisible: false
  });

  // Darvas Box - Top Box Line (Green, lineWidth 2.5)
  const darvasTopSeries = mainChart.addLineSeries({
    color: state.colors.darvasTop || '#10b981',
    lineWidth: 2.5,
    title: '',
    priceLineVisible: false,
    lastValueVisible: false,
    crosshairMarkerVisible: false
  });

  // Darvas Box - Bottom Box Line (Red, lineWidth 2.5)
  const darvasBottomSeries = mainChart.addLineSeries({
    color: state.colors.darvasBottom || '#ef4444',
    lineWidth: 2.5,
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

  // RSI Line
  const rsiSeries = rsiChart.addLineSeries({
    color: state.colors.rsi || '#60a5fa',
    lineWidth: 2,
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
    lineWidth: 1.5,
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
    axisLabelVisible: true,
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
    axisLabelVisible: true,
    title: '30'
  });

  // ==========================================
  // Synchronize TimeScales across Main and RSI charts
  // ==========================================
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

  // ==========================================
  // Synchronize Crosshairs & Legend Updates
  // ==========================================
  function handleCrosshairUpdate(param) {
    if (!param.time) {
      updateDefaultLegend();
      return;
    }

    // Track price at current mouse crosshair point for Alt+H
    if (param.point && candlestickSeries) {
      const p = candlestickSeries.coordinateToPrice(param.point.y);
      if (typeof p === 'number' && !isNaN(p)) {
        state.lastCrosshairPrice = Number(p.toFixed(2));
      }
    }

    const candle = param.seriesData.get(candlestickSeries) || state.currentStockData?.candles?.find(c => c.time === param.time);
    const vol = param.seriesData.get(volumeSeries) || state.currentStockData?.volumeSeries?.find(v => v.time === param.time);
    const volAvg = param.seriesData.get(volAvgSeries) || state.currentStockData?.volAvg9?.find(v => v.time === param.time);
    const rsiVal = state.currentStockData?.rsi14?.find(r => r.time === param.time)?.value;
    const rsiSmaVal = state.currentStockData?.rsiSma14?.find(r => r.time === param.time)?.value;
    const vwapVal = param.seriesData.get(vwapSeries) || state.currentStockData?.vwapSeries?.find(w => w.time === param.time);

    if (candle) {
      const isUp = candle.close >= candle.open;
      const chgColor = isUp ? 'text-emerald-400' : 'text-rose-400';
      
      let formattedTime = param.time;
      if (typeof param.time === 'number') {
        const d = new Date(param.time * 1000);
        formattedTime = `${d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })} ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
      }

      el.chartOhlcvLegend.innerHTML = `
        <span class="text-slate-300 font-semibold">${formattedTime}</span>
        <span>O: <strong class="text-slate-200 font-mono">${candle.open?.toFixed(2)}</strong></span>
        <span>H: <strong class="text-slate-200 font-mono">${candle.high?.toFixed(2)}</strong></span>
        <span>L: <strong class="text-slate-200 font-mono">${candle.low?.toFixed(2)}</strong></span>
        <span>C: <strong class="${chgColor} font-mono">${candle.close?.toFixed(2)}</strong></span>
        ${vol ? `<span>Vol: <strong class="text-teal-400 font-mono">${fmt.volume(vol.value)}</strong></span>` : ''}
        ${volAvg ? `<span>AvgVol(9): <strong class="text-amber-400 font-mono">${fmt.volume(volAvg.value)}</strong></span>` : ''}
        ${vwapVal ? `<span>VWAP: <strong class="text-yellow-400 font-mono">₹${vwapVal.value?.toFixed(2)}</strong></span>` : ''}
        ${rsiVal ? `<span>RSI: <strong class="text-blue-400 font-mono">${rsiVal}</strong></span>` : ''}
        ${rsiSmaVal ? `<span>RSI-SMA: <strong class="text-amber-400 font-mono">${rsiSmaVal}</strong></span>` : ''}
      `;
    }

    if (vol && el.volLiveBadge) {
      el.volLiveBadge.textContent = fmt.volume(vol.value);
    }
    if (volAvg && el.volAvgLiveBadge) {
      el.volAvgLiveBadge.textContent = fmt.volume(volAvg.value);
    }
    if (rsiVal !== undefined && el.rsiLiveBadge) {
      el.rsiLiveBadge.textContent = rsiVal;
    }
    if (rsiSmaVal !== undefined && el.rsiSmaLiveBadge) {
      el.rsiSmaLiveBadge.textContent = rsiSmaVal;
    }
  }

  mainChart.subscribeCrosshairMove(handleCrosshairUpdate);
  rsiChart.subscribeCrosshairMove(handleCrosshairUpdate);
  mainChart.subscribeClick(handleChartClick);

  // Store references
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
  const isRsiVisible = el.tvRsiContainer && el.tvRsiContainer.style.display !== 'none';
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
  
  const mainRect = el.tvMainChart.getBoundingClientRect();
  state.charts.main.applyOptions({
    width: mainRect.width,
    height: mainRect.height || 420
  });

  if (state.charts.rsi && el.tvRsiContainer && el.tvRsiContainer.style.display !== 'none') {
    const rsiRect = el.tvRsiChart.getBoundingClientRect();
    state.charts.rsi.applyOptions({
      width: rsiRect.width || mainRect.width,
      height: rsiRect.height || 100
    });
  }
}

// Set viewport zoom to activeRange (3M, 6M, 12M) without discarding historical candles
function applyActiveRangeZoom() {
  const totalCandles = state.currentStockData?.candles?.length || 0;
  if (totalCandles === 0 || !state.charts.main) return;

  let barCount = 250;
  const isWeekly = state.activeInterval === '1wk';
  if (state.activeRange === '3mo') {
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

// Draggable Pane Resizer between Price+Volume and RSI pane
function setupPaneResizers() {
  const resizerPriceRsi = document.getElementById('resizer-price-rsi');
  const pricePane = document.getElementById('tv_price_pane');
  const rsiContainer = document.getElementById('tv_rsi_container');

  if (!resizerPriceRsi || !pricePane || !rsiContainer) return;

  let isDragging = false;
  let startY = 0;
  let startPriceH = 0;
  let startRsiH = 0;

  const onMouseDown = (e) => {
    isDragging = true;
    startY = e.clientY;
    startPriceH = pricePane.clientHeight;
    startRsiH = rsiContainer.clientHeight;
    document.body.style.cursor = 'row-resize';
    document.body.style.userSelect = 'none';
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  };

  const onMouseMove = (e) => {
    if (!isDragging) return;
    const deltaY = e.clientY - startY;
    const newPriceH = Math.max(200, startPriceH + deltaY);
    const newRsiH = Math.max(40, startRsiH - deltaY);
    pricePane.style.flex = 'none';
    pricePane.style.height = `${newPriceH}px`;
    rsiContainer.style.height = `${newRsiH}px`;
    handleResize();
  };

  const onMouseUp = () => {
    if (!isDragging) return;
    isDragging = false;
    document.body.style.cursor = '';
    document.body.style.userSelect = '';
    window.removeEventListener('mousemove', onMouseMove);
    window.removeEventListener('mouseup', onMouseUp);
    handleResize();
  };

  resizerPriceRsi.addEventListener('mousedown', onMouseDown);
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
            <span class="text-[9px] px-1 py-0.2 rounded bg-blue-500/15 text-blue-400 font-mono font-semibold">${item.exchange || 'NSE'}</span>
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

function updateNativeChartTheme() {
  if (!state.charts.main) return;
  const isDark = state.theme === 'dark';
  const bgColor = isDark ? '#0b0f19' : '#ffffff';
  const textColor = isDark ? '#94a3b8' : '#334155';
  const gridColor = isDark ? 'rgba(255, 255, 255, 0.04)' : 'rgba(0, 0, 0, 0.06)';
  const borderColor = isDark ? '#1f293d' : '#cbd5e1';

  const themeOpts = {
    layout: { background: { color: bgColor }, textColor },
    grid: { vertLines: { color: gridColor }, horzLines: { color: gridColor } },
    rightPriceScale: { borderColor },
    timeScale: { borderColor }
  };

  state.charts.main.applyOptions(themeOpts);
  if (state.charts.rsi) state.charts.rsi.applyOptions(themeOpts);
}

// Draw ONLY Pivot line (P), Resistance line 1 (R1), and Support line 1 (S1)
function updatePivotLines() {
  const { candles } = state.charts.series;
  if (!candles) return;

  // Clear existing pivot lines
  if (state.charts.pivotLines && state.charts.pivotLines.length > 0) {
    state.charts.pivotLines.forEach(line => {
      try { candles.removePriceLine(line); } catch (e) {}
    });
    state.charts.pivotLines = [];
  }

  if (!state.toggles.pivots || !state.currentStockData?.pivotPoints) return;

  const { p, r1, s1 } = state.currentStockData.pivotPoints;

  // EXACTLY 3 lines only: P, R1, S1
  state.charts.pivotLines = [
    candles.createPriceLine({ price: p, color: '#06b6d4', lineWidth: 1.2, lineStyle: 2, axisLabelVisible: true, title: `P ${p}` }),
    candles.createPriceLine({ price: r1, color: '#f97316', lineWidth: 1.2, lineStyle: 2, axisLabelVisible: true, title: `R1 ${r1}` }),
    candles.createPriceLine({ price: s1, color: '#10b981', lineWidth: 1.2, lineStyle: 2, axisLabelVisible: true, title: `S1 ${s1}` })
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

function handleChartClick(param) {
  if (!state.activeDrawingTool) return;
  const currentSymbol = state.selectedStock?.symbol;
  if (!currentSymbol) return;

  if (!state.drawings[currentSymbol]) {
    state.drawings[currentSymbol] = { avwaps: [], hlines: [] };
  }

  if (state.activeDrawingTool === 'avwap') {
    if (!param.time) return;
    const anchorTime = param.time;
    
    // Replace previous AVWAP anchor or add
    state.drawings[currentSymbol].avwaps = [anchorTime];
    renderPersistedDrawings();
    
    let dateStr = anchorTime;
    if (typeof anchorTime === 'number') {
      const d = new Date(anchorTime * 1000);
      dateStr = d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
    }
    showToast(`⚓ Anchored VWAP plotted from ${dateStr}!`, 'success');
    state.activeDrawingTool = null;
    updateAvwapWidgetUI();
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
  showToast(`─ Horizontal Line placed at ₹${price.toLocaleString('en-IN')}`, 'success');
}

function toggleAvwapAnchorMode() {
  state.activeDrawingTool = (state.activeDrawingTool === 'avwap') ? null : 'avwap';
  updateAvwapWidgetUI();
}

function updateAvwapWidgetUI() {
  const currentSymbol = state.selectedStock?.symbol;
  const stockDrawings = (currentSymbol && state.drawings[currentSymbol]) ? state.drawings[currentSymbol] : { avwaps: [], hlines: [] };
  const hasAvwap = stockDrawings.avwaps && stockDrawings.avwaps.length > 0;

  if (state.activeDrawingTool === 'avwap') {
    if (el.btnFloatingAvwap) {
      el.btnFloatingAvwap.classList.add('text-purple-400', 'animate-pulse');
    }
  } else {
    if (el.btnFloatingAvwap) {
      el.btnFloatingAvwap.classList.remove('text-purple-400', 'animate-pulse');
    }
  }

  if (hasAvwap) {
    const lastAnchor = stockDrawings.avwaps[stockDrawings.avwaps.length - 1];
    let anchorText = '';
    if (typeof lastAnchor === 'number') {
      const d = new Date(lastAnchor * 1000);
      anchorText = d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
    } else if (typeof lastAnchor === 'string') {
      anchorText = lastAnchor;
    }
    if (el.floatingAvwapDivider) el.floatingAvwapDivider.classList.remove('hidden');
    if (el.floatingAvwapStatus) {
      el.floatingAvwapStatus.classList.remove('hidden');
      el.floatingAvwapStatus.textContent = anchorText;
    }
    if (el.btnFloatingAvwapClear) el.btnFloatingAvwapClear.classList.remove('hidden');
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
  updateAvwapWidgetUI();
  showToast('Anchored VWAP removed', 'info');
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

  const stockDrawings = state.drawings[currentSymbol] || { avwaps: [], hlines: [] };
  const avwapColors = ['#a855f7', '#ec4899', '#06b6d4', '#10b981', '#f59e0b'];

  // 3. Render AVWAPs for current stock
  (stockDrawings.avwaps || []).forEach((anchorTime, idx) => {
    const avwapData = calculateAnchoredVwap(state.currentStockData.candles, anchorTime);
    if (avwapData.length > 0) {
      const color = state.colors.avwap || avwapColors[idx % avwapColors.length];
      const avSeries = state.charts.main.addLineSeries({
        color: color,
        lineWidth: 2,
        title: '',
        priceLineVisible: false,
        lastValueVisible: false,
        crosshairMarkerVisible: false
      });
      avSeries.setData(avwapData);
      state.activeDrawingSeries.avwaps.push(avSeries);
    }
  });

  // 4. Render H-lines for current stock
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
  } else {
    list = (state.currentStocks || []).filter(stock => {
      if (state.filterMc2000 && stock.mcOver2000Cr !== true) return false;
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
// Keyboard Arrow Navigation (↑ / ↓)
// -------------------------------------------------------------

function setupKeyboardNavigation() {
  window.addEventListener('keydown', (e) => {
    const tag = document.activeElement?.tagName?.toLowerCase();
    if (tag === 'input' || tag === 'textarea' || tag === 'select') {
      if (e.key === 'Escape') {
        document.activeElement.blur();
        cancelActiveDrawingTool();
      }
      return;
    }

    if (e.key === 'Escape') {
      cancelActiveDrawingTool();
      return;
    }

    if (e.key === 'ArrowDown' || e.key === 'ArrowUp' || e.key === 'j' || e.key === 'k') {
      let list = [];
      if (state.activeSidebarTab === 'watchlists') {
        const activeWl = getActiveWatchlist();
        list = activeWl ? activeWl.stocks || [] : [];
      } else {
        list = (state.currentStocks || []).filter(stock => {
          if (state.filterMc2000 && stock.mcOver2000Cr !== true) return false;
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

      if (!list || list.length === 0) return;

      const currentSym = state.selectedStock?.symbol;
      const currentIndex = list.findIndex(s => s.symbol === currentSym);

      let targetIndex = 0;
      if (e.key === 'ArrowDown' || e.key === 'j') {
        e.preventDefault();
        targetIndex = currentIndex === -1 ? 0 : Math.min(currentIndex + 1, list.length - 1);
      } else if (e.key === 'ArrowUp' || e.key === 'k') {
        e.preventDefault();
        targetIndex = currentIndex === -1 ? 0 : Math.max(currentIndex - 1, 0);
      }

      if (targetIndex >= 0 && targetIndex < list.length && targetIndex !== currentIndex) {
        const nextStock = list[targetIndex];
        selectStock(nextStock);

        const tbody = state.activeSidebarTab === 'watchlists' ? el.watchlistTbody : el.stocksTbody;
        if (tbody) {
          const rows = tbody.querySelectorAll('tr.stock-row');
          rows.forEach((r, idx) => {
            if (idx === targetIndex) {
              r.classList.add('selected', 'bg-blue-600/20');
              r.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
            } else {
              r.classList.remove('selected', 'bg-blue-600/20');
            }
          });
        }
      }
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
      formattedTime = `${d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })} ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
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
    if (el.rsiLiveBadge) {
      el.rsiLiveBadge.textContent = state.currentStockData.latestRSI || '--';
    }
    if (el.rsiSmaLiveBadge) {
      el.rsiSmaLiveBadge.textContent = state.currentStockData.latestRsiSMA || '--';
    }
  }
}

// -------------------------------------------------------------
// Load Stock Data & Populate 3 Panes
// -------------------------------------------------------------

async function loadStockChart(rawSymbol) {
  if (!rawSymbol) return;
  const cleanSymbol = rawSymbol.trim().toUpperCase();

  // Show loading spinner
  el.chartLoadingOverlay.classList.remove('hidden');
  el.chartLoadingOverlay.classList.add('flex');

  try {
    const res = await fetch(`/api/stocks/${encodeURIComponent(cleanSymbol)}/history?interval=${state.activeInterval}&range=${state.activeRange}`);
    const data = await res.json();

    if (!res.ok || !data.success) {
      throw new Error(data.error || 'Historical data not available for this stock');
    }

    state.currentStockData = data;

    // Update Header Details
    if (el.chartSymbolAvatar) el.chartSymbolAvatar.textContent = cleanSymbol.substring(0, 3);
    if (el.manualStockInput) el.manualStockInput.value = cleanSymbol;
    if (el.chartStockSymbol) {
      if ('value' in el.chartStockSymbol) el.chartStockSymbol.value = cleanSymbol;
      else el.chartStockSymbol.textContent = cleanSymbol;
    }
    if (el.chartStockLtp) el.chartStockLtp.textContent = fmt.currency(data.ltp);
    if (el.chartStockExchange) el.chartStockExchange.textContent = data.exchange || 'NSE';
    
    // Percent change pill
    if (el.chartStockChange) {
      const isBull = (data.changePercent || 0) >= 0;
      el.chartStockChange.className = `px-2 py-0.5 text-xs font-semibold rounded-md ${
        isBull ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
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

    // Render any active drawings (AVWAPs, H-lines, V-lines) for this stock
    renderPersistedDrawings();

    // Set initial visible range based on activeRange (3M, 6M, 12M)
    // while keeping all full history available for backwards scrolling
    applyActiveRangeZoom();

    if (el.manualStockInput) {
      el.manualStockInput.value = cleanSymbol;
      adjustStockInputWidth();
    }
    
    updateDefaultLegend();

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

    updateDefaultLegend();
  } catch (err) {}
}

async function syncScreenedStocksLivePrices() {
  if (!state.currentStocks || state.currentStocks.length === 0) return;
  const symbols = state.currentStocks.map(s => s.symbol).filter(Boolean);
  if (symbols.length === 0) return;

  try {
    const res = await fetch(`/api/fno/live-quotes?symbols=${encodeURIComponent(symbols.slice(0, 80).join(','))}`);
    const data = await res.json();
    if (data.success && data.quotes) {
      let updated = false;
      state.currentStocks.forEach(s => {
        const q = data.quotes[s.symbol.toUpperCase()];
        if (q && q.price) {
          s.price = q.price;
          if (q.changePercent != null) s.changePercent = q.changePercent;
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
  document.querySelectorAll('.stock-row').forEach(row => row.classList.remove('selected', 'bg-blue-600/20'));
  const matchingRow = Array.from(document.querySelectorAll('.stock-row')).find(row => {
    return row.querySelector('span.font-mono')?.textContent?.trim() === stock.symbol;
  });
  if (matchingRow) matchingRow.classList.add('selected', 'bg-blue-600/20');

  if (el.chartStockName) el.chartStockName.textContent = stock.name || stock.symbol;
  loadStockChart(stock.symbol);
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
      <div class="col-span-full py-8 text-center text-slate-500 text-xs">
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
    let badgeClass = 'badge-default';
    if (isCustom || catLower === 'custom') badgeClass = 'bg-purple-500/15 text-purple-300 border-purple-500/30';
    else if (catLower.includes('intraday')) badgeClass = 'badge-intraday';
    else if (catLower.includes('breakout')) badgeClass = 'badge-breakout';
    else if (catLower.includes('swing')) badgeClass = 'badge-swing';
    else if (catLower.includes('momentum')) badgeClass = 'badge-momentum';
    else if (catLower.includes('reversal')) badgeClass = 'badge-reversal';

    const card = document.createElement('div');
    card.className = `screener-card p-3 rounded-xl border bg-dark-bg/60 border-dark-border ${isActive ? 'active' : ''} ${isRunning ? 'running' : ''} flex flex-col justify-between gap-2.5`;
    card.dataset.id = screener.id;

    // Screener action buttons (visible for admin on all, or user on their custom screeners)
    const actionsHtml = canEditOrDelete ? `
      <button class="btn-edit-scr text-slate-500 hover:text-slate-200 p-0.5 rounded transition-colors" title="Edit Screener" data-id="${screener.id}">
        <i data-lucide="edit-3" class="w-3 h-3"></i>
      </button>
      <button class="btn-del-scr text-slate-500 hover:text-red-400 p-0.5 rounded transition-colors" title="Delete Screener" data-id="${screener.id}">
        <i data-lucide="trash-2" class="w-3 h-3"></i>
      </button>
    ` : '';

    const customIndicator = isCustom ? `
      <span class="px-1 py-0.2 rounded text-[9px] font-semibold bg-purple-500/20 text-purple-300 border border-purple-500/30">Custom</span>
    ` : '';

    card.innerHTML = `
      <div>
        <div class="flex items-center justify-between gap-1.5 mb-1.5">
          <div class="flex items-center gap-1">
            <span class="px-2 py-0.5 text-[10px] font-semibold rounded-md border ${badgeClass}">
              ${screener.category || 'General'}
            </span>
            ${customIndicator}
          </div>
          
          <div class="flex items-center gap-1">
            ${count > 0 ? `
              <span class="px-1.5 py-0.5 text-[10px] font-mono font-semibold rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                ${count}
              </span>
            ` : ''}
            ${actionsHtml}
          </div>
        </div>

        <h4 class="text-xs font-bold text-slate-200 line-clamp-1 group-hover:text-blue-400">
          ${screener.name}
        </h4>
        <p class="text-[11px] text-slate-500 line-clamp-1 mt-0.5">
          ${screener.description || screener.url}
        </p>
      </div>

      <div class="flex items-center justify-between gap-2 pt-1 border-t border-dark-border/40">
        <span class="text-[10px] text-slate-500 font-mono">
          ${screener.lastRun ? fmt.time(screener.lastRun) : 'Not run'}
        </span>
        
        <button class="btn-run-scr px-2.5 py-1 text-[11px] font-semibold rounded-lg flex items-center gap-1 transition-all ${
          isRunning 
            ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20 pointer-events-none' 
            : isActive 
              ? 'bg-blue-600 text-white shadow-sm' 
              : 'bg-dark-accent hover:bg-blue-600 hover:text-white text-slate-300'
        }" data-id="${screener.id}">
          ${isRunning ? `
            <svg class="animate-spin -ml-0.5 mr-1 h-3 w-3 text-amber-400" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <span>Running...</span>
          ` : `
            <i data-lucide="play" class="w-3 h-3"></i>
            <span>Run</span>
          `}
        </button>
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
    if (state.filterMc2000 && stock.mcOver2000Cr !== true) {
      return false;
    }
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

  if (el.visibleStocksCount) el.visibleStocksCount.textContent = list.length;
  if (el.resultsFooterMeta) el.resultsFooterMeta.textContent = `${list.length} displayed`;

  if (list.length === 0) {
    el.stocksTbody.innerHTML = `
      <tr>
        <td colspan="5" class="py-16 text-center text-slate-500">
          <div class="flex flex-col items-center justify-center gap-2">
            <i data-lucide="search-x" class="w-6 h-6 text-slate-600"></i>
            <p class="text-sm font-medium text-slate-400">No matching stocks found</p>
            <p class="text-xs text-slate-500">Try adjusting your search filter or turning off the Market Cap filter.</p>
          </div>
        </td>
      </tr>
    `;
    lucide.createIcons();
    return;
  }

  list.forEach(stock => {
    const isSelected = state.selectedStock && state.selectedStock.symbol === stock.symbol;
    const isBull = stock.changePercent >= 0;
    const changeBadge = isBull 
      ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
      : 'bg-rose-500/10 text-rose-400 border border-rose-500/20';

    const tr = document.createElement('tr');
    tr.className = `stock-row border-b border-dark-border/40 ${isSelected ? 'selected' : ''}`;
    
    let confluenceHtml = '';
    if (stock.matchCount && stock.matchCount > 1) {
      confluenceHtml = `
        <span class="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-400 border border-amber-500/30 text-[9px] font-bold" title="${(stock.matchingScreeners || []).join(', ')}">
          <i data-lucide="zap" class="w-2.5 h-2.5"></i>
          ${stock.matchCount}x Confluence
        </span>
      `;
    }

    const mcBadgeHtml = stock.mcOver2000Cr ? `
      <span class="px-1 py-0.2 rounded bg-indigo-500/15 text-indigo-300 border border-indigo-500/30 text-[9px] font-mono font-medium" title="Market Cap > ₹2000 Cr">
        &gt;2000Cr
      </span>
    ` : '';

    tr.innerHTML = `
      <td class="py-2.5 px-3">
        <div class="flex items-center gap-2">
          <div>
            <div class="flex items-center gap-1.5 flex-wrap">
              <span class="font-bold font-mono text-slate-100 text-xs tracking-tight">${stock.symbol}</span>
              ${mcBadgeHtml}
              ${confluenceHtml}
            </div>
            <span class="text-[11px] text-slate-400 block line-clamp-1 max-w-[170px]">${stock.name || stock.symbol}</span>
          </div>
        </div>
      </td>
      <td class="py-2.5 px-3 text-right font-mono font-medium text-slate-200">
        ${fmt.currency(stock.close)}
      </td>
      <td class="py-2.5 px-3 text-right">
        <span class="px-2 py-0.5 rounded text-[11px] font-mono font-semibold ${changeBadge}">
          ${fmt.percent(stock.changePercent)}
        </span>
      </td>
      <td class="py-2.5 px-3 text-right font-mono text-slate-400 text-[11px]">
        ${fmt.volume(stock.volume)}
      </td>
      <td class="py-2.5 px-3 text-center">
        <button class="p-1.5 rounded-lg text-slate-400 hover:text-blue-400 hover:bg-dark-accent transition-colors" title="Load Chart">
          <i data-lucide="line-chart" class="w-3.5 h-3.5"></i>
        </button>
      </td>
    `;

    tr.addEventListener('click', () => {
      selectStock(stock);
    });

    el.stocksTbody.appendChild(tr);
  });

  lucide.createIcons();
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

// Window Globals for HTML onclick listeners
window.openAdminConsole = openAdminConsole;
window.closeAdminConsole = closeAdminConsole;
window.toggleAdminAddUserPanel = toggleAdminAddUserPanel;
window.loadAdminData = loadAdminData;
window.filterAdminUserTable = filterAdminUserTable;
window.handleAdminAddUser = handleAdminAddUser;
window.handleAdminDeleteUser = handleAdminDeleteUser;
window.handleAdminResetPassword = handleAdminResetPassword;
window.handleAdminUpdateMaxUsers = handleAdminUpdateMaxUsers;
window.toggleAvwapAnchorMode = toggleAvwapAnchorMode;
window.clearStockAvwaps = clearStockAvwaps;
window.cancelActiveDrawingTool = cancelActiveDrawingTool;
window.handleAltHShortcut = handleAltHShortcut;
window.handleCopyStocks = handleCopyStocks;

// Bootstrap on DOM Ready
window.addEventListener('DOMContentLoaded', init);



