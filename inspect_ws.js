const fs = require('fs');

const opt1 = fs.readFileSync('public/option1_screener.html', 'utf8');

const wsStart = opt1.indexOf('class="workspace-split"');
console.log(opt1.slice(wsStart, wsStart + 3500));
