import crypto from "node:crypto";
import { Product } from "../models/product.model.js";
import { Order } from "../models/order.model.js";

// Estas dos reglas viven en el servidor: el frontend las muestra, pero NO decide el precio final.
const SHIPPING_FEE = 9000;
const FREE_SHIPPING_FROM = 150000;
const PAY_METHODS = ["tarjeta", "pse", "contraentrega"];

const shippingFor = (subtotal) => (subtotal >= FREE_SHIPPING_FROM ? 0 : SHIPPING_FEE);

// Forma que espera el frontend (la misma del objeto "order" que antes se armaba en app.js)
const toClient = (o) => ({
    id: o.code,
    date: o.createdAt,
    customer: o.customer,
    pay: o.payment.method,
    paymentStatus: o.payment.status,
    status: o.status,
    items: o.items.map((i) => ({ id: i.productId, name: i.name, price: i.price, qty: i.qty })),
    subtotal: o.subtotal,
    shipping: o.shipping,
    total: o.total
});

// Descuenta el stock producto por producto. La condición "stock >= qty" va DENTRO de la consulta,
// así dos clientes comprando lo último al mismo tiempo no pueden dejar el stock en negativo.
const releaseStock = (lines) =>
    Promise.all(lines.map((l) => Product.updateOne({ id: l.productId }, { $inc: { stock: l.qty } })));

async function reserveStock(lines) {
    const reserved = [];
    for (const line of lines) {
        const result = await Product.updateOne(
            { id: line.productId, stock: { $gte: line.qty } },
            { $inc: { stock: -line.qty } }
        );
        if (result.modifiedCount === 0) {
            await releaseStock(reserved); // devuelve lo que ya había descontado
            return line; // esta línea fue la que no alcanzó
        }
        reserved.push(line);
    }
    return null;
}

const createOrder = async (req, res) => {
    const { items, customer = {}, pay, simulateReject } = req.body ?? {};

    // ---- 1. Validar lo que llega ----
    if (!Array.isArray(items) || items.length === 0) {
        return res.status(400).json({ message: "Tu carrito está vacío" });
    }
    if (!PAY_METHODS.includes(pay)) {
        return res.status(400).json({ message: "Elige un método de pago válido" });
    }
    const c = {
        name: String(customer.name ?? "").trim(),
        email: String(customer.email ?? "").trim(),
        phone: String(customer.phone ?? "").trim(),
        address: String(customer.address ?? "").trim(),
        city: String(customer.city ?? "").trim(),
        notes: String(customer.notes ?? "").trim()
    };
    if (!c.name) return res.status(400).json({ message: "Escribe tu nombre completo" });
    if (!/^\S+@\S+\.\S+$/.test(c.email)) return res.status(400).json({ message: "Escribe un correo válido" });
    if (c.phone.replace(/\D/g, "").length < 7) return res.status(400).json({ message: "Escribe un teléfono válido" });
    if (!c.address) return res.status(400).json({ message: "Escribe la dirección de entrega" });
    if (!c.city) return res.status(400).json({ message: "Escribe la ciudad" });

    // Junta productos repetidos y revisa que id y cantidad sean enteros válidos
    const qtyById = new Map();
    for (const it of items) {
        const id = Number(it.id);
        const qty = Number(it.qty);
        if (!Number.isInteger(id) || !Number.isInteger(qty) || qty < 1) {
            return res.status(400).json({ message: "Hay un producto con datos inválidos en el carrito" });
        }
        qtyById.set(id, (qtyById.get(id) || 0) + qty);
    }

    // ---- 2. Precios y nombres salen de la BD, nunca del cliente ----
    const ids = [...qtyById.keys()];
    const products = await Product.find({ id: { $in: ids } });
    if (products.length !== ids.length) {
        return res.status(400).json({ message: "Uno de los productos ya no existe" });
    }
    const lines = products.map((p) => ({
        product: p._id,
        productId: p.id,
        name: p.name,
        price: p.price,
        qty: qtyById.get(p.id)
    }));
    const subtotal = lines.reduce((sum, l) => sum + l.price * l.qty, 0);
    const shipping = shippingFor(subtotal);

    // ---- 3. Regla de negocio: el inventario se descuenta al crear el pedido (se "reserva") ----
    const failed = await reserveStock(lines);
    if (failed) {
        return res.status(409).json({
            message: `No hay suficientes unidades de ${failed.name}. Revisa tu carrito.`
        });
    }

    // ---- 4. Pago simulado ----
    // contraentrega: queda pendiente hasta que se entregue. tarjeta/PSE: se aprueba, salvo que
    // se pida simular un rechazo (solo fuera de producción, para probar esta regla).
    const canReject = process.env.NODE_ENV !== "production" && simulateReject === true;
    const paymentStatus = pay === "contraentrega" ? "pendiente" : canReject ? "rechazado" : "aprobado";

    if (paymentStatus === "rechazado") {
        await releaseStock(lines); // pago rechazado -> el stock vuelve a estar disponible
        return res.status(402).json({ message: "El pago fue rechazado. Intenta con otro método." });
    }

    // ---- 5. Guardar el pedido ----
    let order;
    try {
        order = await Order.create({
            code: "M" + crypto.randomInt(10000000, 100000000),
            user: req.user?.id ?? null,
            customer: c,
            items: lines,
            subtotal,
            shipping,
            total: subtotal + shipping,
            payment: { method: pay, status: paymentStatus },
            status: paymentStatus === "aprobado" ? "pagado" : "pendiente"
        });
    } catch (error) {
        await releaseStock(lines); // si falló guardar, no dejamos stock "perdido"
        throw error;
    }

    res.status(201).json({ message: "Pedido recibido", order: toClient(order) });
};

// Historial del cliente que inició sesión
const myOrders = async (req, res) => {
    const orders = await Order.find({ user: req.user.id }).sort({ createdAt: -1 });
    res.json({ orders: orders.map(toClient) });
};

// Cancelar: solo el dueño y solo si todavía no se envió. Devuelve el stock.
const cancelOrder = async (req, res) => {
    const order = await Order.findOne({ code: req.params.code, user: req.user.id });
    if (!order) return res.status(404).json({ message: "Pedido no encontrado" });
    if (!["pendiente", "pagado"].includes(order.status)) {
        return res.status(409).json({ message: "Este pedido ya no se puede cancelar" });
    }

    order.status = "cancelado";
    await order.save();
    await releaseStock(order.items);

    res.json({ message: "Pedido cancelado", order: toClient(order) });
};

export { createOrder, myOrders, cancelOrder };
