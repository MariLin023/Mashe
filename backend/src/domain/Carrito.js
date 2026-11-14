import { ErrorValidacion, ErrorNoEncontrado, ErrorStock } from "./errores.js";

const cantidadValida = (n) => {
    if (!Number.isInteger(n) || n < 1) throw new ErrorValidacion("Cantidad inválida");
    return n;
};

// COMPOSICIÓN: un DetalleCarrito no existe fuera de un Carrito
export class DetalleCarrito {
    #cantidad;

    constructor(producto, cantidad) {
        this.producto = producto;
        this.precioUnitario = producto.precio; // "foto" del precio al agregarlo
        this.cantidad = cantidad;
    }

    get cantidad() { return this.#cantidad; }
    set cantidad(valor) { this.#cantidad = cantidadValida(valor); }

    calcularSubtotal() {
        return this.precioUnitario * this.#cantidad;
    }
}

export class Carrito {
    #detalles = new Map(); // idProducto -> DetalleCarrito

    get detalles() { return [...this.#detalles.values()]; }

    estaVacio() { return this.#detalles.size === 0; }

    agregarProducto(producto, cantidad) {
        cantidadValida(cantidad);
        const existente = this.#detalles.get(producto.id);
        const total = cantidad + (existente ? existente.cantidad : 0);

        if (!producto.verificarDisponibilidad(total)) {
            throw new ErrorStock(`No hay suficientes unidades de ${producto.nombre}. Revisa tu carrito.`);
        }
        if (existente) {
            existente.cantidad = total;
            existente.precioUnitario = producto.precio;
        } else {
            this.#detalles.set(producto.id, new DetalleCarrito(producto, cantidad));
        }
    }

    modificarCantidad(idProducto, cantidad) {
        const detalle = this.#detalles.get(idProducto);
        if (!detalle) throw new ErrorNoEncontrado("Producto fuera del carrito");
        if (cantidad === 0) { this.eliminarProducto(idProducto); return; }
        cantidadValida(cantidad);
        if (!detalle.producto.verificarDisponibilidad(cantidad)) {
            throw new ErrorStock(`Stock insuficiente de ${detalle.producto.nombre}`);
        }
        detalle.cantidad = cantidad;
    }

    eliminarProducto(idProducto) {
        this.#detalles.delete(idProducto);
    }

    calcularSubtotal() {
        return this.detalles.reduce((suma, d) => suma + d.calcularSubtotal(), 0);
    }

    vaciar() {
        this.#detalles.clear();
    }
}
