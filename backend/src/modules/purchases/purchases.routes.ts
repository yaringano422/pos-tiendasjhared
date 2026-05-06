import { Router } from 'express';
import { PurchaseController } from './purchases.controller';
import { authMiddleware } from '../../middleware/auth';
import { checkRole } from '../../middleware/roles';

const router = Router();
const controller = new PurchaseController();

// Solo admin o almacen pueden registrar compras (según purchases_ui.txt)
router.post('/', authMiddleware, checkRole(['admin', 'almacen']), (req, res) => 
  controller.create(req, res)
);

router.get('/history', authMiddleware, (req, res) => 
  controller.getHistory(req, res)
);

export default router;