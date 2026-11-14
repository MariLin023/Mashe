import mongoose, { Schema } from "mongoose";

// DetallePedido: se guarda dentro del pedido con una "foto" del nombre y el precio del momento,
// así el pedido no cambia si después el producto sube de precio.
const orderItemSchema = new Schema(
    {
        productId: { type: Number, required: true },
        name: { type: String, required: true },
        price: { type: Number, required: true, min: 0 },
        qty: { type: Number, required: true, min: 1 }
    },
    { _id: false }
);

const orderSchema = new Schema(
    {
        code: { type: String, required: true, unique: true }, // lo que ve el cliente: M12345678
        user: { type: Schema.Types.ObjectId, ref: "User", default: null }, // null = compra como invitado

        customer: {
            name: { type: String, required: true },
            email: { type: String, required: true },
            phone: { type: String, required: true },
            address: { type: String, required: true },
            city: { type: String, required: true },
            notes: { type: String, default: "" }
        },

        items: { type: [orderItemSchema], required: true },
        subtotal: { type: Number, required: true },
        shipping: { type: Number, required: true },
        total: { type: Number, required: true },

        // Pago (simulado)
        payment: {
            method: { type: String, enum: ["tarjeta", "pse", "contraentrega"], required: true },
            status: { type: String, enum: ["pendiente", "aprobado", "rechazado"], required: true }
        },

        // Estados del pedido
        status: {
            type: String,
            enum: ["pendiente", "pagado", "enviado", "entregado", "cancelado"],
            default: "pendiente"
        }
    },
    { timestamps: true }
);

export const Order = mongoose.model("Order", orderSchema);
