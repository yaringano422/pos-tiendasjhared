import { Request, Response } from "express";
import { SalesService } from "./sales.service";
import { SalesHistoryService } from "./sales-history";

// Instanciamos los servicios una sola vez
const salesService = new SalesService();
const historyService = new SalesHistoryService();

export class SalesController {
  async createSale(req: Request, res: Response) {
    try {
      const userId = (req as any).user?.id;

      if (!userId) {
        return res.status(401).json({ error: "No autorizado" });
      }

      const saleData = {
        ...req.body,
        user_id: userId,
      };

      // USAMOS la instancia salesService que definimos arriba
      const result = await salesService.registerSale(saleData);

      return res.status(201).json(result);
    } catch (error: any) {
      console.error("Error creando venta:", error);
      return res.status(400).json({
        error: error.message || "Error al crear la venta",
      });
    }
  }

  async getAudit(req: Request, res: Response) {
    try {
      const log = await salesService.getAuditLog();
      res.json({ data: log });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  // Moví getSalesHistory dentro de la clase para mantener consistencia
  async getSalesHistory(req: Request, res: Response) {
    try {
      const data = await historyService.getFullHistory(req.query);
      return res.json({ data });
    } catch (error: any) {
      return res.status(500).json({
        error: error.message || "Error obteniendo historial",
      });
    }
  }
}
