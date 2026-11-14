export class PedidoController {
    constructor(servicio) {
        this.servicio = servicio;
    }

    crear = async (req, res) => {
        const { items, customer, pay, simulateReject } = req.body ?? {};
        const pedido = await this.servicio.crearPedido({
            items,
            customer,
            pay,
            usuario: req.usuario ?? null,
            // el rechazo simulado solo existe fuera de producción, para poder probar esa regla
            simularRechazo: process.env.NODE_ENV !== "production" && simulateReject === true
        });
        res.status(201).json({ message: "Pedido recibido", order: pedido });
    };

    misPedidos = async (req, res) => {
        res.json({ orders: await this.servicio.misPedidos(req.usuario) });
    };

    cancelar = async (req, res) => {
        const pedido = await this.servicio.cancelar({ codigo: req.params.code, usuario: req.usuario });
        res.json({ message: "Pedido cancelado", order: pedido });
    };

    // --- Administrador ---
    listarTodos = async (_req, res) => {
        res.json({ orders: await this.servicio.listarTodos() });
    };

    cambiarEstado = async (req, res) => {
        const pedido = await this.servicio.cambiarEstado({ codigo: req.params.code, estado: req.body?.status });
        res.json({ message: "Estado actualizado", order: pedido });
    };
}
