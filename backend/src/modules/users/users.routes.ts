import { Router } from "express";
import { getAllUsers, createNewUser, updateUserInfo } from "./users.controller";
import { authMiddleware } from "../../middleware/auth";
import * as rolesMiddleware from "../../middleware/roles";

const router = Router();

/**
 * RUTAS DE USUARIOS
 * Se aplica authMiddleware primero para inyectar el usuario en 'req'
 * Luego la empleacion de  rolesMiddleware.checkRole para validar permisos
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
