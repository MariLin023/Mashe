import jwt from "jsonwebtoken";
import { crearUsuario } from "../domain/fabricaUsuario.js";
import { ErrorNoAutenticado, ErrorSinPermiso } from "../domain/errores.js";

const leerToken = (req) => {
    const header = req.headers.authorization || "";
    return header.startsWith("Bearer ") ? header.slice(7) : null;
};

// Del token reconstruye el objeto de la clase correcta (Cliente o Administrador)
const usuarioDelToken = (token) => {
    const datos = jwt.verify(token, process.env.JWT_SECRET);
    return crearUsuario({ id: datos.id, nombre: datos.nombre, correo: datos.correo, rol: datos.rol });
};

// Con token válido llena req.usuario; si no, deja pasar (compra como invitado)
export const optionalAuth = (req, _res, next) => {
    const token = leerToken(req);
    if (token) {
        try {
            req.usuario = usuarioDelToken(token);
        } catch {
            // token vencido o falso: se trata como invitado
        }
    }
    next();
};

export const requireAuth = (req, _res, next) => {
    const token = leerToken(req);
    if (!token) return next(new ErrorNoAutenticado());
    try {
        req.usuario = usuarioDelToken(token);
        next();
    } catch {
        next(new ErrorNoAutenticado("Tu sesión no es válida o ya venció"));
    }
};

// POLIMORFISMO en acción: pregunta usuario.puede(...) sin importar si es Cliente o Administrador
export const requirePermiso = (accion) => (req, _res, next) => {
    if (req.usuario?.puede(accion)) return next();
    next(new ErrorSinPermiso());
};
