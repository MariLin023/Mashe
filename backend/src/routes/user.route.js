import { Router } from "express";
import { requireAuth } from "../middlewares/auth.middleware.js";

export default (c) => {
    const router = Router();
    router.route("/register").post(c.registrar);
    router.route("/login").post(c.iniciarSesion);
    router.route("/me").get(requireAuth, c.perfil);
    return router;
};
