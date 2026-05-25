const fs = require('fs');
const path = './www/csv/db.csv';

if (!fs.existsSync(path)) {
    console.error('File not found:', path);
    process.exit(1);
}

const content = fs.readFileSync(path, 'utf8');
const lines = content.split(/\r?\n/);
if (lines.length === 0) process.exit(0);

// ヘッダーからtype_codeのインデックスを特定
const header = lines[0].split(',');
const typeIdx = header.findIndex(col => col.includes('type_code'));

if (typeIdx === -1) {
    console.error('type_code column not found');
    process.exit(1);
}

const updatedLines = lines.map((line, i) => {
    if (i === 0 || !line.trim()) return line;
    
    // シンプルなCSVパース（カンマ区切り、引用符考慮）
    const parts = line.split('","');
    
    // type_codeは後方にある (末尾から4番目付近)
    // 実際の位置を正確に調整
    // ヘッダー: title,subtitle,title_kana,artist,artist_kana,request_number,lyrics_start,original_key,remarks1,remarks1_kana,remarks2,remarks2_kana,model_code,genre_code,type_code,release_year,parent_song_id,artist_id
    // インデックス: 14 (0始まり)
    
    // データの並びを確認して置換
    // 行を一旦カンマで分割して、特定のインデックスをパディング
    let columns = line.match(/(".*?"|[^",\s]+)(?=\s*,|\s*$)/g);
    if (!columns) {
        // matchで取れない場合は fallback
        columns = line.split(',');
    }

    if (columns[typeIdx]) {
        let val = columns[typeIdx].replace(/"/g, '').trim();
        if (val && !isNaN(val)) {
            columns[typeIdx] = `"${val.padStart(2, '0')}"`;
        }
    }
    
    return columns.join(',');
});

fs.writeFileSync(path, updatedLines.join('\n'), 'utf8');
console.log('CSV updated successfully.');
