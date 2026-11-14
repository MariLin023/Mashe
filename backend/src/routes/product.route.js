import { Router } from "express";
import { requireAuth, requirePermiso } from "../middlewares/auth.middleware.js";

export default (c) => {
    const router = Router();
    router.route("/").get(c.listar);
    router.route("/:id").get(c.obtener);

    // Solo quien tenga el permiso (el Administrador)
    router.route("/").post(requireAuth, requirePermiso("gestionar_productos"), c.crear);
    router.route("/:id").patch(requireAuth, requirePermiso("gestionar_productos"), c.actualizar);
    return router;
};
