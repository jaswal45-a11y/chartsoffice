const http = require('http');

function getHistory(sym) {
  return new Promise((resolve) => {
    http.get(`http://127.0.0.1:3000/api/stocks/${sym}/history`, (res) => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => resolve(JSON.parse(d)));
    });
  });
}

async function inspect(sym) {
  const h = await getHistory(sym);
  const candles = h.candles;
  const n = candles.length;
  const darvasBox = h.darvasBox;
  console.log(`\n=================== ${sym} ===================`);
  console.log('n candles:', n, 'last candle:', candles[n - 1]);
  console.log('latestTopBox:', darvasBox.latestTopBox);
  
  const topBoxMap = new Map();
  for (const tb of darvasBox.topBox) {
    topBoxMap.set(tb.time, tb.value);
  }
  
  for (let i = 0; i < 6; i++) {
    const idx = n - 1 - i;
    const c = candles[idx];
    const prev = candles[idx - 1];
    const dgreen = topBoxMap.get(c.time);
    console.log(`i=${i} [${c.time}]: prevClose=${prev?.close}, currClose=${c.close}, dgreen=${dgreen}, crossed=${c.close > dgreen && prev?.close <= dgreen}`);
  }
}

async function run() {
  await inspect('PATANJALI');
  await inspect('MAHABANK');
}

run();
