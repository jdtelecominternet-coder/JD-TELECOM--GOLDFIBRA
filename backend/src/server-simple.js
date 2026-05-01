const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

// Auth simples - versão de teste que sempre funciona
app.post('/api/auth/login', (req, res) => {
  console.log('Login attempt:', req.body);
  const { jd_id, password } = req.body;
  
  // Aceitar qualquer login com ID000001 e senha admin123
  if (jd_id === 'ID000001' && password === 'admin123') {
    console.log('Login successful');
    return res.json({
      success: true,
      token: 'simple-token-' + Date.now(),
      user: {
        id: 1,
        jd_id: 'ID000001',
        name: 'Administrador',
        role: 'admin',
        permissions: {}
      }
    });
  }
  
  console.log('Login failed');
  res.status(401).json({ error: 'Credenciais invalidas' });
});

// Teste GET para verificar se a API está funcionando
app.get('/api/test', (req, res) => {
  res.json({ message: 'API funcionando!', time: new Date().toISOString() });
});

// Users
app.get('/api/users/me', (req, res) => {
  res.json({
    id: 1,
    jd_id: 'ID000001',
    name: 'Administrador',
    role: 'admin',
    permissions: {}
  });
});

app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
  console.log(`Teste: curl http://localhost:${PORT}/api/test`);
});