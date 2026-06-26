import { Request, Response } from "express";
import { InventoryService } from "./inventory.service";

const inventoryService = new InventoryService();

export class InventoryController {
  async getAll(req: Request, res: Response) {
    try {
      const products = await inventoryService.getAllProducts();
      res.status(200).json({ success: true, data: products });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  }

  async getPaginated(req: Request, res: Response) {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;
      const result = await inventoryService.getProductsPaginated(page, limit);
      res.status(200).json({ success: true, ...result });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  }

  async searchProducts(req: Request, res: Response) {
    try {
      const { q } = req.query;
      if (!q)
        return res
          .status(400)
          .json({ success: false, error: "Término requerido" });
      const results = await inventoryService.searchProducts(q as string);
      res.status(200).json({ success: true, data: results });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  }

  async create(req: Request, res: Response) {
    try {
      const payload = {
        ...req.body,

        price: Number(req.body.price),
        cost_buy: Number(req.body.cost_buy),
        price_major: Number(req.body.price_major || 0),

        stock: Number(req.body.stock || 0),
        stock_actual: Number(req.body.stock_actual || 0),
        stock_sold: Number(req.body.stock_sold || 0),

        sale_percentage: Number(req.body.sale_percentage || 0),

        provider_id: req.body.provider_id ? Number(req.body.provider_id) : null,

        is_active: req.body.is_active ?? true,
      };

      const product = await inventoryService.createProduct(payload);

      res.status(201).json({
        success: true,
        data: product,
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        error: error.message,
      });
    }
  }

  async update(req: Request, res: Response) {
    try {
      const id = Number(req.params.id);
      const product = await inventoryService.updateProduct(id, req.body);
      res.status(200).json({ success: true, data: product });
    } catch (error: any) {
      res.status(400).json({ success: false, error: error.message });
    }
  }

  async remove(req: Request, res: Response) {
    try {
      const id = Number(req.params.id);
      await inventoryService.deleteProduct(id);
      res.status(200).json({ success: true, message: "Eliminado" });
    } catch (error: any) {
      res.status(400).json({ success: false, error: error.message });
    }
  }
  async getFilters(req: Request, res: Response) {
    try {
      const filters = await inventoryService.getFilters();
      res.status(200).json({ success: true, data: filters });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  }
  async getProviders(req: Request, res: Response) {
    try {
      const providers = await inventoryService.getProviders();
      res.status(200).json({ success: true, data: providers });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  }
  async bulkImport(req: Request, res: Response) {
    try {
      const { products } = req.body;
      const result = await inventoryService.bulkImportProducts(products);
      res.status(200).json({ operation: "bulk_import_completed", ...result });
    } catch (error: any) {
      res.status(400).json({ success: false, error: error.message });
    }
  }
}
