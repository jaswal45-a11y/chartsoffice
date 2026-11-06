const fs = require('fs');

function search(file) {
  const code = fs.readFileSync(file, 'utf8');
  const lines = code.split('\n');
  lines.forEach((l, i) => {
    if (l.includes('select-pricescan-ema') || l.includes('selectPricescanEma')) {
      console.log(`${file}:${i+1}: ${l.trim()}`);
    }
  });
}

search('stock_screener_app/public/index.html');
search('stock_screener_app/public/app.js');
