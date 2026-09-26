const fs = require('fs');
const html = fs.readFileSync('public/index.html', 'utf8');

const targets = [
  'screener-command-deck',
  'drawing',
  'draw',
  'watchlist',
  'indicator',
  'timeframe',
  'range',
  'screenshot',
  'snapshot',
  'btn-nav-analytics',
  'btn-nav-fno',
  'btn-open-mf-deals',
  'btn-open-circuit-modal',
  'btn-open-notes',
  'chart-container',
  'search-input'
];

targets.forEach(t => {
  const regex = new RegExp('id="([^"]*' + t + '[^"]*)"', 'gi');
  let match;
  const found = [];
  while ((match = regex.exec(html)) !== null) {
    found.push(match[1]);
  }
  console.log(t, '->', found);
});
