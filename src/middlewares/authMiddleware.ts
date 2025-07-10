import { Request, Response, NextFunction } from 'express';
import axios from 'axios';

// Simulating environment service (replace with real config if needed)
const environmentService = {
  ifProduction: () => false, // Set to `true` in production
  getValue: (key: string) => process.env[key]
};

// Custom error (optional, can use plain strings if preferred)
class NotAuthenticatedError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'NotAuthenticatedError';
  }
}

// ✅ Auth middleware to validate access token
export function isUserAuthenticated(): (req: Request, res: Response, next: NextFunction) => Promise<void> {
  return async (req, res, next) => {
    if (!environmentService.ifProduction()) {
      return next(); // Skip validation in dev
    }

    const { at } = req.headers as any;

    if (!at) {
      res.status(401).json({ error: 'Unauthorized: Missing access token' });
      return;
    }

    try {
      const response = await axios.post(
        environmentService.getValue('VALIDATION_URL')!,
        null,
        {
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          params: { token: at }
        }
      );

      const { active } = response.data;

      if (!active) {
        res.status(401).json({ error: 'Unauthorized: Token not active' });
        return;
      }

      return next();
    } catch (err) {
      console.error('Auth error:', err);
      res.status(401).json({ error: 'Unauthorized: Token validation failed' });
      return;
    }
  };
}