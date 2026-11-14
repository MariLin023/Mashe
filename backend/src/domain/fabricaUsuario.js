import { Cliente } from "./Cliente.js";
import { Administrador } from "./Administrador.js";
import { ErrorValidacion } from "./errores.js";

// Fábrica: a partir del rol guardado en la BD o en el token, devuelve el objeto de la clase correcta.
export function crearUsuario(datos) {
    switch (datos.rol) {
        case "cliente": return new Cliente(datos);
        case "administrador": return new Administrador(datos);
        default: throw new ErrorValidacion("Rol de usuario desconocido");
    }
}
