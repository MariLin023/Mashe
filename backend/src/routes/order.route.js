import { Router } from "express";
import { createOrder, myOrders, cancelOrder } from "../controllers/order.controller.js";
import { optionalAuth, requireAuth } from "../middlewares/auth.middleware.js";

const router = Router();

router.route("/").post(optionalAuth, createOrder); // también deja comprar como invitado
router.route("/mine").get(requireAuth, myOrders);
router.route("/:code/cancel").patch(requireAuth, cancelOrder);

export default router;
