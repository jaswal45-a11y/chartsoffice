const fs = require('fs');
const code = fs.readFileSync('stock_screener_app/public/app.js', 'utf8');

const lines = code.split('\n');
const idx = lines.findIndex(l => l.includes('function renderPricescanTable('));
console.log(lines.slice(idx, idx + 80).join('\n'));
