const fs = require('fs');
const http = require('http');
const path = require('path');

const BASE = path.join(__dirname);

// Arquivos para enviar ao servidor (conteúdo local → servidor via HTTP)
// Primeiro precisamos subir server.js e deploy.js via curl ou outro método
// Este script usa a rota /api/deploy/file que acabamos de criar

// Passo 1: Login
// Passo 2: Upload dos arquivos

function httpPost(hostname, port, urlPath, body, token) {
  return new Promise((resolve, reject) => {
    const bodyStr = typeof body === 'string' ? body : JSON.stringify(body);
    const opts = {
      hostname, port, path: urlPath, method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(bodyStr),
        ...(token ? { Authorization: 'Bearer ' + token } : {})
      }
    };
    const req = http.request(opts, res => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => resolve({ status: res.statusCode, data: d }));
    });
    req.on('error', reject);
    req.write(bodyStr);
    req.end();
  });
}

async function main() {
  const HOST = '72.61.28.164';
  const PORT = 3001;

  // Login
  console.log('1. Fazendo login...');
  const loginRes = await httpPost(HOST, PORT, '/api/auth/login', { jd_id: 'JD0001', password: 'jd1234' });
  let token;
  try { token = JSON.parse(loginRes.data).token; } catch {}
  
  if (!token) {
    // Tenta senha padrão alternativa
    const loginRes2 = await httpPost(HOST, PORT, '/api/auth/login', { jd_id: 'JD0001', password: 'admin' });
    try { token = JSON.parse(loginRes2.data).token; } catch {}
  }
  
  if (!token) {
    console.log('Login falhou:', loginRes.data);
    console.log('Verifique o JD_ID e senha do admin principal');
    return;
  }
  console.log('Login OK!');

  // Arquivos para enviar
  const files = [
    'frontend/src/pages/Users.jsx',
    'frontend/src/components/Layout.jsx',
    'frontend/src/App.jsx',
    'backend/src/routes/settings.js',
    'backend/src/routes/deploy.js',
    'backend/src/server.js',
  ];

  for (const file of files) {
    const filePath = path.join(BASE, file);
    if (!fs.existsSync(filePath)) { console.log('Arquivo não encontrado:', file); continue; }
    const content = fs.readFileSync(filePath, 'utf8');
    console.log(`2. Enviando ${file} (${Math.round(content.length/1024)}KB)...`);
    const res = await httpPost(HOST, PORT, '/api/deploy/file', { file, content }, token);
    console.log(`   Status: ${res.status} — ${res.data.slice(0, 80)}`);
  }

  console.log('\nDeploy concluído! Build iniciado no servidor.');
}

main().catch(console.error);
