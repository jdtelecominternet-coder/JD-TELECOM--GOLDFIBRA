const { Client } = require('ssh2');

const HOST = 'jdtelecom.online';
const USER = 'root';
const PASS = '@Suremi135706';

let output = '';

function runCmd(conn, label, cmd) {
  return new Promise((resolve) => {
    conn.exec(cmd, (err, stream) => {
      if (err) {
        output += '\n\n=== ' + label + ' ===\n[ERROR]: ' + err.message + '\n';
        return resolve();
      }
      output += '\n\n=== ' + label + ' ===\n';
      stream.on('data', d => { output += d.toString(); });
      stream.stderr.on('data', d => { output += '[STDERR] ' + d.toString(); });
      stream.on('close', resolve);
    });
  });
}

async function main(conn) {
  // Step 1: Find nginx config file
  await runCmd(conn, 'NGINX TEST', 'nginx -t 2>&1');
  await runCmd(conn, 'NGINX SITES-AVAILABLE', 'ls /etc/nginx/sites-available/ 2>/dev/null; echo "---conf.d---"; ls /etc/nginx/conf.d/ 2>/dev/null');
  await runCmd(conn, 'FIND GOLDFIBRA NGINX CONFIG', 'grep -rl goldfibra /etc/nginx/ 2>/dev/null; grep -rl 3001 /etc/nginx/ 2>/dev/null');

  // Step 2: Determine the config file and read it
  let configFile = '';
  await new Promise((resolve) => {
    conn.exec('grep -rl goldfibra /etc/nginx/ 2>/dev/null | head -1 || grep -rl 3001 /etc/nginx/ 2>/dev/null | head -1', (err, stream) => {
      if (err) return resolve();
      stream.on('data', d => { configFile += d.toString().trim(); });
      stream.stderr.on('data', () => {});
      stream.on('close', resolve);
    });
  });

  output += '\n\n=== DETECTED CONFIG FILE ===\n' + configFile + '\n';

  if (configFile) {
    await runCmd(conn, 'NGINX CONFIG CONTENT', 'cat ' + configFile);
  } else {
    await runCmd(conn, 'NGINX CONFIG CONTENT', 'cat /etc/nginx/sites-available/default 2>/dev/null || cat /etc/nginx/conf.d/default.conf 2>/dev/null');
  }

  // Step 3: Check index.html
  await runCmd(conn, 'INDEX HTML EXISTS', 'ls -la /var/www/goldfibra/frontend/index.html 2>&1');
  await runCmd(conn, 'INDEX HTML CONTENT (first 60 lines)', 'head -60 /var/www/goldfibra/frontend/index.html 2>&1');

  // Step 4: Add no-cache headers to nginx config if not already present
  const checkCmd = configFile
    ? 'grep -c "no-cache" ' + configFile + ' 2>/dev/null || echo 0'
    : 'echo 0';

  let noCacheCount = '0';
  await new Promise((resolve) => {
    conn.exec(checkCmd, (err, stream) => {
      if (err) return resolve();
      stream.on('data', d => { noCacheCount += d.toString().trim(); });
      stream.stderr.on('data', () => {});
      stream.on('close', resolve);
    });
  });

  output += '\n\n=== NO-CACHE ALREADY PRESENT COUNT ===\n' + noCacheCount + '\n';

  if (configFile && !noCacheCount.includes('1') && !noCacheCount.includes('2')) {
    // Need to find the right location block to insert before and add our block
    // We'll use sed/awk to insert the no-cache block inside the server block before the closing }
    // Strategy: find "location /" block and insert before it, or insert before the last }
    const patchCmd = `
CONFIG_FILE="${configFile}"
BLOCK='
    location = /index.html {
        add_header Cache-Control "no-cache, no-store, must-revalidate";
        add_header Pragma "no-cache";
        add_header Expires "0";
    }'

# Check if location = /index.html already exists
if grep -q 'location = /index.html' "$CONFIG_FILE"; then
    echo "ALREADY_EXISTS"
else
    # Insert before the last closing brace of the server block
    # Use python3 or awk
    cp "$CONFIG_FILE" "$CONFIG_FILE.bak"
    awk '
    /^}/ && !done {
        print "    location = /index.html {"
        print "        add_header Cache-Control \\"no-cache, no-store, must-revalidate\\";"
        print "        add_header Pragma \\"no-cache\\";"
        print "        add_header Expires \\"0\\";"
        print "    }"
        done=1
    }
    { print }
    ' "$CONFIG_FILE.bak" > "$CONFIG_FILE"
    echo "PATCHED"
fi
`;
    await runCmd(conn, 'PATCH NGINX CONFIG', patchCmd);
    await runCmd(conn, 'NGINX CONFIG AFTER PATCH', 'cat ' + configFile);
  } else {
    output += '\n\n=== PATCH SKIP ===\nno-cache headers already present or config file not found\n';
  }

  // Step 5: Test nginx config and reload
  await runCmd(conn, 'NGINX TEST AFTER PATCH', 'nginx -t 2>&1');
  await runCmd(conn, 'NGINX RELOAD', 'nginx -s reload 2>&1');

  // Step 6: PM2 logs
  await runCmd(conn, 'PM2 LOGS', 'pm2 logs goldfibra --lines 50 --nostream 2>&1');

  // Step 7: Backend API test
  await runCmd(conn, 'BACKEND API TEST', 'curl -s -o /tmp/api_resp.txt -w "HTTP_STATUS:%{http_code}" http://localhost:3001/api/plans -H "Authorization: Bearer test" 2>&1; echo; cat /tmp/api_resp.txt 2>/dev/null');

  // Step 8: PM2 restart
  await runCmd(conn, 'PM2 RESTART', 'pm2 restart goldfibra 2>&1');

  // Step 9: PM2 status after restart
  await runCmd(conn, 'PM2 STATUS', 'pm2 list 2>&1');
}

const conn = new Client();
conn.on('ready', () => {
  console.log('[SSH CONNECTED]');
  main(conn).then(() => {
    console.log(output);
    conn.end();
  }).catch(e => {
    console.error('[MAIN ERROR]', e);
    console.log(output);
    conn.end();
  });
}).on('keyboard-interactive', (name, instructions, instructionsLang, prompts, finish) => {
  console.error('[DBG] keyboard-interactive prompts:', JSON.stringify(prompts));
  finish([PASS]);
}).on('error', e => {
  console.error('[CONN ERROR]', e.message);
}).connect({
  host: HOST,
  username: USER,
  password: PASS,
  port: 22,
  readyTimeout: 20000,
  tryKeyboard: true,
  debug: (msg) => { if (msg.includes('auth') || msg.includes('AUTH') || msg.includes('ERR') || msg.includes('banner') || msg.includes('keyboard')) process.stderr.write('[DBG] ' + msg + '\n'); }
});
