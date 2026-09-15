/**
 * Mutual Fund Bulk & Block Deals Floating Widget & Blinking Alert Engine
 * Self-contained module for Sangam Stock Screener
 */

(function () {
  'use strict';

  var STORAGE_KEY_LAST_VIEWED = 'sangam_mf_deals_last_viewed_id';
  var STORAGE_KEY_SETTINGS = 'sangam_mf_deals_settings';

  var dealsState = {
    isOpen: false,
    isMinimized: false,
    isMaximized: false,
    deals: [],
    lastUpdated: null,
    latestDealId: null,
    filterType: 'ALL', // 'ALL', 'BUY', 'SELL'
    rowDensity: 'auto', // 'auto', 'compact', 'normal', 'comfortable'
    searchQuery: '',
    isLoading: false,
    hasUnread: false
  };

  var defaultSettings = {
    width: 740,
    height: 520,
    top: 75,
    left: null,
    rowDensity: 'auto'
  };

  var settings = Object.assign({}, defaultSettings);
  var pollTimer = null;
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
  var resizeObserver = null;

  var widgetEl = null;
  var headerEl = null;
  var tableBodyEl = null;
  var searchInputEl = null;
  var countBadgeEl = null;
  var minimizeBtnEl = null;
  var maximizeBtnEl = null;
  var bodyContainerEl = null;
  var resizeHandleEl = null;

  // 1. Inject Styles for Blinking Button, Modal & Dynamic Rows
  function injectStyles() {
    if (document.getElementById('mf-deals-styles')) return;
    var style = document.createElement('style');
    style.id = 'mf-deals-styles';
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
      #mf-deals-widget {
        min-width: 480px;
        min-height: 260px;
        max-width: 98vw;
        max-height: 94vh;
        z-index: 99999 !important;
        transition: box-shadow 0.2s ease, opacity 0.15s ease;
      }
      #mf-deals-widget.minimized {
        height: 44px !important;
        min-height: 44px !important;
      }
      #mf-deals-widget.minimized #mf-deals-body,
      #mf-deals-widget.minimized #mf-deals-resize-handle {
        display: none !important;
      }
      #mf-deals-table-container::-webkit-scrollbar {
        width: 6px;
        height: 6px;
      }
      #mf-deals-table-container::-webkit-scrollbar-track {
        background: rgba(15, 23, 42, 0.6);
      }
      #mf-deals-table-container::-webkit-scrollbar-thumb {
        background: rgba(51, 65, 85, 0.8);
        border-radius: 3px;
      }
      #mf-deals-table-container::-webkit-scrollbar-thumb:hover {
        background: rgba(100, 116, 139, 1);
      }
      
      /* Dynamic Density Rules */
      .mf-density-compact td, .mf-density-compact th {
        padding-top: 4px !important;
        padding-bottom: 4px !important;
        padding-left: 8px !important;
        padding-right: 8px !important;
        font-size: 10.5px !important;
      }
      .mf-density-normal td, .mf-density-normal th {
        padding-top: 7px !important;
        padding-bottom: 7px !important;
        padding-left: 10px !important;
        padding-right: 10px !important;
        font-size: 11px !important;
      }
      .mf-density-comfortable td, .mf-density-comfortable th {
        padding-top: 10px !important;
        padding-bottom: 10px !important;
        padding-left: 12px !important;
        padding-right: 12px !important;
        font-size: 12px !important;
      }
    `;
    document.head.appendChild(style);
  }

  // 2. Load Persisted Settings
  function loadSettings() {
    try {
      var saved = localStorage.getItem(STORAGE_KEY_SETTINGS);
      if (saved) {
        settings = Object.assign({}, defaultSettings, JSON.parse(saved));
        dealsState.rowDensity = settings.rowDensity || 'auto';
      }
    } catch (e) {}
  }

  function saveSettings() {
    try {
      if (widgetEl && !dealsState.isMaximized && !dealsState.isMinimized) {
        settings.width = Math.round(widgetEl.offsetWidth);
        settings.height = Math.round(widgetEl.offsetHeight);
        settings.top = Math.round(widgetEl.offsetTop);
        settings.left = Math.round(widgetEl.offsetLeft);
      }
      settings.rowDensity = dealsState.rowDensity;
      localStorage.setItem(STORAGE_KEY_SETTINGS, JSON.stringify(settings));
    } catch (e) {}
  }

  // 3. Construct Widget DOM
  function createWidgetDom() {
    if (document.getElementById('mf-deals-widget')) {
      widgetEl = document.getElementById('mf-deals-widget');
      return;
    }

    var el = document.createElement('div');
    el.id = 'mf-deals-widget';
    el.className = 'fixed z-[99999] bg-dark-card/95 backdrop-blur-xl border border-dark-border rounded-2xl shadow-2xl flex flex-col overflow-hidden text-slate-200 text-xs select-none';
    el.style.display = 'none';
    el.style.width = Math.min(window.innerWidth - 20, Math.max(500, settings.width)) + 'px';
    el.style.height = Math.min(window.innerHeight - 20, Math.max(280, settings.height)) + 'px';
    el.style.top = Math.max(10, Math.min(window.innerHeight - 100, settings.top)) + 'px';

    if (settings.left !== null) {
      el.style.left = Math.max(10, Math.min(window.innerWidth - 100, settings.left)) + 'px';
      el.style.right = 'auto';
    } else {
      el.style.right = '24px';
      el.style.left = 'auto';
    }

    el.innerHTML = `
      <!-- Header / Drag Handle -->
      <div id="mf-deals-header" class="px-4 py-2.5 bg-dark-bg/85 border-b border-dark-border flex items-center justify-between cursor-move flex-shrink-0 select-none">
        <div class="flex items-center gap-2.5">
          <div class="p-1.5 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-400">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"></path></svg>
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
          <button id="btn-mf-refresh" class="p-1.5 rounded-lg text-slate-400 hover:text-emerald-400 hover:bg-slate-800 transition-colors cursor-pointer" title="Refresh Live Deals">
            <svg id="mf-refresh-icon" class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path></svg>
          </button>
          <button id="btn-mf-maximize" class="p-1.5 rounded-lg text-slate-400 hover:text-blue-400 hover:bg-slate-800 transition-colors cursor-pointer" title="Maximize / Restore Size">
            <svg id="mf-max-icon" class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 8V4m0 0h4M4 4l5 5m11-5h-4m4 0v4m0-4l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4"></path></svg>
          </button>
          <button id="btn-mf-minimize" class="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer" title="Minimize Window">
            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 12H4"></path></svg>
          </button>
          <button id="btn-mf-close" class="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer" title="Close Window">
            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>
          </button>
        </div>
      </div>

      <!-- Main Body Container -->
      <div id="mf-deals-body" class="flex flex-col flex-1 min-h-0 overflow-hidden bg-dark-card/60">
        <!-- Filter Toolbar -->
        <div class="p-2 border-b border-dark-border/70 flex items-center justify-between gap-2 flex-wrap sm:flex-nowrap bg-dark-bg/40 flex-shrink-0">
          <div class="relative flex-1 min-w-[140px]">
            <input 
              type="text" 
              id="mf-deals-search" 
              placeholder="Search fund, company or date..." 
              class="w-full bg-dark-bg border border-dark-border text-slate-200 text-[11px] rounded-lg pl-7 pr-3 py-1 focus:outline-none focus:border-emerald-500 placeholder-slate-500"
            />
            <svg class="w-3.5 h-3.5 text-slate-500 absolute left-2 top-2 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
          </div>

          <!-- Filter Pills: BUY / SELL -->
          <div class="flex items-center gap-1 bg-dark-bg border border-dark-border rounded-lg p-0.5 text-[10px] font-semibold text-slate-400">
            <button class="mf-filter-btn active px-2 py-0.5 rounded-md bg-emerald-600 text-white transition-colors cursor-pointer" data-filter="ALL">All</button>
            <button class="mf-filter-btn px-2 py-0.5 rounded-md hover:text-white transition-colors cursor-pointer" data-filter="BUY">BUY</button>
            <button class="mf-filter-btn px-2 py-0.5 rounded-md hover:text-white transition-colors cursor-pointer" data-filter="SELL">SELL</button>
          </div>

          <!-- Density Controls -->
          <div class="hidden sm:flex items-center gap-1 bg-dark-bg border border-dark-border rounded-lg p-0.5 text-[10px] font-semibold text-slate-400" title="Row Size & Height Density">
            <span class="px-1 text-[9px] text-slate-500">Rows:</span>
            <button class="mf-density-btn active px-1.5 py-0.5 rounded-md bg-slate-700 text-white transition-colors cursor-pointer" data-density="auto">Auto</button>
            <button class="mf-density-btn px-1.5 py-0.5 rounded-md hover:text-white transition-colors cursor-pointer" data-density="compact">Compact</button>
            <button class="mf-density-btn px-1.5 py-0.5 rounded-md hover:text-white transition-colors cursor-pointer" data-density="normal">Normal</button>
            <button class="mf-density-btn px-1.5 py-0.5 rounded-md hover:text-white transition-colors cursor-pointer" data-density="comfortable">Large</button>
          </div>

          <!-- Actions: Copy & CSV -->
          <div class="flex items-center gap-1">
            <button id="btn-mf-copy" class="p-1 rounded-lg bg-dark-bg border border-dark-border text-slate-400 hover:text-emerald-300 hover:border-emerald-500/40 text-[10px] font-semibold flex items-center gap-1 transition-all cursor-pointer px-2 py-1" title="Copy table to clipboard">
              <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3"></path></svg>
              <span>Copy</span>
            </button>
            <button id="btn-mf-export-csv" class="p-1 rounded-lg bg-dark-bg border border-dark-border text-slate-400 hover:text-blue-300 hover:border-blue-500/40 text-[10px] font-semibold flex items-center gap-1 transition-all cursor-pointer px-2 py-1" title="Export as CSV file">
              <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
              <span>CSV</span>
            </button>
          </div>
        </div>

        <!-- Table Container (Fully dynamic & auto-scrolling) -->
        <div id="mf-deals-table-container" class="flex-1 min-h-0 overflow-y-auto overflow-x-auto select-text">
          <table class="w-full text-left border-collapse text-[11px]">
            <thead class="bg-dark-bg/95 text-slate-400 font-semibold sticky top-0 z-10 border-b border-dark-border select-none shadow-sm">
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
            <tbody id="mf-deals-table-body" class="divide-y divide-dark-border/40 font-mono">
              <tr>
                <td colspan="7" class="py-8 text-center text-slate-500 font-sans">Loading deals...</td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Footer / Status Bar with Corner Resizer -->
        <div class="px-3 py-1.5 border-t border-dark-border/80 bg-dark-bg/75 flex items-center justify-between text-[10px] text-slate-400 select-none flex-shrink-0 relative">
          <div class="flex items-center gap-2">
            <span id="mf-deals-status-text">Chronological Date Order (Latest First)</span>
            <span class="text-slate-600">·</span>
            <span class="text-slate-500 font-sans hidden sm:inline">Click company to view chart</span>
          </div>

          <!-- Bottom-Right Corner Resize Grip Handle -->
          <div id="mf-deals-resize-handle" class="flex items-center gap-1 cursor-nwse-resize p-1 -mr-2 -mb-0.5 text-slate-500 hover:text-emerald-400 transition-colors" title="Drag to resize window">
            <span class="text-[9px] text-slate-500 hidden md:inline font-mono mr-1" id="mf-window-dims"></span>
            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 19L19 13M19 19L13 19M19 9L9 19"></path></svg>
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

  // 4. Format numbers with Indian commas
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

  // 5. Automatic Row Sizing & Density Calculations
  function applyRowDensity() {
    if (!widgetEl) return;
    var container = document.getElementById('mf-deals-table-container');
    var dimsEl = document.getElementById('mf-window-dims');
    if (dimsEl) {
      dimsEl.textContent = Math.round(widgetEl.offsetWidth) + '×' + Math.round(widgetEl.offsetHeight);
    }

    if (!container) return;
    container.classList.remove('mf-density-compact', 'mf-density-normal', 'mf-density-comfortable');

    var effectiveDensity = dealsState.rowDensity;
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
    dealsState.rowDensity = density;
    updateDensityButtonsUI();
    applyRowDensity();
    saveSettings();
  }

  function updateDensityButtonsUI() {
    document.querySelectorAll('.mf-density-btn').forEach(function (btn) {
      if (btn.dataset.density === dealsState.rowDensity) {
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
    if (resizeObserver) resizeObserver.disconnect();

    resizeObserver = new ResizeObserver(function () {
      applyRowDensity();
    });
    resizeObserver.observe(widgetEl);
  }

  // 6. Render Deals Table
  function renderTable() {
    if (!tableBodyEl) return;

    var query = dealsState.searchQuery.toLowerCase().trim();
    var filterType = dealsState.filterType;

    var filtered = dealsState.deals.filter(function (d) {
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
      countBadgeEl.textContent = filtered.length + ' / ' + dealsState.deals.length + ' Deals';
    }

    if (filtered.length === 0) {
      tableBodyEl.innerHTML = `
        <tr>
          <td colspan="7" class="py-10 text-center text-slate-500 font-sans">
            <div class="flex flex-col items-center justify-center gap-1">
              <svg class="w-6 h-6 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
              <span>No deals found matching your filter</span>
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
        ? '<span class="px-1.5 py-0.5 rounded bg-blue-500/15 text-blue-400 border border-blue-500/25 text-[9px] font-bold">NSE</span>'
        : '<span class="px-1.5 py-0.5 rounded bg-purple-500/15 text-purple-400 border border-purple-500/25 text-[9px] font-bold">BSE</span>';

      var typeBadge = isBuy
        ? '<span class="px-2 py-0.5 rounded-md bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 text-[10px] font-bold">BUY</span>'
        : '<span class="px-2 py-0.5 rounded-md bg-rose-500/15 text-rose-400 border border-rose-500/30 text-[10px] font-bold">SELL</span>';

      html += `
        <tr class="hover:bg-slate-800/40 transition-colors group cursor-pointer" onclick="window.__loadMfDealStock('${escapeJsString(d.companyName)}')">
          <td class="py-2 px-3 text-center">${exchBadge}</td>
          <td class="py-2 px-3 text-slate-300 whitespace-nowrap text-[10px]">${d.date || '--'}</td>
          <td class="py-2 px-3 font-sans font-medium text-slate-200">${d.clientName || '--'}</td>
          <td class="py-2 px-3 font-sans font-bold text-white group-hover:text-emerald-300 transition-colors flex items-center gap-1.5">
            <span>${d.companyName || '--'}</span>
            <svg class="w-3 h-3 text-slate-500 opacity-0 group-hover:opacity-100 transition-opacity" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"></path></svg>
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

  // 7. Global Stock Loader (Hook to Main Screener / Chart)
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

  // 8. Fetch Deals from API & Check Unread
  async function fetchDeals(forceRefresh) {
    dealsState.isLoading = true;
    var refreshIcon = document.getElementById('mf-refresh-icon');
    if (refreshIcon) refreshIcon.classList.add('animate-spin');

    try {
      var res = await fetch('/api/mf-deals' + (forceRefresh ? '?refresh=true' : ''));
      var data = await res.json();

      if (data && data.success && Array.isArray(data.deals)) {
        dealsState.deals = data.deals;
        dealsState.lastUpdated = data.lastUpdated;
        dealsState.latestDealId = data.latestDealId || (data.deals[0] ? data.deals[0].id : null);

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
      dealsState.isLoading = false;
      if (refreshIcon) refreshIcon.classList.remove('animate-spin');
    }
  }

  // 9. Check Unread Status & Trigger Blinking Button
  function checkUnreadStatus() {
    if (!dealsState.latestDealId) return;

    var lastViewedId = localStorage.getItem(STORAGE_KEY_LAST_VIEWED);
    var isUnread = Boolean(!lastViewedId || (lastViewedId !== dealsState.latestDealId));
    dealsState.hasUnread = isUnread;

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
    if (dealsState.latestDealId) {
      localStorage.setItem(STORAGE_KEY_LAST_VIEWED, dealsState.latestDealId);
      dealsState.hasUnread = false;
      updateButtonBlinking(false);
    }
  }

  // 10. Open / Close / Toggle / Maximize Modal
  function openWidget() {
    createWidgetDom();
    if (!widgetEl) return;

    dealsState.isOpen = true;
    widgetEl.style.display = 'flex';
    markAsViewed();

    if (dealsState.deals.length === 0) {
      fetchDeals(false);
    } else {
      renderTable();
    }
  }

  function closeWidget() {
    if (!widgetEl) return;
    dealsState.isOpen = false;
    widgetEl.style.display = 'none';
  }

  function toggleWidget() {
    if (!widgetEl) {
      createWidgetDom();
    }
    if (widgetEl && widgetEl.style.display !== 'none' && dealsState.isOpen) {
      closeWidget();
    } else {
      openWidget();
    }
  }

  function toggleMinimize() {
    if (!widgetEl) return;
    dealsState.isMinimized = !dealsState.isMinimized;
    if (dealsState.isMinimized) {
      widgetEl.classList.add('minimized');
    } else {
      widgetEl.classList.remove('minimized');
    }
  }

  function toggleMaximize() {
    if (!widgetEl) return;
    dealsState.isMaximized = !dealsState.isMaximized;

    if (dealsState.isMaximized) {
      restoreGeom = {
        width: widgetEl.style.width,
        height: widgetEl.style.height,
        top: widgetEl.style.top,
        left: widgetEl.style.left,
        right: widgetEl.style.right
      };
      widgetEl.style.width = 'calc(100vw - 32px)';
      widgetEl.style.height = 'calc(100vh - 48px)';
      widgetEl.style.top = '24px';
      widgetEl.style.left = '16px';
      widgetEl.style.right = '16px';
      if (maximizeBtnEl) {
        maximizeBtnEl.innerHTML = '<svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 9L4 4m0 0l5 0m-5 0l0 5m6 6l5 5m0 0l-5 0m5 0l0-5"></path></svg>';
        maximizeBtnEl.title = 'Restore Window Size';
      }
    } else {
      if (restoreGeom) {
        widgetEl.style.width = restoreGeom.width;
        widgetEl.style.height = restoreGeom.height;
        widgetEl.style.top = restoreGeom.top;
        widgetEl.style.left = restoreGeom.left;
        widgetEl.style.right = restoreGeom.right;
      } else {
        widgetEl.style.width = settings.width + 'px';
        widgetEl.style.height = settings.height + 'px';
      }
      if (maximizeBtnEl) {
        maximizeBtnEl.innerHTML = '<svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 8V4m0 0h4M4 4l5 5m11-5h-4m4 0v4m0-4l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4"></path></svg>';
        maximizeBtnEl.title = 'Maximize Window';
      }
    }
    applyRowDensity();
  }

  // 11. Copy & CSV Export
  function copyTableToClipboard() {
    if (!dealsState.deals || dealsState.deals.length === 0) return;
    var query = dealsState.searchQuery.toLowerCase().trim();
    var filterType = dealsState.filterType;

    var filtered = dealsState.deals.filter(function (d) {
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
    if (!dealsState.deals || dealsState.deals.length === 0) return;
    var rows = [['Exchange', 'Date', 'Client Name', 'Company Name', 'Deal Type', 'Volume', 'Deal Price']];
    dealsState.deals.forEach(function (d) {
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
    toast.className = 'fixed bottom-5 right-5 z-[999999] px-4 py-2 rounded-xl text-xs font-semibold text-white shadow-2xl flex items-center gap-2 ' +
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
      dealsState.searchQuery = e.target.value;
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
        dealsState.filterType = btn.dataset.filter;
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
      if (e.target.closest('button') || dealsState.isMaximized) return;
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
      if (dealsState.isMaximized) return;
      isResizing = true;
      resizeStartX = e.clientX;
      resizeStartY = e.clientY;
      initialWidgetW = widgetEl.offsetWidth;
      initialWidgetH = widgetEl.offsetHeight;
      e.preventDefault();
      e.stopPropagation();
    });

    window.addEventListener('mousemove', function (e) {
      if (isDragging && widgetEl && !dealsState.isMaximized) {
        var dx = e.clientX - dragStartX;
        var dy = e.clientY - dragStartY;
        var newX = Math.max(10, Math.min(window.innerWidth - widgetEl.offsetWidth - 10, initialWidgetX + dx));
        var newY = Math.max(10, Math.min(window.innerHeight - widgetEl.offsetHeight - 10, initialWidgetY + dy));

        widgetEl.style.left = newX + 'px';
        widgetEl.style.right = 'auto';
        widgetEl.style.top = newY + 'px';

        settings.left = newX;
        settings.top = newY;
      } else if (isResizing && widgetEl && !dealsState.isMaximized) {
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
    injectStyles();
    loadSettings();
    createWidgetDom();

    // Bind all launcher buttons on page
    document.querySelectorAll('#btn-open-mf-deals, .btn-mf-deals-launcher').forEach(function (btn) {
      btn.addEventListener('click', function (e) {
        e.preventDefault();
        e.stopPropagation();
        toggleWidget();
      });
    });

    // Initial silent check for new unviewed deals
    fetchDeals(false);

    // Periodic Background Polling every 2.5 minutes
    if (pollTimer) clearInterval(pollTimer);
    pollTimer = setInterval(function () {
      fetchDeals(false);
    }, 150000);

    // Check on window focus
    window.addEventListener('focus', function () {
      fetchDeals(false);
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  // Global window handle
  window.openMfDeals = openWidget;
  window.closeMfDeals = closeWidget;
  window.toggleMfDeals = toggleWidget;
})();
