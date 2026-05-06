import { Request, Response, NextFunction } from 'express';

export const validateLogin = (req: Request, res: Response, next: NextFunction) => {
  const { username, password } = req.body;

  if (!username || username.length < 3) {
    return res.status(400).json({ error: 'El nombre de usuario debe tener al menos 3 caracteres' });
  }
  if (!password || password.length < 4) {
    return res.status(400).json({ error: 'La contraseña es demasiado corta' });
  }
  next();
};