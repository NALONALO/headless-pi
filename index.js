#!/usr/bin/env node
const path = require('path');
const cp = require('child_process');
const fs = require('fs');

const extPath = path.join(__dirname, 'stream-output.ts');

if (!fs.existsSync(extPath)) {
    console.error("\x1b[31m[headless-pi] Error: stream-output.ts extension not found in package!\x1b[0m");
    process.exit(1);
}

// If not running in a true TTY (like in agent background tasks), trick Pi into thinking it is!
// This entirely bypasses Pi's pipe reading logic, preventing infinite hangs without closing the stream.
if (!process.stdin.isTTY) {
    Object.defineProperty(process.stdin, 'isTTY', { value: true });
}

// Prepend the extension flags into process.argv so the Pi parser sees them natively
process.argv.splice(2, 0, '-e', extPath, '--stream=all');

try {
    // Dynamically locate the global Pi installation via npm
    const globalModules = cp.execSync('npm root -g').toString().trim();
    const piCli = path.join(globalModules, '@earendil-works', 'pi-coding-agent', 'dist', 'cli.js');
    
    // Boot Pi natively within this exact Node process!
    require(piCli);
} catch (e) {
    console.error("Failed to boot Pi natively. Is @earendil-works/pi-coding-agent installed globally?", e.message);
}
