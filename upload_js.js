const fs = require('fs');
const http = require('http');

console.log('Lendo arquivo...');
const content = fs.readFileSync('C:/jdbuild/dist/assets/index-CKWzGmi4.js').toString('base64');
console.log('Tamanho base64:', content.length);

const body = JSON.stringify({ name: 'index-CKWzGmi4.js', content });

const opts = {
  hostname: '72.61.28.164',
  port: 3001,
  path: '/api/upload-file',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(body)
  }
};

console.log('Enviando para o servidor...');
const req = http.request(opts, r => {
  let d = '';
  r.on('data', c => d += c);
  r.on('end', () => {
    console.log('RESULTADO:', r.statusCode, d);
    if (r.statusCode === 200) {
      console.log('ARQUIVO ENVIADO COM SUCESSO!');
    }
  });
});
req.on('error', e => console.log('ERRO:', e.message));
req.write(body);
req.end();
