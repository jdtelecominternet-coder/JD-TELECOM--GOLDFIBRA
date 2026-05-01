const express = require('express');
const router = express.Router();
const { getDb } = require('../database');
const jwt = require('jsonwebtoken');
const { JWT_SECRET } = require('../middleware/auth');

// ── Registro de biometria facial ────────────────────────────────────────────
router.post('/register', async (req, res) => {
  try {
    const db = getDb();
    const { user_id, face_data, face_descriptor, liveness_data } = req.body;

    if (!user_id || !face_data || !face_descriptor) {
      return res.status(400).json({ error: 'Dados incompletos para registro facial' });
    }

    // Verificar se usuário existe
    const user = db.prepare('SELECT id FROM users WHERE id = ?').get(user_id);
    if (!user) {
      return res.status(404).json({ error: 'Usuário não encontrado' });
    }

    // Verificar se já existe biometria para este usuário
    const existing = db.prepare('SELECT id FROM face_biometrics WHERE user_id = ?').get(user_id);
    
    if (existing) {
      // Atualizar biometria existente
      db.prepare(`
        UPDATE face_biometrics 
        SET face_data = ?, face_descriptor = ?, liveness_data = ?, updated_at = datetime('now')
        WHERE user_id = ?
      `).run(face_data, face_descriptor, liveness_data || null, user_id);
    } else {
      // Criar nova biometria
      db.prepare(`
        INSERT INTO face_biometrics (user_id, face_data, face_descriptor, liveness_data)
        VALUES (?, ?, ?, ?)
      `).run(user_id, face_data, face_descriptor, liveness_data || null);
    }

    res.json({ success: true, message: 'Biometria facial registrada com sucesso' });
  } catch (err) {
    console.error('Erro ao registrar biometria facial:', err);
    res.status(500).json({ error: 'Erro interno ao registrar biometria' });
  }
});

// ── Verificação de biometria facial ────────────────────────────────────────
router.post('/verify', async (req, res) => {
  try {
    const db = getDb();
    const { face_descriptor, liveness_check } = req.body;

    if (!face_descriptor) {
      return res.status(400).json({ error: 'Dados faciais não fornecidos' });
    }

    // Buscar todas as biometrias cadastradas
    const biometrics = db.prepare('SELECT * FROM face_biometrics').all();
    
    if (biometrics.length === 0) {
      return res.status(404).json({ error: 'Nenhuma biometria cadastrada' });
    }

    // Comparar descritores faciais (simulação - em produção usar biblioteca como face-api.js)
    let bestMatch = null;
    let bestScore = 0;
    const threshold = 0.6; // Limiar de similaridade (60%)

    for (const bio of biometrics) {
      const score = compareFaceDescriptors(face_descriptor, bio.face_descriptor);
      if (score > bestScore && score >= threshold) {
        bestScore = score;
        bestMatch = bio;
      }
    }

    if (!bestMatch) {
      return res.status(401).json({ error: 'Rosto não reconhecido. Tente novamente.' });
    }

    // Verificação de liveness (anti-spoofing) - detectar se é foto ou rosto real
    if (liveness_check && bestMatch.liveness_data) {
      const livenessScore = verifyLiveness(liveness_check, bestMatch.liveness_data);
      if (livenessScore < 0.7) {
        return res.status(401).json({ 
          error: 'Possível tentativa de fraude detectada. Use seu rosto real, não uma foto.',
          code: 'LIVENESS_FAILED'
        });
      }
    }

    // Buscar dados do usuário
    const user = db.prepare(`
      SELECT u.id, u.jd_id, u.name, u.role, u.email, u.photo_url, u.active
      FROM users u
      WHERE u.id = ?
    `).get(bestMatch.user_id);

    if (!user) {
      return res.status(404).json({ error: 'Usuário não encontrado' });
    }

    if (!user.active) {
      return res.status(403).json({ error: 'Usuário desativado' });
    }

    // Gerar token JWT
    const token = jwt.sign(
      { userId: user.id, jd_id: user.jd_id, role: user.role },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({
      success: true,
      message: 'Reconhecimento facial bem-sucedido',
      token,
      user: {
        id: user.id,
        jd_id: user.jd_id,
        name: user.name,
        role: user.role,
        email: user.email,
        photo_url: user.photo_url
      },
      confidence: Math.round(bestScore * 100)
    });
  } catch (err) {
    console.error('Erro na verificação facial:', err);
    res.status(500).json({ error: 'Erro interno na verificação facial' });
  }
});

// ── Verificar se usuário tem biometria cadastrada ──────────────────────────
router.get('/check/:user_id', async (req, res) => {
  try {
    const db = getDb();
    const { user_id } = req.params;

    const bio = db.prepare('SELECT id, created_at FROM face_biometrics WHERE user_id = ?').get(user_id);
    
    res.json({
      has_biometry: !!bio,
      registered_at: bio?.created_at || null
    });
  } catch (err) {
    console.error('Erro ao verificar biometria:', err);
    res.status(500).json({ error: 'Erro interno' });
  }
});

// ── Remover biometria facial ───────────────────────────────────────────────
router.delete('/:user_id', async (req, res) => {
  try {
    const db = getDb();
    const { user_id } = req.params;

    db.prepare('DELETE FROM face_biometrics WHERE user_id = ?').run(user_id);
    
    res.json({ success: true, message: 'Biometria facial removida' });
  } catch (err) {
    console.error('Erro ao remover biometria:', err);
    res.status(500).json({ error: 'Erro interno' });
  }
});

// ── Função auxiliar: Comparar descritores faciais ──────────────────────────
function compareFaceDescriptors(desc1, desc2) {
  // Converter strings JSON para arrays se necessário
  const d1 = typeof desc1 === 'string' ? JSON.parse(desc1) : desc1;
  const d2 = typeof desc2 === 'string' ? JSON.parse(desc2) : desc2;
  
  // Calcular distância euclidiana
  let sum = 0;
  for (let i = 0; i < d1.length; i++) {
    sum += Math.pow(d1[i] - d2[i], 2);
  }
  const distance = Math.sqrt(sum);
  
  // Converter distância em score de similaridade (0 a 1)
  // Distância 0 = 100% similar, distância 1.4 = 0% similar
  const similarity = Math.max(0, 1 - (distance / 1.4));
  
  return similarity;
}

// ── Função auxiliar: Verificar liveness (anti-spoofing) ────────────────────
function verifyLiveness(livenessData, storedLivenessData) {
  // Verificação de profundidade e movimento
  // Em produção, isso usaria análise de profundidade da câmera
  
  const checks = [
    // Verificar se há movimento detectado (não é foto estática)
    livenessData.hasMovement && storedLivenessData.hasMovement,
    // Verificar profundidade (rosto 3D vs foto 2D)
    livenessData.depthScore > 0.6,
    // Verificar iluminação natural
    livenessData.naturalLight > 0.5,
    // Verificar piscada
    livenessData.blinkDetected
  ];
  
  const passedChecks = checks.filter(Boolean).length;
  return passedChecks / checks.length;
}

module.exports = router;