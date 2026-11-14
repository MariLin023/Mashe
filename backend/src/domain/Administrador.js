import { Usuario } from "./Usuario.js";

const PERMISOS = Object.freeze([
    "consultar_catalogo",
    "gestionar_productos",
    "gestionar_inventario",
    "gestionar_pedidos"
]);

// HERENCIA: un Administrador ES un Usuario, pero con otros permisos
export class Administrador extends Usuario {
    constructor(datos) {
        super({ ...datos, rol: "administrador" });
    }

    permisos() {
        return PERMISOS;
    }
}
