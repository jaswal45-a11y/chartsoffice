const fs = require('fs');

const opt1 = fs.readFileSync('public/option1_screener.html', 'utf8');
const index = fs.readFileSync('public/index.html', 'utf8');

function extractDeck(html) {
  const start = html.indexOf('class="deck-card"') !== -1 ? html.indexOf('class="deck-card"') : html.indexOf('id="screener-command-deck"');
  return html.slice(start, start + 2500);
}

console.log('--- opt1 Deck ---');
console.log(extractDeck(opt1));

console.log('\n--- index Deck ---');
console.log(extractDeck(index));
