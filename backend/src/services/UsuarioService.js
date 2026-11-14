import jwt from "jsonwebtoken";
import { Cliente } from "../domain/Cliente.js";
import { Usuario } from "../domain/Usuario.js";
import { ErrorConflicto, ErrorNoAutenticado, ErrorNoEncontrado, ErrorValidacion } from "../domain/errores.js";

// SERVICIO: orquesta un caso de uso (registrar, iniciar sesión). Las reglas viven en las
// clases del dominio; la base de datos se pide al repositorio que recibe por constructor.
export class UsuarioService {
    constructor(usuarios) {
        this.usuarios = usuarios;
    }

    #crearToken(usuario) {
        return jwt.sign(
            { id: usuario.id, nombre: usuario.nombre, correo: usuario.correo, rol: usuario.rol },
            process.env.JWT_SECRET,
            { expiresIn: process.env.JWT_EXPIRES_IN || "7d" }
        );
    }

    async registrar({ name, email, password }) {
        if (!name?.trim() || !email?.trim() || !password) {
            throw new ErrorValidacion("Nombre, correo y contraseña son obligatorios");
        }
        Usuario.validarContrasena(password);
        const hash = await Usuario.crearHash(password);

        // Todo el que se registra es Cliente: el rol NO se toma de lo que mande el navegador
        const nuevo = new Cliente({ nombre: name, correo: email, contrasenaHash: hash });

        if (await this.usuarios.buscarPorCorreo(nuevo.correo)) {
            throw new ErrorConflicto("Ya existe una cuenta con ese correo");
        }
        const usuario = await this.usuarios.crear(nuevo);
        return { usuario, token: this.#crearToken(usuario) };
    }

    async iniciarSesion({ email, password }) {
        if (!email?.trim() || !password) throw new ErrorValidacion("Escribe tu correo y tu contraseña");

        const usuario = await this.usuarios.buscarPorCorreo(email);
        // Mismo mensaje para "no existe" y "clave mala": no se revela qué correos están registrados
        if (!usuario || !(await usuario.iniciarSesion(password))) {
            throw new ErrorNoAutenticado("Correo o contraseña incorrectos");
        }
        return { usuario, token: this.#crearToken(usuario) };
    }

    async obtener(id) {
        const usuario = await this.usuarios.buscarPorId(id);
        if (!usuario) throw new ErrorNoEncontrado("Usuario no encontrado");
        return usuario;
    }
}
