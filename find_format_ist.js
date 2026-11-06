const fs = require('fs');
const code = fs.readFileSync('stock_screener_app/public/app.js', 'utf8');

const lines = code.split('\n');
lines.forEach((l, i) => {
  if (l.includes('formatIstTime') || l.includes('istTickMarkFormatter')) {
    console.log(`${i+1}: ${l.trim()}`);
  }
});
