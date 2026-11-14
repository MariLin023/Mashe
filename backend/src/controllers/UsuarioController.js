// CONTROLADOR: solo traduce HTTP <-> servicio. No contiene reglas de negocio.
export class UsuarioController {
    constructor(servicio) {
        this.servicio = servicio;
    }

    registrar = async (req, res) => {
        const { usuario, token } = await this.servicio.registrar(req.body ?? {});
        res.status(201).json({ message: "Usuario registrado", token, user: usuario.aPublico() });
    };

    iniciarSesion = async (req, res) => {
        const { usuario, token } = await this.servicio.iniciarSesion(req.body ?? {});
        res.json({ message: "Sesión iniciada", token, user: usuario.aPublico() });
    };

    perfil = async (req, res) => {
        const usuario = await this.servicio.obtener(req.usuario.id);
        res.json({ user: usuario.aPublico() });
    };
}
