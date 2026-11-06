const http = require('http');

function getHistory(sym) {
  return new Promise((resolve) => {
    http.get(`http://127.0.0.1:3000/api/stocks/${sym}/history`, (res) => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => {
        try {
          resolve(JSON.parse(d));
        } catch (e) {
          resolve({ error: e.message });
        }
      });
    }).on('error', e => resolve({ error: e.message }));
  });
}

async function run() {
  for (const sym of ['PATANJALI', 'MAHABANK']) {
    const h = await getHistory(sym);
    console.log(`\n=================== ${sym} ===================`);
    console.log('ltp:', h.ltp, 'darvasBox:', h.darvasBox);
    const candles = h.candles || [];
    console.log('Last 10 candles:');
    candles.slice(-10).forEach(c => {
      console.log(`  ${c.time}: open=${c.open}, high=${c.high}, low=${c.low}, close=${c.close}, vol=${c.volume}`);
    });
  }
}

run();
