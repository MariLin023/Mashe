import { Carrito } from "../domain/Carrito.js";
import { DatosEntrega } from "../domain/DatosEntrega.js";
import { MetodoPago } from "../domain/MetodoPago.js";
import { Pedido } from "../domain/Pedido.js";
import { ErrorNoEncontrado, ErrorPagoRechazado, ErrorValidacion } from "../domain/errores.js";

export class PedidoService {
    constructor(productos, pedidos) {
        this.productos = productos;
        this.pedidos = pedidos;
    }

    // Caso de uso: comprar. Los pasos son los del diagrama de secuencia de la compra.
    async crearPedido({ items, customer, pay, usuario = null, simularRechazo = false }) {
        if (!Array.isArray(items) || items.length === 0) throw new ErrorValidacion("Tu carrito está vacío");
        const metodoPago = MetodoPago.crear(pay);
        const datosEntrega = DatosEntrega.desde(customer);

        // 1. Junta repetidos y revisa id/cantidad
        const cantidades = new Map();
        for (const it of items) {
            const id = Number(it.id);
            const qty = Number(it.qty);
            if (!Number.isInteger(id) || !Number.isInteger(qty) || qty < 1) {
                throw new ErrorValidacion("Hay un producto con datos inválidos en el carrito");
            }
            cantidades.set(id, (cantidades.get(id) || 0) + qty);
        }

        // 2. Precios y nombres salen de la BD, nunca del navegador
        const productos = await this.productos.buscarPorIds([...cantidades.keys()]);
        if (productos.length !== cantidades.size) throw new ErrorValidacion("Uno de los productos ya no existe");

        // 3. El Carrito valida la disponibilidad y el Pedido calcula subtotal, envío y total
        const carrito = new Carrito();
        for (const producto of productos) carrito.agregarProducto(producto, cantidades.get(producto.id));
        const pedido = Pedido.desdeCarrito({ clienteId: usuario?.id ?? null, datosEntrega, carrito });

        // 4. Regla de negocio: el inventario se descuenta al crear el pedido (se "reserva")
        await this.productos.reservarStock(pedido.detalles);

        let reservado = true;
        const liberar = async () => {
            if (!reservado) return;
            reservado = false;
            await this.productos.devolverStock(pedido.detalles);
        };

        try {
            // 5. POLIMORFISMO: no importa si es tarjeta, PSE o contra entrega, se llama igual
            const pago = metodoPago.procesar(pedido.calcularTotal(), { simularRechazo });
            if (pago.estado === "rechazado") throw new ErrorPagoRechazado();

            pedido.asignarPago(pago);
            await this.pedidos.guardar(pedido);
        } catch (error) {
            await liberar(); // pago rechazado o fallo al guardar: el stock vuelve a estar disponible
            throw error;
        }
        return pedido;
    }

    misPedidos(usuario) {
        return this.pedidos.buscarPorCliente(usuario.id);
    }

    // El cliente solo puede cancelar SUS pedidos
    async cancelar({ codigo, usuario }) {
        const pedido = await this.pedidos.buscarPorCodigoYCliente(codigo, usuario.id);
        if (!pedido) throw new ErrorNoEncontrado("Pedido no encontrado");
        return this.#cancelarYDevolverStock(pedido);
    }

    // ---- Administrador ----
    listarTodos() {
        return this.pedidos.buscarTodos();
    }

    async cambiarEstado({ codigo, estado }) {
        const pedido = await this.pedidos.buscarPorCodigo(codigo);
        if (!pedido) throw new ErrorNoEncontrado("Pedido no encontrado");
        if (estado === "cancelado") return this.#cancelarYDevolverStock(pedido);

        pedido.actualizarEstado(estado); // la clase Pedido decide si la transición es válida
        await this.pedidos.guardarEstado(pedido);
        return pedido;
    }

    async #cancelarYDevolverStock(pedido) {
        pedido.cancelar();
        await this.pedidos.guardarEstado(pedido);
        await this.productos.devolverStock(pedido.detalles);
        return pedido;
    }
}
