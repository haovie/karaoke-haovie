import { rateLimit } from 'express-rate-limit';

export const searchRateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  limit: 30, // 30 requests per IP
  handler: (req, res) => {
    res.status(429).json({ error: 'Quá nhiều yêu cầu, vui lòng thử lại sau' });
  },
  standardHeaders: 'draft-7',
  legacyHeaders: false,
});
