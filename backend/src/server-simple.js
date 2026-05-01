const express = require('express');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

// Auth - ACEITA QUALQUER LOGIN
app.post('/api/auth/login', (req, res) => {
  console.log('Login:', req.body);
  
  // Aceitar qualquer jd_id e qualquer senha
  res.json({
    success: true,
    token: 'token-' + Date.now(),
    user: {
      id: 1,
      jd_id: req.body.jd_id || 'ID000001',
      name: 'Administrador',
      role: 'admin',
      permissions: {}
    }
  });
});

// Teste
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
});