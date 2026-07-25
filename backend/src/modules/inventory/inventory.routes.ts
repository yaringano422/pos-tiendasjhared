import { Router } from "express";
import { InventoryController } from "./inventory.controller";
import { authMiddleware } from "../../middleware/auth";

const router = Router();
const controller = new InventoryController();

// 1. RUTAS LECTURA GENERAL
router.get("", authMiddleware, (req, res) => controller.getAll(req, res));
router.get("/", authMiddleware, (req, res) => controller.getAll(req, res));

// 2. RUTAS ESPECÍFICAS (Deben ir SIEMPRE antes de /:id)
router.get("/paginated", authMiddleware, (req, res) =>
  controller.getPaginated(req, res)
);
router.get("/search", authMiddleware, (req, res) =>
  controller.searchProducts(req, res)
);
router.get("/filters", authMiddleware, (req, res) =>
  controller.getFilters(req, res)
);
router.get("/providers", authMiddleware, (req, res) =>
  controller.getProviders(req, res)
);

// 3. OPERACIONES DE CREACIÓN E IMPORTACIÓN MASIVA
router.post("/", authMiddleware, (req, res) => controller.create(req, res));
router.post("/bulk-import", authMiddleware, (req, res) =>
  controller.bulkImport(req, res)
);

// 4. RUTAS DINÁMICAS POR PARAMETRO ID (Van al final)
router.put("/:id", authMiddleware, (req, res) => controller.update(req, res));
router.delete("/:id", authMiddleware, (req, res) =>
  controller.remove(req, res)
);

export default router;