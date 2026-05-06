import { Request, Response } from "express";
import { AuditService } from "./audit.service";

const auditService = new AuditService();

export class AuditController {
  async getLogs(req: Request, res: Response) {
    try {
      const logs = await auditService.getAuditLogs();
      res.json(logs);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  async voidSale(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { reason, user_id } = req.body;

      // 🔥 CONVERSIÓN CLAVE
      const saleId = Number(id);
      const userId = Number(user_id);

      // Validación básica (PRO)
      if (isNaN(saleId)) {
        return res.status(400).json({ error: "ID de venta inválido" });
      }

      if (isNaN(userId)) {
        return res.status(400).json({ error: "ID de usuario inválido" });
      }

      const result = await auditService.voidSale(saleId, reason, userId);

      res.json({ message: "Venta anulada con éxito", result });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }
}
