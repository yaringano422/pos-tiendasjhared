import { Request, Response, NextFunction } from 'express';

export const validateBody = (schema: any) => (req: Request, res: Response, next: NextFunction) => {
  // Aquí puedes integrar librerías como Zod o Joi más adelante
  if (!req.body || Object.keys(req.body).length === 0) {
    return res.status(400).json({ message: 'El cuerpo de la petición no puede estar vacío' });
  }
  next();
};