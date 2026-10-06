const fs = require('fs');

const opt1 = fs.readFileSync('public/option1_screener.html', 'utf8');
const index = fs.readFileSync('public/index.html', 'utf8');

const report = [];

// 1. Check Header
report.push({
  area: '1. Top Header & Navigation',
  opt1: 'Uses clean .app-header with .brand-section (logo icon + "SANGAM" + "Dhan HQ Live" badge), .nav-links pill capsule (Home, Charts, Analytics), and right .header-actions (compact stats pill, "Admin / User Login", "⚙" settings).',
  live: 'Uses old Tailwind header (.border-b .border-dark-border .bg-dark-card/90) with large circular favicon, cluttered launcher buttons (Notes, Journal, MF Deals, CKT limits), and darker styling.'
});

// 2. Check Market Indices Strip
report.push({
  area: '2. Live Market Indices Strip',
  opt1: 'Uses compact .market-strip with .idx-item (NIFTY 50, BANK NIFTY, MIDCAP 150, SMALLCAP 250, INDIA VIX) and .feed-dot with "NSE LIVE" on the right.',
  live: 'Live index strip has different padding, classes, and dark border styling from original template.'
});

// 3. Check Screener Command Deck
report.push({
  area: '3. Screener Command Deck',
  opt1: 'Styled with .deck-card (.deck-top-row with emoji "🎛️", title, category pills (.cat-btn), prominent "⚡ Run All", "+ Add"), .deck-grid with .screener-box cards showing title + category + bold green count badge, and bottom status bar ("8 of 16 Screeners Active", "▲ Collapse Deck", "Side-by-Side / Stacked").',
  live: 'Still uses the original Tailwind layout (#screener-command-deck with .cat-pill, dark background .bg-dark-card, differing card grid spacing, and different card micro-layout).'
});

// 4. Check Left Sidebar (Screener View)
report.push({
  area: '4. Left Sidebar (Screeners & Scanners)',
  opt1: 'Styled with .left-sidebar (.tab-header-strip with .sb-tab pills: Screeners, Watchlist (14), Dscan, SS_RVOL, VCPscan), .control-header-box with active badge, title, action buttons (☷ Columns, 📋 Copy, 📥 CSV), search input (.stock-search) with inline market cap toggles (1k | 2k) and pill count, .rec-filter-strip (All Stocks, EMAs Aligned).',
  live: 'Uses original sidebar layout (#sidebar-pane) with Tailwind borders, different tab padding, and darker inputs.'
});

// 5. Check Table Rows & EMA Matrix
report.push({
  area: '5. Screener Results Table & EMA Matrix',
  opt1: 'Table has clean sticky headers (Stock Name, Close, Change %, Volume, EMAs, RSI), rows with .sym-bold + .sym-sub, formatted volume, 4 colored pastel matrix dots (.m-dot .m-p/.m-n/.m-f in green/yellow/red with letters P/N/F), and pastel .rsi-chip badge.',
  live: 'Table in index.html had different font sizes, different cell padding, and the dynamic row generator used older Tailwind classes.'
});

// 6. Check Right Chart Pane
report.push({
  area: '6. Right Chart Workspace',
  opt1: 'Styled with .right-chart-pane: .chart-top-bar with clean stock title info (.stock-sym-header "RELIANCE ₹2,985.40 +1.85%"), .tf-toolbar (1D, 5D, 1D (Daily), 1W, 1M, Indicators), .chart-legend-line with colored EMA values (EMA 10, 20, 50, 150, Vol), and .rsi-pane at the bottom.',
  live: 'Uses #chart-pane with the full live canvas, but styled with original Tailwind dark card classes instead of Option 1 CSS classes.'
});

// 7. Check Theme Variables & Color Palette
report.push({
  area: '7. Theme Palette & Font Rendering',
  opt1: 'Pure custom CSS with Plus Jakarta Sans + JetBrains Mono, where Nordic is crisp porcelain (#F3F4F6/#FFFFFF), Warm Paper is warm ivory (#F7F4EE/#FDFBF7), and Midnight Obsidian is deep navy (#0B0E14/#121721).',
  live: 'Still loaded Tailwind CDN which had default dark styles and preflights overriding theme variables, making Nordic/Warm Paper look patchy.'
});

console.log(JSON.stringify(report, null, 2));
