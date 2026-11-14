import { Order } from "../models/order.model.js";
import { Pedido, DetallePedido } from "../domain/Pedido.js";
import { DatosEntrega } from "../domain/DatosEntrega.js";
import { Pago } from "../domain/MetodoPago.js";

const aDominio = (doc) => new Pedido({
    codigo: doc.code,
    clienteId: doc.user ? String(doc.user) : null,
    datosEntrega: DatosEntrega.desde(doc.customer),
    detalles: doc.items.map((i) => new DetallePedido({
        idProducto: i.productId, nombre: i.name, precioUnitario: i.price, cantidad: i.qty
    })),
    envio: doc.shipping,
    pago: new Pago({ metodo: doc.payment.method, estado: doc.payment.status, monto: doc.total, fecha: doc.createdAt }),
    estado: doc.status,
    fecha: doc.createdAt
});

export class PedidoRepository {
    async guardar(pedido) {
        await Order.create({
            code: pedido.codigo,
            user: pedido.clienteId,
            customer: pedido.datosEntrega.aJSON(),
            items: pedido.detalles.map((d) => ({
                productId: d.idProducto, name: d.nombre, price: d.precioUnitario, qty: d.cantidad
            })),
            subtotal: pedido.calcularSubtotal(),
            shipping: pedido.calcularEnvio(),
            total: pedido.calcularTotal(),
            payment: { method: pedido.pago.metodo, status: pedido.pago.estado },
            status: pedido.estado
        });
    }

    async guardarEstado(pedido) {
        await Order.updateOne({ code: pedido.codigo }, { status: pedido.estado });
    }

    async buscarPorCodigo(codigo) {
        const doc = await Order.findOne({ code: codigo }).lean();
        return doc ? aDominio(doc) : null;
    }

    async buscarPorCodigoYCliente(codigo, clienteId) {
        const doc = await Order.findOne({ code: codigo, user: clienteId }).lean();
        return doc ? aDominio(doc) : null;
    }

    async buscarPorCliente(clienteId) {
        const docs = await Order.find({ user: clienteId }).sort({ createdAt: -1 }).lean();
        return docs.map(aDominio);
    }

    async buscarTodos() {
        const docs = await Order.find().sort({ createdAt: -1 }).lean();
        return docs.map(aDominio);
    }
}
