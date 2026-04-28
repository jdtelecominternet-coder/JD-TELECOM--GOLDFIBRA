const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../middleware/auth');

const GROQ_API_KEY = process.env.GROQ_API_KEY || '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';
const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';
const MODEL = 'llama3-8b-8192';

const SYSTEM_PROMPT = `Você é o assistente da SysFlowCloudi, uma empresa de internet fibra óptica.
Você ajuda técnicos, vendedores e administradores com:
- Dúvidas técnicas sobre fibra óptica, PPPoE, OLT, CTO, splitter
- Sugestões de texto para observações de OS (ordem de serviço)
- Sugestões de texto para vendedores ao abordar clientes
- Análise de sinais (dBm), problemas de conectividade
- Procedimentos de instalação e ativação
Responda sempre em português brasileiro, de forma clara e objetiva.`;

router.post('/chat', authMiddleware, async (req, res) => {
  const { messages } = req.body;
  if (!messages || !Array.isArray(messages)) return res.status(400).json({ error: 'Mensagens inválidas' });

  try {
    const response = await fetch(GROQ_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${GROQ_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: MODEL,
        messages: [{ role: 'system', content: SYSTEM_PROMPT }, ...messages],
        max_tokens: 1024,
        temperature: 0.7
      })
    });

    if (!response.ok) {
      const err = await response.text();
      return res.status(500).json({ error: 'Erro na IA: ' + err });
    }

    const data = await response.json();
    const reply = data.choices?.[0]?.message?.content || 'Sem resposta';
    res.json({ reply });
  } catch (e) {
    res.status(500).json({ error: 'Erro ao conectar com a IA: ' + e.message });
  }
});

// Sugerir texto para observação
router.post('/suggest', authMiddleware, async (req, res) => {
  const { context, role } = req.body;

  const userPrompt = role === 'tecnico'
    ? `Gere uma observação técnica resumida para uma OS de instalação de fibra com os seguintes dados: ${context}. Seja objetivo, máximo 3 linhas.`
    : `Gere uma observação de venda resumida com os seguintes dados: ${context}. Seja objetivo, máximo 2 linhas.`;

  try {
    const response = await fetch(GROQ_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${GROQ_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: MODEL,
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: userPrompt }
        ],
        max_tokens: 200,
        temperature: 0.6
      })
    });

    const data = await response.json();
    const reply = data.choices?.[0]?.message?.content || '';
    res.json({ reply });
  } catch (e) {
    res.status(500).json({ error: 'Erro: ' + e.message });
  }
});

module.exports = router;
