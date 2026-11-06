const fs = require('fs');
const content = fs.readFileSync('stock_screener_app/data/screeners.json', 'utf8');
const screeners = JSON.parse(content);
console.log('Total screeners:', screeners.length);
screeners.forEach(s => {
  const str = JSON.stringify(s);
  if (str.toLowerCase().includes('darvas')) {
    console.log(`Screener: "${s.name}" (id: ${s.id})`);
    console.log('  filters:', s.filters);
  }
});
