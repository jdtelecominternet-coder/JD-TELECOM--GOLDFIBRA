const express = require('express');
const router = express.Router();

// Rota simples de status
router.get('/status', (req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

module.exports = router;