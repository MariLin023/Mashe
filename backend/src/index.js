import "dotenv/config";
import { createServer } from "node:http";
import { Server } from "socket.io";
import connectDB from "./config/database.js";
import app from "./app.js";
import { usuarioDelToken } from "./middlewares/auth.middleware.js";

const PORT = process.env.PORT || 4000;
const server = createServer(app);
const io = new Server(server, {
    cors: {
        origin: process.env.FRONTEND_ORIGIN || "http://localhost:5500"
    }
});

io.use((socket, next) => {
    try {
        const usuario = usuarioDelToken(socket.handshake.auth.token);
        if (!usuario.puede("consultar_pedidos")) {
            return next(new Error("Sin permiso para consultar pedidos"));
        }

        socket.data.usuarioId = usuario.id;
        next();
    } catch {
        next(new Error("Sesión inválida o vencida"));
    }
});

io.on("connection", (socket) => {
    socket.join(`cliente:${socket.data.usuarioId}`);
});

app.set("io", io);

connectDB().then(() => {
    server.listen(PORT, () => console.log(`Servidor en http://localhost:${PORT}`));
});
