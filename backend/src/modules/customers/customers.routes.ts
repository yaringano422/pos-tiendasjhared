import { Router } from "express";
import { CustomerController } from "./customers.controller";

const router = Router();
const customerController = new CustomerController();

router.get("/", (req, res) => customerController.getAll(req, res));
router.get("/:name", (req, res) => customerController.getByName(req, res));
router.post("/", (req, res) => customerController.create(req, res));
router.put("/:id", (req, res) => customerController.update(req, res));

export default router;
