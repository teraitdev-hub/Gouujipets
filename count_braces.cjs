const fs = require('fs');
let code = fs.readFileSync('src/pages/Auth/UserLogin.tsx', 'utf8');

// A very naive JSX-aware brace counter is hard. Let's just strip everything out properly.
// Better: just count all '{' and '}' in the file, ignoring comments.
code = code.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*/g, '');

let depth = 0;
let stack = [];
let lines = code.split('\n');

for (let i = 0; i < lines.length; i++) {
  let l = lines[i];
  for (let j = 0; j < l.length; j++) {
    // Ignore braces in strings or regex roughly
    if (l[j] === '{') {
      depth++;
      stack.push(i + 1);
    }
    if (l[j] === '}') {
      depth--;
      stack.pop();
    }
  }
}

console.log('Depth:', depth);
console.log('Stack (lines with unclosed {):', stack);
