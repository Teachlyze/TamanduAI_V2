/**
 * Rate Limiter Middleware
 * Protege contra ataques de força bruta e spam
 */

const rateLimitStore = new Map();

const cleanupInterval = setInterval(() => {
  const now = Date.now();
  for (const [key, data] of rateLimitStore.entries()) {
    if (now - data.resetTime > 0) {
      rateLimitStore.delete(key);
    }
  }
}, 60000); // Limpa a cada minuto

export const createRateLimiter = (options = {}) => {
  const {
    windowMs = 15 * 60 * 1000, // 15 minutos
    max = 5, // 5 tentativas
    message = 'Muitas tentativas. Tente novamente mais tarde.',
    keyGenerator = (req) => req.ip || 'unknown',
    skipSuccessfulRequests = false,
    skipFailedRequests = false,
  } = options;

  return (req, res, next) => {
    const key = `${req.path}:${keyGenerator(req)}`;
    const now = Date.now();
    
    let record = rateLimitStore.get(key);
    
    if (!record || now > record.resetTime) {
      record = {
        count: 0,
        resetTime: now + windowMs
      };
      rateLimitStore.set(key, record);
    }
    
    record.count++;
    
    const remaining = Math.max(0, max - record.count);
    const resetTime = new Date(record.resetTime);
    
    // Headers informativos
    res.setHeader('X-RateLimit-Limit', max);
    res.setHeader('X-RateLimit-Remaining', remaining);
    res.setHeader('X-RateLimit-Reset', resetTime.toISOString());
    
    if (record.count > max) {
      res.setHeader('Retry-After', Math.ceil((record.resetTime - now) / 1000));
      return res.status(429).json({
        error: 'Too Many Requests',
        message,
        retryAfter: resetTime.toISOString()
      });
    }
    
    // Callback para limpar em caso de sucesso/falha
    res.on('finish', () => {
      if (skipSuccessfulRequests && res.statusCode < 400) {
        record.count = Math.max(0, record.count - 1);
      }
      if (skipFailedRequests && res.statusCode >= 400) {
        record.count = Math.max(0, record.count - 1);
      }
    });
    
    next();
  };
};

// Rate limiters pré-configurados
export const loginLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 5,
  message: 'Muitas tentativas de login. Aguarde 15 minutos.',
  keyGenerator: (req) => req.body?.email || req.ip
});

export const apiLimiter = createRateLimiter({
  windowMs: 1 * 60 * 1000, // 1 minuto
  max: 100,
  message: 'Muitas requisições. Aguarde um momento.'
});

export const registrationLimiter = createRateLimiter({
  windowMs: 60 * 60 * 1000, // 1 hora
  max: 3,
  message: 'Muitas tentativas de registro. Aguarde 1 hora.',
  keyGenerator: (req) => req.ip
});

export const passwordResetLimiter = createRateLimiter({
  windowMs: 60 * 60 * 1000, // 1 hora
  max: 3,
  message: 'Muitas tentativas de recuperação de senha. Aguarde 1 hora.',
  keyGenerator: (req) => req.body?.email || req.ip
});

// Cleanup ao desligar
if (typeof process !== 'undefined') {
  process.on('SIGTERM', () => clearInterval(cleanupInterval));
  process.on('SIGINT', () => clearInterval(cleanupInterval));
}

export default {
  createRateLimiter,
  loginLimiter,
  apiLimiter,
  registrationLimiter,
  passwordResetLimiter
};
