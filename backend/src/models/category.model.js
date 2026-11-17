import mongoose, { Schema } from "mongoose";

const categorySchema = new Schema(
    {
        key: { type: String, required: true, unique: true, trim: true, lowercase: true }, // arte, oficina...
        name: { type: String, required: true, trim: true },
        description: { type: String, default: "" }
    },
    { timestamps: true }
);

export const Category = mongoose.model("Category", categorySchema);
