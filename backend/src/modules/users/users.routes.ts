import { Router } from "express";
import { getAllUsers, createNewUser, updateUserInfo } from "./users.controller";
import { authMiddleware } from "../../middleware/auth";
// Cambiamos la importación para evitar el error de "not a function"
import * as rolesMiddleware from "../../middleware/roles";

const router = Router();

/**
 * RUTAS DE USUARIOS
 * Aplicamos authMiddleware primero para inyectar el usuario en 'req'
 * Luego usamos rolesMiddleware.checkRole para validar permisos
 */

// Solo los administradores pueden ver la lista completa
router.get(
  "/",
  authMiddleware,
  rolesMiddleware.checkRole(["admin"]),
  getAllUsers,
);

// Solo los administradores pueden crear nuevos usuarios (vendedores/almacén)
router.post(
  "/",
  authMiddleware,
  rolesMiddleware.checkRole(["admin"]),
  createNewUser,
);

// El admin puede editar a cualquier usuario
router.put(
  "/:id",
  authMiddleware,
  rolesMiddleware.checkRole(["admin"]),
  updateUserInfo,
);

export default router;
