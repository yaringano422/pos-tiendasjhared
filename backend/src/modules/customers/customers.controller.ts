import { Request, Response } from "express";
import { CustomerService } from "./customers.service";

const customerService = new CustomerService();

export class CustomerController {
  async getAll(req: Request, res: Response) {
    try {
      const customers = await customerService.getAllCustomers();
      res.json(customers);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  async getByName(req: Request, res: Response) {
    try {
      const customer = await customerService.getCustomerByName(req.params.name);
      res.json(customer);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  async create(req: Request, res: Response) {
    try {
      const { name, email, phone } = req.body;
      const newCustomer = await customerService.getOrCreateCustomer(
        name,
        email,
        phone,
      );
      res.status(201).json(newCustomer);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  async update(req: Request, res: Response) {
    try {
      const id = parseInt(req.params.id);
      const updatedCustomer = await customerService.updateCustomer(
        id,
        req.body,
      );
      res.json(updatedCustomer);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }
}
