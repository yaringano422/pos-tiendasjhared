import { Router } from 'express';
import { AuthController } from './auth.controller';
import { validateLogin } from './auth.validation'; // <-- Importamos

const router = Router();
const controller = new AuthController();

// Aplicamos la validación antes del controlador
router.post('/login', validateLogin, (req, res) => controller.login(req, res));

export default router;