const fs = require('fs');
const code = fs.readFileSync('stock_screener_app/public/app.js', 'utf8');

const lines = code.split('\n');
lines.forEach((l, i) => {
  if (l.includes('createChart') || l.includes('timeFormatter') || l.includes('tickMarkFormatter') || l.includes('localization') || l.includes('timeScale(') || l.includes('dateFormat')) {
    console.log(`${i+1}: ${l.trim()}`);
  }
});
