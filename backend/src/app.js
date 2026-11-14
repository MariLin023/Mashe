import express from "express";
import cors from "cors";

import { controllers } from "./container.js";
import rutasUsuario from "./routes/user.route.js";
import rutasProducto from "./routes/product.route.js";
import rutasPedido from "./routes/order.route.js";
import { ErrorDeNegocio } from "./domain/errores.js";

const app = express(); // create an express app

app.use(cors()); // para que el frontend (otro puerto) pueda llamar a la API
app.use(express.json());

app.get("/api/v1/health", (_req, res) => res.json({ ok: true }));
app.use("/api/v1/users", rutasUsuario(controllers.usuario));
app.use("/api/v1/products", rutasProducto(controllers.producto));
app.use("/api/v1/orders", rutasPedido(controllers.pedido));

// Ruta que no existe
app.use((_req, res) => res.status(404).json({ message: "Ruta no encontrada" }));

// Un solo lugar para los errores. Los de negocio ya traen su mensaje y su código HTTP.
app.use((err, _req, res, _next) => {
    if (err instanceof ErrorDeNegocio) return res.status(err.codigoHttp).json({ message: err.message });
    if (err.type === "entity.parse.failed") return res.status(400).json({ message: "El cuerpo de la petición no es JSON válido" });
    if (err.name === "ValidationError") return res.status(400).json({ message: err.message });
    if (err.code === 11000) return res.status(409).json({ message: "Ese registro ya existe" });
    console.error(err);
    res.status(500).json({ message: "Error interno del servidor" });
});

export default app;
