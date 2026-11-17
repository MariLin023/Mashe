export class CategoriaController {
    constructor(servicio) {
        this.servicio = servicio;
    }

    listar = async (_req, res) => {
        res.json({ categories: await this.servicio.listar() });
    };

    crear = async (req, res) => {
        res.status(201).json({ category: await this.servicio.crear(req.body ?? {}) });
    };

    actualizar = async (req, res) => {
        res.json({ category: await this.servicio.actualizar(req.params.key, req.body ?? {}) });
    };

    eliminar = async (req, res) => {
        await this.servicio.eliminar(req.params.key);
        res.json({ message: "Categoría eliminada" });
    };
}
