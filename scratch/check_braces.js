const fs = require('fs');
const code = fs.readFileSync('./www/js/app.js', 'utf8');

let stack = [];
for (let i = 0; i < code.length; i++) {
    const char = code[i];
    if (char === '{' || char === '(' || char === '[') {
        // basic, ignores strings and comments for a quick check
        stack.push({ char, index: i });
    } else if (char === '}' || char === ')' || char === ']') {
        const last = stack.pop();
        if (!last) {
            console.log(`Unmatched closing ${char} at index ${i}`);
        }
    }
}
if (stack.length > 0) {
    console.log('Unmatched opening brackets:');
    stack.forEach(s => console.log(`${s.char} at index ${s.index}`));
} else {
    console.log('All brackets match (ignoring strings/comments).');
}
