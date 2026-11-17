import { ErrorValidacion, ErrorConflicto } from "./errores.js";

const CLAVE = /^[a-z0-9]+(-[a-z0-9]+)*$/;

export class Categoria {
    #clave;
    #nombre;
    #descripcion;

    // La "clave" (arte, oficina, utiles-escolares) identifica la categoría y NO cambia:
    // los productos la usan para referirse a ella.
    constructor({ clave, nombre, descripcion = "" }) {
        this.#nombre = Categoria.#validarNombre(nombre);
        this.#descripcion = Categoria.#validarDescripcion(descripcion);
        this.#clave = clave ?? Categoria.crearClave(this.#nombre);
        if (!CLAVE.test(this.#clave)) throw new ErrorValidacion("El nombre de la categoría debe tener letras o números");
    }

    get clave() { return this.#clave; }
    get nombre() { return this.#nombre; }
    get descripcion() { return this.#descripcion; }

    // "Útiles Escolares" -> "utiles-escolares"
    static crearClave(nombre) {
        return String(nombre ?? "")
            .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, "-")
            .replace(/^-+|-+$/g, "");
    }

    static #validarNombre(nombre) {
        const n = String(nombre ?? "").trim();
        if (n.length < 2 || n.length > 40) throw new ErrorValidacion("El nombre de la categoría debe tener entre 2 y 40 caracteres");
        return n;
    }

    static #validarDescripcion(descripcion) {
        const d = String(descripcion ?? "").trim();
        if (d.length > 200) throw new ErrorValidacion("La descripción no puede pasar de 200 caracteres");
        return d;
    }

    editar({ nombre, descripcion }) {
        if (nombre !== undefined) this.#nombre = Categoria.#validarNombre(nombre);
        if (descripcion !== undefined) this.#descripcion = Categoria.#validarDescripcion(descripcion);
    }

    // Regla del diseño: una categoría con productos no se puede eliminar
    verificarEliminable(cantidadProductos) {
        if (cantidadProductos > 0) {
            throw new ErrorConflicto(
                `No puedes eliminar "${this.#nombre}": tiene ${cantidadProductos} producto(s). Muévelos a otra categoría primero.`
            );
        }
    }

    toJSON() {
        return { key: this.#clave, name: this.#nombre, description: this.#descripcion };
    }
}
