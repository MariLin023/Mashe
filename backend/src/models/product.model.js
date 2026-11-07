import mongoose, { Schema } from "mongoose";

const productSchema = new Schema(
    {
        // Número que ya usa el frontend (1, 2, 3 ... 35) para armar las rutas #/producto/1
        id: { type: Number, required: true, unique: true },
        name: { type: String, required: true, trim: true },
        price: { type: Number, required: true, min: 0 },
        cat: { type: String, required: true, enum: ["arte", "oficina", "escolares"] },
        type: { type: String, required: true, trim: true },
        brand: { type: String, required: true, trim: true },
        stock: { type: Number, required: true, min: 0, default: 0 },
        best: { type: Boolean, default: false },
        image: { type: String, default: "" },
        desc: { type: String, default: "" },
        specs: [{ _id: false, label: String, value: String }]
    },
    {
        timestamps: true,
        toJSON: {
            transform: (_doc, ret) => {
                delete ret._id;
                delete ret.__v;
                return ret;
            }
        }
    }
);

export const Product = mongoose.model("Product", productSchema);
