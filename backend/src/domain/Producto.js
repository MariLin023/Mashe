import { ErrorValidacion, ErrorStock } from "./errores.js";

export const CATEGORIAS = Object.freeze(["arte", "oficina", "escolares"]);

// ENCAPSULAMIENTO: precio y stock son privados. Nadie puede hacer `producto.stock = -5`;
// solo se cambian con métodos que validan la regla (el stock nunca baja de cero).
export class Producto {
    #precio = 0;
    #stock = 0;

    constructor({ id, nombre, precio, categoria, tipo, marca, stock = 0, destacado = false,
                  imagen = "", descripcion = "", especificaciones = [] }) {
        this.id = id;
        this.actualizarFicha({ nombre, categoria, tipo, marca, destacado, imagen, descripcion, especificaciones });
        this.actualizarPrecio(precio);
        this.establecerStock(stock);
    }

    get precio() { return this.#precio; }
    get stock() { return this.#stock; }

    // Datos descriptivos (se validan al crear y al editar)
    actualizarFicha({ nombre, categoria, tipo, marca, destacado, imagen, descripcion, especificaciones }) {
        const pedir = (valor, mensaje) => {
            if (!String(valor ?? "").trim()) throw new ErrorValidacion(mensaje);
            return String(valor).trim();
        };
        if (nombre !== undefined || this.nombre === undefined) this.nombre = pedir(nombre, "El nombre del producto es obligatorio");
        if (tipo !== undefined || this.tipo === undefined) this.tipo = pedir(tipo, "El tipo del producto es obligatorio");
        if (marca !== undefined || this.marca === undefined) this.marca = pedir(marca, "La marca del producto es obligatoria");
        if (categoria !== undefined || this.categoria === undefined) {
            if (!CATEGORIAS.includes(categoria)) throw new ErrorValidacion("Categoría inválida");
            this.categoria = categoria;
        }
        if (destacado !== undefined) this.destacado = Boolean(destacado);
        else this.destacado ??= false;
        if (imagen !== undefined) this.imagen = String(imagen);
        else this.imagen ??= "";
        if (descripcion !== undefined) this.descripcion = String(descripcion);
        else this.descripcion ??= "";
        if (especificaciones !== undefined) this.especificaciones = especificaciones.map((e) => ({ label: e.label, value: e.value }));
        else this.especificaciones ??= [];
    }

    actualizarPrecio(nuevoPrecio) {
        if (typeof nuevoPrecio !== "number" || !Number.isFinite(nuevoPrecio) || nuevoPrecio < 0) {
            throw new ErrorValidacion("El precio debe ser un número positivo");
        }
        this.#precio = nuevoPrecio;
    }

    establecerStock(cantidad) {
        if (!Number.isInteger(cantidad) || cantidad < 0) {
            throw new ErrorValidacion("El stock no puede ser negativo");
        }
        this.#stock = cantidad;
    }

    // delta positivo = entra inventario, negativo = sale
    actualizarStock(delta) {
        if (!Number.isInteger(delta)) throw new ErrorValidacion("La cantidad debe ser un número entero");
        if (this.#stock + delta < 0) throw new ErrorStock("Stock insuficiente");
        this.#stock += delta;
    }

    verificarDisponibilidad(cantidad = 1) {
        return Number.isInteger(cantidad) && cantidad > 0 && this.#stock >= cantidad;
    }

    estaAgotado() {
        return this.#stock === 0;
    }

    reservar(cantidad) {
        if (!this.verificarDisponibilidad(cantidad)) {
            throw new ErrorStock(`No hay suficientes unidades de ${this.nombre}. Revisa tu carrito.`);
        }
        this.#stock -= cantidad;
    }

    devolver(cantidad) {
        this.actualizarStock(cantidad);
    }

    // Forma que consume el frontend
    toJSON() {
        return {
            id: this.id, name: this.nombre, price: this.#precio, cat: this.categoria, type: this.tipo,
            brand: this.marca, stock: this.#stock, best: this.destacado, image: this.imagen,
            desc: this.descripcion, specs: this.especificaciones
        };
    }
}
