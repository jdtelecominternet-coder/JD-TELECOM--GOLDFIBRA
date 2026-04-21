const fs = require('fs');
const http = require('http');

const usersContent = fs.readFileSync(__dirname + '/frontend/src/pages/Users.jsx', 'utf8');

function post(path, body, token) {
  return new Promise((resolve, reject) => {
    const bodyStr = JSON.stringify(body);
    const opts = {
      hostname: '72.61.28.164', port: 3001, path,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(bodyStr),
        ...(token ? { 'Authorization': 'Bearer ' + token } : {})
      }
    };
    const req = http.request(opts, res => {
      let d = ''; res.on('data', c => d += c); res.on('end', () => resolve({ status: res.statusCode, data: d }));
    });
    req.on('error', reject);
    req.write(bodyStr); req.end();
  });
}

async function main() {
  console.log('Login...');
  const login = await post('/api/auth/login', { jd_id: 'JD0001', password: 'jd1234' });
  console.log('Login:', login.status, login.data.slice(0, 100));
  const token = JSON.parse(login.data).token;
  if (!token) { console.log('Sem token - verifique JD_ID e senha'); return; }

  console.log('Enviando arquivo...');
  const deploy = await post('/api/deploy/file', { file: 'frontend/src/pages/Users.jsx', content: usersContent }, token);
  console.log('Deploy:', deploy.status, deploy.data);
}
main().catch(console.error);
