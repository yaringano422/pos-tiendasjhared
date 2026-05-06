import { Request, Response } from 'express';
import { PurchaseService } from './purchases.service';

const purchaseService = new PurchaseService();

export class PurchaseController {
  async create(req: Request, res: Response) {
    try {
      const purchase = await purchaseService.registerPurchase(req.body);
      res.status(201).json({
        status: 'success',
        message: 'Compra registrada correctamente',
        data: purchase
      });
    } catch (error: any) {
      res.status(400).json({ status: 'error', message: error.message });
    }
  }

  async getHistory(req: Request, res: Response) {
    try {
      const { month, year } = req.query;
      const history = await purchaseService.getPurchasesHistory(
        month ? parseInt(month as string) : undefined,
        year ? parseInt(year as string) : undefined
      );
      res.json(history);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }
}