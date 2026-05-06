import { Router } from "express";
import { SalesController } from "./sales.controller"; // Eliminamos la importación individual
import { authMiddleware } from "../../middleware/auth";
import { checkRole } from "../../middleware/roles";

const router = Router();
const controller = new SalesController();

// Ruta para procesar una venta
router.post("/", authMiddleware, (req, res) => controller.createSale(req, res));

// Ruta para auditoría
router.get("/audit", authMiddleware, checkRole(["admin"]), (req, res) =>
  controller.getAudit(req, res),
);

router.get("/history", authMiddleware, (req, res) =>
  controller.getSalesHistory(req, res),
);

export default router;
