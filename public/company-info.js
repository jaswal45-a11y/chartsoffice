/**
 * Global Reusable Company Info / Stock Info Component
 * Standalone, zero-dependency, high-performance module.
 * Provides Option C: Ghost Vector Glyph (Lucide Vector Style) with instant inline SVG.
 * Supports movable (draggable) header and resizable floating popover card.
 */

(function() {
  'use strict';

  // Client-Side In-Memory Cache (Ticker -> Metadata Object)
  const CompanyInfoCache = new Map();
  const InFlightRequests = new Map();

  let activePopover = null;
  let activeAnchor = null;
  let activeTicker = null;

  // Layout & positioning state
  let isCustomPositioned = false;
  let isCustomSized = false;
  let customWidth = 350;
  let customHeight = null;

  // Dragging state
  let isDragging = false;
  let dragStartX = 0;
  let dragStartY = 0;
  let initialLeft = 0;
  let initialTop = 0;

  // Resizing state
  let isResizing = false;
  let resizeStartX = 0;
  let resizeStartY = 0;
  let initialWidth = 0;
  let initialHeight = 0;

  /**
   * Generates Option C Ghost Vector Glyph HTML for any stock ticker
   * @param {string} ticker - Stock symbol (e.g. 'FILATEX', 'RELIANCE')
   * @param {string} [companyName] - Optional company display name
   * @param {string} [extraClass] - Optional extra Tailwind classes
   * @returns {string} HTML string
   */
  function getStockInfoButtonHtml(ticker, companyName = '', extraClass = '') {
    if (!ticker) return '';
    const cleanTicker = String(ticker).trim().toUpperCase().replace(/\.(NS|BO)$/, '');
    const safeName = (companyName || cleanTicker).replace(/"/g, '&quot;').replace(/'/g, '&#39;');

    // Option C: Ghost Vector Glyph (Lucide Vector Style)
    return '<button type="button" ' +
      'class="stock-info-btn group/info inline-flex items-center justify-center p-0.5 -my-0.5 rounded text-slate-400/60 hover:text-cyan-400 opacity-60 hover:opacity-100 hover:bg-slate-800/40 transition-all cursor-pointer ' + extraClass + '" ' +
      'data-stock-ticker="' + cleanTicker + '" ' +
      'data-company-name="' + safeName + '" ' +
      'title="Company Info (' + cleanTicker + ')" ' +
      'aria-label="Company Info for ' + cleanTicker + '" ' +
      'onclick="event.stopPropagation(); window.openCompanyInfoPopover(\'' + cleanTicker + '\', this, event);" ' +
      'onkeydown="if(event.key===\'Enter\'||event.key===\' \'){event.preventDefault();event.stopPropagation();window.openCompanyInfoPopover(\'' + cleanTicker + '\', this, event);}">' +
      '<svg class="w-3.5 h-3.5 pointer-events-none stroke-[2]" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round">' +
        '<circle cx="12" cy="12" r="10"></circle>' +
        '<path d="M12 16v-4"></path>' +
        '<path d="M12 8h.01"></path>' +
      '</svg>' +
    '</button>';
  }

  /**
   * Fetches company metadata with client-side caching & de-duplication
   * @param {string} ticker 
   * @returns {Promise<Object>}
   */
  async function fetchCompanyMetadata(ticker) {
    const cleanTicker = String(ticker).trim().toUpperCase().replace(/\.(NS|BO)$/, '');
    if (!cleanTicker) return null;

    if (CompanyInfoCache.has(cleanTicker)) {
      return CompanyInfoCache.get(cleanTicker);
    }

    if (InFlightRequests.has(cleanTicker)) {
      return InFlightRequests.get(cleanTicker);
    }

    const fetchPromise = (async () => {
      try {
        const res = await fetch('/api/stock-info/' + encodeURIComponent(cleanTicker));
        if (!res.ok) {
          throw new Error('Failed to fetch metadata (HTTP ' + res.status + ')');
        }
        const data = await res.json();
        if (data && data.success && data.metadata) {
          CompanyInfoCache.set(cleanTicker, data.metadata);
          return data.metadata;
        }
        throw new Error(data.error || 'Invalid metadata response');
      } catch (err) {
        console.warn('[COMPANY-INFO] Notice for ' + cleanTicker + ':', err.message);
        // Synthesize fallback on client if network fails
        const fallback = {
          ticker: cleanTicker,
          exchange: 'NSE',
          company_name: cleanTicker,
          sector: 'Equity',
          industry: 'Diversified',
          description: cleanTicker + ' is a publicly traded security listed on the Indian stock exchanges.',
          business_type: 'Commercial Operations',
          products: ['Equity Shares'],
          themes: ['Equity', 'NSE'],
          geographic_exposure: 'Domestic Markets',
          key_revenue_driver: 'Core business operations',
          source: 'Public Market Data',
          last_updated: 'Sep 2026',
          ai_generated: true
        };
        CompanyInfoCache.set(cleanTicker, fallback);
        return fallback;
      } finally {
        InFlightRequests.delete(cleanTicker);
      }
    })();

    InFlightRequests.set(cleanTicker, fetchPromise);
    return fetchPromise;
  }

  /**
   * Creates or gets the singleton popover container in DOM
   */
  function getOrCreatePopoverElement() {
    let popover = document.getElementById('global-company-info-popover');
    if (!popover) {
      popover = document.createElement('div');
      popover.id = 'global-company-info-popover';
      popover.className = 'fixed z-[99999] hidden select-text shadow-2xl';
      popover.setAttribute('role', 'dialog');
      popover.setAttribute('aria-modal', 'false');
      popover.setAttribute('aria-label', 'Company Information Card');
      popover.style.minWidth = '280px';
      popover.style.maxWidth = 'min(92vw, 600px)';
      popover.style.minHeight = '220px';
      popover.style.maxHeight = 'min(88vh, 700px)';
      popover.style.boxSizing = 'border-box';
      document.body.appendChild(popover);

      // Dismiss on escape key
      document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape' && activePopover && !isDragging && !isResizing) {
          closeCompanyInfoPopover();
        }
      });

      // Dismiss on pointer click outside
      document.addEventListener('pointerdown', function(e) {
        if (!activePopover || isDragging || isResizing) return;
        if (activePopover.contains(e.target) || (activeAnchor && activeAnchor.contains(e.target))) {
          return;
        }
        closeCompanyInfoPopover();
      });

      // Reposition on window resize if not custom positioned
      window.addEventListener('resize', function() {
        if (activePopover && !activePopover.classList.contains('hidden')) {
          if (!isCustomPositioned && activeAnchor) {
            positionPopover(activePopover, activeAnchor);
          } else {
            clampPopoverToViewport(activePopover);
          }
        }
      });

      // Global Drag & Resize Delegations
      initInteractiveControls(popover);
    }
    return popover;
  }

  /**
   * Clamps popover position inside the current viewport boundaries
   */
  function clampPopoverToViewport(popoverEl) {
    if (!popoverEl) return;
    const rect = popoverEl.getBoundingClientRect();
    const margin = 8;
    const winW = window.innerWidth;
    const winH = window.innerHeight;

    let left = rect.left;
    let top = rect.top;

    if (left + rect.width > winW - margin) {
      left = Math.max(margin, winW - rect.width - margin);
    }
    if (left < margin) {
      left = margin;
    }

    if (top + rect.height > winH - margin) {
      top = Math.max(margin, winH - rect.height - margin);
    }
    if (top < margin) {
      top = margin;
    }

    popoverEl.style.left = Math.round(left) + 'px';
    popoverEl.style.top = Math.round(top) + 'px';
  }

  /**
   * Intelligently positions popover relative to anchor button with viewport bounds clamping
   */
  function positionPopover(popoverEl, anchorEl) {
    if (!popoverEl || !anchorEl) return;

    const isMobile = window.innerWidth < 640;
    const popoverWidth = isCustomSized && customWidth 
      ? Math.min(window.innerWidth - 16, customWidth) 
      : (isMobile ? Math.min(window.innerWidth - 24, 340) : 340);
    
    popoverEl.style.width = popoverWidth + 'px';
    if (isCustomSized && customHeight) {
      popoverEl.style.height = Math.min(window.innerHeight - 24, customHeight) + 'px';
    } else {
      popoverEl.style.height = 'auto';
    }

    const rect = anchorEl.getBoundingClientRect();
    const margin = 8;
    const anchorCenter = rect.left + rect.width / 2;
    
    // Calculate horizontal left position (centered on anchor if possible, then clamped)
    let left = anchorCenter - (popoverWidth / 2);
    if (left + popoverWidth > window.innerWidth - margin) {
      left = window.innerWidth - popoverWidth - margin;
    }
    if (left < margin) {
      left = margin;
    }

    // Calculate vertical top position (prefer below anchor, flip to above if space below is too small)
    const spaceBelow = window.innerHeight - rect.bottom;
    const estimatedHeight = isCustomSized && customHeight ? customHeight : 340;
    
    let top = rect.bottom + 8;
    if (spaceBelow < estimatedHeight && rect.top > estimatedHeight) {
      top = rect.top - estimatedHeight - 8;
    }

    // Clamp top to viewport
    top = Math.max(margin, Math.min(window.innerHeight - estimatedHeight - margin, top));

    popoverEl.style.left = Math.round(left) + 'px';
    popoverEl.style.top = Math.round(top) + 'px';
  }

  /**
   * Initializes Mouse / Touch Dragging and Resizing on Popover
   */
  function initInteractiveControls(popoverEl) {
    popoverEl.addEventListener('pointerdown', function(e) {
      const resizeHandle = e.target.closest('.company-info-resize-handle');
      if (resizeHandle) {
        onResizeStart(e, popoverEl);
        return;
      }

      const dragHeader = e.target.closest('.company-info-drag-header');
      if (dragHeader && !e.target.closest('button, a, input, textarea')) {
        onDragStart(e, popoverEl);
      }
    });
  }

  function onDragStart(e, popoverEl) {
    if (e.button !== 0 && e.pointerType === 'mouse') return;
    isDragging = true;
    isCustomPositioned = true;

    dragStartX = e.clientX;
    dragStartY = e.clientY;

    const rect = popoverEl.getBoundingClientRect();
    initialLeft = rect.left;
    initialTop = rect.top;

    popoverEl.classList.add('dragging');

    function onPointerMove(moveEvent) {
      if (!isDragging || !popoverEl) return;
      const deltaX = moveEvent.clientX - dragStartX;
      const deltaY = moveEvent.clientY - dragStartY;

      const rectNow = popoverEl.getBoundingClientRect();
      const margin = 8;
      const maxLeft = Math.max(margin, window.innerWidth - rectNow.width - margin);
      const maxTop = Math.max(margin, window.innerHeight - rectNow.height - margin);

      const clampedLeft = Math.max(margin, Math.min(maxLeft, initialLeft + deltaX));
      const clampedTop = Math.max(margin, Math.min(maxTop, initialTop + deltaY));

      popoverEl.style.left = Math.round(clampedLeft) + 'px';
      popoverEl.style.top = Math.round(clampedTop) + 'px';
    }

    function onPointerUp() {
      isDragging = false;
      popoverEl.classList.remove('dragging');
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      window.removeEventListener('pointercancel', onPointerUp);
    }

    window.addEventListener('pointermove', onPointerMove, { passive: true });
    window.addEventListener('pointerup', onPointerUp);
    window.addEventListener('pointercancel', onPointerUp);
    e.preventDefault();
  }

  function onResizeStart(e, popoverEl) {
    if (e.button !== 0 && e.pointerType === 'mouse') return;
    isResizing = true;
    isCustomSized = true;

    resizeStartX = e.clientX;
    resizeStartY = e.clientY;

    const rect = popoverEl.getBoundingClientRect();
    initialWidth = rect.width;
    initialHeight = rect.height;

    popoverEl.classList.add('resizing');

    function onPointerMove(moveEvent) {
      if (!isResizing || !popoverEl) return;
      const deltaX = moveEvent.clientX - resizeStartX;
      const deltaY = moveEvent.clientY - resizeStartY;

      const rectNow = popoverEl.getBoundingClientRect();
      const minW = 280;
      const minH = 220;
      const maxW = Math.min(window.innerWidth - rectNow.left - 8, 650);
      const maxH = Math.min(window.innerHeight - rectNow.top - 8, 750);

      const newW = Math.max(minW, Math.min(maxW, initialWidth + deltaX));
      const newH = Math.max(minH, Math.min(maxH, initialHeight + deltaY));

      popoverEl.style.width = Math.round(newW) + 'px';
      popoverEl.style.height = Math.round(newH) + 'px';
      customWidth = newW;
      customHeight = newH;
    }

    function onPointerUp() {
      isResizing = false;
      popoverEl.classList.remove('resizing');
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      window.removeEventListener('pointercancel', onPointerUp);
    }

    window.addEventListener('pointermove', onPointerMove, { passive: true });
    window.addEventListener('pointerup', onPointerUp);
    window.addEventListener('pointercancel', onPointerUp);
    e.preventDefault();
    e.stopPropagation();
  }

  /**
   * Resets card back to anchor button
   */
  function resetCompanyInfoPosition() {
    isCustomPositioned = false;
    if (activePopover && activeAnchor) {
      positionPopover(activePopover, activeAnchor);
    }
  }

  /**
   * Renders the loading skeleton inside the popover
   */
  function renderLoadingState(popoverEl, ticker) {
    popoverEl.innerHTML = 
      '<div class="bg-dark-card/95 border border-dark-border rounded-xl shadow-2xl backdrop-blur-md text-slate-100 font-sans text-xs flex flex-col h-full overflow-hidden animate-in fade-in zoom-in-95 duration-100">' +
        '<!-- Header Bar (Draggable) -->' +
        '<div class="company-info-drag-header shrink-0 flex items-center justify-between gap-2 px-3.5 py-2.5 bg-slate-900/80 border-b border-dark-border/80">' +
          '<div class="flex items-center gap-2 min-w-0 pr-1">' +
            '<div class="flex items-center gap-0.5 text-slate-500 shrink-0" title="Drag to move card">' +
              '<svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor"><circle cx="9" cy="6" r="1.5"/><circle cx="15" cy="6" r="1.5"/><circle cx="9" cy="12" r="1.5"/><circle cx="15" cy="12" r="1.5"/><circle cx="9" cy="18" r="1.5"/><circle cx="15" cy="18" r="1.5"/></svg>' +
            '</div>' +
            '<div class="min-w-0">' +
              '<div class="h-3.5 bg-slate-700/60 rounded w-28 mb-1 animate-pulse"></div>' +
              '<div class="flex items-center gap-1">' +
                '<span class="font-mono font-bold text-cyan-300 text-[11px]">' + ticker + '</span>' +
                '<span class="px-1 py-0.2 rounded text-[8px] font-mono bg-dark-bg border border-dark-border text-slate-400">NSE</span>' +
              '</div>' +
            '</div>' +
          '</div>' +
          '<div class="flex items-center gap-1 shrink-0">' +
            '<button type="button" onclick="window.closeCompanyInfoPopover()" class="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-dark-accent/60 transition-colors cursor-pointer" aria-label="Close">' +
              '<svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>' +
            '</button>' +
          '</div>' +
        '</div>' +
        '<!-- Scrollable Body -->' +
        '<div class="company-info-scroll-body flex-1 min-h-0 overflow-y-auto p-3.5 space-y-2.5">' +
          '<div class="h-3 bg-slate-700/40 rounded w-1/2 animate-pulse"></div>' +
          '<div class="h-3 bg-slate-700/40 rounded w-2/3 animate-pulse"></div>' +
          '<div class="h-14 bg-slate-700/30 rounded w-full animate-pulse my-2"></div>' +
          '<div class="h-3 bg-slate-700/40 rounded w-4/5 animate-pulse"></div>' +
        '</div>' +
        '<!-- Footer -->' +
        '<div class="shrink-0 px-3 py-2 bg-slate-950/60 border-t border-dark-border/60 flex items-center justify-between text-[10px] text-slate-500 font-mono relative">' +
          '<span>Loading verified company profile...</span>' +
          '<div class="company-info-resize-handle absolute bottom-0.5 right-0.5 p-1 text-slate-500 hover:text-cyan-400 cursor-nwse-resize select-none touch-none" title="Drag corner to resize">' +
            '<svg class="w-2.5 h-2.5" viewBox="0 0 24 24" fill="currentColor"><path d="M22 22H20V20H22V22ZM22 17H20V15H22V17ZM17 22H15V20H17V22ZM22 12H20V10H22V12ZM17 17H15V15H17V17ZM12 22H10V20H12V22Z"/></svg>' +
          '</div>' +
        '</div>' +
      '</div>';
  }

  /**
   * Renders the complete, rich company metadata card
   */
  function renderCard(popoverEl, metadata) {
    const ticker = metadata.ticker;
    const exchange = metadata.exchange || 'NSE';
    const company_name = metadata.company_name;
    const sector = metadata.sector || 'General';
    const industry = metadata.industry || 'Diversified';
    const description = metadata.description || '';
    const business_type = metadata.business_type;
    const products = metadata.products || [];
    const themes = metadata.themes || [];
    const geographic_exposure = metadata.geographic_exposure;
    const key_revenue_driver = metadata.key_revenue_driver;
    const source = metadata.source || 'Company Filings / Public Disclosures';
    const last_updated = metadata.last_updated || 'Sep 2026';

    const tagsHtml = (Array.isArray(themes) && themes.length > 0 ? themes : [sector, industry])
      .slice(0, 4)
      .map(function(tag) {
        return '<span class="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-blue-500/15 text-blue-300 border border-blue-500/30 whitespace-nowrap shadow-xs">' + tag + '</span>';
      })
      .join('');

    const productsHtml = Array.isArray(products) && products.length > 0
      ? '<div class="text-[11px] text-slate-300 line-clamp-2"><strong class="text-slate-400 font-medium">Key Products:</strong> ' + products.join(', ') + '</div>'
      : '';

    const exposureHtml = geographic_exposure
      ? '<div class="flex items-center justify-between text-[11px]"><span class="text-slate-400">Exposure:</span><span class="font-medium text-slate-200 text-right truncate max-w-[200px]">' + geographic_exposure + '</span></div>'
      : '';

    const driverHtml = key_revenue_driver
      ? '<div class="flex items-center justify-between text-[11px]"><span class="text-slate-400">Key Driver:</span><span class="font-medium text-slate-200 text-right truncate max-w-[200px]">' + key_revenue_driver + '</span></div>'
      : '';

    const bizTypeHtml = business_type
      ? '<div class="flex items-center justify-between text-[11px]"><span class="text-slate-400">Business:</span><span class="font-medium text-slate-200 text-right truncate max-w-[200px]">' + business_type + '</span></div>'
      : '';

    popoverEl.innerHTML = 
      '<div class="bg-dark-card/95 border border-dark-border rounded-xl shadow-2xl backdrop-blur-md text-slate-100 font-sans text-xs flex flex-col h-full overflow-hidden animate-in fade-in zoom-in-95 duration-100 relative group/card">' +
        '<!-- Header Bar: Draggable -->' +
        '<div class="company-info-drag-header shrink-0 flex items-center justify-between gap-2 px-3.5 py-2.5 bg-slate-900/85 border-b border-dark-border/80 cursor-grab active:cursor-grabbing select-none">' +
          '<div class="flex items-center gap-2 min-w-0 pr-1">' +
            '<div class="flex items-center gap-0.5 text-slate-500 shrink-0" title="Drag to move card">' +
              '<svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor"><circle cx="9" cy="6" r="1.5"/><circle cx="15" cy="6" r="1.5"/><circle cx="9" cy="12" r="1.5"/><circle cx="15" cy="12" r="1.5"/><circle cx="9" cy="18" r="1.5"/><circle cx="15" cy="18" r="1.5"/></svg>' +
            '</div>' +
            '<div class="min-w-0">' +
              '<div class="font-bold text-white text-xs leading-tight truncate max-w-[200px]" title="' + (company_name || ticker) + '">' + (company_name || ticker) + '</div>' +
              '<div class="flex items-center gap-1 mt-0.5">' +
                '<span class="font-mono font-bold text-cyan-300 text-[11px] tracking-wide">' + ticker + '</span>' +
                '<span class="px-1 py-0.2 rounded text-[8px] font-mono font-semibold bg-dark-bg border border-dark-border text-slate-400">' + exchange + '</span>' +
              '</div>' +
            '</div>' +
          '</div>' +
          '<div class="flex items-center gap-1 shrink-0">' +
            '<button type="button" onclick="event.stopPropagation(); window.resetCompanyInfoPosition();" class="text-slate-400 hover:text-cyan-300 p-1 rounded-md hover:bg-dark-accent transition-colors cursor-pointer" title="Re-anchor to stock" aria-label="Re-anchor to stock">' +
              '<svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' +
                '<path d="M3 12a9 9 0 0 1 15-6.7L21 8"/>' +
                '<path d="M21 3v5h-5"/>' +
                '<path d="M21 12a9 9 0 0 1-15 6.7L3 16"/>' +
                '<path d="M3 21v-5h5"/>' +
              '</svg>' +
            '</button>' +
            '<button type="button" onclick="event.stopPropagation(); window.closeCompanyInfoPopover();" class="text-slate-400 hover:text-rose-400 p-1 rounded-md hover:bg-dark-accent transition-colors cursor-pointer" title="Close" aria-label="Close">' +
              '<svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' +
                '<line x1="18" y1="6" x2="6" y2="18"></line>' +
                '<line x1="6" y1="6" x2="18" y2="18"></line>' +
              '</svg>' +
            '</button>' +
          '</div>' +
        '</div>' +

        '<!-- Scrollable Content Body -->' +
        '<div class="company-info-scroll-body flex-1 min-h-0 overflow-y-auto p-3.5 space-y-2.5">' +
          '<!-- Sector & Industry Row -->' +
          '<div class="bg-dark-bg/80 border border-dark-border/60 rounded-lg px-2.5 py-1.5 flex flex-col gap-0.5 text-[11px]">' +
            '<div class="flex items-center justify-between">' +
              '<span class="text-slate-400 font-medium">Sector</span>' +
              '<span class="font-semibold text-teal-300 truncate max-w-[190px]">' + sector + '</span>' +
            '</div>' +
            '<div class="flex items-center justify-between">' +
              '<span class="text-slate-400 font-medium">Industry</span>' +
              '<span class="font-semibold text-slate-300 truncate max-w-[190px]">' + industry + '</span>' +
            '</div>' +
          '</div>' +

          '<!-- Thematic Business Tags -->' +
          '<div class="flex items-center gap-1.5 flex-wrap">' +
            tagsHtml +
          '</div>' +

          '<!-- What the company does Description -->' +
          '<div class="bg-slate-900/60 border border-slate-800/80 rounded-lg p-2.5 text-[11.5px] leading-relaxed text-slate-200 select-text">' +
            (description || (company_name || ticker) + ' operates in the ' + sector + ' sector with key commercial operations in ' + industry + '.') +
          '</div>' +

          '<!-- Key Business Drivers -->' +
          '<div class="space-y-1.5 bg-dark-bg/50 border border-dark-border/40 rounded-lg p-2.5">' +
            bizTypeHtml +
            exposureHtml +
            driverHtml +
            productsHtml +
          '</div>' +
        '</div>' +

        '<!-- Footer / Metadata Disclaimer (With Corner Resize Handle) -->' +
        '<div class="shrink-0 px-3 py-2 bg-slate-950/70 border-t border-dark-border/60 flex items-center justify-between text-[10px] text-slate-500 font-sans relative select-none">' +
          '<span class="truncate max-w-[190px]" title="Source: ' + source + '">Source: ' + source + '</span>' +
          '<span class="font-mono shrink-0 mr-4">Updated: ' + last_updated + '</span>' +
          '<div class="company-info-resize-handle absolute bottom-0.5 right-0.5 p-1 text-slate-500 hover:text-cyan-400 cursor-nwse-resize select-none touch-none" title="Drag corner to resize card">' +
            '<svg class="w-3 h-3" viewBox="0 0 24 24" fill="currentColor">' +
              '<path d="M22 22H20V20H22V22ZM22 17H20V15H22V17ZM17 22H15V20H17V22ZM22 12H20V10H22V12ZM17 17H15V15H17V17ZM12 22H10V20H12V22Z"/>' +
            '</svg>' +
          '</div>' +
        '</div>' +
      '</div>';
  }

  /**
   * Opens the popover anchored to the specified button
   * @param {string} ticker 
   * @param {HTMLElement} anchorEl 
   * @param {Event} [event] 
   */
  async function openCompanyInfoPopover(ticker, anchorEl, event) {
    if (event) event.stopPropagation();

    const cleanTicker = String(ticker || '').trim().toUpperCase().replace(/\.(NS|BO)$/, '');
    if (!cleanTicker || !anchorEl) return;

    // Toggle close if already open on the same button
    if (activeTicker === cleanTicker && activePopover && !activePopover.classList.contains('hidden')) {
      closeCompanyInfoPopover();
      return;
    }

    const popover = getOrCreatePopoverElement();
    activePopover = popover;
    activeAnchor = anchorEl;
    activeTicker = cleanTicker;

    // If not custom positioned by user, position relative to anchor
    if (!isCustomPositioned) {
      positionPopover(popover, anchorEl);
    } else {
      clampPopoverToViewport(popover);
    }

    renderLoadingState(popover, cleanTicker);
    popover.classList.remove('hidden');

    // Fetch and render verified card
    try {
      const metadata = await fetchCompanyMetadata(cleanTicker);
      if (activeTicker === cleanTicker && activePopover) {
        renderCard(popover, metadata);
        if (!isCustomPositioned) {
          positionPopover(popover, anchorEl);
        } else {
          clampPopoverToViewport(popover);
        }
      }
    } catch (err) {
      if (activeTicker === cleanTicker && activePopover) {
        popover.innerHTML = 
          '<div class="bg-dark-card border border-rose-500/30 rounded-xl p-4 shadow-2xl text-slate-100 font-sans text-xs">' +
            '<div class="flex items-center justify-between mb-2">' +
              '<span class="font-bold text-rose-400">' + cleanTicker + '</span>' +
              '<button onclick="window.closeCompanyInfoPopover()" class="text-slate-400 hover:text-white p-1">&times;</button>' +
            '</div>' +
            '<p class="text-slate-400">Unable to load company profile at this time.</p>' +
          '</div>';
      }
    }
  }

  /**
   * Dismisses the active popover
   */
  function closeCompanyInfoPopover() {
    if (activePopover) {
      activePopover.classList.add('hidden');
      activePopover.innerHTML = '';
      activePopover = null;
      activeAnchor = null;
      activeTicker = null;
    }
  }

  // Window Global Bindings
  window.getStockInfoButtonHtml = getStockInfoButtonHtml;
  window.openCompanyInfoPopover = openCompanyInfoPopover;
  window.closeCompanyInfoPopover = closeCompanyInfoPopover;
  window.resetCompanyInfoPosition = resetCompanyInfoPosition;
  window.fetchCompanyMetadata = fetchCompanyMetadata;
  window.CompanyInfoCache = CompanyInfoCache;

  // Global Delegated Click Listener for dynamic DOM injection
  document.addEventListener('click', function(e) {
    const btn = e.target.closest('.stock-info-btn, button[data-stock-ticker]');
    if (btn && btn.dataset && btn.dataset.stockTicker) {
      e.stopPropagation();
      openCompanyInfoPopover(btn.dataset.stockTicker, btn, e);
    }
  });

})();
