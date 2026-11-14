export class ProductoController {
    constructor(servicio) {
        this.servicio = servicio;
    }

    // GET /products  ·  ?cat=arte  ·  ?best=true
    listar = async (req, res) => {
        res.json({ products: await this.servicio.listar(req.query) });
    };

    obtener = async (req, res) => {
        res.json({ product: await this.servicio.obtener(Number(req.params.id)) });
    };

    crear = async (req, res) => {
        res.status(201).json({ product: await this.servicio.crear(req.body) });
    };

    actualizar = async (req, res) => {
        res.json({ product: await this.servicio.actualizar(Number(req.params.id), req.body) });
    };
}
