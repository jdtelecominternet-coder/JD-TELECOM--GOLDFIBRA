// Middleware de proteção contra cópia e verificação de licença
const crypto = require('crypto');

// Chave secreta para validação (deve ser configurada no .env)
const LICENSE_KEY = process.env.LICENSE_KEY || 'sysflow-default-key';
const ALLOWED_DOMAINS = [
  'jdtelecom.online',
  'www.jdtelecom.online',
  'localhost',
  '127.0.0.1'
];

// Gerar hash de verificação
function generateIntegrityHash(data) {
  return crypto.createHmac('sha256', LICENSE_KEY).update(JSON.stringify(data)).digest('hex');
}

// Middleware de proteção
function protectionMiddleware(req, res, next) {
  // Verificar origem da requisição
  const origin = req.headers.origin || req.headers.referer || '';
  const host = req.headers.host || '';
  
  // Em desenvolvimento, permitir localhost
  if (process.env.NODE_ENV === 'development') {
    return next();
  }
  
  // Verificar se a origem é permitida
  const isAllowed = ALLOWED_DOMAINS.some(domain => 
    origin.includes(domain) || host.includes(domain)
  );
  
  if (!isAllowed) {
    console.warn(`🚫 Acesso bloqueado de origem não autorizada: ${origin || host}`);
    return res.status(403).json({ 
      error: 'Acesso não autorizado',
      code: 'INVALID_ORIGIN'
    });
  }
  
  // Adicionar headers de proteção
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  
  // Prevenir cache de dados sensíveis
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  
  next();
}

// Middleware de rate limiting por IP
const requestCounts = new Map();
const RATE_LIMIT = 100; // requisições
const RATE_WINDOW = 15 * 60 * 1000; // 15 minutos

function rateLimitMiddleware(req, res, next) {
  const ip = req.ip || req.connection.remoteAddress;
  const now = Date.now();
  
  if (!requestCounts.has(ip)) {
    requestCounts.set(ip, { count: 1, firstRequest: now });
  } else {
    const data = requestCounts.get(ip);
    
    if (now - data.firstRequest > RATE_WINDOW) {
      // Resetar contador
      requestCounts.set(ip, { count: 1, firstRequest: now });
    } else {
      data.count++;
      
      if (data.count > RATE_LIMIT) {
        return res.status(429).json({
          error: 'Muitas requisições. Tente novamente mais tarde.',
          code: 'RATE_LIMIT_EXCEEDED'
        });
      }
    }
  }
  
  next();
}

// Limpar contadores antigos periodicamente
setInterval(() => {
  const now = Date.now();
  for (const [ip, data] of requestCounts.entries()) {
    if (now - data.firstRequest > RATE_WINDOW) {
      requestCounts.delete(ip);
    }
  }
}, 5 * 60 * 1000); // Limpar a cada 5 minutos

// Middleware de validação de integridade da API
function apiIntegrityMiddleware(req, res, next) {
  // Verificar header de integridade em requisições sensíveis
  if (req.method !== 'GET' && req.path.startsWith('/api/')) {
    const integrityHeader = req.headers['x-api-integrity'];
    const timestamp = req.headers['x-api-timestamp'];
    
    if (!integrityHeader || !timestamp) {
      // Em produção, exigir header
      if (process.env.NODE_ENV === 'production') {
        return res.status(403).json({
          error: 'Requisição não autorizada',
          code: 'MISSING_INTEGRITY'
        });
      }
    }
    
    // Verificar se timestamp não é muito antigo (prevenir replay attacks)
    if (timestamp) {
      const requestTime = parseInt(timestamp);
      const now = Date.now();
      
      if (isNaN(requestTime) || Math.abs(now - requestTime) > 5 * 60 * 1000) {
        return res.status(403).json({
          error: 'Requisição expirada',
          code: 'REQUEST_EXPIRED'
        });
      }
    }
  }
  
  next();
}

module.exports = {
  protectionMiddleware,
  rateLimitMiddleware,
  apiIntegrityMiddleware,
  generateIntegrityHash
};
