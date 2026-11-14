import { Usuario } from "./Usuario.js";

const PERMISOS = Object.freeze([
    "consultar_catalogo",
    "gestionar_carrito",
    "crear_pedido",
    "consultar_pedidos",
    "cancelar_pedido"
]);

// HERENCIA: un Cliente ES un Usuario
export class Cliente extends Usuario {
    constructor(datos) {
        super({ ...datos, rol: "cliente" });
    }

    permisos() {
        return PERMISOS;
    }
}
