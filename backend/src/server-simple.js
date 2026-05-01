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

// Auth simples
app.post('/api/auth/login', (req, res) => {
  const { jd_id, password } = req.body;
  if (jd_id === 'ID000001' && password === 'admin123') {
    res.json({
      token: 'simple-token-123',
      user: {
        id: 1,
        jd_id: 'ID000001',
        name: 'Administrador',
        role: 'admin'
      }
    });
  } else {
    res.status(401).json({ error: 'Credenciais invalidas' });
  }
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
});