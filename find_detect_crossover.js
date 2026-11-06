const fs = require('fs');
const code = fs.readFileSync('stock_screener_app/server.js', 'utf8');

const lines = code.split('\n');
lines.forEach((l, i) => {
  if (l.includes('detectDarvasCrossover') || l.includes('function detectDarvasCrossover')) {
    console.log(`${i+1}: ${l.trim()}`);
  }
});
