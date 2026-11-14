import crypto from "node:crypto";
import { ErrorValidacion, ErrorConflicto } from "./errores.js";

export const ESTADOS = Object.freeze(["pendiente", "pagado", "enviado", "entregado", "cancelado"]);

// Estados a los que se puede pasar desde cada estado (la cancelación va aparte, con cancelar())
const TRANSICIONES = Object.freeze({
    pendiente: ["pagado", "enviado"],
    pagado: ["enviado"],
    enviado: ["entregado"],
    entregado: [],
    cancelado: []
});

export class DetallePedido {
    constructor({ idProducto, nombre, precioUnitario, cantidad }) {
        if (!Number.isInteger(cantidad) || cantidad < 1) throw new ErrorValidacion("Cantidad inválida");
        this.idProducto = idProducto;
        this.nombre = nombre;
        this.precioUnitario = precioUnitario; // precio del momento: no cambia si el producto sube
        this.cantidad = cantidad;
    }

    calcularSubtotal() {
        return this.precioUnitario * this.cantidad;
    }
}

export class Pedido {
    static COSTO_ENVIO = 9000;
    static ENVIO_GRATIS_DESDE = 150000;

    #estado;
    #envio;

    constructor({ codigo, clienteId = null, datosEntrega, detalles, envio, pago = null,
                  estado = "pendiente", fecha = new Date() }) {
        if (!detalles?.length) throw new ErrorValidacion("Tu carrito está vacío");
        this.codigo = codigo;
        this.clienteId = clienteId; // null = compra como invitado
        this.datosEntrega = datosEntrega;
        this.detalles = detalles;
        this.pago = pago;
        this.fecha = fecha;
        this.#estado = estado;
        // el envío se "congela" al crear el pedido (así un cambio de tarifa no altera pedidos viejos)
        this.#envio = envio ?? Pedido.envioPara(this.calcularSubtotal());
    }

    get estado() { return this.#estado; }

    static envioPara(subtotal) {
        return subtotal >= Pedido.ENVIO_GRATIS_DESDE ? 0 : Pedido.COSTO_ENVIO;
    }

    static generarCodigo() {
        return "M" + crypto.randomInt(10000000, 100000000);
    }

    // El pedido se construye A PARTIR DEL CARRITO (como en el diseño del profe)
    static desdeCarrito({ clienteId, datosEntrega, carrito }) {
        if (carrito.estaVacio()) throw new ErrorValidacion("Tu carrito está vacío");
        const detalles = carrito.detalles.map((d) => new DetallePedido({
            idProducto: d.producto.id,
            nombre: d.producto.nombre,
            precioUnitario: d.precioUnitario,
            cantidad: d.cantidad
        }));
        return new Pedido({ codigo: Pedido.generarCodigo(), clienteId, datosEntrega, detalles });
    }

    calcularSubtotal() {
        return this.detalles.reduce((suma, d) => suma + d.calcularSubtotal(), 0);
    }

    calcularEnvio() { return this.#envio; }

    calcularTotal() {
        return this.calcularSubtotal() + this.#envio;
    }

    asignarPago(pago) {
        this.pago = pago;
        if (pago.estado === "aprobado") this.actualizarEstado("pagado");
    }

    actualizarEstado(nuevoEstado) {
        if (nuevoEstado === "cancelado") throw new ErrorValidacion("Para cancelar usa cancelar()");
        if (!ESTADOS.includes(nuevoEstado)) throw new ErrorValidacion("Estado de pedido no permitido");
        if (!TRANSICIONES[this.#estado].includes(nuevoEstado)) {
            throw new ErrorConflicto(`Un pedido ${this.#estado} no puede pasar a ${nuevoEstado}`);
        }
        this.#estado = nuevoEstado;
    }

    puedeCancelarse() {
        return this.#estado === "pendiente" || this.#estado === "pagado";
    }

    cancelar() {
        if (!this.puedeCancelarse()) throw new ErrorConflicto("Este pedido ya no se puede cancelar");
        this.#estado = "cancelado";
    }

    // Forma que consume el frontend
    toJSON() {
        return {
            id: this.codigo,
            date: this.fecha,
            customer: this.datosEntrega.aJSON(),
            pay: this.pago?.metodo,
            paymentStatus: this.pago?.estado,
            status: this.#estado,
            items: this.detalles.map((d) => ({ id: d.idProducto, name: d.nombre, price: d.precioUnitario, qty: d.cantidad })),
            subtotal: this.calcularSubtotal(),
            shipping: this.#envio,
            total: this.calcularTotal()
        };
    }
}
