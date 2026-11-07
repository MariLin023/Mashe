import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { User } from "../models/user.model.js";

const EMAIL_REGEX = /^\S+@\S+\.\S+$/;

const signToken = (user) =>
    jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, {
        expiresIn: process.env.JWT_EXPIRES_IN || "7d"
    });

const publicUser = (user) => ({ id: user._id, name: user.name, email: user.email, role: user.role });

const registerUser = async (req, res) => {
    const { name, email, password } = req.body ?? {};

    if (!name?.trim() || !email?.trim() || !password) {
        return res.status(400).json({ message: "Nombre, correo y contraseña son obligatorios" });
    }
    if (!EMAIL_REGEX.test(email.trim())) {
        return res.status(400).json({ message: "Escribe un correo válido" });
    }
    if (password.length < 6 || password.length > 50) {
        return res.status(400).json({ message: "La contraseña debe tener entre 6 y 50 caracteres" });
    }

    const existing = await User.findOne({ email: email.trim().toLowerCase() });
    if (existing) {
        return res.status(409).json({ message: "Ya existe una cuenta con ese correo" });
    }

    const hash = await bcrypt.hash(password, 10);
    // El rol NO se toma del body: todo el que se registra es "cliente"
    const user = await User.create({ name: name.trim(), email: email.trim(), password: hash });

    res.status(201).json({ message: "Usuario registrado", token: signToken(user), user: publicUser(user) });
};

const loginUser = async (req, res) => {
    const { email, password } = req.body ?? {};

    if (!email?.trim() || !password) {
        return res.status(400).json({ message: "Escribe tu correo y tu contraseña" });
    }

    const user = await User.findOne({ email: email.trim().toLowerCase() }).select("+password");
    const ok = user && (await bcrypt.compare(password, user.password));
    if (!ok) {
        // Mismo mensaje para "no existe" y "clave mala": así no se revela qué correos están registrados
        return res.status(401).json({ message: "Correo o contraseña incorrectos" });
    }

    res.json({ message: "Sesión iniciada", token: signToken(user), user: publicUser(user) });
};

const getMe = async (req, res) => {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ message: "Usuario no encontrado" });
    res.json({ user: publicUser(user) });
};

export { registerUser, loginUser, getMe };
