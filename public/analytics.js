/**
 * Standalone Market Analytics & Breadth Controller
 * Sangam_charts
 */

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
    rsi: 'all',
    rvolPeriod: 'd20',
    rvolMult: 'all',
    emaPosture: 'all',
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
  dhanActive: false
};

let analyticsChartInstance = null;
let analyticsCandleSeries = null;
let analyticsEma10Series = null;
let analyticsEma20Series = null;
let analyticsEma50Series = null;
let analyticsActiveSymbol = null;

let hoverPriceChartInstance = null;
let hoverVolumeChartInstance = null;
let hoverCandleSeries = null;
let hoverEma10Series = null;
let hoverEma20Series = null;
let hoverEma50Series = null;
let hoverVolumeSeries = null;
let hoverVolAvgSeries = null;

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
  currency: (val) => val !== null && val !== undefined ? `₹${Number(val).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '--',
  percent: (val) => val !== null && val !== undefined ? `${val >= 0 ? '+' : ''}${Number(val).toFixed(2)}%` : '--'
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
        <span class="px-2 py-0.5 rounded bg-dark-bg border border-dark-border text-blue-400">${stk.symbol}</span>
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
      <td class="py-2.5 px-3 text-center">
        <button onclick="openAnalyticsStockChart('${stk.symbol}', '${(stk.name || stk.symbol).replace(/'/g, "\\'")}')"
          class="px-2.5 py-1 text-[11px] font-semibold bg-blue-600/20 hover:bg-blue-600 text-blue-400 hover:text-white border border-blue-500/30 rounded-lg transition-all flex items-center justify-center gap-1 mx-auto cursor-pointer shadow-sm"
          title="See on 6M Candlestick Chart">
          <i data-lucide="line-chart" class="w-3.5 h-3.5"></i>
          <span>See on Chart</span>
        </button>
      </td>
    `;

    tbody.appendChild(tr);
  });

  const footerInfo = document.getElementById('ssm-footer-info');
  if (footerInfo && state.activeSectorModalData) {
    footerInfo.innerHTML = `Showing <strong>${stocks.length}</strong> of <strong>${state.activeSectorModalData.totalConstituents}</strong> stocks in <strong>${state.activeSectorModalData.name}</strong> • Click <strong>See on Chart</strong> to load candlestick visualizer`;
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
        <td class="py-3 px-3 font-bold text-white whitespace-nowrap">${stk.symbol}</td>
        <td class="py-3 px-3 font-sans text-slate-300 whitespace-nowrap">${stk.name || stk.symbol}</td>
        <td class="py-3 px-2 text-right whitespace-nowrap font-mono">₹${Number(stk.mcap || 0).toLocaleString('en-IN')}</td>
        <td class="py-3 px-2 text-right text-slate-400 whitespace-nowrap font-mono">${stk.pe || '--'}</td>
        <td class="py-3 px-2 text-center whitespace-nowrap">${renderYesNoBadge(stk.salesIncQoQ)}</td>
        <td class="py-3 px-2 text-center whitespace-nowrap">${renderYesNoBadge(stk.salesIncYoY)}</td>
        <td class="py-3 px-2 text-center whitespace-nowrap">${renderYesNoBadge(stk.epsIncQoQ)}</td>
        <td class="py-3 px-2 text-center whitespace-nowrap">${renderYesNoBadge(stk.epsIncYoY)}</td>
        <td class="py-3 px-2 text-right font-bold text-slate-200 whitespace-nowrap font-mono">${opmQoQFormatted}</td>
        <td class="py-3 px-2 text-right font-bold text-slate-200 whitespace-nowrap font-mono">${opmYoYFormatted}</td>
        <td class="py-3 px-3 text-center whitespace-nowrap">
          <button class="btn-chart-drilldown px-2.5 py-1 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-[11px] font-semibold transition-all cursor-pointer shadow flex items-center gap-1 mx-auto" data-symbol="${stk.symbol}" title="Hover for instant 6M 10/20/50 MA preview, click to open full chart & watchlists">
            <i data-lucide="candlestick-chart" class="w-3.5 h-3.5"></i>
            <span>View Chart</span>
          </button>
        </td>
      `;

      const btnChart = tr.querySelector('.btn-chart-drilldown');

      // Click to open full chart modal
      btnChart?.addEventListener('click', (e) => {
        e.stopPropagation();
        hideHoverChartPopup();
        openAnalyticsStockChart(stk.symbol, stk.name);
      });

      // Hover event listeners for instant 6M 10/20/50 MA chart preview
      const handleMouseEnter = (e) => showHoverChartPopup(e, stk);
      const handleMouseMove = (e) => updateHoverChartPosition(e);
      const handleMouseLeave = () => hideHoverChartPopup();

      btnChart?.addEventListener('mouseenter', handleMouseEnter);
      btnChart?.addEventListener('mousemove', handleMouseMove);
      btnChart?.addEventListener('mouseleave', handleMouseLeave);

      tr.addEventListener('mouseenter', handleMouseEnter);
      tr.addEventListener('mousemove', handleMouseMove);
      tr.addEventListener('mouseleave', handleMouseLeave);

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
  hideHoverChartPopup();
  const modal = document.getElementById('sector-drilldown-modal');
  if (modal) {
    modal.classList.add('hidden');
    modal.classList.remove('flex');
  }
}

// -------------------------------------------------------------
// Floating Hover Chart Preview (Dual-Pane Price & Volume, 3M/6M, 10/20/50 MA, ⭐)
// -------------------------------------------------------------

function initAnalyticsHoverChart() {
  const priceContainer = document.getElementById('hover-chart-price-container');
  const volContainer = document.getElementById('hover-chart-volume-container');
  if (!priceContainer || !volContainer || typeof LightweightCharts === 'undefined') return;

  if (hoverPriceChartInstance && hoverVolumeChartInstance) return;

  const isDark = state.theme === 'dark';
  const bgColor = isDark ? '#0b0f19' : '#ffffff';
  const textColor = isDark ? '#94a3b8' : '#334155';
  const gridColor = isDark ? 'rgba(255, 255, 255, 0.04)' : 'rgba(0, 0, 0, 0.05)';
  const borderColor = isDark ? '#1f293d' : '#cbd5e1';

  const baseOptions = {
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
      vertLine: { visible: true, color: 'rgba(255, 255, 255, 0.25)', width: 1 },
      horzLine: { visible: true, color: 'rgba(255, 255, 255, 0.25)', width: 1 }
    }
  };

  // 1. PANE 1: Price & MA Line Series
  priceContainer.innerHTML = '';
  hoverPriceChartInstance = LightweightCharts.createChart(priceContainer, {
    ...baseOptions,
    width: priceContainer.clientWidth || 560,
    height: priceContainer.clientHeight || 208,
    rightPriceScale: {
      borderColor: borderColor,
      autoScale: true,
      scaleMargins: { top: 0.08, bottom: 0.08 }
    },
    timeScale: {
      borderColor: borderColor,
      visible: false, // Hidden on top pane; displayed on bottom volume pane
      fixLeftEdge: false,
      fixRightEdge: false
    }
  });

  // Candlestick Series
  hoverCandleSeries = hoverPriceChartInstance.addCandlestickSeries({
    upColor: '#10b981',
    downColor: '#ef4444',
    borderVisible: false,
    wickUpColor: '#10b981',
    wickDownColor: '#ef4444'
  });

  // 10 MA Line (Sky Blue)
  hoverEma10Series = hoverPriceChartInstance.addLineSeries({
    color: '#38bdf8',
    lineWidth: 1.5,
    priceLineVisible: false,
    lastValueVisible: false
  });

  // 20 MA Line (Blue)
  hoverEma20Series = hoverPriceChartInstance.addLineSeries({
    color: '#3b82f6',
    lineWidth: 1.5,
    priceLineVisible: false,
    lastValueVisible: false
  });

  // 50 MA Line (Amber)
  hoverEma50Series = hoverPriceChartInstance.addLineSeries({
    color: '#f59e0b',
    lineWidth: 1.5,
    priceLineVisible: false,
    lastValueVisible: false
  });

  // 2. PANE 2: Dedicated Volume Histogram & Volume SMA Pane
  volContainer.innerHTML = '';
  hoverVolumeChartInstance = LightweightCharts.createChart(volContainer, {
    ...baseOptions,
    width: volContainer.clientWidth || 560,
    height: volContainer.clientHeight || 80,
    rightPriceScale: {
      borderColor: borderColor,
      autoScale: true,
      scaleMargins: { top: 0.12, bottom: 0.05 }
    },
    timeScale: {
      borderColor: borderColor,
      visible: true,
      fixLeftEdge: false,
      fixRightEdge: false
    }
  });

  // Volume Histogram Series
  hoverVolumeSeries = hoverVolumeChartInstance.addHistogramSeries({
    color: '#26a69a',
    priceFormat: { type: 'volume' }
  });

  // 9-Period Volume SMA Line (Amber / Gold)
  hoverVolAvgSeries = hoverVolumeChartInstance.addLineSeries({
    color: '#fbbf24',
    lineWidth: 1.5,
    priceFormat: { type: 'volume' },
    priceLineVisible: false,
    lastValueVisible: false
  });

  // 3. Synchronize TimeScale Zoom & Pan across both panes
  let isSyncing = false;
  const syncRange = (source, target) => {
    source.timeScale().subscribeVisibleLogicalRangeChange(range => {
      if (isSyncing || !range || !target) return;
      isSyncing = true;
      target.timeScale().setVisibleLogicalRange(range);
      isSyncing = false;
    });
  };
  syncRange(hoverPriceChartInstance, hoverVolumeChartInstance);
  syncRange(hoverVolumeChartInstance, hoverPriceChartInstance);

  // 4. Synchronize Crosshair and Update Dynamic Legend
  function updateHoverCrosshair(param) {
    if (!param.time) return;

    const candle = param.seriesData?.get(hoverCandleSeries);
    const vol = param.seriesData?.get(hoverVolumeSeries);

    const legOpen = document.getElementById('hover-leg-open');
    const legHigh = document.getElementById('hover-leg-high');
    const legLow = document.getElementById('hover-leg-low');
    const legClose = document.getElementById('hover-leg-close');
    const legVol = document.getElementById('hover-leg-vol');

    if (candle) {
      if (legOpen) legOpen.textContent = fmt.currency(candle.open);
      if (legHigh) legHigh.textContent = fmt.currency(candle.high);
      if (legLow) legLow.textContent = fmt.currency(candle.low);
      if (legClose) legClose.textContent = fmt.currency(candle.close);
    }
    if (vol) {
      if (legVol) legVol.textContent = Number(vol.value || 0).toLocaleString('en-IN');
    }
  }

  hoverPriceChartInstance.subscribeCrosshairMove(updateHoverCrosshair);
  hoverVolumeChartInstance.subscribeCrosshairMove(updateHoverCrosshair);

  // 5. Responsive ResizeObserver for smooth responsive adjustments
  if (window.ResizeObserver && !window._hoverPanesObserver) {
    const wrapper = document.getElementById('hover-chart-panes-wrapper');
    if (wrapper) {
      window._hoverPanesObserver = new ResizeObserver(entries => {
        for (let entry of entries) {
          const w = entry.contentRect.width;
          if (w > 100) {
            if (hoverPriceChartInstance) hoverPriceChartInstance.applyOptions({ width: w });
            if (hoverVolumeChartInstance) hoverVolumeChartInstance.applyOptions({ width: w });
          }
        }
      });
      window._hoverPanesObserver.observe(wrapper);
    }
  }

  // Setup Popup Mouse Persistence Listeners
  const popup = document.getElementById('stock-hover-chart-popup');
  if (popup) {
    popup.addEventListener('mouseenter', () => {
      clearTimeout(hoverTimeout);
    });
    popup.addEventListener('mouseleave', () => {
      hideHoverChartPopup();
    });
  }
}

let hoverTimeout = null;
let hoverCurrentSymbol = null;

function updateHoverChartPosition(e) {
  const popup = document.getElementById('stock-hover-chart-popup');
  if (!popup || popup.classList.contains('hidden')) return;

  const pad = 16;
  const popW = 610;
  const popH = 430;
  let posX = e.clientX + pad;
  let posY = e.clientY - (popH / 2);

  if (posX + popW > window.innerWidth - pad) {
    posX = e.clientX - popW - pad;
  }
  if (posY + popH > window.innerHeight - pad) {
    posY = window.innerHeight - popH - pad;
  }
  if (posY < pad) {
    posY = pad;
  }
  if (posX < pad) {
    posX = pad;
  }

  popup.style.left = `${posX}px`;
  popup.style.top = `${posY}px`;
}

function updateHoverStarIcon(symbol) {
  const starIcon = document.getElementById('hover-star-icon');
  const starBtn = document.getElementById('hover-chart-star-btn');
  if (!starIcon) return;

  const inWatchlist = (state.watchlists || []).some(wl => (wl.stocks || []).includes(symbol));
  if (inWatchlist) {
    starIcon.setAttribute('data-lucide', 'star');
    starIcon.className = 'w-4 h-4 fill-amber-400 text-amber-400';
    if (starBtn) starBtn.title = `In Watchlist (Click to remove ${symbol})`;
  } else {
    starIcon.setAttribute('data-lucide', 'star');
    starIcon.className = 'w-4 h-4 text-slate-400 hover:text-amber-400';
    if (starBtn) starBtn.title = `Click to choose watchlist for ${symbol}`;
  }
  lucide.createIcons();
}

function closeHoverWatchlistDropdown(event) {
  if (event) event.stopPropagation();
  const dropdown = document.getElementById('hover-star-watchlist-dropdown');
  if (dropdown) dropdown.classList.add('hidden');
}

async function showHoverChartPopup(e, stk) {
  clearTimeout(hoverTimeout);
  const popup = document.getElementById('stock-hover-chart-popup');
  if (!popup) return;

  const symbol = stk.symbol;
  hoverCurrentSymbol = symbol;
  state.hoverStock = stk;

  const elSym = document.getElementById('hover-chart-symbol');
  const elName = document.getElementById('hover-chart-name');

  if (elSym) elSym.textContent = symbol;
  if (elName) elName.textContent = stk.name || symbol;

  closeHoverWatchlistDropdown();
  updateHoverStarIcon(symbol);
  updateHoverChartPosition(e);

  popup.classList.remove('hidden');
  popup.classList.add('flex');

  initAnalyticsHoverChart();

  const priceContainer = document.getElementById('hover-chart-price-container');
  const volContainer = document.getElementById('hover-chart-volume-container');
  if (hoverPriceChartInstance && priceContainer) {
    hoverPriceChartInstance.applyOptions({
      width: priceContainer.clientWidth || 560,
      height: priceContainer.clientHeight || 208
    });
  }
  if (hoverVolumeChartInstance && volContainer) {
    hoverVolumeChartInstance.applyOptions({
      width: volContainer.clientWidth || 560,
      height: volContainer.clientHeight || 80
    });
  }

  await renderHoverChart(symbol);
}

async function renderHoverChart(symbol) {
  if (!symbol) return;
  const range = state.hoverRange || '6mo';
  const cacheKey = `${symbol}_${range}_1d`;

  const elChg = document.getElementById('hover-chart-change');
  const elLtp = document.getElementById('hover-chart-ltp');

  try {
    let data;
    if (stockHistoryCache.has(cacheKey)) {
      data = stockHistoryCache.get(cacheKey);
    } else {
      const res = await fetch(`/api/stocks/${symbol}?interval=1d&range=${range}`);
      data = await res.json();
      if (data.success) {
        stockHistoryCache.set(cacheKey, data);
      }
    }

    if (hoverCurrentSymbol !== symbol) return; // Stale hover check

    if (data && data.success) {
      if (elLtp) elLtp.textContent = fmt.currency(data.ltp);

      if (elChg) {
        const isPos = (data.changePercent || 0) >= 0;
        elChg.className = `px-1.5 py-0.2 rounded text-[10px] font-mono font-bold border ${
          isPos ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-rose-500/10 text-rose-400 border-rose-500/20'
        }`;
        elChg.textContent = `${isPos ? '+' : ''}${data.changePercent || 0}%`;
      }

      if (data.candles && data.candles.length > 0) {
        // 1. Candlestick Data in Price Pane
        if (hoverCandleSeries) hoverCandleSeries.setData(data.candles);

        // 2. 10, 20, 50 MA Lines in Price Pane
        const sma10 = data.ema10 || calculateSMA(data.candles, 10);
        const sma20 = data.ema20 || calculateSMA(data.candles, 20);
        const sma50 = data.ema50 || calculateSMA(data.candles, 50);

        if (hoverEma10Series && sma10) hoverEma10Series.setData(sma10);
        if (hoverEma20Series && sma20) hoverEma20Series.setData(sma20);
        if (hoverEma50Series && sma50) hoverEma50Series.setData(sma50);

        // 3. Dedicated Volume Histogram Data
        if (hoverVolumeSeries) {
          const volData = data.candles.map(c => ({
            time: c.time,
            value: c.volume || 0,
            color: (c.close >= c.open) ? 'rgba(16, 185, 129, 0.75)' : 'rgba(239, 68, 68, 0.75)'
          }));
          hoverVolumeSeries.setData(volData);
        }

        // 4. 9-Period Volume SMA Line in Volume Pane
        if (hoverVolAvgSeries) {
          const volPoints = data.candles.map(c => ({ time: c.time, close: c.volume || 0 }));
          const volAvg = calculateSMA(volPoints, 9);
          hoverVolAvgSeries.setData(volAvg);
        }

        // 5. TimeScale Sync Fit
        hoverPriceChartInstance?.timeScale().fitContent();
        hoverVolumeChartInstance?.timeScale().fitContent();

        // 6. Update Default Crosshair Legend Bar
        const lastCandle = data.candles[data.candles.length - 1];
        if (lastCandle) {
          const legOpen = document.getElementById('hover-leg-open');
          const legHigh = document.getElementById('hover-leg-high');
          const legLow = document.getElementById('hover-leg-low');
          const legClose = document.getElementById('hover-leg-close');
          const legVol = document.getElementById('hover-leg-vol');

          if (legOpen) legOpen.textContent = fmt.currency(lastCandle.open);
          if (legHigh) legHigh.textContent = fmt.currency(lastCandle.high);
          if (legLow) legLow.textContent = fmt.currency(lastCandle.low);
          if (legClose) legClose.textContent = fmt.currency(lastCandle.close);
          if (legVol) legVol.textContent = Number(lastCandle.volume || 0).toLocaleString('en-IN');
        }
      }
    }
  } catch (err) {
    console.error('Error rendering hover chart:', err);
  }
}

async function setHoverChartRange(range, event) {
  if (event) event.stopPropagation();
  state.hoverRange = range;

  const btn3m = document.getElementById('btn-hover-range-3mo');
  const btn6m = document.getElementById('btn-hover-range-6mo');

  if (range === '3mo') {
    btn3m?.classList.add('bg-blue-600', 'text-white', 'shadow-sm');
    btn3m?.classList.remove('text-slate-400');
    btn6m?.classList.remove('bg-blue-600', 'text-white', 'shadow-sm');
    btn6m?.classList.add('text-slate-400');
  } else {
    btn6m?.classList.add('bg-blue-600', 'text-white', 'shadow-sm');
    btn6m?.classList.remove('text-slate-400');
    btn3m?.classList.remove('bg-blue-600', 'text-white', 'shadow-sm');
    btn3m?.classList.add('text-slate-400');
  }

  if (hoverCurrentSymbol) {
    await renderHoverChart(hoverCurrentSymbol);
  }
}

async function toggleHoverStockWatchlist(event) {
  if (event) event.stopPropagation();

  if (!state.user && !state.isAdmin) {
    showToast('Please login to manage watchlists', 'info');
    openAuthModal('login');
    return;
  }

  if (!hoverCurrentSymbol) return;
  const symbol = hoverCurrentSymbol;

  const inWatchlists = (state.watchlists || []).filter(wl => (wl.stocks || []).includes(symbol));

  // If ALREADY in watchlist(s): clicking star directly removes it from all watchlists!
  if (inWatchlists.length > 0) {
    try {
      for (const wl of inWatchlists) {
        await fetch(`/api/watchlists/${wl.id}/stocks/${symbol}`, {
          method: 'DELETE',
          headers: getAuthHeaders()
        });
      }
      showToast(`Removed ${symbol} from watchlist`, 'info');
      await loadWatchlists();
      updateHoverStarIcon(symbol);
      closeHoverWatchlistDropdown();
    } catch (err) {
      showToast(err.message, 'error');
    }
    return;
  }

  // If NOT in any watchlist: open the dropdown to select which watchlist to add to!
  const dropdown = document.getElementById('hover-star-watchlist-dropdown');
  const listContainer = document.getElementById('hover-watchlist-items-list');

  if (!dropdown || !listContainer) return;

  if (!state.watchlists || state.watchlists.length === 0) {
    // If no watchlists exist yet, create default and add
    try {
      const res = await fetch('/api/watchlists', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
        body: JSON.stringify({ name: 'Watchlist 1' })
      });
      const d = await res.json();
      if (d.success) {
        await loadWatchlists();
      }
    } catch (e) {}
  }

  listContainer.innerHTML = '';
  (state.watchlists || []).forEach(wl => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs hover:bg-dark-accent text-slate-200 hover:text-white transition-colors cursor-pointer w-full text-left';
    btn.innerHTML = `
      <div class="flex items-center gap-1.5">
        <i data-lucide="folder-plus" class="w-3.5 h-3.5 text-blue-400"></i>
        <span class="font-medium">${wl.name}</span>
      </div>
      <span class="text-[10px] text-slate-400 font-mono">${(wl.stocks || []).length}</span>
    `;
    btn.onclick = (e) => addHoverStockToWatchlist(wl.id, symbol, e);
    listContainer.appendChild(btn);
  });

  lucide.createIcons();
  dropdown.classList.toggle('hidden');
}

async function addHoverStockToWatchlist(watchlistId, symbol, event) {
  if (event) event.stopPropagation();

  try {
    const res = await fetch(`/api/watchlists/${watchlistId}/stocks`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
      body: JSON.stringify({ symbol })
    });
    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data.error || 'Failed to add stock');
    }

    const wl = (state.watchlists || []).find(w => w.id === watchlistId);
    showToast(`Added ${symbol} to "${wl ? wl.name : 'Watchlist'}"`, 'success');

    closeHoverWatchlistDropdown();
    await loadWatchlists();
    updateHoverStarIcon(symbol);
  } catch (err) {
    showToast(err.message, 'error');
  }
}

function hideHoverChartPopup() {
  hoverTimeout = setTimeout(() => {
    const popup = document.getElementById('stock-hover-chart-popup');
    if (popup) {
      popup.classList.add('hidden');
      popup.classList.remove('flex');
    }
    closeHoverWatchlistDropdown();
  }, 220);
}

// -------------------------------------------------------------
// Simplified Stock Chart & Watchlist Modal inside Analytics Tab
// -------------------------------------------------------------

async function openAnalyticsStockChart(symbol, name) {
  const cleanSymbol = symbol.trim().toUpperCase();
  analyticsActiveSymbol = cleanSymbol;

  const modal = document.getElementById('analytics-stock-chart-modal');
  const elAvatar = document.getElementById('asc-avatar');
  const elSymbol = document.getElementById('asc-symbol');
  const elName = document.getElementById('asc-name');
  const elLtp = document.getElementById('asc-ltp');
  const elChange = document.getElementById('asc-change');
  const elLoading = document.getElementById('asc-loading');
  const chartContainer = document.getElementById('asc-chart-container');

  if (elAvatar) elAvatar.textContent = cleanSymbol.substring(0, 3);
  if (elSymbol) elSymbol.textContent = cleanSymbol;
  if (elName) elName.textContent = name || cleanSymbol;
  if (elLtp) elLtp.textContent = '₹--';
  if (elChange) elChange.textContent = '--%';

  renderAnalyticsStockWatchlistDropdown(cleanSymbol);

  if (modal) {
    modal.classList.remove('hidden');
    modal.classList.add('flex');
  }

  if (elLoading) {
    elLoading.classList.remove('hidden');
    elLoading.classList.add('flex');
  }

  try {
    let data;
    if (stockHistoryCache.has(cleanSymbol)) {
      data = stockHistoryCache.get(cleanSymbol);
    } else {
      const res = await fetch(`/api/stocks/${cleanSymbol}?interval=1d&range=6mo`);
      data = await res.json();
      if (data.success) {
        stockHistoryCache.set(cleanSymbol, data);
      }
    }

    if (!data || !data.success) throw new Error(data?.error || 'Failed to fetch chart data');

    if (elLtp) elLtp.textContent = fmt.currency(data.ltp);
    if (elChange) {
      const isBull = (data.changePercent || 0) >= 0;
      elChange.className = `px-2 py-0.5 text-xs font-mono font-bold rounded border ${
        isBull ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-rose-500/10 text-rose-400 border-rose-500/20'
      }`;
      elChange.textContent = fmt.percent(data.changePercent);
    }

    if (!analyticsChartInstance && chartContainer && typeof LightweightCharts !== 'undefined') {
      const isDark = state.theme === 'dark';
      analyticsChartInstance = LightweightCharts.createChart(chartContainer, {
        layout: {
          background: { color: isDark ? '#0b0f19' : '#ffffff' },
          textColor: isDark ? '#94a3b8' : '#334155',
          fontFamily: 'Inter, system-ui, sans-serif'
        },
        grid: {
          vertLines: { color: isDark ? 'rgba(255, 255, 255, 0.04)' : 'rgba(0, 0, 0, 0.04)' },
          horzLines: { color: isDark ? 'rgba(255, 255, 255, 0.04)' : 'rgba(0, 0, 0, 0.04)' }
        },
        rightPriceScale: {
          borderColor: isDark ? '#1f293d' : '#cbd5e1',
          autoScale: true
        },
        timeScale: {
          borderColor: isDark ? '#1f293d' : '#cbd5e1',
          visible: true
        }
      });

      analyticsCandleSeries = analyticsChartInstance.addCandlestickSeries({
        upColor: '#10b981',
        downColor: '#ef4444',
        borderVisible: false,
        wickUpColor: '#10b981',
        wickDownColor: '#ef4444'
      });

      analyticsEma10Series = analyticsChartInstance.addLineSeries({
        color: '#38bdf8', // 10 MA Sky Blue
        lineWidth: 1.5,
        priceLineVisible: false,
        lastValueVisible: false
      });

      analyticsEma20Series = analyticsChartInstance.addLineSeries({
        color: '#3b82f6', // 20 MA Blue
        lineWidth: 1.5,
        priceLineVisible: false,
        lastValueVisible: false
      });

      analyticsEma50Series = analyticsChartInstance.addLineSeries({
        color: '#f59e0b', // 50 MA Amber
        lineWidth: 1.5,
        priceLineVisible: false,
        lastValueVisible: false
      });
    }

    if (analyticsChartInstance && chartContainer) {
      const rect = chartContainer.getBoundingClientRect();
      analyticsChartInstance.applyOptions({
        width: rect.width || 600,
        height: rect.height || 380
      });
    }

    if (analyticsCandleSeries && data.candles) {
      analyticsCandleSeries.setData(data.candles);

      const sma10 = data.ema10 || calculateSMA(data.candles, 10);
      const sma20 = data.ema20 || calculateSMA(data.candles, 20);
      const sma50 = data.ema50 || calculateSMA(data.candles, 50);

      if (analyticsEma10Series && sma10) analyticsEma10Series.setData(sma10);
      if (analyticsEma20Series && sma20) analyticsEma20Series.setData(sma20);
      if (analyticsEma50Series && sma50) analyticsEma50Series.setData(sma50);

      analyticsChartInstance?.timeScale().fitContent();
    }
  } catch (err) {
    showToast(`Error loading chart for ${cleanSymbol}: ${err.message}`, 'error');
  } finally {
    if (elLoading) {
      elLoading.classList.add('hidden');
      elLoading.classList.remove('flex');
    }
    lucide.createIcons();
  }
}

function closeAnalyticsChartModal() {
  const modal = document.getElementById('analytics-stock-chart-modal');
  if (modal) {
    modal.classList.add('hidden');
    modal.classList.remove('flex');
  }
}

function renderAnalyticsStockWatchlistDropdown(symbol) {
  const checklist = document.getElementById('asc-watchlist-checklist');
  if (!checklist) return;

  checklist.innerHTML = '';
  if (!state.user && !state.isAdmin) {
    checklist.innerHTML = `
      <div class="p-2 text-center text-slate-500 text-[11px]">
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
        await loadWatchlists();
        renderAnalyticsStockWatchlistDropdown(symbol);
      } catch (err) {
        chk.checked = !adding;
        showToast(err.message, 'error');
      }
    });

    checklist.appendChild(label);
  });
}

// Watchlist dropdown toggle button in Analytics Chart Modal
document.getElementById('btn-asc-watchlist-toggle')?.addEventListener('click', (e) => {
  e.stopPropagation();
  const menu = document.getElementById('asc-watchlist-menu');
  if (menu) menu.classList.toggle('hidden');
});

document.addEventListener('click', (e) => {
  const menu = document.getElementById('asc-watchlist-menu');
  const toggleBtn = document.getElementById('btn-asc-watchlist-toggle');
  if (menu && !menu.classList.contains('hidden') && !menu.contains(e.target) && !toggleBtn?.contains(e.target)) {
    menu.classList.add('hidden');
  }
});

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

// -------------------------------------------------------------
// Explore Institutional Multi-Factor Screener Controller
// -------------------------------------------------------------

async function loadExploreData() {
  try {
    const [exploreRes, feedRes] = await Promise.all([
      fetch('/api/analytics/explore'),
      fetch('/api/feed/status')
    ]);
    const data = await exploreRes.json();
    const feedData = await feedRes.json();

    if (feedData && (feedData.dhanActive || feedData.dhanConfigured)) {
      state.dhanActive = Boolean(feedData.dhanActive || feedData.dhanConfigured);
    } else if (data.success) {
      state.dhanActive = Boolean(data.dhanActive);
    }
    updateDhanHeaderBadge();

    if (data.success && Array.isArray(data.stocks)) {
      state.exploreStocks = data.stocks;
      applyExploreFilters();
    }
  } catch (err) {
    console.error('Failed to load explore stocks data:', err);
  }
}

function updateDhanHeaderBadge() {
  const badgeEl = document.getElementById('dhan-header-badge');
  const dotEl = document.getElementById('dhan-header-dot');
  const textEl = document.getElementById('dhan-header-text');

  if (state.dhanActive) {
    if (badgeEl) badgeEl.className = 'px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold flex items-center gap-1.5 border bg-emerald-500/10 text-emerald-400 border-emerald-500/30';
    if (dotEl) dotEl.className = 'w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse';
    if (textEl) textEl.textContent = 'Dhan API Live';
  } else {
    if (badgeEl) badgeEl.className = 'px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold flex items-center gap-1.5 border bg-slate-800 text-slate-400 border-slate-700';
    if (dotEl) dotEl.className = 'w-1.5 h-1.5 rounded-full bg-slate-500';
    if (textEl) textEl.textContent = 'Dhan API Off';
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
  const selRsi = document.getElementById('select-filter-rsi');
  const selRvolPeriod = document.getElementById('select-filter-rvol-period');
  const selRvolMult = document.getElementById('select-filter-rvol-mult');
  const selEmaPosture = document.getElementById('select-filter-ema-posture');
  const selCrossDir = document.getElementById('select-filter-cross-dir');
  const selCrossDays = document.getElementById('select-filter-cross-days');
  const sel52wh = document.getElementById('select-filter-52wh');
  const selDailyPivot = document.getElementById('select-filter-daily-pivot');
  const selWeeklyPivot = document.getElementById('select-filter-weekly-pivot');

  state.exploreFilters.rsi = selRsi?.value || 'all';
  state.exploreFilters.rvolPeriod = selRvolPeriod?.value || 'd20';
  state.exploreFilters.rvolMult = selRvolMult?.value || 'all';
  state.exploreFilters.emaPosture = selEmaPosture?.value || 'all';
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

  if (lblRsi) lblRsi.textContent = state.exploreFilters.rsi === 'all' ? 'All' : state.exploreFilters.rsi;
  if (lblRvol) lblRvol.textContent = state.exploreFilters.rvolMult === 'all' ? 'All' : `>${state.exploreFilters.rvolMult}x (${state.exploreFilters.rvolPeriod.toUpperCase()})`;
  if (lblEma) lblEma.textContent = state.exploreFilters.emaPosture === 'all' ? 'All' : 'Active';
  if (lblCross) lblCross.textContent = (state.exploreFilters.crossDir === 'all' && state.exploreFilters.crossDays === 'all') ? 'All' : `${state.exploreFilters.crossDir} (${state.exploreFilters.crossDays}d)`;
  if (lbl52wh) lbl52wh.textContent = state.exploreFilters.dist52wh === 'all' ? 'All' : 'Active';
  if (lblPivot) lblPivot.textContent = (state.exploreFilters.dailyPivot === 'all' && state.exploreFilters.weeklyPivot === 'all') ? 'All' : 'Filtered';

  applyExploreFilters();
}

function resetExploreFilters() {
  state.exploreFilters = {
    segment: 'all',
    search: '',
    rsi: 'all',
    rvolPeriod: 'd20',
    rvolMult: 'all',
    emaPosture: 'all',
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

  const selRsi = document.getElementById('select-filter-rsi');
  const selRvolPeriod = document.getElementById('select-filter-rvol-period');
  const selRvolMult = document.getElementById('select-filter-rvol-mult');
  const selEmaPosture = document.getElementById('select-filter-ema-posture');
  const selCrossDir = document.getElementById('select-filter-cross-dir');
  const selCrossDays = document.getElementById('select-filter-cross-days');
  const sel52wh = document.getElementById('select-filter-52wh');
  const selDailyPivot = document.getElementById('select-filter-daily-pivot');
  const selWeeklyPivot = document.getElementById('select-filter-weekly-pivot');

  if (selRsi) selRsi.value = 'all';
  if (selRvolPeriod) selRvolPeriod.value = 'd20';
  if (selRvolMult) selRvolMult.value = 'all';
  if (selEmaPosture) selEmaPosture.value = 'all';
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

  applyExploreFilters();
}

function applyExploreFilters() {
  let list = [...(state.exploreStocks || [])];
  const f = state.exploreFilters;

  // 1. Segment Filter (All, Large, Mid, Small, Micro, MidSmall, F&O)
  if (f.segment && f.segment !== 'all') {
    if (f.segment === 'fno') {
      list = list.filter(s => s.fno === true);
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

  // 3. RSI (14)
  if (f.rsi && f.rsi !== 'all') {
    if (f.rsi === 'gt60') list = list.filter(s => s.rsi > 60);
    else if (f.rsi === 'gt70') list = list.filter(s => s.rsi > 70);
    else if (f.rsi === '30to70') list = list.filter(s => s.rsi >= 30 && s.rsi <= 70);
    else if (f.rsi === 'lt40') list = list.filter(s => s.rsi < 40);
    else if (f.rsi === 'lt30') list = list.filter(s => s.rsi < 30);
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

  // 6. Unbounded 10/20 EMA Cross Lookback
  if (f.crossDir && f.crossDir !== 'all') {
    list = list.filter(s => s.emaCross && s.emaCross.direction === f.crossDir);
  }
  if (f.crossDays && f.crossDays !== 'all') {
    const maxDays = parseInt(f.crossDays, 10);
    list = list.filter(s => s.emaCross && s.emaCross.daysAgo <= maxDays);
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
      vA = a.emaCross ? a.emaCross.daysAgo : 999;
      vB = b.emaCross ? b.emaCross.daysAgo : 999;
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

  if (pageStocks.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="14" class="py-10 text-center text-slate-500 font-sans">
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

    // Cap Badge Styling
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

    // 10/20 Crossover Lookback Tag
    const isBullCross = stk.emaCross?.direction === 'bullish';
    const crossClass = isBullCross ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/25' : 'text-rose-400 bg-rose-500/10 border-rose-500/25';
    const crossLabel = stk.emaCross ? `${isBullCross ? '🟢 Bull' : '🔴 Bear'} (${stk.emaCross.label})` : '--';

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
              <span class="font-bold text-white group-hover:text-emerald-400 transition-colors cursor-pointer" onclick="openAnalyticsStockChart('${stk.symbol}', '${(stk.name || stk.symbol).replace(/'/g, "\\'")}')">${stk.symbol}</span>
              ${stk.fno ? '<span class="px-1 py-0.2 rounded text-[9px] font-bold bg-purple-500/20 text-purple-300 border border-purple-500/30" title="Derivative F&O Stock">F&O</span>' : ''}
            </div>
            <span class="text-[10px] text-slate-400 font-sans line-clamp-1 max-w-[150px]">${stk.name || stk.symbol}</span>
          </div>
        </div>
      </td>
      <td class="py-2.5 px-3 text-center">
        <span class="px-2 py-0.5 rounded text-[10px] font-bold border ${capBadgeClass}">${stk.capLabel}</span>
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
      <td class="py-2.5 px-3 text-center">
        <button onclick="openAnalyticsStockChart('${stk.symbol}', '${(stk.name || stk.symbol).replace(/'/g, "\\'")}')"
          class="px-2 py-1 text-[11px] font-semibold bg-emerald-600/20 hover:bg-emerald-600 text-emerald-400 hover:text-white border border-emerald-500/30 rounded-lg transition-all flex items-center justify-center gap-1 mx-auto cursor-pointer shadow-sm"
          title="See on 6M Candlestick Chart">
          <i data-lucide="line-chart" class="w-3.5 h-3.5"></i>
          <span>Chart</span>
        </button>
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
window.openAnalyticsStockChart = openAnalyticsStockChart;
window.closeAnalyticsChartModal = closeAnalyticsChartModal;
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
window.setHoverChartRange = setHoverChartRange;
window.toggleHoverStockWatchlist = toggleHoverStockWatchlist;
window.closeHoverWatchlistDropdown = closeHoverWatchlistDropdown;
window.addHoverStockToWatchlist = addHoverStockToWatchlist;

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
  initAnalyticsSectionCollapses();
  await checkAuthStatus();
  lucide.createIcons();
});
