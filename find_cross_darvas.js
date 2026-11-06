const fs = require('fs');

function searchAll(file) {
  const code = fs.readFileSync(file, 'utf8');
  const lines = code.split('\n');
  lines.forEach((l, i) => {
    if (/cross.*darvas|darvas.*cross/i.test(l)) {
      console.log(`${file}:${i+1}: ${l.trim()}`);
    }
  });
}

searchAll('stock_screener_app/public/index.html');
searchAll('stock_screener_app/public/app.js');
searchAll('stock_screener_app/server.js');
