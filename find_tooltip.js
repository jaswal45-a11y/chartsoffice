const fs = require('fs');
const code = fs.readFileSync('stock_screener_app/public/app.js', 'utf8');

const lines = code.split('\n');
lines.forEach((l, i) => {
  if (l.includes('subscribeCrosshairMove') || l.includes('crosshair') || l.includes('tooltip') || l.includes('hover') || l.includes('ohlc-tooltip') || l.includes('legend')) {
    if (l.includes('function') || l.includes('subscribe') || l.includes('innerHTML') || l.includes('textContent') || l.includes('div') || l.includes('span') || l.includes('format')) {
      console.log(`${i+1}: ${l.trim()}`);
    }
  }
});
