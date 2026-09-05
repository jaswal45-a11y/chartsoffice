
(function () {
  'use strict';

  var STORAGE_KEY_CONTENT = 'sangam_user_notes';
  var STORAGE_KEY_SETTINGS = 'sangam_notes_settings';
  var CHANNEL_NAME = 'sangam_notes_broadcast_channel';

  var broadcastChannel = null;
  try {
    if (typeof BroadcastChannel !== 'undefined') {
      broadcastChannel = new BroadcastChannel(CHANNEL_NAME);
    }
  } catch (e) {
    console.warn('[Notes] BroadcastChannel not supported, falling back to StorageEvent', e);
  }

  var defaultSettings = {
    isOpen: false,
    isMinimized: false,
    width: 360,
    height: 420,
    top: 90,
    left: null,
    fontSize: 13
  };

  var settings = Object.assign({}, defaultSettings);
  var currentContent = '';
  var saveDebounceTimer = null;
  var serverSyncTimer = null;
  var isDragging = false;
  var dragStartX = 0;
  var dragStartY = 0;
  var initialWidgetX = 0;
  var initialWidgetY = 0;

  var widgetEl = null;
  var headerEl = null;
  var textareaEl = null;
  var statusBadgeEl = null;
  var statsEl = null;
  var minimizeBtnEl = null;
  var bodyContainerEl = null;

  function loadPersistedState() {
    try {
      var savedSettings = localStorage.getItem(STORAGE_KEY_SETTINGS);
      if (savedSettings) {
        settings = Object.assign({}, defaultSettings, JSON.parse(savedSettings));
      }
    } catch (e) {}

    try {
      currentContent = localStorage.getItem(STORAGE_KEY_CONTENT) || '';
    } catch (e) {
      currentContent = '';
    }
  }

  function saveSettings() {
    try {
      localStorage.setItem(STORAGE_KEY_SETTINGS, JSON.stringify(settings));
    } catch (e) {}
  }

  function saveContent(content, source) {
    source = source || 'local';
    currentContent = content;
    try {
      localStorage.setItem(STORAGE_KEY_CONTENT, content);
    } catch (e) {}

    updateStats();
    showSyncStatus('saved');

    if (source === 'local' && broadcastChannel) {
      try {
        broadcastChannel.postMessage({
          type: 'NOTES_UPDATE',
          content: content,
          timestamp: Date.now()
        });
      } catch (e) {}
    }

    if (source === 'local') {
      clearTimeout(serverSyncTimer);
      serverSyncTimer = setTimeout(syncToServer, 800);
    }
  }

  function syncToServer() {
    var token = localStorage.getItem('authToken') || localStorage.getItem('adminToken');
    if (!token) return;

    try {
      fetch('/api/user/notes', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ' + token
        },
        body: JSON.stringify({ notes: currentContent })
      }).catch(function () {});
    } catch (e) {}
  }

  function loadFromServer() {
    var token = localStorage.getItem('authToken') || localStorage.getItem('adminToken');
    if (!token) return;

    try {
      fetch('/api/user/notes', {
        headers: { 'Authorization': 'Bearer ' + token }
      }).then(function (res) {
        return res.json();
      }).then(function (data) {
        if (data && data.success && typeof data.notes === 'string') {
          currentContent = data.notes;
          if (textareaEl) textareaEl.value = currentContent;
          try { localStorage.setItem(STORAGE_KEY_CONTENT, currentContent); } catch (e) {}
          updateStats();
        }
      }).catch(function () {});
    } catch (e) {}
  }

  function injectStyles() {
    if (document.getElementById('sangam-notes-styles')) return;
    var style = document.createElement('style');
    style.id = 'sangam-notes-styles';
    style.textContent = '' +
      '#sangam-notes-widget {' +
      '  position: fixed;' +
      '  z-index: 9999;' +
      '  display: flex;' +
      '  flex-direction: column;' +
      '  background: rgba(15, 23, 42, 0.96);' +
      '  backdrop-filter: blur(16px);' +
      '  -webkit-backdrop-filter: blur(16px);' +
      '  border: 1px solid rgba(59, 130, 246, 0.4);' +
      '  border-radius: 16px;' +
      '  box-shadow: 0 20px 45px -12px rgba(0, 0, 0, 0.8), 0 0 25px 2px rgba(59, 130, 246, 0.18);' +
      '  color: #f1f5f9;' +
      '  font-family: Inter, system-ui, -apple-system, sans-serif;' +
      '  box-sizing: border-box;' +
      '  transition: box-shadow 0.2s ease, border-color 0.2s ease;' +
      '  resize: both;' +
      '  overflow: hidden;' +
      '  min-width: 290px;' +
      '  min-height: 200px;' +
      '  max-width: 95vw;' +
      '  max-height: 90vh;' +
      '}' +
      '#sangam-notes-widget.minimized {' +
      '  resize: none !important;' +
      '  height: auto !important;' +
      '  min-height: 0 !important;' +
      '  width: auto !important;' +
      '  min-width: 260px !important;' +
      '  box-shadow: 0 10px 25px -5px rgba(0,0,0,0.6);' +
      '}' +
      '#sangam-notes-widget.minimized #notes-body-container {' +
      '  display: none !important;' +
      '}' +
      '#sangam-notes-widget:focus-within {' +
      '  border-color: rgba(59, 130, 246, 0.7);' +
      '  box-shadow: 0 20px 50px -10px rgba(0, 0, 0, 0.85), 0 0 30px 4px rgba(59, 130, 246, 0.28);' +
      '}' +
      '.notes-header-drag {' +
      '  cursor: grab;' +
      '  user-select: none;' +
      '  touch-action: none;' +
      '}' +
      '.notes-header-drag:active {' +
      '  cursor: grabbing;' +
      '}' +
      '.notes-btn {' +
      '  display: inline-flex;' +
      '  align-items: center;' +
      '  justify-content: center;' +
      '  padding: 4px 8px;' +
      '  border-radius: 8px;' +
      '  font-size: 11px;' +
      '  font-weight: 600;' +
      '  background: rgba(30, 41, 59, 0.8);' +
      '  border: 1px solid rgba(51, 65, 85, 0.8);' +
      '  color: #cbd5e1;' +
      '  cursor: pointer;' +
      '  transition: all 0.15s ease;' +
      '}' +
      '.notes-btn:hover {' +
      '  background: rgba(51, 65, 85, 0.9);' +
      '  color: #ffffff;' +
      '  border-color: rgba(100, 116, 139, 0.8);' +
      '}' +
      '.notes-btn:active {' +
      '  transform: scale(0.95);' +
      '}' +
      '.notes-textarea {' +
      '  flex: 1;' +
      '  width: 100%;' +
      '  background: transparent;' +
      '  color: #f8fafc;' +
      '  border: none;' +
      '  outline: none;' +
      '  resize: none;' +
      '  padding: 12px 14px;' +
      '  font-family: "JetBrains Mono", Inter, monospace;' +
      '  line-height: 1.6;' +
      '  box-sizing: border-box;' +
      '}' +
      '.notes-textarea::placeholder {' +
      '  color: #64748b;' +
      '  font-style: italic;' +
      '}' +
      '.notes-tag-pill {' +
      '  display: inline-flex;' +
      '  align-items: center;' +
      '  gap: 3px;' +
      '  padding: 2px 7px;' +
      '  border-radius: 6px;' +
      '  font-size: 10px;' +
      '  font-weight: 600;' +
      '  cursor: pointer;' +
      '  background: rgba(30, 41, 59, 0.7);' +
      '  border: 1px solid rgba(51, 65, 85, 0.6);' +
      '  color: #94a3b8;' +
      '  transition: all 0.15s ease;' +
      '}' +
      '.notes-tag-pill:hover {' +
      '  background: rgba(59, 130, 246, 0.15);' +
      '  border-color: rgba(59, 130, 246, 0.4);' +
      '  color: #93c5fd;' +
      '}' +
      '.notes-tag-pill:active {' +
      '  transform: scale(0.94);' +
      '}' +
      '@keyframes notes-pulse-green {' +
      '  0%, 100% { opacity: 1; }' +
      '  50% { opacity: 0.4; }' +
      '}' +
      '.notes-dot-pulse {' +
      '  animation: notes-pulse-green 2s infinite;' +
      '}';
    document.head.appendChild(style);
  }

  function createWidget() {
    if (document.getElementById('sangam-notes-widget')) return;

    injectStyles();

    widgetEl = document.createElement('div');
    widgetEl.id = 'sangam-notes-widget';
    widgetEl.setAttribute('role', 'dialog');
    widgetEl.setAttribute('aria-label', 'Trading Notes & Scratchpad');

    widgetEl.innerHTML = '' +
      '<div id="notes-header-bar" class="notes-header-drag flex items-center justify-between px-3.5 py-2.5 bg-slate-800/90 border-b border-slate-700/60 rounded-t-2xl">' +
      '  <div class="flex items-center gap-2">' +
      '    <span class="w-2.5 h-2.5 rounded-full bg-amber-400 shadow-sm shadow-amber-400/50"></span>' +
      '    <div class="flex items-center gap-1.5">' +
      '      <span class="font-bold text-xs tracking-tight text-white flex items-center gap-1">' +
      '        <span>📌</span> Quick Notes' +
      '      </span>' +
      '      <span id="notes-sync-badge" class="px-1.5 py-0.2 text-[9px] font-semibold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 rounded flex items-center gap-1">' +
      '        <span class="w-1.5 h-1.5 rounded-full bg-emerald-400 notes-dot-pulse"></span>' +
      '        <span>Synced</span>' +
      '      </span>' +
      '    </div>' +
      '  </div>' +
      '  <div class="flex items-center gap-1">' +
      '    <button id="btn-notes-font-dec" class="notes-btn text-[10px] px-1.5 py-0.5" title="Decrease Font Size">A-</button>' +
      '    <button id="btn-notes-font-inc" class="notes-btn text-[10px] px-1.5 py-0.5" title="Increase Font Size">A+</button>' +
      '    <button id="btn-notes-minimize" class="notes-btn text-xs px-2 py-0.5" title="Minimize / Expand">' +
      '      <span id="notes-min-icon">➖</span>' +
      '    </button>' +
      '    <button id="btn-notes-close" class="notes-btn text-xs px-2 py-0.5 hover:bg-rose-500/20 hover:text-rose-400 hover:border-rose-500/40" title="Close Notes Window">' +
      '      ✕' +
      '    </button>' +
      '  </div>' +
      '</div>' +
      '<div id="notes-body-container" class="flex flex-col flex-1 min-h-0 bg-slate-900/60">' +
      '  <div class="flex items-center justify-between px-3 py-1.5 bg-slate-900/90 border-b border-slate-800 text-[11px] gap-1 flex-wrap">' +
      '    <div class="flex items-center gap-1 flex-wrap">' +
      '      <button id="btn-tag-time" class="notes-tag-pill" title="Insert Current Date & Time">' +
      '        <span>🕒</span> +Time' +
      '      </button>' +
      '      <button id="btn-tag-todo" class="notes-tag-pill" title="Insert Todo Checkbox">' +
      '        <span>☑</span> Todo' +
      '      </button>' +
      '      <button id="btn-tag-target" class="notes-tag-pill" title="Insert Target Note">' +
      '        <span>⭐</span> Target' +
      '      </button>' +
      '      <button id="btn-tag-sl" class="notes-tag-pill" title="Insert Stoploss Note">' +
      '        <span>🛑</span> SL' +
      '      </button>' +
      '      <button id="btn-tag-level" class="notes-tag-pill" title="Insert Key Level">' +
      '        <span>📊</span> Level' +
      '      </button>' +
      '    </div>' +
      '    <div class="flex items-center gap-1">' +
      '      <button id="btn-notes-copy" class="notes-tag-pill hover:text-emerald-400" title="Copy Notes to Clipboard">' +
      '        <span>📋</span> Copy' +
      '      </button>' +
      '      <button id="btn-notes-clear" class="notes-tag-pill hover:text-rose-400 hover:border-rose-500/30" title="Clear all notes">' +
      '        <span>🗑️</span> Clear' +
      '      </button>' +
      '    </div>' +
      '  </div>' +
      '  <div class="flex-1 min-h-0 relative flex flex-col">' +
      '    <textarea id="notes-textarea" class="notes-textarea" placeholder="Write your trading levels, setups, watchlists & notes here...\n\n• Real-time synchronized across all open browser tabs\n• Auto-saved continuously"></textarea>' +
      '  </div>' +
      '  <div class="flex items-center justify-between px-3 py-1.5 bg-slate-900/95 border-t border-slate-800/80 text-[10px] text-slate-400 select-none">' +
      '    <div id="notes-live-stats" class="font-mono">' +
      '      0 words | 0 chars' +
      '    </div>' +
      '    <div class="flex items-center gap-1.5 text-slate-500">' +
      '      <span class="w-1.5 h-1.5 rounded-full bg-emerald-500/80"></span>' +
      '      <span>Multi-Tab Live Sync</span>' +
      '    </div>' +
      '  </div>' +
      '</div>';

    document.body.appendChild(widgetEl);

    headerEl = document.getElementById('notes-header-bar');
    textareaEl = document.getElementById('notes-textarea');
    statusBadgeEl = document.getElementById('notes-sync-badge');
    statsEl = document.getElementById('notes-live-stats');
    minimizeBtnEl = document.getElementById('btn-notes-minimize');
    bodyContainerEl = document.getElementById('notes-body-container');

    textareaEl.value = currentContent;
    applyFontSize();
    updateStats();
    applyGeometry();
    setupEventListeners();
  }

  function setupEventListeners() {
    textareaEl.addEventListener('input', function () {
      showSyncStatus('saving');
      clearTimeout(saveDebounceTimer);
      saveDebounceTimer = setTimeout(function () {
        saveContent(textareaEl.value, 'local');
      }, 120);
    });

    textareaEl.addEventListener('keydown', function (e) {
      if (e.key === 'Tab') {
        e.preventDefault();
        var start = textareaEl.selectionStart;
        var end = textareaEl.selectionEnd;
        textareaEl.value = textareaEl.value.substring(0, start) + '  ' + textareaEl.value.substring(end);
        textareaEl.selectionStart = textareaEl.selectionEnd = start + 2;
        textareaEl.dispatchEvent(new Event('input'));
      }
    });

    headerEl.addEventListener('mousedown', onDragStart);
    headerEl.addEventListener('touchstart', onDragStart, { passive: false });

    var btnTime = document.getElementById('btn-tag-time');
    if (btnTime) {
      btnTime.addEventListener('click', function () {
        var now = new Date();
        var timeStr = now.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }) + ' ' +
          now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
        insertAtCursor('\n[' + timeStr + '] ');
      });
    }

    var btnTodo = document.getElementById('btn-tag-todo');
    if (btnTodo) {
      btnTodo.addEventListener('click', function () {
        insertAtCursor('\n• [ ] ');
      });
    }

    var btnTarget = document.getElementById('btn-tag-target');
    if (btnTarget) {
      btnTarget.addEventListener('click', function () {
        insertAtCursor('\n⭐ Target: ₹');
      });
    }

    var btnSl = document.getElementById('btn-tag-sl');
    if (btnSl) {
      btnSl.addEventListener('click', function () {
        insertAtCursor('\n🛑 Stoploss: ₹');
      });
    }

    var btnLevel = document.getElementById('btn-tag-level');
    if (btnLevel) {
      btnLevel.addEventListener('click', function () {
        insertAtCursor('\n📊 Key Level: ₹');
      });
    }

    var btnCopy = document.getElementById('btn-notes-copy');
    if (btnCopy) {
      btnCopy.addEventListener('click', function () {
        if (!textareaEl.value.trim()) return;
        navigator.clipboard.writeText(textareaEl.value).then(function () {
          showSyncStatus('copied');
        }).catch(function () {});
      });
    }

    var btnClear = document.getElementById('btn-notes-clear');
    if (btnClear) {
      btnClear.addEventListener('click', function () {
        if (!textareaEl.value.trim()) return;
        if (confirm('Are you sure you want to clear all notes in this scratchpad?')) {
          textareaEl.value = '';
          saveContent('', 'local');
          textareaEl.focus();
        }
      });
    }

    var btnFontInc = document.getElementById('btn-notes-font-inc');
    if (btnFontInc) {
      btnFontInc.addEventListener('click', function () {
        settings.fontSize = Math.min(20, (settings.fontSize || 13) + 1);
        applyFontSize();
        saveSettings();
      });
    }

    var btnFontDec = document.getElementById('btn-notes-font-dec');
    if (btnFontDec) {
      btnFontDec.addEventListener('click', function () {
        settings.fontSize = Math.max(10, (settings.fontSize || 13) - 1);
        applyFontSize();
        saveSettings();
      });
    }

    if (minimizeBtnEl) {
      minimizeBtnEl.addEventListener('click', toggleMinimize);
    }

    var btnClose = document.getElementById('btn-notes-close');
    if (btnClose) {
      btnClose.addEventListener('click', closeWidget);
    }

    if (typeof ResizeObserver !== 'undefined') {
      var resizeObserver = new ResizeObserver(function (entries) {
        if (settings.isMinimized || !settings.isOpen) return;
        for (var i = 0; i < entries.length; i++) {
          var entry = entries[i];
          if (entry.contentRect.width > 100 && entry.contentRect.height > 80) {
            settings.width = Math.round(widgetEl.offsetWidth);
            settings.height = Math.round(widgetEl.offsetHeight);
            saveSettings();
          }
        }
      });
      resizeObserver.observe(widgetEl);
    }

    if (broadcastChannel) {
      broadcastChannel.onmessage = function (event) {
        if (event.data && event.data.type === 'NOTES_UPDATE') {
          handleIncomingSync(event.data.content);
        }
      };
    }

    window.addEventListener('storage', function (e) {
      if (e.key === STORAGE_KEY_CONTENT && e.newValue !== null) {
        handleIncomingSync(e.newValue);
      }
    });

    window.addEventListener('resize', clampToViewport);
  }

  function handleIncomingSync(newContent) {
    if (newContent === currentContent) return;
    currentContent = newContent;
    if (textareaEl) {
      var activeEl = document.activeElement;
      var isFocused = (activeEl === textareaEl);
      var start = textareaEl.selectionStart;
      var end = textareaEl.selectionEnd;

      textareaEl.value = newContent;

      if (isFocused) {
        textareaEl.selectionStart = Math.min(start, newContent.length);
        textareaEl.selectionEnd = Math.min(end, newContent.length);
      }
    }
    updateStats();
    showSyncStatus('synced');
  }

  function insertAtCursor(textToInsert) {
    if (!textareaEl) return;
    var start = textareaEl.selectionStart;
    var end = textareaEl.selectionEnd;
    var text = textareaEl.value;
    textareaEl.value = text.substring(0, start) + textToInsert + text.substring(end);
    textareaEl.selectionStart = textareaEl.selectionEnd = start + textToInsert.length;
    textareaEl.focus();
    textareaEl.dispatchEvent(new Event('input'));
  }

  function updateStats() {
    if (!statsEl || !textareaEl) return;
    var text = textareaEl.value || '';
    var chars = text.length;
    var words = text.trim() ? text.trim().split(/\s+/).length : 0;
    var lines = text ? text.split('\n').length : 0;
    statsEl.textContent = words + ' word' + (words !== 1 ? 's' : '') + ' | ' + chars + ' char' + (chars !== 1 ? 's' : '') + ' (' + lines + 'L)';
  }

  function showSyncStatus(status) {
    if (!statusBadgeEl) return;
    if (status === 'saving') {
      statusBadgeEl.className = 'px-1.5 py-0.2 text-[9px] font-semibold bg-amber-500/15 text-amber-400 border border-amber-500/30 rounded flex items-center gap-1';
      statusBadgeEl.innerHTML = '<span class="w-1.5 h-1.5 rounded-full bg-amber-400 animate-spin"></span><span>Saving...</span>';
    } else if (status === 'saved' || status === 'synced') {
      statusBadgeEl.className = 'px-1.5 py-0.2 text-[9px] font-semibold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 rounded flex items-center gap-1';
      statusBadgeEl.innerHTML = '<span class="w-1.5 h-1.5 rounded-full bg-emerald-400 notes-dot-pulse"></span><span>' + (status === 'synced' ? 'Synced ✓' : 'Saved ✓') + '</span>';
    } else if (status === 'copied') {
      statusBadgeEl.className = 'px-1.5 py-0.2 text-[9px] font-semibold bg-blue-500/15 text-blue-400 border border-blue-500/30 rounded flex items-center gap-1';
      statusBadgeEl.innerHTML = '<span>Copied! ✓</span>';
      setTimeout(function () { showSyncStatus('saved'); }, 1500);
    }
  }

  function applyFontSize() {
    if (!textareaEl) return;
    textareaEl.style.fontSize = (settings.fontSize || 13) + 'px';
  }

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
      var minIcon = document.getElementById('notes-min-icon');
      if (minIcon) minIcon.textContent = '🗖';
    } else {
      widgetEl.classList.remove('minimized');
      var minIcon = document.getElementById('notes-min-icon');
      if (minIcon) minIcon.textContent = '➖';
      widgetEl.style.width = (settings.width || defaultSettings.width) + 'px';
      widgetEl.style.height = (settings.height || defaultSettings.height) + 'px';
    }

    var winW = window.innerWidth;
    var winH = window.innerHeight;

    var left = settings.left;
    var top = settings.top;

    if (left === null || left === undefined) {
      left = Math.max(20, winW - (settings.width || defaultSettings.width) - 24);
    }
    if (top === null || top === undefined) {
      top = 80;
    }

    left = Math.max(10, Math.min(left, winW - 120));
    top = Math.max(10, Math.min(top, winH - 60));

    widgetEl.style.left = left + 'px';
    widgetEl.style.top = top + 'px';
  }

  function clampToViewport() {
    if (!widgetEl || !settings.isOpen) return;
    var rect = widgetEl.getBoundingClientRect();
    var winW = window.innerWidth;
    var winH = window.innerHeight;

    var newLeft = rect.left;
    var newTop = rect.top;

    if (rect.right > winW) newLeft = Math.max(10, winW - rect.width - 15);
    if (rect.bottom > winH) newTop = Math.max(10, winH - rect.height - 15);
    if (newLeft < 10) newLeft = 10;
    if (newTop < 10) newTop = 10;

    settings.left = Math.round(newLeft);
    settings.top = Math.round(newTop);
    widgetEl.style.left = newLeft + 'px';
    widgetEl.style.top = newTop + 'px';
    saveSettings();
  }

  function onDragStart(e) {
    if (e.target.closest('button') || e.target.closest('.notes-tag-pill')) return;
    isDragging = true;

    var clientX = e.type.startsWith('touch') ? e.touches[0].clientX : e.clientX;
    var clientY = e.type.startsWith('touch') ? e.touches[0].clientY : e.clientY;

    dragStartX = clientX;
    dragStartY = clientY;

    var rect = widgetEl.getBoundingClientRect();
    initialWidgetX = rect.left;
    initialWidgetY = rect.top;

    document.addEventListener('mousemove', onDragMove);
    document.addEventListener('mouseup', onDragEnd);
    document.addEventListener('touchmove', onDragMove, { passive: false });
    document.addEventListener('touchend', onDragEnd);

    if (e.type.startsWith('touch')) {
      e.preventDefault();
    }
  }

  function onDragMove(e) {
    if (!isDragging || !widgetEl) return;

    var clientX = e.type.startsWith('touch') ? e.touches[0].clientX : e.clientX;
    var clientY = e.type.startsWith('touch') ? e.touches[0].clientY : e.clientY;

    var deltaX = clientX - dragStartX;
    var deltaY = clientY - dragStartY;

    var newX = initialWidgetX + deltaX;
    var newY = initialWidgetY + deltaY;

    var winW = window.innerWidth;
    var winH = window.innerHeight;
    var rect = widgetEl.getBoundingClientRect();

    newX = Math.max(10, Math.min(newX, winW - rect.width - 10));
    newY = Math.max(10, Math.min(newY, winH - 50));

    widgetEl.style.left = newX + 'px';
    widgetEl.style.top = newY + 'px';

    settings.left = Math.round(newX);
    settings.top = Math.round(newY);

    if (e.type.startsWith('touch')) {
      e.preventDefault();
    }
  }

  function onDragEnd() {
    if (!isDragging) return;
    isDragging = false;
    document.removeEventListener('mousemove', onDragMove);
    document.removeEventListener('mouseup', onDragEnd);
    document.removeEventListener('touchmove', onDragMove);
    document.removeEventListener('touchend', onDragEnd);
    saveSettings();
  }

  function toggleMinimize() {
    settings.isMinimized = !settings.isMinimized;
    saveSettings();
    applyGeometry();
  }

  function openWidget() {
    createWidget();
    settings.isOpen = true;
    saveSettings();
    applyGeometry();
    if (!settings.isMinimized && textareaEl) {
      setTimeout(function () { textareaEl.focus(); }, 50);
    }
  }

  function closeWidget() {
    settings.isOpen = false;
    saveSettings();
    if (widgetEl) widgetEl.style.display = 'none';
  }

  function toggleWidget() {
    if (!widgetEl) {
      createWidget();
    }
    if (settings.isOpen) {
      closeWidget();
    } else {
      openWidget();
    }
  }

  window.SangamNotes = {
    open: openWidget,
    close: closeWidget,
    toggle: toggleWidget,
    syncFromServer: loadFromServer,
    minimize: function () { settings.isMinimized = true; saveSettings(); applyGeometry(); },
    restore: function () { settings.isMinimized = false; saveSettings(); applyGeometry(); },
    getNotes: function () { return currentContent; },
    setNotes: function (text) {
      currentContent = text || '';
      if (textareaEl) textareaEl.value = currentContent;
      try { localStorage.setItem(STORAGE_KEY_CONTENT, currentContent); } catch (e) {}
      updateStats();
    },
    insertText: insertAtCursor
  };

  function initNotes() {
    loadPersistedState();
    createWidget();
    loadFromServer();

    document.querySelectorAll('[data-notes-toggle], #btn-open-notes, .btn-notes-launcher').forEach(function (btn) {
      btn.addEventListener('click', function (e) {
        e.preventDefault();
        toggleWidget();
      });
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initNotes);
  } else {
    initNotes();
  }

})();
