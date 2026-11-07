import mongoose, { Schema } from "mongoose";

const userSchema = new Schema(
    {
        name: {
            type: String,
            required: true,
            trim: true,
            minLength: 1,
            maxLength: 60
        },

        email: {
            type: String,
            required: true,
            unique: true,
            lowercase: true,
            trim: true
        },

        // Aquí se guarda el HASH de bcrypt (60 caracteres), nunca la contraseña real.
        // El largo de la contraseña (6 a 50) se valida en el controlador, antes de encriptar.
        password: {
            type: String,
            required: true,
            select: false
        },

        // Especialización del diagrama de clases: Usuario -> Cliente / Administrador
        role: {
            type: String,
            enum: ["cliente", "administrador"],
            default: "cliente"
        }
    },
    {
        timestamps: true
    }
);

export const User = mongoose.model("User", userSchema);
