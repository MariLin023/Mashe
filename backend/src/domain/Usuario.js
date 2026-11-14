import bcrypt from "bcrypt";
import { ErrorValidacion } from "./errores.js";

const EMAIL = /^\S+@\S+\.\S+$/;

// Clase ABSTRACTA: no se puede hacer `new Usuario(...)`, solo Cliente o Administrador.
// Los datos son privados (#): desde fuera solo se leen con getters y se cambian con métodos.
export class Usuario {
    #id;
    #nombre;
    #correo;
    #rol;
    #contrasenaHash;

    constructor({ id = null, nombre, correo, contrasenaHash = null, rol }) {
        if (new.target === Usuario) {
            throw new TypeError("Usuario es abstracta: usa Cliente o Administrador");
        }
        if (!String(nombre ?? "").trim()) throw new ErrorValidacion("El nombre es obligatorio");
        if (!EMAIL.test(String(correo ?? "").trim())) throw new ErrorValidacion("Escribe un correo válido");

        this.#id = id === null ? null : String(id);
        this.#nombre = nombre.trim();
        this.#correo = correo.trim().toLowerCase();
        this.#rol = rol;
        this.#contrasenaHash = contrasenaHash;
    }

    get id() { return this.#id; }
    get nombre() { return this.#nombre; }
    get correo() { return this.#correo; }
    get rol() { return this.#rol; }

    // ---- Reglas de la contraseña ----
    static validarContrasena(plano) {
        if (typeof plano !== "string" || plano.length < 6 || plano.length > 50) {
            throw new ErrorValidacion("La contraseña debe tener entre 6 y 50 caracteres");
        }
    }

    static async crearHash(plano) {
        Usuario.validarContrasena(plano);
        return bcrypt.hash(plano, 10);
    }

    async iniciarSesion(contrasena) {
        if (!this.#contrasenaHash || typeof contrasena !== "string") return false;
        return bcrypt.compare(contrasena, this.#contrasenaHash);
    }

    // ---- Método ABSTRACTO: cada subclase lo implementa a su manera (polimorfismo) ----
    permisos() {
        throw new Error("Cada tipo de usuario define sus permisos");
    }

    puede(accion) {
        return this.permisos().includes(accion);
    }

    // ---- Salidas controladas: así el hash nunca se escapa por accidente ----
    aPublico() {
        return { id: this.#id, name: this.#nombre, email: this.#correo, role: this.#rol };
    }

    datosParaGuardar() {
        return { nombre: this.#nombre, correo: this.#correo, contrasenaHash: this.#contrasenaHash, rol: this.#rol };
    }
}
