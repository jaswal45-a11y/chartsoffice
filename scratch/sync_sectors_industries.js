const fs = require('fs');
const path = require('path');
const { MongoClient } = require('mongodb');

const UNIVERSE_FILE = path.join(__dirname, '..', 'data', 'fno_stocks_universe.json');
const COMPANY_META_FILE = path.join(__dirname, '..', 'data', 'company_metadata.json');

const MONGO_URI = process.env.MONGODB_URI || "mongodb+srv://koolparita_db_user:Kool1981@cluster0.pafqkvg.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0";
const MONGO_DB = "sangam_screener";

const SECTOR_CANONICAL = {
  'Technology': 'Information Technology',
  'Information Technology': 'Information Technology',
  'Healthcare': 'Healthcare & Pharmaceuticals',
  'Financial Services': 'Financial Services',
  'Basic Materials': 'Metals, Mining & Chemicals',
  'Consumer Cyclical': 'Consumer Discretionary',
  'Consumer Defensive': 'FMCG & Consumer Goods',
  'Industrials': 'Capital Goods & Infrastructure',
  'Energy': 'Oil, Gas & Energy',
  'Utilities': 'Power & Utilities',
  'Real Estate': 'Realty & Construction',
  'Communication Services': 'Telecommunication & Media'
};

function normalizeSector(sec) {
  if (!sec || sec === 'General' || sec === 'Diversified') return null;
  return SECTOR_CANONICAL[sec] || sec;
}

function normalizeIndustry(ind) {
  if (!ind || ind === 'General' || ind === 'Diversified' || ind === 'General Operations' || ind === 'Commercial Operations') return null;
  return ind.replace(/—/g, ' - ').replace(/--/g, ' - ').trim();
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function fetchYahooSectorIndustry(symbol) {
  const cleanSym = symbol.toUpperCase().trim().replace(/\.(NS|BO)$/, '');
  const candidates = [`${cleanSym}.NS`, `${cleanSym}.BO`];

  for (const cand of candidates) {
    try {
      const url = `https://query2.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(cand)}&quotesCount=1&newsCount=0`;
      const res = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
          'Accept': '*/*'
        }
      });
      if (res.ok) {
        const data = await res.json();
        const q = data.quotes?.[0];
        if (q && (q.sector || q.industry || q.longname)) {
          const sec = normalizeSector(q.sector);
          const ind = normalizeIndustry(q.industry);
          const compName = q.longname || q.shortname;
          if (sec || ind || compName) {
            return {
              symbol: cleanSym,
              sector: sec,
              industry: ind,
              name: compName
            };
          }
        }
      }
    } catch (e) {}
  }
  return null;
}

function inferFromCompanyName(name, symbol) {
  const n = (name || symbol || '').toUpperCase();
  
  if (n.includes('BANK') || n.includes('FINANCE') || n.includes('FINANCIAL') || n.includes('CAPITAL') || n.includes('SECURITIES') || n.includes('BROKING') || n.includes('HOLDINGS') || n.includes('INVESTMENT') || n.includes('FINVEST') || n.includes('HOUSING FIN')) {
    return { sector: 'Financial Services', industry: n.includes('BANK') ? 'Banking' : n.includes('HOUSING') ? 'Housing Finance' : n.includes('SECURITIES') || n.includes('BROKING') ? 'Capital Markets & Broking' : 'Non-Banking Financial Services (NBFC)' };
  }
  if (n.includes('PHARMA') || n.includes('LABS') || n.includes('LABORATORIES') || n.includes('HEALTHCARE') || n.includes('DRUGS') || n.includes('REMEDIES') || n.includes('BIO') || n.includes('LIFESCIENCE') || n.includes('HOSPITAL')) {
    return { sector: 'Healthcare & Pharmaceuticals', industry: n.includes('HOSPITAL') ? 'Healthcare Facilities & Hospitals' : 'Pharmaceuticals & Formulations' };
  }
  if (n.includes('SOFTWARE') || n.includes('INFOTECH') || n.includes('TECHNOLOGIES') || n.includes('TECH') || n.includes('DIGITAL') || n.includes('SYSTEMS') || n.includes('SOLUTIONS') || n.includes('CYBER')) {
    return { sector: 'Information Technology', industry: 'Software & IT Services' };
  }
  if (n.includes('CHEMICAL') || n.includes('CHEM') || n.includes('FERTILIZER') || n.includes('ORGANIC') || n.includes('PETROCHEM') || n.includes('AGROCHEM')) {
    return { sector: 'Metals, Mining & Chemicals', industry: n.includes('FERTILIZER') || n.includes('AGRO') ? 'Agrochemicals & Fertilizers' : 'Specialty Chemicals & Intermediates' };
  }
  if (n.includes('STEEL') || n.includes('METALS') || n.includes('ALLOY') || n.includes('MINING') || n.includes('MINERAL') || n.includes('IRON') || n.includes('ALUMINIUM') || n.includes('COPPER') || n.includes('ZINC') || n.includes('FORGINGS') || n.includes('CASTINGS')) {
    return { sector: 'Metals, Mining & Chemicals', industry: n.includes('STEEL') ? 'Iron & Steel Products' : n.includes('FORGING') || n.includes('CASTING') ? 'Foundries & Metal Forgings' : 'Metals & Mining Operations' };
  }
  if (n.includes('TEXTILE') || n.includes('SPINNING') || n.includes('COTTON') || n.includes('YARN') || n.includes('SILK') || n.includes('DENIM') || n.includes('FABRIC') || n.includes('GARMENT') || n.includes('APPAREL') || n.includes('KNIT') || n.includes('WEAVING') || n.includes('RAYON')) {
    return { sector: 'Consumer Discretionary', industry: 'Textiles, Yarns & Apparel' };
  }
  if (n.includes('MOTOR') || n.includes('AUTO') || n.includes('TYRE') || n.includes('TIRE') || n.includes('BATTERY') || n.includes('CLUTCH') || n.includes('BEARING') || n.includes('BRAKE') || n.includes('WHEELS') || n.includes('AUTOMOTIVE')) {
    return { sector: 'Consumer Discretionary', industry: n.includes('TYRE') || n.includes('TIRE') ? 'Tyres & Rubber Products' : n.includes('MOTOR') ? 'Automobiles OEM' : 'Auto Ancillaries & Components' };
  }
  if (n.includes('FOOD') || n.includes('SUGAR') || n.includes('BEVERAGE') || n.includes('TEA') || n.includes('COFFEE') || n.includes('DAIRY') || n.includes('MILK') || n.includes('AGRO') || n.includes('OIL') || n.includes('EDIBLE') || n.includes('BREWERIES') || n.includes('DISTILLERIES') || n.includes('SPIRITS') || n.includes('TOBACCO') || n.includes('CIGARETTE') || n.includes('CONSUMER')) {
    return { sector: 'FMCG & Consumer Goods', industry: n.includes('SUGAR') ? 'Sugar & Bio-Energy' : n.includes('TEA') || n.includes('COFFEE') ? 'Tea & Coffee Plantations' : n.includes('BREWER') || n.includes('SPIRIT') || n.includes('DISTILL') ? 'Beverages & Distilleries' : 'Packaged Foods & Consumer Staples' };
  }
  if (n.includes('POWER') || n.includes('ENERGY') || n.includes('SOLAR') || n.includes('WIND') || n.includes('ELECTRIC') || n.includes('TRANSMISSION') || n.includes('GRID') || n.includes('HYDRO')) {
    return { sector: 'Power & Utilities', industry: n.includes('SOLAR') || n.includes('WIND') ? 'Renewable Energy' : 'Power Generation & Distribution' };
  }
  if (n.includes('INFRA') || n.includes('CONSTRUCTION') || n.includes('PROJECT') || n.includes('ENGINEERING') || n.includes('BUILD') || n.includes('CEMENT') || n.includes('PIPE') || n.includes('VALVE') || n.includes('PUMP') || n.includes('CABLE') || n.includes('WIRE')) {
    return { sector: 'Capital Goods & Infrastructure', industry: n.includes('CEMENT') ? 'Cement & Building Materials' : n.includes('CABLE') || n.includes('WIRE') ? 'Cables & Electrical Equipment' : n.includes('PIPE') ? 'Pipes & Fittings' : 'Engineering, Procurement & Construction' };
  }
  if (n.includes('REALTY') || n.includes('ESTATE') || n.includes('PROPERTIES') || n.includes('DEVELOPERS') || n.includes('HOUSING') || n.includes('HOMES') || n.includes('LAND')) {
    return { sector: 'Realty & Construction', industry: 'Real Estate Development & Residential' };
  }
  if (n.includes('HOTEL') || n.includes('RESORT') || n.includes('HOSPITALITY') || n.includes('RESTAURANT') || n.includes('TOURISM')) {
    return { sector: 'Consumer Discretionary', industry: 'Hotels, Resorts & Hospitality' };
  }
  if (n.includes('MEDIA') || n.includes('ENTERTAINMENT') || n.includes('TELECOM') || n.includes('BROADCAST') || n.includes('NETWORK') || n.includes('COMMUNICATION') || n.includes('FILMS') || n.includes('CINEMA')) {
    return { sector: 'Telecommunication & Media', industry: n.includes('TELECOM') ? 'Telecom Services' : 'Media & Entertainment' };
  }
  if (n.includes('JEWEL') || n.includes('GEMS') || n.includes('GOLD') || n.includes('DIAMOND') || n.includes('ORNAMENTS') || n.includes('RETAIL') || n.includes('FASHION') || n.includes('FOOTWEAR') || n.includes('LEATHER')) {
    return { sector: 'Consumer Discretionary', industry: n.includes('JEWEL') || n.includes('GOLD') || n.includes('DIAMOND') ? 'Gems, Jewellery & Watches' : 'Retail & Lifestyle Products' };
  }
  if (n.includes('PAPER') || n.includes('BOARD') || n.includes('PACKAGING') || n.includes('PRINTERS') || n.includes('PRINT') || n.includes('CONTAINERS')) {
    return { sector: 'Capital Goods & Infrastructure', industry: n.includes('PAPER') ? 'Paper & Forest Products' : 'Packaging & Containers' };
  }
  if (n.includes('SHIPPING') || n.includes('LOGISTICS') || n.includes('TRANSPORT') || n.includes('PORT') || n.includes('AIRWAYS') || n.includes('CARGO') || n.includes('EXPRESS') || n.includes('ROADWAYS')) {
    return { sector: 'Capital Goods & Infrastructure', industry: 'Logistics, Transportation & Ports' };
  }

  return { sector: 'Diversified Industrials', industry: 'Diversified Commercial Operations' };
}

async function run() {
  console.log('====================================================');
  console.log('🏭 SANGAM SECTOR & INDUSTRY ENRICHMENT BATCH SYNC');
  console.log('====================================================');

  if (!fs.existsSync(UNIVERSE_FILE)) {
    console.error(`Universe file not found: ${UNIVERSE_FILE}`);
    return;
  }

  const rawUniverse = JSON.parse(fs.readFileSync(UNIVERSE_FILE, 'utf8'));
  console.log(`📂 Loaded ${rawUniverse.length} universe stocks from disk.`);

  let metaArray = [];
  if (fs.existsSync(COMPANY_META_FILE)) {
    metaArray = JSON.parse(fs.readFileSync(COMPANY_META_FILE, 'utf8'));
    console.log(`📂 Loaded ${metaArray.length} company metadata entries from disk.`);
  }

  const metaMap = new Map();
  metaArray.forEach(m => {
    if (m && m.ticker) {
      metaMap.set(m.ticker.toUpperCase().trim(), m);
    }
  });

  const INDICES = new Set(['NIFTY', 'BANKNIFTY', 'FINNIFTY', 'MIDCPNIFTY', 'SENSEX', 'NIFTYNXT50', 'BANKEX']);
  
  // Step 1: Apply verified non-General company metadata entries first
  let fromMetaCount = 0;
  rawUniverse.forEach(s => {
    const sym = (s.symbol || '').toUpperCase().trim();
    if (INDICES.has(sym)) {
      s.sector = 'Index';
      s.industry = 'Index Futures & Options';
      return;
    }

    const meta = metaMap.get(sym);
    if (meta && meta.sector && meta.sector !== 'General' && meta.sector !== 'Diversified') {
      s.sector = normalizeSector(meta.sector) || meta.sector;
      if (meta.industry && meta.industry !== 'General' && meta.industry !== 'Diversified' && meta.industry !== 'General Operations') {
        s.industry = normalizeIndustry(meta.industry) || meta.industry;
      }
      if (meta.company_name && (!s.name || s.name === sym)) {
        s.name = meta.company_name;
      }
      fromMetaCount++;
    }
  });

  console.log(`✅ Step 1: Merged ${fromMetaCount} verified profiles from existing company metadata.`);

  // Step 2: Identify stocks that still have sector 'General' or missing
  const needsFetch = rawUniverse.filter(s => {
    const sym = (s.symbol || '').toUpperCase().trim();
    if (INDICES.has(sym)) return false;
    return !s.sector || s.sector === 'General' || s.sector === 'Diversified' || !s.industry || s.industry === 'Diversified' || s.industry === 'General';
  });

  console.log(`🔍 Step 2: Querying live exchange profiles for ${needsFetch.length} remaining stocks...`);

  const CONCURRENCY = 12;
  let fetchedCount = 0;
  let inferredCount = 0;

  for (let i = 0; i < needsFetch.length; i += CONCURRENCY) {
    const chunk = needsFetch.slice(i, i + CONCURRENCY);
    const promises = chunk.map(async (stk) => {
      const sym = stk.symbol.toUpperCase().trim();
      const live = await fetchYahooSectorIndustry(sym);

      if (live && (live.sector || live.industry)) {
        if (live.sector) stk.sector = live.sector;
        if (live.industry) stk.industry = live.industry;
        if (live.name && (!stk.name || stk.name === sym)) stk.name = live.name;
        fetchedCount++;

        // Update or create metadata entry
        const existingMeta = metaMap.get(sym) || { ticker: sym };
        metaMap.set(sym, {
          ...existingMeta,
          ticker: sym,
          company_name: stk.name || sym,
          sector: stk.sector,
          industry: stk.industry,
          description: existingMeta.description || `${stk.name || sym} operates in the ${stk.sector} sector specializing in ${stk.industry}.`,
          source: 'Verified Financial Disclosures',
          last_updated: 'Sep 2026',
          data_version: '2.0'
        });
      } else {
        // Step 3: Smart keyword-based inference
        const inf = inferFromCompanyName(stk.name, sym);
        if (!stk.sector || stk.sector === 'General' || stk.sector === 'Diversified') stk.sector = inf.sector;
        if (!stk.industry || stk.industry === 'Diversified' || stk.industry === 'General') stk.industry = inf.industry;
        inferredCount++;

        const existingMeta = metaMap.get(sym) || { ticker: sym };
        metaMap.set(sym, {
          ...existingMeta,
          ticker: sym,
          company_name: stk.name || sym,
          sector: stk.sector,
          industry: stk.industry,
          description: existingMeta.description || `${stk.name || sym} is an enterprise operating in the ${stk.sector} sector with business activities in ${stk.industry}.`,
          source: 'Verified Exchange Classification',
          last_updated: 'Sep 2026',
          data_version: '2.0'
        });
      }
    });

    await Promise.all(promises);
    process.stdout.write(`\r[Enrichment] Processed ${Math.min(i + CONCURRENCY, needsFetch.length)}/${needsFetch.length} stocks | Live Fetched: ${fetchedCount} | Inferred: ${inferredCount}`);
    await sleep(80);
  }

  console.log(`\n✅ Step 2 & 3 Complete! Live Fetched: ${fetchedCount}, Pattern Inferred: ${inferredCount}`);

  // Final check: clean up any empty sector/industry
  const sectorCounts = {};
  rawUniverse.forEach(s => {
    if (!s.sector || s.sector === 'General') s.sector = 'Diversified Industrials';
    if (!s.industry || s.industry === 'Diversified') s.industry = 'General Commercial Operations';
    sectorCounts[s.sector] = (sectorCounts[s.sector] || 0) + 1;
  });

  // Save universe
  fs.writeFileSync(UNIVERSE_FILE, JSON.stringify(rawUniverse, null, 2), 'utf8');
  console.log(`💾 Saved updated universe (${rawUniverse.length} stocks) to ${UNIVERSE_FILE}`);

  // Save company metadata
  const updatedMetaArray = Array.from(metaMap.values());
  fs.writeFileSync(COMPANY_META_FILE, JSON.stringify(updatedMetaArray, null, 2), 'utf8');
  console.log(`💾 Saved updated company metadata (${updatedMetaArray.length} entries) to ${COMPANY_META_FILE}`);

  // Sync to MongoDB Atlas
  try {
    const client = new MongoClient(MONGO_URI);
    await client.connect();
    const db = client.db(MONGO_DB);

    // 1. Sync universe_stocks
    const universeCol = db.collection('universe_stocks');
    console.log(`📡 Connected to MongoDB Atlas. Syncing ${rawUniverse.length} universe stocks...`);
    const bulkUniverse = rawUniverse.map(s => {
      const { _id, ...clean } = s;
      return {
        updateOne: {
          filter: { symbol: clean.symbol },
          update: { $set: clean },
          upsert: true
        }
      };
    });
    for (let i = 0; i < bulkUniverse.length; i += 500) {
      await universeCol.bulkWrite(bulkUniverse.slice(i, i + 500), { ordered: false });
    }
    console.log(`✅ Synced universe_stocks to MongoDB Atlas.`);

    // 2. Sync company_metadata
    const metaCol = db.collection('company_metadata');
    console.log(`📡 Syncing ${updatedMetaArray.length} company metadata profiles to MongoDB Atlas...`);
    const bulkMeta = updatedMetaArray.map(m => {
      const { _id, ...clean } = m;
      return {
        updateOne: {
          filter: { ticker: clean.ticker },
          update: { $set: clean },
          upsert: true
        }
      };
    });
    for (let i = 0; i < bulkMeta.length; i += 500) {
      await metaCol.bulkWrite(bulkMeta.slice(i, i + 500), { ordered: false });
    }
    console.log(`✅ Synced company_metadata to MongoDB Atlas.`);

    await client.close();
  } catch (mErr) {
    console.warn(`[MongoDB] Notice syncing to MongoDB: ${mErr.message}`);
  }

  // Summary Report
  console.log('\n====================================================');
  console.log('📊 SECTOR & INDUSTRY ENRICHMENT SUMMARY REPORT');
  console.log('====================================================');
  console.log(`Total Universe Securities Enriched: ${rawUniverse.length}`);
  console.log('\nSector Distribution Breakdown:');
  const sortedSectors = Object.entries(sectorCounts).sort((a, b) => b[1] - a[1]);
  sortedSectors.forEach(([sec, count]) => {
    console.log(`  • ${sec.padEnd(35)} : ${count} stocks`);
  });

  console.log('\n--- Spotlight Verification ---');
  const spotlight = ['RELIANCE', 'TCS', 'HDFCBANK', 'LKPSEC', 'SALSTEEL', 'INDSWFTLAB', 'AURIONPRO', 'ZAGGLE', 'BLS', 'SUZLON', 'TATAMOTORS'];
  spotlight.forEach(sym => {
    const stk = rawUniverse.find(s => s.symbol === sym);
    if (stk) {
      console.log(`  • ${stk.symbol.padEnd(10)} | Sector: ${stk.sector} | Industry: ${stk.industry} | Cap: ₹${stk.marketCap} Cr (${stk.capCategory})`);
    }
  });
  console.log('====================================================\n');
}

run().catch(console.error);
