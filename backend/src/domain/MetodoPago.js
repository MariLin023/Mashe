import { ErrorValidacion } from "./errores.js";

// Resultado de un pago (simulado)
export class Pago {
    constructor({ metodo, estado, monto, fecha = new Date() }) {
        this.metodo = metodo;
        this.estado = estado; // pendiente | aprobado | rechazado
        this.monto = monto;
        this.fecha = fecha;
    }
}

// ABSTRACCIÓN: define QUÉ hace un método de pago, sin decir CÓMO.
export class MetodoPago {
    constructor() {
        if (new.target === MetodoPago) throw new TypeError("MetodoPago es abstracta");
    }

    get nombre() { throw new Error("La subclase debe definir su nombre"); }

    procesar(_monto, _opciones) { throw new Error("La subclase debe implementar procesar()"); }

    // Fábrica: de un texto ("tarjeta") al objeto de la clase correcta
    static crear(nombre) {
        const clase = { tarjeta: PagoTarjeta, pse: PagoPSE, contraentrega: PagoContraEntrega }[nombre];
        if (!clase) throw new ErrorValidacion("Elige un método de pago válido");
        return new clase();
    }
}

// Pagos en línea: se aprueban al instante (o se rechazan si se pide simular el rechazo)
export class PagoEnLinea extends MetodoPago {
    procesar(monto, { simularRechazo = false } = {}) {
        const estado = simularRechazo ? "rechazado" : "aprobado";
        return new Pago({ metodo: this.nombre, estado, monto });
    }
}

export class PagoTarjeta extends PagoEnLinea {
    get nombre() { return "tarjeta"; }
}

export class PagoPSE extends PagoEnLinea {
    get nombre() { return "pse"; }
}

// POLIMORFISMO: mismo método procesar(), distinto comportamiento.
// Contra entrega no cobra ahora: queda pendiente y nunca se "rechaza".
export class PagoContraEntrega extends MetodoPago {
    get nombre() { return "contraentrega"; }

    procesar(monto) {
        return new Pago({ metodo: this.nombre, estado: "pendiente", monto });
    }
}
