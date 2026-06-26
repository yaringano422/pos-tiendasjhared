import { Router } from "express";
import { SalesController } from "./sales.controller";
import { authMiddleware } from "../../middleware/auth";
import { checkRole } from "../../middleware/roles";

const router = Router();
const controller = new SalesController();

router.post("/", authMiddleware, (req, res) => controller.createSale(req, res));
router.get("/history", authMiddleware, (req, res) =>
  controller.getSalesHistory(req, res),
);
router.post("/:id/cancel", authMiddleware, (req, res) =>
  controller.cancelSale(req, res),
);
router.post("/:id/return", authMiddleware, (req, res) =>
  controller.registerReturn(req, res),
);
router.get("/audit", authMiddleware, checkRole(["admin"]), (req, res) =>
  controller.getAudit(req, res),
);

export default router;
