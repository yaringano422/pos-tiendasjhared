import { Router } from 'express';
import { ReportsController } from './reports.controller';
import { authMiddleware } from '../../middleware/auth';
import { checkRole } from '../../middleware/roles';

const router = Router();
const controller = new ReportsController();

// El dashboard y reportes son usualmente solo para Admin
router.get('/summary', authMiddleware, (req, res) => controller.getSummary(req, res));
router.get('/profit', authMiddleware, checkRole(['admin']), (req, res) => controller.getProfitReport(req, res));
router.get('/top-products', authMiddleware, (req, res) => controller.getTopSelling(req, res));

export default router;