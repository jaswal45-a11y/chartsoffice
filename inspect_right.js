const fs = require('fs');

const opt1 = fs.readFileSync('public/option1_screener.html', 'utf8');

const rightStart = opt1.indexOf('class="right-chart-pane"');
console.log(opt1.slice(rightStart, rightStart + 4000));
