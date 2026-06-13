const fs = require('fs');
const readline = require('readline');
const infile = 'C:/Users/V530S/Documents/Antigravity/CSnavi2/www/csv/db.csv';
const outfile = 'C:/Users/V530S/Documents/Antigravity/CSnavi2/www/csv/db_new.csv';

async function processLineByLine() {
  const fileStream = fs.createReadStream(infile);
  const rl = readline.createInterface({
    input: fileStream,
    crlfDelay: Infinity
  });

  const out = fs.createWriteStream(outfile);
  let isFirstLine = true;

  for await (const line of rl) {
    if (isFirstLine) {
      out.write(line + ',"lite"\n');
      isFirstLine = false;
    } else {
      const parts = line.split('","');
      let lite = "0";
      if (parts.length > 12) {
          if (parts[12] === "631" || parts[12] === "0631" || parts[12].includes("631")) {
             lite = "1";
          }
      }
      out.write(line + ',"' + lite + '"\n');
    }
  }
  out.end();
  console.log("Done");
}

processLineByLine();
