// Jerarquía de errores de negocio. Cada uno sabe con qué código HTTP se responde,
// así el controlador no tiene que decidirlo (el middleware de errores lo lee).
export class ErrorDeNegocio extends Error {
    constructor(mensaje, codigoHttp = 400) {
        super(mensaje);
        this.name = this.constructor.name;
        this.codigoHttp = codigoHttp;
    }
}

export class ErrorValidacion extends ErrorDeNegocio {
    constructor(mensaje) { super(mensaje, 400); }
}
export class ErrorNoAutenticado extends ErrorDeNegocio {
    constructor(mensaje = "Inicia sesión para continuar") { super(mensaje, 401); }
}
export class ErrorPagoRechazado extends ErrorDeNegocio {
    constructor(mensaje = "El pago fue rechazado. Intenta con otro método.") { super(mensaje, 402); }
}
export class ErrorSinPermiso extends ErrorDeNegocio {
    constructor(mensaje = "No tienes permiso para hacer esto") { super(mensaje, 403); }
}
export class ErrorNoEncontrado extends ErrorDeNegocio {
    constructor(mensaje) { super(mensaje, 404); }
}
export class ErrorConflicto extends ErrorDeNegocio {
    constructor(mensaje) { super(mensaje, 409); }
}
export class ErrorStock extends ErrorConflicto {}
