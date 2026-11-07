import express from "express";
import cors from "cors";

import userRouter from "./routes/user.route.js";
import productRouter from "./routes/product.route.js";
import orderRouter from "./routes/order.route.js";

const app = express(); // create an express app

app.use(cors()); // para que el frontend (otro puerto) pueda llamar a la API
app.use(express.json());

app.get("/api/v1/health", (_req, res) => res.json({ ok: true }));
app.use("/api/v1/users", userRouter);
app.use("/api/v1/products", productRouter);
app.use("/api/v1/orders", orderRouter);

// Ruta que no existe
app.use((_req, res) => res.status(404).json({ message: "Ruta no encontrada" }));

// Express 5 manda aquí cualquier error de funciones async, no hace falta try/catch en cada controlador
app.use((err, _req, res, _next) => {
    console.error(err);
    if (err.name === "ValidationError") return res.status(400).json({ message: err.message });
    res.status(500).json({ message: "Error interno del servidor" });
});

export default app;
