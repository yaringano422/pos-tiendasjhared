import express from "express";
import cors from "cors";
import { env } from "./config/env";
import { errorHandler } from "./middleware/errorHandler";

// Importación de Rutas
import authRoutes from "./modules/auth/auth.routes";
import userRoutes from "./modules/users/users.routes";
import customerRoutes from "./modules/customers/customers.routes";
import inventoryRoutes from "./modules/inventory/inventory.routes";
import salesRoutes from "./modules/sales/sales.routes";
import purchaseRoutes from "./modules/purchases/purchases.routes";
import reportRoutes from "./modules/reports/reports.routes";
import auditRoutes from "./modules/audit/audit.routes";

const app = express();

// Middlewares globales
app.use(
  cors({
    origin: true,
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  }),
);
app.use(express.json());

// Ruta de salud
app.get("/health", (req, res) => res.json({ status: "up" }));

// Registro de Endpoints
app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/customers", customerRoutes);
app.use("/api/inventory", inventoryRoutes);
app.use("/api/sales", salesRoutes);
app.use("/api/purchases", purchaseRoutes);
app.use("/api/reports", reportRoutes);
app.use("/api/audit", auditRoutes);

// Captura de rutas no encontradas (Evita respuestas HTML)
app.use((req, res, next) => {
  res.status(404).json({
    success: false,
    message: `La ruta ${req.originalUrl} no fue encontrada en este servidor.`,
  });
});

// Middleware de manejo de errores global
app.use(errorHandler);

const PORT = env.port || 4000;

app.listen(PORT, () => {
  console.log(`🚀 Servidor de Tienda de Celulares corriendo en puerto ${PORT}`);
});
