import { Request, Response } from "express";
import { SalesService } from "./sales.service";
import { SalesHistoryService } from "./sales-history";
const salesService = new SalesService();
const historyService = new SalesHistoryService();

export class SalesController {
  async createSale(req: Request, res: Response) {
    try {
      const userId = (req as any).user?.id;
      if (!userId) return res.status(401).json({ error: "No autorizado" });

      const result = await salesService.registerSale({
        ...req.body,
        user_id: userId,
      });
      return res.status(201).json(result);
    } catch (error: any) {
      console.error("Error creando venta:", error);
      return res
        .status(400)
        .json({ error: error.message || "Error al crear la venta" });
    }
  }

  async getSalesHistory(req: Request, res: Response) {
    try {
      const data = await historyService.getFullHistory(req.query);
      return res.json({ data });
    } catch (error: any) {
      return res
        .status(500)
        .json({ error: error.message || "Error obteniendo historial" });
    }
  }

  async cancelSale(req: Request, res: Response) {
    try {
      const userId = (req as any).user?.id;
      const { id } = req.params;
      const { reason } = req.body;
      const result = await salesService.cancelSale(Number(id), reason, userId);
      return res.json(result);
    } catch (error: any) {
      return res.status(400).json({ error: error.message });
    }
  }

  async registerReturn(req: Request, res: Response) {
    try {
      const userId = (req as any).user?.id;
      const { id } = req.params;
      const { reason } = req.body;
      const result = await salesService.registerReturn(
        Number(id),
        reason,
        userId,
      );
      return res.json(result);
    } catch (error: any) {
      return res.status(400).json({ error: error.message });
    }
  }

  async getAudit(req: Request, res: Response) {
    try {
      const log = await salesService.getAuditLog();
      return res.json({ data: log });
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  }
}
