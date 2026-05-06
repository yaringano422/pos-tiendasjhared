import { Request, Response } from "express";
import { InventoryService } from "./inventory.service";

const inventoryService = new InventoryService();

export class InventoryController {
  async getPaginated(req: Request, res: Response) {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const result = await inventoryService.getProductsPaginated(page);
      res.json(result);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  async searchProducts(req: Request, res: Response) {
    try {
      const { q } = req.query;
      if (!q) return res.status(400).json({ message: "Keyword requerida" });
      const results = await inventoryService.searchProducts(q as string);
      res.json(results);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  async getAll(req: Request, res: Response) {
    try {
      // Llamamos al service que ya tiene la lógica de Supabase
      const products = await inventoryService.getAllProducts();

      res.json({
        success: true,
        data: products,
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  }

  async create(req: Request, res: Response) {
    try {
      const product = await inventoryService.addProduct(req.body);
      res.status(201).json(product);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  async search(req: Request, res: Response) {
    try {
      const { q } = req.query;
      const results = await inventoryService.searchProducts(q as string);
      res.json(results);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }
}
