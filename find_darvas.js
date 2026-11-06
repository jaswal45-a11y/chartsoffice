const fs = require('fs');

function search(file, term) {
  const content = fs.readFileSync(file, 'utf8');
  const lines = content.split('\n');
  console.log(`=== Matches in ${file} for "${term}" ===`);
  lines.forEach((l, i) => {
    if (l.toLowerCase().includes(term.toLowerCase())) {
      console.log(`${i+1}: ${l.trim()}`);
    }
  });
}

search('stock_screener_app/public/index.html', 'darvas');
search('stock_screener_app/public/app.js', 'darvasCross');
search('stock_screener_app/public/app.js', 'darvasGreen');
