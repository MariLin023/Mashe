import { Router } from "express";
import { registerUser, loginUser, getMe } from "../controllers/user.controller.js";
import { requireAuth } from "../middlewares/auth.middleware.js";

const router = Router();

router.route("/register").post(registerUser);
router.route("/login").post(loginUser);
router.route("/me").get(requireAuth, getMe);

export default router;
