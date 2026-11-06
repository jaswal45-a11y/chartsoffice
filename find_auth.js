const fs = require('fs');
const code = fs.readFileSync('stock_screener_app/server.js', 'utf8');

const lines = code.split('\n');
const idx = lines.findIndex(l => l.includes('function getAuthenticatedUser('));
console.log(lines.slice(idx, idx + 25).join('\n'));
