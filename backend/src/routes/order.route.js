import { Router } from "express";
import { optionalAuth, requireAuth, requirePermiso } from "../middlewares/auth.middleware.js";

export default (c) => {
    const router = Router();
    router.route("/").post(optionalAuth, c.crear); // también deja comprar como invitado
    router.route("/mine").get(requireAuth, requirePermiso("consultar_pedidos"), c.misPedidos);
    router.route("/:code/cancel").patch(requireAuth, requirePermiso("cancelar_pedido"), c.cancelar);

    // Administrador
    router.route("/").get(requireAuth, requirePermiso("gestionar_pedidos"), c.listarTodos);
    router.route("/:code/status").patch(requireAuth, requirePermiso("gestionar_pedidos"), c.cambiarEstado);
    return router;
};
