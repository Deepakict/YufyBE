import { Request, Response, NextFunction } from 'express';

export const asyncMiddleware =
  (fn: (req: Request, res: Response, next: NextFunction) => Promise<any>) =>
  (req: Request, res: Response, next: NextFunction) =>
    Promise.resolve(fn(req, res, next)).catch(next);

export const sendCreateSuccess =
  (res: Response, message: string) => (data: any) => {
    res.statusMessage = message;
    res.status(201).json(data);
  };

export const sendSuccess =
  (res: Response, message: string) => (data: any) => {
    res.statusMessage = message;
    if (!res.headersSent) {
      res.status(200).json(data);
    }
  };