const fs = require('fs');
const path = require('path');

const uniFile = path.join(__dirname, 'data', 'master_universe.json');
const universe = JSON.parse(fs.readFileSync(uniFile, 'utf8'));

for (const sym of ['PATANJALI', 'MAHABANK']) {
  const u = universe.find(x => x.symbol === sym);
  console.log(`=== ${sym} ===`);
  console.log('price / ltp:', u.price, u.ltp);
  console.log('prevClose:', u.prevClose);
  console.log('darvasGreen_daily:', u.darvasGreen_daily);
  console.log('darvasGreen_weekly:', u.darvasGreen_weekly);
  console.log('darvasBottom_daily:', u.darvasBottom_daily);
  console.log('darvasCrossedDaysAgo:', u.darvasCrossedDaysAgo);
  console.log('darvasCrossDate:', u.darvasCrossDate);
  console.log('close > darvasGreen_daily:', u.price > u.darvasGreen_daily);
  console.log('prevClose <= darvasGreen_daily:', u.prevClose <= u.darvasGreen_daily);
  console.log('Fast Path 2 match?:', (u.price > u.darvasGreen_daily) && (u.prevClose <= u.darvasGreen_daily));
}
