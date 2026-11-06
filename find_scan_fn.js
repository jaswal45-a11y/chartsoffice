const fs = require('fs');
const code = fs.readFileSync('stock_screener_app/server.js', 'utf8');

const lines = code.split('\n');
lines.forEach((l, i) => {
  if (l.includes('function scanDarvasEma') || l.includes('scanDarvasEma =') || l.includes('async function scanDarvasEma')) {
    console.log(`${i+1}: ${l.trim()}`);
  }
});
