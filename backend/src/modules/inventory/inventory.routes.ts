import { Router } from "express";
import { InventoryController } from "./inventory.controller";
import { authMiddleware } from "../../middleware/auth";

const router = Router();
const controller = new InventoryController();

router.get("", authMiddleware, (req, res) => controller.getAll(req, res));
router.get("/", authMiddleware, (req, res) => controller.getAll(req, res));

router.post("/", authMiddleware, (req, res) => controller.create(req, res));
router.get("/paginated", authMiddleware, (req, res) =>
  controller.getPaginated(req, res),
);
router.get("/search", authMiddleware, (req, res) =>
  controller.searchProducts(req, res),
);
router.put("/:id", authMiddleware, (req, res) => controller.update(req, res));
router.delete("/:id", authMiddleware, (req, res) =>
  controller.remove(req, res),
);
router.get("/filters", authMiddleware, (req, res) =>
  controller.getFilters(req, res),
);
router.get("/providers", controller.getProviders);
router.post("/bulk-import", authMiddleware, (req, res) =>
  controller.bulkImport(req, res),
);

export default router;
