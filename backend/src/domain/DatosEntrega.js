import { ErrorValidacion } from "./errores.js";

// Objeto de valor: datos de quien recibe. Se valida al crearlo y no cambia después.
export class DatosEntrega {
    constructor({ nombre, correo, telefono, direccion, ciudad, notas = "" }) {
        const texto = (v) => String(v ?? "").trim();
        this.nombre = texto(nombre);
        this.correo = texto(correo);
        this.telefono = texto(telefono);
        this.direccion = texto(direccion);
        this.ciudad = texto(ciudad);
        this.notas = texto(notas);

        if (!this.nombre) throw new ErrorValidacion("Escribe tu nombre completo");
        if (!/^\S+@\S+\.\S+$/.test(this.correo)) throw new ErrorValidacion("Escribe un correo válido");
        if (this.telefono.replace(/\D/g, "").length < 7) throw new ErrorValidacion("Escribe un teléfono válido");
        if (!this.direccion) throw new ErrorValidacion("Escribe la dirección de entrega");
        if (!this.ciudad) throw new ErrorValidacion("Escribe la ciudad");
        Object.freeze(this);
    }

    // Convierte desde/hacia la forma que usan el frontend y la BD
    static desde(c = {}) {
        return new DatosEntrega({
            nombre: c.name, correo: c.email, telefono: c.phone,
            direccion: c.address, ciudad: c.city, notas: c.notes
        });
    }

    aJSON() {
        return {
            name: this.nombre, email: this.correo, phone: this.telefono,
            address: this.direccion, city: this.ciudad, notes: this.notas
        };
    }
}
