const fs = require('fs');
const csv = fs.readFileSync('www/csv/db.csv', 'utf8');
const lines = csv.split('\n').filter(l => l.trim()).slice(1);
const codes = [...new Set(lines.map(l => {
    // カンマ区切りだがダブルクォート内のカンマを考慮する必要がある
    const cols = l.match(/(".*?"|[^",\s]+)(?=\s*,|\s*$)/g);
    if (!cols || cols.length <= 12) return null;
    return cols[12].replace(/"/g, '');
}).filter(Boolean))].sort();
console.log(JSON.stringify(codes, null, 2));
