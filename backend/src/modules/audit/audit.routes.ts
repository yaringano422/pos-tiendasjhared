import { Router } from "express";
import { AuditController } from "./audit.controller";

const router = Router();
const controller = new AuditController();

router.get("/logs", (req, res) => controller.getLogs(req, res));
router.post("/void/:id", (req, res) => controller.voidSale(req, res));

export default router;
