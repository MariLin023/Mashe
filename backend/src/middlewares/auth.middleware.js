import jwt from "jsonwebtoken";

const readToken = (req) => {
    const header = req.headers.authorization || "";
    return header.startsWith("Bearer ") ? header.slice(7) : null;
};

// Si trae token válido, llena req.user; si no, deja pasar (compra como invitado)
export const optionalAuth = (req, _res, next) => {
    const token = readToken(req);
    if (token) {
        try {
            req.user = jwt.verify(token, process.env.JWT_SECRET);
        } catch {
            // token vencido o falso: se trata como invitado
        }
    }
    next();
};

export const requireAuth = (req, res, next) => {
    const token = readToken(req);
    if (!token) return res.status(401).json({ message: "Inicia sesión para continuar" });
    try {
        req.user = jwt.verify(token, process.env.JWT_SECRET);
        next();
    } catch {
        res.status(401).json({ message: "Tu sesión no es válida o ya venció" });
    }
};

export const requireRole = (role) => (req, res, next) => {
    if (req.user?.role === role) return next();
    res.status(403).json({ message: "No tienes permiso para hacer esto" });
};
