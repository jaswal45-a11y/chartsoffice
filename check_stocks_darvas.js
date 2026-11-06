const fs = require('fs');
const path = require('path');

const uniFile = path.join(__dirname, 'data', 'master_universe.json');
const universe = JSON.parse(fs.readFileSync(uniFile, 'utf8'));

const patanjali = universe.find(u => u.symbol.includes('PATANJALI'));
const mahabank = universe.find(u => u.symbol.includes('MAHABANK'));

console.log('PATANJALI in universe:', patanjali ? {
  symbol: patanjali.symbol,
  price: patanjali.price,
  prevClose: patanjali.prevClose,
  darvasGreen_daily: patanjali.darvasGreen_daily,
  darvasGreen_weekly: patanjali.darvasGreen_weekly,
  darvasCrossedDaysAgo: patanjali.darvasCrossedDaysAgo,
  darvasCrossedDaysAgo_weekly: patanjali.darvasCrossedDaysAgo_weekly,
  darvasCrossDate: patanjali.darvasCrossDate
} : 'not found');

console.log('MAHABANK in universe:', mahabank ? {
  symbol: mahabank.symbol,
  price: mahabank.price,
  prevClose: mahabank.prevClose,
  darvasGreen_daily: mahabank.darvasGreen_daily,
  darvasGreen_weekly: mahabank.darvasGreen_weekly,
  darvasCrossedDaysAgo: mahabank.darvasCrossedDaysAgo,
  darvasCrossedDaysAgo_weekly: mahabank.darvasCrossedDaysAgo_weekly,
  darvasCrossDate: mahabank.darvasCrossDate
} : 'not found');
