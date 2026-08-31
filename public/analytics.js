/**
 * Standalone Market Analytics & Breadth Controller
 * Sangam_chartlinks
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
  indicesSortAsc: false
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

  if (user) {
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
    state.user = data.user;
    state.isAdmin = (data.user.role === 'admin');

    closeAuthModal();
    updateAuthUI(state.user);
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
    const [breadthRes, sectorsRes, indicesRes] = await Promise.all([
      fetch(`/api/analytics/breadth?sector=${encodeURIComponent(state.activeBreadthSector || 'all')}`),
      fetch('/api/analytics/sectors', { headers: getAuthHeaders() }),
      fetch('/api/analytics/indices')
    ]);

    const breadthData = await breadthRes.json();
    const sectorsData = await sectorsRes.json();
    const indicesData = await indicesRes.json();

    if (breadthData.success) {
      state.breadthData = breadthData;
      renderBreadthDiagnostics(breadthData);
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

    card.className = `p-4 sm:p-5 rounded-2xl bg-dark-bg/60 border border-dark-border ${thermalBorder} transition-all flex flex-col md:flex-row items-start md:items-center justify-between gap-4 cursor-pointer shadow-lg hover:bg-dark-bg/80 overflow-hidden`;
    card.title = `Click to inspect all constituent stocks of ${sub.name}`;

    // 1. Mini Quarterly Histogram Bars
    const qBars = sub.quarterlyBars || [40, 50, 60, 75, 88, 100];
    const barsHtml = qBars.map((val, i) => {
      const isLatest = (i >= qBars.length - 2);
      const bg = isLatest ? 'bg-blue-500' : 'bg-blue-500/40';
      return `<div class="w-2 rounded-t-sm ${bg} transition-all" style="height: ${Math.max(12, (val / 100) * 30)}px" title="Q${i+1} Index: ${val}"></div>`;
    }).join('');

    // 2. Valuation P/E Sparkline SVG (Clean, tightly bounded)
    const pePts = sub.peSparkline || [40, 50, 65, 80, 75];
    const peMin = Math.min(...pePts);
    const peMax = Math.max(...pePts);
    const peRange = peMax - peMin || 1;
    const w = 48, h = 18;
    const polyPoints = pePts.map((val, i) => {
      const x = (i / (pePts.length - 1)) * w;
      const y = h - ((val - peMin) / peRange) * (h - 6) - 3;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    }).join(' ');
    const lastPoint = polyPoints.split(' ').pop();
    const [lx, ly] = lastPoint ? lastPoint.split(',') : [w, h / 2];

    const peSvg = `
      <svg class="w-12 h-4 overflow-hidden shrink-0" viewBox="0 0 48 18">
        <polyline fill="none" stroke="#60a5fa" stroke-width="1.6" stroke-linecap="round" points="${polyPoints}" />
        <circle cx="${lx}" cy="${ly}" r="2" fill="#3b82f6" stroke="#ffffff" stroke-width="1" />
      </svg>
    `;

    // Top 3 Constituent ticker pills
    const topTickers = (sub.stocks || []).slice(0, 3).map(stk => `
      <span class="px-1.5 py-0.2 rounded bg-dark-card border border-dark-border text-[10px] font-mono text-slate-300">
        ${stk.symbol}
      </span>
    `).join('');

    // Spacious, non-overlapping card layout with strictly bounded sections
    card.innerHTML = `
      <!-- LEFT: Rank, Sub-Sector Title & Key Fundamentals -->
      <div class="flex items-start gap-3 flex-1 min-w-0">
        <div class="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-bold text-xs flex items-center justify-center shrink-0">
          #${sub.rank}
        </div>
        <div class="flex flex-col gap-1 min-w-0">
          <div class="flex items-center gap-2 flex-wrap">
            <h4 class="text-sm font-bold text-white hover:text-blue-400 transition-colors truncate">${sub.name}</h4>
          </div>
          <div class="flex items-center gap-2 text-xs text-slate-400 flex-wrap">
            <span class="font-semibold text-slate-300">${(sub.stocks || []).length} names</span>
            <span>·</span>
            <span class="font-mono">P/E <strong class="text-white">${sub.pe}</strong></span>
            <span>·</span>
            <span class="font-mono">ROCE <strong class="text-white">${sub.roce}%</strong></span>
          </div>
          <div class="flex items-center gap-2 text-[11px] text-slate-400 mt-0.5 flex-wrap">
            <span class="text-emerald-400 font-semibold">${sub.pctGrowing}% growing</span>
            <div class="flex items-center gap-1">${topTickers}</div>
          </div>
        </div>
      </div>

      <!-- MIDDLE: Thermal Momentum Status & Moving Average Breadth -->
      <div class="flex flex-col items-start md:items-center gap-1.5 shrink-0">
        <span class="px-2.5 py-1 rounded-md text-[11px] font-bold border ${thermalBadge}">
          ${sub.thermalLabel || 'Hot'}
        </span>
        <div class="flex items-center gap-2 text-[10px] font-mono text-slate-400">
          <span class="px-1.5 py-0.5 rounded bg-dark-card border border-dark-border ${sub.breadth20Sma >= 70 ? 'text-blue-400' : 'text-slate-400'}">${sub.breadth20Sma || 80}% &gt; 20SMA</span>
          <span class="px-1.5 py-0.5 rounded bg-dark-card border border-dark-border ${sub.breadth50Sma >= 70 ? 'text-emerald-400' : 'text-slate-400'}">${sub.breadth50Sma || 90}% &gt; 50SMA</span>
        </div>
      </div>

      <!-- RIGHT: Mini Quarterly Bars Histogram & Valuation P/E Sparkline (No overflow) -->
      <div class="flex items-center gap-3 shrink-0 font-mono text-[10px] text-slate-400 self-end md:self-auto overflow-hidden">
        <!-- Quarterly Trend Histogram -->
        <div class="flex flex-col items-center gap-1">
          <div class="flex items-end gap-1 h-8">${barsHtml}</div>
          <div class="text-[9px] text-slate-500 whitespace-nowrap">Q2 FY25 · Q1 FY27</div>
        </div>

        <!-- P/E Valuation Sparkline -->
        <div class="flex flex-col items-end gap-1 max-w-[80px] shrink-0">
          <div class="flex items-center gap-1">
            <span class="text-[9px] text-slate-400 font-sans font-semibold">P/E</span>
            ${peSvg}
          </div>
          <div class="text-[9px] text-slate-400 font-mono font-bold">${sub.pe}x</div>
        </div>
      </div>
    `;

    card.addEventListener('click', () => {
      openSectorDrilldownModal(sub.id);
    });

    container.appendChild(card);
  });
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
window.setHoverChartRange = setHoverChartRange;
window.toggleHoverStockWatchlist = toggleHoverStockWatchlist;
window.closeHoverWatchlistDropdown = closeHoverWatchlistDropdown;
window.addHoverStockToWatchlist = addHoverStockToWatchlist;
window.handleIndicesCategoryChange = handleIndicesCategoryChange;
window.handleIndicesSort = handleIndicesSort;
window.sortCustomizeIndices = sortCustomizeIndices;

// Bootstrap on DOM Ready
window.addEventListener('DOMContentLoaded', async () => {
  applyTheme(state.theme);
  await checkAuthStatus();
  lucide.createIcons();
});
