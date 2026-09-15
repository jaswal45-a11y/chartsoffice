/**
 * Mutual Fund Bulk & Block Deals Floating Widget & Blinking Alert Engine
 * Self-contained module for Sangam Stock Screener
 */

(function () {
  'use strict';

  var STORAGE_KEY_LAST_VIEWED = 'sangam_mf_deals_last_viewed_id';
  var STORAGE_KEY_SETTINGS = 'sangam_mf_deals_settings';

  var defaultSettings = {
    isOpen: false,
    isMinimized: false,
    isMaximized: false,
    width: 780,
    height: 520,
    top: 80,
    left: null,
    rowDensity: 'auto'
  };

  var settings = Object.assign({}, defaultSettings);
  var deals = [];
  var lastUpdated = null;
  var latestDealId = null;
  var filterType = 'ALL'; // 'ALL', 'BUY', 'SELL'
  var searchQuery = '';
  var isLoading = false;
  var hasUnread = false;
  var pollTimer = null;
  var lastToggleTime = 0;

  var isDragging = false;
  var isResizing = false;
  var dragStartX = 0;
  var dragStartY = 0;
  var resizeStartX = 0;
  var resizeStartY = 0;
  var initialWidgetX = 0;
  var initialWidgetY = 0;
  var initialWidgetW = 0;
  var initialWidgetH = 0;
  var restoreGeom = null;

  // Global window functions assigned early
  window.openMfDeals = function() { openWidget(); };
  window.closeMfDeals = function() { closeWidget(); };
  window.toggleMfDeals = function() { toggleWidget(); };
  window.SangamMfDeals = {
    open: function() { openWidget(); },
    close: function() { closeWidget(); },
    toggle: function() { toggleWidget(); },
    refresh: function () { fetchDeals(true); },
    refreshAuth: function () { updateAuthVisibility(); if (isUserAuthenticated()) fetchDeals(false); }
  };

  var widgetEl = null;
  var headerEl = null;
  var tableBodyEl = null;
  var searchInputEl = null;
  var countBadgeEl = null;
  var minimizeBtnEl = null;
  var maximizeBtnEl = null;
  var bodyContainerEl = null;
  var resizeHandleEl = null;

  // 1. Inject Pure Self-Contained Styles
  function injectStyles() {
    if (document.getElementById('sangam-mf-deals-styles')) return;
    var style = document.createElement('style');
    style.id = 'sangam-mf-deals-styles';
    style.textContent = `
      @keyframes mfDealsPulseGlow {
        0%, 100% {
          box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.7), 0 0 14px rgba(16, 185, 129, 0.5);
          border-color: rgba(52, 211, 153, 0.9);
          background-color: rgba(16, 185, 129, 0.25);
          color: #a7f3d0;
        }
        50% {
          box-shadow: 0 0 0 5px rgba(245, 158, 11, 0.45), 0 0 22px rgba(245, 158, 11, 0.7);
          border-color: rgba(245, 158, 11, 0.95);
          background-color: rgba(245, 158, 11, 0.3);
          color: #fef08a;
        }
      }
      .mf-deals-blink {
        animation: mfDealsPulseGlow 1.4s infinite ease-in-out !important;
        position: relative;
      }
      #sangam-mf-deals-widget {
        position: fixed;
        z-index: 999999;
        display: none;
        flex-direction: column;
        background: rgba(15, 23, 42, 0.97);
        backdrop-filter: blur(18px);
        -webkit-backdrop-filter: blur(18px);
        border: 1px solid rgba(16, 185, 129, 0.45);
        border-radius: 16px;
        box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.85), 0 0 30px 2px rgba(16, 185, 129, 0.2);
        color: #f1f5f9;
        font-family: Inter, system-ui, -apple-system, sans-serif;
        box-sizing: border-box;
        overflow: hidden;
        min-width: 480px;
        min-height: 260px;
        max-width: 98vw;
        max-height: 94vh;
      }
      #sangam-mf-deals-widget.minimized {
        height: auto !important;
        min-height: 0 !important;
        resize: none !important;
      }
      #sangam-mf-deals-widget.minimized #mf-deals-body,
      #sangam-mf-deals-widget.minimized #mf-deals-resize-handle {
        display: none !important;
      }
      .mf-header-drag {
        cursor: grab;
        user-select: none;
        touch-action: none;
      }
      .mf-header-drag:active {
        cursor: grabbing;
      }
      .mf-btn {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        padding: 4px 8px;
        border-radius: 8px;
        font-size: 11px;
        font-weight: 600;
        background: rgba(30, 41, 59, 0.85);
        border: 1px solid rgba(51, 65, 85, 0.8);
        color: #cbd5e1;
        cursor: pointer;
        transition: all 0.15s ease;
      }
      .mf-btn:hover {
        background: rgba(51, 65, 85, 0.95);
        color: #ffffff;
        border-color: rgba(100, 116, 139, 0.8);
      }
      .mf-btn:active {
        transform: scale(0.95);
      }
      #mf-deals-table-container::-webkit-scrollbar {
        width: 6px;
        height: 6px;
      }
      #mf-deals-table-container::-webkit-scrollbar-track {
        background: rgba(15, 23, 42, 0.7);
      }
      #mf-deals-table-container::-webkit-scrollbar-thumb {
        background: rgba(51, 65, 85, 0.8);
        border-radius: 3px;
      }
      #mf-deals-table-container::-webkit-scrollbar-thumb:hover {
        background: rgba(100, 116, 139, 1);
      }
      
      /* Density Rules */
      .mf-density-compact td, .mf-density-compact th {
        padding: 4px 8px !important;
        font-size: 10.5px !important;
      }
      .mf-density-normal td, .mf-density-normal th {
        padding: 7px 10px !important;
        font-size: 11px !important;
      }
      .mf-density-comfortable td, .mf-density-comfortable th {
        padding: 10px 12px !important;
        font-size: 12px !important;
      }
    `;
    document.head.appendChild(style);
  }

  // 2. Load / Save Settings
  function loadSettings() {
    try {
      var saved = localStorage.getItem(STORAGE_KEY_SETTINGS);
      if (saved) {
        settings = Object.assign({}, defaultSettings, JSON.parse(saved));
        settings.isOpen = false; // Always start closed on fresh load
      }
    } catch (e) {}
  }

  function saveSettings() {
    try {
      if (widgetEl && !settings.isMaximized && !settings.isMinimized) {
        settings.width = Math.round(widgetEl.offsetWidth);
        settings.height = Math.round(widgetEl.offsetHeight);
        settings.top = Math.round(widgetEl.offsetTop);
        settings.left = Math.round(widgetEl.offsetLeft);
      }
      localStorage.setItem(STORAGE_KEY_SETTINGS, JSON.stringify(settings));
    } catch (e) {}
  }

  // 3. Construct Widget DOM
  function createWidget() {
    if (document.getElementById('sangam-mf-deals-widget')) {
      widgetEl = document.getElementById('sangam-mf-deals-widget');
      return;
    }

    injectStyles();

    var el = document.createElement('div');
    el.id = 'sangam-mf-deals-widget';
    el.setAttribute('role', 'dialog');
    el.setAttribute('aria-label', 'Mutual Fund Bulk & Block Deals');

    el.innerHTML = `
      <!-- Header Bar / Drag Handle -->
      <div id="mf-deals-header" class="mf-header-drag flex items-center justify-between px-3.5 py-2.5 bg-slate-800/90 border-b border-slate-700/70 select-none">
        <div class="flex items-center gap-2.5">
          <div class="w-6 h-6 rounded-lg bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 font-bold text-xs">
            🏛️
          </div>
          <div>
            <div class="flex items-center gap-1.5 font-bold text-slate-100 text-xs tracking-wide">
              <span>Mutual Fund Bulk & Block Deals</span>
              <span id="mf-deals-count-badge" class="px-1.5 py-0.2 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] font-mono">0 Deals</span>
            </div>
            <span id="mf-deals-last-updated" class="text-[10px] text-slate-400 font-mono">Live Accord Feed</span>
          </div>
        </div>

        <div class="flex items-center gap-1">
          <button id="btn-mf-refresh" class="mf-btn p-1 px-2" title="Refresh Live Deals">
            <span id="mf-refresh-icon">🔄</span>
          </button>
          <button id="btn-mf-maximize" class="mf-btn p-1 px-2" title="Maximize / Restore Size">
            <span id="mf-max-icon">🗖</span>
          </button>
          <button id="btn-mf-minimize" class="mf-btn p-1 px-2" title="Minimize Window">
            <span id="mf-min-icon">➖</span>
          </button>
          <button id="btn-mf-close" class="mf-btn p-1 px-2 hover:bg-rose-500/20 hover:text-rose-400 hover:border-rose-500/40" title="Close Window">
            ✕
          </button>
        </div>
      </div>

      <!-- Main Body Container -->
      <div id="mf-deals-body" class="flex flex-col flex-1 min-h-0 overflow-hidden bg-slate-900/60">
        <!-- Filter Toolbar -->
        <div class="p-2 border-b border-slate-800 flex items-center justify-between gap-2 flex-wrap sm:flex-nowrap bg-slate-900/90 flex-shrink-0">
          <div class="relative flex-1 min-w-[140px]">
            <input 
              type="text" 
              id="mf-deals-search" 
              placeholder="Search fund, company or date..." 
              class="w-full bg-slate-950 border border-slate-700 text-slate-200 text-[11px] rounded-lg pl-7 pr-3 py-1 focus:outline-none focus:border-emerald-500 placeholder-slate-500"
            />
            <span class="absolute left-2 top-1.5 text-slate-500 text-[11px] pointer-events-none">🔍</span>
          </div>

          <!-- Filter Pills: BUY / SELL -->
          <div class="flex items-center gap-1 bg-slate-950 border border-slate-800 rounded-lg p-0.5 text-[10px] font-semibold text-slate-400">
            <button class="mf-filter-btn active px-2 py-0.5 rounded-md bg-emerald-600 text-white transition-colors cursor-pointer" data-filter="ALL">All</button>
            <button class="mf-filter-btn px-2 py-0.5 rounded-md hover:text-white transition-colors cursor-pointer" data-filter="BUY">BUY</button>
            <button class="mf-filter-btn px-2 py-0.5 rounded-md hover:text-white transition-colors cursor-pointer" data-filter="SELL">SELL</button>
          </div>

          <!-- Density Controls -->
          <div class="hidden sm:flex items-center gap-1 bg-slate-950 border border-slate-800 rounded-lg p-0.5 text-[10px] font-semibold text-slate-400" title="Row Size & Height Density">
            <span class="px-1 text-[9px] text-slate-500">Rows:</span>
            <button class="mf-density-btn active px-1.5 py-0.5 rounded-md bg-slate-700 text-white transition-colors cursor-pointer" data-density="auto">Auto</button>
            <button class="mf-density-btn px-1.5 py-0.5 rounded-md hover:text-white transition-colors cursor-pointer" data-density="compact">Compact</button>
            <button class="mf-density-btn px-1.5 py-0.5 rounded-md hover:text-white transition-colors cursor-pointer" data-density="normal">Normal</button>
            <button class="mf-density-btn px-1.5 py-0.5 rounded-md hover:text-white transition-colors cursor-pointer" data-density="comfortable">Large</button>
          </div>

          <!-- Actions: Copy & CSV -->
          <div class="flex items-center gap-1">
            <button id="btn-mf-copy" class="mf-btn text-[10px] px-2 py-1" title="Copy table to clipboard">
              <span>📋 Copy</span>
            </button>
            <button id="btn-mf-export-csv" class="mf-btn text-[10px] px-2 py-1" title="Export as CSV file">
              <span>📥 CSV</span>
            </button>
          </div>
        </div>

        <!-- Table Container -->
        <div id="mf-deals-table-container" class="flex-1 min-h-0 overflow-y-auto overflow-x-auto select-text">
          <table class="w-full text-left border-collapse text-[11px]">
            <thead class="bg-slate-950/95 text-slate-400 font-semibold sticky top-0 z-10 border-b border-slate-800 select-none shadow-sm">
              <tr>
                <th class="py-2 px-3 text-center w-14">Exch</th>
                <th class="py-2 px-3 whitespace-nowrap">Date</th>
                <th class="py-2 px-3">Client Name</th>
                <th class="py-2 px-3">Company Name</th>
                <th class="py-2 px-3 text-center">Type</th>
                <th class="py-2 px-3 text-right">Volume</th>
                <th class="py-2 px-3 text-right">Deal Price</th>
              </tr>
            </thead>
            <tbody id="mf-deals-table-body" class="divide-y divide-slate-800/60 font-mono">
              <tr>
                <td colspan="7" class="py-8 text-center text-slate-500 font-sans">Loading deals...</td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Footer / Status Bar with Corner Resizer -->
        <div class="px-3 py-1.5 border-t border-slate-800/90 bg-slate-950/90 flex items-center justify-between text-[10px] text-slate-400 select-none flex-shrink-0 relative">
          <div class="flex items-center gap-2">
            <span id="mf-deals-status-text">Chronological Date Order (Latest First)</span>
            <span class="text-slate-600">·</span>
            <span class="text-slate-500 font-sans hidden sm:inline">Click company to view chart</span>
          </div>

          <!-- Bottom-Right Corner Resize Grip Handle -->
          <div id="mf-deals-resize-handle" class="flex items-center gap-1 cursor-nwse-resize p-1 -mr-2 -mb-0.5 text-slate-500 hover:text-emerald-400 transition-colors" title="Drag to resize window">
            <span class="text-[9px] text-slate-500 hidden md:inline font-mono mr-1" id="mf-window-dims"></span>
            <span class="text-xs">⤡</span>
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(el);

    widgetEl = el;
    headerEl = document.getElementById('mf-deals-header');
    bodyContainerEl = document.getElementById('mf-deals-body');
    tableBodyEl = document.getElementById('mf-deals-table-body');
    searchInputEl = document.getElementById('mf-deals-search');
    countBadgeEl = document.getElementById('mf-deals-count-badge');
    minimizeBtnEl = document.getElementById('btn-mf-minimize');
    maximizeBtnEl = document.getElementById('btn-mf-maximize');
    resizeHandleEl = document.getElementById('mf-deals-resize-handle');

    updateDensityButtonsUI();
    applyRowDensity();
    bindWidgetEvents();
    setupResizeObserver();
  }

  // 4. Geometry & Visibility
  function applyGeometry() {
    if (!widgetEl) return;

    if (settings.isOpen) {
      widgetEl.style.display = 'flex';
    } else {
      widgetEl.style.display = 'none';
      return;
    }

    if (settings.isMinimized) {
      widgetEl.classList.add('minimized');
      var minIcon = document.getElementById('mf-min-icon');
      if (minIcon) minIcon.textContent = '🗖';
    } else {
      widgetEl.classList.remove('minimized');
      var minIcon = document.getElementById('mf-min-icon');
      if (minIcon) minIcon.textContent = '➖';

      if (settings.isMaximized) {
        widgetEl.style.width = 'calc(100vw - 32px)';
        widgetEl.style.height = 'calc(100vh - 48px)';
        widgetEl.style.top = '24px';
        widgetEl.style.left = '16px';
        widgetEl.style.right = '16px';
      } else {
        var winW = window.innerWidth;
        var winH = window.innerHeight;
        var targetW = Math.min(settings.width || defaultSettings.width, winW - 20);
        var targetH = Math.min(settings.height || defaultSettings.height, winH - 40);
        widgetEl.style.width = Math.max(460, targetW) + 'px';
        widgetEl.style.height = Math.max(250, targetH) + 'px';
      }
    }

    if (!settings.isMaximized) {
      var winW = window.innerWidth;
      var winH = window.innerHeight;
      var curW = widgetEl.offsetWidth || settings.width || defaultSettings.width;
      var curH = widgetEl.offsetHeight || settings.height || defaultSettings.height;
      var left = settings.left;
      var top = settings.top;

      if (left === null || left === undefined || isNaN(left)) {
        left = Math.max(10, winW - curW - 30);
      }
      if (top === null || top === undefined || isNaN(top)) {
        top = 80;
      }

      left = Math.max(10, Math.min(left, winW - curW - 10));
      top = Math.max(10, Math.min(top, winH - 60));

      widgetEl.style.left = left + 'px';
      widgetEl.style.top = top + 'px';
      widgetEl.style.right = 'auto';
    }

    applyRowDensity();
  }

  // 5. Format numbers with Indian commas
  function formatIndianNumber(val) {
    if (!val) return '--';
    var num = Number(String(val).replace(/,/g, ''));
    if (isNaN(num)) return val;
    return num.toLocaleString('en-IN');
  }

  function formatPrice(val) {
    if (!val) return '--';
    var num = parseFloat(String(val).replace(/,/g, ''));
    if (isNaN(num)) return val;
    return '₹' + num.toFixed(2);
  }

  // Automatic Row Sizing & Density Calculations
  function applyRowDensity() {
    if (!widgetEl) return;
    var container = document.getElementById('mf-deals-table-container');
    var dimsEl = document.getElementById('mf-window-dims');
    if (dimsEl) {
      dimsEl.textContent = Math.round(widgetEl.offsetWidth) + '×' + Math.round(widgetEl.offsetHeight);
    }

    if (!container) return;
    container.classList.remove('mf-density-compact', 'mf-density-normal', 'mf-density-comfortable');

    var effectiveDensity = settings.rowDensity || 'auto';
    if (effectiveDensity === 'auto') {
      var h = widgetEl.offsetHeight;
      if (h < 400) {
        effectiveDensity = 'compact';
      } else if (h > 640) {
        effectiveDensity = 'comfortable';
      } else {
        effectiveDensity = 'normal';
      }
    }

    container.classList.add('mf-density-' + effectiveDensity);
  }

  function setRowDensity(density) {
    settings.rowDensity = density;
    updateDensityButtonsUI();
    applyRowDensity();
    saveSettings();
  }

  function updateDensityButtonsUI() {
    document.querySelectorAll('.mf-density-btn').forEach(function (btn) {
      if (btn.dataset.density === (settings.rowDensity || 'auto')) {
        btn.classList.add('active', 'bg-slate-700', 'text-white');
        btn.classList.remove('hover:text-white');
      } else {
        btn.classList.remove('active', 'bg-slate-700', 'text-white');
        btn.classList.add('hover:text-white');
      }
    });
  }

  function setupResizeObserver() {
    if (typeof ResizeObserver === 'undefined' || !widgetEl) return;
    var resizeObserver = new ResizeObserver(function () {
      applyRowDensity();
    });
    resizeObserver.observe(widgetEl);
  }

  // 6. Render Deals Table
  function renderTable() {
    if (!tableBodyEl) return;

    var query = (searchQuery || '').toLowerCase().trim();

    var filtered = deals.filter(function (d) {
      if (filterType !== 'ALL' && d.dealType !== filterType) return false;
      if (!query) return true;
      return (
        (d.companyName && d.companyName.toLowerCase().includes(query)) ||
        (d.clientName && d.clientName.toLowerCase().includes(query)) ||
        (d.date && d.date.toLowerCase().includes(query)) ||
        (d.exchange && d.exchange.toLowerCase().includes(query)) ||
        (d.dealType && d.dealType.toLowerCase().includes(query))
      );
    });

    if (countBadgeEl) {
      countBadgeEl.textContent = filtered.length + ' / ' + deals.length + ' Deals';
    }

    if (filtered.length === 0) {
      tableBodyEl.innerHTML = `
        <tr>
          <td colspan="7" class="py-10 text-center text-slate-500 font-sans">
            <div class="flex flex-col items-center justify-center gap-1">
              <span>🔍 No deals found matching your filter</span>
            </div>
          </td>
        </tr>
      `;
      return;
    }

    var html = '';
    for (var i = 0; i < filtered.length; i++) {
      var d = filtered[i];
      var isBuy = d.dealType === 'BUY';
      var exchBadge = d.exchange === 'NSE' 
        ? '<span class="px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-400 border border-blue-500/30 text-[9px] font-bold">NSE</span>'
        : '<span class="px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-400 border border-purple-500/30 text-[9px] font-bold">BSE</span>';

      var typeBadge = isBuy
        ? '<span class="px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-400 border border-emerald-500/35 text-[10px] font-bold">BUY</span>'
        : '<span class="px-2 py-0.5 rounded-md bg-rose-500/20 text-rose-400 border border-rose-500/35 text-[10px] font-bold">SELL</span>';

      html += `
        <tr class="hover:bg-slate-800/60 transition-colors cursor-pointer group" onclick="window.__loadMfDealStock('${escapeJsString(d.companyName)}')">
          <td class="py-2 px-3 text-center">${exchBadge}</td>
          <td class="py-2 px-3 text-slate-300 whitespace-nowrap text-[10px]">${d.date || '--'}</td>
          <td class="py-2 px-3 font-sans font-medium text-slate-200">${d.clientName || '--'}</td>
          <td class="py-2 px-3 font-sans font-bold text-white group-hover:text-emerald-300 transition-colors flex items-center gap-1.5">
            <span>${d.companyName || '--'}</span>
            <span class="text-slate-500 opacity-0 group-hover:opacity-100 text-[10px]">↗</span>
          </td>
          <td class="py-2 px-3 text-center">${typeBadge}</td>
          <td class="py-2 px-3 text-right text-slate-300 font-semibold">${formatIndianNumber(d.volume)}</td>
          <td class="py-2 px-3 text-right text-emerald-300 font-bold">${formatPrice(d.dealPrice)}</td>
        </tr>
      `;
    }

    tableBodyEl.innerHTML = html;
    applyRowDensity();
  }

  function escapeJsString(str) {
    return (str || '').replace(/'/g, "\\'").replace(/"/g, '&quot;');
  }

  // 7. Global Stock Loader
  window.__loadMfDealStock = function (companyName) {
    if (!companyName) return;
    var clean = companyName.trim();

    var manualInput = document.getElementById('manual-stock-input');
    if (manualInput) {
      manualInput.value = clean;
      manualInput.dispatchEvent(new Event('input', { bubbles: true }));
      var btnSearch = document.getElementById('btn-manual-stock-search');
      if (btnSearch) btnSearch.click();
    }

    if (typeof window.loadStockChart === 'function') {
      window.loadStockChart(clean);
    }
    if (typeof window.loadChartForSymbol === 'function') {
      window.loadChartForSymbol(clean);
    }
  };

  function getAuthToken() {
    try {
      return localStorage.getItem('authToken') || localStorage.getItem('adminToken') || null;
    } catch (e) {
      return null;
    }
  }

  function isUserAuthenticated() {
    return Boolean(getAuthToken());
  }

  function updateAuthVisibility() {
    var isAuth = isUserAuthenticated();
    document.querySelectorAll('#btn-open-mf-deals, .btn-mf-deals-launcher').forEach(function (btn) {
      if (isAuth) {
        btn.classList.remove('hidden');
        btn.classList.add('flex');
      } else {
        btn.classList.add('hidden');
        btn.classList.remove('flex');
      }
    });

    if (!isAuth && widgetEl) {
      closeWidget();
    }
  }

  // 8. Fetch Deals from API & Check Unread
  async function fetchDeals(forceRefresh) {
    var token = getAuthToken();
    if (!token) {
      updateAuthVisibility();
      return;
    }

    isLoading = true;
    var refreshIcon = document.getElementById('mf-refresh-icon');
    if (refreshIcon) refreshIcon.textContent = '⏳';

    try {
      var res = await fetch('/api/mf-deals' + (forceRefresh ? '?refresh=true' : ''), {
        headers: {
          'Authorization': 'Bearer ' + token
        }
      });

      if (res.status === 401) {
        updateAuthVisibility();
        return;
      }

      var data = await res.json();

      if (data && data.success && Array.isArray(data.deals)) {
        deals = data.deals;
        lastUpdated = data.lastUpdated;
        latestDealId = data.latestDealId || (data.deals[0] ? data.deals[0].id : null);

        var lastUpdatedEl = document.getElementById('mf-deals-last-updated');
        if (lastUpdatedEl && data.lastUpdated) {
          var d = new Date(data.lastUpdated);
          lastUpdatedEl.textContent = 'Updated ' + d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        }

        checkUnreadStatus();
        renderTable();
      }
    } catch (err) {
      console.warn('[MF Deals] Fetch error:', err.message);
    } finally {
      isLoading = false;
      if (refreshIcon) refreshIcon.textContent = '🔄';
    }
  }

  // 9. Check Unread Status & Trigger Blinking Button
  function checkUnreadStatus() {
    if (!latestDealId) return;

    var lastViewedId = localStorage.getItem(STORAGE_KEY_LAST_VIEWED);
    var isUnread = Boolean(!lastViewedId || (lastViewedId !== latestDealId));
    hasUnread = isUnread;

    updateButtonBlinking(isUnread);
  }

  function updateButtonBlinking(shouldBlink) {
    document.querySelectorAll('#btn-open-mf-deals, .btn-mf-deals-launcher').forEach(function (btn) {
      var unreadBadge = btn.querySelector('#mf-deals-unread-badge') || btn.querySelector('.mf-deals-unread-dot');
      if (shouldBlink) {
        btn.classList.add('mf-deals-blink');
        if (unreadBadge) unreadBadge.classList.remove('hidden');
      } else {
        btn.classList.remove('mf-deals-blink');
        if (unreadBadge) unreadBadge.classList.add('hidden');
      }
    });
  }

  function markAsViewed() {
    if (latestDealId) {
      localStorage.setItem(STORAGE_KEY_LAST_VIEWED, latestDealId);
      hasUnread = false;
      updateButtonBlinking(false);
    }
  }

  // 10. Open / Close / Toggle / Maximize Modal
  function openWidget() {
    if (!isUserAuthenticated()) {
      if (typeof window.openAuthModal === 'function') {
        window.openAuthModal('login');
      } else if (typeof openAuthModal === 'function') {
        openAuthModal('login');
      }
      return;
    }

    createWidget();
    settings.isOpen = true;
    saveSettings();
    applyGeometry();
    markAsViewed();

    if (deals.length === 0) {
      fetchDeals(false);
    } else {
      renderTable();
    }
  }

  function closeWidget() {
    settings.isOpen = false;
    saveSettings();
    if (widgetEl) widgetEl.style.display = 'none';
  }

  function toggleWidget() {
    var now = Date.now();
    if (now - lastToggleTime < 150) {
      return;
    }
    lastToggleTime = now;

    if (!widgetEl) {
      createWidget();
    }

    var isCurrentlyVisible = Boolean(widgetEl && widgetEl.style.display === 'flex');
    if (isCurrentlyVisible) {
      closeWidget();
    } else {
      openWidget();
    }
  }

  function toggleMinimize() {
    if (!widgetEl) return;
    settings.isMinimized = !settings.isMinimized;
    saveSettings();
    applyGeometry();
  }

  function toggleMaximize() {
    if (!widgetEl) return;
    settings.isMaximized = !settings.isMaximized;
    saveSettings();
    applyGeometry();
  }

  // 11. Copy & CSV Export
  function copyTableToClipboard() {
    if (!deals || deals.length === 0) return;
    var query = (searchQuery || '').toLowerCase().trim();

    var filtered = deals.filter(function (d) {
      if (filterType !== 'ALL' && d.dealType !== filterType) return false;
      if (!query) return true;
      return (
        (d.companyName && d.companyName.toLowerCase().includes(query)) ||
        (d.clientName && d.clientName.toLowerCase().includes(query)) ||
        (d.date && d.date.toLowerCase().includes(query))
      );
    });

    var rows = ['Exchange\tDate\tClient Name\tCompany Name\tDeal Type\tVolume\tDeal Price'];
    filtered.forEach(function (d) {
      rows.push([d.exchange, d.date, d.clientName, d.companyName, d.dealType, d.volume, d.dealPrice].join('\t'));
    });

    navigator.clipboard.writeText(rows.join('\n')).then(function () {
      showToast('Copied ' + filtered.length + ' deals to clipboard!');
    }).catch(function () {
      showToast('Failed to copy', true);
    });
  }

  function exportCsv() {
    if (!deals || deals.length === 0) return;
    var rows = [['Exchange', 'Date', 'Client Name', 'Company Name', 'Deal Type', 'Volume', 'Deal Price']];
    deals.forEach(function (d) {
      rows.push([
        '"' + (d.exchange || '') + '"',
        '"' + (d.date || '') + '"',
        '"' + (d.clientName || '').replace(/"/g, '""') + '"',
        '"' + (d.companyName || '').replace(/"/g, '""') + '"',
        '"' + (d.dealType || '') + '"',
        d.volume,
        d.dealPrice
      ]);
    });

    var csvContent = 'data:text/csv;charset=utf-8,' + rows.map(e => e.join(',')).join('\n');
    var encodedUri = encodeURI(csvContent);
    var link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', 'MF_Bulk_Deals_' + new Date().toISOString().split('T')[0] + '.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('Exported CSV successfully!');
  }

  function showToast(msg, isErr) {
    var toast = document.createElement('div');
    toast.className = 'fixed bottom-5 right-5 z-[9999999] px-4 py-2 rounded-xl text-xs font-semibold text-white shadow-2xl flex items-center gap-2 ' +
      (isErr ? 'bg-rose-600' : 'bg-emerald-600');
    toast.textContent = msg;
    document.body.appendChild(toast);
    setTimeout(function () {
      toast.style.opacity = '0';
      toast.style.transition = 'opacity 0.3s ease';
      setTimeout(function () { toast.remove(); }, 300);
    }, 2000);
  }

  // 12. Event Binding: Dragging & Live Corner Resizing
  function bindWidgetEvents() {
    document.getElementById('btn-mf-close')?.addEventListener('click', closeWidget);
    document.getElementById('btn-mf-minimize')?.addEventListener('click', toggleMinimize);
    document.getElementById('btn-mf-maximize')?.addEventListener('click', toggleMaximize);
    document.getElementById('btn-mf-refresh')?.addEventListener('click', function () { fetchDeals(true); });
    document.getElementById('btn-mf-copy')?.addEventListener('click', copyTableToClipboard);
    document.getElementById('btn-mf-export-csv')?.addEventListener('click', exportCsv);

    searchInputEl?.addEventListener('input', function (e) {
      searchQuery = e.target.value;
      renderTable();
    });

    document.querySelectorAll('.mf-filter-btn').forEach(function (btn) {
      btn.addEventListener('click', function () {
        document.querySelectorAll('.mf-filter-btn').forEach(function (b) {
          b.classList.remove('active', 'bg-emerald-600', 'text-white');
          b.classList.add('hover:text-white');
        });
        btn.classList.add('active', 'bg-emerald-600', 'text-white');
        btn.classList.remove('hover:text-white');
        filterType = btn.dataset.filter;
        renderTable();
      });
    });

    document.querySelectorAll('.mf-density-btn').forEach(function (btn) {
      btn.addEventListener('click', function () {
        setRowDensity(btn.dataset.density);
      });
    });

    // A. Draggable Window Header Handler
    headerEl?.addEventListener('mousedown', function (e) {
      if (e.target.closest('button') || settings.isMaximized) return;
      isDragging = true;
      dragStartX = e.clientX;
      dragStartY = e.clientY;
      var rect = widgetEl.getBoundingClientRect();
      initialWidgetX = rect.left;
      initialWidgetY = rect.top;
      e.preventDefault();
    });

    // B. Corner Resizer Handler
    resizeHandleEl?.addEventListener('mousedown', function (e) {
      if (settings.isMaximized) return;
      isResizing = true;
      resizeStartX = e.clientX;
      resizeStartY = e.clientY;
      initialWidgetW = widgetEl.offsetWidth;
      initialWidgetH = widgetEl.offsetHeight;
      e.preventDefault();
      e.stopPropagation();
    });

    window.addEventListener('mousemove', function (e) {
      if (isDragging && widgetEl && !settings.isMaximized) {
        var dx = e.clientX - dragStartX;
        var dy = e.clientY - dragStartY;
        var newX = Math.max(10, Math.min(window.innerWidth - widgetEl.offsetWidth - 10, initialWidgetX + dx));
        var newY = Math.max(10, Math.min(window.innerHeight - widgetEl.offsetHeight - 10, initialWidgetY + dy));

        widgetEl.style.left = newX + 'px';
        widgetEl.style.right = 'auto';
        widgetEl.style.top = newY + 'px';

        settings.left = newX;
        settings.top = newY;
      } else if (isResizing && widgetEl && !settings.isMaximized) {
        var dw = e.clientX - resizeStartX;
        var dh = e.clientY - resizeStartY;
        var maxW = window.innerWidth - (widgetEl.offsetLeft || 20) - 10;
        var maxH = window.innerHeight - (widgetEl.offsetTop || 20) - 10;

        var newW = Math.max(480, Math.min(maxW, initialWidgetW + dw));
        var newH = Math.max(260, Math.min(maxH, initialWidgetH + dh));

        widgetEl.style.width = newW + 'px';
        widgetEl.style.height = newH + 'px';

        settings.width = newW;
        settings.height = newH;
        applyRowDensity();
      }
    });

    window.addEventListener('mouseup', function () {
      if (isDragging || isResizing) {
        isDragging = false;
        isResizing = false;
        saveSettings();
      }
    });
  }

  // 13. Setup Launcher Buttons & Polling
  function init() {
    loadSettings();
    injectStyles();
    createWidget();
    updateAuthVisibility();

    // Bind all launcher buttons on page directly
    document.querySelectorAll('#btn-open-mf-deals, .btn-mf-deals-launcher').forEach(function (btn) {
      btn.onclick = function (e) {
        if (e) {
          e.preventDefault();
          e.stopPropagation();
        }
        toggleWidget();
        return false;
      };
    });

    // Initial silent check for new unviewed deals if authenticated
    if (isUserAuthenticated()) {
      fetchDeals(false);
    }

    // Periodic Background Polling every 2.5 minutes
    if (pollTimer) clearInterval(pollTimer);
    pollTimer = setInterval(function () {
      if (isUserAuthenticated()) {
        fetchDeals(false);
      }
    }, 150000);

    // Check on window focus
    window.addEventListener('focus', function () {
      if (isUserAuthenticated()) {
        fetchDeals(false);
      }
    });

    // React to login / logout across tabs
    window.addEventListener('storage', function (e) {
      if (e.key === 'authToken' || e.key === 'adminToken') {
        updateAuthVisibility();
        if (isUserAuthenticated()) {
          fetchDeals(false);
        }
      }
    });
  }

  // Document level click listener for bulletproof launcher delegation
  document.addEventListener('click', function (e) {
    var launcher = e.target.closest('#btn-open-mf-deals, .btn-mf-deals-launcher');
    if (launcher) {
      e.preventDefault();
      e.stopPropagation();
      toggleWidget();
    }
  });

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
