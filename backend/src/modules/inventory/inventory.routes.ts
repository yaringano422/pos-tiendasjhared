import { Router } from "express";
import { InventoryController } from "./inventory.controller";
import { authMiddleware } from "../../middleware/auth";

const router = Router();
const controller = new InventoryController();

router.get("/", authMiddleware, (req, res) => controller.getAll(req, res));
router.get("/search", authMiddleware, (req, res) =>
  controller.search(req, res),
);
router.post("/", authMiddleware, (req, res) => controller.create(req, res));
router.get("/paginated", authMiddleware, (req, res) =>
  controller.getPaginated(req, res),
);
router.get("/search", authMiddleware, (req, res) =>
  controller.searchProducts(req, res),
);

export default router;
