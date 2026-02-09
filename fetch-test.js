const fs = require('fs');

function log(msg) {
  console.log(msg);
  try {
    fs.appendFileSync('fetch-result.txt', msg + '\n');
  } catch (e) {}
}

async function tryFetch(port) {
  log(`Trying port ${port}...`);
  try {
    const res = await fetch(`http://localhost:${port}/api/test-notification`);
    // if (!res.ok) throw new Error(`Status ${res.status}`); // Don't throw solely on status, read body first
    const text = await res.text();
    let data;
    try {
      data = JSON.parse(text);
    } catch {
      data = text;
    }
    log(`Port ${port} STATUS ${res.status}: ${JSON.stringify(data, null, 2)}`);
    return res.ok;
  } catch (e) {
    log(`Port ${port} failed: ${e.message}`);
    return false;
  }
}

async function main() {
  // Try port 3000 first
  if (await tryFetch(3000)) return;
  // If failed, try 3001
  await tryFetch(3001);
}

main();
