import express from "express";
import cors from "cors";
// import helmet from "helmet"; // Sugerido
// import morgan from "morgan"; // Sugerido
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
app.use(cors());
// app.use(helmet()); // Seguridad extra
// app.use(morgan('dev')); // Ver peticiones en consola
app.use(express.json());

// Ruta de salud (Opcional, útil para verificar que el server vive)
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
// Manejo de errores (Siempre al final)
app.use(errorHandler);

const PORT = env.port || 4000;

app.listen(PORT, () => {
  console.log(`🚀 Servidor de Tienda de Celulares corriendo en puerto ${PORT}`);
});
