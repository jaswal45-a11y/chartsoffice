const fs = require('fs');
const code = fs.readFileSync('stock_screener_app/public/app.js', 'utf8');

const lines = code.split('\n');
lines.forEach((l, i) => {
  if (l.includes('darvas') && (l.includes('filter') || l.includes('Filter') || l.includes('condition') || l.includes('Option') || l.includes('select'))) {
    console.log(`${i+1}: ${l.trim()}`);
  }
});
