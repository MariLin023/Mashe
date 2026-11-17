import { Router } from "express";
import { requireAuth, requirePermiso } from "../middlewares/auth.middleware.js";

export default (c) => {
    const router = Router();
    router.route("/").get(c.listar);

    // Solo quien tenga el permiso (el Administrador)
    router.route("/").post(requireAuth, requirePermiso("gestionar_categorias"), c.crear);
    router.route("/:key")
        .patch(requireAuth, requirePermiso("gestionar_categorias"), c.actualizar)
        .delete(requireAuth, requirePermiso("gestionar_categorias"), c.eliminar);
    return router;
};
