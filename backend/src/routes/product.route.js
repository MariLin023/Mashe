import { Router } from "express";
import { listProducts, getProduct, createProduct, updateProduct } from "../controllers/product.controller.js";
import { requireAuth, requireRole } from "../middlewares/auth.middleware.js";

const router = Router();

router.route("/").get(listProducts);
router.route("/:id").get(getProduct);

// Solo administrador
router.route("/").post(requireAuth, requireRole("administrador"), createProduct);
router.route("/:id").patch(requireAuth, requireRole("administrador"), updateProduct);

export default router;
