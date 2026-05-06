import { Request, Response } from 'express';
import { ReportsService } from './reports.service';

const reportsService = new ReportsService();

export class ReportsController {
  async getSummary(req: Request, res: Response) {
    try {
      const kpis = await reportsService.getDashboardKPIs();
      res.json(kpis);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  async getProfitReport(req: Request, res: Response) {
    try {
      const { start, end } = req.query;
      const profit = await reportsService.getRealProfit(start as string, end as string);
      res.json(profit);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  async getTopSelling(req: Request, res: Response) {
    try {
      const top = await reportsService.getTopProducts();
      res.json(top);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }
}